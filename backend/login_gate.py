from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError
from database import get_db
from models import Person
from make_token import decodeToken

bearer_scheme = HTTPBearer()

def kickOutUnauthorized(
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Person:
    # checks if the token's legit, kicks them out if not
    try:
        payload = decodeToken(creds.credentials)
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalid or expired.")

    person = db.get(Person, user_id)
    if not person:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")
    return person

def requireAdminRole(current_user: Person = Depends(kickOutUnauthorized)) -> Person:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins only.")
    return current_user
