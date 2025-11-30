#!/bin/bash

# TaskFlow Deployment Script
echo "🚀 Deploying TaskFlow - Modern Task Management System"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "README.md" ]; then
    echo "❌ Please run this script from the TaskFlow root directory"
    exit 1
fi

# Build Frontend
echo "📦 Building frontend..."
cd frontend

# Install dependencies
echo "Installing frontend dependencies..."
npm install

# Build for production
echo "Building for production..."
npm run build

echo "✅ Frontend build complete!"

# Backend Setup for Production
echo "📦 Preparing backend for production..."
cd ../backend

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install production dependencies
echo "Installing production dependencies..."
pip install -r requirements.txt

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Run migrations
echo "Running database migrations..."
python manage.py makemigrations
python manage.py migrate

echo "✅ Backend preparation complete!"

echo ""
echo "🎉 Deployment preparation complete!"
echo ""
echo "For production deployment:"
echo ""
echo "1. Backend (Render/Heroku):"
echo "   - Connect your repository"
echo "   - Set environment variables:"
echo "     SECRET_KEY=your-secret-key"
echo "     DEBUG=False"
echo "     ALLOWED_HOSTS=your-domain.com"
echo "     DATABASE_URL=your-database-url"
echo ""
echo "2. Frontend (Netlify/Vercel):"
echo "   - Deploy the frontend/build folder"
echo "   - Set environment variable:"
echo "     REACT_APP_API_URL=https://your-backend-url.com/api"
echo ""
echo "3. Database:"
echo "   - The project is configured to use the provided Render PostgreSQL database"
echo "   - Or update the database settings in backend/taskflow/settings.py"
echo ""
echo "Happy deploying! 🚀"
