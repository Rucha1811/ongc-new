from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# ── AcquisitionTarget ──

class AcquisitionTargetBase(BaseModel):
    project_name: str
    financial_year: str
    type: str
    apr: Optional[float] = 0
    may: Optional[float] = 0
    jun: Optional[float] = 0
    jul: Optional[float] = 0
    aug: Optional[float] = 0
    sep: Optional[float] = 0
    oct: Optional[float] = 0
    nov: Optional[float] = 0
    dec: Optional[float] = 0
    jan: Optional[float] = 0
    feb: Optional[float] = 0
    mar: Optional[float] = 0
    total: Optional[float] = 0


class AcquisitionTargetCreate(AcquisitionTargetBase):
    pass


class AcquisitionTargetUpdate(BaseModel):
    project_name: Optional[str] = None
    financial_year: Optional[str] = None
    type: Optional[str] = None
    apr: Optional[float] = None
    may: Optional[float] = None
    jun: Optional[float] = None
    jul: Optional[float] = None
    aug: Optional[float] = None
    sep: Optional[float] = None
    oct: Optional[float] = None
    nov: Optional[float] = None
    dec: Optional[float] = None
    jan: Optional[float] = None
    feb: Optional[float] = None
    mar: Optional[float] = None
    total: Optional[float] = None


class AcquisitionTargetResponse(AcquisitionTargetBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Manpower ──

class ManpowerBase(BaseModel):
    section: str
    sl_no: Optional[int] = None
    cpf_no: Optional[str] = None
    name: Optional[str] = None
    designation: Optional[str] = None
    mobile: Optional[str] = None
    level: Optional[str] = None
    crc: Optional[str] = None
    assignment: Optional[str] = None


class ManpowerCreate(ManpowerBase):
    pass


class ManpowerUpdate(BaseModel):
    section: Optional[str] = None
    sl_no: Optional[int] = None
    cpf_no: Optional[str] = None
    name: Optional[str] = None
    designation: Optional[str] = None
    mobile: Optional[str] = None
    level: Optional[str] = None
    crc: Optional[str] = None
    assignment: Optional[str] = None


class ManpowerResponse(ManpowerBase):
    id: int
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
