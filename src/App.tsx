import React, { useEffect, useMemo, useState } from "react";
import type { DataFile } from "./types";
import { withBase } from "./lib/imagePath";

const ALL = "全部";

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

export default function App() {
  const [data, setData] = useState<DataFile | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>(ALL);
  const [category, setCategory] = useState<string>(ALL);
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
      if (it.category) s.add(it.category);
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

  const filtered = useMemo(() => {
    const items = data?.items ?? [];
    const qq = q.trim().toLowerCase();

    return items.filter((it) => {
      if (status !== ALL && it.status !== status) return false;
      if (category !== ALL && (it.category ?? "") !== category) return false;

      const hasSet = !!it.setId;
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
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(qq);
    });
  }, [data, q, status, category, setOnly]);

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

          <div className="controls">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="検索：ID / セットID / 状態 / メモ…"
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
                  </div>

                  <div className="body">
                    <div className="rowTop">
                      <div className="id">{it.itemId}</div>
                      <div className={statusClass(it.status)}>{it.status}</div>
                    </div>

                    <div className="meta">
                      {it.category && <div>カテゴリ：{it.category}</div>}
                      {it.name && <div>名称：{it.name}</div>}
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

                  return (
                    <div className="card" key={x.itemId}>
                      <div className="thumb">
                        {img ? (
                          <img src={img} alt={x.itemId} loading="lazy" />
                        ) : (
                          <div className="mini">画像なし</div>
                        )}
                      </div>

                      <div className="body">
                        <div className="rowTop">
                          <div className="id">{x.itemId}</div>
                          <div className={statusClass(x.status)}>{x.status}</div>
                        </div>

                        <div className="meta">
                          {x.category && <div>カテゴリ：{x.category}</div>}
                          {x.name && <div>名称：{x.name}</div>}
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