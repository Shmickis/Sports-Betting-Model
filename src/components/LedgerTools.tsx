"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function LedgerTools({
  wagers,
}: {
  wagers: { id: string; selection: string; event: string | null }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [wagerId, setWagerId] = useState(wagers[0]?.id || "");
  const [field, setField] = useState("result");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function correct(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await fetch("/api/desk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "correct",
          wagerId,
          field,
          value,
          reason,
        }),
      });
      const data = await res.json();
      setMsg(res.ok ? "Correction logged to audit trail" : data.error);
      router.refresh();
    });
  }

  function parseCsv() {
    const lines = csv.trim().split(/\r?\n/);
    if (lines.length < 2) {
      setPreview("Need header + at least one row");
      return [];
    }
    const headers = lines[0].split(",").map((h) => h.trim());
    const candidates = lines.slice(1).map((line) => {
      const cols = line.split(",");
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = (cols[i] || "").trim();
      });
      return {
        sport: obj.sport || "Unknown",
        event: obj.event || "",
        selection: obj.selection || obj.side || "Unknown",
        line: obj.line ? Number(obj.line) : null,
        entryOdds: obj.entryOdds || obj.odds_american ? Number(obj.entryOdds || obj.odds_american) : null,
        sportsbook: obj.sportsbook || obj.book || "",
        placedAt: obj.placedAt || obj.timestamp || obj.date || "",
        stakeUsd: Number(obj.stakeUsd || obj.stake_usd || 10),
        classification: obj.classification || "Independent",
        marketType: obj.marketType || obj.market || "",
        result: obj.result || "",
        pnlUsd: obj.pnlUsd || obj.pnl_usd ? Number(obj.pnlUsd || obj.pnl_usd) : null,
      };
    });
    return candidates;
  }

  function previewImport() {
    startTransition(async () => {
      const candidates = parseCsv();
      if (!candidates.length) return;
      const res = await fetch("/api/desk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import_preview", candidates }),
      });
      const data = await res.json();
      const dups = (data.preview || []).filter(
        (p: { duplicates: unknown[] }) => p.duplicates.length > 0,
      ).length;
      setPreview(
        `${candidates.length} rows · ${dups} with duplicate warnings. Commit will skip duplicates unless forced.`,
      );
    });
  }

  function commitImport(allowDuplicates: boolean) {
    startTransition(async () => {
      const candidates = parseCsv();
      const res = await fetch("/api/desk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "import_commit",
          candidates,
          allowDuplicates,
        }),
      });
      const data = await res.json();
      setMsg(
        res.ok
          ? `Imported ${data.imported}, skipped ${data.skipped}`
          : data.error,
      );
      router.refresh();
    });
  }

  return (
    <>
      <form className="panel" onSubmit={correct}>
        <div className="panel-head">
          <h2>Correction (audit trail)</h2>
        </div>
        <div className="form-grid">
          <label className="full">
            Wager
            <select value={wagerId} onChange={(e) => setWagerId(e.target.value)}>
              {wagers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.selection} · {w.event || w.id}
                </option>
              ))}
            </select>
          </label>
          <label>
            Field
            <select value={field} onChange={(e) => setField(e.target.value)}>
              <option value="result">result</option>
              <option value="pnlUsd">pnlUsd</option>
              <option value="notes">notes</option>
              <option value="closingOdds">closingOdds</option>
              <option value="clvStatus">clvStatus</option>
              <option value="clvNote">clvNote</option>
              <option value="sportsbook">sportsbook</option>
              <option value="entryOdds">entryOdds</option>
              <option value="baseOdds">baseOdds</option>
              <option value="promoOdds">promoOdds</option>
            </select>
          </label>
          <label>
            New value
            <input value={value} onChange={(e) => setValue(e.target.value)} required />
          </label>
          <label className="full">
            Reason
            <input value={reason} onChange={(e) => setReason(e.target.value)} required />
          </label>
        </div>
        <div className="result-box">
          <button className="btn primary" disabled={pending} type="submit">
            Apply correction
          </button>
        </div>
      </form>

      <div className="panel">
        <div className="panel-head">
          <h2>Import / export</h2>
          <div>
            <a className="btn row" href="/api/desk?format=csv">
              Export CSV
            </a>
            <a className="btn row" href="/api/desk?format=json">
              Export JSON
            </a>
          </div>
        </div>
        <div className="result-box">
          <p className="meta">
            CSV headers example: sport,event,selection,line,entryOdds,sportsbook,placedAt,stakeUsd,classification,result,pnlUsd
          </p>
          <textarea
            rows={6}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder="Paste CSV with header row…"
            style={{ width: "100%", marginTop: "0.5rem" }}
          />
          <div style={{ marginTop: "0.75rem" }}>
            <button
              className="btn row"
              type="button"
              disabled={pending}
              onClick={previewImport}
            >
              Preview duplicates
            </button>
            <button
              className="btn row primary"
              type="button"
              disabled={pending}
              onClick={() => commitImport(false)}
            >
              Import (skip duplicates)
            </button>
            <button
              className="btn row"
              type="button"
              disabled={pending}
              onClick={() => commitImport(true)}
            >
              Import allowing duplicates
            </button>
          </div>
          {preview ? <p className="amber">{preview}</p> : null}
          {msg ? <p className="pos">{msg}</p> : null}
        </div>
      </div>
    </>
  );
}
