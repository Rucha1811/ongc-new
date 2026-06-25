from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field

class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None

class RoleCreate(RoleBase):
    pass

class Role(RoleBase):
    id: UUID
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    class Config:
        orm_mode = True

class UserBase(BaseModel):
    cpf: str
    name: str
    designation: Optional[str] = None
    section: Optional[str] = None
    level: Optional[int] = 0
    is_active: Optional[bool] = True
    role_id: Optional[UUID]

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: UUID
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    class Config:
        orm_mode = True

class FileBase(BaseModel):
    file_name: str
    file_type: str
    project_name: Optional[str] = None
    sig_number: Optional[str] = None
    data_type: Optional[str] = None
    section: Optional[str] = None
    category: Optional[str] = None
    season: Optional[str] = None
    block: Optional[str] = None
    ml_block: Optional[str] = None
    location: Optional[str] = None
    classification: Optional[str] = None
    status: Optional[str] = "Pending"
    file_size: Optional[str] = None
    file_path: Optional[str] = None

class FileCreate(FileBase):
    pass

class File(FileBase):
    id: UUID
    uploaded_by: UUID
    upload_date: Optional[datetime]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    class Config:
        orm_mode = True

class ApprovalBase(BaseModel):
    file_id: UUID
    action: str
    action_by: UUID
    comment: Optional[str] = None

class ApprovalCreate(ApprovalBase):
    pass

class Approval(ApprovalBase):
    id: UUID
    action_at: Optional[datetime]
    class Config:
        orm_mode = True

class ProjectEventSchema(BaseModel):
    event_date: str
    description: str

class ProjectCreate(BaseModel):
    project_name: str
    number: Optional[str] = None
    survey_type: Optional[str] = None
    contractor_name: Optional[str] = None
    area_name: Optional[str] = None
    section: Optional[str] = None
    party_chief: Optional[str] = None
    year_field_season: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    project_period: Optional[str] = None
    target_vs_achievement: Optional[str] = None
    survey_objective: Optional[str] = None
    xy_coordinates: Optional[str] = None
    survey_grid_params: Optional[str] = None
    acquisition_geometry: Optional[str] = None
    instrument_parameters: Optional[str] = None
    sensor_type: Optional[str] = None
    source_parameters: Optional[str] = None
    total_cost: Optional[float] = None
    per_unit_cost: Optional[float] = None
    project_highlights: Optional[str] = None
    events: Optional[list[ProjectEventSchema]] = None

class ProjectOut(BaseModel):
    id: int
    project_name: str
    number: Optional[str] = None
    survey_type: Optional[str] = None
    contractor_name: Optional[str] = None
    area_name: Optional[str] = None
    section: Optional[str] = None
    party_chief: Optional[str] = None
    year_field_season: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    project_period: Optional[str] = None
    target_vs_achievement: Optional[str] = None
    survey_objective: Optional[str] = None
    xy_coordinates: Optional[str] = None
    survey_grid_params: Optional[str] = None
    acquisition_geometry: Optional[str] = None
    instrument_parameters: Optional[str] = None
    sensor_type: Optional[str] = None
    source_parameters: Optional[str] = None
    total_cost: Optional[float] = None
    per_unit_cost: Optional[float] = None
    project_highlights: Optional[str] = None
    status: Optional[str] = "Active"
    created_by: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    events: Optional[list[ProjectEventSchema]] = None
    class Config:
        orm_mode = True
