# TaskFlow - Complete Setup Guide

## Backend Setup (Django)

### 1. Start Backend Server
```powershell
cd backend
.\.venv\Scripts\python manage.py runserver
```
Server runs on: http://127.0.0.1:8000

### 2. Create a Scrum Master User
```powershell
cd backend
.\.venv\Scripts\python manage.py shell
```
```python
from django.contrib.auth import get_user_model
User = get_user_model()

# Create Scrum Master
scrum_master = User.objects.create_user(
    username='scrum_master',
    email='scrum@example.com',
    password='password123',
    first_name='Scrum',
    last_name='Master',
    role='scrum_master'
)
print(f"Created Scrum Master: {scrum_master.email}")

# Create Employee
employee = User.objects.create_user(
    username='employee1',
    email='emp@example.com',
    password='password123',
    first_name='John',
    last_name='Doe',
    role='employee'
)
print(f"Created Employee: {employee.email}")
exit()
```

## Frontend Setup (React)

### 1. Set Environment Variables
Create `frontend/.env`:
```
REACT_APP_API_URL=http://127.0.0.1:8000/api
```

### 2. Start Frontend
```powershell
cd frontend
npm start
```
Frontend runs on: http://localhost:3000

## How to Use TaskFlow

### Step 1: Login as Scrum Master
- Go to http://localhost:3000/login
- Email: scrum@example.com
- Password: password123

### Step 2: Create a Project
- Click "Projects" in sidebar
- Click "New Project"
- Enter project name and description
- Click "Create Project"

### Step 3: Create Tasks
- Click "Tasks" in sidebar
- Click "New Task"
- Fill in:
  - Title: "Setup CI/CD"
  - Description: "Configure GitHub Actions"
  - Project: Select your project
  - Assignee: Select employee
  - Priority: Medium
  - Status: To Do
  - Due Date: (optional)
- Click "Create Task"

### Step 4: View Kanban Board
- Click "Kanban" in sidebar
- Drag tasks between columns to update status
- Click tasks to edit (Scrum Master only)

### Step 5: Manage Users (Scrum Master only)
- Click "Users" in sidebar
- Add new employees
- Edit user roles

## API Endpoints

### Authentication
- POST /api/auth/login/ - Login
- POST /api/auth/register/ - Register
- POST /api/auth/token/refresh/ - Refresh token

### Projects (Scrum Master only)
- GET /api/projects/ - List projects
- POST /api/projects/ - Create project
- GET /api/projects/{id}/ - Get project
- PUT /api/projects/{id}/ - Update project
- DELETE /api/projects/{id}/ - Delete project

### Tasks
- GET /api/tasks/ - List tasks (filtered by role)
- POST /api/tasks/ - Create task (Scrum Master only)
- GET /api/tasks/{id}/ - Get task
- PUT /api/tasks/{id}/ - Update task
- DELETE /api/tasks/{id}/ - Delete task (Scrum Master only)
- PATCH /api/tasks/{id}/status/ - Update task status

### Users (Scrum Master only)
- GET /api/auth/users/ - List users
- POST /api/auth/users/ - Create user
- GET /api/auth/users/{id}/ - Get user
- PUT /api/auth/users/{id}/ - Update user
- DELETE /api/auth/users/{id}/ - Delete user
- GET /api/auth/employees/ - List employees

## Troubleshooting

### Project Creation Fails
1. Ensure you're logged in as Scrum Master
2. Check browser console for errors
3. Verify backend is running on port 8000

### Task Assignment Fails
1. Create at least one project first
2. Ensure you have employees in the system
3. Check that project and assignee are selected

### Users Not Visible
1. Only Scrum Masters can see Users page
2. Check your user role in the database

### Database Issues
If migrations fail, reset the database:
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO taskflow_db_wqy2_user;
```
Then run: `python manage.py migrate`
