@echo off
chcp 65001 >nul
echo ========================================
echo LowSkyAI Tourism System Launcher
echo ========================================
echo.

echo [1/2] Starting Ollama service...
start "Ollama Service" cmd /k "ollama serve"
echo OK: Ollama service started in new window
timeout /t 3 /nobreak >nul

echo.
echo [2/2] Starting Django server...
start "Django Server" cmd /k "cd /d %~dp0 && python manage.py runserver"
echo OK: Django server started in new window

echo.
echo ========================================
echo All services started!
echo ========================================
echo.
echo Services:
echo - Ollama API: http://localhost:11434
echo - Django Web: http://127.0.0.1:8000
echo.
echo Please wait a few seconds for services to initialize...
echo Then open your browser and visit: http://127.0.0.1:8000
echo.
echo Click the LowSkyAI button in the top-right corner to chat!
echo.
pause
