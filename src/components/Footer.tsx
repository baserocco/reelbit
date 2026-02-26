import reelbitLogo from "@/assets/reelbit-logo.png";

const Footer = () => {
  return (
    <footer className="relative border-t border-white/5 bg-black">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10 text-center md:text-left">
          {/* Brand */}
          <div className="flex flex-col items-center md:items-start">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-lg blur-sm bg-neon-cyan/20" />
                <img
                  src={reelbitLogo}
                  alt="ReelBit"
                  className="relative h-8 w-8 rounded-lg object-contain"
                />
              </div>
              <span className="font-orbitron font-bold text-lg">
                <span className="text-white">Reel</span>
                <span className="text-red-500">Bit</span>
              </span>
            </div>
            <p className="text-white/40 font-inter text-sm leading-relaxed max-w-xs">
              The first platform where anyone can launch, own, and earn from their own real-money slot machine.
            </p>
          </div>

          {/* Social */}
          <div className="flex flex-col items-center md:items-start">
            <h4 className="font-orbitron font-semibold text-white text-sm mb-4 tracking-wider uppercase">
              Community
            </h4>
            <div className="space-y-2">
              <a
                href="https://twitter.com/ReelBit_fun"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white/50 hover:text-neon-cyan transition-colors duration-200 font-inter text-sm group"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span className="group-hover:underline">@ReelBit_fun</span>
              </a>
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-col items-center md:items-start">
            <h4 className="font-orbitron font-semibold text-white text-sm mb-4 tracking-wider uppercase">
              Legal
            </h4>
            <div className="space-y-2">
              {["About", "Terms", "Privacy", "Contact"].map((link) => (
                <a
                  key={link}
                  href="#"
                  className="block text-white/40 hover:text-white/70 transition-colors duration-200 font-inter text-sm"
                >
                  {link}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="section-divider mb-8" />

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <p className="text-white/25 font-inter text-xs">
            © 2025 ReelBit. All rights reserved.
          </p>
          <p className="text-white/20 font-inter text-xs max-w-xl md:text-right leading-relaxed">
            ⚠️ Waitlist only — real-money features coming soon. Gambling involves risk. Must be 18+ to participate. Play responsibly.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
