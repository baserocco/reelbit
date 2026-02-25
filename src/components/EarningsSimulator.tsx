import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const PIE_DATA = [
  { name: "Creator", value: 30, color: "#00F5FF" },
  { name: "Slot Treasury (Wins)", value: 30, color: "#FF00AA" },
  { name: "Shareholders", value: 20, color: "#FFD700" },
  { name: "Platform", value: 20, color: "#9945FF" },
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card px-3 py-2 text-xs font-inter">
        <span style={{ color: payload[0].payload.color }}>{payload[0].name}: </span>
        <span className="text-white font-semibold">{payload[0].value}%</span>
      </div>
    );
  }
  return null;
};

const EarningsSimulator = () => {
  const [dailySpins, setDailySpins] = useState(500);
  const [avgBet, setAvgBet] = useState(2.5);

  const totalWagered = dailySpins * avgBet;
  const totalRevenue = totalWagered * 0.04; // 4% house edge
  const creatorMonthly = totalRevenue * 0.30 * 30;
  const treasuryMonthly = totalRevenue * 0.30 * 30;
  const shareholderMonthly = totalRevenue * 0.20 * 30;
  const platformMonthly = totalRevenue * 0.20 * 30;

  return (
    <section id="earn" className="relative py-24 lg:py-32 px-4 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black to-black/95" />
      <div className="absolute top-1/2 right-0 w-[500px] h-[500px] rounded-full bg-neon-gold/3 blur-[120px] pointer-events-none" />

      <div className="relative max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-neon-gold font-orbitron text-xs tracking-widest uppercase font-semibold mb-4">
            Earnings Calculator
          </span>
          <h2 className="font-orbitron font-bold text-3xl sm:text-4xl lg:text-5xl text-white">
            How Much Can{" "}
            <span className="gradient-text-gold">You Earn?</span>
          </h2>
          <p className="mt-4 text-white/50 font-inter max-w-xl mx-auto">
            Simulate your potential passive income based on slot activity.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* Calculator inputs */}
          <div className="space-y-8">
            {/* Sliders */}
            <div className="glass-card p-8 space-y-8">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-white font-inter font-medium text-sm">
                    Daily Spins
                  </label>
                  <span className="font-orbitron font-bold text-neon-cyan">
                    {dailySpins.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={10000}
                  step={50}
                  value={dailySpins}
                  onChange={(e) => setDailySpins(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #00F5FF ${(dailySpins / 10000) * 100}%, rgba(255,255,255,0.1) ${(dailySpins / 10000) * 100}%)`,
                  }}
                />
                <div className="flex justify-between text-xs text-white/25 mt-1">
                  <span>50</span>
                  <span>10,000</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-white font-inter font-medium text-sm">
                    Avg Bet (USD)
                  </label>
                  <span className="font-orbitron font-bold text-neon-magenta">
                    ${avgBet.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={50}
                  step={0.5}
                  value={avgBet}
                  onChange={(e) => setAvgBet(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #FF00AA ${(avgBet / 50) * 100}%, rgba(255,255,255,0.1) ${(avgBet / 50) * 100}%)`,
                  }}
                />
                <div className="flex justify-between text-xs text-white/25 mt-1">
                  <span>$0.50</span>
                  <span>$50</span>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Creator Monthly", value: `$${creatorMonthly.toFixed(0)}`, color: "#00F5FF", sub: "Your passive income" },
                { label: "Slot Treasury", value: `$${treasuryMonthly.toFixed(0)}`, color: "#FF00AA", sub: "Player win pool" },
                { label: "Shareholders", value: `$${shareholderMonthly.toFixed(0)}`, color: "#FFD700", sub: "Investor dividends" },
                { label: "Daily Wagered", value: `$${totalWagered.toFixed(0)}`, color: "#9945FF", sub: "Total volume" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="glass-card p-5 text-center"
                  style={{ borderColor: `${item.color}22` }}
                >
                  <div className="text-white/40 text-xs font-inter uppercase tracking-wider mb-1">
                    {item.label}
                  </div>
                  <div
                    className="font-orbitron font-black text-2xl mb-1"
                    style={{ color: item.color, textShadow: `0 0 15px ${item.color}60` }}
                  >
                    {item.value}
                  </div>
                  <div className="text-white/25 text-xs font-inter">{item.sub}</div>
                </div>
              ))}
            </div>

            {/* Disclaimer */}
            <p className="text-white/25 text-xs font-inter text-center">
              * Estimates based on 4% house edge. Actual earnings depend on player activity and market conditions.
            </p>
          </div>

          {/* Pie Chart */}
          <div className="glass-card p-8">
            <h3 className="font-orbitron font-bold text-white text-center mb-2">
              Revenue Split
            </h3>
            <p className="text-white/40 text-xs font-inter text-center mb-8">
              Every spin automatically distributes revenue on-chain
            </p>

            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={PIE_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {PIE_DATA.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        style={{ filter: `drop-shadow(0 0 8px ${entry.color}60)` }}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="space-y-3 mt-4">
              {PIE_DATA.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}` }}
                    />
                    <span className="text-white/70 font-inter text-sm">{item.name}</span>
                  </div>
                  <span
                    className="font-orbitron font-bold text-sm"
                    style={{ color: item.color }}
                  >
                    {item.value}%
                  </span>
                </div>
              ))}
            </div>

            {/* Auto payout note */}
            <div className="mt-6 p-3 rounded-lg bg-neon-cyan/5 border border-neon-cyan/20 text-center">
              <p className="text-neon-cyan text-xs font-inter">
                ⚡ Payouts distributed automatically after every spin via smart contract
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EarningsSimulator;
