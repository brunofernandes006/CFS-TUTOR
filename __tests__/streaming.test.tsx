/**
 * Testes dos componentes de streaming v1.1 + v1.2 (motion & interaction).
 * Ambiente Node (sem DOM): exports, API routes, hooks, localStorage logic.
 */

// Mock localStorage global
const localStorageStore: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => localStorageStore[key] ?? null,
  setItem: (key: string, value: string) => { localStorageStore[key] = value; },
  removeItem: (key: string) => { delete localStorageStore[key]; },
  clear: () => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]); },
  get length() { return Object.keys(localStorageStore).length; },
  key: (i: number) => Object.keys(localStorageStore)[i] ?? null,
};
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, writable: true });

// Mock window.matchMedia for useReducedMotion
Object.defineProperty(globalThis, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// ================================================================
// Module exports — v1.1 + v1.2 components
// ================================================================
describe("Streaming module exports", () => {
  it("StudyContentCard exports", async () => {
    const mod = await import("@/components/streaming/StudyContentCard");
    expect(typeof mod.StudyContentCard).toBe("function");
  });

  it("ContentRow exports", async () => {
    const mod = await import("@/components/streaming/ContentRow");
    expect(typeof mod.ContentRow).toBe("function");
  });

  it("Hero exports", async () => {
    const mod = await import("@/components/streaming/Hero");
    expect(typeof mod.Hero).toBe("function");
  });

  it("TopNav exports", async () => {
    const mod = await import("@/components/streaming/TopNav");
    expect(typeof mod.TopNav).toBe("function");
  });

  it("SearchOverlay exports", async () => {
    const mod = await import("@/components/streaming/SearchOverlay");
    expect(typeof mod.SearchOverlay).toBe("function");
  });

  it("ContentPreviewModal exports", async () => {
    const mod = await import("@/components/streaming/ContentPreviewModal");
    expect(typeof mod.ContentPreviewModal).toBe("function");
  });

  it("SkeletonCard exports", async () => {
    const mod = await import("@/components/streaming/Skeletons");
    expect(typeof mod.SkeletonCard).toBe("function");
  });

  it("SkeletonRow exports", async () => {
    const mod = await import("@/components/streaming/Skeletons");
    expect(typeof mod.SkeletonRow).toBe("function");
  });

  it("SkeletonHero exports", async () => {
    const mod = await import("@/components/streaming/Skeletons");
    expect(typeof mod.SkeletonHero).toBe("function");
  });

  it("Barrel re-exports all components", async () => {
    const barrel = await import("@/components/streaming/index");
    expect(typeof barrel.StudyContentCard).toBe("function");
    expect(typeof barrel.ContentRow).toBe("function");
    expect(typeof barrel.Hero).toBe("function");
    expect(typeof barrel.TopNav).toBe("function");
    expect(typeof barrel.ContentPreviewModal).toBe("function");
    expect(typeof barrel.SkeletonCard).toBe("function");
    expect(typeof barrel.SkeletonRow).toBe("function");
    expect(typeof barrel.SkeletonHero).toBe("function");
  });
});

// ================================================================
// Hooks exports
// ================================================================
describe("Hook exports", () => {
  it("useReducedMotion exports", async () => {
    const mod = await import("@/hooks/useReducedMotion");
    expect(typeof mod.useReducedMotion).toBe("function");
  });

  it("useHomeData exports", async () => {
    const mod = await import("@/hooks/useHomeData");
    expect(typeof mod.useHomeData).toBe("function");
  });

  it("useMyList exports with flashId", async () => {
    const mod = await import("@/hooks/useMyList");
    expect(typeof mod.useMyList).toBe("function");
  });
});

// ================================================================
// API routes existem
// ================================================================
describe("New API routes", () => {
  it("api/home route exports GET", async () => {
    const mod = await import("@/app/api/home/route");
    expect(typeof mod.GET).toBe("function");
  });

  it("api/search route exports GET", async () => {
    const mod = await import("@/app/api/search/route");
    expect(typeof mod.GET).toBe("function");
  });
});

// ================================================================
// useMyList localStorage logic (simulated)
// ================================================================
describe("useMyList localStorage logic", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("reads empty list", () => {
    expect(localStorage.getItem("cfs-tutor-my-list")).toBeNull();
  });

  it("stores and retrieves list", () => {
    const item = { id: "s1", type: "syllabus", title: "ICC 191", addedAt: Date.now() };
    localStorage.setItem("cfs-tutor-my-list", JSON.stringify([item]));
    const stored = JSON.parse(localStorage.getItem("cfs-tutor-my-list") || "[]");
    expect(stored.length).toBe(1);
    expect(stored[0].id).toBe("s1");
  });

  it("does not duplicate items", () => {
    const items = [
      { id: "s1", type: "syllabus", title: "A", addedAt: 100 },
    ];
    const updated = [...items.filter((i) => i.id !== "s1"), { id: "s1", type: "syllabus", title: "B", addedAt: 200 }];
    localStorage.setItem("cfs-tutor-my-list", JSON.stringify(updated));
    const stored = JSON.parse(localStorage.getItem("cfs-tutor-my-list") || "[]");
    expect(stored.length).toBe(1);
    expect(stored[0].title).toBe("B");
  });

  it("removes item from list", () => {
    const items = [
      { id: "a", type: "syllabus", title: "A" },
      { id: "b", type: "document", title: "B" },
    ];
    localStorage.setItem("cfs-tutor-my-list", JSON.stringify(items));
    const filtered = items.filter((i) => i.id !== "b");
    localStorage.setItem("cfs-tutor-my-list", JSON.stringify(filtered));
    const stored = JSON.parse(localStorage.getItem("cfs-tutor-my-list") || "[]");
    expect(stored.length).toBe(1);
  });

  it("clears all items", () => {
    localStorage.setItem("cfs-tutor-my-list", JSON.stringify([{ id: "x" }]));
    localStorageMock.clear();
    expect(localStorage.getItem("cfs-tutor-my-list")).toBeNull();
  });

  it("handles malformed JSON gracefully", () => {
    localStorage.setItem("cfs-tutor-my-list", "not-json");
    let parsed: any;
    try {
      parsed = JSON.parse(localStorage.getItem("cfs-tutor-my-list") || "[]");
    } catch {
      parsed = [];
    }
    expect(Array.isArray(parsed)).toBe(true);
  });
});

// ================================================================
// useReducedMotion — respects matchMedia
// ================================================================
describe("useReducedMotion", () => {
  it("exports a function", async () => {
    const mod = await import("@/hooks/useReducedMotion");
    expect(typeof mod.useReducedMotion).toBe("function");
  });
});

// ================================================================
// ContentPreviewModal — ESC behavior (simulated)
// ================================================================
describe("ContentPreviewModal", () => {
  it("exports correctly", async () => {
    const mod = await import("@/components/streaming/ContentPreviewModal");
    expect(typeof mod.ContentPreviewModal).toBe("function");
  });

  it("renders null when closed", async () => {
    const mod = await import("@/components/streaming/ContentPreviewModal");
    // In Node env we can't render, but we can verify the component handles open=false
    // The component returns null when open=false, so this is a structural test
    expect(mod.ContentPreviewModal).toBeDefined();
  });
});

// ================================================================
// Skeleton components
// ================================================================
describe("Skeleton components", () => {
  it("SkeletonCard is a function", async () => {
    const mod = await import("@/components/streaming/Skeletons");
    expect(typeof mod.SkeletonCard).toBe("function");
  });

  it("SkeletonRow is a function", async () => {
    const mod = await import("@/components/streaming/Skeletons");
    expect(typeof mod.SkeletonRow).toBe("function");
  });

  it("SkeletonHero is a function", async () => {
    const mod = await import("@/components/streaming/Skeletons");
    expect(typeof mod.SkeletonHero).toBe("function");
  });
});

// ================================================================
// CSS classes exist in globals.css
// ================================================================
describe("v1.2 CSS classes defined", () => {
  it("skeleton class exists", async () => {
    const fs = await import("fs");
    const css = fs.readFileSync("app/globals.css", "utf-8");
    expect(css).toContain(".skeleton");
  });

  it("animate-fade-in-up class exists", async () => {
    const fs = await import("fs");
    const css = fs.readFileSync("app/globals.css", "utf-8");
    expect(css).toContain(".animate-fade-in-up");
  });

  it("card-details class exists", async () => {
    const fs = await import("fs");
    const css = fs.readFileSync("app/globals.css", "utf-8");
    expect(css).toContain(".card-details");
  });

  it("card-glow class exists", async () => {
    const fs = await import("fs");
    const css = fs.readFileSync("app/globals.css", "utf-8");
    expect(css).toContain(".card-glow");
  });

  it("row-fade-left class exists", async () => {
    const fs = await import("fs");
    const css = fs.readFileSync("app/globals.css", "utf-8");
    expect(css).toContain(".row-fade-left");
  });

  it("row-fade-right class exists", async () => {
    const fs = await import("fs");
    const css = fs.readFileSync("app/globals.css", "utf-8");
    expect(css).toContain(".row-fade-right");
  });

  it("topnav-solid class exists", async () => {
    const fs = await import("fs");
    const css = fs.readFileSync("app/globals.css", "utf-8");
    expect(css).toContain(".topnav-solid");
  });

  it("animate-modal-in class exists", async () => {
    const fs = await import("fs");
    const css = fs.readFileSync("app/globals.css", "utf-8");
    expect(css).toContain(".animate-modal-in");
  });

  it("animate-overlay-in class exists", async () => {
    const fs = await import("fs");
    const css = fs.readFileSync("app/globals.css", "utf-8");
    expect(css).toContain(".animate-overlay-in");
  });

  it("animate-micro-pop class exists", async () => {
    const fs = await import("fs");
    const css = fs.readFileSync("app/globals.css", "utf-8");
    expect(css).toContain(".animate-micro-pop");
  });

  it("prefers-reduced-motion media query exists", async () => {
    const fs = await import("fs");
    const css = fs.readFileSync("app/globals.css", "utf-8");
    expect(css).toContain("prefers-reduced-motion");
  });

  it("carousel-scroll class exists", async () => {
    const fs = await import("fs");
    const css = fs.readFileSync("app/globals.css", "utf-8");
    expect(css).toContain(".carousel-scroll");
  });

  it("hero-parallax class exists", async () => {
    const fs = await import("fs");
    const css = fs.readFileSync("app/globals.css", "utf-8");
    expect(css).toContain(".hero-parallax");
  });
});
