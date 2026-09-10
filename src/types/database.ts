/**
 * ⚠️ PLACEHOLDER — substituído por `npm run db:types` assim que o projeto
 * Supabase estiver criado.
 *
 * Contém hoje só os enums (que são estáveis e vêm das migrations 000) e as
 * tabelas usadas no Dia 1. Ao rodar `db:types`, este arquivo é sobrescrito
 * inteiro pelo schema real — não adicione lógica aqui.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["user_role"];
          school_id: string | null;
          network_id: string | null;
          partner_id: string | null;
          full_name: string;
          cpf: string | null;
          email: string | null;
          phone: string | null;
          avatar_url: string | null;
          status: Database["public"]["Enums"]["profile_status"];
          last_seen_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role: Database["public"]["Enums"]["user_role"];
          school_id?: string | null;
          network_id?: string | null;
          partner_id?: string | null;
          full_name: string;
          cpf?: string | null;
          email?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          status?: Database["public"]["Enums"]["profile_status"];
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      schools: {
        Row: {
          id: string;
          network_id: string | null;
          name: string;
          slug: string;
          cnpj: string | null;
          city: string | null;
          state: string | null;
          logo_url: string | null;
          brand_color: string;
          member_code_prefix: string;
          plan_id: string;
          student_limit: number;
          free_dependents: number;
          paid_slots: number;
          dependent_billing_cycle: Database["public"]["Enums"]["billing_cycle"];
          value_capture_mode: Database["public"]["Enums"]["value_capture_mode"];
          promo_approval_mode: Database["public"]["Enums"]["promo_approval_mode"];
          monthly_promo_cap: number;
          weekly_push_cap: number;
          whatsapp_number: string | null;
          status: Database["public"]["Enums"]["school_status"];
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["schools"]["Row"],
          "id" | "created_at" | "updated_at"
        > & { id?: string };
        Update: Partial<Database["public"]["Tables"]["schools"]["Insert"]>;
        Relationships: [];
      };
      members: {
        Row: {
          id: string;
          school_id: string;
          kind: Database["public"]["Enums"]["member_kind"];
          member_code: string;
          profile_id: string | null;
          full_name: string;
          cpf: string;
          birth_date: string;
          photo_url: string | null;
          photo_status: Database["public"]["Enums"]["photo_status"];
          photo_rejection_reason: string | null;
          photo_reviewed_by: string | null;
          photo_reviewed_at: string | null;
          photo_updated_at: string | null;
          status: Database["public"]["Enums"]["member_status"];
          valid_until: string | null;
          activated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["members"]["Row"],
          "id" | "member_code" | "created_at" | "updated_at"
        > & { id?: string; member_code?: string };
        Update: Partial<Database["public"]["Tables"]["members"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role:
        | "super_admin"
        | "network_admin"
        | "school_admin"
        | "school_staff"
        | "student"
        | "dependent"
        | "partner_owner"
        | "partner_staff";
      school_status: "trial" | "active" | "suspended" | "cancelled";
      member_kind: "student" | "dependent";
      member_status: "active" | "suspended" | "cancelled" | "graduated";
      photo_status: "pending" | "approved" | "rejected";
      approval_status: "pending" | "approved" | "rejected";
      profile_status: "invited" | "active" | "suspended";
      record_source: "manual" | "import" | "api";
      slot_type: "free" | "paid";
      relationship:
        | "conjuge"
        | "companheiro"
        | "filho"
        | "enteado"
        | "pai"
        | "mae"
        | "irmao"
        | "avo"
        | "neto"
        | "bisavo"
        | "tio"
        | "sobrinho"
        | "primo"
        | "padrasto"
        | "meio_irmao"
        | "sogro"
        | "genro_nora"
        | "cunhado"
        | "padrinho"
        | "afilhado"
        | "filho_adotivo"
        | "tutelado"
        | "curatelado"
        | "amigo"
        | "colega_republica"
        | "outro";
      partner_status: "pending" | "active" | "paused" | "blocked";
      partnership_status: "pending" | "active" | "paused" | "ended";
      offer_type:
        | "permanente"
        | "relampago"
        | "evento"
        | "estoque_limitado"
        | "aniversario"
        | "primeira_visita"
        | "reconquista"
        | "horario_morto"
        | "progressiva";
      discount_type: "percent" | "fixed" | "gift" | "combo";
      limit_rule:
        | "unlimited"
        | "per_day"
        | "per_week"
        | "per_month"
        | "per_semester"
        | "per_year"
        | "once_ever"
        | "cooldown"
        | "total_pool";
      limit_scope: "member" | "family";
      validation_method: "cpf" | "member_code";
      validation_result: "approved" | "denied" | "cancelled" | "offline_invalidated";
      deny_reason:
        | "nao_encontrado"
        | "foto_pendente"
        | "aluno_suspenso"
        | "matricula_cancelada"
        | "dependente_nao_aprovado"
        | "carteirinha_vencida"
        | "escola_inativa"
        | "parceria_encerrada"
        | "fora_do_horario"
        | "promocao_encerrada"
        | "limite_atingido"
        | "esgotado"
        | "rate_limit";
      sync_status: "synced" | "pending" | "failed";
      value_capture_mode: "estimated" | "real" | "partner_choice";
      value_mode: "estimated" | "real";
      promo_approval_mode: "auto" | "manual";
      import_mode: "upsert" | "full_sync";
      import_status: "pending" | "processing" | "completed" | "failed";
      change_request_status: "pending" | "approved" | "rejected";
      subscription_kind: "school_plan" | "dependent_pack";
      subscription_status: "trialing" | "active" | "past_due" | "canceled";
      billing_cycle: "monthly" | "semester" | "yearly";
      consent_doc:
        | "termos_uso"
        | "privacidade"
        | "termo_aluno"
        | "termo_responsavel"
        | "ciencia_dependente_pago"
        | "contrato_escola"
        | "termo_parceiro";
    };
    CompositeTypes: Record<string, never>;
  };
};
