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
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Confirm the signup
    const { data, error } = await supabase
      .from("waitlist_signups")
      .update({ confirmed: true, confirmed_at: new Date().toISOString() })
      .eq("confirmation_token", token)
      .eq("confirmed", false)
      .select("id, email, referral_code")
      .maybeSingle();

    if (error || !data) {
      // Maybe already confirmed — look up by token
      const { data: existing } = await supabase
        .from("waitlist_signups")
        .select("id, email, referral_code")
        .eq("confirmation_token", token)
        .maybeSingle();

      if (existing) {
        // Count referrals
        const { count } = await supabase
          .from("waitlist_signups")
          .select("id", { count: "exact", head: true })
          .eq("referred_by", existing.id);

        return new Response(
          JSON.stringify({
            success: true,
            already_confirmed: true,
            email: existing.email,
            referral_code: existing.referral_code,
            referral_count: count || 0,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Invalid or expired confirmation link." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Count referrals
    const { count } = await supabase
      .from("waitlist_signups")
      .select("id", { count: "exact", head: true })
      .eq("referred_by", data.id);

    // Send welcome email
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const referralLink = `https://reelbit.lovable.app/?ref=${data.referral_code}`;
    if (resendApiKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "ReelBit <noreply@reelbit.fun>",
          to: [data.email],
          subject: "You're in! Welcome to ReelBit",
          html: `
            <div style="background:#0A0A0A;color:#fff;padding:40px;font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
              <div style="text-align:center;margin-bottom:30px;">
                <h1 style="color:#00F5FF;font-size:28px;margin:0;">ReelBit</h1>
              </div>
              <div style="background:#111;border:1px solid #222;border-radius:12px;padding:30px;text-align:center;">
                <h2 style="color:#FFD700;margin-top:0;">You're officially on the list!</h2>
                <p style="color:#aaa;line-height:1.6;">
                  Welcome to the ReelBit revolution. You'll be among the first to create your own real-money slot machine with AI.
                </p>
                <div style="background:#0A0A0A;border:1px solid #333;border-radius:8px;padding:16px;margin:20px 0;">
                  <p style="color:#00F5FF;font-size:14px;margin:0;">Your perks:</p>
                  <ul style="color:#ccc;text-align:left;line-height:2;font-size:13px;">
                    <li>Early access to AI slot builder</li>
                    <li>Bonus founder allocation</li>
                    <li>Priority visibility in ReelBit Casino</li>
                    <li>+5% revenue boost for 6 months (35% vs 30%)</li>
                  </ul>
                </div>
                <div style="background:#0A0A0A;border:1px solid #FF00AA44;border-radius:8px;padding:16px;margin:20px 0;">
                  <p style="color:#FF00AA;font-size:14px;margin:0 0 8px 0;font-weight:bold;">Refer &amp; Earn</p>
                  <p style="color:#aaa;font-size:13px;margin:0 0 12px 0;">
                    Share your link and earn 2% of referred creators' revenue for 3 months.
                  </p>
                  <a href="${referralLink}" style="display:inline-block;background:#111;border:1px solid #333;color:#00F5FF;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:13px;word-break:break-all;">
                    ${referralLink}
                  </a>
                </div>
                <a href="https://x.com/ReelBit_fun" style="color:#00F5FF;font-size:13px;">Follow us on X for updates</a>
              </div>
            </div>
          `,
        }),
      }).catch(console.error);
    }

    return new Response(
      JSON.stringify({
        success: true,
        already_confirmed: false,
        email: data.email,
        referral_code: data.referral_code,
        referral_count: count || 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Confirmation error:", error);
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
