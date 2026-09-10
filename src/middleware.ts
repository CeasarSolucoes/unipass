import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { HOME_BY_ROLE, canAccess, isPublicRoute, type UserRole } from "@/lib/roles";

/**
 * Renova a sessão do Supabase a cada request e aplica a guarda de rota.
 *
 * Importante: isto NÃO é o controle de acesso ao dado. O dado é protegido pela
 * RLS no Postgres (D32). O middleware só decide qual tela mostrar — se ele
 * falhar, o usuário chega numa tela sem dado, não numa tela com dado alheio.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Chave nova (sb_publishable_…) com precedência sobre a antiga (JWT anon).
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Sem Supabase configurado, deixa passar: o erro aparece na página, com
  // mensagem útil, em vez de um redirect infinito para /login.
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser() e não getSession(): só o primeiro valida o token no servidor.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user) {
    if (isPublicRoute(pathname)) return response;
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    redirect.searchParams.set("next", pathname);
    return NextResponse.redirect(redirect);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role as UserRole | undefined;

  // Usuário autenticado sem perfil é estado inconsistente (convite incompleto).
  // Manda completar o cadastro em vez de deixar navegar sem papel.
  if (!role) {
    if (pathname.startsWith("/convite") || pathname.startsWith("/auth")) return response;
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/convite/pendente";
    return NextResponse.redirect(redirect);
  }

  // Já logado em /login ou na raiz: vai direto para a casa do papel.
  if (pathname === "/login" || pathname === "/") {
    const redirect = request.nextUrl.clone();
    redirect.pathname = HOME_BY_ROLE[role];
    redirect.search = "";
    return NextResponse.redirect(redirect);
  }

  if (!canAccess(pathname, role)) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = HOME_BY_ROLE[role];
    redirect.search = "";
    return NextResponse.redirect(redirect);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Tudo, menos estáticos e imagens — o matcher precisa ser restritivo ou
     * o middleware roda em cada .svg e some com o orçamento de Edge.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
