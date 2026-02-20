const PROBLEMS = [
  {
    icon: "🏢",
    title: "Boring Corporate Themes",
    description:
      "Legacy casinos recycle the same tired fruit machines and pharaoh slots. Zero innovation, zero personality — just generic templates churned for profit.",
    accent: "neon-magenta",
    glow: "rgba(255,0,170,0.15)",
  },
  {
    icon: "🔒",
    title: "No Creator Ownership",
    description:
      "Developers and designers build slot content but see zero upside. No equity, no dividends, no way to capture the value you create. Pure work-for-hire.",
    accent: "neon-cyan",
    glow: "rgba(0,245,255,0.15)",
  },
  {
    icon: "📈",
    title: "No Way to Pump Your Slot",
    description:
      "There's no mechanism to launch, market, or trade ownership of a slot idea. The entire upside flows to casinos — creators and players are left with nothing.",
    accent: "neon-gold",
    glow: "rgba(255,215,0,0.15)",
  },
];

const ProblemSection = () => {
  return (
    <section id="problem" className="relative py-24 lg:py-32 px-4">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/95 to-black" />
      
      <div className="relative max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-neon-magenta font-orbitron text-xs tracking-widest uppercase font-semibold mb-4">
            The Problem
          </span>
          <h2 className="font-orbitron font-bold text-3xl sm:text-4xl lg:text-5xl text-white leading-tight">
            The{" "}
            <span className="gradient-text-gold">$60B+ slots world</span>
            <br />
            is locked in corporate hands
          </h2>
          <p className="mt-4 text-white/50 font-inter max-w-2xl mx-auto text-lg">
            The global slots industry generates billions — yet creators, players, and innovators see almost none of it.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PROBLEMS.map((problem) => (
            <div
              key={problem.title}
              className="glass-card-hover p-8 group"
              style={{
                background: `linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)`,
              }}
            >
              {/* Icon */}
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl mb-6 transition-all duration-300 group-hover:scale-110"
                style={{
                  background: problem.glow,
                  border: `1px solid ${problem.glow.replace("0.15", "0.4")}`,
                }}
              >
                {problem.icon}
              </div>

              <h3 className="font-orbitron font-bold text-lg text-white mb-3 leading-tight">
                {problem.title}
              </h3>
              <p className="text-white/55 font-inter text-sm leading-relaxed">
                {problem.description}
              </p>

              {/* Bottom accent line */}
              <div
                className="mt-6 h-0.5 w-0 group-hover:w-full transition-all duration-500 rounded-full"
                style={{ background: problem.glow.replace("0.15", "0.7") }}
              />
            </div>
          ))}
        </div>

        {/* Stat bar */}
        <div className="mt-16 grid grid-cols-3 gap-4 text-center">
          {[
            { value: "$60B+", label: "Annual slots revenue", color: "text-neon-gold" },
            { value: "0%", label: "Creator revenue share", color: "text-neon-magenta" },
            { value: "100%", label: "Corporate control", color: "text-white/50" },
          ].map((stat) => (
            <div key={stat.label} className="glass-card p-6">
              <div className={`font-orbitron font-black text-3xl sm:text-4xl ${stat.color} mb-1`}>
                {stat.value}
              </div>
              <div className="text-white/40 font-inter text-xs uppercase tracking-wider">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
