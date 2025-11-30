@echo off
echo Starting TaskFlow Frontend...
echo.

cd frontend

echo Installing dependencies...
npm install

echo.
echo Starting React development server...
npm start

pause
