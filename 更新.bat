@echo off
chcp 65001 > nul
title Project-R 衣装管理 更新

cd /d C:\Users\user\Desktop\ProjectR-costume

echo =====================================
echo Project-R 衣装管理サイト 更新開始
echo =====================================
echo.

echo [事前確認] public\衣装写真 が残っていないか確認
if exist "public\衣装写真" (
    echo.
    echo エラー: public\衣装写真 が残っています。
    echo このフォルダがあると、元画像がそのまま公開されます。
    echo.
    echo 対応:
    echo 1. public\衣装写真 を C:\Users\user\Desktop\data\衣装写真 へ移動
    echo 2. public\衣装写真 を削除
    echo 3. 再度このbatを実行
    echo.
    pause
    exit /b 1
)

echo.
echo [1/5] Excelから公開JSON・公開用画像を生成
call npm run gen
if errorlevel 1 (
    echo.
    echo エラー: JSON生成または画像生成に失敗しました
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
echo [安全確認] docs\衣装写真 があれば削除
if exist "docs\衣装写真" (
    rmdir /s /q "docs\衣装写真"
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
git commit -m "update public costume data"
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