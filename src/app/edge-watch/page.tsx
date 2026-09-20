import { EdgeWatchClient } from "@/components/EdgeWatchClient";
import { listOpportunities } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default function EdgeWatchPage() {
  const rows = listOpportunities();

  return (
    <>
      <h1 className="page-title">Edge Watch</h1>
      <p className="page-sub">
        Operational board for markets under evaluation. Classification changes are
        logged with timestamps. No live scanning while Manual data mode is on.
      </p>
      <div className="warning">
        Manual data mode — not scanning live odds, injuries, lineups, or weather.
        Use manual entry or Bet Analyzer → Add to Edge Watch.
      </div>
      <EdgeWatchClient rows={rows} />
    </>
  );
}
