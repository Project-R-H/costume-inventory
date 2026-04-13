import React, { useEffect, useMemo, useState } from "react";
import type { DataFile } from "./types";
import { withBase } from "./lib/imagePath";

const ALL = "全部";

const COLOR_TAGS = [
  "水色",
  "青",
  "紫",
  "黒",
  "白",
  "ピンク",
  "赤",
  "黄",
  "緑",
  "ラベンダー",
  "ラベンダーブルー",
  "グレー",
  "チェック",
  "ブラウン",
  "ミリタリー",
  "ネイビー",
];

const STYLE_TAGS = [
  "メイド",
  "アイドル",
  "ロリータ",
  "制服",
  "和風",
  "ゴシック",
  "フリル",
  "ドレス",
  "ミリタリー",
  "モダン",
  "フェミニン",
];

function stop(e: React.MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
}

function statusClass(status: string) {
  switch (status) {
    case "在庫":
      return "badge status-stock";
    case "貸出中":
      return "badge status-loan";
    case "洗濯中":
      return "badge status-wash";
    case "廃棄":
      return "badge status-discard";
    default:
      return "badge status-unknown";
  }
}

function normalizeTags(text?: string): string[] {
  if (!text) return [];
  return text
    .split(/[・,，\/\s]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function detectTagsFromItem(it: {
  category?: string;
  name?: string;
  note?: string;
}) {
  const source = [it.category ?? "", it.name ?? "", it.note ?? ""].join(" ");

  const colors = COLOR_TAGS.filter((tag) => source.includes(tag));
  const styles = STYLE_TAGS.filter((tag) => source.includes(tag));

  return {
    colors,
    styles,
  };
}

export default function App() {
  const [data, setData] = useState<DataFile | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>(ALL);
  const [category, setCategory] = useState<string>(ALL);
  const [color, setColor] = useState<string>(ALL);
  const [styleTag, setStyleTag] = useState<string>(ALL);
  const [setOnly, setSetOnly] = useState<string>(ALL);

  const [openSetId, setOpenSetId] = useState<string | null>(null);

  useEffect(() => {
    if (!openSetId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [openSetId]);

  useEffect(() => {
    fetch(withBase("data.json"), { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`data.json 読み込み失敗: ${r.status}`);
        return (await r.json()) as DataFile;
      })
      .then(setData)
      .catch((e) => setErr(String(e?.message ?? e)));
  }, []);

  const categories = useMemo(() => {
    const s = new Set<string>();
    for (const it of data?.items ?? []) {
      if (it.category) {
        normalizeTags(it.category).forEach((tag) => s.add(tag));
      }
    }
    return Array.from(s).sort();
  }, [data]);

  const statuses = useMemo(() => {
    const s = new Set<string>();
    for (const it of data?.items ?? []) {
      s.add(it.status);
    }
    return Array.from(s).sort();
  }, [data]);

  const availableColors = useMemo(() => {
    const s = new Set<string>();
    for (const it of data?.items ?? []) {
      const tags = detectTagsFromItem(it);
      tags.colors.forEach((x) => s.add(x));
    }
    return Array.from(s).sort();
  }, [data]);

  const availableStyles = useMemo(() => {
    const s = new Set<string>();
    for (const it of data?.items ?? []) {
      const tags = detectTagsFromItem(it);
      tags.styles.forEach((x) => s.add(x));
    }
    return Array.from(s).sort();
  }, [data]);

  const filtered = useMemo(() => {
    const items = data?.items ?? [];
    const qq = q.trim().toLowerCase();

    return items.filter((it) => {
      const hasSet = !!it.setId;
      const tagParts = normalizeTags(it.category);
      const detected = detectTagsFromItem(it);

      if (status !== ALL && it.status !== status) return false;
      if (category !== ALL && !tagParts.includes(category)) return false;
      if (color !== ALL && !detected.colors.includes(color)) return false;
      if (styleTag !== ALL && !detected.styles.includes(styleTag)) return false;
      if (setOnly === "セット有" && !hasSet) return false;
      if (setOnly === "セット無" && hasSet) return false;

      if (!qq) return true;

      const hay = [
        it.itemId,
        it.setId ?? "",
        it.category ?? "",
        it.name ?? "",
        it.status,
        it.note ?? "",
        ...detected.colors,
        ...detected.styles,
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(qq);
    });
  }, [data, q, status, category, color, styleTag, setOnly]);

  const setItems = useMemo(() => {
    if (!openSetId) return [];
    return (data?.items ?? []).filter((x) => x.setId === openSetId);
  }, [data, openSetId]);

  const generatedDate = data?.generatedAt
    ? new Date(data.generatedAt).toISOString().slice(0, 10)
    : "-";

  return (
    <>
      <header>
        <div className="container">
          <div className="h1">衣装一覧（閲覧）</div>

          <div className="controls controls-5">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="検索：名称 / 色 / 系統 / ID / セットID / メモ…"
            />

            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value={ALL}>状態：全部</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  状態：{s}
                </option>
              ))}
            </select>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value={ALL}>カテゴリ：全部</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  カテゴリ：{c}
                </option>
              ))}
            </select>

            <select value={color} onChange={(e) => setColor(e.target.value)}>
              <option value={ALL}>色：全部</option>
              {availableColors.map((c) => (
                <option key={c} value={c}>
                  色：{c}
                </option>
              ))}
            </select>

            <select
              value={styleTag}
              onChange={(e) => setStyleTag(e.target.value)}
            >
              <option value={ALL}>系統：全部</option>
              {availableStyles.map((s) => (
                <option key={s} value={s}>
                  系統：{s}
                </option>
              ))}
            </select>

            <select
              value={setOnly}
              onChange={(e) => setSetOnly(e.target.value)}
            >
              <option value={ALL}>セット：全部</option>
              <option value="セット有">セット：有</option>
              <option value="セット無">セット：無</option>
            </select>
          </div>

          <div className="infoBar">
            <div>件数：{filtered.length}</div>
            <div>最終更新：{generatedDate}</div>
          </div>

          {err && (
            <div className="cardError">
              <div style={{ fontWeight: 800, marginBottom: 6 }}>エラー</div>
              <div className="mini">{err}</div>
            </div>
          )}
        </div>
      </header>

      <main>
        <div className="container">
          {!data && !err && <div className="mini">読み込み中…</div>}

          <div className="grid">
            {filtered.map((it) => {
              const img = it.image ? withBase(it.image) : undefined;
              const parsedCategoryTags = normalizeTags(it.category);
              const detected = detectTagsFromItem(it);

              const openSet = () => {
                if (!it.setId) return;
                setOpenSetId(it.setId);
              };

              return (
                <div className="card" key={it.itemId}>
                  <div
                    className="thumb"
                    style={{ cursor: it.setId ? "pointer" : "default" }}
                    onClick={openSet}
                    title={it.setId ? "クリックでセット一覧" : undefined}
                  >
                    {img ? (
                      <img src={img} alt={it.itemId} loading="lazy" />
                    ) : (
                      <div className="mini">画像なし</div>
                    )}

                    <div className="statusOverlay">
                      <div className={statusClass(it.status)}>{it.status}</div>
                    </div>
                  </div>

                  <div className="body">
                    <div className="rowTop">
                      <div className="nameMain">{it.name || "名称未設定"}</div>
                    </div>

                    <div className="idLine">{it.itemId}</div>

                    <div className="meta">
                      {parsedCategoryTags.length > 0 && (
                        <div className="tagRow">
                          {parsedCategoryTags.map((tag) => (
                            <span key={tag} className="chip">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {detected.colors.length > 0 && (
                        <div className="tagRow">
                          {detected.colors.map((tag) => (
                            <span key={tag} className="chip chip-color">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {detected.styles.length > 0 && (
                        <div className="tagRow">
                          {detected.styles.map((tag) => (
                            <span key={tag} className="chip chip-style">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {it.setId && (
                        <div className="mini">
                          セットID：
                          <a
                            href="#"
                            onClick={(e) => {
                              stop(e);
                              openSet();
                            }}
                            style={{ marginLeft: 6 }}
                          >
                            {it.setId}（開く）
                          </a>
                        </div>
                      )}
                    </div>

                    {it.note && <div className="mini">メモ：{it.note}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {openSetId && (
        <div className="modalBackdrop" onClick={() => setOpenSetId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div className="modalTitle">セット：{openSetId}</div>
              <button className="modalClose" onClick={() => setOpenSetId(null)}>
                閉じる
              </button>
            </div>

            <div className="modalBody">
              <div className="mini" style={{ marginBottom: 10 }}>
                このセットに含まれる衣装（{setItems.length}件）
              </div>

              <div className="setGrid">
                {setItems.map((x) => {
                  const img = x.image ? withBase(x.image) : undefined;
                  const parsedCategoryTags = normalizeTags(x.category);
                  const detected = detectTagsFromItem(x);

                  return (
                    <div className="card" key={x.itemId}>
                      <div className="thumb">
                        {img ? (
                          <img src={img} alt={x.itemId} loading="lazy" />
                        ) : (
                          <div className="mini">画像なし</div>
                        )}

                        <div className="statusOverlay">
                          <div className={statusClass(x.status)}>{x.status}</div>
                        </div>
                      </div>

                      <div className="body">
                        <div className="rowTop">
                          <div className="nameMain">{x.name || "名称未設定"}</div>
                        </div>

                        <div className="idLine">{x.itemId}</div>

                        <div className="meta">
                          {parsedCategoryTags.length > 0 && (
                            <div className="tagRow">
                              {parsedCategoryTags.map((tag) => (
                                <span key={tag} className="chip">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {detected.colors.length > 0 && (
                            <div className="tagRow">
                              {detected.colors.map((tag) => (
                                <span key={tag} className="chip chip-color">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {detected.styles.length > 0 && (
                            <div className="tagRow">
                              {detected.styles.map((tag) => (
                                <span key={tag} className="chip chip-style">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {x.note && <div className="mini">メモ：{x.note}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}