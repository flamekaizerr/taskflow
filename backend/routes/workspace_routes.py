from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Person, Workspace, Ticket
from schemas import WorkspaceIn, WorkspaceOut
from login_gate import kickOutUnauthorized, requireAdminRole
from typing import List

router = APIRouter(prefix="/api/workspaces", tags=["workspaces"])

@router.get("", response_model=List[WorkspaceOut])
def pullWorkspaceList(
    db: Session = Depends(get_db),
    _: Person = Depends(kickOutUnauthorized),
):
    workspaces = db.query(Workspace).order_by(Workspace.created_at.desc()).all()
    result = []
    for ws in workspaces:
        count = db.query(Ticket).filter(Ticket.workspace_id == ws.id).count()
        out = WorkspaceOut.model_validate(ws)
        out.ticket_count = count
        result.append(out)
    return result

@router.get("/{workspace_id}", response_model=WorkspaceOut)
def getWorkspace(
    workspace_id: int,
    db: Session = Depends(get_db),
    _: Person = Depends(kickOutUnauthorized),
):
    ws = db.get(Workspace, workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Project not found.")
    count = db.query(Ticket).filter(Ticket.workspace_id == ws.id).count()
    out = WorkspaceOut.model_validate(ws)
    out.ticket_count = count
    return out

@router.post("", response_model=WorkspaceOut, status_code=201)
def createWorkspace(
    body: WorkspaceIn,
    db: Session = Depends(get_db),
    current_user: Person = Depends(requireAdminRole),
):
    ws = Workspace(name=body.name, description=body.description, owner_id=current_user.id)
    db.add(ws)
    db.commit()
    db.refresh(ws)
    out = WorkspaceOut.model_validate(ws)
    out.ticket_count = 0
    return out

@router.delete("/{workspace_id}", status_code=204)
def wipeWorkspace(
    workspace_id: int,
    db: Session = Depends(get_db),
    _: Person = Depends(requireAdminRole),
):
    ws = db.get(Workspace, workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Project not found.")
    db.delete(ws)
    db.commit()
