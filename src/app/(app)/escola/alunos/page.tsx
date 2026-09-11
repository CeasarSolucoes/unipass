import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page";
import { requireProfile } from "@/lib/auth";
import { formatCpf, onlyDigits } from "@/lib/cpf";
import { createClient } from "@/lib/supabase/server";
import { InviteButton } from "./invite-button";

export const metadata: Metadata = { title: "Alunos" };

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const profile = await requireProfile(["school_admin", "school_staff"]);
  const { q } = await searchParams;
  const supabase = await createClient();

  const { data: school } = await supabase
    .from("schools")
    .select("name, student_limit")
    .eq("id", profile.schoolId ?? "")
    .maybeSingle();

  let query = supabase
    .from("members")
    .select("id, member_code, full_name, cpf, email, phone, status, photo_status, profile_id")
    .eq("kind", "student")
    .order("full_name");

  if (q?.trim()) {
    const term = q.trim();
    const digits = onlyDigits(term);
    // Busca por CPF só com o número completo: busca parcial por CPF é o começo
    // de uma varredura da base, e a escola nunca precisa disso.
    query =
      digits.length === 11
        ? query.eq("cpf", digits)
        : query.or(`full_name.ilike.%${term}%,member_code.ilike.%${term}%`);
  }

  const { data: students, error } = await query;
  const rows = students ?? [];

  return (
    <>
      <PageHeader
        title="Alunos"
        description={
          school
            ? `${school.name} — ${rows.length} de até ${school.student_limit} alunos.`
            : undefined
        }
        action={
          <Button asChild>
            <Link href="/escola/alunos/novo">
              <Plus />
              Novo aluno
            </Link>
          </Button>
        }
      />

      <form className="mb-6 flex max-w-md gap-2">
        <Input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Nome, código ou CPF completo"
          aria-label="Buscar aluno"
        />
        <Button type="submit" variant="outline" size="icon" aria-label="Buscar">
          <Search />
        </Button>
      </form>

      {error ? (
        <p className="text-denied text-sm">Não foi possível carregar: {error.message}</p>
      ) : rows.length === 0 ? (
        <div className="border-border rounded-xl border border-dashed p-10 text-center">
          <p className="text-muted-foreground text-sm">
            {q ? "Nenhum aluno encontrado para esta busca." : "Nenhum aluno cadastrado ainda."}
          </p>
        </div>
      ) : (
        <div className="border-border overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Aluno</th>
                <th className="px-4 py-3 font-medium">Código</th>
                <th className="px-4 py-3 font-medium">CPF</th>
                <th className="px-4 py-3 font-medium">Foto</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Acesso</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y align-top">
              {rows.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{s.full_name}</p>
                    <p className="text-muted-foreground text-xs">{s.email ?? "sem e-mail"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                      {s.member_code}
                    </code>
                  </td>
                  {/* A escola vê o CPF completo; o parceiro nunca vê (D39). */}
                  <td className="text-muted-foreground px-4 py-3 whitespace-nowrap">
                    {formatCpf(s.cpf)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={s.photo_status} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-4 py-3">
                    {s.profile_id ? (
                      <Badge tone="success">Tem acesso</Badge>
                    ) : (
                      <InviteButton
                        memberId={s.id}
                        memberName={s.full_name}
                        email={s.email}
                        phone={s.phone}
                        schoolName={school?.name ?? "sua escola"}
                      />
                    )}
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
