import { redirect } from "next/navigation";
import { getProfile, type Profile } from "./profile";

/** Coach-only pages and actions: redirects clients home and signed-out users to login. */
export async function requireCoach(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "coach") redirect("/");
  return profile;
}
