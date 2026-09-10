import { getStore } from "@/lib/store";
import { getConfig } from "@/lib/config";
import { ok, fail } from "@/lib/api";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  // Not z.enum(BEAD_STATUSES): projects can define custom statuses via
  // `bd config set status.custom`; `bd update -s <status>` rejects anything
  // neither built-in nor project-configured, so that's the real gate.
  status: z.string().min(1),
  /** Optional close reason; ignored for every status other than `closed`. */
  reason: z.string().max(10_000).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ projectId: string; id: string }> }) {
  try {
    const { projectId, id } = await params;
    const store = await getStore(projectId);
    const cfg = getConfig();
    const { status, reason } = bodySchema.parse(await req.json());
    const bead = await store.setStatus(id, status, cfg.humanActor, reason);
    return ok(bead);
  } catch (e) {
    return fail(e);
  }
}
