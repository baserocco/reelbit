import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";


interface ConfirmData {
  email: string;
  referral_code: string;
  referral_count: number;
  already_confirmed: boolean;
}

const ConfirmPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [data, setData] = useState<ConfirmData | null>(null);
  const [copied, setCopied] = useState(false);
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    const confirm = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/waitlist-confirm?token=${token}`,
          {
            headers: {
              "Content-Type": "application/json",
              "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
          }
        );

        const json = await response.json();

        if (json.error) {
          setStatus("error");
          return;
        }

        setData(json);
        setStatus("success");
      } catch {
        setStatus("error");
      }
    };

    confirm();
  }, [token]);

  const referralLink = data?.referral_code
    ? `https://reelbit.lovable.app/?ref=${data.referral_code}`
    : "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="glass-card p-10 text-center max-w-lg w-full">
        {status === "loading" && (
          <>
            <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-neon-cyan/30 border-t-neon-cyan animate-spin" />
            <h1 className="font-orbitron font-bold text-xl text-white mb-2">Confirming...</h1>
            <p className="text-white/50 font-inter text-sm">Verifying your spot on the waitlist.</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <svg className="w-7 h-7 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <h1 className="font-orbitron font-bold text-xl text-white mb-2">Invalid Link</h1>
            <p className="text-white/50 font-inter text-sm">This confirmation link is invalid or expired.</p>
            <a href="/" className="inline-block mt-6 btn-primary px-6 py-2 rounded-xl text-sm">
              Back to ReelBit
            </a>
          </>
        )}

        {status === "success" && data && (
          <>
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center">
              <svg className="w-7 h-7 text-neon-cyan" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <h1 className="font-orbitron font-bold text-2xl text-neon-cyan mb-2">
              {data.already_confirmed ? "Already Confirmed!" : "You're In!"}
            </h1>
            <p className="text-white/60 font-inter text-sm mb-8">
              {data.email} is confirmed on the waitlist. We'll notify you when it's time to build.
            </p>

            {/* Referral section */}
            <div className="bg-white/5 border border-neon-magenta/20 rounded-xl p-6 text-left space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neon-magenta/10 border border-neon-magenta/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-neon-magenta" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div>
                  <div className="font-orbitron font-bold text-white text-sm">Refer and Earn</div>
                  <div className="text-white/40 text-xs font-inter">
                    Earn 2% of referred creators' revenue for 3 months
                  </div>
                </div>
              </div>

              {/* Referral link */}
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  className="flex-1 px-3 py-2.5 rounded-lg bg-black/50 border border-white/10 text-white/70 font-inter text-xs focus:outline-none"
                />
                <button
                  onClick={handleCopy}
                  className="px-4 py-2.5 rounded-lg bg-neon-magenta/20 border border-neon-magenta/30 text-neon-magenta font-inter text-xs font-semibold hover:bg-neon-magenta/30 transition-colors flex-shrink-0"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>

              {/* Referral count */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <span className="text-white/40 text-xs font-inter">Your referrals</span>
                <span className="font-orbitron font-bold text-neon-gold text-lg">
                  {data.referral_count}
                </span>
              </div>
            </div>

            <a href="/" className="inline-block mt-6 btn-primary px-6 py-2 rounded-xl text-sm">
              Back to ReelBit
            </a>
          </>
        )}
      </div>
    </div>
  );
};

export default ConfirmPage;
