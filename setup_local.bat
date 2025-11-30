@echo off
echo Setting up TaskFlow for local development...
echo.

cd backend

echo 1. Running database migrations...
python manage.py migrate

echo.
echo 2. Creating test data...
python create_test_data.py

echo.
echo 3. Starting development server...
python manage.py runserver

pause
