import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Joyride, { Step, CallBackProps, STATUS, ACTIONS } from "react-joyride";
import { supabase } from "@/integrations/supabase/client";

type OnboardingStage = 
  | "welcome"
  | "events"
  | "homework"
  | "timetable-create"
  | "timetable-features"
  | "completed";

interface GuidedOnboardingProps {
  onComplete?: () => void;
}

const GuidedOnboarding = ({ onComplete }: GuidedOnboardingProps) => {
  const [stage, setStage] = useState<OnboardingStage>("welcome");
  const [runTour, setRunTour] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  useEffect(() => {
    const checkAndStartTour = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const completedFlag = localStorage.getItem(`onboarding_completed_${user.id}`);
      if (completedFlag === "true") return;

      const visitedTabs = JSON.parse(localStorage.getItem(`onboarding_visited_tabs_${user.id}`) || "[]");
      const currentPath = location.pathname;

      // Map paths to tour stages
      let tourStage: OnboardingStage | null = null;
      if (currentPath === "/events" && !visitedTabs.includes("events")) {
        tourStage = "events";
      } else if (currentPath === "/homework" && !visitedTabs.includes("homework")) {
        tourStage = "homework";
      } else if (currentPath === "/timetables" && !visitedTabs.includes("timetables")) {
        tourStage = "timetable-create";
      } else if (currentPath === "/calendar" && !visitedTabs.includes("calendar")) {
        tourStage = "timetable-features";
      }

      if (tourStage) {
        setStage(tourStage);
        // Small delay to ensure DOM elements are ready
        setTimeout(() => {
          setSteps(getStepsForStage(tourStage!));
          setRunTour(true);
        }, 500);
      }
    };

    checkAndStartTour();
  }, [location.pathname]);

  const checkOnboardingStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if this is an existing user (has timetables already)
    const { data: existingTimetables } = await supabase
      .from("timetables")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    // If user has existing timetables, mark as completed and don't show tour
    if (existingTimetables && existingTimetables.length > 0) {
      localStorage.setItem(`onboarding_completed_${user.id}`, "true");
      setStage("completed");
      setRunTour(false);
      return;
    }

    // Check if onboarding already completed
    const completedFlag = localStorage.getItem(`onboarding_completed_${user.id}`);
    if (completedFlag === "true") {
      setStage("completed");
      setRunTour(false);
      return;
    }
    
    // New user without timetables - don't auto-start, wait for tab clicks
    setStage("completed");
    setRunTour(false);
  };


  const getStepsForStage = (tourStage: OnboardingStage): Step[] => {
    switch (tourStage) {
      case "events":
        return eventsOnboardingSteps;
      case "homework":
        return homeworkOnboardingSteps;
      case "timetable-create":
        return timetableCreateSteps;
      case "timetable-features":
        return timetableFeaturesSteps;
      default:
        return [];
    }
  };

  const markTabAsVisited = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const visitedTabs = JSON.parse(localStorage.getItem(`onboarding_visited_tabs_${user.id}`) || "[]");
    
    // Map stage to tab name
    let tabName = "";
    if (stage === "events") tabName = "events";
    else if (stage === "homework") tabName = "homework";
    else if (stage === "timetable-create") tabName = "timetables";
    else if (stage === "timetable-features") tabName = "calendar";

    if (tabName && !visitedTabs.includes(tabName)) {
      visitedTabs.push(tabName);
      localStorage.setItem(`onboarding_visited_tabs_${user.id}`, JSON.stringify(visitedTabs));
    }
  };

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRunTour(false);
      markTabAsVisited();
    }
  };
  const eventsOnboardingSteps: Step[] = [
    {
      target: "[data-tour='school-schedule']",
      content:
        "Welcome! Let's start by setting up your school schedule. Try entering an example, like leaving at 08:30 and returning at 15:30. This makes sure Vistari never schedules study sessions during school hours.",
      disableBeacon: true,
      placement: "bottom",
      spotlightPadding: 0,
    },
    {
      target: "[data-tour='add-event']",
      content:
        "Great! Now add another commitment like sports practice or music lessons. Click 'Add Event' and type in one real or example event so you can see how it appears in your timetable.",
      placement: "left",
      spotlightPadding: 20,
    },
    {
      target: "[data-tour='events-list']",
      content:
        "All your events appear here. You can edit or delete them anytime. Once you've added at least one event, click 'Next' to continue to homework.",
      placement: "top",
      spotlightPadding: 20,
    },
  ];

  const homeworkOnboardingSteps: Step[] = [
    {
      target: "[data-tour='add-homework']",
      content: "Perfect! Now let's add your homework assignments. Click 'Add Homework' and enter the subject, title, due date, and estimated duration. Vistari will schedule time to complete them!",
      disableBeacon: true,
      placement: "left",
      spotlightPadding: 20,
    },
    {
      target: "[data-tour='active-homework']",
      content: "Your active homework shows up here, sorted by due date. Add a few assignments, then click 'Next' to create your first AI-powered timetable!",
      placement: "top",
      spotlightPadding: 20,
    },
  ];

  const timetableCreateSteps: Step[] = [
    {
      target: "[data-tour='new-timetable']",
      content: "Excellent! Now for the exciting part - creating your AI-powered study timetable! Click 'New Timetable' and we'll walk you through each step to create the perfect personalized study plan.",
      disableBeacon: true,
      placement: "bottom",
      spotlightPadding: 20,
    },
  ];

  const timetableFeaturesSteps: Step[] = [
    {
      target: "[data-tour='session-card']",
      content: "Amazing! Your timetable is ready. Click on any study session to start a timer. The timer counts down and automatically asks for feedback when you're done.",
      disableBeacon: true,
      placement: "top",
      spotlightPadding: 20,
    },
    {
      target: "[data-tour='calendar-legend']",
      content: "Each color represents a different activity type: Red = events, Blue = revision, Green = homework, Yellow = test prep. This helps you see your day at a glance!",
      placement: "bottom",
      spotlightPadding: 20,
    },
    {
      target: "[data-tour='daily-insights']",
      content: "Check your daily insights panel to see your progress. The AI learns from your feedback and adapts future schedules to match your needs!",
      placement: "left",
      spotlightPadding: 20,
    },
    {
      target: "body",
      content: "Perfect! You're all set to begin your study journey with Vistari. Explore other sections like Social and Groups to connect with friends. Good luck! 🎉",
      placement: "center",
    },
  ];

  return (
    <>
      {runTour && (
        <Joyride
          steps={steps}
          run={runTour}
          continuous
          showProgress
          showSkipButton
          scrollToFirstStep
          disableScrolling={false}
          disableScrollParentFix={false}
          scrollOffset={100}
          spotlightClicks={true}
          disableOverlayClose={false}
          callback={handleJoyrideCallback}
          styles={{
        options: {
          primaryColor: "hsl(var(--primary))",
          textColor: "hsl(var(--foreground))",
          backgroundColor: "hsl(var(--card))",
          overlayColor: "transparent",
          arrowColor: "hsl(var(--card))",
          zIndex: 10000,
        },
        overlay: {
          backgroundColor: "transparent",
        },
        spotlight: {
          borderRadius: "18px",
          backgroundColor: "transparent",
          border: "2px solid rgba(255, 255, 255, 0.4)",
        },
        tooltip: {
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 10px 40px -10px rgba(0, 0, 0, 0.4)",
          fontSize: "15px",
        },
        tooltipContainer: {
          textAlign: "left",
        },
        tooltipTitle: {
          fontSize: "18px",
          fontWeight: 700,
          marginBottom: "8px",
        },
        tooltipContent: {
          fontSize: "14px",
          lineHeight: "1.6",
        },
        buttonNext: {
          backgroundColor: "hsl(var(--primary))",
          borderRadius: "10px",
          padding: "10px 20px",
          fontSize: "14px",
          fontWeight: 600,
          transition: "all 0.2s ease",
        },
        buttonBack: {
          color: "hsl(var(--muted-foreground))",
          marginRight: "12px",
          fontSize: "14px",
        },
        buttonSkip: {
          color: "hsl(var(--muted-foreground))",
          fontSize: "14px",
        },
      }}
      floaterProps={{
        disableAnimation: false,
        hideArrow: false,
        offset: 15,
        placement: "auto",
        styles: {
          floater: {
            filter: "none",
          },
          arrow: {
            length: 12,
            spread: 24,
          },
        },
      }}
    />
      )}
    </>
  );
};

export default GuidedOnboarding;
