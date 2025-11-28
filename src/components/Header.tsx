import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Plus, Home, LogOut, Settings, User, Sparkles, BookOpen, Users, Moon, Sun, ClipboardList, CalendarClock, TrendingUp, Menu, Brain, HelpCircle, Crown, Gift } from "lucide-react";
import { toast } from "sonner";
import ProfileSettings from "./ProfileSettings";
import { useUserRole, useUsageLimits } from "@/hooks/useUserRole";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import vistariLogo from "@/assets/vistari-logo.png";

interface HeaderProps {
  onNewTimetable?: () => void;
}

const Header = ({ onNewTimetable }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showSettings, setShowSettings] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showTutorialConfirm, setShowTutorialConfirm] = useState(false);
  const [profile, setProfile] = useState<{ full_name?: string; avatar_url?: string; id: string } | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isAdmin, setIsAdmin] = useState(false);
  const { data: userRole } = useUserRole();
  const { data: usageLimits } = useUsageLimits();
  const isOnDashboard = location.pathname === "/";
  const isOnSocial = location.pathname === "/social";

  useEffect(() => {
    loadProfile();
    // Load theme from localStorage
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }

    // Set up realtime subscription for profile changes
    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          loadProfile();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const ADMIN_EMAILS = ['abhiramkakarla1@gmail.com', 'dhrishiv.panjabi@gmail.com'];

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Check if admin
      setIsAdmin(ADMIN_EMAILS.includes(user.email || ''));
      
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      
      if (data) {
        setProfile({ full_name: data.full_name || "", avatar_url: data.avatar_url || undefined, id: user.id });
      } else {
        // Create profile if doesn't exist - use email username as fallback
        const emailUsername = user.email?.split('@')[0] || "User";
        const fallbackName = user.user_metadata?.full_name || emailUsername;
        await supabase.from("profiles").insert({ 
          id: user.id, 
          full_name: fallbackName 
        });
        setProfile({ full_name: fallbackName, id: user.id });
      }
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
    toast.success("Signed out successfully");
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    localStorage.setItem("theme", newTheme);
    toast.success(`${newTheme === "dark" ? "Dark" : "Light"} mode enabled`);
  };

  const startGuidedTour = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Reset onboarding to events stage
    localStorage.setItem(`onboarding_stage_${user.id}`, "events");
    localStorage.removeItem(`onboarding_completed_${user.id}`);
    
    // Navigate to events to start tour
    navigate("/events");
    toast.success("Starting guided tour...");
    
    // Reload to trigger the guided tour
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleTutorialClick = () => {
    setShowTutorialConfirm(true);
  };

  const confirmStartTutorial = () => {
    setShowTutorialConfirm(false);
    startGuidedTour();
  };

  const getInitials = (name?: string) => {
    if (!name || name.trim() === "") return "U";
    return name
      .split(" ")
      .filter(n => n.length > 0)
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const NavigationItems = ({ onItemClick }: { onItemClick?: () => void }) => (
    <>
      {/* Early Supporters Event */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          const isDashboard = location.pathname === "/" || location.pathname === "/dashboard";
          if (isDashboard) {
            const scrollToReferrals = (attempts = 0) => {
              const element = document.getElementById("referrals-section");
              if (element) {
                element.scrollIntoView({ behavior: "smooth", block: "center" });
              } else if (attempts < 15) {
                setTimeout(() => scrollToReferrals(attempts + 1), 150);
              }
            };
            scrollToReferrals();
          } else {
            navigate("/#referrals");
          }
          onItemClick?.();
        }}
        className="justify-start gap-3 w-full px-3 py-3 hover:bg-gradient-to-r hover:from-orange-500/10 hover:to-amber-500/10 rounded-xl"
      >
        <Gift className="h-5 w-5 text-orange-500" />
        <div className="flex flex-col items-start">
          <span className="font-medium">Early Supporters</span>
          <span className="text-xs text-muted-foreground">Earn rewards</span>
        </div>
        <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-[10px] bg-orange-500/20 text-orange-600 border-none">
          Limited
        </Badge>
      </Button>

      <Separator className="my-2" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          navigate("/");
          onItemClick?.();
        }}
        className="justify-start gap-3 w-full px-3 py-3 hover:bg-primary/10 rounded-xl"
      >
        <Home className="h-5 w-5 text-primary" />
        <span className="font-medium">Dashboard</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          navigate("/timetables");
          onItemClick?.();
        }}
        className="justify-start gap-3 w-full px-3 py-3 hover:bg-primary/10 rounded-xl"
      >
        <Calendar className="h-5 w-5 text-primary" />
        <span className="font-medium">Timetables</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          navigate("/calendar");
          onItemClick?.();
        }}
        className="justify-start gap-3 w-full px-3 py-3 hover:bg-primary/10 rounded-xl"
      >
        <CalendarClock className="h-5 w-5 text-primary" />
        <span className="font-medium">Calendar</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          navigate("/homework");
          onItemClick?.();
        }}
        className="justify-start gap-3 w-full px-3 py-3 hover:bg-primary/10 rounded-xl"
      >
        <ClipboardList className="h-5 w-5 text-primary" />
        <span className="font-medium">Homework</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          navigate("/events");
          onItemClick?.();
        }}
        className="justify-start gap-3 w-full px-3 py-3 hover:bg-primary/10 rounded-xl"
      >
        <CalendarClock className="h-5 w-5 text-primary" />
        <span className="font-medium">Events</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          navigate("/test-scores");
          onItemClick?.();
        }}
        className="justify-start gap-3 w-full px-3 py-3 hover:bg-primary/10 rounded-xl"
      >
        <TrendingUp className="h-5 w-5 text-primary" />
        <span className="font-medium">Test Scores</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          navigate("/groups");
          onItemClick?.();
        }}
        className="justify-start gap-3 w-full px-3 py-3 hover:bg-primary/10 rounded-xl"
      >
        <Users className="h-5 w-5 text-primary" />
        <span className="font-medium">Study Groups</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          navigate("/social");
          onItemClick?.();
        }}
        className="justify-start gap-3 w-full px-3 py-3 hover:bg-primary/10 rounded-xl"
      >
        <Users className="h-5 w-5 text-primary" />
        <span className="font-medium">Social</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          navigate("/ai-insights");
          onItemClick?.();
        }}
        className="justify-start gap-3 w-full px-3 py-3 hover:bg-primary/10 rounded-xl"
      >
        <Brain className="h-5 w-5 text-primary" />
        <span className="font-medium">AI Insights</span>
      </Button>

      {isAdmin && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            navigate("/admin");
            onItemClick?.();
          }}
          className="justify-start gap-3 w-full px-3 py-3 hover:bg-primary/10 rounded-xl"
        >
          <Crown className="h-5 w-5 text-amber-500" />
          <span className="font-medium">Admin Panel</span>
        </Button>
      )}

      <Separator className="my-2" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          handleTutorialClick();
          onItemClick?.();
        }}
        className="justify-start gap-3 w-full px-3 py-3 hover:bg-primary/10 rounded-xl"
      >
        <HelpCircle className="h-5 w-5 text-primary" />
        <span className="font-medium">Tutorial</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          toggleTheme();
          onItemClick?.();
        }}
        className="justify-start gap-3 w-full px-3 py-3 hover:bg-primary/10 rounded-xl"
      >
        {theme === "light" ? (
          <Moon className="h-5 w-5 text-primary" />
        ) : (
          <Sun className="h-5 w-5 text-primary" />
        )}
        <span className="font-medium">{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
      </Button>

      {onNewTimetable && (
        <Button
          variant="default"
          size="sm"
          onClick={() => {
            onNewTimetable();
            onItemClick?.();
          }}
          className="justify-start gap-3 w-full px-3 py-3 mt-2"
        >
          <Sparkles className="h-5 w-5" />
          <span className="font-medium">New Timetable</span>
        </Button>
      )}
    </>
  );

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          {/* Logo */}
          <div
            onClick={() => navigate("/")}
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="relative logo-container group">
              <img
                src={vistariLogo}
                alt="Vistari Logo"
                className="h-10 w-10 object-contain transition-all duration-300 group-hover:scale-110"
              />
              <div className="logo-glow-subtle"></div>
            </div>
            <span className="text-xl font-bold gradient-text hidden sm:block">Vistari</span>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {/* Early Supporters Banner - Desktop */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const isDashboard = location.pathname === "/" || location.pathname === "/dashboard";
                if (isDashboard) {
                  const scrollToReferrals = (attempts = 0) => {
                    const element = document.getElementById("referrals-section");
                    if (element) {
                      element.scrollIntoView({ behavior: "smooth", block: "center" });
                    } else if (attempts < 15) {
                      setTimeout(() => scrollToReferrals(attempts + 1), 150);
                    }
                  };
                  scrollToReferrals();
                } else {
                  navigate("/#referrals");
                }
              }}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 hover:from-orange-500/20 hover:to-amber-500/20 transition-all group"
              title="Early Supporters - Refer friends to earn rewards!"
            >
              <Gift className="h-4 w-4 text-orange-500 group-hover:animate-bounce" />
              <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">Early Supporters</span>
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-orange-500/20 text-orange-600 border-none">
                Limited
              </Badge>
            </Button>

            {/* Tutorial Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTutorialClick}
              className="hidden xl:flex gap-1.5 hover:bg-gradient-primary/10 hover:text-primary transition-all"
              title="Start Guided Tour"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>

            {/* Theme Toggle - Desktop only */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="hidden xl:flex gap-1.5 hover:bg-primary/10 transition-all"
            >
              {theme === "light" ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Button>

            {/* New Timetable Button - Desktop only */}
            {onNewTimetable && (
              <Button
                variant="default"
                size="sm"
                onClick={onNewTimetable}
                className="hidden xl:flex gap-1.5 px-3 whitespace-nowrap"
              >
                <Sparkles className="h-4 w-4" />
                <span className="font-semibold text-sm">New Timetable</span>
              </Button>
            )}

            {/* Mobile Menu Button */}
            <Sheet open={showMobileMenu} onOpenChange={setShowMobileMenu}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="xl:hidden"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[320px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="text-left gradient-text">Navigation</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-2 mt-6 pb-8 overflow-y-auto max-h-[calc(100vh-8rem)]">
                  <NavigationItems onItemClick={() => setShowMobileMenu(false)} />
                </div>
              </SheetContent>
            </Sheet>

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="relative h-11 w-11 rounded-full hover:ring-2 hover:ring-primary/30 transition-all duration-300 hover:scale-110 hover:shadow-lg"
                >
                  <Avatar className="h-11 w-11 ring-2 ring-primary/30 shadow-md">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback className="bg-gradient-hero text-white font-bold text-sm">
                      {getInitials(profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-card shadow-sm animate-pulse"></div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                className="w-64 glass-card z-50 animate-scale-in rounded-2xl" 
                align="end" 
                forceMount
              >
                <DropdownMenuLabel className="font-normal p-3">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12 ring-2 ring-primary/30">
                      <AvatarImage src={profile?.avatar_url} />
                      <AvatarFallback className="bg-gradient-primary text-white font-semibold">
                        {getInitials(profile?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-semibold leading-none">
                        {profile?.full_name || "User"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        {userRole === "paid" ? "Premium Account" : "Free Account"}
                      </p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                
                {/* Usage Limits for Free Users */}
                {userRole === "free" && usageLimits && (
                  <>
                    <DropdownMenuSeparator className="bg-primary/10" />
                    <div className="px-3 py-3 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Daily Usage
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Timetable Creations</span>
                          <Badge variant={usageLimits.timetableCreations >= 1 ? "destructive" : "secondary"} className="text-xs">
                            {usageLimits.timetableCreations}/1
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Regenerations</span>
                          <Badge variant={usageLimits.timetableRegenerations >= 1 ? "destructive" : "secondary"} className="text-xs">
                            {usageLimits.timetableRegenerations}/1
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Daily Insights</span>
                          <Badge variant={usageLimits.dailyInsightsUsed ? "destructive" : "secondary"} className="text-xs">
                            {usageLimits.dailyInsightsUsed ? "Used" : "Available"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">AI Insights</span>
                          <Badge variant={usageLimits.aiInsightsGenerations >= 1 ? "destructive" : "secondary"} className="text-xs">
                            {usageLimits.aiInsightsGenerations}/1
                          </Badge>
                        </div>
                      </div>
                      <div className="pt-2">
                        <Button
                          onClick={() => navigate("/")}
                          size="sm"
                          className="w-full text-xs bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                        >
                          <Sparkles className="h-3 w-3 mr-1" />
                          Upgrade to Premium
                        </Button>
                      </div>
                    </div>
                  </>
                )}
                
                <DropdownMenuSeparator className="bg-primary/10" />
                <DropdownMenuItem
                  onClick={() => navigate("/")} 
                  className="cursor-pointer hover:bg-primary/10 transition-colors py-2.5"
                >
                  <Home className="mr-3 h-4 w-4 text-primary" />
                  <span className="font-medium">Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setShowSettings(true)} 
                  className="cursor-pointer hover:bg-primary/10 transition-colors py-2.5"
                >
                  <Settings className="mr-3 h-4 w-4 text-primary" />
                  <span className="font-medium">Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-primary/10" />
                <DropdownMenuItem 
                  onClick={handleSignOut} 
                  className="cursor-pointer text-destructive hover:bg-destructive/10 transition-colors py-2.5"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  <span className="font-medium">Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <AlertDialog open={showTutorialConfirm} onOpenChange={setShowTutorialConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restart Tutorial?</AlertDialogTitle>
            <AlertDialogDescription>
              Would you like to restart the guided tour? This will take you through all features step-by-step, starting from the Events page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStartTutorial}>Yes, Start Tutorial</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ProfileSettings
        open={showSettings}
        onOpenChange={setShowSettings}
        onProfileUpdate={loadProfile}
      />
    </>
  );
};

export default Header;
