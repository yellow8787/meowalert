import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { UpdateForm } from "./UpdateForm";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}

export default async function UpdatePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { type } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/cat/${id}`);
  }

  const updateType: "moved" | "spotted" = type === "moved" ? "moved" : "spotted";

  return <UpdateForm catId={id} updateType={updateType} />;
}
