from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, Text, Float, JSON
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.sql import func
from app.models.base import Base

class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    id = Column(Integer, primary_key=True, autoincrement=True)
    file_id = Column(Integer, ForeignKey("files.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    chunk_text = Column(Text, nullable=False)
    embedding = Column(Text, nullable=True)
    chunk_metadata = Column("metadata", JSON, default=dict)
    page_number = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class KgEntity(Base):
    __tablename__ = "kg_entities"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    entity_type = Column("type", String(50), nullable=False)
    properties = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class KgRelationship(Base):
    __tablename__ = "kg_relationships"
    id = Column(Integer, primary_key=True, autoincrement=True)
    source_id = Column(Integer, ForeignKey("kg_entities.id", ondelete="CASCADE"), nullable=False)
    target_id = Column(Integer, ForeignKey("kg_entities.id", ondelete="CASCADE"), nullable=False)
    relationship = Column(String(100), nullable=False)
    properties = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class AiAuditLog(Base):
    __tablename__ = "ai_audit_logs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    query = Column(Text)
    response = Column(Text)
    agent_type = Column(String(50))
    documents_retrieved = Column(ARRAY(Integer), default=list)
    sql_query = Column(Text)
    chart_data = Column(JSON)
    tokens_used = Column(Integer, default=0)
    processing_time_ms = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
