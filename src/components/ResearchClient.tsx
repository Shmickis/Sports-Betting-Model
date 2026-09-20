"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Tip } from "@/components/Tip";

export function ResearchClient({
  notes,
}: {
  notes: {
    id: string;
    title: string;
    body: string;
    modelVersion: string | null;
    robustFlag: number;
    createdAt: string;
  }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [modelVersion, setModelVersion] = useState("");
  const [checks, setChecks] = useState({
    preserve: false,
    dropTop: false,
    dropExtreme: false,
    flagDisagree: false,
    verifyClv: false,
    compareMetrics: false,
  });
  const [msg, setMsg] = useState<string | null>(null);

  const allChecked = Object.values(checks).every(Boolean);

  function save(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await fetch("/api/desk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "research",
          title,
          body: `${body}\n\n--- Robustness checklist ---\n${JSON.stringify(checks, null, 2)}`,
          modelVersion,
          robustFlag: allChecked,
        }),
      });
      const data = await res.json();
      setMsg(
        res.ok
          ? allChecked
            ? "Saved and marked Robust (checklist complete)"
            : "Saved — not Robust until checklist passes"
          : data.error,
      );
      setTitle("");
      setBody("");
      router.refresh();
    });
  }

  return (
    <>
      <form className="panel" onSubmit={save}>
        <div className="panel-head">
          <h2>
            Research note{" "}
            <Tip text="A conclusion is not Robust if advantage disappears after removing/verifying a few extreme wagers. Outliers stay in the permanent ledger." />
          </h2>
        </div>
        <div className="form-grid">
          <label className="full">
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label>
            Model version
            <input
              value={modelVersion}
              onChange={(e) => setModelVersion(e.target.value)}
              placeholder="v0.4.x"
            />
          </label>
          <label className="full">
            Body
            <textarea
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
            />
          </label>
          <label className="full">
            Robustness checklist (all required to mark Robust)
            <div className="stack" style={{ marginTop: "0.5rem" }}>
              {(
                [
                  ["preserve", "Preserve original untouched results"],
                  ["dropTop", "Re-run after removing single highest-profit wager"],
                  ["dropExtreme", "Re-run after removing top 1% extreme edges/odds"],
                  ["flagDisagree", "Flag prices disagreeing with contemporaneous books"],
                  ["verifyClv", "Independently verify unusually large CLV/EV when possible"],
                  ["compareMetrics", "Compare ROI, CLV, Brier, log loss, calibration"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  style={{ display: "flex", gap: "0.5rem", color: "var(--text)" }}
                >
                  <input
                    type="checkbox"
                    checked={checks[key]}
                    onChange={(e) =>
                      setChecks((c) => ({ ...c, [key]: e.target.checked }))
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </label>
        </div>
        <div className="result-box">
          <button className="btn primary" disabled={pending} type="submit">
            Save research note
          </button>
          <p className="meta">
            Robust flag: {allChecked ? "eligible" : "blocked until checklist complete"}
          </p>
          {msg ? <p className="pos">{msg}</p> : null}
        </div>
      </form>

      <div className="panel">
        <div className="panel-head">
          <h2>Notes</h2>
        </div>
        {notes.length === 0 ? (
          <p className="empty">No research notes yet.</p>
        ) : (
          <ul className="empty" style={{ listStyle: "none", margin: 0 }}>
            {notes.map((n) => (
              <li key={n.id} style={{ marginBottom: "1rem" }}>
                <strong>{n.title}</strong>{" "}
                <span className={`badge ${n.robustFlag ? "play" : "unknown"}`}>
                  {n.robustFlag ? "Robust" : "Not robust"}
                </span>
                <div className="meta">
                  {n.modelVersion || "No version"} · {n.createdAt.slice(0, 19)}
                </div>
                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    color: "var(--muted)",
                    fontSize: "0.82rem",
                  }}
                >
                  {n.body}
                </pre>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
