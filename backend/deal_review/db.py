"""One wide table is enough here — a run's entire result is one JSON document, so a
normalized schema would just be extra joins for no query we actually make."""
import datetime
import os
import uuid

from sqlalchemy import JSON, DateTime, String, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./deal_review.db")
engine = create_engine(DATABASE_URL, pool_pre_ping=True)


class Base(DeclarativeBase):
    pass


class Run(Base):
    __tablename__ = "runs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    filename: Mapped[str] = mapped_column(String)
    rules_filename: Mapped[str] = mapped_column(String, default="lending_policy.yaml")
    status: Mapped[str] = mapped_column(String, default="processing")  # processing|completed|error
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow
    )
    result_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    report_markdown: Mapped[str | None] = mapped_column(String, nullable=True)
    audit_log: Mapped[list] = mapped_column(JSON, default=list)
    error: Mapped[str | None] = mapped_column(String, nullable=True)


def init_db():
    Base.metadata.create_all(engine)


def get_session() -> Session:
    return Session(engine)
