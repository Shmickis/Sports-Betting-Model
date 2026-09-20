"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const STATUSES = [
  "New",
  "Monitoring",
  "Needs price",
  "Needs lineup",
  "Needs injury confirmation",
  "Reprice required",
  "PLAY",
  "Downgraded before execution",
  "PASS",
  "Market closed",
];

const CLASSES = [
  "PLAY",
  "STRONG LEAN",
  "LEAN",
  "PASS",
  "NO BET",
  "Independent",
  "Research/Hypothetical",
];

export function EdgeWatchClient({
  rows,
}: {
  rows: {
    id: string;
    sport: string;
    league: string | null;
    event: string;
    startTime: string | null;
    market: string;
    selection: string;
    line: number | null;
    sportsbook: string | null;
    currentOdds: number | null;
    breakEvenProb: number | null;
    truelineProb: string | null;
    estimatedEdge: number | null;
    classification: string;
    confidence: string | null;
    status: string;
    supportingFactors: string | null;
    risks: string | null;
    requiredPrice: string | null;
    playableTo: string | null;
    dataSourceStatus: string;
    lastUpdated: string;
  }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    sport: "NFL",
    league: "NFL",
    event: "",
    market: "moneyline",
    selection: "",
    line: "",
    sportsbook: "FanDuel",
    currentOdds: "",
    classification: "LEAN",
    status: "New",
    supportingFactors: "",
    risks: "",
  });

  function createOpp(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await fetch("/api/desk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "opportunity",
          ...form,
          line: form.line === "" ? null : Number(form.line),
          currentOdds: form.currentOdds === "" ? null : Number(form.currentOdds),
        }),
      });
      const data = await res.json();
      setMsg(res.ok ? `Created ${data.id}` : data.error);
      router.refresh();
    });
  }

  function setClass(id: string, classification: string, status?: string) {
    startTransition(async () => {
      await fetch("/api/desk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "opportunity_class",
          id,
          classification,
          status,
          note: `Manual reclass to ${classification}`,
        }),
      });
      router.refresh();
    });
  }

  return (
    <>
      <form className="panel" onSubmit={createOpp}>
        <div className="panel-head">
          <h2>Manual entry</h2>
        </div>
        <div className="form-grid">
          <label>
            Sport
            <input
              value={form.sport}
              onChange={(e) => setForm({ ...form, sport: e.target.value })}
              required
            />
          </label>
          <label>
            League
            <input
              value={form.league}
              onChange={(e) => setForm({ ...form, league: e.target.value })}
            />
          </label>
          <label className="full">
            Event
            <input
              value={form.event}
              onChange={(e) => setForm({ ...form, event: e.target.value })}
              required
            />
          </label>
          <label>
            Market
            <input
              value={form.market}
              onChange={(e) => setForm({ ...form, market: e.target.value })}
              required
            />
          </label>
          <label>
            Selection
            <input
              value={form.selection}
              onChange={(e) => setForm({ ...form, selection: e.target.value })}
              required
            />
          </label>
          <label>
            Line
            <input
              value={form.line}
              onChange={(e) => setForm({ ...form, line: e.target.value })}
            />
          </label>
          <label>
            Odds
            <input
              value={form.currentOdds}
              onChange={(e) => setForm({ ...form, currentOdds: e.target.value })}
            />
          </label>
          <label>
            Classification
            <select
              value={form.classification}
              onChange={(e) =>
                setForm({ ...form, classification: e.target.value })
              }
            >
              {CLASSES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="full">
            Supporting factors
            <input
              value={form.supportingFactors}
              onChange={(e) =>
                setForm({ ...form, supportingFactors: e.target.value })
              }
            />
          </label>
          <label className="full">
            Risks
            <input
              value={form.risks}
              onChange={(e) => setForm({ ...form, risks: e.target.value })}
            />
          </label>
        </div>
        <div className="result-box">
          <button className="btn primary" disabled={pending} type="submit">
            Add opportunity
          </button>
          {msg ? <p className="pos">{msg}</p> : null}
        </div>
      </form>

      <div className="panel">
        <div className="panel-head">
          <h2>{rows.length} opportunities</h2>
        </div>
        {rows.length === 0 ? (
          <p className="empty">No open opportunities yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Market</th>
                  <th>Odds</th>
                  <th>TL Prob</th>
                  <th>Edge</th>
                  <th>Class</th>
                  <th>Status</th>
                  <th>Factors / Risks</th>
                  <th>Source</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <strong>
                        {o.sport} · {o.event}
                      </strong>
                      <small>{o.startTime || "Start time unknown"}</small>
                    </td>
                    <td>
                      {o.selection}
                      <small>
                        {o.market}
                        {o.line != null ? ` ${o.line}` : ""} ·{" "}
                        {o.sportsbook || "Not recorded"}
                      </small>
                    </td>
                    <td>
                      {o.currentOdds == null
                        ? "Not recorded"
                        : o.currentOdds > 0
                          ? `+${o.currentOdds}`
                          : `${o.currentOdds}`}
                    </td>
                    <td>{o.truelineProb || "Not recorded"}</td>
                    <td>
                      {o.estimatedEdge == null
                        ? "Not recorded"
                        : `${(o.estimatedEdge * 100).toFixed(1)}%`}
                    </td>
                    <td>
                      <span className="badge lean">{o.classification}</span>
                    </td>
                    <td>{o.status}</td>
                    <td>
                      <small>
                        {o.supportingFactors || "Not recorded"}
                        <br />
                        Risk: {o.risks || "Not recorded"}
                        <br />
                        Req {o.requiredPrice || "—"} · Playable to{" "}
                        {o.playableTo || "—"}
                      </small>
                    </td>
                    <td className="amber">{o.dataSourceStatus}</td>
                    <td className="actions">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setClass(o.id, "PLAY", "PLAY")}
                      >
                        → PLAY
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setClass(o.id, "PASS", "PASS")}
                      >
                        → PASS
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          setClass(o.id, "LEAN", "Downgraded before execution")
                        }
                      >
                        Downgrade
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
