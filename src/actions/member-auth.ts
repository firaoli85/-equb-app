"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MEMBER_COOKIE } from "@/lib/member-session";

export async function memberSignOut(): Promise<void> {
  const jar = await cookies();
  jar.delete(MEMBER_COOKIE);
  redirect("/login");
}
