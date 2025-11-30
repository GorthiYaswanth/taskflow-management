@echo off
echo 🚀 Setting up TaskFlow - Modern Task Management System
echo ==================================================

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed. Please install Python 3.8+ and try again.
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 16+ and try again.
    pause
    exit /b 1
)

echo ✅ Python and Node.js are installed

REM Backend Setup
echo 📦 Setting up backend...
cd backend

REM Create virtual environment
echo Creating virtual environment...
python -m venv venv

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install Python dependencies
echo Installing Python dependencies...
pip install -r requirements.txt

REM Create .env file if it doesn't exist
if not exist .env (
    echo Creating .env file...
    copy env.example .env
    echo ⚠️  Please edit backend\.env with your database credentials
)

REM Run migrations
echo Running database migrations...
python manage.py makemigrations
python manage.py migrate

echo ✅ Backend setup complete!

REM Frontend Setup
echo 📦 Setting up frontend...
cd ..\frontend

REM Install Node dependencies
echo Installing Node.js dependencies...
npm install

echo ✅ Frontend setup complete!

echo.
echo 🎉 Setup complete! Here's how to run the application:
echo.
echo Backend:
echo   cd backend
echo   venv\Scripts\activate.bat
echo   python manage.py runserver
echo.
echo Frontend:
echo   cd frontend
echo   npm start
echo.
echo The application will be available at:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8000
echo.
echo Don't forget to:
echo   1. Edit backend\.env with your database credentials
echo   2. Create a superuser: python manage.py createsuperuser
echo   3. Register your first user account
echo.
echo Happy coding! 🚀
pause
