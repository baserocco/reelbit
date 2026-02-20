const STEPS = [
  {
    number: "01",
    icon: "🎨",
    title: "AI Slot Builder",
    description:
      "Upload an image or write a prompt. Our AI generates stunning 3D animated slot machine graphics, symbols, and sound effects in seconds.",
    color: "#00F5FF",
  },
  {
    number: "02",
    icon: "🚀",
    title: "Launch on Bonding Curve",
    description:
      "Deploy your slot with a Pump.fun-style bonding curve. Early supporters buy in cheap — price rises as demand grows. You get the initial liquidity.",
    color: "#FF00AA",
  },
  {
    number: "03",
    icon: "🎰",
    title: "Go Live in ReelBit Casino",
    description:
      "Your slot instantly goes live in the ReelBit Casino marketplace, accepting real crypto and fiat bets from thousands of global players.",
    color: "#FFD700",
  },
  {
    number: "04",
    icon: "💰",
    title: "Earn Forever",
    description:
      "You and your shareholders earn real-time dividends from every single spin — automatically paid out on-chain. Passive income, forever.",
    color: "#00F5FF",
  },
];

const SolutionSection = () => {
  return (
    <section id="how-it-works" className="relative py-24 lg:py-32 px-4 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black to-black/95" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-neon-cyan/3 blur-[150px] pointer-events-none" />

      <div className="relative max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-neon-cyan font-orbitron text-xs tracking-widest uppercase font-semibold mb-4">
            The Solution
          </span>
          <h2 className="font-orbitron font-bold text-3xl sm:text-4xl lg:text-5xl text-white leading-tight">
            ReelBit: Your Slot, Your Rules,{" "}
            <span className="gradient-text">Your Revenue</span>
          </h2>
          <p className="mt-4 text-white/50 font-inter max-w-2xl mx-auto text-lg">
            Four simple steps from idea to passive income machine.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Connecting line - desktop */}
          <div className="hidden lg:block absolute top-12 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, index) => (
              <div
                key={step.number}
                className="group relative"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Step card */}
                <div className="glass-card-hover p-6 h-full flex flex-col">
                  {/* Number + icon */}
                  <div className="flex items-center gap-3 mb-5">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-orbitron font-black text-xs transition-all duration-300 group-hover:scale-110"
                      style={{
                        background: `linear-gradient(135deg, ${step.color}22, ${step.color}11)`,
                        border: `1px solid ${step.color}44`,
                        color: step.color,
                        boxShadow: `0 0 15px ${step.color}22`,
                      }}
                    >
                      {step.number}
                    </div>
                    <div className="text-2xl group-hover:scale-110 transition-transform duration-300">
                      {step.icon}
                    </div>
                  </div>

                  <h3
                    className="font-orbitron font-bold text-base mb-3 transition-all duration-300 group-hover:text-white"
                    style={{ color: step.color }}
                  >
                    {step.title}
                  </h3>
                  <p className="text-white/50 font-inter text-sm leading-relaxed flex-1">
                    {step.description}
                  </p>

                  {/* Arrow for desktop */}
                  {index < STEPS.length - 1 && (
                    <div
                      className="hidden lg:block absolute -right-3 top-10 text-white/20 text-lg z-10"
                    >
                      →
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature pills */}
        <div className="mt-14 flex flex-wrap justify-center gap-3">
          {[
            "⚡ Instant deployment",
            "🔐 Provably fair RNG",
            "🌍 Global player base",
            "💸 Auto on-chain payouts",
            "📊 Real-time analytics",
            "🎨 AI-generated graphics",
          ].map((feat) => (
            <span
              key={feat}
              className="px-4 py-2 rounded-full text-sm font-inter text-white/60 border border-white/10 bg-white/3 hover:border-neon-cyan/30 hover:text-neon-cyan transition-all duration-200"
            >
              {feat}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SolutionSection;
