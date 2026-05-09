from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import date, datetime, timezone, timedelta
from typing import Optional
from database import get_db
from models import Person, Workspace, Ticket
from schemas import DashboardOut
from login_gate import kickOutUnauthorized

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("", response_model=DashboardOut)
def pullDashboardStats(
    tz_offset: Optional[int] = Query(None, description="Client timezone offset in minutes (e.g. -330 for IST)"),
    db: Session = Depends(get_db),
    _: Person = Depends(kickOutUnauthorized),
):
    total_workspaces = db.query(Workspace).count()
    tickets = db.query(Ticket).all()
    total_tickets = len(tickets)

    by_status = {"todo": 0, "in_progress": 0, "done": 0}
    overdue_count = 0

    # Use client timezone offset to compute the correct "today" for the user.
    # JS Date.getTimezoneOffset() returns minutes *behind* UTC (e.g. IST = -330),
    # so we negate it to get the UTC offset.
    if tz_offset is not None:
        client_tz = timezone(timedelta(minutes=-tz_offset))
        today = datetime.now(client_tz).date()
    else:
        today = date.today()

    for t in tickets:
        if t.status in by_status:
            by_status[t.status] += 1
        # overdue: past due date and not done
        if t.due_date and t.due_date < today and t.status != "done":
            overdue_count += 1

    return DashboardOut(
        total_workspaces=total_workspaces,
        total_tickets=total_tickets,
        by_status=by_status,
        overdue_count=overdue_count,
    )
