@echo off
title Video Analyser Launcher
echo ========================================================
echo        Starting Video Analyser (Backend + Frontend)
echo ========================================================

set PATH=C:\Users\Krish Patel\AppData\Local\Programs\node;C:\Users\Krish Patel\AppData\Local\Programs\ffmpeg\bin;%PATH%

echo [1/2] Starting FastAPI Backend on port 8000...
start "Video Analyser Backend" cmd /k "cd /d C:\Users\Krish Patel\Desktop\video-analyser\backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Starting Vite Frontend on port 5173...
start "Video Analyser Frontend" cmd /k "cd /d C:\Users\Krish Patel\Desktop\video-analyser\frontend && npm run dev -- --host 127.0.0.1 --port 5173"

timeout /t 3 /nobreak >nul
echo Opening application in browser...
start http://localhost:5173

echo Done! Both servers are running.
