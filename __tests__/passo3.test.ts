/**
 * PASSO 3 tests — Global finishing, PWA, mobile, accessibility, consistency.
 * Uses jsdom where DOM interaction needed, Node for structural checks.
 */

// ── Modal ESC + animation (jsdom) ────────────────────────────────
describe("Modal component (PASSO 3)", () => {
  it("exports Modal correctly", async () => {
    const mod = await import("@/components/ui/Modal");
    expect(typeof mod.Modal).toBe("function");
  });

  it("Modal source includes ESC key handling", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("components/ui/Modal.tsx", "utf-8");
    expect(src).toContain('"Escape"');
    expect(src).toContain("handleEsc");
    expect(src).toContain("aria-modal");
    expect(src).toContain("role=\"dialog\"");
  });

  it("Modal includes slide-up animation for mobile", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("components/ui/Modal.tsx", "utf-8");
    expect(src).toContain("animate-overlay-in");
    expect(src).toContain("animate-modal-in");
    expect(src).toContain("items-end sm:items-center");
    expect(src).toContain("rounded-t-2xl sm:rounded-lg");
  });

  it("Modal close button has aria-label", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("components/ui/Modal.tsx", "utf-8");
    expect(src).toContain('aria-label="Fechar"');
  });
});

// ── AppShell mobile drawer ───────────────────────────────────────
describe("AppShell mobile drawer (PASSO 3)", () => {
  it("has drawer state and toggle logic", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("components/layout/AppShell.tsx", "utf-8");
    expect(src).toContain("drawerOpen");
    expect(src).toContain("setDrawerOpen");
    expect(src).toContain("mobile-menu-overlay");
    expect(src).toContain("mobile-menu-panel");
  });

  it("has slide-in-left keyframe in CSS", async () => {
    const fs = await import("fs");
    const css = fs.readFileSync("app/globals.css", "utf-8");
    expect(css).toContain(".mobile-menu-overlay");
    expect(css).toContain(".mobile-menu-panel");
    expect(css).toContain("slide-in-left");
  });

  it("drawer has aria-label on dialog and nav", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("components/layout/AppShell.tsx", "utf-8");
    expect(src).toContain('aria-label="Menu de navegação"');
    expect(src).toContain('aria-label="Menu completo"');
  });

  it("drawer locks body scroll when open", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("components/layout/AppShell.tsx", "utf-8");
    expect(src).toContain("document.body.style.overflow");
  });

  it("STREAMING_ROUTES constant still correct", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("components/layout/AppShell.tsx", "utf-8");
    expect(src).toContain('"/estudar"');
    expect(src).toContain('"/biblioteca"');
    expect(src).toContain('"/simulados"');
    expect(src).toContain('"/questoes"');
  });
});

// ── TopNav hamburger menu ────────────────────────────────────────
describe("TopNav hamburger menu (PASSO 3)", () => {
  it("has menu state and drawer toggle", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("components/streaming/TopNav.tsx", "utf-8");
    expect(src).toContain("menuOpen");
    expect(src).toContain("setMenuOpen");
    expect(src).toContain("NAV_ITEMS");
    expect(src).toContain("aria-label=\"Menu\"");
  });

  it("TopNav uses pathname for active state", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("components/streaming/TopNav.tsx", "utf-8");
    expect(src).toContain("usePathname");
    expect(src).toContain('aria-current');
  });

  it("TopNav drawer closes on navigation click", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("components/streaming/TopNav.tsx", "utf-8");
    expect(src).toContain("closeMenu");
    expect(src).toContain("onClick={closeMenu}");
  });
});

// ── SearchBar accessibility (PASSO 3) ───────────────────────────
describe("SearchBar accessibility (PASSO 3)", () => {
  it("has ARIA combobox attributes", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("components/ui/SearchBar.tsx", "utf-8");
    expect(src).toContain('role="combobox"');
    expect(src).toContain('aria-autocomplete="list"');
    expect(src).toContain('aria-label=');
    expect(src).toContain('aria-expanded');
  });

  it("has Escape key handling", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("components/ui/SearchBar.tsx", "utf-8");
    expect(src).toContain('"Escape"');
  });

  it("has click outside handler", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("components/ui/SearchBar.tsx", "utf-8");
    expect(src).toContain("mousedown");
    expect(src).toContain("wrapperRef");
  });
});

// ── LoadingState / EmptyState (PASSO 3) ─────────────────────────
describe("LoadingState and EmptyState (PASSO 3)", () => {
  it("LoadingState uses streaming tokens", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("components/ui/LoadingState.tsx", "utf-8");
    expect(src).toContain("border-graphite");
    expect(src).toContain("bg-navy-2");
    expect(src).toContain("border-electric-blue");
  });

  it("EmptyState accepts action prop", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("components/ui/EmptyState.tsx", "utf-8");
    expect(src).toContain("action?");
    expect(src).toContain("action.label");
    expect(src).toContain("action.onClick");
  });

  it("EmptyState has rounded icon container", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("components/ui/EmptyState.tsx", "utf-8");
    expect(src).toContain("rounded-2xl");
    expect(src).toContain("bg-navy-2");
  });
});

// ── Error / NotFound pages (PASSO 3) ────────────────────────────
describe("Error and NotFound pages (PASSO 3)", () => {
  it("error.tsx shows digest when available", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("app/error.tsx", "utf-8");
    expect(src).toContain("digest");
    expect(src).toContain("error.digest");
  });

  it("error.tsx uses consistent design tokens", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("app/error.tsx", "utf-8");
    expect(src).toContain("bg-alert-red/10");
    expect(src).toContain("border-alert-red/20");
    expect(src).toContain("bg-electric-blue");
    expect(src).toContain("min-h-[44px]");
  });

  it("not-found.tsx uses electric-blue icon", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("app/not-found.tsx", "utf-8");
    expect(src).toContain("bg-electric-blue/10");
    expect(src).toContain("border-electric-blue/20");
    expect(src).toContain("min-h-[44px]");
  });

  it("not-found.tsx links to home", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("app/not-found.tsx", "utf-8");
    expect(src).toContain('href="/"');
    expect(src).toContain("Voltar ao Início");
  });
});

// ── PWA manifest (PASSO 3) ──────────────────────────────────────
describe("PWA manifest (PASSO 3)", () => {
  it("manifest.json has required PWA fields", async () => {
    const fs = await import("fs");
    const manifest = JSON.parse(fs.readFileSync("public/manifest.json", "utf-8"));
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/);
    expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(1);
  });

  it("manifest has scope field", async () => {
    const fs = await import("fs");
    const manifest = JSON.parse(fs.readFileSync("public/manifest.json", "utf-8"));
    expect(manifest.scope).toBe("/");
  });

  it("manifest icons include SVG", async () => {
    const fs = await import("fs");
    const manifest = JSON.parse(fs.readFileSync("public/manifest.json", "utf-8"));
    const svgIcon = manifest.icons.find((i: any) => i.type === "image/svg+xml");
    expect(svgIcon).toBeTruthy();
    expect(svgIcon.src).toBe("/icon.svg");
  });

  it("icon.svg exists in public/", async () => {
    const fs = await import("fs");
    expect(fs.existsSync("public/icon.svg")).toBe(true);
  });

  it("unused Next.js default assets removed", async () => {
    const fs = await import("fs");
    expect(fs.existsSync("public/file.svg")).toBe(false);
    expect(fs.existsSync("public/globe.svg")).toBe(false);
    expect(fs.existsSync("public/next.svg")).toBe(false);
    expect(fs.existsSync("public/vercel.svg")).toBe(false);
    expect(fs.existsSync("public/window.svg")).toBe(false);
  });
});

// ── CSS v1.3 global finishing (PASSO 3) ─────────────────────────
describe("CSS v1.3 global finishing (PASSO 3)", () => {
  it("focus-visible rule exists", async () => {
    const fs = await import("fs");
    const css = fs.readFileSync("app/globals.css", "utf-8");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("outline: 2px solid var(--gold)");
  });

  it("touch-friendly targets exist", async () => {
    const fs = await import("fs");
    const css = fs.readFileSync("app/globals.css", "utf-8");
    expect(css).toContain("pointer: coarse");
    expect(css).toContain("min-height: 44px");
  });

  it("mobile-menu-overlay CSS exists", async () => {
    const fs = await import("fs");
    const css = fs.readFileSync("app/globals.css", "utf-8");
    expect(css).toContain(".mobile-menu-overlay");
    expect(css).toContain(".mobile-menu-panel");
    expect(css).toContain("slide-in-left");
  });

  it("install-banner CSS exists", async () => {
    const fs = await import("fs");
    const css = fs.readFileSync("app/globals.css", "utf-8");
    expect(css).toContain(".install-banner");
  });

  it("prefers-reduced-motion block is properly closed", async () => {
    const fs = await import("fs");
    const css = fs.readFileSync("app/globals.css", "utf-8");
    const mediaStart = css.indexOf("@media (prefers-reduced-motion: reduce)");
    expect(mediaStart).toBeGreaterThan(-1);
    // Find the closing brace — count braces inside the block
    const block = css.slice(mediaStart);
    let depth = 0;
    let end = -1;
    for (let i = 0; i < block.length; i++) {
      if (block[i] === "{") depth++;
      if (block[i] === "}") {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }
    expect(end).toBeGreaterThan(100);
    // After the block, hero-parallax should exist
    expect(css.slice(mediaStart + end).trim()).toContain(".hero-parallax");
  });
});

// ── Layout metadata (PASSO 3) ───────────────────────────────────
describe("Layout metadata (PASSO 3)", () => {
  it("layout.tsx has PWA metadata", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("app/layout.tsx", "utf-8");
    expect(src).toContain("manifest:");
    expect(src).toContain("appleWebApp");
    expect(src).toContain("themeColor");
    expect(src).toContain('lang="pt-BR"');
    expect(src).toContain("userScalable: false");
  });
});
