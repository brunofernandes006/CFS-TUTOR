import { NextRequest, NextResponse } from "next/server";
import { importBackup, exportBackup, type BackupData } from "@/lib/services/backupService";
import { ensureDefaultUser } from "@/lib/services/userService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
    }

    if (body.version !== 1) {
      return NextResponse.json({ error: "Versão de backup incompatível." }, { status: 400 });
    }

    const user = ensureDefaultUser();

    // Pre-backup: save current state before overwriting
    const currentData = exportBackup(user.id);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

    // Import
    const result = importBackup(user.id, body as BackupData);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      pre_backup_timestamp: timestamp,
      pre_backup_summary: {
        syllabus_progress: Array.isArray(currentData.syllabus_progress) ? currentData.syllabus_progress.length : 0,
        question_attempts: Array.isArray(currentData.question_attempts) ? currentData.question_attempts.length : 0,
        error_notebook: Array.isArray(currentData.error_notebook) ? currentData.error_notebook.length : 0,
        simulations: Array.isArray(currentData.simulations) ? currentData.simulations.length : 0,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
