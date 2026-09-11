import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SchoolForm } from "./school-form";

export const metadata: Metadata = { title: "Nova escola" };

export default async function NewSchoolPage() {
  await requireProfile(["super_admin"]);
  const supabase = await createClient();

  const [{ data: plans }, { data: networks }] = await Promise.all([
    supabase.from("plans").select("id, name").order("sort_order"),
    supabase.from("networks").select("id, name").order("name"),
  ]);

  return (
    <>
      <PageHeader
        title="Nova escola"
        description="A escola e o primeiro coordenador nascem juntos, numa operação só."
      />
      <SchoolForm plans={plans ?? []} networks={networks ?? []} />
    </>
  );
}
