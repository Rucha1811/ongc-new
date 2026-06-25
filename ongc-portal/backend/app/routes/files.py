from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FastAPIFile, Form, Header, BackgroundTasks, Request
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import or_, and_
from app.database import get_db
from app.models.base import File, User, UserPermission, Role
from app.auth.deps import get_current_user
from app.activity_utils import log_activity
from app.utils.pdf_extract import extract_text_from_pdf
from app.utils.embeddings import generate_embedding
import os
from app.config import settings
import logging
from datetime import datetime, timezone, timedelta
logger = logging.getLogger(__name__)
from mimetypes import guess_type

router = APIRouter()
RESTRICTED_CLASSIFICATIONS = {"Confidential", "Highly Confidential / Restricted"}

def get_accessible_classifications(role_name: str, permissions: list) -> set:
    """Return set of classification a user is allowed to see based on role + granted permissions."""
    now = datetime.now(timezone.utc)
    # Everyone can always see General
    accessible = {"General / Available for All"}
    if role_name == "admin":
        return {"General / Available for All", "Sensitive / Internal Use", "Confidential", "Highly Confidential / Restricted"}
    if role_name == "ops_manager":
        accessible.add("Sensitive / Internal Use")
    # Add any non-expired granted permissions
    for p in permissions:
        if p.expires_at and p.expires_at < now:
            continue
        accessible.add(p.classification)
    return accessible

async def _filter_files_area(files: list, user, accessible: set, db: AsyncSession) -> list:
    """Filter files by area/category/classification for non-admin users.

    - Ops Manager: sees files from areas of users under their management
      (where uploader.ops_manager_id == current_user.id), plus own uploads.
      No category restriction.
    - Data Creator / Viewer: sees own uploads + files matching their
      assigned area and category.
    """
    result = []

    if user.role.name == "ops_manager":
        # Managed users (by ops_manager_id)
        mu_res = await db.execute(
            select(User.id).where(User.ops_manager_id == user.id)
        )
        managed_user_ids = {row[0] for row in mu_res.all()}

        # Managed areas + sections from those users
        ma_res = await db.execute(
            select(User.area, User.section).where(
                User.ops_manager_id == user.id,
            )
        )
        managed_areas = set()
        for area, section in ma_res.all():
            if area:
                managed_areas.add(area)
            if section:
                managed_areas.add(section)
        if user.area:
            managed_areas.add(user.area)
        if user.section:
            managed_areas.add(user.section)

        for f in files:
            if f.uploaded_by == user.id:
                result.append(f)
                continue
            # Show if uploaded by a managed user, OR file section is in a managed area
            in_managed = f.uploaded_by in managed_user_ids or (managed_areas and f.section in managed_areas)
            if not in_managed:
                continue
            if f.classification and f.classification in accessible:
                result.append(f)
        return [file_to_dict(f) for f in result]

    # Data Creator / Viewer / other non-admin
    for f in files:
        if f.uploaded_by == user.id:
            result.append(f)
            continue

        matches_area = (user.area and f.section == user.area) or (user.section and f.section == user.section)
        matches_category = not user.user_category or f.category == user.user_category
        has_filter = user.area or user.section or user.user_category
        if has_filter and not (matches_area or matches_category):
            continue

        if f.classification and f.classification in accessible:
            result.append(f)
    return [file_to_dict(f) for f in result]

def sanitize_folder_name(name: str) -> str:
    """Replace non-alphanumeric chars with _ for filesystem-safe folder names."""
    if not name:
        return "Uncategorized"
    safe = name.replace("/", "_").replace(" ", "_")
    while "__" in safe:
        safe = safe.replace("__", "_")
    return safe.strip("_")

ALL_CLASSIFICATIONS = [
    "General_Available_for_All",
    "Sensitive_Internal_Use",
    "Confidential",
    "Highly_Confidential_Restricted",
]

def build_file_path(upload_dir: str, category: str, classification: str, filename: str,
                    project_name: str = None, section: str = None) -> str:
    """Build nested path: uploads/{project}/{section}/{classification}/{filename}
    Falls back to:
      project_name=None, section=None → uploads/Uncategorized/{classification}/
      project_name set,   section=None → uploads/{project}/General/{classification}/
      project_name=None,  section set  → uploads/Uncategorized/{section}/{classification}/
    Pre-creates all 4 classification subfolders under the leaf directory."""
    proj_dir = sanitize_folder_name(project_name) if project_name else "Uncategorized"
    sec_dir = sanitize_folder_name(section) if section else "General"
    cls_dir = sanitize_folder_name(classification) if classification else "Unclassified"
    leaf_dir = os.path.join(upload_dir, proj_dir, sec_dir)
    for cls in ALL_CLASSIFICATIONS + ["Unclassified"]:
        os.makedirs(os.path.join(leaf_dir, cls), exist_ok=True)
    return os.path.join(leaf_dir, cls_dir, filename)

def _is_seed_data(f: File) -> bool:
    return f.file_path and "seed_" in f.file_path

def _can_download_file(f: File) -> bool:
    if _is_seed_data(f):
        return False
    return f.status == "Approved" and f.classification not in RESTRICTED_CLASSIFICATIONS

def _can_view_file(f: File) -> bool:
    if _is_seed_data(f):
        return False
    return f.status == "Approved"

def _response_headers(file_name: str, disposition: str) -> dict:
    return {"Content-Disposition": f'{disposition}; filename="{file_name}"'}

def _media_type_for(file_name: str) -> str:
    media_type, _ = guess_type(file_name)
    return media_type or "application/octet-stream"

def _extract_snippet(text: str | None, term: str, context: int = 60) -> str | None:
    if not text or not term:
        return None
    lower = text.lower()
    idx = lower.find(term.lower())
    if idx == -1:
        return None
    start = max(0, idx - context)
    end = min(len(text), idx + len(term) + context)
    snippet = text[start:end].replace("\n", " ")
    if start > 0:
        snippet = "…" + snippet
    if end < len(text):
        snippet = snippet + "…"
    return snippet.strip()


def file_to_dict(f: File) -> dict:
    role_name = f.uploader.role.name if f.uploader and f.uploader.role else None
    return {
        "id": f.id,
        "file_name": f.file_name,
        "file_type": f.file_type,
        "project_name": f.project_name,
        "sig_number": f.sig_number,
        "data_type": f.data_type,
        "section": f.section,
        "category": f.category,
        "season": f.season,
        "block": f.block,
        "ml_block": f.ml_block,
        "location": f.location,
        "classification": f.classification,
        "contractor_name": f.contractor_name,
        "status": f.status,
        "uploaded_by": f.uploaded_by,
        "uploaded_by_name": f.uploader.name if f.uploader else str(f.uploaded_by),
        "uploaded_by_role": role_name,
        "upload_date": f.upload_date.isoformat() if f.upload_date else None,
        "file_size": f.file_size,
        "file_path": f.file_path,
        "summary": f.summary,
        "doc_type": f.doc_type,
        "description": f.description,
        "created_at": f.created_at.isoformat() if f.created_at else None,
        "updated_at": f.updated_at.isoformat() if f.updated_at else None,
    }

async def _generate_summary_bg(file_id: int, text: str):
    """Background task: generate summary after upload returns."""
    try:
        from app.utils.summarize import summarize
        summary = summarize(text, max_sentences=5)
        from app.database import AsyncSessionLocal
        async with AsyncSessionLocal() as bg_db:
            result = await bg_db.execute(select(File).where(File.id == file_id))
            f = result.scalar_one_or_none()
            if f:
                f.summary = summary
                await bg_db.commit()
    except Exception:
        pass


@router.post("/upload")
async def upload_file(
    file: UploadFile = FastAPIFile(...),
    file_name: str = Form(...),
    file_type: str = Form(...),
    project_name: str = Form(None),
    sig_number: str = Form(None),
    data_type: str = Form(None),
    section: str = Form(None),
    category: str = Form(None),
    season: str = Form(None),
    block: str = Form(None),
    ml_block: str = Form(None),
    location: str = Form(None),
    classification: str = Form(None),
    contractor_name: str = Form(None),
    file_size: str = Form(None),
    doc_type: str = Form(None),
    description: str = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    background_tasks: BackgroundTasks = None
):
    role_name = current_user.role.name if current_user.role else "viewer"
    if role_name not in ("admin", "ops_manager", "data_creator"):
        raise HTTPException(status_code=403, detail="You do not have permission to upload files")
    allowed_ext = {"pdf","docx","xlsx","ppt","pptx","txt","dat","csv","zip"}
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in allowed_ext:
        raise HTTPException(status_code=400, detail=f"File type '.{ext}' not allowed")

    MAX_SIZE = 1_073_741_824  # 1 GB
    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds maximum allowed size of 1 GB")
    orig_filename = file.filename.replace(" ", "_")
    file_path = build_file_path(settings.UPLOAD_DIR, category, classification, orig_filename,
                                 project_name=project_name, section=section)
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    try:
        with open(file_path, "wb") as fh:
            fh.write(contents)

        search_text = None
        embedding = None
        summary = None
        if ext == "pdf":
            search_text = extract_text_from_pdf(contents)
            if not search_text or len(search_text.strip()) < 50:
                from app.utils.ocr import ocr_pdf
                ocr_text = ocr_pdf(contents)
                if ocr_text:
                    search_text = ocr_text
            if search_text and search_text.strip():
                embedding = generate_embedding(search_text)

        auto_approved = current_user.role.name == "admin"
        db_file = File(
            file_name=file_name or orig_filename,
            file_type=file_type.upper(),
            project_name=project_name,
            sig_number=sig_number,
            data_type=data_type,
            section=section,
            category=category,
            season=season,
            block=block,
            ml_block=ml_block,
            location=location,
            classification=classification,
            contractor_name=contractor_name,
            status="Approved" if auto_approved else "Pending",
            uploaded_by=current_user.id,
            upload_date=datetime.utcnow(),
            file_size=file_size or f"{len(contents)/1024/1024:.2f} MB",
            file_path=file_path,
            doc_type=doc_type,
            description=description,
            search_text=search_text,
            summary=summary,
            embedding=embedding,
        )
        db.add(db_file)
        await db.commit()
        await db.refresh(db_file)
    except Exception:
        # Clean up orphaned file on disk if DB insert fails
        if os.path.exists(file_path):
            os.remove(file_path)
        raise

    from app.models.base import Approval, Notification, SectionConfig

    if auto_approved:
        approval = Approval(file_id=db_file.id, action="approved", action_by=current_user.id, action_at=datetime.utcnow(), comment="Auto-approved (admin upload)")
        db.add(approval)
    else:
        # Notify admins and section ops_manager about pending file
        admin_result = await db.execute(select(User).join(User.role).where(Role.name == "admin"))
        admins = admin_result.scalars().all()
        notif_msg = f'New file "{file_name}" uploaded by {current_user.name} in {section or "N/A"} — pending approval.'
        for admin in admins:
            db.add(Notification(user_id=admin.id, message=notif_msg, is_read=False))
        # Also notify section-specific ops_manager if configured
        if section:
            sc_result = await db.execute(select(SectionConfig).where(SectionConfig.section == section))
            sc = sc_result.scalar_one_or_none()
            if sc and sc.ops_manager_id and sc.ops_manager_id != current_user.id:
                db.add(Notification(user_id=sc.ops_manager_id, message=notif_msg, is_read=False))

    if search_text and search_text.strip() and background_tasks:
        background_tasks.add_task(_generate_summary_bg, db_file.id, search_text)

    await log_activity(db, current_user.id, "upload", "file", db_file.id, f"Uploaded '{file_name}' ({classification})")
    await db.commit()

    # Load uploader for response
    result = await db.execute(
        select(File).where(File.id == db_file.id).options(
            selectinload(File.uploader).selectinload(User.role)
        )
    )
    db_file = result.scalar_one()
    return file_to_dict(db_file)


@router.get("/")
async def list_files(
    section: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Get user's permissions
    perm_res = await db.execute(
        select(UserPermission).where(UserPermission.user_id == current_user.id)
    )
    user_perms = perm_res.scalars().all()
    accessible = get_accessible_classifications(current_user.role.name, user_perms)

    query = select(File).options(
        selectinload(File.uploader).selectinload(User.role)
    )
    if section:
        query = query.where(File.section == section)

    result = await db.execute(query)
    all_files = result.scalars().all()

    if current_user.role.name == "admin":
        return [file_to_dict(f) for f in all_files]

    return await _filter_files_area(all_files, current_user, accessible, db)


@router.get("/download/{file_id}")
async def download_file(
    file_id: int,
    token: str = None,
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db),
):
    # Auth: try Bearer header first, then ?token= query param
    from app.auth.security import decode_access_token
    from sqlalchemy.orm import selectinload
    auth_token = token
    if not auth_token and authorization:
        if authorization.startswith("Bearer "):
            auth_token = authorization[7:]
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_access_token(auth_token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    uid = payload.get("sub")
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid token")
    user_res = await db.execute(
        select(User).where(User.id == int(uid)).options(selectinload(User.role))
    )
    current_user = user_res.scalar_one_or_none()
    if not current_user or not current_user.is_active:
        raise HTTPException(status_code=401, detail="Invalid user")

    result = await db.execute(select(File).where(File.id == file_id))
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    if not _can_download_file(f):
        raise HTTPException(status_code=403, detail="This file is view-only. Download is not allowed for this classification.")
    if f.file_data:
        from fastapi.responses import Response
        return Response(
            content=f.file_data,
            media_type=_media_type_for(f.file_name),
            headers=_response_headers(f.file_name, "attachment"),
        )
    if not f.file_path or not os.path.exists(f.file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(
        path=f.file_path,
        filename=f.file_name,
        media_type=_media_type_for(f.file_name),
        headers=_response_headers(f.file_name, "attachment"),
    )


@router.get("/view/{file_id}")
async def view_file(
    file_id: int,
    search: str = None,
    token: str = None,
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db),
):
    # Auth: try Bearer header first, then ?token= query param
    from app.auth.security import decode_access_token
    from sqlalchemy.orm import selectinload
    auth_token = token
    if not auth_token and authorization:
        if authorization.startswith("Bearer "):
            auth_token = authorization[7:]
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_access_token(auth_token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    uid = payload.get("sub")
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid token")
    user_res = await db.execute(
        select(User).where(User.id == int(uid)).options(selectinload(User.role))
    )
    current_user = user_res.scalar_one_or_none()
    if not current_user or not current_user.is_active:
        raise HTTPException(status_code=401, detail="Invalid user")

    result = await db.execute(select(File).where(File.id == file_id))
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    # Allow view if: admin, uploader, or file is Approved
    role_name = current_user.role.name if current_user.role else ""
    can_view = (
        role_name == "admin"
        or f.uploaded_by == current_user.id
        or f.status == "Approved"
    )
    if not can_view:
        raise HTTPException(status_code=403, detail="You don't have permission to view this file")
    disp = "inline" if f.classification in RESTRICTED_CLASSIFICATIONS else "inline"
    if f.file_data:
        from fastapi.responses import Response
        return Response(
            content=f.file_data,
            media_type=_media_type_for(f.file_name),
            headers=_response_headers(f.file_name, disp),
        )
    if not f.file_path or not os.path.exists(f.file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(
        path=f.file_path,
        filename=f.file_name,
        media_type=_media_type_for(f.file_name),
        headers=_response_headers(f.file_name, disp),
    )


@router.get("/pdfviewer/{file_id}")
async def pdf_viewer(
    file_id: int,
    search: str = None,
    token: str = None,
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """Serve HTML page with pdf.js that highlights the search term."""
    from app.auth.security import decode_access_token
    from sqlalchemy.orm import selectinload
    auth_token = token
    if not auth_token and authorization:
        if authorization.startswith("Bearer "):
            auth_token = authorization[7:]
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_access_token(auth_token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    uid = payload.get("sub")
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid token")
    user_res = await db.execute(
        select(User).where(User.id == int(uid)).options(selectinload(User.role))
    )
    current_user = user_res.scalar_one_or_none()
    if not current_user or not current_user.is_active:
        raise HTTPException(status_code=401, detail="Invalid user")
    result = await db.execute(select(File).where(File.id == file_id))
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    role_name = current_user.role.name if current_user.role else ""
    can_view = (
        role_name == "admin"
        or f.uploaded_by == current_user.id
        or f.status == "Approved"
    )
    if not can_view:
        raise HTTPException(status_code=403, detail="Permission denied")

    import json as _json
    search_json = _json.dumps(search or "")
    ocr_text_json = _json.dumps(f.search_text or "")

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{f.file_name}</title>
<style>
  *{{margin:0;padding:0;box-sizing:border-box}}
  body{{background:#525659;font-family:system-ui,sans-serif}}
  header{{background:#323639;color:#fff;padding:10px 20px;position:sticky;top:0;z-index:100;display:flex;align-items:center;gap:14px;box-shadow:0 2px 6px rgba(0,0,0,.4)}}
  header h1{{font-size:15px;font-weight:500;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
  .badge{{background:#ffc107;color:#000;font-size:11px;padding:3px 10px;border-radius:12px;font-weight:600}}
  #viewer{{padding:16px 0;display:flex;flex-direction:column;align-items:center;gap:12px}}
  .page-wrap{{position:relative;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.35);margin:0 auto}}
  .page-wrap canvas{{display:block;width:100%;height:auto}}
  .text-layer{{position:absolute;top:0;left:0;right:0;bottom:0;overflow:hidden;pointer-events:none}}
  .text-layer span{{position:absolute;white-space:pre;color:transparent;font-family:sans-serif}}
  .hl{{background:#ff0;color:transparent;border-radius:2px;position:absolute;pointer-events:none;opacity:.7}}
  #spinner{{text-align:center;padding:60px 20px;color:#ccc;font-size:18px}}
  #errbox{{text-align:center;padding:40px 20px;color:#e88;font-size:14px;display:none}}
  #fallback{{text-align:center;padding:40px 20px;display:none}}
  #fallback a{{display:inline-block;padding:10px 24px;background:#0b3d91;color:#fff;text-decoration:none;border-radius:6px;font-weight:600}}
  .nav{{display:flex;gap:8px;align-items:center}}
  .nav button{{background:#555;color:#fff;border:none;padding:4px 14px;border-radius:4px;cursor:pointer;font-size:13px}}
  .nav button:hover{{background:#666}}
  .nav button:disabled{{opacity:.4;cursor:default}}
  .nav span{{font-size:13px;color:#ccc}}
</style>
</head>
<body>
<header>
  <h1>{f.file_name}</h1>
  <span class="nav">
    <button id="prevPage" disabled>&#9664;</button>
    <span id="pageInfo">1 / <span id="pageCount">-</span></span>
    <button id="nextPage" disabled>&#9654;</button>
  </span>
  <span class="badge" id="matchInfo">0 matches</span>
</header>
<div id="spinner">Loading PDF…</div>
<div id="errbox"></div>
<div id="fallback"><a id="fallbackLink" target="_blank">Open in Browser</a></div>
<div id="viewer" style="display:none"></div>
<script src="/static/pdf.min.js"></script>
<script>
var FALLBACK_URL = '/api/files/view/{file_id}?token={auth_token}';
if (typeof pdfjsLib === 'undefined') {{
  document.getElementById('spinner').style.display = 'none';
  document.getElementById('fallback').style.display = 'block';
  document.getElementById('fallbackLink').href = FALLBACK_URL;
}} else {{
pdfjsLib.GlobalWorkerOptions.workerSrc = '/static/pdf.worker.min.js';

const SEARCH_TERM = {search_json};
const OCR_TEXT = {ocr_text_json};
const FILE_ID = {file_id};
const TOKEN = {_json.dumps(auth_token)};

let pdfDoc, pageNum = 1, matches = [];
const viewer = document.getElementById('viewer');
const spinner = document.getElementById('spinner');
const errbox = document.getElementById('errbox');
const pageInfo = document.getElementById('pageInfo');
const pageCountEl = document.getElementById('pageCount');
const prevBtn = document.getElementById('prevPage');
const nextBtn = document.getElementById('nextPage');
const matchInfo = document.getElementById('matchInfo');

function showError(msg) {{
  spinner.style.display = 'none';
  errbox.style.display = 'block';
  errbox.textContent = msg;
}}

async function loadPDF() {{
  var resp = await fetch('/api/files/view/' + FILE_ID + '?token=' + TOKEN);
  if (!resp.ok) {{ showError('Failed to load PDF (HTTP ' + resp.status + ')'); return; }}
  var data = await resp.arrayBuffer();
  var pdf = await pdfjsLib.getDocument({{data}}).promise;
  pdfDoc = pdf;
  pageCountEl.textContent = pdf.numPages;
  spinner.style.display = 'none';
  viewer.style.display = 'flex';
  await renderPage(1);
  prevBtn.disabled = true;
  nextBtn.disabled = pdf.numPages <= 1;
}}

async function renderPage(num) {{
  pageNum = num;
  var page = await pdfDoc.getPage(num);
  var scale = Math.min(1.5, window.innerWidth / page.getViewport({{scale:1}}).width * 0.9);
  var viewport = page.getViewport({{scale}});
  var wrap = document.createElement('div');
  wrap.className = 'page-wrap';
  wrap.style.width = viewport.width + 'px';
  wrap.style.minHeight = viewport.height + 'px';
  wrap.dataset.page = num;
  var canvas = document.createElement('canvas');
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  var ctx = canvas.getContext('2d');
  wrap.appendChild(canvas);
  var textLayer = document.createElement('div');
  textLayer.className = 'text-layer';
  textLayer.style.width = viewport.width + 'px';
  textLayer.style.height = viewport.height + 'px';
  wrap.appendChild(textLayer);
  viewer.innerHTML = '';
  viewer.appendChild(wrap);
  await page.render({{canvasContext: ctx, viewport}}).promise;
  var textContent = await page.getTextContent();
  var task = pdfjsLib.renderTextLayer({{
    textContent: textContent,
    container: textLayer,
    viewport: viewport,
    textDivs: [],
  }});
  await task.promise;
  pageInfo.textContent = pageNum + ' / ' + pdfDoc.numPages;
  try {{
    if (SEARCH_TERM) await highlightText(wrap, textContent, viewport);
    if (SEARCH_TERM && textContent.items.length === 0 && OCR_TEXT) await ocrHighlight(wrap, num);
  }} catch(e) {{ console.error('Highlight error:', e); matchInfo.textContent = 'Highlight error'; }}
}}

async function highlightText(wrap, textContent, viewport) {{
  var term = SEARCH_TERM.toLowerCase();
  if (!term) return;
  await new Promise(function(r) {{ setTimeout(r, 50); }});
  var spans = wrap.querySelectorAll('.text-layer span');
  var found = false;
  spans.forEach(function(span) {{
    var txt = span.textContent.toLowerCase();
    var idx = 0;
    while ((idx = txt.indexOf(term, idx)) !== -1) {{
      try {{
        var range = document.createRange();
        range.setStart(span.firstChild, idx);
        range.setEnd(span.firstChild, idx + term.length);
        var rects = range.getClientRects();
        var wrapRect = wrap.getBoundingClientRect();
        for (var r = 0; r < rects.length; r++) {{
          var rect = rects[r];
          if (rect.width > 0 && rect.height > 0) {{
            found = true;
            var hl = document.createElement('div');
            hl.className = 'hl';
            hl.style.left = (rect.left - wrapRect.left) + 'px';
            hl.style.top = (rect.top - wrapRect.top) + 'px';
            hl.style.width = rect.width + 'px';
            hl.style.height = rect.height + 'px';
            wrap.appendChild(hl);
            matches.push(1);
          }}
        }}
      }} catch(e) {{}}
      idx += term.length;
    }}
  }});
  if (!found && textContent) {{
    textContent.items.forEach(function(item) {{
      var txt = item.str.toLowerCase();
      var idx = 0;
      while ((idx = txt.indexOf(term, idx)) !== -1) {{
        try {{
          var charW = txt.length > 0 ? item.width / txt.length : 0;
          var x = viewport.convertToViewportPoint(item.transform[4] + charW * idx, item.transform[5])[0];
          var x2 = viewport.convertToViewportPoint(item.transform[4] + charW * (idx + term.length), item.transform[5])[0];
          var y = viewport.convertToViewportPoint(item.transform[4], item.transform[5])[1];
          var y2 = viewport.convertToViewportPoint(item.transform[4], item.transform[5] + item.height)[1];
          var hl = document.createElement('div');
          hl.className = 'hl';
          hl.style.left = x + 'px';
          hl.style.top = y + 'px';
          hl.style.width = Math.max(x2 - x, 4) + 'px';
          hl.style.height = Math.max(y2 - y, 4) + 'px';
          wrap.appendChild(hl);
          matches.push(1);
        }} catch(e) {{}}
        idx += term.length;
      }}
    }});
  }}
  matchInfo.textContent = matches.length + ' matches';
}}

async function ocrHighlight(wrap, pageNum) {{
  var term = SEARCH_TERM.toLowerCase();
  if (!term) return;
  var lines = OCR_TEXT.split('\\n');
  var totalPages = pdfDoc.numPages || 1;
  var linesPerPage = Math.ceil(lines.length / totalPages);
  var startLine = (pageNum - 1) * linesPerPage;
  var endLine = Math.min(startLine + linesPerPage, lines.length);
  var pageLines = lines.slice(startLine, endLine);
  var found = false;
  for (var i = 0; i < pageLines.length; i++) {{
    var line = pageLines[i];
    if (line.toLowerCase().indexOf(term) !== -1) {{
      found = true;
      var panel = document.createElement('div');
      panel.style.cssText = 'background:#fffbe6;border:1px solid #ffc107;border-radius:6px;padding:10px 14px;margin:8px 12px;font-size:13px;color:#333;box-shadow:0 2px 8px rgba(0,0,0,.12);position:relative;z-index:10';
      var label = document.createElement('div');
      label.style.cssText = 'font-size:11px;color:#b8860b;font-weight:600;margin-bottom:4px';
      label.textContent = 'OCR Match';
      panel.appendChild(label);
      var ctx = document.createElement('div');
      ctx.style.lineHeight = '1.5';
      var idx = line.toLowerCase().indexOf(term);
      if (idx !== -1) {{
        ctx.innerHTML = line.substring(0, idx) + '<mark style="background:#ffeb3b;padding:1px 2px;border-radius:2px">' + line.substring(idx, idx + term.length) + '</mark>' + line.substring(idx + term.length);
      }} else {{
        ctx.textContent = line;
      }}
      panel.appendChild(ctx);
      wrap.parentNode.insertBefore(panel, wrap);
      matches.push(1);
    }}
  }}
  if (found) matchInfo.textContent = matches.length + ' matches';
}}

prevBtn.onclick = function() {{ if (pageNum > 1) renderPage(pageNum - 1); }};
nextBtn.onclick = function() {{ if (pageNum < pdfDoc.numPages) renderPage(pageNum + 1); }};
window.addEventListener('resize', function() {{ if (pdfDoc) renderPage(pageNum); }});

loadPDF().catch(function(e) {{ showError('Error: ' + e.message); }});
}}
</script>
</body>
</html>"""
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=html)


@router.post("/parse-excel")
async def parse_excel(
    file: UploadFile = FastAPIFile(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload an Excel file and return its metadata (sheet names, columns, sample rows)."""
    if not file.filename.lower().endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(status_code=400, detail="Only Excel files (.xlsx, .xls, .csv) are supported")
    import io
    import csv
    contents = await file.read()
    result = {"sheets": [], "total_rows": 0, "columns": [], "sample_data": []}
    if file.filename.endswith(".csv"):
        text = contents.decode("utf-8-sig", errors="replace")
        reader = csv.reader(io.StringIO(text))
        rows = list(reader)
        if rows:
            result["columns"] = rows[0]
            result["total_rows"] = len(rows) - 1
            result["sample_data"] = rows[1:6]
        result["sheets"] = [{"name": file.filename, "rows": result["total_rows"], "columns": result["columns"]}]
    else:
        try:
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(contents), read_only=True, data_only=True)
            for ws_name in wb.sheetnames:
                ws = wb[ws_name]
                rows = list(ws.iter_rows(values_only=True))
                sheet_data = {"name": ws_name, "rows": max(0, len(rows) - 1), "columns": list(rows[0]) if rows else []}
                result["sheets"].append(sheet_data)
                if not result["columns"] and rows:
                    result["columns"] = list(rows[0])
                    result["sample_data"] = [list(r) for r in rows[1:6] if any(v is not None for v in r)]
                    result["total_rows"] += max(0, len(rows) - 1)
            wb.close()
        except ImportError:
            raise HTTPException(status_code=500, detail="openpyxl not installed. Install with: pip install openpyxl")
    return result


@router.get("/search")
async def search_files(
    search: str = None,
    status: str = None,
    section: str = None,
    file_type: str = None,
    data_type: str = None,
    season: str = None,
    block: str = None,
    classification: str = None,
    project_name: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Get user's granted permissions
    perm_res = await db.execute(
        select(UserPermission).where(UserPermission.user_id == current_user.id)
    )
    user_perms = perm_res.scalars().all()
    accessible = get_accessible_classifications(current_user.role.name, user_perms)

    query = select(File).options(
        selectinload(File.uploader).selectinload(User.role)
    )
    filters = []

    search_filter = None
    if search:
        s = f"%{search.lower()}%"
        search_filter = or_(
            File.file_name.ilike(s),
            File.project_name.ilike(s),
            File.sig_number.ilike(s),
            File.category.ilike(s),
            File.location.ilike(s),
            File.search_text.ilike(s),
        )
        filters.append(search_filter)
    if status:
        filters.append(File.status == status)
    if section:
        filters.append(File.section == section)
    if file_type:
        filters.append(File.file_type.ilike(file_type))
    if data_type:
        filters.append(File.data_type == data_type)
    if season:
        filters.append(File.season == season)
    if block:
        filters.append(File.block == block)
    if classification:
        filters.append(File.classification == classification)
    if project_name:
        filters.append(File.project_name == project_name)

    if filters:
        query = query.where(and_(*filters))

    result = await db.execute(query)
    all_files = result.scalars().all()
    # Build search_text lookup from all files (not just keyword-filtered)
    all_files_result = await db.execute(select(File.id, File.search_text))
    text_map = {row[0]: row[1] for row in all_files_result.all()}

    if current_user.role.name == "admin":
        keyword_results = [file_to_dict(f) for f in all_files]
    else:
        keyword_results = await _filter_files_area(all_files, current_user, accessible, db)

    seen_ids = set()

    if search:
        for f in keyword_results:
            txt = text_map.get(f["id"])
            snip = _extract_snippet(txt, search)
            if snip:
                f["snippet"] = snip
            seen_ids.add(f["id"])

        # Semantic search: find top-20 similar files via vector similarity
        try:
            from app.utils.embeddings import generate_embedding
            query_vec = generate_embedding(search)
            if query_vec:
                from sqlalchemy import text as sqltext
                vec_str = "'[" + ",".join(f"{v:.16f}" for v in query_vec) + "]'"
                raw_sql = f"SELECT id FROM files WHERE embedding IS NOT NULL ORDER BY embedding <=> {vec_str}::vector LIMIT 20"
                vec_result = await db.execute(sqltext(raw_sql))
                vec_ids = {row[0] for row in vec_result.all()}

                if vec_ids:
                    vec_files_query = select(File).options(
                        selectinload(File.uploader).selectinload(User.role)
                    ).where(
                        File.id.in_(vec_ids)
                    )
                    non_search_filters = [f for f in filters if f is not search_filter]
                    if non_search_filters:
                        vec_files_query = vec_files_query.where(and_(*non_search_filters))
                    vec_data = await db.execute(vec_files_query)
                    vec_files = vec_data.scalars().all()

                    if current_user.role.name == "admin":
                        vec_results = [file_to_dict(f) for f in vec_files]
                    else:
                        vec_results = await _filter_files_area(vec_files, current_user, accessible, db)

                    for f in vec_results:
                        if f["id"] not in seen_ids:
                            seen_ids.add(f["id"])
                            txt = text_map.get(f["id"])
                            snip = _extract_snippet(txt, search)
                            if snip:
                                f["snippet"] = "[vector] " + snip
                            elif txt:
                                # Show first 80 chars of content as preview
                                preview = txt.replace("\n", " ").strip()[:80]
                                f["snippet"] = "[semantic] " + preview + "…"
                            keyword_results.append(f)
        except Exception:
            pass

    return keyword_results


@router.patch("/{file_id}")
async def update_file(
    file_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    role_name = user.role.name if user.role else ""
    if role_name not in ("admin", "ops_manager"):
        raise HTTPException(status_code=403, detail="Only admin/ops_manager can update file metadata")
    result = await db.execute(select(File).where(File.id == file_id))
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(404, "File not found")
    allowed_fields = {"file_type", "data_type", "category", "classification", "project_name", "section", "season", "block", "ml_block", "location", "contractor_name"}
    for key, val in data.items():
        if key in allowed_fields:
            setattr(f, key, val)
    await db.commit()
    return {"msg": "File updated", "file_id": file_id}
