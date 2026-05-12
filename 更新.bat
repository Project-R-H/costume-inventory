@echo off
chcp 65001 > nul
title Project-R costume update

cd /d C:\Users\user\Desktop\ProjectR-costume

echo =====================================
echo Project-R costume site update start
echo =====================================
echo.

echo [CHECK] current folder
echo %cd%
echo.

echo [CHECK] block dangerous zip files
dir /b *.zip >nul 2>nul
if %errorlevel%==0 (
    echo.
    echo ERROR: zip file exists in this project folder.
    echo Delete zip files before updating.
    echo.
    dir /b *.zip
    echo.
    pause
    exit /b 1
)

echo OK: no zip file
echo.

echo [CHECK] remove old public original image folders if exist
if exist "docs\衣装写真" (
    echo delete docs old image folder
    rmdir /s /q "docs\衣装写真"
)

if exist "public\衣装写真" (
    echo.
    echo ERROR: public old original image folder exists.
    echo Move or delete public\衣装写真 first.
    echo.
    pause
    exit /b 1
)

echo OK: old original image folders checked
echo.

echo =====================================
echo [1/5] Generate public data and public images
echo =====================================
echo.

call npm run gen
if errorlevel 1 (
    echo.
    echo ERROR: npm run gen failed.
    echo.
    echo Check:
    echo - Close Excel file
    echo - C:\Users\user\Desktop\data has costume Excel
    echo - C:\Users\user\Desktop\data has costume photo folder
    echo - public original image folder is not inside this project
    echo.
    pause
    exit /b 1
)

echo.
echo =====================================
echo [2/5] Build site
echo =====================================
echo.

call npm run build
if errorlevel 1 (
    echo.
    echo ERROR: npm run build failed.
    echo.
    pause
    exit /b 1
)

echo.
echo [CHECK] delete old docs original image folder after build if exists
if exist "docs\衣装写真" (
    rmdir /s /q "docs\衣装写真"
)

echo.
echo =====================================
echo [3/5] Git add
echo =====================================
echo.

git add -A
if errorlevel 1 (
    echo.
    echo ERROR: git add failed.
    echo.
    pause
    exit /b 1
)

echo.
echo =====================================
echo [4/5] Check changes
echo =====================================
echo.

git diff --cached --quiet
if %errorlevel%==0 (
    echo No changes.
    echo Nothing to push.
    echo.
    git status
    echo.
    pause
    exit /b 0
)

echo Changes found.
echo.

echo =====================================
echo [5/5] Commit and push
echo =====================================
echo.

git commit -m "update costume public site"
if errorlevel 1 (
    echo.
    echo ERROR: git commit failed.
    echo.
    pause
    exit /b 1
)

git push
if errorlevel 1 (
    echo.
    echo ERROR: git push failed.
    echo.
    pause
    exit /b 1
)

echo.
echo =====================================
echo Update complete
echo =====================================
echo.
echo GitHub Pages may take a few minutes.
echo Check the public site with Ctrl + F5.
echo.
git status
echo.
pause