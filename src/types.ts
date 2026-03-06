export type CostumeStatus = "在庫" | "貸出中" | "洗濯中" | "廃棄" | "不明";

export type CostumeItem = {
  itemId: string;
  setId?: string;
  category?: string;
  name?: string;
  status: CostumeStatus;
  note?: string;
  image?: string;

  // ここは将来「公開で隠す」も可能（今は表示しない構成）
  borrower?: string;
  approvedBy?: string;
  loanDate?: string;
};

export type DataFile = {
  generatedAt: string;
  items: CostumeItem[];
};