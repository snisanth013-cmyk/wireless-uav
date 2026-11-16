@echo off
echo =========================================================================
echo  UAV-DRN - Push Project to GitHub
echo =========================================================================
echo.
echo Your Git user is configured as: nisanth1707 (nisanth1707@github.com)
echo.
set /p REPO_URL="Enter your GitHub repository URL (e.g. https://github.com/nisanth1707/uav-drn.git): "

if "%REPO_URL%"=="" (
    echo.
    echo Error: No repository URL provided.
    pause
    exit /b
)

echo.
echo Setting remote origin to %REPO_URL%...
git remote remove origin 2>nul
git remote add origin %REPO_URL%
git branch -M main

echo.
echo Pushing to GitHub...
git push -u origin main

echo.
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Project successfully pushed to GitHub!
) else (
    echo [NOTE] If prompted for authentication, log in using your GitHub credentials or Personal Access Token (PAT).
)
echo.
pause
