import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Mail, RefreshCw } from "lucide-react";
import vistariLogo from "@/assets/vistari-logo.png";
import PageTransition from "@/components/PageTransition";

type AuthStep = "form" | "verification";

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  
  // Verification state
  const [authStep, setAuthStep] = useState<AuthStep>("form");
  const [verificationCode, setVerificationCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const checkBannedEmail = async (emailToCheck: string): Promise<{ isBanned: boolean; reason: string }> => {
    try {
      const { data: bannedData } = await supabase
        .from("banned_users")
        .select("id, reason")
        .eq("email", emailToCheck.toLowerCase())
        .maybeSingle();

      if (bannedData) {
        return { isBanned: true, reason: bannedData.reason || "This email has been banned." };
      }
      return { isBanned: false, reason: "" };
    } catch (error) {
      console.error("Ban check error:", error);
      return { isBanned: false, reason: "" };
    }
  };

  const validateEmail = async (emailToValidate: string): Promise<{ isValid: boolean; reason: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('validate-email', {
        body: { email: emailToValidate }
      });

      if (error) {
        console.error("Email validation error:", error);
        return { isValid: true, reason: "" };
      }

      return { 
        isValid: data?.isValid ?? true, 
        reason: data?.reason || "Email validation failed" 
      };
    } catch (error) {
      console.error("Email validation error:", error);
      return { isValid: true, reason: "" };
    }
  };

  const sendVerificationCode = async (targetEmail: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('send-verification-code', {
        body: { email: targetEmail }
      });

      if (error) {
        console.error("Send verification code error:", error);
        toast.error("Failed to send verification code", {
          description: "Please try again."
        });
        return false;
      }

      if (data?.error) {
        toast.error("Failed to send verification code", {
          description: data.error
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error("Send verification code error:", error);
      toast.error("Failed to send verification code");
      return false;
    }
  };

  const startResendCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Check if email is banned
    const banCheck = await checkBannedEmail(email);
    if (banCheck.isBanned) {
      setLoading(false);
      toast.error("Account creation blocked", {
        description: banCheck.reason,
      });
      return;
    }

    // Validate email using API
    const validationResult = await validateEmail(email);
    if (!validationResult.isValid) {
      setLoading(false);
      toast.error("Invalid email address", {
        description: validationResult.reason,
      });
      return;
    }

    // Send verification code
    const codeSent = await sendVerificationCode(email);
    if (!codeSent) {
      setLoading(false);
      return;
    }

    setLoading(false);
    setAuthStep("verification");
    startResendCooldown();
    toast.success("Verification code sent!", {
      description: "Check your email for the 6-digit code."
    });
  };

  const handleVerifyAndCreateAccount = async () => {
    if (verificationCode.length !== 6) {
      toast.error("Please enter the complete 6-digit code");
      return;
    }

    setVerifyLoading(true);

    try {
      // Verify the code
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-code', {
        body: { email, code: verificationCode }
      });

      if (verifyError) {
        setVerifyLoading(false);
        toast.error("Verification failed", {
          description: "Please try again."
        });
        return;
      }

      if (!verifyData?.valid) {
        setVerifyLoading(false);
        toast.error("Verification failed", {
          description: verifyData?.error || "Invalid code"
        });
        return;
      }

      // Code is valid - create the account
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (signUpError) {
        setVerifyLoading(false);
        toast.error(signUpError.message);
        return;
      }

      setVerifyLoading(false);
      toast.success("Account created successfully!", {
        description: "You can now sign in."
      });
      
      // Reset form
      setEmail("");
      setPassword("");
      setFullName("");
      setVerificationCode("");
      setAuthStep("form");
    } catch (error) {
      setVerifyLoading(false);
      console.error("Account creation error:", error);
      toast.error("Failed to create account");
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    
    setLoading(true);
    const codeSent = await sendVerificationCode(email);
    setLoading(false);
    
    if (codeSent) {
      startResendCooldown();
      setVerificationCode("");
      toast.success("New code sent!", {
        description: "Check your email for the new 6-digit code."
      });
    }
  };

  const handleBackToForm = () => {
    setAuthStep("form");
    setVerificationCode("");
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

    // Check if user is banned (by user_id OR email)
    if (data.user) {
      const { data: bannedData } = await supabase
        .from("banned_users")
        .select("id, reason")
        .or(`user_id.eq.${data.user.id},email.eq.${email.toLowerCase()}`)
        .maybeSingle();

      if (bannedData) {
        await supabase.auth.signOut();
        setLoading(false);
        toast.error("Your account has been banned", {
          description: bannedData.reason || "Please contact support if you believe this is an error.",
        });
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
      toast.success("Password reset email sent!", {
        description: "Check your inbox.",
      });
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
              {authStep === "verification" 
                ? "Enter the verification code sent to your email"
                : "AI-powered revision timetables for GCSE students"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {authStep === "verification" ? (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    We've sent a 6-digit code to
                  </p>
                  <p className="font-medium">{email}</p>
                </div>

                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={verificationCode}
                    onChange={setVerificationCode}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button
                  onClick={handleVerifyAndCreateAccount}
                  className="w-full bg-gradient-primary hover:opacity-90"
                  disabled={verifyLoading || verificationCode.length !== 6}
                >
                  {verifyLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify & Create Account
                </Button>

                <div className="flex flex-col items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleResendCode}
                    disabled={resendCooldown > 0 || loading}
                    className="text-sm"
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    {resendCooldown > 0 
                      ? `Resend code in ${resendCooldown}s` 
                      : "Resend code"
                    }
                  </Button>
                  
                  <Button
                    type="button"
                    variant="link"
                    onClick={handleBackToForm}
                    className="text-sm text-muted-foreground"
                  >
                    Use a different email
                  </Button>
                </div>
              </div>
            ) : (
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
                    <Button
                      type="submit"
                      className="w-full bg-gradient-primary hover:opacity-90"
                      disabled={loading}
                    >
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Continue
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default Auth;
