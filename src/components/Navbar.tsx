import { useState, useEffect, useCallback } from "react";
import reelbitLogo from "@/assets/reelbit-logo.jpeg";
import {
  startAmbient, stopAmbient, setAmbientVolume, getAmbientVolume, isAmbientPlaying,
} from "./slot/SoundManager";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [ambientOn, setAmbientOn] = useState(false);
  const [ambientVol, setAmbientVol] = useState(0.5);
  const [showVolume, setShowVolume] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToWaitlist = () => {
    document.getElementById("waitlist-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const toggleAmbient = useCallback(() => {
    if (ambientOn) {
      stopAmbient();
      setAmbientOn(false);
      setShowVolume(false);
    } else {
      startAmbient();
      setAmbientOn(true);
      setShowVolume(true);
    }
  }, [ambientOn]);

  const handleVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setAmbientVol(vol);
    setAmbientVolume(vol);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-black/80 backdrop-blur-xl border-b border-white/5"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-lg blur-md bg-neon-cyan/20" />
              <img
                src={reelbitLogo}
                alt="ReelBit Logo"
                className="relative h-9 w-9 rounded-lg object-cover"
                width={36}
                height={36}
                loading="eager"
                decoding="async"
                fetchPriority="high"
              />
            </div>
            <span className="font-orbitron font-bold text-xl tracking-wide">
              <span className="text-white">Reel</span>
              <span className="text-red-500">Bit</span>
            </span>
          </div>

          {/* Nav Links - Desktop */}
          <div className="hidden md:flex items-center gap-8">
            {["How It Works", "Demo", "Earn", "Waitlist"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(" ", "-")}`}
                className="text-sm font-inter text-white/60 hover:text-neon-cyan transition-colors duration-200 tracking-wide"
              >
                {item}
              </a>
            ))}
          </div>

          {/* Right side: music + CTA */}
          <div className="flex items-center gap-3">
            {/* Ambient music controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleAmbient}
                className="relative w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-300 group"
                style={{
                  background: ambientOn
                    ? "linear-gradient(135deg, rgba(255,100,0,0.2), rgba(255,180,0,0.15))"
                    : "rgba(255,255,255,0.05)",
                  border: ambientOn
                    ? "1px solid rgba(255,150,0,0.5)"
                    : "1px solid rgba(255,255,255,0.1)",
                  boxShadow: ambientOn ? "0 0 15px rgba(255,100,0,0.2)" : "none",
                }}
                title={ambientOn ? "Stop Music" : "Play Ambient Music"}
              >
                {ambientOn ? (
                  /* Animated music icon */
                  <div className="flex items-end gap-[2px] h-3.5">
                    {[0, 1, 2, 3].map(i => (
                      <div
                        key={i}
                        className="w-[3px] rounded-full"
                        style={{
                          backgroundColor: "#FFD700",
                          animation: `musicBar 0.8s ease-in-out ${i * 0.15}s infinite alternate`,
                          height: `${6 + Math.random() * 8}px`,
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-white/70 transition-colors">
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                )}
              </button>

              {/* Volume slider */}
              {ambientOn && (
                <div className="flex items-center gap-1.5 animate-fade-in">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  </svg>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.02"
                    value={ambientVol}
                    onChange={handleVolume}
                    className="w-16 sm:w-20 h-1 appearance-none rounded-full cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #FFD700 ${ambientVol * 100}%, rgba(255,255,255,0.1) ${ambientVol * 100}%)`,
                    }}
                    title={`Volume: ${Math.round(ambientVol * 100)}%`}
                  />
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                </div>
              )}
            </div>

            {/* CTA */}
            <button
              onClick={scrollToWaitlist}
              className="btn-primary px-5 py-2.5 rounded-lg text-sm animate-glow-pulse"
            >
              Join Waitlist
            </button>
          </div>
        </div>
      </div>

      {/* Music bar animation keyframes */}
      <style>{`
        @keyframes musicBar {
          0% { height: 3px; }
          100% { height: 14px; }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
      `}</style>
    </nav>
  );
};

export default Navbar;
