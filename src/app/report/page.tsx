import { createClient } from "@/lib/supabase/server";
import { ReportForm } from "./ReportForm";
import { LoginRequiredScreen } from "@/components/auth/LoginRequiredScreen";

export default async function ReportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <LoginRequiredScreen redirectTo="/report" message="登入後才能新增街貓回報" />;
  }

  return <ReportForm />;
}
