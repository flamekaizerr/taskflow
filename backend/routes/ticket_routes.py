from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from database import get_db
from models import Person, Ticket, Workspace
from schemas import TicketIn, TicketOut, TicketPatch
from login_gate import kickOutUnauthorized, requireAdminRole

router = APIRouter(prefix="/api/tickets", tags=["tickets"])

# pool accounts used as role-level shared assignees
ADMIN_POOL_EMAIL  = "admin@demo.com"
MEMBER_POOL_EMAIL = "member@demo.com"

def _pool_id(db: Session, email: str) -> int | None:
    u = db.query(Person).filter(Person.email == email).first()
    return u.id if u else None

@router.get("", response_model=List[TicketOut])
def pullTasksForProject(
    workspace_id: int = Query(...),
    db: Session = Depends(get_db),
    _: Person = Depends(kickOutUnauthorized),
):
    tickets = (
        db.query(Ticket)
        .options(joinedload(Ticket.assignee))
        .filter(Ticket.workspace_id == workspace_id)
        .order_by(Ticket.created_at.desc())
        .all()
    )
    return tickets

@router.post("", response_model=TicketOut, status_code=201)
def createTicket(
    body: TicketIn,
    db: Session = Depends(get_db),
    _: Person = Depends(requireAdminRole),
):
    ws = db.get(Workspace, body.workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Project not found.")
    ticket = Ticket(**body.model_dump())
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    # reload with assignee joined
    return db.query(Ticket).options(joinedload(Ticket.assignee)).filter(Ticket.id == ticket.id).first()

@router.get("/mine", response_model=List[TicketOut])
def getMyTickets(
    db: Session = Depends(get_db),
    current_user: Person = Depends(kickOutUnauthorized),
):
    tickets = (
        db.query(Ticket)
        .options(joinedload(Ticket.assignee), joinedload(Ticket.workspace))
        .filter(Ticket.assignee_id == current_user.id)
        .order_by(Ticket.created_at.desc())
        .all()
    )
    result = []
    for t in tickets:
        out = TicketOut.model_validate(t)
        out.workspace_name = t.workspace.name
        result.append(out)
    return result

@router.get("/shared", response_model=List[TicketOut])
def getSharedTickets(
    db: Session = Depends(get_db),
    current_user: Person = Depends(kickOutUnauthorized),
):
    pool_email = ADMIN_POOL_EMAIL if current_user.role == "admin" else MEMBER_POOL_EMAIL
    pool_id = _pool_id(db, pool_email)

    # unassigned OR assigned to the role's pool account
    cond = or_(Ticket.assignee_id == None, Ticket.assignee_id == pool_id) if pool_id else Ticket.assignee_id == None
    tickets = (
        db.query(Ticket)
        .options(joinedload(Ticket.assignee), joinedload(Ticket.workspace))
        .filter(cond)
        .order_by(Ticket.created_at.desc())
        .all()
    )
    result = []
    for t in tickets:
        out = TicketOut.model_validate(t)
        out.workspace_name = t.workspace.name
        result.append(out)
    return result

@router.patch("/{ticket_id}", response_model=TicketOut)
def updateTicket(
    ticket_id: int,
    body: TicketPatch,
    db: Session = Depends(get_db),
    current_user: Person = Depends(kickOutUnauthorized),
):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Task not found.")

    # members can only update: their own, unassigned, or member-pool tickets
    updates = body.model_dump(exclude_none=True)
    if current_user.role == "member":
        member_pool_id = _pool_id(db, MEMBER_POOL_EMAIL)
        permitted = (
            ticket.assignee_id is None
            or ticket.assignee_id == current_user.id
            or (member_pool_id and ticket.assignee_id == member_pool_id)
        )
        if not permitted:
            raise HTTPException(status_code=403, detail="You can only update tasks assigned to you, the shared pool, or unassigned tasks.")
        allowed = {"status"}
        updates = {k: v for k, v in updates.items() if k in allowed}

    valid_statuses = {"todo", "in_progress", "done"}
    if "status" in updates and updates["status"] not in valid_statuses:
        raise HTTPException(status_code=422, detail="Status must be todo, in_progress, or done.")

    for field, val in updates.items():
        setattr(ticket, field, val)
    db.commit()
    return db.query(Ticket).options(joinedload(Ticket.assignee)).filter(Ticket.id == ticket_id).first()

@router.delete("/{ticket_id}", status_code=204)
def wipeTicketFromBoard(
    ticket_id: int,
    db: Session = Depends(get_db),
    _: Person = Depends(requireAdminRole),
):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Task not found.")
    db.delete(ticket)
    db.commit()
