from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from database import get_db
from models import Person
from schemas import RegisterIn, LoginIn, TokenOut, PersonOut
from make_token import buildTokenForUser
from login_gate import kickOutUnauthorized

router = APIRouter(prefix="/api/auth", tags=["auth"])
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

@router.post("/register", response_model=TokenOut, status_code=201)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    if db.query(Person).filter(Person.email == body.email).first():
        raise HTTPException(status_code=409, detail="Email already taken.")
    if body.role not in ("admin", "member"):
        raise HTTPException(status_code=422, detail="Role must be admin or member.")
    person = Person(
        name=body.name,
        email=body.email,
        password=pwd.hash(body.password),
        role=body.role,
    )
    db.add(person)
    db.commit()
    db.refresh(person)
    return {"access_token": buildTokenForUser(person.id, person.role)}

@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    person = db.query(Person).filter(Person.email == body.email).first()
    if not person or not pwd.verify(body.password, person.password):
        raise HTTPException(status_code=401, detail="Wrong email or password. Try again.")
    return {"access_token": buildTokenForUser(person.id, person.role)}

@router.get("/me", response_model=PersonOut)
def get_me(current_user: Person = Depends(kickOutUnauthorized)):
    return current_user
