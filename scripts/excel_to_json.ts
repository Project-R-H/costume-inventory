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
const INPUT_XLSX = "C:/Users/user/Desktop/data/衣装管理.xlsx";
const OUTPUT_PUBLIC = path.join(ROOT, "public", "data.json");
const OUTPUT_DOCS = path.join(ROOT, "docs", "data.json");

const SHEET_ITEMS = "個体台帳";
const SHEET_LOANS = "貸出記録";

function ensureDir(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function toText(v: unknown): string {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function toDateText(v: unknown): string {
  if (!v) return "";

  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }

  const s = String(v).trim();
  if (!s) return "";

  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }

  return s;
}

function normalizeStatus(raw: unknown): CostumeStatus {
  const s = String(raw ?? "").replace(/\s+/g, "").trim();

  if (!s) return "不明";

  if (s === "在庫" || s === "在庫あり" || s === "保管中") return "在庫";

  if (
    s === "貸出中" ||
    s === "貸出" ||
    s === "貸し出し中" ||
    s === "使用中" ||
    s === "レンタル中"
  ) {
    return "貸出中";
  }

  if (
    s === "洗濯中" ||
    s === "洗濯" ||
    s === "クリーニング中" ||
    s === "クリーニング"
  ) {
    return "洗濯中";
  }

  if (
    s === "廃棄" ||
    s === "廃棄済" ||
    s === "廃棄済み" ||
    s === "処分" ||
    s === "処分済"
  ) {
    return "廃棄";
  }

  return "不明";
}

function buildImagePath(category: string, photoFileName: string): string {
  if (!photoFileName) return "";
  if (!category) return `衣装写真/${photoFileName}`;
  return `衣装写真/${category}/${photoFileName}`;
}

function main() {
  if (!fs.existsSync(INPUT_XLSX)) {
    throw new Error(`Excelファイルが見つかりません: ${INPUT_XLSX}`);
  }

  const wb = XLSX.readFile(INPUT_XLSX, { cellDates: true });

  const wsItems = wb.Sheets[SHEET_ITEMS];
  const wsLoans = wb.Sheets[SHEET_LOANS];

  if (!wsItems) {
    throw new Error(`シート「${SHEET_ITEMS}」が見つかりません`);
  }
  if (!wsLoans) {
    throw new Error(`シート「${SHEET_LOANS}」が見つかりません`);
  }

  /**
   * 個体台帳
   * A: セットID
   * B: 個体ID
   * C: 種類
   * D: カテゴリ
   * E: 状態
   * F: 保管場所
   * G: 写真（ファイル名/パス）
   * H: 備考
   * I: 写真ファイル名
   * J: 公開名
   * K: 公開/非公開
   */
  const itemRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wsItems, {
    defval: "",
  });

  /**
   * 貸出記録
   * A: 貸出ID
   * B: セットID
   * C: 貸出先
   * D: 貸出日
   * E: 返却日
   * F: 承認者
   */
  const loanRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wsLoans, {
    defval: "",
  });

  const activeLoanMap = new Map<
    string,
    {
      borrower: string;
      approvedBy: string;
      loanDate: string;
    }
  >();

  for (const row of loanRows) {
    const setId = toText(row["セットID"]);
    const borrower = toText(row["貸出先"]);
    const approvedBy = toText(row["承認者"]);
    const loanDate = toDateText(row["貸出日"]);
    const returnDate = toText(row["返却日"]);

    if (!setId) continue;
    if (returnDate) continue;

    activeLoanMap.set(setId, {
      borrower,
      approvedBy,
      loanDate,
    });
  }

  const items: CostumeItem[] = [];

  for (const row of itemRows) {
    const setId = toText(row["セットID"]);
    const itemId = toText(row["個体ID"]);
    const type = toText(row["種類"]);
    const category = toText(row["カテゴリ"]);
    const rawStatus = row["状態"];
    const note = toText(row["備考"]);
    const photoFileName = toText(row["写真ファイル名"]);
    const publicName = toText(row["公開名"]);
    const publicFlag = toText(row["公開/非公開"]);

    if (!itemId) continue;

    // 非公開は出さない
    if (publicFlag && publicFlag !== "公開") {
      continue;
    }

    let status = normalizeStatus(rawStatus);

    // 貸出記録に未返却があれば強制で貸出中
    const activeLoan = setId ? activeLoanMap.get(setId) : undefined;
    if (activeLoan) {
      status = "貸出中";
    }

    const image = buildImagePath(category, photoFileName);

    const item: CostumeItem = {
      itemId,
      status,
    };

    if (setId) item.setId = setId;
    if (category) item.category = category;
    if (note) item.note = note;
    if (image) item.image = image;

    // 表示名優先、なければカテゴリ+種類
    if (publicName) {
      item.name = publicName;
    } else {
      const fallbackName = [category, type].filter(Boolean).join(" ");
      if (fallbackName) item.name = fallbackName;
    }

    if (activeLoan) {
      if (activeLoan.borrower) item.borrower = activeLoan.borrower;
      if (activeLoan.approvedBy) item.approvedBy = activeLoan.approvedBy;
      if (activeLoan.loanDate) item.loanDate = activeLoan.loanDate;
    }

    items.push(item);
  }

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
  console.log(`読込シート: ${SHEET_ITEMS}, ${SHEET_LOANS}`);
  console.log(`出力件数: ${items.length}`);
  console.log("状態内訳:", counts);
  console.log(
    "貸出中一覧:",
    items
      .filter((x) => x.status === "貸出中")
      .map((x) => ({
        itemId: x.itemId,
        setId: x.setId ?? "",
        borrower: x.borrower ?? "",
      }))
  );
  console.log(`出力: ${OUTPUT_PUBLIC}`);
  console.log(`出力: ${OUTPUT_DOCS}`);
}

main();