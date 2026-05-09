import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, SessionLocal
from models import Person, Workspace, Ticket
from passlib.context import CryptContext
from routes import auth_routes, workspace_routes, ticket_routes, user_routes, dashboard_routes

app = FastAPI(title="TaskFlow API", version="1.0.0")

# allow frontend origin — set CORS_ORIGINS env var in production
origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)
app.include_router(workspace_routes.router)
app.include_router(ticket_routes.router)
app.include_router(user_routes.router)
app.include_router(dashboard_routes.router)

@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    seed_demo_data()

def seed_demo_data():
    pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
    db = SessionLocal()
    try:
        # only seed if fresh db
        if db.query(Person).count() > 0:
            return

        admin = Person(name="Admin User", email="admin@demo.com",
                       password=pwd.hash("admin123"), role="admin")
        member = Person(name="Member User", email="member@demo.com",
                        password=pwd.hash("member123"), role="member")
        db.add_all([admin, member])
        db.commit()
        db.refresh(admin)
        db.refresh(member)

        ws1 = Workspace(name="Website Redesign", description="Revamp the marketing site", owner_id=admin.id)
        ws2 = Workspace(name="Mobile App v2", description="New features for Q3", owner_id=admin.id)
        db.add_all([ws1, ws2])
        db.commit()
        db.refresh(ws1)
        db.refresh(ws2)

        from datetime import date, timedelta
        today = date.today()
        tickets = [
            Ticket(title="Set up design system", status="done", workspace_id=ws1.id, assignee_id=admin.id),
            Ticket(title="Build landing page", status="in_progress", workspace_id=ws1.id, assignee_id=member.id, due_date=today + timedelta(days=3)),
            Ticket(title="Write copy for hero section", status="todo", workspace_id=ws1.id, assignee_id=member.id, due_date=today - timedelta(days=2)),
            Ticket(title="Implement auth flow", status="done", workspace_id=ws2.id, assignee_id=admin.id),
            Ticket(title="Push notification service", status="in_progress", workspace_id=ws2.id, assignee_id=member.id, due_date=today + timedelta(days=7)),
            Ticket(title="App Store submission", status="todo", workspace_id=ws2.id, due_date=today - timedelta(days=1)),
        ]
        db.add_all(tickets)
        db.commit()
    finally:
        db.close()

@app.get("/")
def root():
    return {"status": "TaskFlow API is running."}
