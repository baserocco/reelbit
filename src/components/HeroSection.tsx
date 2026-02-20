import { useEffect, useRef } from "react";
import SlotReelAnimation from "./SlotReelAnimation";

const HeroSection = () => {
  const scrollToWaitlist = () => {
    document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-dark" />
      
      {/* Radial glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-neon-cyan/5 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] rounded-full bg-neon-magenta/5 blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] rounded-full bg-neon-gold/4 blur-[100px] pointer-events-none" />

      {/* Particle effects */}
      <Particles />

      {/* 3D Slot Reels background */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <SlotReelAnimation />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(0,245,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.3) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-neon-cyan/30 bg-neon-cyan/5 mb-8">
          <div className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
          <span className="text-neon-cyan text-xs font-orbitron tracking-widest uppercase font-semibold">
            Launching Soon on Solana
          </span>
        </div>

        {/* Headline */}
        <h1 className="font-orbitron font-black leading-none mb-6">
          <span className="block text-4xl sm:text-5xl lg:text-7xl text-white tracking-tight">
            Own Your Slot.
          </span>
          <span className="block text-4xl sm:text-5xl lg:text-7xl tracking-tight">
            <span className="gradient-text">Launch. Pump.</span>
          </span>
          <span className="block text-4xl sm:text-5xl lg:text-7xl gradient-text-gold tracking-tight mt-1">
            Earn.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-white/60 text-lg sm:text-xl lg:text-2xl font-inter font-light max-w-3xl mx-auto mb-10 leading-relaxed">
          Create a real-money slot machine in minutes with AI. Pump it on the bonding curve.{" "}
          <span className="text-white/90 font-medium">
            Earn passive dividends from every spin — forever.
          </span>
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <button
            onClick={scrollToWaitlist}
            className="btn-primary px-8 py-4 rounded-xl text-base w-full sm:w-auto"
          >
            🚀 Join the Waitlist
          </button>
          <a
            href="#demo"
            className="btn-outline px-8 py-4 rounded-xl text-base w-full sm:w-auto text-center"
          >
            Watch Demo
          </a>
        </div>

        {/* Trust bar */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-white/40 text-sm font-inter">
          {["Solana-powered", "Provably fair", "Creator-owned slots"].map((item, i) => (
            <div key={item} className="flex items-center gap-2">
              {i > 0 && <span className="hidden sm:block text-white/20">•</span>}
              <span className="flex items-center gap-1.5">
                <span className="text-neon-cyan">✦</span>
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none" />
    </section>
  );
};

const Particles = () => {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    color: i % 3 === 0 ? "#00F5FF" : i % 3 === 1 ? "#FF00AA" : "#FFD700",
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 10}s`,
    duration: `${8 + Math.random() * 12}s`,
    size: `${2 + Math.random() * 3}px`,
  }));

  return (
    <>
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: p.left,
            backgroundColor: p.color,
            boxShadow: `0 0 6px ${p.color}`,
            animationDelay: p.delay,
            animationDuration: p.duration,
            width: p.size,
            height: p.size,
          }}
        />
      ))}
    </>
  );
};

export default HeroSection;
