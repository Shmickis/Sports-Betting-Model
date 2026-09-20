"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Tip } from "@/components/Tip";

const CHECKPOINTS = [
  { key: "entry", label: "Entry" },
  { key: "h6", label: "~6h" },
  { key: "m90", label: "~90m" },
  { key: "m30", label: "~30m" },
  { key: "close", label: "Near close / final" },
];

export function ClvClient({
  rows,
}: {
  rows: {
    wager: {
      id: string;
      selection: string;
      event: string | null;
      sport: string;
      entryOdds: number | null;
      sportsbook: string | null;
      clvStatus: string;
      clvNote: string | null;
      closingOdds: number | null;
    };
    checkpoints: {
      checkpoint: string;
      oddsAmerican: number | null;
      sameBookMarket: number;
    }[];
    clv: { label: string; pp: number | null; note: string };
  }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [wagerId, setWagerId] = useState(rows[0]?.wager.id || "");
  const [checkpoint, setCheckpoint] = useState("close");
  const [odds, setOdds] = useState("");
  const [sameBook, setSameBook] = useState(true);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  function save(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await fetch("/api/desk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "clv",
          wagerId,
          checkpoint,
          oddsAmerican: odds === "" ? null : Number(odds),
          sameBookMarket: sameBook,
          note,
        }),
      });
      const data = await res.json();
      setMsg(res.ok ? "Checkpoint saved" : data.error);
      router.refresh();
    });
  }

  return (
    <>
      <form className="panel" onSubmit={save}>
        <div className="panel-head">
          <h2>
            Record checkpoint{" "}
            <Tip text="CLV stays Unconfirmed unless an actual close or near-close reference is recorded. Same book/market/threshold preferred." />
          </h2>
        </div>
        <div className="form-grid">
          <label className="full">
            Wager
            <select value={wagerId} onChange={(e) => setWagerId(e.target.value)} required>
              {rows.map((r) => (
                <option key={r.wager.id} value={r.wager.id}>
                  {r.wager.sport} · {r.wager.selection} ·{" "}
                  {r.wager.event || "Unknown event"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Checkpoint
            <select
              value={checkpoint}
              onChange={(e) => setCheckpoint(e.target.value)}
            >
              {CHECKPOINTS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            American odds
            <input value={odds} onChange={(e) => setOdds(e.target.value)} />
          </label>
          <label>
            Same book/market/threshold
            <select
              value={sameBook ? "yes" : "no"}
              onChange={(e) => setSameBook(e.target.value === "yes")}
            >
              <option value="yes">Yes</option>
              <option value="no">No (directional only)</option>
            </select>
          </label>
          <label className="full">
            Note
            <input value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        </div>
        <div className="result-box">
          <button className="btn primary" disabled={pending} type="submit">
            Save checkpoint
          </button>
          {msg ? <p className="pos">{msg}</p> : null}
        </div>
      </form>

      <div className="panel">
        <div className="panel-head">
          <h2>CLV board</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Play</th>
                <th>Entry</th>
                <th>Checkpoints</th>
                <th>CLV label</th>
                <th>pp</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.wager.id}>
                  <td>
                    <strong>{r.wager.selection}</strong>
                    <small>
                      {r.wager.sport} · {r.wager.event || "Unknown"} ·{" "}
                      {r.wager.sportsbook || "Not recorded"}
                    </small>
                  </td>
                  <td>
                    {r.wager.entryOdds == null
                      ? "Not recorded"
                      : r.wager.entryOdds > 0
                        ? `+${r.wager.entryOdds}`
                        : `${r.wager.entryOdds}`}
                  </td>
                  <td>
                    <small>
                      {CHECKPOINTS.map((c) => {
                        const hit = r.checkpoints.find(
                          (x) => x.checkpoint === c.key,
                        );
                        return (
                          <span key={c.key} style={{ display: "block" }}>
                            {c.label}:{" "}
                            {hit?.oddsAmerican == null
                              ? "—"
                              : hit.oddsAmerican > 0
                                ? `+${hit.oddsAmerican}`
                                : `${hit.oddsAmerican}`}
                          </span>
                        );
                      })}
                    </small>
                  </td>
                  <td className="amber">{r.clv.label}</td>
                  <td>
                    {r.clv.pp == null ? "Not available" : r.clv.pp.toFixed(2)}
                  </td>
                  <td>
                    <small>{r.clv.note}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
