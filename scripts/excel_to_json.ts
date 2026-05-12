import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import * as XLSX from "xlsx";
import sharp from "sharp";

type CostumeStatus =
  | "\u5728\u5eab"
  | "\u8cb8\u51fa\u4e2d"
  | "\u6d17\u6fef\u4e2d"
  | "\u5ec3\u68c4"
  | "\u4e0d\u660e";

type CostumeItem = {
  itemId: string;
  setId?: string;
  category?: string;
  name?: string;
  status: CostumeStatus;
  image?: string;
};

type DataFile = {
  generatedAt: string;
  items: CostumeItem[];
};

const ROOT = process.cwd();

const INPUT_XLSX = path.resolve(
  "C:\\Users\\user\\Desktop\\data\\\u8863\u88c5\u7ba1\u7406.xlsx"
);

const SOURCE_IMAGE_ROOT = path.resolve(
  "C:\\Users\\user\\Desktop\\data\\\u8863\u88c5\u5199\u771f"
);

const PUBLIC_IMAGE_DIR = path.join(ROOT, "public", "assets", "costumes");
const OUTPUT_PUBLIC = path.join(ROOT, "public", "data.json");
const IMAGE_MAP_PATH = path.join(ROOT, "private", "image-name-map.json");

const SHEET_ITEMS = "\u500b\u4f53\u53f0\u5e33";
const SHEET_LOANS = "\u8cb8\u51fa\u8a18\u9332";

const H_SET_ID = "\u30bb\u30c3\u30c8ID";
const H_ITEM_ID = "\u500b\u4f53ID";
const H_TYPE = "\u7a2e\u985e";
const H_CATEGORY = "\u30ab\u30c6\u30b4\u30ea";
const H_STATUS = "\u72b6\u614b";
const H_PHOTO = "\u5199\u771f\u30d5\u30a1\u30a4\u30eb\u540d";
const H_PUBLIC_NAME = "\u516c\u958b\u540d";
const H_PUBLIC_FLAG = "\u516c\u958b/\u975e\u516c\u958b";
const H_RETURN_DATE = "\u8fd4\u5374\u65e5";

const STATUS_STOCK = "\u5728\u5eab" as const;
const STATUS_LOAN = "\u8cb8\u51fa\u4e2d" as const;
const STATUS_WASH = "\u6d17\u6fef\u4e2d" as const;
const STATUS_DISCARD = "\u5ec3\u68c4" as const;
const STATUS_UNKNOWN = "\u4e0d\u660e" as const;
const PUBLIC_VALUE = "\u516c\u958b";

type ImageMap = Record<string, string>;

function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function ensureParentDir(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function toText(v: unknown): string {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function normalizeStatus(raw: unknown): CostumeStatus {
  const s = String(raw ?? "").replace(/\s+/g, "").trim();

  if (!s) return STATUS_UNKNOWN;

  if (
    s === STATUS_STOCK ||
    s === "\u5728\u5eab\u3042\u308a" ||
    s === "\u4fdd\u7ba1\u4e2d"
  ) {
    return STATUS_STOCK;
  }

  if (
    s === STATUS_LOAN ||
    s === "\u8cb8\u51fa" ||
    s === "\u8cb8\u3057\u51fa\u3057\u4e2d" ||
    s === "\u4f7f\u7528\u4e2d" ||
    s === "\u30ec\u30f3\u30bf\u30eb\u4e2d"
  ) {
    return STATUS_LOAN;
  }

  if (
    s === STATUS_WASH ||
    s === "\u6d17\u6fef" ||
    s === "\u30af\u30ea\u30fc\u30cb\u30f3\u30b0\u4e2d" ||
    s === "\u30af\u30ea\u30fc\u30cb\u30f3\u30b0"
  ) {
    return STATUS_WASH;
  }

  if (
    s === STATUS_DISCARD ||
    s === "\u5ec3\u68c4\u6e08" ||
    s === "\u5ec3\u68c4\u6e08\u307f" ||
    s === "\u51e6\u5206" ||
    s === "\u51e6\u5206\u6e08"
  ) {
    return STATUS_DISCARD;
  }

  return STATUS_UNKNOWN;
}

function loadImageMap(): ImageMap {
  if (!fs.existsSync(IMAGE_MAP_PATH)) return {};

  const raw = fs.readFileSync(IMAGE_MAP_PATH, "utf-8");
  const parsed = JSON.parse(raw);

  if (!parsed || typeof parsed !== "object") return {};
  return parsed as ImageMap;
}

function saveImageMap(map: ImageMap) {
  ensureParentDir(IMAGE_MAP_PATH);
  fs.writeFileSync(IMAGE_MAP_PATH, JSON.stringify(map, null, 2), "utf-8");
}

function makeMapKey(category: string, photoFileName: string): string {
  return `${category}||${photoFileName}`;
}

function getOrCreatePublicImageName(map: ImageMap, key: string): string {
  if (map[key]) return map[key];

  const randomName = crypto.randomBytes(18).toString("hex");
  const fileName = `${randomName}.jpg`;

  map[key] = fileName;
  return fileName;
}

function resolveSourceImage(category: string, photoFileName: string): string {
  if (!photoFileName) return "";

  if (!category) {
    return path.join(SOURCE_IMAGE_ROOT, photoFileName);
  }

  return path.join(SOURCE_IMAGE_ROOT, category, photoFileName);
}

async function createPublicImage(sourcePath: string, outputPath: string) {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`source image not found: ${sourcePath}`);
  }

  ensureParentDir(outputPath);

  await sharp(sourcePath)
    .rotate()
    .jpeg({
      quality: 86,
      mozjpeg: true,
    })
    .toFile(outputPath);
}

function cleanPublicImageDir() {
  fs.rmSync(PUBLIC_IMAGE_DIR, { recursive: true, force: true });
  ensureDir(PUBLIC_IMAGE_DIR);
}

async function run() {
  if (!fs.existsSync(INPUT_XLSX)) {
    throw new Error(`excel file not found: ${INPUT_XLSX}`);
  }

  if (!fs.existsSync(SOURCE_IMAGE_ROOT)) {
    throw new Error(`source image folder not found: ${SOURCE_IMAGE_ROOT}`);
  }

  const dangerousPublicPhotoDir = path.join(
    ROOT,
    "public",
    "\u8863\u88c5\u5199\u771f"
  );

  if (fs.existsSync(dangerousPublicPhotoDir)) {
    throw new Error(
      [
        "public original image folder still exists.",
        "Move it outside the project first.",
        "Move from: public original image folder",
        "Move to: C:\\Users\\user\\Desktop\\data\\original image folder",
      ].join("\n")
    );
  }

  const excelBuffer = fs.readFileSync(INPUT_XLSX);

  const wb = XLSX.read(excelBuffer, {
    type: "buffer",
    cellDates: true,
  });

  const wsItems = wb.Sheets[SHEET_ITEMS];
  const wsLoans = wb.Sheets[SHEET_LOANS];

  if (!wsItems) {
    throw new Error(`sheet not found: ${SHEET_ITEMS}`);
  }

  if (!wsLoans) {
    throw new Error(`sheet not found: ${SHEET_LOANS}`);
  }

  const itemRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wsItems, {
    defval: "",
  });

  const loanRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wsLoans, {
    defval: "",
  });

  const activeLoanSetIds = new Set<string>();

  for (const row of loanRows) {
    const setId = toText(row[H_SET_ID]);
    const returnDate = toText(row[H_RETURN_DATE]);

    if (!setId) continue;
    if (returnDate) continue;

    activeLoanSetIds.add(setId);
  }

  const imageMap = loadImageMap();

  cleanPublicImageDir();

  const items: CostumeItem[] = [];
  const copiedImages: string[] = [];

  for (const row of itemRows) {
    const setId = toText(row[H_SET_ID]);
    const itemId = toText(row[H_ITEM_ID]);
    const type = toText(row[H_TYPE]);
    const category = toText(row[H_CATEGORY]);
    const rawStatus = row[H_STATUS];
    const photoFileName = toText(row[H_PHOTO]);
    const publicName = toText(row[H_PUBLIC_NAME]);
    const publicFlag = toText(row[H_PUBLIC_FLAG]);

    if (!itemId) continue;

    if (publicFlag !== PUBLIC_VALUE) {
      continue;
    }

    let status = normalizeStatus(rawStatus);

    if (setId && activeLoanSetIds.has(setId)) {
      status = STATUS_LOAN;
    }

    const item: CostumeItem = {
      itemId,
      status,
    };

    if (setId) item.setId = setId;
    if (category) item.category = category;

    if (publicName) {
      item.name = publicName;
    } else {
      const fallbackName = [category, type].filter(Boolean).join(" ");
      if (fallbackName) item.name = fallbackName;
    }

    if (photoFileName) {
      const sourceImage = resolveSourceImage(category, photoFileName);
      const mapKey = makeMapKey(category, photoFileName);
      const publicImageName = getOrCreatePublicImageName(imageMap, mapKey);
      const outputImage = path.join(PUBLIC_IMAGE_DIR, publicImageName);

      await createPublicImage(sourceImage, outputImage);

      item.image = `assets/costumes/${publicImageName}`;
      copiedImages.push(item.image);
    }

    items.push(item);
  }

  saveImageMap(imageMap);

  const data: DataFile = {
    generatedAt: new Date().toISOString(),
    items,
  };

  ensureParentDir(OUTPUT_PUBLIC);
  fs.writeFileSync(OUTPUT_PUBLIC, JSON.stringify(data, null, 2), "utf-8");

  const counts = {
    stock: items.filter((x) => x.status === STATUS_STOCK).length,
    loan: items.filter((x) => x.status === STATUS_LOAN).length,
    wash: items.filter((x) => x.status === STATUS_WASH).length,
    discard: items.filter((x) => x.status === STATUS_DISCARD).length,
    unknown: items.filter((x) => x.status === STATUS_UNKNOWN).length,
  };

  console.log(`input excel: ${INPUT_XLSX}`);
  console.log(`source image folder: ${SOURCE_IMAGE_ROOT}`);
  console.log(`output json: ${OUTPUT_PUBLIC}`);
  console.log(`public image folder: ${PUBLIC_IMAGE_DIR}`);
  console.log(`item count: ${items.length}`);
  console.log(`public image count: ${copiedImages.length}`);
  console.log("status counts:", counts);

  console.log("");
  console.log("not exported to public data.json:");
  console.log("- borrower");
  console.log("- approvedBy");
  console.log("- loanDate");
  console.log("- returnDate");
  console.log("- note");
  console.log("");
  console.log("public images were regenerated without copying EXIF/GPS metadata.");
}

run().catch((e) => {
  console.error("ERROR:", e?.message ?? e);
  process.exit(1);
});