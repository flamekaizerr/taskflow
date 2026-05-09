from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Person
from schemas import PersonOut
from login_gate import requireAdminRole

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("", response_model=List[PersonOut])
def listAllUsers(
    db: Session = Depends(get_db),
    _: Person = Depends(requireAdminRole),
):
    # grabs everyone for the assignee dropdown
    return db.query(Person).order_by(Person.name).all()
