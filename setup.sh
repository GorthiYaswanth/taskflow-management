#!/bin/bash

# TaskFlow Setup Script
echo "🚀 Setting up TaskFlow - Modern Task Management System"
echo "=================================================="

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ and try again."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ and try again."
    exit 1
fi

echo "✅ Python and Node.js are installed"

# Backend Setup
echo "📦 Setting up backend..."
cd backend

# Create virtual environment
echo "Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp env.example .env
    echo "⚠️  Please edit backend/.env with your database credentials"
fi

# Run migrations
echo "Running database migrations..."
python manage.py makemigrations
python manage.py migrate

echo "✅ Backend setup complete!"

# Frontend Setup
echo "📦 Setting up frontend..."
cd ../frontend

# Install Node dependencies
echo "Installing Node.js dependencies..."
npm install

echo "✅ Frontend setup complete!"

echo ""
echo "🎉 Setup complete! Here's how to run the application:"
echo ""
echo "Backend:"
echo "  cd backend"
echo "  source venv/bin/activate  # On Windows: venv\\Scripts\\activate"
echo "  python manage.py runserver"
echo ""
echo "Frontend:"
echo "  cd frontend"
echo "  npm start"
echo ""
echo "The application will be available at:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8000"
echo ""
echo "Don't forget to:"
echo "  1. Edit backend/.env with your database credentials"
echo "  2. Create a superuser: python manage.py createsuperuser"
echo "  3. Register your first user account"
echo ""
echo "Happy coding! 🚀"
