"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [accessKey, setAccessKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessKey.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessKey }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Acesso negado.");
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Acesso negado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy px-4 py-10">
      <section className="w-full max-w-sm rounded-3xl border border-graphite/50 bg-navy-900 p-6 shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-gold-institution/30 bg-gold-institution/10 text-sm font-black text-gold-institution">CFS</div>
        <p className="mt-5 text-center text-xs font-black uppercase tracking-[0.2em] text-gold-institution">Acesso pessoal</p>
        <h1 className="mt-2 text-center text-2xl font-black text-text-primary">CFS Tutor</h1>
        <p className="mt-2 text-center text-sm leading-relaxed text-text-secondary">Informe sua chave pessoal para acessar o ambiente de estudos.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-xs font-bold text-text-secondary">
            Chave de acesso
            <input
              type="password"
              value={accessKey}
              onChange={(event) => setAccessKey(event.target.value)}
              autoComplete="current-password"
              autoFocus
              className="mt-2 min-h-12 w-full rounded-xl border border-graphite/50 bg-navy-950 px-4 text-base text-text-primary outline-none focus:border-electric-blue"
              aria-describedby={error ? "access-error" : undefined}
            />
          </label>
          {error && <p id="access-error" className="rounded-xl border border-alert-red/30 bg-alert-red/5 p-3 text-sm text-alert-red">{error}</p>}
          <button type="submit" disabled={loading || !accessKey.trim()} className="min-h-12 w-full rounded-xl bg-electric-blue px-5 text-sm font-black text-white disabled:opacity-40">{loading ? "Validando..." : "Entrar"}</button>
        </form>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-text-muted">A sessão fica armazenada somente em cookie HttpOnly. A chave não é salva no navegador pelo aplicativo.</p>
      </section>
    </main>
  );
}
