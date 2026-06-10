from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, LargeBinary, func
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()

class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    users = relationship("User", back_populates="role")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, autoincrement=True)
    cpf = Column(String(20), unique=True, nullable=False)
    password_hash = Column(String(128), nullable=False)
    name = Column(String(100), nullable=False)
    designation = Column(String(100))
    section = Column(String(50))
    level = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    role_id = Column(Integer, ForeignKey("roles.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    role = relationship("Role", back_populates="users")
    files = relationship("File", back_populates="uploader")

class File(Base):
    __tablename__ = "files"
    id = Column(Integer, primary_key=True, autoincrement=True)
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(20), nullable=False)
    project_name = Column(String(100))
    sig_number = Column(String(50))
    data_type = Column(String(50))
    section = Column(String(50))
    category = Column(String(100))
    season = Column(String(20))
    block = Column(String(50))
    ml_block = Column(String(50))
    location = Column(String(100))
    classification = Column(String(50))
    status = Column(String(20), default="Pending")
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    upload_date = Column(DateTime(timezone=True), server_default=func.now())
    file_size = Column(String(20))
    file_path = Column(String(255))
    file_data = Column(LargeBinary)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    uploader = relationship("User", back_populates="files")
    approvals = relationship("Approval", back_populates="file")

class Approval(Base):
    __tablename__ = "approvals"
    id = Column(Integer, primary_key=True, autoincrement=True)
    file_id = Column(Integer, ForeignKey("files.id"))
    action = Column(String(20))  # approved/rejected
    action_by = Column(Integer, ForeignKey("users.id"))
    action_at = Column(DateTime(timezone=True), server_default=func.now())
    comment = Column(String(255))
    file = relationship("File", back_populates="approvals")

class ActivityLog(Base):
    __tablename__ = "activity_logs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String(100))
    target_type = Column(String(50))
    target_id = Column(Integer)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    details = Column(String(255))

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    message = Column(String(255))
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Report(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, autoincrement=True)
    type = Column(String(50))
    data = Column(String)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())

class Lookup(Base):
    __tablename__ = "lookups"
    id = Column(Integer, primary_key=True, autoincrement=True)
    type = Column(String(50), nullable=False, index=True)
    value = Column(String(200), nullable=False)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

class UserPermission(Base):
    __tablename__ = "user_permissions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    classification = Column(String(50), nullable=False)
    granted_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    granted_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
