from datetime import datetime, date
from sqlalchemy import String, Integer, ForeignKey, DateTime, Date, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base

class Person(Base):
    __tablename__ = "persons"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    password: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, default="member")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    workspaces = relationship("Workspace", back_populates="owner", cascade="all, delete")
    tickets = relationship("Ticket", back_populates="assignee", foreign_keys="Ticket.assignee_id")


class Workspace(Base):
    __tablename__ = "workspaces"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=True)
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("persons.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    owner = relationship("Person", back_populates="workspaces")
    tickets = relationship("Ticket", back_populates="workspace", cascade="all, delete-orphan")


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="todo")  # todo | in_progress | done
    due_date: Mapped[date] = mapped_column(Date, nullable=True)
    workspace_id: Mapped[int] = mapped_column(Integer, ForeignKey("workspaces.id"))
    assignee_id: Mapped[int] = mapped_column(Integer, ForeignKey("persons.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    workspace = relationship("Workspace", back_populates="tickets")
    assignee = relationship("Person", back_populates="tickets", foreign_keys=[assignee_id])
