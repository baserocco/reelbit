import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const allowedOrigins = [
  "https://reelbit.lovable.app",
  "https://reelbit.fun",
  "https://id-preview--6c4ba71d-52e1-44c0-8e47-6f68383e1d33.lovable.app",
];

const baseCorsHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function getCorsHeaders(origin: string) {
  return { ...baseCorsHeaders, "Access-Control-Allow-Origin": origin };
}

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(identifier: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);
  if (!record || now > record.resetAt) {
    rateLimitStore.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (record.count >= maxRequests) return false;
  record.count++;
  return true;
}

serve(async (req) => {
  // Origin validation (needed for both OPTIONS and actual requests)
  const origin = req.headers.get("origin");
  if (!origin || !allowedOrigins.includes(origin)) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {

    // Rate limiting: 3 requests per IP per 5 minutes
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!checkRateLimit(clientIp, 3, 300000)) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { email, wallet, ref } = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 255) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sanitizedWallet: string | null = null;
    if (wallet) {
      const walletStr = String(wallet).trim();
      const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
      if (!solanaAddressRegex.test(walletStr)) {
        return new Response(
          JSON.stringify({ error: "Invalid Solana wallet address format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      sanitizedWallet = walletStr;
    }
    let sanitizedRef: string | null = null;
    if (ref) {
      const refStr = String(ref).trim();
      if (/^[a-f0-9]{8}$/i.test(refStr)) {
        sanitizedRef = refStr;
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Look up referrer if ref code provided
    let referrerId: string | null = null;
    if (sanitizedRef) {
      const { data: referrer } = await supabase
        .from("waitlist_signups")
        .select("id")
        .eq("referral_code", sanitizedRef)
        .maybeSingle();
      referrerId = referrer?.id || null;
    }

    // Check if email already exists
    const { data: existing } = await supabase
      .from("waitlist_signups")
      .select("id, confirmed")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (existing?.confirmed) {
      // Add artificial delay to match email-send timing and prevent enumeration
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
      return new Response(
        JSON.stringify({ success: true, message: "Check your email to confirm your spot!" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let confirmationToken: string;

    if (existing) {
      const newToken = crypto.randomUUID();
      await supabase
        .from("waitlist_signups")
        .update({ confirmation_token: newToken, confirmation_token_expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), wallet: sanitizedWallet, ...(referrerId ? { referred_by: referrerId } : {}) })
        .eq("id", existing.id);
      confirmationToken = newToken;
    } else {
      const { data, error } = await supabase
        .from("waitlist_signups")
        .insert({
          email: email.toLowerCase().trim(),
          wallet: sanitizedWallet,
          ...(referrerId ? { referred_by: referrerId } : {}),
        })
        .select("confirmation_token")
        .single();

      if (error) {
        console.error("DB insert failed:", { code: error.code, hint: error.hint });
        throw new Error("Failed to save signup");
      }
      confirmationToken = data.confirmation_token;
    }

    // Send confirmation email
    const confirmUrl = `https://reelbit.lovable.app/confirm?token=${confirmationToken}`;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ReelBit <noreply@reelbit.fun>",
        to: [email.toLowerCase().trim()],
        subject: "Confirm your spot on the ReelBit waitlist",
        html: `
          <div style="background:#0A0A0A;color:#fff;padding:40px;font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <div style="text-align:center;margin-bottom:30px;">
              <h1 style="color:#00F5FF;font-size:28px;margin:0;">ReelBit</h1>
              <p style="color:#888;font-size:14px;">Own Your Slot. Launch. Pump. Earn.</p>
            </div>
            <div style="background:#111;border:1px solid #222;border-radius:12px;padding:30px;text-align:center;">
              <h2 style="color:#fff;margin-top:0;">Almost there!</h2>
              <p style="color:#aaa;line-height:1.6;">
                Click the button below to confirm your email and secure your spot on the ReelBit waitlist.
              </p>
              <a href="${confirmUrl}" style="display:inline-block;background-color:#00C8DD;background:linear-gradient(135deg,#00F5FF,#0088CC);color:#000;font-weight:bold;padding:14px 32px;border-radius:8px;text-decoration:none;margin:20px 0;font-size:16px;">
                Confirm My Spot
              </a>
              <p style="color:#666;font-size:12px;margin-top:20px;">
                If you didn't sign up for ReelBit, you can safely ignore this email.
              </p>
            </div>
            <p style="color:#444;font-size:11px;text-align:center;margin-top:20px;">
              &copy; ReelBit &mdash; The future of creator-owned slots
            </p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      console.error("Resend error:", emailResponse.status);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Signed up! Email confirmation may be delayed."
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Check your email to confirm your spot!" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Waitlist signup error:", error instanceof Error ? error.message : "Unknown error");
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
