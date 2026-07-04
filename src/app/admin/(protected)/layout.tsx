export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NEW_SESSION_COOKIE, validateNewAdminSession } from "@/lib/sessions";
import { ensureWeeksExist } from "@/lib/equb";
import { AdminNav } from "@/components/admin/AdminNav";
import { db } from "@/lib/db";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();

  const newSid = cookieStore.get(NEW_SESSION_COOKIE)?.value;
  if (!newSid || !(await validateNewAdminSession(newSid))) redirect("/admin/login");

  await ensureWeeksExist();

  const pendingReviews = await db.paymentReviewRequest.count({
    where: { status: "PENDING" },
  });

  return (
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-[#0a0a0b]">
      <AdminNav pendingReviews={pendingReviews} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
