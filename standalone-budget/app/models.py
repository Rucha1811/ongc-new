from sqlalchemy import Column, Integer, String, Float, DateTime, func
from app.database import Base


class AcquisitionTarget(Base):
    __tablename__ = "acquisition_targets"

    id = Column(Integer, primary_key=True, index=True)
    project_name = Column(String, nullable=False, index=True)
    financial_year = Column(String, nullable=False)
    type = Column(String, nullable=False)  # "BE" or "RE"

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
    total = Column(Float, default=0)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Manpower(Base):
    __tablename__ = "manpower"

    id = Column(Integer, primary_key=True, index=True)
    section = Column(String, nullable=False, index=True)
    sl_no = Column(Integer, nullable=True)
    cpf_no = Column(String, nullable=True)
    name = Column(String, nullable=True)
    designation = Column(String, nullable=True)
    mobile = Column(String, nullable=True)
    level = Column(String, nullable=True)
    crc = Column(String, nullable=True)
    assignment = Column(String, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
