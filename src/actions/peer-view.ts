"use server";

import { db } from "@/lib/db";

/**
 * Logs that the member identified by viewerToken viewed another member's
 * payment standing. The viewer is resolved server-side from the token so
 * the client cannot spoof the viewer identity.
 */
export async function logPeerView(
  viewerToken: string,
  viewedMemberId: string
): Promise<void> {
  const viewer = await db.member.findUnique({
    where: { token: viewerToken },
    select: { id: true },
  });
  if (!viewer) return; // token didn't resolve — no-op

  await db.auditLog.create({
    data: {
      action: `Peer standing viewed (viewer: ${viewer.id})`,
      entityType: "Member",
      entityId: viewedMemberId,
      after: { viewedAt: new Date().toISOString(), viewerId: viewer.id },
    },
  });
}
