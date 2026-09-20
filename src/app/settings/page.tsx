import { SettingsForm } from "@/components/SettingsForm";
import { ensureIntegrations, getSettings } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const s = getSettings();
  const integrations = ensureIntegrations();

  return (
    <>
      <h1 className="page-title">Settings</h1>
      <p className="page-sub">
        Desk configuration. Default unit is $10 = 1u. Changing unit size does not
        rewrite historical dollar stakes.
      </p>
      <SettingsForm
        initial={{
          unitUsd: s.unitUsd,
          timezone: s.timezone,
          bankrollUsd: s.bankrollUsd,
        }}
      />

      <div className="panel">
        <div className="panel-head">
          <h2>Data integrations</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Source</th>
                <th>Status</th>
                <th>Last success</th>
                <th>Last error</th>
                <th>Freshness</th>
              </tr>
            </thead>
            <tbody>
              {integrations.map((i) => (
                <tr key={i.id}>
                  <td>{i.name}</td>
                  <td className="amber">{i.status}</td>
                  <td>{i.lastSuccessAt || "Never"}</td>
                  <td>{i.lastError || "—"}</td>
                  <td className="meta">{i.freshnessNote}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="empty">
          Adapters are defined but disconnected. Manual workflows stay fully
          functional. Never claim live scanning while status is disconnected.
        </p>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Standing integrity rules</h2>
        </div>
        <ul className="empty">
          <li>Never invent missing odds, probabilities, results, or closes.</li>
          <li>Preserve original prospective classification.</li>
          <li>Keep Official separate from Independent / promo / paper.</li>
          <li>CLV stays Unconfirmed without a recorded close reference.</li>
          <li>This is decision-support — not a profit guarantee.</li>
        </ul>
      </div>
    </>
  );
}
