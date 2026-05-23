import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReportForm } from "./ReportForm";

export default async function ReportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return <ReportForm />;
}
