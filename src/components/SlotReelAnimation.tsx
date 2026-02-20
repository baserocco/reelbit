const SYMBOLS = ["🍒", "💎", "⭐", "🔔", "🍀", "7️⃣", "🎰", "🃏"];

const ReelColumn = ({ offset = 0, speed = 1 }: { offset?: number; speed?: number }) => {
  const symbols = [...SYMBOLS, ...SYMBOLS, ...SYMBOLS];
  
  return (
    <div className="flex-1 overflow-hidden h-full relative">
      <div
        className="flex flex-col gap-4"
        style={{
          animation: `reel-spin ${3 / speed}s linear infinite`,
          animationDelay: `${offset}s`,
        }}
      >
        {symbols.map((sym, i) => (
          <div
            key={i}
            className="flex items-center justify-center text-3xl lg:text-4xl h-16 w-full rounded-lg"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            {sym}
          </div>
        ))}
      </div>
    </div>
  );
};

const SlotReelAnimation = () => {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div
        className="flex gap-4 h-full w-full max-w-lg opacity-80"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)",
        }}
      >
        <ReelColumn offset={0} speed={0.8} />
        <ReelColumn offset={-0.4} speed={1} />
        <ReelColumn offset={-0.8} speed={0.9} />
      </div>
    </div>
  );
};

export default SlotReelAnimation;
