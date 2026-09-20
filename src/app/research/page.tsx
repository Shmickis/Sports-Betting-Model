import { ResearchClient } from "@/components/ResearchClient";
import { listResearch } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default function ResearchPage() {
  const notes = listResearch();
  return (
    <>
      <h1 className="page-title">Model Research</h1>
      <p className="page-sub">
        Hypotheses, version notes, and robustness testing. Analytical exclusions
        never delete outliers from the permanent ledger.
      </p>
      <ResearchClient notes={notes} />
    </>
  );
}
