import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

type MigrationManifest = {
  files: Record<string, string>;
};

type RouteManifest = {
  defaultMode: "DENY";
  routes: Record<string, "PUBLIC" | "LEGACY_OWNER">;
};

const root = process.cwd();

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8")) as T;
}

describe("Fase 0: fronteira congelada da V2", () => {
  it("preserva nomes e checksums das migrations V2 com 014 e 015 reconciliados", () => {
    const manifest = readJson<MigrationManifest>("docs/v3/baselines/v2-migrations.sha256.json");
    const migrationDirectory = path.join(root, "supabase/migrations");
    const migrationFiles = readdirSync(migrationDirectory).filter((file) => file.endsWith(".sql")).sort();

    expect(migrationFiles).toEqual(Object.keys(manifest.files).sort());
    expect(migrationFiles.filter((file) => file.startsWith("014_"))).toEqual([
      "014_answer_key_annulment.sql",
    ]);
    expect(migrationFiles.filter((file) => file.startsWith("015_"))).toEqual([
      "015_prevent_annulled_real_questions.sql",
    ]);

    for (const [file, expectedHash] of Object.entries(manifest.files)) {
      const actualHash = createHash("sha256")
        .update(readFileSync(path.join(migrationDirectory, file)))
        .digest("hex");
      expect(actualHash).toBe(expectedHash);
    }
  });

  it("mantem um auth_mode explicito para cada metodo de API V2", () => {
    const manifest = readJson<RouteManifest>("docs/v3/baselines/v2-route-auth-map.json");
    const apiRoot = path.join(root, "app/api");
    const discovered: string[] = [];

    function walk(directory: string): void {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const absolute = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          walk(absolute);
          continue;
        }
        if (entry.name !== "route.ts") continue;

        const route = path
          .relative(apiRoot, directory)
          .split(path.sep)
          .filter(Boolean)
          .join("/");
        const source = readFileSync(absolute, "utf8");
        for (const match of source.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)/g)) {
          discovered.push(`${match[1]} /api${route ? `/${route}` : ""}`);
        }
      }
    }

    walk(apiRoot);
    expect(discovered.sort()).toEqual(Object.keys(manifest.routes).sort());
    expect(manifest.defaultMode).toBe("DENY");
    expect(Object.values(manifest.routes)).not.toContain("AUTH_V3");
  });

  it("mantem as flags V3 server-only, desligadas por padrao e sem consumidores V2", () => {
    const flagModule = path.join(root, "lib/server/v3FeatureFlags.ts");
    const source = readFileSync(flagModule, "utf8");
    expect(source).toContain('import "server-only"');
    expect(source).not.toContain("NEXT_PUBLIC_");

    const applicationRoots = ["app", "components", "lib"];
    const consumers: string[] = [];
    for (const applicationRoot of applicationRoots) {
      const start = path.join(root, applicationRoot);
      const stack = [start];
      while (stack.length > 0) {
        const current = stack.pop();
        if (!current) continue;
        for (const entry of readdirSync(current, { withFileTypes: true })) {
          const absolute = path.join(current, entry.name);
          if (entry.isDirectory()) stack.push(absolute);
          else if (/\.(ts|tsx)$/.test(entry.name) && absolute !== flagModule) {
            if (readFileSync(absolute, "utf8").includes("v3FeatureFlags")) consumers.push(absolute);
          }
        }
      }
    }
    expect(consumers).toEqual([]);

    for (const name of [
      "CFS_V3_AUTH_PILOT",
      "CFS_V3_IDENTITY_BRIDGE",
      "CFS_V3_DATA_RLS",
      "CFS_V3_SHELL",
      "CFS_V3_STUDY",
      "CFS_V3_QUESTIONS",
      "CFS_V3_COLLECTIONS",
      "CFS_V3_SIMULATIONS",
      "CFS_V3_GAMIFICATION",
      "CFS_V3_PERFORMANCE",
      "CFS_V3_ADMIN",
    ]) {
      expect(source).toContain(name);
      expect(process.env[name]).not.toBe("true");
    }
  });

  it("mantem o harness local presente sem vinculo remoto", () => {
    expect(existsSync(path.join(root, "supabase/config.toml"))).toBe(true);
    const config = readFileSync(path.join(root, "supabase/config.toml"), "utf8");
    expect(config).toContain('project_id = "cfs-tutor-v3-local"');
    expect(config).toContain("enable_signup = false");
    expect(config).not.toMatch(/project_ref|access_token|service_role/i);
  });
});
