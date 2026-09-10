"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/profile";
import { disconnectGoogle, runBackup } from "@/lib/backup";

export async function backupNow() {
  const profile = await getProfile();
  if (!profile || profile.role !== "coach") redirect("/login");
  const result = await runBackup();
  revalidatePath("/settings");
  redirect(`/settings?backup=${result.ok ? "done" : "failed"}`);
}

export async function disconnectBackup() {
  const profile = await getProfile();
  if (!profile || profile.role !== "coach") redirect("/login");
  await disconnectGoogle();
  revalidatePath("/settings");
  redirect("/settings?backup=disconnected");
}
