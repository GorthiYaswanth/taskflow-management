<<<<<<< HEAD
# taskflow-management
=======
# TaskFlow - Advanced Project Management System

A comprehensive full-stack project management application built with **Django REST Framework** and **React**, featuring real-time collaboration, time tracking, analytics, and modern UI/UX.


## ✨ Key Features

### 🎯 Core Functionality
- **Project Management**: Create, manage, and track multiple projects with team collaboration
- **Task Management**: Comprehensive task creation, assignment, and tracking with priority levels
- **Kanban Board**: Visual task management with drag-and-drop functionality
- **Real-time Chat**: Project-specific team communication with message history
- **Analytics Dashboard**: Beautiful data visualization with Chart.js (Donut & Bar charts)
- **Global Search**: Search across tasks, projects, and team members
- **User Management**: Role-based access control (Scrum Master, Employee)

### 🎨 Modern UI/UX
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Theme Support**: Dark/Light theme switching capability
- **Beautiful Charts**: Interactive data visualization with Chart.js
- **Real-time Updates**: Live data synchronization with React Query
- **Intuitive Navigation**: Clean and modern interface with Lucide React icons

### 🔧 Technical Features
- **JWT Authentication**: Secure token-based authentication with refresh tokens
- **RESTful API**: Well-structured Django REST API with filtering and pagination
- **Real-time Communication**: WebSocket-based chat system
- **File Uploads**: Task and project file attachments
- **Email Notifications**: Automated notification system
- **Data Export**: Export capabilities for reports and analytics

## 🛠️ Tech Stack

### Frontend
- **React 18.2.0** - Modern React with hooks and functional components
- **React Router DOM 6.8.1** - Client-side routing
- **React Query 3.39.3** - Server state management and caching
- **React Hook Form 7.48.2** - Form handling and validation
- **React Hot Toast 2.4.1** - Beautiful toast notifications
- **React Chart.js 2 5.2.0** - Data visualization
- **Chart.js 4.4.0** - Chart library
- **Axios 1.6.2** - HTTP client
- **Date-fns 2.30.0** - Date manipulation
- **Lucide React 0.294.0** - Modern icon library
- **Tailwind CSS 3.4.13** - Utility-first CSS framework
- **PostCSS & Autoprefixer** - CSS processing

### Backend
- **Django 4.2.7** - Python web framework
- **Django REST Framework 3.14.0** - API development
- **Django CORS Headers 4.3.1** - Cross-origin resource sharing
- **Django REST Framework SimpleJWT 5.3.0** - JWT authentication
- **PostgreSQL** - Primary database
- **Psycopg 3.2.4** - PostgreSQL adapter
- **Pillow 11.3.0** - Image processing
- **Django Filter 23.5** - API filtering
- **Python Decouple 3.8** - Environment variable management

## 📁 Project Structure

```
TaskFlow/
├── backend/                    # Django REST API
│   ├── accounts/              # User management app
│   │   ├── models.py         # User and profile models
│   │   ├── serializers.py    # User serializers
│   │   ├── views.py          # User views and authentication
│   │   └── urls.py           # User URL patterns
│   ├── projects/             # Project management app
│   │   ├── models.py         # Project and member models
│   │   ├── serializers.py    # Project serializers
│   │   ├── views.py          # Project views and analytics
│   │   └── urls.py           # Project URL patterns
│   ├── tasks/                # Task management app
│   │   ├── models.py         # Task and assignment models
│   │   ├── serializers.py    # Task serializers
│   │   ├── views.py          # Task views and analytics
│   │   └── urls.py           # Task URL patterns
│   ├── time_tracking/        # Time tracking app
│   │   ├── models.py         # Time session models
│   │   ├── views.py          # Time tracking views
│   │   └── urls.py           # Time tracking URL patterns
│   ├── taskflow/             # Main Django project
│   │   ├── settings.py       # Django settings
│   │   ├── urls.py           # Main URL configuration
│   │   ├── wsgi.py           # WSGI configuration
│   │   └── asgi.py           # ASGI configuration
│   ├── requirements.txt      # Python dependencies
│   ├── manage.py             # Django management script
│   └── env.production        # Production environment variables
├── frontend/                 # React application
│   ├── public/               # Static files
│   ├── src/                  # Source code
│   │   ├── components/       # Reusable components
│   │   │   ├── Analytics/    # Analytics components
│   │   │   ├── Layout/       # Layout components
│   │   │   ├── Navigation/   # Navigation components
│   │   │   ├── Projects/     # Project-specific components
│   │   │   ├── Search/       # Search components
│   │   │   ├── Tasks/        # Task-specific components
│   │   │   ├── TimeTracking/ # Time tracking components
│   │   │   └── UI/           # UI components
│   │   ├── contexts/         # React contexts
│   │   ├── pages/            # Page components
│   │   │   ├── Auth/         # Authentication pages
│   │   │   ├── Dashboard/    # Dashboard page
│   │   │   ├── Kanban/       # Kanban board page
│   │   │   ├── Projects/     # Projects page
│   │   │   ├── Tasks/        # Tasks pages
│   │   │   └── Users/        # User management page
│   │   ├── services/         # API services
│   │   ├── App.js            # Main App component
│   │   └── index.js          # Entry point
│   ├── package.json          # Node.js dependencies
│   └── tailwind.config.js    # Tailwind configuration
├── deploy.sh                 # Deployment script
├── setup.sh                  # Setup script
├── setup.bat                 # Windows setup script
├── setup_local.bat           # Local setup script
├── start_backend.bat         # Backend start script
├── start_frontend.bat        # Frontend start script
└── README.md                 # This file
```

## 🚀 Quick Start

### Prerequisites
- **Node.js 16+** and npm
- **Python 3.9+**
- **PostgreSQL 12+**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/taskflow.git
   cd taskflow
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py createsuperuser
   python manage.py runserver
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm start
   ```

4. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000/api
   - Admin Panel: http://localhost:8000/admin

### Quick Setup (Windows)
```bash
# Use the provided batch files
setup.bat          # Full setup
start_backend.bat  # Start backend only
start_frontend.bat # Start frontend only
```

## 👥 User Roles & Permissions

### Scrum Master
- Create and manage projects
- Assign team members to projects
- Create and assign tasks
- View all projects and tasks
- Access user management
- View comprehensive analytics
- Manage project members

### Employee
- View assigned projects
- View assigned tasks
- Update task status
- Participate in project chat
- Track time on tasks
- View personal analytics

## 🔐 Authentication

The application uses JWT (JSON Web Token) authentication with refresh tokens for secure access.


## 📊 Features Overview

### 1. Dashboard
- **Analytics Overview**: Task completion rates, project progress, team performance
- **Interactive Charts**: Donut charts for task distribution, bar charts for trends
- **Project Cards**: Quick access to project details with progress indicators
- **Time Tracking**: Compact time tracker for active sessions
- **Real-time Updates**: Live data refresh every 30 seconds

### 2. Project Management
- **Project Creation**: Create projects with descriptions and member assignments
- **Member Management**: Add/remove team members with role-based permissions
- **Project Analytics**: Detailed insights including task distribution and completion rates
- **Project Chat**: Real-time messaging for team communication
- **Progress Tracking**: Visual progress bars and completion percentages

### 3. Task Management
- **Task Creation**: Create tasks with titles, descriptions, priorities, and due dates
- **Task Assignment**: Assign tasks to team members
- **Status Updates**: Track task progress (To Do, In Progress, Done)
- **Priority Levels**: Low, Medium, High, Critical priority system
- **Task Comments**: Collaborative discussion on tasks
- **Due Date Tracking**: Overdue task notifications

### 4. Kanban Board
- **Visual Management**: Drag-and-drop interface for task status updates
- **Column Organization**: To Do, In Progress, Done columns
- **Task Cards**: Detailed task information with assignee and priority
- **Project Filtering**: Filter tasks by specific projects
- **Real-time Updates**: Live status changes across the board

### 5. Time Tracking
- **Session Management**: Start, pause, and stop time tracking
- **Task Integration**: Link time sessions to specific tasks
- **Duration Tracking**: Accurate time measurement in milliseconds
- **Session History**: View past time tracking sessions
- **Analytics**: Time-based reporting and productivity metrics

### 6. User Management (Scrum Master Only)
- **User Creation**: Create new employee accounts
- **Role Assignment**: Assign roles (Scrum Master, Employee)
- **User Profiles**: Manage user information and permissions
- **Account Management**: Update user details and passwords

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login/` - User login
- `POST /api/auth/register/` - User registration
- `POST /api/auth/token/refresh/` - Refresh JWT token
- `GET /api/auth/profile/` - Get user profile
- `PUT /api/auth/profile/update/` - Update user profile
- `POST /api/auth/change-password/` - Change password

### Projects
- `GET /api/projects/` - List all projects (Scrum Master)
- `POST /api/projects/` - Create project (Scrum Master)
- `GET /api/projects/my/` - List user's projects
- `GET /api/projects/assigned/` - List assigned projects (Employee)
- `GET /api/projects/{id}/` - Get project details
- `PUT /api/projects/{id}/` - Update project (Scrum Master)
- `DELETE /api/projects/{id}/` - Delete project (Scrum Master)
- `GET /api/projects/{id}/analytics/` - Get project analytics
- `GET /api/projects/{id}/members/` - Get project members
- `POST /api/projects/{id}/members/` - Add project member
- `DELETE /api/projects/{id}/members/{id}/` - Remove project member
- `GET /api/projects/{id}/messages/` - Get project messages
- `POST /api/projects/{id}/messages/` - Send project message

### Tasks
- `GET /api/tasks/` - List tasks
- `POST /api/tasks/` - Create task
- `GET /api/tasks/{id}/` - Get task details
- `PUT /api/tasks/{id}/` - Update task
- `DELETE /api/tasks/{id}/` - Delete task
- `PATCH /api/tasks/{id}/status/` - Update task status
- `GET /api/tasks/analytics/` - Get task analytics
- `GET /api/tasks/notifications/` - Get task notifications
- `GET /api/tasks/kanban/` - Get tasks for Kanban board

### Time Tracking
- `GET /api/time-tracking/sessions/` - List time sessions
- `POST /api/time-tracking/sessions/` - Create time session
- `GET /api/time-tracking/active-session/` - Get active session
- `POST /api/time-tracking/start/` - Start time tracking
- `POST /api/time-tracking/stop/{id}/` - Stop time tracking
- `GET /api/time-tracking/analytics/` - Get time analytics

## 🎨 Key Features Implementation

### 1. Real-time Analytics Dashboard
- **Chart.js Integration**: Beautiful donut and bar charts for data visualization
- **Real-time Data**: Live updates from PostgreSQL database
- **Project-specific Analytics**: Detailed insights for individual projects
- **Task Statistics**: Comprehensive metrics including completion rates
- **Performance Metrics**: Team performance and productivity tracking

### 2. Kanban Board with Drag & Drop
- **Visual Task Management**: Intuitive drag-and-drop interface
- **Status Updates**: Real-time status changes with optimistic updates
- **Project Filtering**: Filter tasks by specific projects
- **Visual Indicators**: Color-coded priority and status badges
- **Time Tracking Integration**: Start/stop timers directly from Kanban

### 3. Advanced Time Tracking
- **Session Management**: Start, pause, and stop time tracking
- **Task Integration**: Link time sessions to specific tasks
- **Real-time Updates**: Live timer display with session persistence
- **Analytics**: Time-based reporting and productivity metrics
- **Context Integration**: Time tracking available across all task views

### 4. Global Search System
- **Multi-source Search**: Search across tasks, projects, and users
- **Real-time Results**: Instant search with debounced API calls
- **Visual Results**: Categorized search results with icons
- **Context-aware**: Search results show relevant context and actions

### 5. Real-time Chat System
- **Project-specific Rooms**: Separate chat rooms for each project
- **Role-based Access**: Only project members can access chat
- **Message History**: Persistent message storage and retrieval
- **Real-time Updates**: Live message updates with auto-refresh
- **User Context**: Display user roles and information in messages

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
SECRET_KEY=your-secret-key
DEBUG=True
DATABASE_URL=postgresql://user:password@localhost:5432/taskflow
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

#### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:8000/api
```

### Database Configuration
The application uses PostgreSQL as the primary database. Make sure to:
1. Install PostgreSQL
2. Create a database named `taskflow`
3. Update the `DATABASE_URL` in your environment variables

## 🚀 Deployment

### Backend Deployment (Render/Railway)
1. Connect your GitHub repository
2. Set environment variables
3. Configure build command: `pip install -r requirements.txt`
4. Configure start command: `python manage.py migrate && python manage.py runserver`

### Frontend Deployment (Vercel/Netlify)
1. Connect your GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `build`
4. Configure environment variables


## 📈 Performance Optimizations

- **React Query Caching**: Intelligent data caching and background updates
- **Lazy Loading**: Code splitting for better initial load times
- **Image Optimization**: Optimized image loading and processing
- **Database Indexing**: Proper database indexing for faster queries
- **API Pagination**: Efficient data loading with pagination
- **Real-time Updates**: Optimized refresh intervals for live data

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **CORS Configuration**: Proper cross-origin resource sharing
- **Input Validation**: Comprehensive input validation and sanitization
- **SQL Injection Protection**: Django ORM protection against SQL injection
- **XSS Protection**: Built-in XSS protection in Django and React
- **Role-based Access Control**: Granular permission system

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request



## 🙏 Acknowledgments

- **Django REST Framework** for the robust API framework
- **React** for the modern frontend framework
- **Tailwind CSS** for the utility-first CSS framework
- **Chart.js** for beautiful data visualization
- **Lucide React** for the modern icon library

## 📞 Support

For support, email support@taskflow.com or create an issue in the GitHub repository.

## 🔄 Recent Updates

### Version 1.2.0 (Latest)
- ✅ Fixed task count calculation in project cards
- ✅ Added automatic data refresh every 30 seconds
- ✅ Added manual refresh buttons
- ✅ Enhanced debugging and logging
- ✅ Improved error handling and user feedback
- ✅ Optimized database queries with proper annotations

### Version 1.1.0
- ✅ Added real-time chat system
- ✅ Implemented time tracking functionality
- ✅ Added comprehensive analytics dashboard
- ✅ Enhanced Kanban board with drag-and-drop
- ✅ Improved mobile responsiveness

### Version 1.0.0
- ✅ Initial release with core functionality
- ✅ User authentication and authorization
- ✅ Project and task management
- ✅ Basic dashboard and analytics

---

**TaskFlow** - Streamline your project management with modern tools and intuitive design. 🚀
>>>>>>> 10c849a (Initial import)
