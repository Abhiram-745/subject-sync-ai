import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Gift } from "lucide-react";
import vistariLogo from "@/assets/vistari-logo.png";
import PageTransition from "@/components/PageTransition";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [referralCode, setReferralCode] = useState(searchParams.get("ref") || "");
  const [resetEmail, setResetEmail] = useState("");
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [validatingEmail, setValidatingEmail] = useState(false);

  const validateEmail = async (emailToValidate: string): Promise<{ isValid: boolean; reason: string }> => {
    try {
      const response = await supabase.functions.invoke("validate-email", {
        body: { email: emailToValidate },
      });

      if (response.error) {
        console.error("Email validation error:", response.error);
        return { isValid: true, reason: "Validation skipped" };
      }

      return response.data as { isValid: boolean; reason: string };
    } catch (error) {
      console.error("Email validation error:", error);
      return { isValid: true, reason: "Validation error" };
    }
  };

  const processReferral = async (userId: string, email: string, validation: { isValid: boolean; reason: string }) => {
    if (!referralCode.trim()) return;

    try {
      // Find the referral code
      const { data: codeData, error: codeError } = await supabase
        .from("referral_codes")
        .select("id, user_id")
        .eq("code", referralCode.toUpperCase().trim())
        .maybeSingle();

      if (codeError || !codeData) {
        console.log("Invalid referral code:", referralCode);
        return;
      }

      // Don't allow self-referral
      if (codeData.user_id === userId) {
        console.log("Self-referral attempted");
        return;
      }

      // Record the referral
      await supabase.from("referral_uses").insert({
        referral_code_id: codeData.id,
        referred_user_id: userId,
        is_valid: validation.isValid,
        validation_reason: validation.reason,
      });

      // Check if referrer should get premium
      if (validation.isValid) {
        await supabase.rpc("check_and_grant_referral_premium", {
          _user_id: codeData.user_id,
        });
      }

      console.log("Referral processed:", { userId, referralCode, isValid: validation.isValid });
    } catch (error) {
      console.error("Error processing referral:", error);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setValidatingEmail(true);

    // Validate email first
    const validation = await validateEmail(email);
    setValidatingEmail(false);

    if (!validation.isValid) {
      setLoading(false);
      toast.error(validation.reason || "This email address is not allowed. Please use a valid email.");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    // Process referral if user was created
    if (data.user) {
      await processReferral(data.user.id, email, validation);
    }

    setLoading(false);
    toast.success("Account created! You can now log in.");
    setEmail("");
    setPassword("");
    setFullName("");
    setReferralCode("");
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    // Check if user is banned
    if (data.user) {
      const { data: bannedData } = await supabase
        .from("banned_users")
        .select("id")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (bannedData) {
        await supabase.auth.signOut();
        setLoading(false);
        toast.error("Your account has been banned by an administrator. Please contact support.");
        return;
      }
    }

    setLoading(false);
    navigate("/dashboard");
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth`,
    });

    setResetLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password reset email sent! Check your inbox.");
      setResetEmail("");
      setResetDialogOpen(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-background p-4">
        <div className="absolute top-4 left-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </div>
        
        <Card className="w-full max-w-md shadow-lg max-h-[90vh] overflow-y-auto">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <img 
                  src={vistariLogo} 
                  alt="Vistari" 
                  className="h-20 w-20 object-cover rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300" 
                />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold gradient-text">Vistari</CardTitle>
            <CardDescription>
              AI-powered revision timetables for GCSE students
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-primary hover:opacity-90"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                  
                  <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        type="button"
                        variant="link"
                        className="w-full text-sm text-muted-foreground hover:text-foreground"
                      >
                        Forgot your password?
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogDescription>
                          Enter your email address and we'll send you a link to reset your password.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handlePasswordReset} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="reset-email">Email</Label>
                          <Input
                            id="reset-email"
                            type="email"
                            placeholder="your@email.com"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            required
                          />
                        </div>
                        <Button
                          type="submit"
                          className="w-full bg-gradient-primary hover:opacity-90"
                          disabled={resetLoading}
                        >
                          {resetLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Send Reset Link
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="referral-code" className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-primary" />
                      Referral Code (Optional)
                    </Label>
                    <Input
                      id="referral-code"
                      type="text"
                      placeholder="VIS12345"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      className="font-mono tracking-wider"
                    />
                    <p className="text-xs text-muted-foreground">
                      Got a code from a friend? Enter it here!
                    </p>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-primary hover:opacity-90"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {validatingEmail ? "Validating email..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default Auth;
