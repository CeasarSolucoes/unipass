/**
 * Tipos do schema público.
 *
 * Escritos à mão a partir das migrations, porque gerar com
 * `supabase gen types` exige um access token da CLI que ainda não temos.
 * Assim que houver, rode `npm run db:types` — o arquivo é sobrescrito inteiro
 * e passa a ser a fonte gerada. Até lá, ao alterar uma migration, altere aqui
 * também: tipo que mente é pior que tipo ausente.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

type E = Database["public"]["Enums"];

/**
 * `Auto` = colunas que o banco preenche (id, timestamps, member_code por
 * trigger). `Opt` = colunas com DEFAULT. Ambas são opcionais no Insert.
 */
type Table<R, Auto extends keyof R = never, Opt extends keyof R = never> = {
  Row: R;
  Insert: Omit<R, Auto | Opt> & Partial<Pick<R, Auto | Opt>>;
  Update: Partial<R>;
  Relationships: [];
};

type Stamps = "created_at" | "updated_at";

export type Database = {
  public: {
    Tables: {
      plans: Table<
        {
          id: string;
          name: string;
          max_students: number;
          monthly_price: number;
          features: Json;
          is_public: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        },
        Stamps,
        "features" | "is_public" | "sort_order"
      >;

      networks: Table<
        {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          status: E["school_status"];
          created_at: string;
          updated_at: string;
        },
        "id" | Stamps,
        "logo_url" | "status"
      >;

      schools: Table<
        {
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
          dependent_billing_cycle: E["billing_cycle"];
          value_capture_mode: E["value_capture_mode"];
          promo_approval_mode: E["promo_approval_mode"];
          monthly_promo_cap: number;
          weekly_push_cap: number;
          whatsapp_number: string | null;
          status: E["school_status"];
          created_at: string;
          updated_at: string;
        },
        "id" | Stamps,
        | "network_id"
        | "cnpj"
        | "city"
        | "state"
        | "logo_url"
        | "brand_color"
        | "student_limit"
        | "free_dependents"
        | "paid_slots"
        | "dependent_billing_cycle"
        | "value_capture_mode"
        | "promo_approval_mode"
        | "monthly_promo_cap"
        | "weekly_push_cap"
        | "whatsapp_number"
        | "status"
      >;

      profiles: Table<
        {
          id: string;
          role: E["user_role"];
          school_id: string | null;
          network_id: string | null;
          partner_id: string | null;
          full_name: string;
          cpf: string | null;
          email: string | null;
          phone: string | null;
          avatar_url: string | null;
          status: E["profile_status"];
          last_seen_at: string | null;
          created_at: string;
          updated_at: string;
        },
        Stamps,
        | "school_id"
        | "network_id"
        | "partner_id"
        | "cpf"
        | "email"
        | "phone"
        | "avatar_url"
        | "status"
        | "last_seen_at"
      >;

      members: Table<
        {
          id: string;
          school_id: string;
          kind: E["member_kind"];
          member_code: string;
          profile_id: string | null;
          full_name: string;
          cpf: string;
          birth_date: string;
          photo_url: string | null;
          photo_status: E["photo_status"];
          photo_rejection_reason: string | null;
          photo_reviewed_by: string | null;
          photo_reviewed_at: string | null;
          photo_updated_at: string | null;
          status: E["member_status"];
          valid_until: string | null;
          activated_at: string | null;
          created_at: string;
          updated_at: string;
        },
        // member_code é gerado por trigger — nunca é enviado pelo cliente.
        "id" | "member_code" | Stamps,
        | "profile_id"
        | "photo_url"
        | "photo_status"
        | "photo_rejection_reason"
        | "photo_reviewed_by"
        | "photo_reviewed_at"
        | "photo_updated_at"
        | "status"
        | "valid_until"
        | "activated_at"
      >;

      students: Table<
        {
          member_id: string;
          school_id: string;
          enrollment_code: string | null;
          course: string | null;
          class_group: string | null;
          source: E["record_source"];
          external_id: string | null;
          created_at: string;
          updated_at: string;
        },
        Stamps,
        "enrollment_code" | "course" | "class_group" | "source" | "external_id"
      >;

      dependent_slots: Table<
        {
          id: string;
          holder_member_id: string;
          school_id: string;
          slot_index: number;
          slot_type: E["slot_type"];
          cpf_locked_until: string | null;
          subscription_id: string | null;
          created_at: string;
          updated_at: string;
        },
        "id" | Stamps,
        "cpf_locked_until" | "subscription_id"
      >;

      dependents: Table<
        {
          member_id: string;
          slot_id: string;
          holder_member_id: string;
          school_id: string;
          relationship: E["relationship"];
          relationship_note: string | null;
          approval_status: E["approval_status"];
          approved_by: string | null;
          approved_at: string | null;
          rejection_reason: string | null;
          requested_at: string;
          created_at: string;
          updated_at: string;
        },
        Stamps,
        | "relationship_note"
        | "approval_status"
        | "approved_by"
        | "approved_at"
        | "rejection_reason"
        | "requested_at"
      >;

      partner_categories: Table<
        { id: string; name: string; icon: string | null; sort_order: number },
        never,
        "icon" | "sort_order"
      >;

      partners: Table<
        {
          id: string;
          legal_name: string;
          trade_name: string;
          cnpj: string | null;
          category_id: string | null;
          description: string | null;
          logo_url: string | null;
          cover_url: string | null;
          phone: string | null;
          whatsapp: string | null;
          instagram: string | null;
          website: string | null;
          avg_ticket: number | null;
          owner_profile_id: string | null;
          status: E["partner_status"];
          created_at: string;
          updated_at: string;
        },
        "id" | Stamps,
        | "cnpj"
        | "category_id"
        | "description"
        | "logo_url"
        | "cover_url"
        | "phone"
        | "whatsapp"
        | "instagram"
        | "website"
        | "avg_ticket"
        | "owner_profile_id"
        | "status"
      >;

      partner_locations: Table<
        {
          id: string;
          partner_id: string;
          label: string;
          address: string | null;
          city: string | null;
          state: string | null;
          postal_code: string | null;
          lat: number | null;
          lng: number | null;
          opening_hours: Json;
          is_primary: boolean;
          created_at: string;
          updated_at: string;
        },
        "id" | Stamps,
        | "address"
        | "city"
        | "state"
        | "postal_code"
        | "lat"
        | "lng"
        | "opening_hours"
        | "is_primary"
      >;

      partner_staff: Table<
        {
          id: string;
          partner_id: string;
          location_id: string | null;
          display_name: string;
          pin_hash: string;
          status: E["profile_status"];
          last_used_at: string | null;
          created_at: string;
          updated_at: string;
        },
        "id" | Stamps,
        "location_id" | "status" | "last_used_at"
      >;

      partnerships: Table<
        {
          id: string;
          school_id: string;
          partner_id: string;
          status: E["partnership_status"];
          invited_by: string | null;
          started_at: string | null;
          ended_at: string | null;
          created_at: string;
          updated_at: string;
        },
        "id" | Stamps,
        "status" | "invited_by" | "started_at" | "ended_at"
      >;

      benefits: Table<
        {
          id: string;
          partnership_id: string;
          title: string;
          description: string | null;
          terms: string | null;
          offer_type: E["offer_type"];
          discount_type: E["discount_type"];
          discount_value: number | null;
          limit_rule: E["limit_rule"];
          limit_qty: number;
          limit_scope: E["limit_scope"];
          cooldown_hours: number | null;
          valid_weekdays: number[];
          valid_from_time: string | null;
          valid_to_time: string | null;
          starts_at: string | null;
          ends_at: string | null;
          max_redemptions: number | null;
          redemptions_count: number;
          approval_status: E["approval_status"];
          status: E["partner_status"];
          created_by: string | null;
          created_at: string;
          updated_at: string;
        },
        "id" | Stamps,
        | "description"
        | "terms"
        | "offer_type"
        | "discount_value"
        | "limit_rule"
        | "limit_qty"
        | "limit_scope"
        | "cooldown_hours"
        | "valid_weekdays"
        | "valid_from_time"
        | "valid_to_time"
        | "starts_at"
        | "ends_at"
        | "max_redemptions"
        | "redemptions_count"
        | "approval_status"
        | "status"
        | "created_by"
      >;

      validations: Table<
        {
          id: string;
          school_id: string;
          partner_id: string;
          partner_location_id: string | null;
          benefit_id: string | null;
          member_id: string | null;
          member_kind: E["member_kind"] | null;
          validated_by: string;
          method: E["validation_method"];
          result: E["validation_result"];
          deny_reason: E["deny_reason"] | null;
          purchase_amount: number | null;
          discount_amount: number | null;
          saved_amount: number;
          value_mode: E["value_mode"];
          photo_confirmed: boolean;
          offline_validated: boolean;
          sync_status: E["sync_status"];
          synced_at: string | null;
          cancelled_by: string | null;
          cancelled_at: string | null;
          cancel_reason: string | null;
          created_at: string;
        },
        "id" | "created_at",
        | "partner_location_id"
        | "benefit_id"
        | "member_id"
        | "member_kind"
        | "deny_reason"
        | "purchase_amount"
        | "discount_amount"
        | "saved_amount"
        | "value_mode"
        | "photo_confirmed"
        | "offline_validated"
        | "sync_status"
        | "synced_at"
        | "cancelled_by"
        | "cancelled_at"
        | "cancel_reason"
      >;

      validation_attempts: Table<
        {
          id: string;
          partner_staff_id: string;
          partner_id: string;
          input_hash: string;
          method: E["validation_method"];
          found: boolean;
          ip: string | null;
          created_at: string;
        },
        "id" | "created_at",
        "ip"
      >;

      audit_logs: Table<
        {
          id: string;
          actor_id: string | null;
          actor_role: E["user_role"] | null;
          school_id: string | null;
          partner_id: string | null;
          action: string;
          entity: string;
          entity_id: string | null;
          before: Json | null;
          after: Json | null;
          justification: string | null;
          ip: string | null;
          user_agent: string | null;
          created_at: string;
        },
        "id" | "created_at",
        | "actor_id"
        | "actor_role"
        | "school_id"
        | "partner_id"
        | "entity_id"
        | "before"
        | "after"
        | "justification"
        | "ip"
        | "user_agent"
      >;

      import_jobs: Table<
        {
          id: string;
          school_id: string;
          filename: string;
          mode: E["import_mode"];
          status: E["import_status"];
          total: number;
          created: number;
          updated: number;
          suspended: number;
          failed: number;
          error_report: Json;
          created_by: string | null;
          started_at: string | null;
          finished_at: string | null;
          created_at: string;
          updated_at: string;
        },
        "id" | Stamps,
        | "mode"
        | "status"
        | "total"
        | "created"
        | "updated"
        | "suspended"
        | "failed"
        | "error_report"
        | "created_by"
        | "started_at"
        | "finished_at"
      >;

      change_requests: Table<
        {
          id: string;
          school_id: string;
          requester_id: string;
          target_member_id: string;
          entity: string;
          field: string;
          current_value: string | null;
          requested_value: string | null;
          status: E["change_request_status"];
          reviewed_by: string | null;
          reviewed_at: string | null;
          reason: string | null;
          created_at: string;
          updated_at: string;
        },
        "id" | Stamps,
        "current_value" | "requested_value" | "status" | "reviewed_by" | "reviewed_at" | "reason"
      >;

      consents: Table<
        {
          id: string;
          profile_id: string;
          school_id: string | null;
          doc_type: E["consent_doc"];
          doc_version: string;
          doc_hash: string;
          accepted_at: string;
          ip: string | null;
          user_agent: string | null;
        },
        "id" | "accepted_at",
        "school_id" | "ip" | "user_agent"
      >;

      subscriptions: Table<
        {
          id: string;
          kind: E["subscription_kind"];
          payer_profile_id: string | null;
          school_id: string | null;
          holder_member_id: string | null;
          gateway: string;
          gateway_customer_id: string | null;
          gateway_sub_id: string | null;
          amount: number;
          cycle: E["billing_cycle"];
          status: E["subscription_status"];
          trial_ends_at: string | null;
          current_period_end: string | null;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
        },
        "id" | Stamps,
        | "payer_profile_id"
        | "school_id"
        | "holder_member_id"
        | "gateway"
        | "gateway_customer_id"
        | "gateway_sub_id"
        | "status"
        | "trial_ends_at"
        | "current_period_end"
        | "cancelled_at"
      >;

      notifications: Table<
        {
          id: string;
          profile_id: string;
          school_id: string | null;
          kind: string;
          title: string;
          body: string | null;
          deep_link: string | null;
          is_push: boolean;
          read_at: string | null;
          sent_at: string | null;
          created_at: string;
        },
        "id" | "created_at",
        "school_id" | "body" | "deep_link" | "is_push" | "read_at" | "sent_at"
      >;

      push_subscriptions: Table<
        {
          id: string;
          profile_id: string;
          endpoint: string;
          keys: Json;
          device: string | null;
          created_at: string;
          last_used_at: string | null;
        },
        "id" | "created_at",
        "device" | "last_used_at"
      >;
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

/** Atalhos usados pelas telas. */
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Inserts<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type Enum<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T];
