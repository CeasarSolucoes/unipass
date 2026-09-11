import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Escolas" };

export default async function SchoolsPage() {
  await requireProfile(["super_admin"]);
  const supabase = await createClient();

  const { data: schools, error } = await supabase
    .from("schools")
    .select("id, name, slug, city, state, member_code_prefix, status, student_limit, network_id")
    .order("created_at", { ascending: false });

  const { data: networks } = await supabase.from("networks").select("id, name");
  const networkName = new Map((networks ?? []).map((n) => [n.id, n.name]));

  return (
    <>
      <PageHeader
        title="Escolas"
        description="Cada escola é um tenant isolado. Criar uma já cria o primeiro coordenador."
        action={
          <Button asChild>
            <Link href="/admin/escolas/nova">
              <Plus />
              Nova escola
            </Link>
          </Button>
        }
      />

      {error ? (
        <p className="text-denied text-sm">Não foi possível carregar: {error.message}</p>
      ) : (schools ?? []).length === 0 ? (
        <div className="border-border rounded-xl border border-dashed p-10 text-center">
          <p className="text-muted-foreground text-sm">Nenhuma escola cadastrada ainda.</p>
        </div>
      ) : (
        <div className="border-border overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Escola</th>
                <th className="px-4 py-3 font-medium">Cidade</th>
                <th className="px-4 py-3 font-medium">Código</th>
                <th className="px-4 py-3 font-medium">Rede</th>
                <th className="px-4 py-3 font-medium">Limite</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {(schools ?? []).map((school) => (
                <tr key={school.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{school.name}</p>
                    <p className="text-muted-foreground text-xs">{school.slug}</p>
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    {school.city ? `${school.city}${school.state ? `/${school.state}` : ""}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
                      {school.member_code_prefix}-XXXXX
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    {school.network_id ? (
                      <Badge tone="info">{networkName.get(school.network_id) ?? "Rede"}</Badge>
                    ) : (
                      // D02: escola independente não é caso de exceção, é o
                      // padrão de metade do mercado.
                      <span className="text-muted-foreground text-xs">Independente</span>
                    )}
                  </td>
                  <td className="text-muted-foreground px-4 py-3">{school.student_limit}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={school.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
