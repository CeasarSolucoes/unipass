import { LogOut } from "lucide-react";
import { logout } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";
import type { SessionProfile } from "@/lib/auth";
import type { UserRole } from "@/lib/roles";

const ROLE_LABEL: Record<UserRole, string> = {
  super_admin: "Administrador da plataforma",
  network_admin: "Rede",
  school_admin: "Coordenação",
  school_staff: "Secretaria",
  student: "Aluno",
  dependent: "Dependente",
  partner_owner: "Parceiro",
  partner_staff: "Atendente",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts.at(0)?.charAt(0) ?? "";
  const last = parts.length > 1 ? (parts.at(-1)?.charAt(0) ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

export function UserMenu({ profile }: { profile: SessionProfile }) {
  return (
    <div className="flex items-center gap-3">
      <div
        aria-hidden
        className="bg-brand-50 text-brand-900 flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
      >
        {initials(profile.fullName)}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{profile.fullName}</p>
        <p className="text-muted-foreground truncate text-xs">{ROLE_LABEL[profile.role]}</p>
      </div>

      <form action={logout}>
        <Button type="submit" variant="ghost" size="icon" aria-label="Sair">
          <LogOut />
        </Button>
      </form>
    </div>
  );
}

export { ROLE_LABEL };
