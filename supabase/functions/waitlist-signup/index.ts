import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, wallet } = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 255) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sanitizedWallet = wallet ? String(wallet).slice(0, 100) : null;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if email already exists
    const { data: existing } = await supabase
      .from("waitlist_signups")
      .select("id, confirmed")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (existing?.confirmed) {
      return new Response(
        JSON.stringify({ error: "This email is already on the waitlist!" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let confirmationToken: string;

    if (existing) {
      // Re-send confirmation for unconfirmed signup
      const newToken = crypto.randomUUID();
      await supabase
        .from("waitlist_signups")
        .update({ confirmation_token: newToken, wallet: sanitizedWallet })
        .eq("id", existing.id);
      confirmationToken = newToken;
    } else {
      // Create new signup
      const { data, error } = await supabase
        .from("waitlist_signups")
        .insert({
          email: email.toLowerCase().trim(),
          wallet: sanitizedWallet,
        })
        .select("confirmation_token")
        .single();

      if (error) {
        console.error("DB insert error:", error);
        throw new Error("Failed to save signup");
      }
      confirmationToken = data.confirmation_token;
    }

    // Send confirmation email via Resend
    const confirmUrl = `https://reelbit.lovable.app/confirm?token=${confirmationToken}`;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ReelBit <onboarding@resend.dev>",
        to: [email.toLowerCase().trim()],
        subject: "Confirm your spot on the ReelBit waitlist 🎰",
        html: `
          <div style="background:#0A0A0A;color:#fff;padding:40px;font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <div style="text-align:center;margin-bottom:30px;">
              <h1 style="color:#00F5FF;font-size:28px;margin:0;">ReelBit</h1>
              <p style="color:#888;font-size:14px;">Own Your Slot. Launch. Pump. Earn.</p>
            </div>
            <div style="background:#111;border:1px solid #222;border-radius:12px;padding:30px;text-align:center;">
              <h2 style="color:#fff;margin-top:0;">Almost there! 🚀</h2>
              <p style="color:#aaa;line-height:1.6;">
                Click the button below to confirm your email and secure your spot on the ReelBit waitlist.
              </p>
              <a href="${confirmUrl}" style="display:inline-block;background:linear-gradient(135deg,#00F5FF,#0088CC);color:#000;font-weight:bold;padding:14px 32px;border-radius:8px;text-decoration:none;margin:20px 0;font-size:16px;">
                Confirm My Spot
              </a>
              <p style="color:#666;font-size:12px;margin-top:20px;">
                If you didn't sign up for ReelBit, you can safely ignore this email.
              </p>
            </div>
            <p style="color:#444;font-size:11px;text-align:center;margin-top:20px;">
              © ReelBit — The future of creator-owned slots
            </p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error("Resend error:", emailResponse.status, errorData);
      // Still return success since the signup was saved
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Signed up! Email confirmation may be delayed.",
          emailSent: false 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Check your email to confirm your spot!", emailSent: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Waitlist signup error:", error);
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
