@echo off
setlocal enabledelayedexpansion
title GymBuddy Fitness Tracker

:MENU
cls
echo.
echo  ==========================================
echo       GymBuddy - Fitness Tracker
echo  ==========================================
echo.
echo   [1] Start All (DB + App + Tunnel)
echo   [2] Stop All Services
echo   [3] Backup Database
echo   [4] Restore from Backup
echo   [5] Service Status
echo   [6] View Logs
echo   [7] Rebuild and Start
echo   [8] Run DB Migrations
echo   [0] Exit
echo.
echo  ==========================================
echo.
set /p CHOICE=  Select [0-8]:

if "%CHOICE%"=="1" goto START
if "%CHOICE%"=="2" goto STOP
if "%CHOICE%"=="3" goto BACKUP
if "%CHOICE%"=="4" goto RESTORE
if "%CHOICE%"=="5" goto STATUS
if "%CHOICE%"=="6" goto LOGS
if "%CHOICE%"=="7" goto REBUILD
if "%CHOICE%"=="8" goto MIGRATE
if "%CHOICE%"=="0" goto EXIT
echo.
echo  Invalid option. Try again.
timeout /t 2 /nobreak >nul
goto MENU

:START
cls
echo.
echo  === Start All Services ===
echo.

docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Docker Desktop is not running!
    echo  Please start Docker Desktop first.
    echo.
    pause
    goto MENU
)

echo  Starting all services (DB + App + Tunnel)...
echo.
docker compose -f docker-compose.yml -f docker-compose.tunnel.yml up -d --build
if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Failed to start. Check Docker Desktop.
    pause
    goto MENU
)

echo.
echo  ------------------------------------------
echo   All services started!
echo.
echo   Local:    http://localhost:3005
echo   Web:      https://gym.hongjixuan-market-ledger.com
echo  ------------------------------------------
echo.
pause
goto MENU

:STOP
cls
echo.
echo  === Stop All Services ===
echo.

docker compose -f docker-compose.yml -f docker-compose.tunnel.yml down 2>nul
docker compose down 2>nul

echo.
echo  All services stopped.
echo.
pause
goto MENU

:BACKUP
cls
echo.
echo  === Backup Database ===
echo.

docker ps --filter "name=workout-db" --filter "status=running" | findstr "workout-db" >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Database is not running! Start services first.
    echo.
    pause
    goto MENU
)

set BACKUP_DIR=%~dp0backups
set TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_PATH=%BACKUP_DIR%\%TIMESTAMP%

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
mkdir "%BACKUP_PATH%" 2>nul

echo  Backup path: %BACKUP_PATH%
echo.

echo  Backing up database...
docker exec workout-db pg_dump -U workout -d workout -F c -f /tmp/workout_backup.dump
if %errorlevel% neq 0 (
    echo  [ERROR] Database backup failed!
    pause
    goto MENU
)
docker cp workout-db:/tmp/workout_backup.dump "%BACKUP_PATH%\database.dump"
docker exec workout-db rm /tmp/workout_backup.dump
echo  Database backup done.
echo.

echo  ------------------------------------------
echo  Backup complete!
dir /b "%BACKUP_PATH%"
echo  ------------------------------------------
echo.
pause
goto MENU

:RESTORE
cls
echo.
echo  === Restore from Backup ===
echo.

set BACKUP_DIR=%~dp0backups

if not exist "%BACKUP_DIR%" (
    echo  [ERROR] No backups folder found.
    pause
    goto MENU
)

echo  Available backups:
echo  ------------------------------------------
set idx=0
for /d %%D in ("%BACKUP_DIR%\*") do (
    set /a idx+=1
    set "BACKUP_!idx!=%%~nxD"
    echo   [!idx!] %%~nxD
)

if !idx!==0 (
    echo  No backups found.
    pause
    goto MENU
)

echo  ------------------------------------------
echo.
set /p BSEL=  Select backup number (0 to go back):
if "%BSEL%"=="0" goto MENU

set "SELECTED_BACKUP=!BACKUP_%BSEL%!"
if "!SELECTED_BACKUP!"=="" (
    echo  Invalid selection.
    pause
    goto MENU
)

set BACKUP_PATH=%BACKUP_DIR%\!SELECTED_BACKUP!

if not exist "%BACKUP_PATH%\database.dump" (
    echo  [ERROR] database.dump not found in backup.
    pause
    goto MENU
)

echo.
echo  [WARNING] This will overwrite current data!
set /p CONFIRM=  Continue? (y/N):
if /i not "%CONFIRM%"=="y" (
    echo  Cancelled.
    pause
    goto MENU
)

echo.
echo  Restoring database...
docker cp "%BACKUP_PATH%\database.dump" workout-db:/tmp/workout_backup.dump
docker exec workout-db pg_restore -U workout -d workout --clean --if-exists /tmp/workout_backup.dump
docker exec workout-db rm /tmp/workout_backup.dump
echo  Database restored.
echo.
echo  Restore complete! Recommend restarting app service.
echo.
pause
goto MENU

:STATUS
cls
echo.
echo  === Service Status ===
echo.
docker compose -f docker-compose.yml -f docker-compose.tunnel.yml ps 2>nul
if %errorlevel% neq 0 (
    echo  Docker is not running or no services found.
)
echo.
pause
goto MENU

:LOGS
cls
echo.
echo  === View Logs ===
echo.
echo   [1] All services
echo   [2] App
echo   [3] Database
echo   [4] Tunnel
echo   [0] Back
echo.
set /p LSEL=  Select [0-4]:

if "%LSEL%"=="0" goto MENU
if "%LSEL%"=="1" (
    echo.
    echo  Press Ctrl+C to stop...
    echo.
    docker compose -f docker-compose.yml -f docker-compose.tunnel.yml logs -f --tail 50
)
if "%LSEL%"=="2" (
    echo.
    echo  Press Ctrl+C to stop...
    echo.
    docker compose -f docker-compose.yml -f docker-compose.tunnel.yml logs -f --tail 50 workout-app
)
if "%LSEL%"=="3" (
    echo.
    echo  Press Ctrl+C to stop...
    echo.
    docker compose -f docker-compose.yml -f docker-compose.tunnel.yml logs -f --tail 50 workout-db
)
if "%LSEL%"=="4" (
    echo.
    echo  Press Ctrl+C to stop...
    echo.
    docker compose -f docker-compose.yml -f docker-compose.tunnel.yml logs -f --tail 50 workout-tunnel
)
goto MENU

:REBUILD
cls
echo.
echo  === Rebuild and Start ===
echo.

docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Docker Desktop is not running!
    pause
    goto MENU
)

echo  Rebuilding all services (may take a few minutes)...
echo.
docker compose -f docker-compose.yml -f docker-compose.tunnel.yml up -d --build
if %errorlevel% neq 0 (
    echo  [ERROR] Build failed!
    pause
    goto MENU
)

echo.
echo  ------------------------------------------
echo   Rebuild complete!
echo.
echo   Local:    http://localhost:3005
echo   Web:      https://gym.hongjixuan-market-ledger.com
echo  ------------------------------------------
echo.
pause
goto MENU

:MIGRATE
cls
echo.
echo  === Run DB Migrations ===
echo.

docker ps --filter "name=workout-app" --filter "status=running" | findstr "workout-app" >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] App container is not running! Start services first.
    echo.
    pause
    goto MENU
)

echo  Running Prisma migrations...
docker exec workout-app npx prisma migrate deploy
echo.
echo  Migrations complete!
echo.
pause
goto MENU

:EXIT
exit /b 0
