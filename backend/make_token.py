import os
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError

SECRET_KEY = os.getenv("SECRET_KEY", "change-this-in-production-please")
ALGORITHM = "HS256"
EXPIRE_HOURS = 24

def buildTokenForUser(user_id: int, role: str) -> str:
    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=EXPIRE_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decodeToken(token: str) -> dict:
    # raises JWTError if expired or tampered
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
