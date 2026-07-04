import { cookies } from "next/headers";
import { NEW_SESSION_COOKIE, validateNewAdminSession } from "@/lib/sessions";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const sid = cookieStore.get(NEW_SESSION_COOKIE)?.value;
  if (!sid || !(await validateNewAdminSession(sid))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const memberId = body?.memberId;
  if (!memberId || typeof memberId !== "string") {
    return Response.json({ error: "memberId required" }, { status: 400 });
  }

  const member = await db.member.findUnique({
    where: { id: memberId },
    select: { id: true, nameAmharic: true, nameEnglishFirst: true, pinAttempts: true, pinLockedUntil: true },
  });
  if (!member) {
    return Response.json({ error: "Member not found" }, { status: 404 });
  }

  await db.member.update({
    where: { id: memberId },
    data: { pinAttempts: 0, pinLockedUntil: null },
  });

  const displayName = `${member.nameAmharic} (${member.nameEnglishFirst})`;

  await db.auditLog.create({
    data: {
      action: `Admin unlocked PIN for ${displayName}`,
      entityType: "Member",
      entityId: memberId,
      before: { pinAttempts: member.pinAttempts, pinLockedUntil: member.pinLockedUntil },
      after: { pinAttempts: 0, pinLockedUntil: null },
    },
  });

  return Response.json({ success: true, memberName: displayName });
}
