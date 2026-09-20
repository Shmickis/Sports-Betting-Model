import { BriefsClient } from "@/components/BriefsClient";
import { listBriefs } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default function BriefsPage() {
  const briefs = listBriefs();
  return (
    <>
      <h1 className="page-title">Daily Briefs</h1>
      <p className="page-sub">
        Morning, Afternoon, and Nightly desk notes. Manual creation only until
        real data integrations are connected.
      </p>
      <BriefsClient initial={briefs} />
    </>
  );
}
