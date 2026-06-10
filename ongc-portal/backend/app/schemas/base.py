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
