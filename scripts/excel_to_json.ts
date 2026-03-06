import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx") as any;

const INPUT_XLSX = path.resolve(process.cwd(), "衣装管理.xlsx");
const OUT_JSON = path.resolve(process.cwd(), "public", "data.json");

function norm(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function toISODate(v: unknown): string | undefined {
  if (!v) return undefined;

  if (v instanceof Date && !isNaN(v.getTime())) {
    const yyyy = String(v.getFullYear()).padStart(4, "0");
    const mm = String(v.getMonth() + 1).padStart(2, "0");
    const dd = String(v.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  if (typeof v === "number") {
    const d = XLSX.SSF?.parse_date_code?.(v);
    if (!d) return undefined;
    const yyyy = String(d.y).padStart(4, "0");
    const mm = String(d.m).padStart(2, "0");
    const dd = String(d.d).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  const s = norm(v);
  const m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (m) {
    const yyyy = m[1];
    const mm = String(Number(m[2])).padStart(2, "0");
    const dd = String(Number(m[3])).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  return undefined;
}

function readSheet(wb: any, name: string) {
  const ws = wb.Sheets?.[name];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<string, unknown>[];
}

function existsPublic(rel: string): boolean {
  const abs = path.resolve(process.cwd(), "public", rel);
  return fs.existsSync(abs);
}

function detectImage(category: string | undefined, fileName: string | undefined, itemId: string): string | undefined {
  const cand: string[] = [];

  if (category && fileName) cand.push(path.posix.join("衣装写真", category, fileName));
  if (category) {
    cand.push(path.posix.join("衣装写真", category, `${itemId}.jpg`));
    cand.push(path.posix.join("衣装写真", category, `${itemId}.jpeg`));
    cand.push(path.posix.join("衣装写真", category, `${itemId}.png`));
  }

  for (const rel of cand) if (existsPublic(rel)) return rel;
  return undefined;
}

function main() {
  if (!fs.existsSync(INPUT_XLSX)) {
    console.error("Excelが見つからない:", INPUT_XLSX);
    process.exit(1);
  }

  const wb = XLSX.readFile(INPUT_XLSX, { cellDates: true });

  // ===== ここはExcelの列名が完全一致している必要あり =====
  const itemsRows = readSheet(wb, "個体台帳");
  const loanRows = readSheet(wb, "貸出記録");

  // 返却日が空 = 現在貸出中
  const activeLoans = loanRows
    .map((r) => ({
      setId: norm(r["セットID"]),
      borrower: norm(r["貸出先"]),
      loanDate: toISODate(r["貸出日"]),
      returnDate: toISODate(r["返却日"]),
      approvedBy: norm(r["承認者"])
    }))
    .filter((r) => r.setId && !r.returnDate);

  // setIdごとに最新貸出
  const latestLoanBySet = new Map<string, typeof activeLoans[number]>();
  for (const r of activeLoans) {
    const prev = latestLoanBySet.get(r.setId);
    if (!prev) latestLoanBySet.set(r.setId, r);
    else if (r.loanDate && (!prev.loanDate || r.loanDate > prev.loanDate)) latestLoanBySet.set(r.setId, r);
  }

  const items = itemsRows
    .map((r) => {
      const itemId = norm(r["個体ID"]);
      if (!itemId) return null;

      const setId = norm(r["セットID"]) || undefined;
      const category = norm(r["カテゴリ"]) || undefined;
      const statusRaw = norm(r["状態"]);
      const name = norm(r["公開名"]) || undefined;
      const fileName = norm(r["写真ファイル名"]) || undefined;
      const note = norm(r["備考"]) || undefined;

      const status =
        statusRaw === "在庫" || statusRaw === "貸出中" || statusRaw === "洗濯中" || statusRaw === "廃棄"
          ? statusRaw
          : ("不明" as const);

      const loan = setId ? latestLoanBySet.get(setId) : undefined;
      const image = detectImage(category, fileName, itemId);

      return {
        itemId,
        setId,
        category,
        name,
        status,
        note,
        image,
        // ここは将来必要なら表示する（今のUIは非表示）
        borrower: status === "貸出中" ? (loan?.borrower || undefined) : undefined,
        approvedBy: status === "貸出中" ? (loan?.approvedBy || undefined) : undefined,
        loanDate: status === "貸出中" ? (loan?.loanDate || undefined) : undefined
      };
    })
    .filter(Boolean);

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify({ generatedAt: new Date().toISOString(), items }, null, 2), "utf-8");

  console.log(`OK: ${items.length} 件 -> ${OUT_JSON}`);
}

main();