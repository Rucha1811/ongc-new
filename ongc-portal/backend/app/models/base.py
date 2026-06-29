from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, LargeBinary, Text, Date, Float, func
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
    area = Column(String(50))
    user_category = Column(String(100))
    ops_manager_id = Column(Integer, ForeignKey("users.id"))
    level = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    role_id = Column(Integer, ForeignKey("roles.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    role = relationship("Role", back_populates="users")
    files = relationship("File", back_populates="uploader")
    ops_manager = relationship("User", remote_side=[id], foreign_keys=[ops_manager_id])

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
    contractor_name = Column(String(255))
    status = Column(String(20), default="Pending")
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    upload_date = Column(DateTime(timezone=True), server_default=func.now())
    file_size = Column(String(20))
    file_path = Column(String(1024))
    file_data = Column(LargeBinary)
    doc_type = Column(String(50))
    description = Column(String(500))
    search_text = Column(String, nullable=True)
    summary = Column(String, nullable=True)
    embedding = Column(Text, nullable=True)
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

class SectionConfig(Base):
    __tablename__ = "section_config"
    id = Column(Integer, primary_key=True, autoincrement=True)
    section = Column(String(100), nullable=False, unique=True)
    user_category = Column(String(100))
    ops_manager_id = Column(Integer, ForeignKey("users.id"))
    location = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    ops_manager = relationship("User", foreign_keys=[ops_manager_id])

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

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, autoincrement=True)
    project_name = Column(String(255), nullable=False)
    number = Column(String(100))
    survey_type = Column(String(100))
    contractor_name = Column(String(255))
    area_name = Column(String(255))
    section = Column(String(100))
    gp_code = Column(String(50))
    party_chief = Column(String(255))
    year_field_season = Column(String(100))
    start_date = Column(Date)
    end_date = Column(Date)
    project_period = Column(String(100))
    target_vs_achievement = Column(Text)
    survey_objective = Column(Text)
    xy_coordinates = Column(Text)
    kml_file_path = Column(String(500))
    survey_grid_params = Column(Text)
    acquisition_geometry = Column(Text)
    instrument_parameters = Column(Text)
    sensor_type = Column(Text)
    source_parameters = Column(Text)
    total_cost = Column(Float)
    per_unit_cost = Column(Float)
    project_highlights = Column(Text)
    category = Column(String(100))
    location = Column(String(255))
    project_map_path = Column(String(500))
    status = Column(String(50), default="Active")
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    creator = relationship("User", foreign_keys=[created_by])
    events = relationship("ProjectEvent", back_populates="project", cascade="all, delete-orphan")
    documents = relationship("ProjectDocument", back_populates="project", cascade="all, delete-orphan")

class ProjectEvent(Base):
    __tablename__ = "project_events"
    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    event_date = Column(Date, nullable=False)
    description = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    project = relationship("Project", back_populates="events")

class ProjectDocument(Base):
    __tablename__ = "project_documents"
    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500))
    file_type = Column(String(50))
    category = Column(String(50))
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    project = relationship("Project", back_populates="documents")

class Target(Base):
    __tablename__ = "targets"
    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    target_value = Column(Float, nullable=False)
    unit = Column(String(50), default="SKM")
    section = Column(String(100))
    fiscal_year = Column(String(20))
    description = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    creator = relationship("User", foreign_keys=[created_by])
    accomplishments = relationship("TargetAccomplishment", back_populates="target", cascade="all, delete-orphan")

class Highlight(Base):
    __tablename__ = "highlights"
    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    author = Column(String(100))
    icon = Column(String(10), default="🏆")
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    creator = relationship("User", foreign_keys=[created_by])

class TechnicalReport(Base):
    __tablename__ = "technical_reports"
    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    category = Column(String(100))
    author = Column(String(100))
    status = Column(String(20), default="Draft")
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    creator = relationship("User", foreign_keys=[created_by])

class TargetAccomplishment(Base):
    __tablename__ = "target_accomplishments"
    id = Column(Integer, primary_key=True, autoincrement=True)
    target_id = Column(Integer, ForeignKey("targets.id", ondelete="CASCADE"), nullable=False)
    value = Column(Float, nullable=False)
    description = Column(Text)
    recorded_by = Column(Integer, ForeignKey("users.id"))
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())
    target = relationship("Target", back_populates="accomplishments")
    recorder = relationship("User", foreign_keys=[recorded_by])

class ReportTemplate(Base):
    __tablename__ = "report_templates"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    period_type = Column(String(20), default="monthly")
    sections = Column(Text, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    creator = relationship("User", foreign_keys=[created_by])

class ReportPeriod(Base):
    __tablename__ = "report_periods"
    id = Column(Integer, primary_key=True, autoincrement=True)
    template_id = Column(Integer, ForeignKey("report_templates.id", ondelete="CASCADE"), nullable=False)
    label = Column(String(100), nullable=False)
    start_date = Column(Date)
    end_date = Column(Date)
    is_open = Column(Boolean, default=True)
    section_assignments = Column(Text, default="{}")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    template = relationship("ReportTemplate")

class ReportSubmission(Base):
    __tablename__ = "report_submissions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    period_id = Column(Integer, ForeignKey("report_periods.id", ondelete="CASCADE"), nullable=False)
    section_key = Column(String(100), nullable=False)
    assigned_to = Column(Integer, ForeignKey("users.id"))
    field_values = Column(Text, nullable=False)
    status = Column(String(20), default="draft")
    submitted_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    period = relationship("ReportPeriod")
    assignee = relationship("User", foreign_keys=[assigned_to])

class ProgressReport(Base):
    __tablename__ = "progress_reports"
    id = Column(Integer, primary_key=True, autoincrement=True)
    project_name = Column(String(255), nullable=False)
    block = Column(String(100))
    total = Column(Float, default=0)
    completed = Column(Float, default=0)
    coverage = Column(String(20))
    status = Column(String(50), default="In Progress")
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    creator = relationship("User", foreign_keys=[created_by])

class ManpowerStatus(Base):
    __tablename__ = "manpower_status"
    id = Column(Integer, primary_key=True, autoincrement=True)
    category = Column(String(255), nullable=False)
    total = Column(Integer, default=0)
    deployed = Column(Integer, default=0)
    on_leave = Column(Integer, default=0)
    training = Column(Integer, default=0)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    creator = relationship("User", foreign_keys=[created_by])

class ContractStatus(Base):
    __tablename__ = "contract_status"
    id = Column(Integer, primary_key=True, autoincrement=True)
    contract = Column(String(255), nullable=False)
    vendor = Column(String(255))
    value = Column(String(100))
    award_date = Column(Date)
    completion_date = Column(Date)
    status = Column(String(50), default="Ongoing")
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    creator = relationship("User", foreign_keys=[created_by])

class FundManagement(Base):
    __tablename__ = "fund_management"
    id = Column(Integer, primary_key=True, autoincrement=True)
    head = Column(String(255), nullable=False)
    allocated = Column(Float, default=0)
    spent = Column(Float, default=0)
    remaining = Column(Float, default=0)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    creator = relationship("User", foreign_keys=[created_by])

class DataProcessingItem(Base):
    __tablename__ = "data_processing_items"
    id = Column(Integer, primary_key=True, autoincrement=True)
    section = Column(String(100), nullable=False)
    project = Column(String(255), nullable=False)
    volume = Column(Float, default=0)
    unit = Column(String(50), default="km²")
    progress = Column(Integer, default=0)
    status = Column(String(50), default="Processing")
    due_date = Column(Date)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    creator = relationship("User", foreign_keys=[created_by])

class RegionalLabEquipment(Base):
    __tablename__ = "regional_lab_equipment"
    id = Column(Integer, primary_key=True, autoincrement=True)
    section = Column(String(100), nullable=False)
    equipment = Column(String(255), nullable=False)
    status = Column(String(50), default="Operational")
    last_calibration = Column(Date)
    next_due = Column(String(50))
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    creator = relationship("User", foreign_keys=[created_by])

class ReportingAppraisal(Base):
    __tablename__ = "reporting_appraisals"
    id = Column(Integer, primary_key=True, autoincrement=True)
    section = Column(String(100), nullable=False)
    period = Column(String(100), nullable=False)
    submitted = Column(Date)
    by = Column(String(100))
    status = Column(String(50), default="Draft")
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    creator = relationship("User", foreign_keys=[created_by])

class PendingIssue(Base):
    __tablename__ = "pending_issues"
    id = Column(Integer, primary_key=True, autoincrement=True)
    description = Column(Text, nullable=False)
    raised_by = Column(String(100))
    date = Column(Date)
    edc = Column(Date)
    status = Column(String(50), default="Open")
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    creator = relationship("User", foreign_keys=[created_by])

class HSEIncident(Base):
    __tablename__ = "hse_incidents"
    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(Date)
    incident_type = Column(String(100))
    location = Column(String(255))
    description = Column(Text)
    action_taken = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    creator = relationship("User", foreign_keys=[created_by])

class AWPItem(Base):
    __tablename__ = "awp_items"
    id = Column(Integer, primary_key=True, autoincrement=True)
    activity = Column(String(255), nullable=False)
    target = Column(String(100))
    achieved = Column(String(100))
    progress = Column(String(20))
    deadline = Column(Date)
    status = Column(String(50), default="On Track")
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    creator = relationship("User", foreign_keys=[created_by])


class Request(Base):
    __tablename__ = "requests"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    target_type = Column(String(50), default="general")
    status = Column(String(20), default="pending")
    ops_manager_id = Column(Integer, ForeignKey("users.id"))
    reviewed_by_ops = Column(Integer, ForeignKey("users.id"))
    reviewed_by_admin = Column(Integer, ForeignKey("users.id"))
    ops_comment = Column(Text)
    admin_comment = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    creator = relationship("User", foreign_keys=[user_id])
    ops_reviewer = relationship("User", foreign_keys=[reviewed_by_ops])
    admin_reviewer = relationship("User", foreign_keys=[reviewed_by_admin])


class KnowledgeItem(Base):
    __tablename__ = "knowledge_items"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    file_path = Column(String(500))
    file_name = Column(String(255))
    category = Column(String(100))
    status = Column(String(20), default="pending")
    reviewed_by_ops = Column(Integer, ForeignKey("users.id"))
    reviewed_by_admin = Column(Integer, ForeignKey("users.id"))
    ops_comment = Column(Text)
    admin_comment = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    creator = relationship("User", foreign_keys=[user_id])
    ops_reviewer = relationship("User", foreign_keys=[reviewed_by_ops])
    admin_reviewer = relationship("User", foreign_keys=[reviewed_by_admin])


class AcquisitionTarget(Base):
    __tablename__ = "acquisition_targets"
    id = Column(Integer, primary_key=True, index=True)
    project_name = Column(String(255), nullable=False, index=True)
    project_type = Column(String(50))
    financial_year = Column(String(20), nullable=False)
    type = Column(String(10), nullable=False)
    basin = Column(String(100))

    apr = Column(Float, default=0)
    may = Column(Float, default=0)
    jun = Column(Float, default=0)
    jul = Column(Float, default=0)
    aug = Column(Float, default=0)
    sep = Column(Float, default=0)
    oct = Column(Float, default=0)
    nov = Column(Float, default=0)
    dec = Column(Float, default=0)
    jan = Column(Float, default=0)
    feb = Column(Float, default=0)
    mar = Column(Float, default=0)

    apr_ach = Column(Float, nullable=True)
    may_ach = Column(Float, nullable=True)
    jun_ach = Column(Float, nullable=True)
    jul_ach = Column(Float, nullable=True)
    aug_ach = Column(Float, nullable=True)
    sep_ach = Column(Float, nullable=True)
    oct_ach = Column(Float, nullable=True)
    nov_ach = Column(Float, nullable=True)
    dec_ach = Column(Float, nullable=True)
    jan_ach = Column(Float, nullable=True)
    feb_ach = Column(Float, nullable=True)
    mar_ach = Column(Float, nullable=True)

    total = Column(Float, default=0)
    total_ach = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class ManpowerEmployee(Base):
    __tablename__ = "manpower_employees"
    id = Column(Integer, primary_key=True, index=True)
    section = Column(String(100), nullable=False, index=True)
    basin = Column(String(100))
    sl_no = Column(Integer)
    cpf_no = Column(String(20))
    name = Column(String(200))
    designation = Column(String(200))
    mobile = Column(String(20))
    level = Column(String(20))
    crc = Column(String(20))
    assignment = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
