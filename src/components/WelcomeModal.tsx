import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, BookOpen, Users, Brain, Target, CheckCircle2, Play, ChevronRight, ChevronLeft, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import vistariLogo from "@/assets/vistari-logo.png";

const WelcomeModal = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    checkFirstLogin();
  }, []);

  const checkFirstLogin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const welcomeShown = localStorage.getItem(`welcome_shown_${user.id}`);
    
    if (!welcomeShown) {
      setTimeout(() => setOpen(true), 1000);
    }
  };

  const handleComplete = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      localStorage.setItem(`welcome_shown_${user.id}`, "true");
      localStorage.setItem(`onboarding_stage_${user.id}`, "events");
      localStorage.removeItem(`onboarding_completed_${user.id}`);
    }
    setOpen(false);
    
    // Navigate to events and reload to trigger tour
    navigate("/events");
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const features = [
    {
      icon: Sparkles,
      title: "AI-Powered Timetables",
      description: "Create personalized study schedules that adapt to your exams, homework, and learning pace.",
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
      iconBg: "bg-gradient-to-br from-cyan-400 to-blue-500",
    },
    {
      icon: BookOpen,
      title: "Smart Topic Tracking",
      description: "Track your progress across all subjects and topics with confidence ratings and mastery levels.",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      iconBg: "bg-gradient-to-br from-purple-400 to-pink-500",
    },
    {
      icon: Users,
      title: "Study Groups",
      description: "Create groups, share timetables, compete in challenges, and learn together with friends.",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      iconBg: "bg-gradient-to-br from-orange-400 to-red-500",
    },
    {
      icon: Brain,
      title: "AI Insights",
      description: "Get personalized recommendations based on your study patterns, peak hours, and performance.",
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10",
      iconBg: "bg-gradient-to-br from-indigo-400 to-purple-500",
    },
    {
      icon: Target,
      title: "Interactive Tutorials",
      description: "Guided tours in every section help you discover features and master the platform quickly.",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      iconBg: "bg-gradient-to-br from-green-400 to-emerald-500",
    },
  ];

  const steps = [
    {
      title: "Welcome to Vistari! 🎉",
      content: (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8 py-6"
        >
          <div className="text-center space-y-4">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/40 to-blue-500/40 rounded-full blur-2xl animate-pulse" />
              <div className="relative w-24 h-24 mx-auto">
                <img 
                  src={vistariLogo} 
                  alt="Vistari" 
                  className="w-full h-full object-cover rounded-2xl shadow-2xl"
                />
              </div>
            </motion.div>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-muted-foreground text-lg leading-relaxed max-w-md mx-auto"
            >
              Your AI-powered revision companion is ready to help you ace your GCSEs.
            </motion.p>
          </div>
          <div className="grid gap-3 max-w-lg mx-auto">
            {[
              { icon: "📚", text: "Generate AI-powered timetables in seconds", delay: 0.5 },
              { icon: "🎯", text: "Track progress across all subjects", delay: 0.6 },
              { icon: "👥", text: "Study with friends in groups", delay: 0.7 },
              { icon: "🧠", text: "Get personalized insights and recommendations", delay: 0.8 },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: item.delay, type: "spring" }}
                className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-card/80 to-card border border-border/50 hover:border-primary/30 transition-all hover:shadow-lg hover:scale-[1.02]"
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-sm font-medium">{item.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ),
    },
    {
      title: "Key Features",
      content: (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="space-y-4 py-6 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar"
        >
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex gap-4 p-5 rounded-2xl bg-gradient-to-br from-card/80 to-card/40 border border-border/50 hover:border-primary/30 transition-all hover:shadow-xl hover:scale-[1.02] group"
            >
              <motion.div 
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.6 }}
                className={`w-14 h-14 rounded-xl ${feature.iconBg} flex items-center justify-center flex-shrink-0 shadow-lg`}
              >
                <feature.icon className="h-7 w-7 text-white" />
              </motion.div>
              <div className="space-y-1.5 flex-1">
                <h4 className="font-semibold text-base group-hover:text-primary transition-colors">{feature.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      ),
    },
    {
      title: "Interactive Tutorials",
      content: (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="space-y-8 py-6"
        >
          <div className="text-center space-y-4">
            <motion.div 
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 150 }}
              className="mx-auto relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400/40 to-pink-500/40 rounded-full blur-2xl animate-pulse" />
              <div className="relative w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-2xl">
                <Play className="h-12 w-12 text-white" />
              </div>
            </motion.div>
            <motion.h3
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-xl font-display font-bold text-foreground mb-2"
            >
              Ready to Excel! 🎯
            </motion.h3>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-muted-foreground leading-relaxed"
            >
              Click "Start Guided Tour" to begin your journey through Vistari. We'll take you through each step with interactive arrows and tooltips:
            </motion.p>
            <motion.ul 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-4 space-y-2 text-sm text-muted-foreground"
            >
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                <strong>Events:</strong> Set up your schedule and add commitments
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                <strong>Homework:</strong> Add your assignments and deadlines
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                <strong>Timetable:</strong> Create your AI-powered study plan
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                <strong>Features:</strong> Learn to use sessions, feedback, and insights
              </li>
            </motion.ul>
          </div>
          
          <div className="space-y-4 max-w-lg mx-auto">
            {[
              {
                icon: Sparkles,
                title: "First Visit Tours",
                description: "Tutorials automatically appear when you visit a section for the first time",
                gradient: "from-cyan-500/10 to-blue-500/10",
                iconColor: "text-cyan-500",
                delay: 0.5
              },
              {
                icon: Target,
                title: "Reset Anytime",
                description: "Want to replay a tutorial? Reset them anytime from Profile Settings",
                gradient: "from-orange-500/10 to-red-500/10",
                iconColor: "text-orange-500",
                delay: 0.6
              }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: item.delay, type: "spring" }}
                className={`p-5 rounded-2xl bg-gradient-to-br ${item.gradient} border border-border/50 hover:border-primary/30 transition-all hover:shadow-lg hover:scale-[1.02]`}
              >
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <item.icon className={`h-4 w-4 ${item.iconColor}`} />
                  {item.title}
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 }}
            className="p-5 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 shadow-lg"
          >
            <p className="text-sm font-medium text-center flex items-center justify-center gap-2">
              <span className="text-2xl">💡</span>
              Take your time with each tutorial - they're designed to help you master Vistari!
            </p>
          </motion.div>
        </motion.div>
      ),
    },
  ];

  const currentStepData = steps[currentStep];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl max-h-[95vh] p-0 gap-0 overflow-hidden border-none shadow-2xl bg-gradient-to-br from-background via-background to-muted/30">
        {/* Close Button */}
        <button
          onClick={handleComplete}
          className="absolute right-4 top-4 z-50 rounded-full p-2 hover:bg-accent transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="relative px-8 pt-8 pb-6 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="text-3xl font-display font-bold gradient-text mb-2">
              {currentStepData.title}
            </h2>
          </motion.div>
        </div>

        {/* Content */}
        <div className="px-8 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentStepData.content}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-gradient-to-t from-muted/20 to-transparent">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {steps.map((_, idx) => (
              <motion.div
                key={idx}
                initial={false}
                animate={{
                  width: idx === currentStep ? 32 : 8,
                  backgroundColor: idx === currentStep 
                    ? "hsl(var(--primary))" 
                    : "hsl(var(--muted))",
                }}
                transition={{ duration: 0.3 }}
                className="h-2 rounded-full cursor-pointer hover:opacity-80"
                onClick={() => setCurrentStep(idx)}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="gap-2 hover:scale-105 transition-transform disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleComplete}
                className="hover:scale-105 transition-transform"
              >
                Skip
              </Button>
              
              <Button
                onClick={handleNext}
                className="bg-gradient-primary gap-2 hover:scale-105 transition-transform shadow-lg hover:shadow-xl"
              >
                {currentStep < steps.length - 1 ? (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Start Guided Tour
                    <CheckCircle2 className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Floating Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-purple-500/5 to-transparent rounded-full blur-3xl -z-10" />
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeModal;
