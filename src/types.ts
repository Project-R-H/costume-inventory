export type CostumeStatus = "在庫" | "貸出中" | "洗濯中" | "廃棄" | "不明";

export type CostumeItem = {
  itemId: string;
  setId?: string;
  category?: string;
  name?: string;
  status: CostumeStatus;
  image?: string;
};

export type DataFile = {
  generatedAt: string;
  items: CostumeItem[];
};