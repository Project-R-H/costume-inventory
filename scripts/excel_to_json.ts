import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";

type CostumeStatus = "在庫" | "貸出中" | "洗濯中" | "廃棄" | "不明";

type CostumeItem = {
  itemId: string;
  setId?: string;
  category?: string;
  name?: string;
  status: CostumeStatus;
  note?: string;
  image?: string;
  borrower?: string;
  approvedBy?: string;
  loanDate?: string;
};

type DataFile = {
  generatedAt: string;
  items: CostumeItem[];
};

const ROOT = process.cwd();

/**
 * 固定で読むExcel
 * GitHubに置かないローカル専用ファイル
 */
const INPUT_XLSX = "C:/Users/user/Desktop/data/衣装管理.xlsx";

const OUTPUT_PUBLIC = path.join(ROOT, "public", "data.json");
const OUTPUT_DOCS = path.join(ROOT, "docs", "data.json");

/**
 * 必要ならここで対象シート名を固定
 * 空なら先頭シートを使う
 */
const TARGET_SHEET_NAME = "";

/**
 * Excelの列見出し候補
 */
const HEADER_CANDIDATES = {
  itemId: ["個体ID", "衣装ID", "ID", "管理番号", "アイテムID"],
  setId: ["セットID", "セット", "セット番号"],
  category: ["カテゴリ", "種類", "区分"],
  name: ["名称", "名前", "衣装名", "品名"],
  status: ["状態", "在庫状態", "ステータス", "貸出状態"],
  note: ["メモ", "備考", "備考欄", "補足"],
  image: ["画像", "画像パス", "写真", "写真パス"],
  borrower: ["貸出先", "借用者", "使用者"],
  approvedBy: ["承認者", "承認", "確認者"],
  loanDate: ["貸出日", "貸出開始日", "使用日"],
};

function isBlank(v: unknown): boolean {
  return v === undefined || v === null || String(v).trim() === "";
}

function toStr(v: unknown): string {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function pick(row: Record<string, unknown>, candidates: string[]): string {
  for (const key of candidates) {
    if (key in row && !isBlank(row[key])) {
      return toStr(row[key]);
    }
  }
  return "";
}

function normalizeStatus(raw: string): CostumeStatus {
  const s = raw.replace(/\s+/g, "").trim().toLowerCase();

  if (!s) return "不明";

  if (
    s === "在庫" ||
    s === "あり" ||
    s === "有" ||
    s === "保管中" ||
    s === "在庫あり"
  ) {
    return "在庫";
  }

  if (
    s === "貸出中" ||
    s === "貸し出し中" ||
    s === "貸出" ||
    s === "貸出し中" ||
    s === "使用中" ||
    s === "レンタル中"
  ) {
    return "貸出中";
  }

  if (
    s === "洗濯中" ||
    s === "洗濯" ||
    s === "クリーニング中" ||
    s === "クリーニング" ||
    s === "洗い中"
  ) {
    return "洗濯中";
  }

  if (
    s === "廃棄" ||
    s === "廃棄済" ||
    s === "廃棄済み" ||
    s === "処分" ||
    s === "処分済" ||
    s === "破棄"
  ) {
    return "廃棄";
  }

  return "不明";
}

function normalizeDate(raw: unknown): string {
  if (raw === undefined || raw === null || raw === "") return "";

  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toISOString().slice(0, 10);
  }

  const s = String(raw).trim();
  if (!s) return "";

  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }

  return s;
}

function buildImagePath(itemId: string, excelValue: string): string {
  if (excelValue) return excelValue.replace(/\\/g, "/");
  if (!itemId) return "";

  if (/\.(jpg|jpeg|png|webp)$/i.test(itemId)) {
    return itemId.replace(/\\/g, "/");
  }

  return `衣装写真/メイド/${itemId}.jpg`;
}

function mapRowToItem(row: Record<string, unknown>): CostumeItem | null {
  const itemId = pick(row, HEADER_CANDIDATES.itemId);
  if (!itemId) return null;

  const setId = pick(row, HEADER_CANDIDATES.setId);
  const category = pick(row, HEADER_CANDIDATES.category);
  const name = pick(row, HEADER_CANDIDATES.name);
  const rawStatus = pick(row, HEADER_CANDIDATES.status);
  const note = pick(row, HEADER_CANDIDATES.note);
  const imageExcel = pick(row, HEADER_CANDIDATES.image);
  const borrower = pick(row, HEADER_CANDIDATES.borrower);
  const approvedBy = pick(row, HEADER_CANDIDATES.approvedBy);
  const loanDate = normalizeDate(pick(row, HEADER_CANDIDATES.loanDate));

  const item: CostumeItem = {
    itemId,
    status: normalizeStatus(rawStatus),
  };

  if (setId) item.setId = setId;
  if (category) item.category = category;
  if (name) item.name = name;
  if (note) item.note = note;

  const image = buildImagePath(itemId, imageExcel);
  if (image) item.image = image;

  if (borrower) item.borrower = borrower;
  if (approvedBy) item.approvedBy = approvedBy;
  if (loanDate) item.loanDate = loanDate;

  return item;
}

function ensureDir(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function main() {
  if (!fs.existsSync(INPUT_XLSX)) {
    throw new Error(`Excelファイルが見つかりません: ${INPUT_XLSX}`);
  }

  const wb = XLSX.readFile(INPUT_XLSX, { cellDates: true });

  const sheetName =
    TARGET_SHEET_NAME && wb.SheetNames.includes(TARGET_SHEET_NAME)
      ? TARGET_SHEET_NAME
      : wb.SheetNames[0];

  if (!sheetName) {
    throw new Error("シートが見つかりません。");
  }

  const ws = wb.Sheets[sheetName];
  if (!ws) {
    throw new Error(`シートが開けません: ${sheetName}`);
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: "",
  });

  const items = rows
    .map(mapRowToItem)
    .filter((x): x is CostumeItem => x !== null);

  const data: DataFile = {
    generatedAt: new Date().toISOString(),
    items,
  };

  ensureDir(OUTPUT_PUBLIC);
  ensureDir(OUTPUT_DOCS);

  fs.writeFileSync(OUTPUT_PUBLIC, JSON.stringify(data, null, 2), "utf-8");
  fs.writeFileSync(OUTPUT_DOCS, JSON.stringify(data, null, 2), "utf-8");

  const counts = {
    在庫: items.filter((x) => x.status === "在庫").length,
    貸出中: items.filter((x) => x.status === "貸出中").length,
    洗濯中: items.filter((x) => x.status === "洗濯中").length,
    廃棄: items.filter((x) => x.status === "廃棄").length,
    不明: items.filter((x) => x.status === "不明").length,
  };

  console.log(`読込Excel: ${INPUT_XLSX}`);
  console.log(`シート: ${sheetName}`);
  console.log(`件数: ${items.length}`);
  console.log("状態内訳:", counts);
  console.log(`出力: ${OUTPUT_PUBLIC}`);
  console.log(`出力: ${OUTPUT_DOCS}`);
}

main();