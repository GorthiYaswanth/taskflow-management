# TaskFlow Setup Instructions

## Quick Start

### 1. Start Backend Server
```bash
# Option 1: Use the batch file (Windows)
start_backend.bat

# Option 2: Manual commands
cd backend
python create_test_data.py
python manage.py runserver
```

### 2. Start Frontend Server
```bash
# Option 1: Use the batch file (Windows)
start_frontend.bat

# Option 2: Manual commands
cd frontend
npm install
npm start
```

### 3. Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api
- Admin Panel: http://localhost:8000/admin

## Test Credentials

### Scrum Master
- Email: `scrum@example.com`
- Password: `password123`
- Can: Create projects, assign members, view all projects

### Employee 1
- Email: `emp@example.com`
- Password: `password123`
- Can: View assigned projects, chat with team members

### Employee 2
- Email: `emp2@example.com`
- Password: `password123`
- Can: View assigned projects, chat with team members

## Features Implemented

### ✅ Employee Dashboard
- Shows assigned projects with progress and member count
- Quick access to project details and chat
- Visual progress indicators

### ✅ Projects Management
- **Scrum Masters**: Can create projects, assign members, view all projects
- **Employees**: Can view only their assigned projects
- Project cards show member count, progress, and task statistics

### ✅ Real-time Messaging
- Project-specific chat rooms
- Only project members can access chat
- Real-time message updates (refreshes every 5 seconds)
- User role display in messages

### ✅ Member Management
- Scrum Masters can add/remove employees from projects
- Role-based access control
- Visual member management interface

## Troubleshooting

### If employees can't see projects:
1. Make sure the backend server is running
2. Check browser console for API errors
3. Verify the user is logged in as an employee
4. Ensure the user is assigned to projects (check admin panel)

### If chat doesn't work:
1. Make sure you're a member of the project
2. Check browser console for errors
3. Verify the backend server is running
4. Try refreshing the page

### If you get CORS errors:
1. Make sure the backend server is running on port 8000
2. Check that the frontend is running on port 3000
3. Verify CORS settings in Django settings

## API Endpoints

### Projects
- `GET /api/projects/` - Get all projects (Scrum Master only)
- `GET /api/projects/my/` - Get assigned projects (Employee only)
- `POST /api/projects/` - Create project (Scrum Master only)
- `GET /api/projects/{id}/members/` - Get project members
- `POST /api/projects/{id}/members/` - Add project member
- `DELETE /api/projects/{id}/members/{member_id}/` - Remove project member

### Messages
- `GET /api/projects/{id}/messages/` - Get project messages
- `POST /api/projects/{id}/messages/` - Send project message

## Database Schema

### Projects
- `Project`: Main project entity
- `ProjectMember`: Links users to projects with roles
- `ProjectMessage`: Project-specific chat messages

### Users
- `User`: Custom user model with role-based authentication
- Roles: `scrum_master`, `employee`

## Development Notes

- The application uses React Query for data fetching
- Real-time updates are implemented with polling (5-second intervals)
- All API calls include proper error handling
- Role-based access control is enforced on both frontend and backend
