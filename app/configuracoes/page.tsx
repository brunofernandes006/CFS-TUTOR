"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  SectionHeader,
  TacticalPanel,
  TacticalButton,
  AlertPanel,
  LoadingState,
} from "@/components/ui";
import { useSettings } from "@/hooks/useSettings";

const DISCIPLINES = ["Todas", "Português", "Matemática", "Profissionais"];

export default function ConfiguracoesPage() {
  const { settings, loaded, update } = useSettings();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!loaded) return <LoadingState message="Carregando configurações..." />;

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = async () => {
    if (resetStep === 0) {
      setResetStep(1);
      return;
    }
    if (resetStep === 1) {
      setResetStep(2);
      return;
    }
    setResetLoading(true);
    try {
      const res = await fetch("/api/settings/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setResetMsg({ type: "success", text: data.message });
      } else {
        setResetMsg({ type: "error", text: data.error || "Erro ao resetar." });
      }
    } catch {
      setResetMsg({ type: "error", text: "Erro de conexão." });
    } finally {
      setResetLoading(false);
      setResetStep(0);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="⚙️ Configurações"
        subtitle="Personalize sua experiência de estudo"
      />

      <div className="max-w-2xl mx-auto w-full space-y-6">
        {saved && (
          <AlertPanel
            type="success"
            title="Salvo"
            message="Configurações atualizadas."
            closeable
            onClose={() => setSaved(false)}
          />
        )}

        {resetMsg && (
          <AlertPanel
            type={resetMsg.type}
            title={resetMsg.type === "success" ? "Concluído" : "Erro"}
            message={resetMsg.text}
            closeable
            onClose={() => setResetMsg(null)}
          />
        )}

        {/* Aluno */}
        <TacticalPanel title="👤 Aluno">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold uppercase text-gold-institution block mb-2">
                Nome do aluno
              </label>
              <input
                type="text"
                value={settings.student_name}
                onChange={(e) => update({ student_name: e.target.value })}
                placeholder="Seu nome"
                className="w-full px-3 py-2 rounded bg-navy-900 border border-graphite text-text-primary text-sm focus:border-gold-institution focus:outline-none"
              />
            </div>
          </div>
        </TacticalPanel>

        {/* Meta de estudo */}
        <TacticalPanel title="🎯 Meta de Estudo">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold uppercase text-electric-blue block mb-2">
                Tempo diário: {settings.daily_goal_minutes} min
              </label>
              <input
                type="range"
                min="15"
                max="180"
                step="15"
                value={settings.daily_goal_minutes}
                onChange={(e) => update({ daily_goal_minutes: parseInt(e.target.value) })}
                className="w-full cursor-pointer"
              />
              <p className="text-xs text-text-muted mt-1">Meta diária de estudo.</p>
            </div>
            <div>
              <label className="text-sm font-bold uppercase text-electric-blue block mb-2">
                Duração sugerida da sessão: {settings.session_duration} min
              </label>
              <input
                type="range"
                min="15"
                max="120"
                step="15"
                value={settings.session_duration}
                onChange={(e) => update({ session_duration: parseInt(e.target.value) })}
                className="w-full cursor-pointer"
              />
            </div>
          </div>
        </TacticalPanel>

        {/* Disciplina foco */}
        <TacticalPanel title="📚 Disciplina Foco">
          <div className="flex flex-wrap gap-2">
            {DISCIPLINES.map((d) => (
              <button
                key={d}
                onClick={() => update({ focus_discipline: d })}
                className={`px-4 py-2 rounded text-sm font-bold uppercase border transition-colors ${
                  settings.focus_discipline === d
                    ? "bg-gold-institution/20 text-gold-institution border-gold-institution"
                    : "bg-navy-900 text-text-secondary border-graphite hover:border-text-muted"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          <p className="text-xs text-text-muted mt-3">
            Filtra missões e revisões pela disciplina selecionada.
          </p>
        </TacticalPanel>

        {/* Revisão Espaçada */}
        <TacticalPanel title="🔄 Revisão Espaçada">
          <div>
            <label className="text-sm font-bold uppercase text-gold-institution block mb-2">
              Primeiro intervalo: {settings.spaced_review_interval} dia{settings.spaced_review_interval !== 1 ? "s" : ""}
            </label>
            <input
              type="range"
              min="1"
              max="7"
              value={settings.spaced_review_interval}
              onChange={(e) => update({ spaced_review_interval: parseInt(e.target.value) })}
              className="w-full cursor-pointer"
            />
            <p className="text-xs text-text-muted mt-1">
              Dias após um erro para a reaparecer. Padrão: 1 dia.
            </p>
          </div>
        </TacticalPanel>

        {/* Aparência */}
        <TacticalPanel title="🎨 Aparência">
          <div className="space-y-4">
            <SettingToggle
              label="Modo escuro"
              description="Tema escuro (padrão do sistema)"
              checked={settings.dark_mode}
              onChange={() => update({ dark_mode: !settings.dark_mode })}
            />
          </div>
        </TacticalPanel>

        {/* Notificações */}
        <TacticalPanel title="🔔 Notificações">
          <div className="space-y-4">
            <SettingToggle
              label="Som habilitado"
              description="Sons ao responder questões"
              checked={settings.sound_enabled}
              onChange={() => update({ sound_enabled: !settings.sound_enabled })}
            />
            <SettingToggle
              label="Notificações"
              description="Lembretes de revisões pendentes"
              checked={settings.notifications_enabled}
              onChange={() => update({ notifications_enabled: !settings.notifications_enabled })}
            />
          </div>
        </TacticalPanel>

        {/* Tutor IA */}
        <TacticalPanel title="🤖 Tutor IA">
          <SettingToggle
            label="Modo Tutor IA"
            description="Assistente inteligente para dúvidas (em breve)"
            checked={settings.tutor_ia_enabled}
            onChange={() => {
              if (!settings.tutor_ia_enabled) return;
              update({ tutor_ia_enabled: false });
            }}
          />
        </TacticalPanel>

        {/* Backup */}
        <TacticalPanel title="💾 Backup & Dados">
          <div className="space-y-3">
            <TacticalButton
              variant="secondary"
              size="medium"
              className="w-full"
              onClick={() => router.push("/backup")}
            >
              💾 Gerenciar Backup
            </TacticalButton>
          </div>
        </TacticalPanel>

        {/* Zona de Perigo */}
        <TacticalPanel title="⚠️ Zona de Perigo">
          <div className="space-y-3">
            <AlertPanel
              type="warning"
              title="Resetar progresso"
              message="Remove todo o progresso, XP, caderno de erros, tentativas e simulados. A biblioteca de documentos NÃO será removida."
            />
            {resetMsg?.type === "success" && resetStep === 0 && null}
            <div className="flex gap-2">
              {resetStep === 0 && (
                <TacticalButton
                  variant="danger"
                  size="medium"
                  className="w-full"
                  onClick={handleReset}
                >
                  🗑️ Resetar Progresso
                </TacticalButton>
              )}
              {resetStep === 1 && (
                <>
                  <TacticalButton
                    variant="secondary"
                    size="medium"
                    onClick={() => setResetStep(0)}
                  >
                    Cancelar
                  </TacticalButton>
                  <TacticalButton
                    variant="danger"
                    size="medium"
                    className="flex-1"
                    onClick={handleReset}
                  >
                    ⚠️ Tenho certeza
                  </TacticalButton>
                </>
              )}
              {resetStep === 2 && (
                <>
                  <TacticalButton
                    variant="secondary"
                    size="medium"
                    onClick={() => setResetStep(0)}
                  >
                    Cancelar
                  </TacticalButton>
                  <TacticalButton
                    variant="danger"
                    size="medium"
                    className="flex-1"
                    onClick={handleReset}
                    disabled={resetLoading}
                  >
                    {resetLoading ? "Resetando..." : "🔥 CONFIRMAR RESET TOTAL"}
                  </TacticalButton>
                </>
              )}
            </div>
          </div>
        </TacticalPanel>

        {/* Footer */}
        <div className="px-4 py-3 rounded bg-navy-800 border border-graphite text-center">
          <p className="text-xs text-text-muted">
            CFS Tutor v1.0 · Curso de Formação Específica
          </p>
          <p className="text-xs text-text-secondary mt-1">
            🛡️ Dados armazenados apenas localmente
          </p>
        </div>
      </div>
    </div>
  );
}

function SettingToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-3 py-3 rounded bg-navy-900 border border-graphite">
      <div className="flex-1">
        <p className="text-sm font-bold text-text-primary">{label}</p>
        <p className="text-xs text-text-muted mt-1">{description}</p>
      </div>
      <label className="flex items-center cursor-pointer shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="w-5 h-5 accent-electric-blue rounded"
        />
      </label>
    </div>
  );
}
