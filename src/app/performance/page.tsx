import { listWagers } from "@/lib/queries";
import { roi } from "@/lib/calcs";
import { fmtMoney, fmtRoi } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function PerformancePage() {
  const all = listWagers();
  const bySport = new Map<string, { n: number; pnl: number; risked: number; w: number; l: number }>();

  for (const w of all) {
    if (w.result !== "win" && w.result !== "loss") continue;
    const key = w.sport || "Unknown";
    const cur = bySport.get(key) || { n: 0, pnl: 0, risked: 0, w: 0, l: 0 };
    cur.n += 1;
    cur.pnl += w.pnlUsd ?? 0;
    cur.risked += w.stakeUsd;
    if (w.result === "win") cur.w += 1;
    else cur.l += 1;
    bySport.set(key, cur);
  }

  return (
    <>
      <h1 className="page-title">Performance</h1>
      <p className="page-sub">
        Sample-size aware breakdowns. Small samples are labeled — never presented
        as proven edge.
      </p>
      <div className="panel">
        <div className="panel-head">
          <h2>By sport</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Sport</th>
                <th>Record</th>
                <th>N</th>
                <th>Risked</th>
                <th>P/L</th>
                <th>ROI</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {[...bySport.entries()].map(([sport, s]) => {
                const r = roi(s.pnl, s.risked);
                return (
                  <tr key={sport}>
                    <td>{sport}</td>
                    <td>
                      {s.w}-{s.l}
                    </td>
                    <td>{s.n}</td>
                    <td>{fmtMoney(s.risked, false)}</td>
                    <td className={s.pnl >= 0 ? "pos" : "neg"}>{fmtMoney(s.pnl)}</td>
                    <td>{fmtRoi(r)}</td>
                    <td className="amber">
                      {s.n < 30 ? "Sample too small" : "Maturing"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
