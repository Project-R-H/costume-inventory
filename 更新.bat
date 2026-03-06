@echo off
chcp 65001 > nul
title Project-R 衣装管理 更新

cd /d C:\Users\user\Desktop\ProjectR-costume

echo =====================================
echo Project-R 衣装管理サイト 更新開始
echo =====================================
echo.

echo [1/5] ExcelからJSON生成
call npm run gen
if errorlevel 1 (
    echo.
    echo エラー: JSON生成に失敗しました
    pause
    exit /b 1
)

echo.
echo [2/5] サイトをビルド
call npm run build
if errorlevel 1 (
    echo.
    echo エラー: buildに失敗しました
    pause
    exit /b 1
)

echo.
echo [3/5] Gitに追加
git add -A
if errorlevel 1 (
    echo.
    echo エラー: git add に失敗しました
    pause
    exit /b 1
)

echo.
echo [4/5] 変更確認
git diff --cached --quiet
if %errorlevel%==0 (
    echo 変更がないため commit / push をスキップします
    echo.
    echo 完了しました
    pause
    exit /b 0
)

echo.
echo [5/5] commitしてpush
git commit -m "update"
if errorlevel 1 (
    echo.
    echo エラー: git commit に失敗しました
    pause
    exit /b 1
)

git push
if errorlevel 1 (
    echo.
    echo エラー: git push に失敗しました
    pause
    exit /b 1
)

echo.
echo =====================================
echo 更新完了
echo GitHub Pages 反映まで少し待ってください
echo =====================================
pause