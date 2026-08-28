import "server-only";

export class SupabaseConfigurationError extends Error {}

function getConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new SupabaseConfigurationError(
      "Supabase não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente do servidor."
    );
  }
  return { url, key };
}

function baseHeaders(extra?: HeadersInit): Headers {
  const { key } = getConfig();
  const headers = new Headers(extra);
  headers.set("Authorization", `Bearer ${key}`);
  headers.set("apikey", key);
  return headers;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase ${response.status}: ${body || response.statusText}`);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function supabaseSelect<T>(table: string, query: URLSearchParams): Promise<T> {
  const { url } = getConfig();
  const response = await fetch(`${url}/rest/v1/${table}?${query.toString()}`, {
    headers: baseHeaders(),
    cache: "no-store",
  });
  return parseResponse<T>(response);
}

export async function supabaseInsert<T>(table: string, payload: unknown): Promise<T> {
  const { url } = getConfig();
  const response = await fetch(`${url}/rest/v1/${table}`, {
    method: "POST",
    headers: baseHeaders({ "Content-Type": "application/json", Prefer: "return=representation" }),
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  return parseResponse<T>(response);
}

export async function supabaseUpsert<T>(
  table: string,
  payload: unknown,
  onConflict: string
): Promise<T> {
  const { url } = getConfig();
  const query = new URLSearchParams({ on_conflict: onConflict });
  const response = await fetch(`${url}/rest/v1/${table}?${query.toString()}`, {
    method: "POST",
    headers: baseHeaders({
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    }),
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  return parseResponse<T>(response);
}

export async function supabasePatch<T>(table: string, filter: URLSearchParams, payload: unknown): Promise<T> {
  const { url } = getConfig();
  const response = await fetch(`${url}/rest/v1/${table}?${filter.toString()}`, {
    method: "PATCH",
    headers: baseHeaders({ "Content-Type": "application/json", Prefer: "return=representation" }),
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  return parseResponse<T>(response);
}

export async function supabaseRpc<T>(functionName: string, payload: Record<string, unknown>): Promise<T> {
  const { url } = getConfig();
  const response = await fetch(`${url}/rest/v1/rpc/${encodeURIComponent(functionName)}`, {
    method: "POST",
    headers: baseHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  return parseResponse<T>(response);
}

export async function supabaseInvokeFunction<T>(
  functionName: string,
  payload: Record<string, unknown>
): Promise<T> {
  const { url } = getConfig();
  const response = await fetch(`${url}/functions/v1/${encodeURIComponent(functionName)}`, {
    method: "POST",
    headers: baseHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  return parseResponse<T>(response);
}

export async function supabaseStorageUpload(
  bucket: string,
  objectPath: string,
  body: Buffer,
  mimeType: string
): Promise<void> {
  const { url } = getConfig();
  const uploadBody = new Uint8Array(body.byteLength);
  uploadBody.set(body);
  const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`${url}/storage/v1/object/${encodeURIComponent(bucket)}/${encodedPath}`, {
    method: "POST",
    headers: baseHeaders({ "Content-Type": mimeType, "x-upsert": "false" }),
    body: uploadBody,
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Falha ao armazenar arquivo (${response.status}): ${text}`);
  }
}
