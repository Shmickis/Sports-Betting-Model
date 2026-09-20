"use client";

import { useEffect, useState, useTransition } from "react";
import type { HubSnapshot, PaperBet } from "@/lib/types";

function fmtMoney(n: number) {
  const sign = n > 0 ? "+" : "";
  return `${sign}$${n.toFixed(2)}`;
}

function fmtOdds(n: number) {
  return n > 0 ? `+${n}` : `${n}`;
}

function fmtEdge(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}

function resultTone(result: string) {
  const r = result.toLowerCase();
  if (r === "w" || r === "win") return "win";
  if (r === "l" || r === "loss") return "loss";
  if (r === "void") return "void";
  return "open";
}

export function HubApp({ initial }: { initial: HubSnapshot }) {
  const [snap, setSnap] = useState(initial);
  const [connected, setConnected] = useState(false);
  const [board, setBoard] = useState<"official" | "paper">("official");
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    version: initial.model.version,
    message: "",
    notes: initial.model.notes,
    edgeFloor: String(initial.model.edgeFloor),
  });

  useEffect(() => {
    const es = new EventSource("/api/stream");
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (event) => {
      try {
        const next = JSON.parse(event.data) as HubSnapshot;
        setSnap(next);
        setForm((f) => ({
          ...f,
          version: next.model.version,
          notes: next.model.notes,
          edgeFloor: String(next.model.edgeFloor),
        }));
      } catch {
        /* ignore malformed frames */
      }
    };
    return () => es.close();
  }, []);

  function pushModelUpdate(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await fetch("/api/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: form.version,
          message: form.message,
          notes: form.notes,
          edgeFloor: Number(form.edgeFloor),
          status: "live",
        }),
      });
      if (res.ok) {
        const next = (await res.json()) as HubSnapshot;
        setSnap(next);
        setForm((f) => ({ ...f, message: "" }));
      }
    });
  }

  function gradeOpen(bet: PaperBet, result: PaperBet["result"]) {
    startTransition(async () => {
      const pnl =
        result === "win"
          ? bet.odds > 0
            ? Number(((bet.stake * bet.odds) / 100).toFixed(2))
            : Number(((bet.stake * 100) / Math.abs(bet.odds)).toFixed(2))
          : result === "loss"
            ? -bet.stake
            : 0;
      const res = await fetch("/api/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "paper", id: bet.id, result, pnl }),
      });
      if (res.ok) setSnap((await res.json()) as HubSnapshot);
    });
  }

  const openBoard = snap.paper.filter((p) => p.result === "not_bet");
  const paperSettled = snap.paper.filter((p) => p.result !== "not_bet");

  return (
    <div className="desk">
      <div className="atmosphere" aria-hidden />
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark" />
          <div>
            <p className="brand">TrueLine</p>
            <p className="brand-sub">Model desk</p>
          </div>
        </div>
        <div className="live-chip" data-on={connected}>
          <span className="pulse" />
          {connected ? "Live" : "Reconnecting"}
          <em>{snap.model.version}</em>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <h1 className="hero-brand">TrueLine</h1>
          <p className="hero-line">
            One desk for Official PLAY tracking, paper board, and live model
            pushes while you iterate with Grok.
          </p>
          <div className="hero-ctas">
            <a className="btn primary" href="#update">
              Push model update
            </a>
            <a className="btn ghost" href="#open-board">
              Grade open tickets
            </a>
          </div>
        </div>
        <div className="hero-visual" aria-hidden>
          <div className="field-glow" />
          <div className="scorebug">
            <span>OFFICIAL</span>
            <strong>{snap.model.official.record}</strong>
            <span>{fmtMoney(snap.model.official.pnlUsd)}</span>
          </div>
        </div>
      </section>

      <section className="metrics" aria-label="Portfolio metrics">
        <article>
          <p>Official P/L</p>
          <strong className={snap.model.official.pnlUsd >= 0 ? "pos" : "neg"}>
            {fmtMoney(snap.model.official.pnlUsd)}
          </strong>
          <span>
            {snap.model.official.rawRoiPct}% ROI · {snap.model.maturity}
          </span>
        </article>
        <article>
          <p>Record</p>
          <strong>{snap.model.official.record}</strong>
          <span>
            {snap.model.official.settledCount} settled · $
            {snap.model.official.riskedUsd} risked
          </span>
        </article>
        <article>
          <p>Paper board</p>
          <strong className={snap.model.paper.pnlUsd >= 0 ? "pos" : "neg"}>
            {fmtMoney(snap.model.paper.pnlUsd)}
          </strong>
          <span>
            {snap.model.paper.open} open · {snap.model.paper.settledWL} graded ·{" "}
            {snap.model.paper.voids} void
          </span>
        </article>
        <article>
          <p>Edge floor</p>
          <strong>{(snap.model.edgeFloor * 100).toFixed(0)}%</strong>
          <span>Updated {timeAgo(snap.model.updatedAt)}</span>
        </article>
      </section>

      <section className="panel open-section" id="open-board">
        <div className="panel-head">
          <h2>Open catch-up board</h2>
          <span className="count-chip">{openBoard.length} waiting</span>
        </div>
        {openBoard.length === 0 ? (
          <p className="empty">No open paper tickets. Push a model refresh or sync the next slate.</p>
        ) : (
          <ul className="open-list">
            {openBoard.map((p) => (
              <li key={p.id}>
                <div>
                  <strong>{p.side}</strong>
                  <small>
                    {p.sport} · {p.event} · edge {fmtEdge(p.edge)} ·{" "}
                    {fmtOdds(p.odds)}
                  </small>
                </div>
                <div className="actions">
                  <button
                    type="button"
                    data-action="win"
                    data-id={p.id}
                    disabled={pending}
                    onClick={() => gradeOpen(p, "win")}
                  >
                    Win
                  </button>
                  <button
                    type="button"
                    data-action="loss"
                    data-id={p.id}
                    disabled={pending}
                    onClick={() => gradeOpen(p, "loss")}
                  >
                    Loss
                  </button>
                  <button
                    type="button"
                    data-action="void"
                    data-id={p.id}
                    disabled={pending}
                    onClick={() => gradeOpen(p, "void")}
                  >
                    Void
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="split">
        <section className="panel" id="board">
          <div className="panel-head">
            <h2>Settled ledger</h2>
            <label className="board-select">
              View
              <select
                id="board-view"
                value={board}
                onChange={(e) =>
                  setBoard(e.target.value as "official" | "paper")
                }
              >
                <option value="official">Official PLAY</option>
                <option value="paper">Paper graded</option>
              </select>
            </label>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Sport</th>
                  <th>Play</th>
                  <th>Odds</th>
                  <th>Edge</th>
                  <th>Result</th>
                  <th>P/L</th>
                </tr>
              </thead>
              <tbody>
                {board === "official"
                  ? snap.official.map((play) => (
                      <tr key={play.id}>
                        <td>{play.date.slice(5)}</td>
                        <td>{play.sport}</td>
                        <td>
                          <strong>
                            {play.side}
                            {play.line != null ? ` ${play.line}` : ""}
                          </strong>
                          <small>
                            {play.event || play.market}
                            {play.book ? ` · ${play.book}` : ""}
                          </small>
                        </td>
                        <td>{fmtOdds(play.odds)}</td>
                        <td>{play.prob ?? "—"}</td>
                        <td>
                          <span className={`pill ${resultTone(play.result)}`}>
                            {play.result}
                          </span>
                        </td>
                        <td className={play.pnl >= 0 ? "pos" : "neg"}>
                          {fmtMoney(play.pnl)}
                        </td>
                      </tr>
                    ))
                  : paperSettled.map((p) => (
                      <tr key={p.id}>
                        <td>{timeAgo(p.timestamp)}</td>
                        <td>{p.sport}</td>
                        <td>
                          <strong>{p.side}</strong>
                          <small>
                            {p.event} · {p.model}
                            {p.classification ? ` · ${p.classification}` : ""}
                          </small>
                        </td>
                        <td>{fmtOdds(p.odds)}</td>
                        <td>{fmtEdge(p.edge)}</td>
                        <td>
                          <span className={`pill ${resultTone(p.result)}`}>
                            {p.result}
                          </span>
                        </td>
                        <td className={p.pnl >= 0 ? "pos" : "neg"}>
                          {fmtMoney(p.pnl)}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="side">
          <section className="panel" id="update">
            <div className="panel-head">
              <h2>Update model</h2>
            </div>
            <form className="update-form" onSubmit={pushModelUpdate}>
              <label>
                Version
                <input
                  value={form.version}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, version: e.target.value }))
                  }
                  placeholder="v0.4.3-wx"
                  required
                />
              </label>
              <label>
                Desk note
                <input
                  value={form.message}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, message: e.target.value }))
                  }
                  placeholder="What changed in Grok this pass?"
                />
              </label>
              <label>
                Edge floor
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.edgeFloor}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, edgeFloor: e.target.value }))
                  }
                />
              </label>
              <label>
                Standing notes
                <textarea
                  rows={4}
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                />
              </label>
              <button className="btn primary full" disabled={pending} type="submit">
                {pending ? "Pushing…" : "Push live update"}
              </button>
            </form>
            <p className="hint">
              Official and Independent stay separated for ROI. Hub mirrors your
              Drive ledger and accepts live bumps while the model evolves in
              Grok.
            </p>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Activity</h2>
            </div>
            <ul className="feed">
              {snap.updates.map((u) => (
                <li key={u.id}>
                  <div>
                    <span className={`kind ${u.kind}`}>{u.kind}</span>
                    <time>{timeAgo(u.at)}</time>
                  </div>
                  <strong>{u.title}</strong>
                  <p>{u.body}</p>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <footer className="foot">
        <p>
          Seeded from your TrueLine Live Ledger · Official{" "}
          {snap.model.official.record} · never mix portfolios
        </p>
      </footer>
    </div>
  );
}
