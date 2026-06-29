from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AcquisitionTarget, Manpower

router = APIRouter(tags=["Viewer"])

MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"]
MONTH_COLS = ["apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec", "jan", "feb", "mar"]

TABLE_HTML = """<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Budget Targets & Manpower</title>
<style>
  body {{ font-family: system-ui, sans-serif; padding: 20px; background: #f5f7fa; }}
  h1 {{ color: #0b3d91; }}
  .tabs {{ display: flex; gap: 8px; margin: 16px 0; }}
  .tab {{ padding: 8px 18px; border-radius: 6px; border: none; cursor: pointer; font-weight: 600; background: #e0e4ea; }}
  .tab.active {{ background: #0b3d91; color: #fff; }}
  table {{ border-collapse: collapse; width: 100%; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }}
  th {{ background: #0b3d91; color: #fff; padding: 10px 12px; font-size: 13px; text-align: left; white-space: nowrap; }}
  td {{ padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #eee; }}
  tr:hover {{ background: #f0f4ff; }}
  .badge {{ display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 700; }}
  .badge-be {{ background: #e3f2fd; color: #1565c0; }}
  .badge-re {{ background: #fce4ec; color: #c62828; }}
  .filters {{ margin: 12px 0; display: flex; gap: 12px; flex-wrap: wrap; }}
  .filters select, .filters input {{ padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; }}
</style></head>
<body>
<h1>📊 Budget Targets & Manpower</h1>
<div class="tabs">
  <button class="tab active" onclick="switchTab('targets')">Acquisition Targets</button>
  <button class="tab" onclick="switchTab('manpower')">Manpower</button>
</div>

<div id="targets-tab">
  <div class="filters">
    <select id="fy-filter"><option value="">All FY</option></select>
    <select id="type-filter"><option value="">All Types</option><option value="BE">BE</option><option value="RE">RE</option></select>
    <button onclick="loadTargets()" style="padding:6px 14px;background:#0b3d91;color:#fff;border:none;border-radius:4px;cursor:pointer;">Filter</button>
  </div>
  <div id="targets-table"></div>
</div>

<div id="manpower-tab" style="display:none">
  <div class="filters">
    <select id="section-filter"><option value="">All Sections</option></select>
    <button onclick="loadManpower()" style="padding:6px 14px;background:#0b3d91;color:#fff;border:none;border-radius:4px;cursor:pointer;">Filter</button>
  </div>
  <div id="manpower-table"></div>
</div>

<script>
async function api(url) {{ return fetch(url).then(r => r.json()); }}

function switchTab(name) {{
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('[id$="-tab"]').forEach(t => t.style.display = 'none');
  if (name === 'targets') {{
    document.querySelector('.tabs button:first-child').classList.add('active');
    document.getElementById('targets-tab').style.display = '';
    loadTargets();
  }} else {{
    document.querySelector('.tabs button:last-child').classList.add('active');
    document.getElementById('manpower-tab').style.display = '';
    loadManpower();
  }}
}}

async function loadTargets() {{
  const fy = document.getElementById('fy-filter').value;
  const ty = document.getElementById('type-filter').value;
  let url = '/api/acquisition-targets/?' + new URLSearchParams({{ financial_year: fy, type: ty }});
  const data = await api(url);
  const months = {JSON.stringify(MONTHS)};
  const cols = {JSON.stringify(MONTH_COLS)};
  let html = '<table><thead><tr><th>#</th><th>Project</th><th>FY</th><th>Type</th>';
  months.forEach(m => {{ html += '<th>' + m + '</th>'; }});
  html += '<th>Total</th></tr></thead><tbody>';
  data.forEach((r, i) => {{
    html += '<tr><td>' + (i+1) + '</td><td><b>' + r.project_name + '</b></td><td>' + r.financial_year + '</td>';
    html += '<td><span class="badge ' + (r.type === 'BE' ? 'badge-be' : 'badge-re') + '">' + r.type + '</span></td>';
    cols.forEach(c => {{ html += '<td>' + (r[c] || 0) + '</td>'; }});
    html += '<td><b>' + r.total + '</b></td></tr>';
  }});
  html += '</tbody></table><p style="color:#888;font-size:13px;">' + data.length + ' records</p>';
  document.getElementById('targets-table').innerHTML = html;
}}

async function loadManpower() {{
  const sec = document.getElementById('section-filter').value;
  let url = '/api/manpower/?' + new URLSearchParams({{ section: sec }});
  const data = await api(url);
  let html = '<table><thead><tr><th>#</th><th>Section</th><th>CPF No.</th><th>Name</th><th>Designation</th><th>Level</th><th>CRC</th><th>Assignment</th></tr></thead><tbody>';
  data.forEach((r, i) => {{
    html += '<tr><td>' + (i+1) + '</td><td>' + r.section + '</td><td>' + (r.cpf_no||'—') + '</td><td><b>' + r.name + '</b></td><td>' + (r.designation||'—') + '</td><td>' + (r.level||'—') + '</td><td>' + (r.crc||'—') + '</td><td>' + (r.assignment||'—') + '</td></tr>';
  }});
  html += '</tbody></table><p style="color:#888;font-size:13px;">' + data.length + ' records</p>';
  document.getElementById('manpower-table').innerHTML = html;
}}

// Populate filter dropdowns
api('/api/acquisition-targets/').then(data => {{
  const fys = [...new Set(data.map(r => r.financial_year))];
  const sel = document.getElementById('fy-filter');
  fys.forEach(fy => {{ sel.innerHTML += '<option value="' + fy + '">' + fy + '</option>'; }});
}});
api('/api/manpower/sections').then(data => {{
  const sel = document.getElementById('section-filter');
  data.forEach(s => {{ sel.innerHTML += '<option value="' + s + '">' + s + '</option>'; }});
}});

loadTargets();
</script></body></html>"""

@router.get("/view", response_class=HTMLResponse)
def view_data():
    return HTMLResponse(TABLE_HTML)
