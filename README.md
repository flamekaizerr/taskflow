# TaskFlow

A full-stack task and project management app. Teams get a shared board to track projects and tickets, with a role split between admins (who create and delete) and members (who update task status).

---

## Tech Stack

| Layer     | Tech                                      |
|-----------|-------------------------------------------|
| Backend   | Python 3.11, FastAPI, SQLAlchemy, SQLite  |
| Auth      | JWT (python-jose), bcrypt (passlib)       |
| Frontend  | React 18, Vite, React Router v6, Axios   |
| Styling   | Plain CSS with custom properties          |
| Deploy    | Railway (backend) + Vercel (frontend)     |

---

## Run Locally

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

API runs at **http://localhost:8000**  
Interactive docs at **http://localhost:8000/docs**

The SQLite database (`taskflow.db`) is created automatically on first run.  
Demo accounts are seeded on startup.

### 2. Frontend

```bash
cd frontend
npm install
# optional: set the backend URL
echo "VITE_API_URL=http://localhost:8000" > .env.local
npm run dev
```

App runs at **http://localhost:3000**

---

## API Endpoints

### Auth
| Method | Path                | Description                    |
|--------|---------------------|--------------------------------|
| POST   | /api/auth/register  | Create account, returns JWT    |
| POST   | /api/auth/login     | Email + password, returns JWT  |
| GET    | /api/auth/me        | Get current user info          |

### Workspaces (Projects)
| Method | Path                      | Role   | Description                         |
|--------|---------------------------|--------|-------------------------------------|
| GET    | /api/workspaces           | any    | List all projects                   |
| GET    | /api/workspaces/{id}      | any    | Get a single project                |
| POST   | /api/workspaces           | admin  | Create a project                    |
| DELETE | /api/workspaces/{id}      | admin  | Delete project and all its tasks    |

### Tickets (Tasks)
| Method | Path                              | Role   | Description                        |
|--------|-----------------------------------|--------|-------------------------------------|
| GET    | /api/tickets?workspace_id={id}    | any    | List tasks for a project           |
| GET    | /api/tickets/mine                 | any    | Tasks assigned to current user     |
| GET    | /api/tickets/shared               | any    | Unassigned or pool tasks           |
| POST   | /api/tickets                      | admin  | Create a task                      |
| PATCH  | /api/tickets/{id}                 | any    | Update task (member: status only)  |
| DELETE | /api/tickets/{id}                 | admin  | Delete a task                      |

### Users & Dashboard
| Method | Path            | Role   | Description                          |
|--------|-----------------|--------|--------------------------------------|
| GET    | /api/users      | admin  | List all users (for assign dropdown) |
| GET    | /api/dashboard  | any    | Stats: totals, by_status, overdue    |

---

## Demo Credentials

| Role   | Email              | Password  |
|--------|--------------------|-----------| 
| Admin  | admin@demo.com     | admin123  |
| Member | member@demo.com    | member123 |

Seeded automatically on first startup.

---

## Deploy to Railway + Vercel

### Backend to Railway

1. Push `backend/` to a GitHub repo
2. Create a new Railway project, select "Deploy from GitHub"
3. Set environment variables in the Railway dashboard:
   - `SECRET_KEY` = any long random string
   - `CORS_ORIGINS` = your Vercel frontend URL (e.g. `https://taskflow.vercel.app`)
4. Railway auto-detects the `Procfile` and deploys

### Frontend to Vercel

1. Push `frontend/` to a GitHub repo (or a subfolder)
2. Import the project on vercel.com
3. Set environment variable:
   - `VITE_API_URL` = your Railway backend URL (e.g. `https://taskflow-api.railway.app`)
4. Deploy. Vercel runs `npm run build` automatically.

### Live URL

**https://\<your-app\>.vercel.app** *(update after deployment)*

---

## Role Permissions

| Feature              | Admin | Member |
|----------------------|-------|--------|
| Create project       | Yes   | No     |
| Delete project       | Yes   | No     |
| Add task             | Yes   | No     |
| Delete task          | Yes   | No     |
| Update task status   | Yes   | Yes    |
| View dashboard       | Yes   | Yes    |
| Assign tasks         | Yes   | No     |

---

## Project Structure

```
taskflow/
├── backend/
│   ├── main.py              # app entry, seeds demo data
│   ├── database.py          # SQLAlchemy engine + session
│   ├── models.py            # Person, Workspace, Ticket ORM models
│   ├── schemas.py           # Pydantic request/response shapes
│   ├── make_token.py        # JWT creation + decoding
│   ├── login_gate.py        # auth middleware + admin guard
│   ├── routes/
│   │   ├── auth_routes.py
│   │   ├── workspace_routes.py
│   │   ├── ticket_routes.py
│   │   ├── user_routes.py
│   │   └── dashboard_routes.py
│   ├── requirements.txt
│   ├── Procfile
│   └── railway.toml
│
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── main.jsx
    │   ├── api.js
    │   ├── auth_store.jsx
    │   ├── components/Layout.jsx
    │   ├── pages/
    │   │   ├── login_page.jsx
    │   │   ├── dashboard.jsx
    │   │   ├── board.jsx
    │   │   ├── task_board.jsx
    │   │   └── my_tasks.jsx
    │   └── styles/
    │       ├── base.css
    │       └── components.css
    ├── index.html
    ├── vite.config.js
    └── package.json
```
