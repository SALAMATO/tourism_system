@echo off
cd /d %~dp0

call .venv\Scripts\activate

start http://0.0.0.0:9000

python manage.py runserver

pause