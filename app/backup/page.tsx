"use client";

import { useState, useEffect } from "react";
import {
  SectionHeader,
  TacticalPanel,
  TacticalButton,
  AlertPanel,
} from "@/components/ui";
import { getSettingsSnapshot } from "@/hooks/useSettings";

interface BackupInfo {
  lastBackup: string | null;
  itemsIncluded: number;
}

interface PreBackupSummary {
  syllabus_progress: number;
  question_attempts: number;
  error_notebook: number;
  simulations: number;
}

export default function BackupPage() {
  const [info, setInfo] = useState<BackupInfo>({ lastBackup: null, itemsIncluded: 0 });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [importData, setImportData] = useState<Record<string, unknown> | null>(null);
  const [confirmImport, setConfirmImport] = useState(false);

  useEffect(() => {
    const last = localStorage.getItem("cfs-tutor-last-backup");
    if (last) {
      try {
        const parsed = JSON.parse(last);
        setInfo({ lastBackup: parsed.date, itemsIncluded: parsed.items || 0 });
      } catch {
        // ignore
      }
    }
  }, []);

  const handleExport = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/backup/export");
      if (!res.ok) throw new Error("Falha na exportação");
      const dbData = await res.json();

      const settings = getSettingsSnapshot();
      const fullBackup = { ...dbData, settings };

      const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cfs_tutor_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      let totalItems = 0;
      const counts: PreBackupSummary = {
        syllabus_progress: Array.isArray(fullBackup.syllabus_progress) ? fullBackup.syllabus_progress.length : 0,
        question_attempts: Array.isArray(fullBackup.question_attempts) ? fullBackup.question_attempts.length : 0,
        error_notebook: Array.isArray(fullBackup.error_notebook) ? fullBackup.error_notebook.length : 0,
        simulations: Array.isArray(fullBackup.simulations) ? fullBackup.simulations.length : 0,
      };
      totalItems = counts.syllabus_progress + counts.question_attempts + counts.error_notebook + counts.simulations;

      const now = new Date().toLocaleString("pt-BR");
      localStorage.setItem("cfs-tutor-last-backup", JSON.stringify({ date: now, items: totalItems }));
      setInfo({ lastBackup: now, itemsIncluded: totalItems });
      setMessage({ type: "success", text: `Backup exportado! ${totalItems} registros salvos.` });
    } catch (err) {
      setMessage({ type: "error", text: "Erro ao exportar. Tente novamente." });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setLoading(true);
      setMessage(null);
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.version !== 1) {
          setMessage({ type: "error", text: "Arquivo de backup inválido (versão incompatível)." });
          setLoading(false);
          return;
        }
        setImportData(data);
        setConfirmImport(false);
        setMessage({
          type: "info",
          text: `Backup carregado: ${(Array.isArray(data.syllabus_progress) ? data.syllabus_progress.length : 0)} progressos, ${(Array.isArray(data.error_notebook) ? data.error_notebook.length : 0)} erros, ${(Array.isArray(data.simulations) ? data.simulations.length : 0)} simulados. Revise e confirme.`,
        });
      } catch {
        setMessage({ type: "error", text: "Arquivo JSON inválido." });
      } finally {
        setLoading(false);
      }
    };
    input.click();
  };

  const handleConfirmImport = async () => {
    if (!importData) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/backup/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(importData),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: `${data.message} Backup anterior salvo automaticamente.` });
        if (data.pre_backup_summary) {
          const s = data.pre_backup_summary as PreBackupSummary;
          setInfo({
            lastBackup: new Date().toLocaleString("pt-BR"),
            itemsIncluded: s.syllabus_progress + s.question_attempts + s.error_notebook + s.simulations,
          });
        }
      } else {
        setMessage({ type: "error", text: data.error || "Erro ao importar." });
      }
    } catch {
      setMessage({ type: "error", text: "Erro de conexão." });
    } finally {
      setLoading(false);
      setImportData(null);
      setConfirmImport(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="💾 Backup & Exportação"
        subtitle="Proteja seus dados e restaure quando necessário"
      />

      <div className="max-w-2xl mx-auto w-full space-y-6">
        {message && (
          <AlertPanel
            type={message.type}
            title={
              message.type === "success" ? "Sucesso" :
              message.type === "error" ? "Erro" : "Atenção"
            }
            message={message.text}
            closeable
            onClose={() => setMessage(null)}
          />
        )}

        {/* Info */}
        <TacticalPanel title="📊 Status">
          <div className="grid grid-cols-2 gap-3">
            <div className="px-3 py-2 rounded bg-navy-900 border border-graphite">
              <p className="text-xs font-bold uppercase text-text-muted">Último Backup</p>
              <p className="mt-1 text-sm text-text-primary">
                {info.lastBackup || <span className="text-text-secondary">Nenhum</span>}
              </p>
            </div>
            <div className="px-3 py-2 rounded bg-navy-900 border border-graphite">
              <p className="text-xs font-bold uppercase text-text-muted">Registros</p>
              <p className="mt-1 text-sm text-cyan-glow">{info.itemsIncluded}</p>
            </div>
          </div>
        </TacticalPanel>

        {/* Exportar */}
        <TacticalPanel title="📥 Exportar Backup">
          <div className="space-y-3">
            <p className="text-sm text-text-secondary">
              Salva um arquivo JSON com: progresso, XP, caderno de erros, histórico de simulados e configurações.
            </p>
            <div className="px-3 py-2 rounded bg-navy-900 border border-graphite text-xs text-text-muted space-y-1">
              <p>✓ Syllabus progress</p>
              <p>✓ XP e streak</p>
              <p>✓ Caderno de erros</p>
              <p>✓ Tentativas</p>
              <p>✓ Simulados</p>
              <p>✓ Configurações locais</p>
            </div>
            <TacticalButton
              variant="primary"
              size="medium"
              onClick={handleExport}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Exportando..." : "📥 Exportar Backup JSON"}
            </TacticalButton>
          </div>
        </TacticalPanel>

        {/* Importar */}
        <TacticalPanel title="📤 Restaurar Backup">
          <div className="space-y-3">
            <p className="text-sm text-text-secondary">
              Selecione um arquivo de backup JSON para restaurar. Um backup automático dos dados atuais será criado antes de sobrescrever.
            </p>
            <AlertPanel
              type="warning"
              title="Atenção"
              message="Os dados atuais serão substituídos. Um backup automático é criado antes da restauração."
            />

            {importData && (
              <div className="px-3 py-2 rounded bg-navy-900 border border-gold-institution">
                <p className="text-sm font-bold text-gold-institution mb-2">Dados carregados:</p>
                <div className="text-xs text-text-secondary space-y-1">
                  <p>• {Array.isArray(importData.syllabus_progress) ? importData.syllabus_progress.length : 0} progressos</p>
                  <p>• {Array.isArray(importData.error_notebook) ? importData.error_notebook.length : 0} erros no caderno</p>
                  <p>• {Array.isArray(importData.simulations) ? importData.simulations.length : 0} simulados</p>
                  <p>• {Array.isArray(importData.question_attempts) ? importData.question_attempts.length : 0} tentativas</p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <TacticalButton
                variant="secondary"
                size="medium"
                onClick={handleFileSelect}
                disabled={loading}
                className="flex-1"
              >
                📂 Selecionar Arquivo
              </TacticalButton>

              {importData && !confirmImport && (
                <TacticalButton
                  variant="danger"
                  size="medium"
                  onClick={() => setConfirmImport(true)}
                  className="flex-1"
                >
                  ⚠️ Restaurar
                </TacticalButton>
              )}

              {importData && confirmImport && (
                <>
                  <TacticalButton
                    variant="secondary"
                    size="medium"
                    onClick={() => { setImportData(null); setConfirmImport(false); }}
                  >
                    Cancelar
                  </TacticalButton>
                  <TacticalButton
                    variant="danger"
                    size="medium"
                    onClick={handleConfirmImport}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? "Restaurando..." : "🔥 Confirmar Restauração"}
                  </TacticalButton>
                </>
              )}
            </div>
          </div>
        </TacticalPanel>

        {/* Privacidade */}
        <div className="px-4 py-3 rounded bg-navy-800 border border-electric-blue">
          <p className="text-xs font-bold uppercase text-electric-blue mb-1">🛡️ Privacidade</p>
          <p className="text-xs text-text-secondary">
            Todos os backups ficam apenas no seu dispositivo. Nenhum dado é enviado para servidores externos.
          </p>
        </div>
      </div>
    </div>
  );
}
