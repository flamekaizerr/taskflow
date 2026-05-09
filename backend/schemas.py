from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date, datetime

# ── Auth ──────────────────────────────────────────────────────────────────────
class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Optional[str] = "member"

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"

class PersonOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    model_config = {"from_attributes": True}

# ── Workspace ─────────────────────────────────────────────────────────────────
class WorkspaceIn(BaseModel):
    name: str
    description: Optional[str] = None

class WorkspaceOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    owner_id: int
    created_at: datetime
    ticket_count: Optional[int] = 0
    model_config = {"from_attributes": True}

# ── Ticket ────────────────────────────────────────────────────────────────────
class TicketIn(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "todo"
    due_date: Optional[date] = None
    workspace_id: int
    assignee_id: Optional[int] = None

class TicketPatch(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[date] = None
    assignee_id: Optional[int] = None

class TicketOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: str
    due_date: Optional[date]
    workspace_id: int
    workspace_name: Optional[str] = None
    assignee_id: Optional[int]
    assignee: Optional[PersonOut] = None
    created_at: datetime
    model_config = {"from_attributes": True}

# ── Dashboard ─────────────────────────────────────────────────────────────────
class DashboardOut(BaseModel):
    total_workspaces: int
    total_tickets: int
    by_status: dict
    overdue_count: int
