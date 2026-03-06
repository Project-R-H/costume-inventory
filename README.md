# 衣装管理サイト（閲覧用）

このリポジトリは、衣装の在庫状況を閲覧するためのサイトです。

GitHub Pages を利用して公開しています。

サイトでは以下の情報を確認できます。

・衣装の画像  
・衣装ID  
・カテゴリ  
・状態（在庫 / 貸出中 / 洗濯中 / 廃棄 など）  
・セットID  
・セット一覧  

---

# システム構成

衣装管理.xlsx  
↓  
JSON生成（npm run gen）  
↓  
サイト生成（npm run build）  
↓  
GitHub Pages公開

---

# フォルダ構成

ProjectR-costume
├ public
│ ├ data.json
│ └ 衣装写真
│
├ docs（公開サイト）
│ ├ index.html
│ ├ data.json
│ ├ assets
│ └ 衣装写真
│
├ scripts
│ └ excel_to_json.ts
│
├ src
│ └ サイトソースコード
│
└ 衣装管理.xlsx

---

# サイトの機能

・衣装一覧表示  
・検索（ID / セットID / メモ など）  
・カテゴリ絞り込み  
・状態絞り込み  
・セットあり / なし  
・セットクリックで一覧表示  

---

# 更新方法（通常）

衣装を追加したり状態を変更した場合は、以下を行います。

1 Excelを更新  
2 JSONを生成  
3 サイトをビルド  
4 GitHubにアップロード  

---

# 更新手順

PowerShellで以下を実行します。

npm run gen
npm run build

git add -A
git commit -m "update"
git push origin main

これでサイトが更新されます。

GitHub Pagesは数秒〜1分ほどで反映されます。

---

# Excel更新時の注意

・衣装IDは重複させない  
・画像ファイル名は衣装IDと同じにする  

例  
ITM-0001.jpg  
ITM-0002.jpg  

---

# 画像フォルダ

衣装写真
├ メイド
├ アイドル

例  
衣装写真/メイド/ITM-0001.jpg

---

# セット衣装

セットIDがある衣装は  
クリックするとセット一覧が表示されます。

例  
SET-0001

ITM-0001  
ITM-0002  
ITM-0003  

---

# 開発環境

Node.js 必須

確認  
node -v  
npm -v  

---

# 初回セットアップ

npm install

---

# JSON生成

npm run gen

---

# サイトビルド

npm run build

---

# 公開URL

GitHub Pages  
https://project-r-h.github.io/costume-inventory/

---

# 管理方針

・Excelが正データ  
・サイトは閲覧専用  
・ExcelはGitHubに公開しない  

---

# 更新の最短コマンド

npm run gen
npm run build
git add -A
git commit -m "update"
git push origin main