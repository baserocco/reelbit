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
      return new Response(renderHTML("Invalid Link", "This confirmation link is invalid or expired.", false), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "text/html" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from("waitlist_signups")
      .update({ confirmed: true, confirmed_at: new Date().toISOString() })
      .eq("confirmation_token", token)
      .eq("confirmed", false)
      .select("email")
      .maybeSingle();

    if (error || !data) {
      return new Response(
        renderHTML("Already Confirmed", "This link has already been used, or is invalid. You're on the list! 🎉", true),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html" } }
      );
    }

    // Send welcome email via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
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
          subject: "You're in! Welcome to ReelBit 🎰🚀",
          html: `
            <div style="background:#0A0A0A;color:#fff;padding:40px;font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
              <div style="text-align:center;margin-bottom:30px;">
                <h1 style="color:#00F5FF;font-size:28px;margin:0;">ReelBit</h1>
              </div>
              <div style="background:#111;border:1px solid #222;border-radius:12px;padding:30px;text-align:center;">
                <h2 style="color:#FFD700;margin-top:0;">🎉 You're officially on the list!</h2>
                <p style="color:#aaa;line-height:1.6;">
                  Welcome to the ReelBit revolution. You'll be among the first to create your own real-money slot machine with AI.
                </p>
                <div style="background:#0A0A0A;border:1px solid #333;border-radius:8px;padding:16px;margin:20px 0;">
                  <p style="color:#00F5FF;font-size:14px;margin:0;">Your perks:</p>
                  <ul style="color:#ccc;text-align:left;line-height:2;font-size:13px;">
                    <li>Early access to AI slot builder</li>
                    <li>Bonus founder allocation</li>
                    <li>Priority visibility in ReelBit Casino</li>
                    <li>Lifetime higher revenue share (45% vs 35%)</li>
                  </ul>
                </div>
                <a href="https://x.com/ReelBit_fun" style="color:#00F5FF;font-size:13px;">Follow us on X for updates →</a>
              </div>
            </div>
          `,
        }),
      }).catch(console.error);
    }

    return new Response(
      renderHTML("Welcome to ReelBit! 🎰", `You're confirmed, ${data.email}! We'll email you when it's time to build your first slot.`, true),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html" } }
    );
  } catch (error) {
    console.error("Confirmation error:", error);
    return new Response(
      renderHTML("Error", "Something went wrong. Please try again or contact us.", false),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "text/html" } }
    );
  }
});

function renderHTML(title: string, message: string, success: boolean) {
  const color = success ? "#00F5FF" : "#FF4444";
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} — ReelBit</title>
  <style>
    body { margin:0; background:#0A0A0A; color:#fff; font-family:Arial,sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; }
    .card { background:#111; border:1px solid #222; border-radius:16px; padding:50px; text-align:center; max-width:460px; }
    h1 { color:${color}; font-size:24px; }
    p { color:#999; line-height:1.6; }
    a { display:inline-block; background:linear-gradient(135deg,#00F5FF,#0088CC); color:#000; font-weight:bold; padding:12px 28px; border-radius:8px; text-decoration:none; margin-top:20px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="https://reelbit.lovable.app">Back to ReelBit</a>
  </div>
</body>
</html>`;
}
