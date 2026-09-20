import { getSnapshot } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const encoder = new TextEncoder();
  let lastStamp = "";
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const push = () => {
        try {
          const snapshot = getSnapshot();
          const stamp = `${snapshot.model.updatedAt}|${snapshot.updates[0]?.id ?? ""}`;
          if (stamp !== lastStamp) {
            lastStamp = stamp;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(snapshot)}\n\n`),
            );
          } else {
            controller.enqueue(encoder.encode(`: ping\n\n`));
          }
        } catch {
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({ error: "stream failed" })}\n\n`,
            ),
          );
        }
      };
      push();
      intervalId = setInterval(push, 2500);
    },
    cancel() {
      if (intervalId) clearInterval(intervalId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
