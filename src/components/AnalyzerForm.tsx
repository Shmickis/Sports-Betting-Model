"use client";

import { useMemo, useState, useTransition } from "react";
import {
  breakEvenProb,
  classifyOpportunity,
  potentialPayout,
  potentialProfit,
  unitsFromStake,
  americanToDecimal,
  type UncertaintyFlags,
} from "@/lib/calcs";
import { fmtMoney, fmtPct } from "@/lib/utils";

export function AnalyzerForm({ unitUsd }: { unitUsd: number }) {
  const [pending, startTransition] = useTransition();
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    sport: "MLB",
    league: "MLB",
    event: "",
    eventTime: "",
    sportsbook: "FanDuel",
    marketType: "moneyline",
    selection: "",
    line: "",
    american: "-110",
    stake: "10",
    cashOrPromo: "cash",
    timing: "prematch",
    trueProb: "",
    probLow: "",
    probHigh: "",
    notes: "",
    injury: false,
    lineup: false,
    weather: false,
    workload: false,
    liquidity: false,
    dataQuality: false,
    edgeSurvives: true,
  });

  const analysis = useMemo(() => {
    const american = Number(form.american);
    const stake = Number(form.stake);
    const trueProb = form.trueProb === "" ? null : Number(form.trueProb);
    const probLow = form.probLow === "" ? null : Number(form.probLow);
    const probHigh = form.probHigh === "" ? null : Number(form.probHigh);

    if (!Number.isFinite(american) || !Number.isFinite(stake)) {
      return null;
    }

    const uncertainty: UncertaintyFlags = {
      injury: form.injury,
      lineup: form.lineup,
      weather: form.weather,
      workload: form.workload,
      liquidity: form.liquidity,
      dataQuality: form.dataQuality,
    };

    const decision = classifyOpportunity({
      trueProb,
      probLow,
      probHigh,
      american,
      uncertainty,
      edgeSurvivesUncertainty: form.edgeSurvives,
    });

    return {
      decimal: americanToDecimal(american),
      breakEven: breakEvenProb(american),
      profit: potentialProfit(stake, american),
      payout: potentialPayout(stake, american),
      units: unitsFromStake(stake, unitUsd),
      decision,
    };
  }, [form, unitUsd]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function save(kind: "research" | "edge" | "executed" | "pass") {
    startTransition(async () => {
      const res = await fetch("/api/analyzer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, form, analysis }),
      });
      const data = await res.json();
      setSavedMsg(data.message || (res.ok ? "Saved" : "Save failed"));
    });
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Evaluate a proposed wager</h2>
      </div>
      <div className="form-grid">
        <label>
          Sport
          <input value={form.sport} onChange={(e) => set("sport", e.target.value)} />
        </label>
        <label>
          League
          <input value={form.league} onChange={(e) => set("league", e.target.value)} />
        </label>
        <label className="full">
          Event
          <input
            value={form.event}
            onChange={(e) => set("event", e.target.value)}
            placeholder="Away @ Home"
          />
        </label>
        <label>
          Event date/time
          <input
            type="datetime-local"
            value={form.eventTime}
            onChange={(e) => set("eventTime", e.target.value)}
          />
        </label>
        <label>
          Sportsbook
          <input
            value={form.sportsbook}
            onChange={(e) => set("sportsbook", e.target.value)}
          />
        </label>
        <label>
          Market type
          <input
            value={form.marketType}
            onChange={(e) => set("marketType", e.target.value)}
          />
        </label>
        <label>
          Selection
          <input
            value={form.selection}
            onChange={(e) => set("selection", e.target.value)}
            placeholder="Side / player / total"
          />
        </label>
        <label>
          Exact line
          <input value={form.line} onChange={(e) => set("line", e.target.value)} />
        </label>
        <label>
          American odds
          <input
            value={form.american}
            onChange={(e) => set("american", e.target.value)}
          />
        </label>
        <label>
          Stake ($)
          <input value={form.stake} onChange={(e) => set("stake", e.target.value)} />
        </label>
        <label>
          Cash or promotion
          <select
            value={form.cashOrPromo}
            onChange={(e) => set("cashOrPromo", e.target.value)}
          >
            <option value="cash">Cash</option>
            <option value="bonus">Bonus bet</option>
            <option value="freebet">Free bet</option>
            <option value="boost">Profit boost</option>
          </select>
        </label>
        <label>
          Prematch / live
          <select
            value={form.timing}
            onChange={(e) => set("timing", e.target.value)}
          >
            <option value="prematch">Prematch</option>
            <option value="live">Live</option>
          </select>
        </label>
        <label>
          TrueLine probability (0–1)
          <input
            value={form.trueProb}
            onChange={(e) => set("trueProb", e.target.value)}
            placeholder="Leave blank if unknown"
          />
        </label>
        <label>
          Prob range low
          <input
            value={form.probLow}
            onChange={(e) => set("probLow", e.target.value)}
            placeholder="Optional"
          />
        </label>
        <label>
          Prob range high
          <input
            value={form.probHigh}
            onChange={(e) => set("probHigh", e.target.value)}
            placeholder="Optional"
          />
        </label>
        <label className="full">
          Notes
          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </label>
        <label className="full">
          Uncertainty flags
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            {(
              [
                ["injury", "Injury"],
                ["lineup", "Lineup"],
                ["weather", "Weather"],
                ["workload", "Workload"],
                ["liquidity", "Liquidity"],
                ["dataQuality", "Data quality"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} style={{ display: "flex", gap: "0.35rem", color: "var(--text)" }}>
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) => set(key, e.target.checked)}
                />
                {label}
              </label>
            ))}
            <label style={{ display: "flex", gap: "0.35rem", color: "var(--text)" }}>
              <input
                type="checkbox"
                checked={form.edgeSurvives}
                onChange={(e) => set("edgeSurvives", e.target.checked)}
              />
              Edge survives uncertainty
            </label>
          </div>
        </label>
      </div>

      <div className="result-box">
        {!analysis ? (
          <p className="amber">Enter valid odds and stake to analyze.</p>
        ) : (
          <div className="stack">
            <p>
              <strong>Classification: </strong>
              <span className="badge lean">{analysis.decision.classification}</span>
            </p>
            <p>
              Break-even {fmtPct(analysis.breakEven)} · Decimal{" "}
              {analysis.decimal.toFixed(3)} · Units {analysis.units.toFixed(2)}u
            </p>
            <p>
              Potential profit {fmtMoney(analysis.profit)} · Payout{" "}
              {fmtMoney(analysis.payout, false)}
            </p>
            <p>
              Edge:{" "}
              {analysis.decision.edge == null
                ? "Not recorded"
                : fmtPct(analysis.decision.edge)}
              {analysis.decision.edgeRange
                ? ` (range ${fmtPct(analysis.decision.edgeRange.low)} to ${fmtPct(analysis.decision.edgeRange.high)})`
                : ""}
            </p>
            <ul>
              {analysis.decision.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <p className="meta">
              Official Play Gate requires probability, executable odds/timestamp,
              explicit edge, uncertainty review, and playable price. External model
              probs are inputs — never auto-promoted to TrueLine.
            </p>
            <div>
              <button className="btn row" disabled={pending} onClick={() => save("research")}>
                Save as research
              </button>
              <button className="btn row" disabled={pending} onClick={() => save("edge")}>
                Add to Edge Watch
              </button>
              <button className="btn row primary" disabled={pending} onClick={() => save("executed")}>
                Record executed bet
              </button>
              <button className="btn row" disabled={pending} onClick={() => save("pass")}>
                Mark as PASS
              </button>
            </div>
            {savedMsg ? <p className="pos">{savedMsg}</p> : null}
          </div>
        )}
      </div>
    </div>
  );
}
