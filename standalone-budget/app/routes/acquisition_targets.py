from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models import AcquisitionTarget
from app.schemas import AcquisitionTargetCreate, AcquisitionTargetUpdate, AcquisitionTargetResponse

router = APIRouter(prefix="/api/acquisition-targets", tags=["Acquisition Targets"])


@router.get("/", response_model=List[AcquisitionTargetResponse])
def list_targets(
    financial_year: Optional[str] = None,
    type: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(AcquisitionTarget)
    if financial_year:
        q = q.filter(AcquisitionTarget.financial_year == financial_year)
    if type:
        q = q.filter(AcquisitionTarget.type == type.upper())
    return q.order_by(AcquisitionTarget.project_name).all()


@router.get("/{target_id}", response_model=AcquisitionTargetResponse)
def get_target(target_id: int, db: Session = Depends(get_db)):
    t = db.query(AcquisitionTarget).filter(AcquisitionTarget.id == target_id).first()
    if not t:
        raise HTTPException(404, "Target not found")
    return t


@router.post("/", response_model=AcquisitionTargetResponse, status_code=201)
def create_target(data: AcquisitionTargetCreate, db: Session = Depends(get_db)):
    t = AcquisitionTarget(**data.model_dump())
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@router.put("/{target_id}", response_model=AcquisitionTargetResponse)
def update_target(target_id: int, data: AcquisitionTargetUpdate, db: Session = Depends(get_db)):
    t = db.query(AcquisitionTarget).filter(AcquisitionTarget.id == target_id).first()
    if not t:
        raise HTTPException(404, "Target not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(t, k, v)
    db.commit()
    db.refresh(t)
    return t


@router.delete("/{target_id}", status_code=204)
def delete_target(target_id: int, db: Session = Depends(get_db)):
    t = db.query(AcquisitionTarget).filter(AcquisitionTarget.id == target_id).first()
    if not t:
        raise HTTPException(404, "Target not found")
    db.delete(t)
    db.commit()
