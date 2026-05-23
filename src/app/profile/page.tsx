import { createClient } from "@/lib/supabase/server";
import { ProfileClient } from "./ProfileClient";
import type { Profile } from "@/types/database";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    profile = data as Profile | null;
  }

  return <ProfileClient user={user} profile={profile} />;
}
