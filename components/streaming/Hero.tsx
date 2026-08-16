"use client";

interface HeroMission {
  title: string;
  discipline: string;
  priority: string;
  duration: string;
  mastery: number;
}

interface HeroStats {
  level: string;
  xp: number;
  streak: number;
  readiness: number;
}

interface HeroProps {
  mission: HeroMission | null;
  stats: HeroStats;
  onContinue?: () => void;
}

const LEVEL_ICONS: Record<string, string> = {
  Recruta: "🪖",
  Patrulheiro: "🔵",
  Especialista: "⭐",
  Veterano: "🥈",
  Elite: "🥇",
  Comando: "🏆",
};

export function Hero({ mission, stats, onContinue }: HeroProps) {
  return (
    <section className="relative min-h-[65vh] flex items-end pb-28 pt-24 px-4 md:px-6 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-navy-900/60 to-navy-900/20" />

      {/* Decorative grid lines — subtle parallax via CSS transform */}
      <div className="absolute inset-0 opacity-[0.03] hero-parallax">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,180,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,180,255,0.3) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-navy-900/40 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto w-full animate-fade-in-up">
        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-navy-900/60 border border-graphite/30 text-xs font-bold text-text-primary">
            {LEVEL_ICONS[stats.level] ?? "⬡"} {stats.level}
          </span>
          {stats.xp > 0 && (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gold-institution/10 border border-gold-institution/20 text-xs font-bold text-gold-institution">
              {stats.xp.toLocaleString("pt-BR")} XP
            </span>
          )}
          {stats.streak > 0 && (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-alert-red/10 border border-alert-red/20 text-xs font-bold text-alert-red">
              {stats.streak} dias 🔥
            </span>
          )}
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-electric-blue/10 border border-electric-blue/20 text-xs font-bold text-electric-blue">
            Prontidão {stats.readiness}%
          </span>
        </div>

        {/* Mission card */}
        {mission ? (
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-widest text-electric-blue mb-2">
              Missão do Dia
            </p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-text-primary leading-tight mb-3">
              {mission.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary mb-2">
              <span>{mission.discipline}</span>
              <span className="text-graphite">·</span>
              <span>{mission.duration}</span>
              <span className="text-graphite">·</span>
              <span
                className={
                  mission.priority === "Alta"
                    ? "text-alert-red font-semibold"
                    : "text-warning-gold"
                }
              >
                Prioridade {mission.priority}
              </span>
            </div>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-xs text-text-muted">Domínio</span>
              <div className="flex-1 max-w-[200px] h-1.5 rounded-full bg-graphite/30 overflow-hidden">
                <div
                  className="h-full rounded-full bg-electric-blue transition-all"
                  style={{ width: `${mission.mastery}%` }}
                />
              </div>
              <span className="text-xs font-bold text-electric-blue">
                {mission.mastery}%
              </span>
            </div>
            {onContinue && (
              <button
                type="button"
                onClick={onContinue}
                className="px-6 py-3 rounded-xl bg-electric-blue text-white font-bold text-sm hover:bg-electric-blue/80 transition-all duration-200 shadow-[0_0_20px_rgba(0,180,255,0.25)] hover:shadow-[0_0_28px_rgba(0,180,255,0.35)]"
              >
                Continuar Missão →
              </button>
            )}
          </div>
        ) : (
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-2">
              Base Operacional
            </p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-text-primary leading-tight mb-3">
              Bem-vindo ao CFS Tutor
            </h1>
            <p className="text-sm text-text-secondary mb-6">
              Comece uma missão para organizar seus estudos e acompanhar seu
              desempenho.
            </p>
            {onContinue && (
              <button
                type="button"
                onClick={onContinue}
                className="px-6 py-3 rounded-xl bg-electric-blue text-white font-bold text-sm hover:bg-electric-blue/80 transition-all duration-200 shadow-[0_0_20px_rgba(0,180,255,0.25)] hover:shadow-[0_0_28px_rgba(0,180,255,0.35)]"
              >
                Iniciar Missão →
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
