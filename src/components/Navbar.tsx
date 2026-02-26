import { useState, useEffect } from "react";
import reelbitLogo from "@/assets/reelbit-logo.png";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToWaitlist = () => {
    document.getElementById("waitlist-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

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
                className="relative h-9 w-9 rounded-lg object-contain"
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

          {/* CTA */}
          <button
            onClick={scrollToWaitlist}
            className="btn-primary px-5 py-2.5 rounded-lg text-sm animate-glow-pulse"
          >
            Join Waitlist
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
