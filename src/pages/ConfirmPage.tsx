import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const ConfirmPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    // Redirect to edge function which returns HTML
    const confirmUrl = `https://jftnpnezdzzednknbphv.supabase.co/functions/v1/waitlist-confirm?token=${token}`;
    window.location.href = confirmUrl;
  }, [token]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="glass-card p-12 text-center max-w-md">
        {status === "loading" && (
          <>
            <div className="text-4xl mb-4 animate-spin">⟳</div>
            <h1 className="font-orbitron font-bold text-xl text-white mb-2">Confirming...</h1>
            <p className="text-white/50 font-inter text-sm">Redirecting to confirm your spot.</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="text-4xl mb-4">❌</div>
            <h1 className="font-orbitron font-bold text-xl text-white mb-2">Invalid Link</h1>
            <p className="text-white/50 font-inter text-sm">This confirmation link is invalid or expired.</p>
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
