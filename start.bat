@echo off
echo ============================================
echo    HCL HR Management System Launcher
echo ============================================
echo.
echo Starting Backend Server (Port 5000)...
start "HCL-Backend" cmd /k "cd /d %~dp0backend && node server.js"

echo Waiting for backend to start...
timeout /t 3 /nobreak >nul

echo Starting Frontend Dev Server (Port 5173)...
start "HCL-Frontend" cmd /k "cd /d %~dp0frontend && npx vite"

echo.
echo ============================================
echo  Both servers starting...
echo  Frontend: http://localhost:5173
echo  Backend:  http://localhost:5000
echo.
echo  Admin:    admin@hcl.com / Admin@123
echo  Employee: rahul@hcl.com / Employee@123
echo ============================================
timeout /t 5 /nobreak >nul
start http://localhost:5173
