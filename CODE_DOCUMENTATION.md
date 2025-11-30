# TaskFlow - Complete Code Documentation

## 📋 Table of Contents
1. [Backend Architecture](#backend-architecture)
2. [Frontend Architecture](#frontend-architecture)
3. [File-by-File Explanation](#file-by-file-explanation)
4. [How Everything Works Together](#how-everything-works-together)
5. [Data Flow](#data-flow)
6. [API Endpoints](#api-endpoints)

---

## 🏗️ Backend Architecture

### Django Project Structure
```
backend/
├── taskflow/           # Main Django project
├── accounts/           # User management app
├── projects/           # Project management app
├── tasks/              # Task management app
├── time_tracking/      # Time tracking app
├── tests/              # Test files
├── requirements.txt    # Dependencies
└── manage.py          # Django management script
```

---

## 🎨 Frontend Architecture

### React Application Structure
```
frontend/src/
├── components/         # Reusable UI components
├── contexts/          # React contexts for state management
├── pages/             # Page components
├── services/          # API service functions
├── App.js             # Main application component
└── index.js           # Application entry point
```

---

## 📁 File-by-File Explanation

### 🔧 Backend Files

#### **Core Django Files**

**`backend/manage.py`**
- **Purpose**: Django's command-line utility for administrative tasks
- **How it works**: Entry point for Django commands like `runserver`, `migrate`, `createsuperuser`
- **Usage**: `python manage.py runserver` starts the development server

**`backend/requirements.txt`**
- **Purpose**: Lists all Python dependencies for the project
- **Key Dependencies**:
  - `Django==4.2.7` - Web framework
  - `djangorestframework==3.14.0` - API framework
  - `djangorestframework-simplejwt==5.3.0` - JWT authentication
  - `psycopg[binary]==3.2.4` - PostgreSQL adapter
  - `django-cors-headers==4.3.1` - CORS handling

#### **Main Project Configuration**

**`backend/taskflow/settings.py`**
- **Purpose**: Main Django settings configuration
- **Key Configurations**:
  - Database settings (PostgreSQL)
  - JWT authentication settings
  - CORS configuration for frontend communication
  - REST Framework settings
  - Custom User model configuration
- **How it works**: Defines all application settings, middleware, installed apps, and security configurations

**`backend/taskflow/urls.py`**
- **Purpose**: Main URL routing configuration
- **How it works**: Routes all API endpoints to their respective apps
- **Endpoints**:
  - `/api/auth/` → accounts app
  - `/api/tasks/` → tasks app
  - `/api/projects/` → projects app
  - `/admin/` → Django admin

**`backend/taskflow/wsgi.py`**
- **Purpose**: WSGI configuration for production deployment
- **How it works**: Entry point for WSGI servers like Gunicorn

**`backend/taskflow/asgi.py`**
- **Purpose**: ASGI configuration for async features
- **How it works**: Entry point for ASGI servers for WebSocket support

#### **User Management (accounts app)**

**`backend/accounts/models.py`**
- **Purpose**: Custom User model with role-based authentication
- **Key Features**:
  - Extends Django's AbstractUser
  - Adds role field (scrum_master, employee)
  - Email as username field
  - Helper methods for role checking
- **How it works**: Defines user structure and authentication logic

**`backend/accounts/serializers.py`**
- **Purpose**: Converts User model instances to JSON and vice versa
- **Key Features**:
  - User registration serializer
  - Profile update serializer
  - Password change serializer
- **How it works**: Handles data serialization/deserialization for API responses

**`backend/accounts/views.py`**
- **Purpose**: Handles user authentication and management
- **Key Views**:
  - User registration
  - Login/logout
  - Profile management
  - User list (Scrum Master only)
- **How it works**: Processes authentication requests and returns JSON responses

**`backend/accounts/urls.py`**
- **Purpose**: URL routing for user-related endpoints
- **Endpoints**:
  - `POST /register/` - User registration
  - `POST /login/` - User login
  - `GET /profile/` - Get user profile
  - `PUT /profile/update/` - Update profile

#### **Project Management (projects app)**

**`backend/projects/models.py`**
- **Purpose**: Defines project-related database models
- **Key Models**:
  - `Project`: Main project model with progress calculation
  - `ProjectMember`: Many-to-many relationship between users and projects
  - `ProjectMessage`: Project-specific chat messages
- **How it works**: Defines database schema and business logic for projects

**`backend/projects/serializers.py`**
- **Purpose**: Converts project models to JSON format
- **Key Features**:
  - Project serialization with task counts
  - Member serialization
  - Message serialization
  - Progress calculation
- **How it works**: Handles data transformation for API responses

**`backend/projects/views.py`**
- **Purpose**: Handles project-related API requests
- **Key Views**:
  - Project CRUD operations
  - Member management
  - Project analytics
  - Message handling
- **How it works**: Processes project requests and returns appropriate responses

**`backend/projects/urls.py`**
- **Purpose**: URL routing for project endpoints
- **Endpoints**:
  - `GET /` - List projects
  - `POST /` - Create project
  - `GET /my/` - User's projects
  - `GET /{id}/analytics/` - Project analytics

#### **Task Management (tasks app)**

**`backend/tasks/models.py`**
- **Purpose**: Defines task-related database models
- **Key Models**:
  - `Task`: Main task model with status and priority
  - `TaskAssignment`: Many-to-many task assignments
  - `TaskComment`: Task comments
  - `TaskActivity`: Activity logging
  - `TimeSession`: Time tracking sessions
- **How it works**: Defines task structure and relationships

**`backend/tasks/serializers.py`**
- **Purpose**: Converts task models to JSON format
- **Key Features**:
  - Task serialization with assignments
  - Comment serialization
  - Activity serialization
- **How it works**: Handles task data transformation

**`backend/tasks/views.py`**
- **Purpose**: Handles task-related API requests
- **Key Views**:
  - Task CRUD operations
  - Kanban board data
  - Task analytics
  - Comment management
- **How it works**: Processes task requests and returns responses

**`backend/tasks/urls.py`**
- **Purpose**: URL routing for task endpoints
- **Endpoints**:
  - `GET /` - List tasks
  - `POST /` - Create task
  - `GET /kanban/` - Kanban board data
  - `GET /analytics/` - Task analytics

#### **Time Tracking (time_tracking app)**

**`backend/time_tracking/models.py`**
- **Purpose**: Defines time tracking models
- **Key Models**:
  - `TimeSession`: Time tracking sessions
- **How it works**: Tracks time spent on tasks

**`backend/time_tracking/views.py`**
- **Purpose**: Handles time tracking API requests
- **Key Features**:
  - Start/stop time tracking
  - Session management
  - Time analytics
- **How it works**: Manages time tracking functionality

---

### 🎨 Frontend Files

#### **Core Application Files**

**`frontend/src/index.js`**
- **Purpose**: Application entry point
- **Key Features**:
  - React Query client setup
  - Browser router configuration
  - Toast notification setup
  - Error suppression for ResizeObserver
- **How it works**: Initializes the React application with all providers

**`frontend/src/App.js`**
- **Purpose**: Main application component with routing
- **Key Features**:
  - Authentication-based routing
  - Protected routes
  - Role-based access control
- **How it works**: Determines which components to render based on authentication status

**`frontend/package.json`**
- **Purpose**: Node.js dependencies and scripts
- **Key Dependencies**:
  - React 18.2.0
  - React Router DOM 6.8.1
  - React Query 3.39.3
  - Chart.js 4.4.0
  - Tailwind CSS 3.4.13
- **How it works**: Defines project dependencies and build scripts

#### **Context Providers**

**`frontend/src/contexts/AuthContext.js`**
- **Purpose**: Manages authentication state
- **Key Features**:
  - User login/logout
  - Token management
  - Authentication status
- **How it works**: Provides authentication state to all components

**`frontend/src/contexts/ThemeContext.js`**
- **Purpose**: Manages theme state (dark/light mode)
- **How it works**: Provides theme switching functionality

**`frontend/src/contexts/TimeTrackingContext.js`**
- **Purpose**: Manages time tracking state
- **Key Features**:
  - Active session tracking
  - Timer management
- **How it works**: Provides time tracking functionality across components

#### **API Services**

**`frontend/src/services/api.js`**
- **Purpose**: Centralized API communication
- **Key Features**:
  - Axios configuration
  - JWT token handling
  - Request/response interceptors
  - API endpoint definitions
- **How it works**: Handles all HTTP requests to the backend

#### **Page Components**

**`frontend/src/pages/Auth/Login.js`**
- **Purpose**: User login page
- **Key Features**:
  - Email/password authentication
  - Form validation
  - Error handling
- **How it works**: Handles user authentication and redirects to dashboard

**`frontend/src/pages/Auth/Register.js`**
- **Purpose**: User registration page
- **Key Features**:
  - User registration form
  - Role selection
  - Form validation
- **How it works**: Creates new user accounts

**`frontend/src/pages/Dashboard/Dashboard.js`**
- **Purpose**: Main dashboard with analytics
- **Key Features**:
  - Task statistics
  - Project overview
  - Interactive charts
  - Time tracking widget
- **How it works**: Displays comprehensive project and task analytics

**`frontend/src/pages/Projects/Projects.js`**
- **Purpose**: Project management page
- **Key Features**:
  - Project creation/editing
  - Member management
  - Project chat
  - Analytics integration
- **How it works**: Manages all project-related operations

**`frontend/src/pages/Tasks/Tasks.js`**
- **Purpose**: Task management page
- **Key Features**:
  - Task creation/editing
  - Task filtering
  - Status updates
- **How it works**: Handles task management operations

**`frontend/src/pages/Tasks/TaskDetail.js`**
- **Purpose**: Individual task detail page
- **Key Features**:
  - Task information display
  - Comment system
  - Time tracking
- **How it works**: Shows detailed task information and interactions

**`frontend/src/pages/Kanban/Kanban.js`**
- **Purpose**: Kanban board for visual task management
- **Key Features**:
  - Drag-and-drop functionality
  - Column-based organization
  - Task status updates
- **How it works**: Provides visual task management interface

**`frontend/src/pages/Users/Users.js`**
- **Purpose**: User management page (Scrum Master only)
- **Key Features**:
  - User creation/editing
  - Role management
  - User list display
- **How it works**: Manages user accounts and permissions

#### **Reusable Components**

**`frontend/src/components/Layout/Layout.js`**
- **Purpose**: Main application layout
- **Key Features**:
  - Navigation sidebar
  - Header with user info
  - Mobile responsiveness
- **How it works**: Provides consistent layout structure

**`frontend/src/components/UI/Card.js`**
- **Purpose**: Reusable card component
- **How it works**: Provides consistent card styling

**`frontend/src/components/UI/Button.js`**
- **Purpose**: Reusable button component
- **Key Features**:
  - Multiple variants
  - Loading states
  - Icon support
- **How it works**: Provides consistent button styling and behavior

**`frontend/src/components/UI/Input.js`**
- **Purpose**: Reusable input component
- **Key Features**:
  - Form validation
  - Error states
  - Icon support
- **How it works**: Provides consistent input styling and validation

**`frontend/src/components/UI/Badge.js`**
- **Purpose**: Reusable badge component
- **Key Features**:
  - Multiple variants
  - Size options
- **How it works**: Provides consistent badge styling

**`frontend/src/components/UI/LoadingSpinner.js`**
- **Purpose**: Loading indicator component
- **How it works**: Shows loading states during API calls

**`frontend/src/components/Analytics/ProjectAnalytics.js`**
- **Purpose**: Project analytics component
- **Key Features**:
  - Chart.js integration
  - Data visualization
  - Interactive charts
- **How it works**: Displays project analytics with charts

**`frontend/src/components/TimeTracking/TimeTracker.js`**
- **Purpose**: Time tracking component
- **Key Features**:
  - Start/stop functionality
  - Session management
  - Timer display
- **How it works**: Manages time tracking sessions

**`frontend/src/components/TimeTracking/CompactTimeTracker.js`**
- **Purpose**: Compact time tracking widget
- **How it works**: Provides quick time tracking access

**`frontend/src/components/Tasks/KanbanBoard.js`**
- **Purpose**: Kanban board component
- **Key Features**:
  - Drag-and-drop
  - Column management
  - Task cards
- **How it works**: Provides visual task management interface

**`frontend/src/components/Tasks/TaskModal.js`**
- **Purpose**: Task creation/editing modal
- **Key Features**:
  - Form handling
  - Validation
  - File uploads
- **How it works**: Handles task creation and editing

**`frontend/src/components/Projects/ProjectMembersModal.js`**
- **Purpose**: Project member management modal
- **How it works**: Manages project member assignments

**`frontend/src/components/Projects/ProjectChat.js`**
- **Purpose**: Project chat component
- **Key Features**:
  - Real-time messaging
  - Message history
  - User context
- **How it works**: Provides project-specific communication

**`frontend/src/components/Search/GlobalSearch.js`**
- **Purpose**: Global search component
- **Key Features**:
  - Multi-source search
  - Real-time results
  - Categorized results
- **How it works**: Provides search functionality across the application

**`frontend/src/components/Navigation/MobileMenu.js`**
- **Purpose**: Mobile navigation menu
- **How it works**: Provides mobile-friendly navigation

---

## 🔄 How Everything Works Together

### 1. **Authentication Flow**
```
User Login → AuthContext → JWT Token → API Requests → Backend Validation
```

### 2. **Data Flow**
```
Frontend Component → API Service → Django View → Model → Database
Database → Model → Serializer → Django View → API Response → Frontend
```

### 3. **State Management**
```
React Query → API Caching → Component State → User Interface
Context Providers → Global State → Component Props → UI Updates
```

### 4. **Real-time Updates**
```
Backend Changes → API Endpoints → React Query Refetch → Component Updates
User Actions → API Calls → Database Updates → UI Refresh
```

---

## 📊 Data Flow

### **User Authentication**
1. User enters credentials in Login component
2. AuthContext makes API call to `/api/auth/login/`
3. Backend validates credentials and returns JWT tokens
4. Frontend stores tokens and updates authentication state
5. All subsequent API calls include JWT token in headers

### **Project Management**
1. User creates project in Projects component
2. API call to `/api/projects/` with project data
3. Backend creates Project model instance
4. Serializer converts model to JSON
5. Frontend receives response and updates UI
6. React Query caches the data for future use

### **Task Management**
1. User creates task in TaskModal component
2. API call to `/api/tasks/` with task data
3. Backend creates Task model with project relationship
4. Serializer includes task statistics
5. Frontend updates task list and Kanban board
6. Real-time updates via React Query refetch

### **Time Tracking**
1. User starts timer in TimeTracker component
2. TimeTrackingContext manages session state
3. API call to `/api/time-tracking/start/`
4. Backend creates TimeSession model
5. Frontend displays active timer
6. Session persists across page refreshes

---

## 🔌 API Endpoints

### **Authentication**
- `POST /api/auth/login/` - User login
- `POST /api/auth/register/` - User registration
- `POST /api/auth/token/refresh/` - Refresh JWT token
- `GET /api/auth/profile/` - Get user profile
- `PUT /api/auth/profile/update/` - Update profile

### **Projects**
- `GET /api/projects/` - List all projects (Scrum Master)
- `POST /api/projects/` - Create project
- `GET /api/projects/my/` - List user's projects
- `GET /api/projects/assigned/` - List assigned projects (Employee)
- `GET /api/projects/{id}/` - Get project details
- `PUT /api/projects/{id}/` - Update project
- `DELETE /api/projects/{id}/` - Delete project
- `GET /api/projects/{id}/analytics/` - Get project analytics
- `GET /api/projects/{id}/members/` - Get project members
- `POST /api/projects/{id}/members/` - Add project member
- `DELETE /api/projects/{id}/members/{id}/` - Remove project member
- `GET /api/projects/{id}/messages/` - Get project messages
- `POST /api/projects/{id}/messages/` - Send project message

### **Tasks**
- `GET /api/tasks/` - List tasks
- `POST /api/tasks/` - Create task
- `GET /api/tasks/{id}/` - Get task details
- `PUT /api/tasks/{id}/` - Update task
- `DELETE /api/tasks/{id}/` - Delete task
- `PATCH /api/tasks/{id}/status/` - Update task status
- `GET /api/tasks/analytics/` - Get task analytics
- `GET /api/tasks/notifications/` - Get task notifications
- `GET /api/tasks/kanban/` - Get tasks for Kanban board

### **Time Tracking**
- `GET /api/time-tracking/sessions/` - List time sessions
- `POST /api/time-tracking/sessions/` - Create time session
- `GET /api/time-tracking/active-session/` - Get active session
- `POST /api/time-tracking/start/` - Start time tracking
- `POST /api/time-tracking/stop/{id}/` - Stop time tracking
- `GET /api/time-tracking/analytics/` - Get time analytics

---

## 🚀 Key Features Implementation

### **1. Real-time Analytics**
- **Backend**: Calculates statistics in views and serializers
- **Frontend**: Chart.js integration for data visualization
- **Data Flow**: API → React Query → Chart Component → UI

### **2. Kanban Board**
- **Backend**: Provides task data organized by status
- **Frontend**: Drag-and-drop interface with status updates
- **Data Flow**: Task Status Change → API Call → Database Update → UI Refresh

### **3. Time Tracking**
- **Backend**: TimeSession model with start/stop functionality
- **Frontend**: Timer component with session management
- **Data Flow**: Timer Start → API Call → Session Creation → UI Update

### **4. Project Chat**
- **Backend**: ProjectMessage model with real-time updates
- **Frontend**: Chat component with message history
- **Data Flow**: Message Send → API Call → Database Store → UI Update

### **5. Role-based Access**
- **Backend**: Permission checks in views based on user role
- **Frontend**: Conditional rendering based on user role
- **Data Flow**: User Role → Permission Check → Feature Access

---

This documentation provides a complete overview of how TaskFlow works, from individual file purposes to the overall system architecture and data flow. Each component is designed to work together seamlessly to provide a comprehensive project management solution.
