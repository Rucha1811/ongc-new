from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models import Manpower
from app.schemas import ManpowerCreate, ManpowerUpdate, ManpowerResponse

router = APIRouter(prefix="/api/manpower", tags=["Manpower"])


@router.get("/", response_model=List[ManpowerResponse])
def list_manpower(
    section: Optional[str] = None,
    level: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Manpower)
    if section:
        q = q.filter(Manpower.section == section)
    if level:
        q = q.filter(Manpower.level == level)
    return q.order_by(Manpower.section, Manpower.sl_no).all()


@router.get("/sections", response_model=List[str])
def list_sections(db: Session = Depends(get_db)):
    rows = db.query(Manpower.section).distinct().order_by(Manpower.section).all()
    return [r[0] for r in rows]


@router.get("/summary", response_model=dict)
def manpower_summary(db: Session = Depends(get_db)):
    rows = db.query(Manpower).all()
    level_count = {}
    discipline_count = {}
    section_count = {}
    org_unit_count = {}
    for m in rows:
        section_count[m.section] = section_count.get(m.section, 0) + 1
        lvl = m.level or "Unknown"
        level_count[lvl] = level_count.get(lvl, 0) + 1
    return {
        "total": len(rows),
        "by_section": section_count,
        "by_level": level_count,
    }


@router.get("/{manpower_id}", response_model=ManpowerResponse)
def get_manpower(manpower_id: int, db: Session = Depends(get_db)):
    m = db.query(Manpower).filter(Manpower.id == manpower_id).first()
    if not m:
        raise HTTPException(404, "Manpower record not found")
    return m


@router.post("/", response_model=ManpowerResponse, status_code=201)
def create_manpower(data: ManpowerCreate, db: Session = Depends(get_db)):
    m = Manpower(**data.model_dump())
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


@router.put("/{manpower_id}", response_model=ManpowerResponse)
def update_manpower(manpower_id: int, data: ManpowerUpdate, db: Session = Depends(get_db)):
    m = db.query(Manpower).filter(Manpower.id == manpower_id).first()
    if not m:
        raise HTTPException(404, "Manpower record not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(m, k, v)
    db.commit()
    db.refresh(m)
    return m


@router.delete("/{manpower_id}", status_code=204)
def delete_manpower(manpower_id: int, db: Session = Depends(get_db)):
    m = db.query(Manpower).filter(Manpower.id == manpower_id).first()
    if not m:
        raise HTTPException(404, "Manpower record not found")
    db.delete(m)
    db.commit()
