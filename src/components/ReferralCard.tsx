import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Copy, Share2, Gift, Users, Clock, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { triggerConfetti, triggerEmoji } from "@/utils/celebrations";
import { motion } from "framer-motion";

interface ReferralData {
  code: string;
  validReferrals: number;
  premiumActive: boolean;
  premiumExpires?: string;
}

const ReferralCard = () => {
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get or create referral code
      let { data: codeData } = await supabase
        .from("referral_codes")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!codeData) {
        // Generate new code
        const { data: newCode } = await supabase.rpc("generate_referral_code");
        
        const { data: insertedCode } = await supabase
          .from("referral_codes")
          .insert({ user_id: user.id, code: newCode })
          .select()
          .single();
        
        codeData = insertedCode;
      }

      // Get valid referral count
      const { data: referralsData } = await supabase
        .from("referral_uses")
        .select("id")
        .eq("referral_code_id", codeData?.id)
        .eq("is_valid", true);

      // Check active premium grant
      const { data: premiumData } = await supabase
        .from("premium_grants")
        .select("*")
        .eq("user_id", user.id)
        .gte("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false })
        .maybeSingle();

      setReferralData({
        code: codeData?.code || "",
        validReferrals: referralsData?.length || 0,
        premiumActive: !!premiumData,
        premiumExpires: premiumData?.expires_at,
      });
    } catch (error) {
      console.error("Error fetching referral data:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    if (!referralData?.code) return;
    
    await navigator.clipboard.writeText(referralData.code);
    setCopied(true);
    toast.success("Referral code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferral = async () => {
    if (!referralData?.code) return;

    const shareText = `Join Vistari and get AI-powered revision timetables! Use my referral code: ${referralData.code}\n\n${window.location.origin}/auth?ref=${referralData.code}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Vistari",
          text: shareText,
        });
      } catch (error) {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast.success("Share link copied to clipboard!");
    }
  };

  const shareWhatsApp = () => {
    if (!referralData?.code) return;
    const text = encodeURIComponent(`Join Vistari and get AI-powered revision timetables! Use my referral code: ${referralData.code}\n\n${window.location.origin}/auth?ref=${referralData.code}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="h-20 bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  const progress = Math.min((referralData?.validReferrals || 0) / 5 * 100, 100);
  const referralsNeeded = Math.max(5 - (referralData?.validReferrals || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 p-1">
          <CardHeader className="bg-card rounded-t-lg pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Refer Friends</CardTitle>
              </div>
              {referralData?.premiumActive && (
                <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Premium Active
                </Badge>
              )}
            </div>
            <CardDescription>
              {referralData?.premiumActive 
                ? `Premium expires ${new Date(referralData.premiumExpires!).toLocaleDateString()}`
                : "Invite 5 friends to get 7 days free premium!"
              }
            </CardDescription>
          </CardHeader>
        </div>
        
        <CardContent className="space-y-4 pt-4">
          {/* Referral Code */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Your Referral Code</label>
            <div className="flex gap-2">
              <Input 
                value={referralData?.code || ""} 
                readOnly 
                className="font-mono text-lg font-bold tracking-wider text-center"
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={copyCode}
                className="shrink-0"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {referralData?.validReferrals || 0} / 5 friends joined
              </span>
              {referralsNeeded > 0 && (
                <span className="text-muted-foreground">{referralsNeeded} more needed</span>
              )}
            </div>
            <Progress value={progress} className="h-3" />
            {progress >= 100 && !referralData?.premiumActive && (
              <p className="text-sm text-green-600 font-medium animate-pulse">
                🎉 You've earned 7 days premium! Check your account.
              </p>
            )}
          </div>

          {/* Share Buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={shareReferral}
              className="flex-1 bg-gradient-primary"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share Link
            </Button>
            <Button 
              onClick={shareWhatsApp}
              variant="outline"
              className="bg-green-500/10 border-green-500/30 hover:bg-green-500/20"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-green-600">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </Button>
          </div>

          {/* Premium Info */}
          {referralData?.premiumActive && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm">
                Premium active until {new Date(referralData.premiumExpires!).toLocaleDateString()}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ReferralCard;
