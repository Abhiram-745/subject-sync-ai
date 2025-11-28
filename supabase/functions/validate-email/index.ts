import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// List of known disposable email domains
const DISPOSABLE_DOMAINS = [
  "mailinator.com", "10minutemail.com", "guerrillamail.com", "tempmail.com",
  "throwaway.email", "fakeinbox.com", "maildrop.cc", "yopmail.com",
  "temp-mail.org", "getnada.com", "mohmal.com", "dispostable.com",
  "trashmail.com", "mailnesia.com", "tempr.email", "tempail.com",
  "mytemp.email", "sharklasers.com", "guerrillamail.info", "spam4.me",
  "grr.la", "mailcatch.com", "tempinbox.com", "emailondeck.com",
  "fakemail.net", "mintemail.com", "spamgourmet.com", "mailexpire.com",
  "throwawaymail.com", "jetable.org", "trash-mail.com", "tmpmail.net",
  "tmpmail.org", "anonymbox.com", "tempomail.fr", "spamfree24.org",
  "dropmail.me", "mailsac.com", "inboxalias.com", "tmail.ws",
  "emkei.cz", "33mail.com", "spambog.com", "mailforspam.com",
  "crazymailing.com", "tempsky.com", "mail-temp.com", "fakemailgenerator.com",
];

// Suspicious patterns in email addresses
const SUSPICIOUS_PATTERNS = [
  /^[a-z0-9]{20,}@/, // 20+ random chars
  /^\d{8,}@/, // 8+ digits
  /test\d{3,}@/, // test + 3+ digits
  /^[a-z]{1,2}\d{5,}@/, // 1-2 letters + 5+ digits
  /^temp[_-]?\d+@/, // temp + digits
  /fake[_-]?\d+@/, // fake + digits
  /spam\d*@/, // spam + optional digits
  /^x{3,}/, // xxx... at start
  /^[qwerty]{6,}/, // keyboard patterns
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    
    if (!email) {
      return new Response(
        JSON.stringify({ isValid: false, reason: "No email provided", confidence: 100, flags: ["missing_email"] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailLower = email.toLowerCase().trim();
    const domain = emailLower.split("@")[1];
    const localPart = emailLower.split("@")[0];
    const flags: string[] = [];
    let confidence = 100;

    // Check disposable domain
    if (DISPOSABLE_DOMAINS.includes(domain)) {
      console.log(`[validate-email] Disposable domain detected: ${domain}`);
      return new Response(
        JSON.stringify({
          isValid: false,
          reason: "Disposable email addresses are not allowed",
          confidence: 100,
          flags: ["disposable_domain"]
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check suspicious patterns
    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (pattern.test(localPart) || pattern.test(emailLower)) {
        flags.push("suspicious_pattern");
        confidence -= 30;
        break;
      }
    }

    // Check for very short local part
    if (localPart.length < 3) {
      flags.push("short_local_part");
      confidence -= 20;
    }

    // Check for uncommon TLDs that are often used for temp emails
    const suspiciousTLDs = [".xyz", ".tk", ".ml", ".ga", ".cf", ".gq", ".top", ".click"];
    if (suspiciousTLDs.some(tld => domain.endsWith(tld))) {
      flags.push("suspicious_tld");
      confidence -= 25;
    }

    // Use Lovable AI for deeper analysis if flags exist
    if (flags.length > 0) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      
      if (LOVABLE_API_KEY) {
        try {
          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [
                {
                  role: "system",
                  content: `You are an email validation AI. Analyze if this email looks like a real person's email or a fake/temporary email created just for signing up. Consider:
1. Does the local part look like a real name or random characters?
2. Is the domain a well-known email provider or suspicious?
3. Are there patterns suggesting automation or spam?

Respond with JSON only: {"isFake": boolean, "reason": "brief explanation"}`
                },
                {
                  role: "user",
                  content: `Analyze this email: ${emailLower}`
                }
              ],
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const content = aiData.choices?.[0]?.message?.content || "";
            
            try {
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const analysis = JSON.parse(jsonMatch[0]);
                if (analysis.isFake) {
                  flags.push("ai_detected_fake");
                  confidence -= 40;
                }
              }
            } catch (parseError) {
              console.log("[validate-email] Could not parse AI response:", parseError);
            }
          }
        } catch (aiError) {
          console.error("[validate-email] AI analysis error:", aiError);
        }
      }
    }

    // Final determination
    const isValid = confidence > 40;
    
    console.log(`[validate-email] Result for ${emailLower}: valid=${isValid}, confidence=${confidence}, flags=${flags.join(",")}`);

    return new Response(
      JSON.stringify({
        isValid,
        reason: isValid ? "Email appears legitimate" : "Email appears suspicious or fake",
        confidence,
        flags
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[validate-email] Error:", error);
    return new Response(
      JSON.stringify({ isValid: true, reason: "Validation error, allowing email", confidence: 50, flags: ["error"] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
