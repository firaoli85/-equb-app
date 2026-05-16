export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { validateSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { ensureWeeksExist } from "@/lib/equb";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token || !(await validateSessionToken(token))) {
    redirect("/admin/login");
  }

  await ensureWeeksExist();

  return (
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-[#0a0a0b]">
      <AdminNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
