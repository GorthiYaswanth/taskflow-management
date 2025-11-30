@echo off
echo Starting TaskFlow Backend Server...
echo.

cd backend

echo Creating test data...
python create_test_data.py

echo.
echo Starting Django development server...
python manage.py runserver

pause
