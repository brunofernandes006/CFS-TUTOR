import "server-only";

export const V3_FEATURE_FLAG_ENV = {
  authPilot: "CFS_V3_AUTH_PILOT",
  identityBridge: "CFS_V3_IDENTITY_BRIDGE",
  dataRls: "CFS_V3_DATA_RLS",
  shell: "CFS_V3_SHELL",
  study: "CFS_V3_STUDY",
  questions: "CFS_V3_QUESTIONS",
  collections: "CFS_V3_COLLECTIONS",
  simulations: "CFS_V3_SIMULATIONS",
  gamification: "CFS_V3_GAMIFICATION",
  performance: "CFS_V3_PERFORMANCE",
  admin: "CFS_V3_ADMIN",
} as const;

export type V3FeatureFlag = keyof typeof V3_FEATURE_FLAG_ENV;

function readDisabledByDefaultFlag(name: string): boolean {
  return process.env[name]?.trim().toLowerCase() === "true";
}

/**
 * Preparacao inerte da Fase 0. Nenhuma rota V2 importa este modulo.
 * Cada fase futura deve validar seus gates antes de adicionar um consumidor.
 */
export function getV3FeatureFlags(): Readonly<Record<V3FeatureFlag, boolean>> {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(V3_FEATURE_FLAG_ENV).map(([flag, environmentName]) => [
        flag,
        readDisabledByDefaultFlag(environmentName),
      ]),
    ) as Record<V3FeatureFlag, boolean>,
  );
}
