const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function readKeyObject(name: string): Record<string, string> {
  try {
    return JSON.parse(Deno.env.get(name) || "{}");
  } catch {
    return {};
  }
}

function keyHeaders(key: string) {
  const headers: Record<string, string> = {
    apikey: key,
    Accept: "application/json",
  };
  // Legacy JWT keys require Authorization. New sb_* keys must be sent only as apikey.
  if (!key.startsWith("sb_")) headers.Authorization = `Bearer ${key}`;
  return headers;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Método no permitido." }, 405);

  try {
    const body = await req.json();
    const username = String(body?.username || "").trim().toLowerCase();
    const password = String(body?.password || "");

    if (!/^[a-z0-9_]{3,20}$/.test(username) || !password) {
      return jsonResponse({ error: "Nombre de usuario o contraseña incorrectos." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
    const secretKeys = readKeyObject("SUPABASE_SECRET_KEYS");
    const publishableKeys = readKeyObject("SUPABASE_PUBLISHABLE_KEYS");
    const adminKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || secretKeys.default;
    const publicKey = Deno.env.get("SUPABASE_ANON_KEY") || publishableKeys.default;

    if (!supabaseUrl || !adminKey || !publicKey) {
      console.error("Faltan variables de entorno requeridas para username-login.");
      return jsonResponse({ error: "El inicio de sesión no está disponible por el momento." }, 500);
    }

    // Resolve only the internal user ID. The account email never leaves this function.
    const profileUrl = new URL(`${supabaseUrl}/rest/v1/perfiles`);
    profileUrl.searchParams.set("select", "user_id");
    profileUrl.searchParams.set("username", `eq.${username}`);
    profileUrl.searchParams.set("limit", "1");

    const profileResponse = await fetch(profileUrl, {
      headers: keyHeaders(adminKey),
    });
    if (!profileResponse.ok) {
      console.error("Error al buscar el perfil:", profileResponse.status);
      return jsonResponse({ error: "No se pudo validar el acceso." }, 500);
    }

    const profiles = await profileResponse.json();
    const userId = profiles?.[0]?.user_id;
    if (!userId) return jsonResponse({ error: "Nombre de usuario o contraseña incorrectos." }, 401);

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      headers: keyHeaders(adminKey),
    });
    if (!userResponse.ok) {
      console.error("Error al consultar el usuario de Auth:", userResponse.status);
      return jsonResponse({ error: "No se pudo validar el acceso." }, 500);
    }

    const userPayload = await userResponse.json();
    const email = userPayload?.email;
    if (!email) return jsonResponse({ error: "Nombre de usuario o contraseña incorrectos." }, 401);

    const tokenResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        ...keyHeaders(publicKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!tokenResponse.ok) {
      return jsonResponse({ error: "Nombre de usuario o contraseña incorrectos." }, 401);
    }

    const session = await tokenResponse.json();
    if (!session?.access_token || !session?.refresh_token) {
      return jsonResponse({ error: "No se pudo iniciar sesión." }, 401);
    }

    // Return only the session tokens; do not return the account email.
    return jsonResponse({
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      },
    });
  } catch {
    return jsonResponse({ error: "No se pudo procesar el inicio de sesión." }, 400);
  }
});
