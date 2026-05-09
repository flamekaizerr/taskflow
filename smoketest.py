"""
TaskFlow smoke test — runs against http://localhost:8000
Covers every scenario listed in the test plan.
"""
import sys
import requests
from datetime import date, timedelta

BASE = "http://localhost:8000"
PASS = "\033[92m  PASS\033[0m"
FAIL = "\033[91m  FAIL\033[0m"
HEAD = "\033[1m{}\033[0m"

failures = []

def check(label, condition, detail=""):
    if condition:
        print(f"{PASS}  {label}")
    else:
        print(f"{FAIL}  {label}" + (f"  →  {detail}" if detail else ""))
        failures.append(label)

def section(title):
    print(f"\n{HEAD.format(title)}")

def api(method, path, token=None, **kwargs):
    headers = kwargs.pop("headers", {})
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = getattr(requests, method)(f"{BASE}{path}", headers=headers, **kwargs)
    return r

# ─────────────────────────────────────────────────────────────────────────────
section("── HEALTH ──────────────────────────────────────────────────────────")
r = api("get", "/")
check("API root reachable", r.status_code == 200)

# ─────────────────────────────────────────────────────────────────────────────
section("── ADMIN FLOW ──────────────────────────────────────────────────────")

r = api("post", "/api/auth/login", json={"email": "admin@demo.com", "password": "admin123"})
check("Admin login returns 200",         r.status_code == 200, r.text)
check("Admin token present",             "access_token" in r.json())
admin_token = r.json().get("access_token", "")

r = api("get", "/api/auth/me", token=admin_token)
check("Admin /me returns correct role",  r.json().get("role") == "admin")
admin_id = r.json().get("id")

# Dashboard
r = api("get", "/api/dashboard", token=admin_token)
d = r.json()
check("Dashboard: 4 stat keys present",
      all(k in d for k in ("total_workspaces","total_tickets","by_status","overdue_count")),
      str(d))
check("Dashboard: by_status has 3 columns",
      all(k in d["by_status"] for k in ("todo","in_progress","done")))
check("Dashboard: pre-seeded workspaces ≥ 2", d.get("total_workspaces", 0) >= 2)
check("Dashboard: pre-seeded tickets ≥ 5",    d.get("total_tickets", 0) >= 5)

# Projects list
r = api("get", "/api/workspaces", token=admin_token)
projects = r.json()
check("Projects list returns 200",            r.status_code == 200)
check("Projects: ≥ 2 pre-seeded projects",    len(projects) >= 2)
check("Projects: each has name + id",         all("name" in p and "id" in p for p in projects))
check("Projects: ticket_count present",       all("ticket_count" in p for p in projects))

# Create project
r = api("post", "/api/workspaces", token=admin_token,
        json={"name": "Smoke Test Project", "description": "Auto-generated"})
check("Create project returns 201",           r.status_code == 201, r.text)
new_ws = r.json()
check("New project has correct name",         new_ws.get("name") == "Smoke Test Project")
new_ws_id = new_ws.get("id")

# Fetch the new project by ID
r = api("get", f"/api/workspaces/{new_ws_id}", token=admin_token)
check("GET single workspace returns 200",     r.status_code == 200)
check("Single workspace name matches",        r.json().get("name") == "Smoke Test Project")

# Tasks in an existing project
existing_ws_id = projects[0]["id"]
r = api("get", "/api/tickets", token=admin_token, params={"workspace_id": existing_ws_id})
tasks = r.json()
check("Tasks list for project returns 200",   r.status_code == 200)
check("Pre-seeded tasks present (≥ 1)",       len(tasks) >= 1)

# Create task with overdue date
past = (date.today() - timedelta(days=2)).isoformat()
r = api("post", "/api/tickets", token=admin_token,
        json={"title": "Smoke overdue task", "workspace_id": new_ws_id, "due_date": past})
check("Create task (overdue) returns 201",    r.status_code == 201, r.text)
task = r.json()
check("Task title matches",                   task.get("title") == "Smoke overdue task")
check("Task status defaults to todo",         task.get("status") == "todo")
check("Task due_date set correctly",          task.get("due_date") == past)
task_id = task.get("id")

# Overdue flag is computed on frontend — verify due_date < today
check("Overdue condition: due_date is in the past",
      task.get("due_date") < date.today().isoformat())

# Cycle status: todo → in_progress
r = api("patch", f"/api/tickets/{task_id}", token=admin_token, json={"status": "in_progress"})
check("Status cycle todo→in_progress",        r.status_code == 200 and r.json().get("status") == "in_progress", r.text)

# Cycle status: in_progress → done
r = api("patch", f"/api/tickets/{task_id}", token=admin_token, json={"status": "done"})
check("Status cycle in_progress→done",        r.status_code == 200 and r.json().get("status") == "done", r.text)

# Admin-only: invalid status rejected
r = api("patch", f"/api/tickets/{task_id}", token=admin_token, json={"status": "flying"})
check("Invalid status rejected (422)",        r.status_code == 422)

# Delete the task
r = api("delete", f"/api/tickets/{task_id}", token=admin_token)
check("Delete task returns 204",              r.status_code == 204)

# Confirm deleted
r = api("patch", f"/api/tickets/{task_id}", token=admin_token, json={"status": "todo"})
check("Patching deleted task returns 404",    r.status_code == 404)

# My Tasks + Shared Tasks endpoints
r = api("get", "/api/tickets/mine", token=admin_token)
check("GET /tickets/mine returns 200",        r.status_code == 200)
mine = r.json()
check("/tickets/mine only contains admin's tasks",
      all(t.get("assignee_id") == admin_id for t in mine), str([t.get("assignee_id") for t in mine]))
check("/tickets/mine includes workspace_name", all(t.get("workspace_name") for t in mine))

r = api("get", "/api/tickets/shared", token=admin_token)
check("GET /tickets/shared returns 200",      r.status_code == 200)
shared = r.json()
check("/tickets/shared contains only unassigned or pool tasks",
      all(t.get("assignee_id") is None or t.get("assignee", {}) and t["assignee"].get("email") == "admin@demo.com"
          for t in shared))

# Users list (admin only)
r = api("get", "/api/users", token=admin_token)
check("GET /api/users returns 200",           r.status_code == 200)
check("Users list has ≥ 2 entries",           len(r.json()) >= 2)

# Delete the smoke-test project
r = api("delete", f"/api/workspaces/{new_ws_id}", token=admin_token)
check("Delete project returns 204",           r.status_code == 204)

# ─────────────────────────────────────────────────────────────────────────────
section("── MEMBER FLOW ─────────────────────────────────────────────────────")

r = api("post", "/api/auth/login", json={"email": "member@demo.com", "password": "member123"})
check("Member login returns 200",             r.status_code == 200, r.text)
member_token = r.json().get("access_token", "")

r = api("get", "/api/auth/me", token=member_token)
check("Member /me returns correct role",      r.json().get("role") == "member")
member_id = r.json().get("id")

# Dashboard still works
r = api("get", "/api/dashboard", token=member_token)
check("Member dashboard returns 200",         r.status_code == 200)

# Projects readable by member
r = api("get", "/api/workspaces", token=member_token)
check("Member can list projects",             r.status_code == 200)

# Member CANNOT create project
r = api("post", "/api/workspaces", token=member_token,
        json={"name": "Member Hack", "description": ""})
check("Member create project blocked (403)",  r.status_code == 403, r.text)

# Member CANNOT create task
r = api("post", "/api/tickets", token=member_token,
        json={"title": "Hack task", "workspace_id": projects[0]["id"]})
check("Member create task blocked (403)",     r.status_code == 403, r.text)

# Member CANNOT delete a task
all_tasks = api("get", "/api/tickets", token=admin_token,
                params={"workspace_id": projects[0]["id"]}).json()
some_task_id = all_tasks[0]["id"] if all_tasks else None
if some_task_id:
    r = api("delete", f"/api/tickets/{some_task_id}", token=member_token)
    check("Member delete task blocked (403)", r.status_code == 403, r.text)

# Member CANNOT delete project
r = api("delete", f"/api/workspaces/{projects[0]['id']}", token=member_token)
check("Member delete project blocked (403)", r.status_code == 403, r.text)

# Member CAN update status on their own task
member_tasks_r = api("get", "/api/tickets/mine", token=member_token)
check("Member GET /tickets/mine returns 200", member_tasks_r.status_code == 200)
member_tasks = member_tasks_r.json()

if member_tasks:
    mt = member_tasks[0]
    orig_status = mt["status"]
    next_status = {"todo": "in_progress", "in_progress": "done", "done": "todo"}[orig_status]
    r = api("patch", f"/api/tickets/{mt['id']}", token=member_token, json={"status": next_status})
    check("Member cycles status on own task",     r.status_code == 200 and r.json()["status"] == next_status, r.text)
    # restore
    api("patch", f"/api/tickets/{mt['id']}", token=member_token, json={"status": orig_status})
else:
    print("  SKIP  Member own-task status cycle (no tasks assigned to member)")

# Member CANNOT update status on admin's task
admin_tasks = api("get", "/api/tickets/mine", token=admin_token).json()
if admin_tasks:
    at = admin_tasks[0]
    r = api("patch", f"/api/tickets/{at['id']}", token=member_token, json={"status": "done"})
    check("Member blocked from updating admin's task (403)", r.status_code == 403, r.text)

# Member shared tasks
r = api("get", "/api/tickets/shared", token=member_token)
check("Member GET /tickets/shared returns 200", r.status_code == 200)
m_shared = r.json()
check("Member shared tasks are unassigned or member-pool only",
      all(t.get("assignee_id") is None or
          (t.get("assignee") and t["assignee"].get("email") == "member@demo.com")
          for t in m_shared))

# ─────────────────────────────────────────────────────────────────────────────
section("── SECURITY / EDGE CASES ───────────────────────────────────────────")

# Unauthenticated requests blocked
r = api("get", "/api/workspaces")
check("Unauth GET /workspaces → 401/403",     r.status_code in (401, 403))
r = api("get", "/api/dashboard")
check("Unauth GET /dashboard → 401/403",      r.status_code in (401, 403))
r = api("get", "/api/tickets/mine")
check("Unauth GET /tickets/mine → 401/403",   r.status_code in (401, 403))

# Wrong credentials
r = api("post", "/api/auth/login", json={"email": "admin@demo.com", "password": "wrongpass"})
check("Bad password → 401",                   r.status_code == 401)

# Non-existent workspace
r = api("get", "/api/workspaces/999999", token=admin_token)
check("GET non-existent workspace → 404",     r.status_code == 404)

# ─────────────────────────────────────────────────────────────────────────────
section("── RESULTS ─────────────────────────────────────────────────────────")
total_checks = 0  # count from output — just report failures
if failures:
    print(f"\n\033[91m{len(failures)} failure(s):\033[0m")
    for f in failures:
        print(f"  • {f}")
    sys.exit(1)
else:
    print("\n\033[92mAll checks passed — app looks deploy-ready.\033[0m")
    sys.exit(0)
