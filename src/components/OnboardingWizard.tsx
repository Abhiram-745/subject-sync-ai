import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import TimetableModeStep, { TimetableMode } from "./onboarding/TimetableModeStep";
import SubjectsStep from "./onboarding/SubjectsStep";
import TopicsStep from "./onboarding/TopicsStep";
import DifficultTopicsStep from "./onboarding/DifficultTopicsStep";
import TestDatesStep from "./onboarding/TestDatesStep";
import PreferencesStep from "./onboarding/PreferencesStep";
import HomeworkStep, { Homework } from "./onboarding/HomeworkStep";
import TimetableDatesStep from "./onboarding/TimetableDatesStep";
import GenerateStep from "./onboarding/GenerateStep";

interface OnboardingWizardProps {
  onComplete: () => void;
  onCancel?: () => void;
}

export interface Subject {
  id?: string;
  name: string;
  exam_board: string;
  mode: "short-term-exam" | "long-term-exam" | "no-exam";
}

export interface Topic {
  id?: string;
  subject_id: string;
  name: string;
  confidence?: number;
  difficulties?: string;
}

export interface TestDate {
  id?: string;
  subject_id: string;
  test_date: string;
  test_type: string;
}

export interface DayTimeSlot {
  day: string;
  startTime: string;
  endTime: string;
  enabled: boolean;
}

export interface StudyPreferences {
  daily_study_hours: number;
  day_time_slots: DayTimeSlot[];
  break_duration: number;
  session_duration: number;
  duration_mode: "fixed" | "flexible";
  aiNotes?: string;
  study_before_school?: boolean;
  study_during_lunch?: boolean;
  study_during_free_periods?: boolean;
  before_school_start?: string;
  before_school_end?: string;
  lunch_start?: string;
  lunch_end?: string;
  free_period_times?: string[];
}

const OnboardingWizard = ({ onComplete, onCancel }: OnboardingWizardProps) => {
  const [step, setStep] = useState(1);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicAnalysis, setTopicAnalysis] = useState<any>(null);
  const [testDates, setTestDates] = useState<TestDate[]>([]);
  const [preferences, setPreferences] = useState<StudyPreferences>({
    daily_study_hours: 2,
    day_time_slots: [
      { day: "monday", startTime: "09:00", endTime: "17:00", enabled: true },
      { day: "tuesday", startTime: "09:00", endTime: "17:00", enabled: true },
      { day: "wednesday", startTime: "09:00", endTime: "17:00", enabled: true },
      { day: "thursday", startTime: "09:00", endTime: "17:00", enabled: true },
      { day: "friday", startTime: "09:00", endTime: "17:00", enabled: true },
      { day: "saturday", startTime: "09:00", endTime: "17:00", enabled: true },
      { day: "sunday", startTime: "09:00", endTime: "17:00", enabled: true },
    ],
    break_duration: 15,
    session_duration: 45,
    duration_mode: "flexible",
  });
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [timetableName, setTimetableName] = useState("My Study Timetable");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const totalSteps = 8;
  const progress = (step / totalSteps) * 100;

  const handleNext = () => {
    if (step < totalSteps) {
      // Skip test dates step if all subjects are no-exam mode
      if (step === 3 && subjects.every(s => s.mode === "no-exam")) {
        setStep(step + 2); // Skip step 4 (test dates)
      } else {
        setStep(step + 1);
      }
    }
  };

  const handleBack = () => {
    if (step === 1 && onCancel) {
      onCancel();
    } else if (step > 1) {
      // Skip test dates step if all subjects are no-exam mode when going back
      if (step === 5 && subjects.every(s => s.mode === "no-exam")) {
        setStep(step - 2); // Skip step 4 (test dates)
      } else {
        setStep(step - 1);
      }
    }
  };

  const stepTitles = [
    "Your GCSE Subjects",
    "Topics You're Studying",
    "Topics You Find Difficult",
    "Upcoming Test Dates",
    "Study Preferences",
    "Homework Assignments",
    "Timetable Period",
    "Generate Timetable",
  ];

  // Get timetableMode based on subjects - prioritize most urgent
  const timetableMode = subjects.some(s => s.mode === "short-term-exam") 
    ? "short-term-exam" 
    : subjects.some(s => s.mode === "long-term-exam")
    ? "long-term-exam"
    : "no-exam";

  return (
    <Card className="max-w-3xl mx-auto shadow-lg">
      <CardHeader>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Step {step} of {totalSteps}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        <CardTitle className="text-2xl">{stepTitles[step - 1]}</CardTitle>
        <CardDescription>
          {step === 1 && "Add the subjects you're taking and select the study mode for each"}
          {step === 2 && "Tell us which topics you're currently studying"}
          {step === 3 && "Select topics you find difficult and tell us why"}
          {step === 4 && "When are your tests scheduled?"}
          {step === 5 && "Set your study preferences"}
          {step === 6 && "Add any homework assignments to include in your timetable"}
          {step === 7 && "Choose when your timetable should start and end"}
          {step === 8 && "Review and generate your personalized timetable"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {step === 1 && (
          <SubjectsStep subjects={subjects} setSubjects={setSubjects} />
        )}
        {step === 2 && (
          <TopicsStep subjects={subjects} topics={topics} setTopics={setTopics} />
        )}
        {step === 3 && (
          <DifficultTopicsStep 
            subjects={subjects} 
            topics={topics}
            setTopics={setTopics}
            onAnalysisComplete={setTopicAnalysis}
            onSkip={handleNext}
          />
        )}
        {step === 4 && !subjects.every(s => s.mode === "no-exam") && (
          <TestDatesStep subjects={subjects} testDates={testDates} setTestDates={setTestDates} />
        )}
        {step === 5 && (
          <PreferencesStep preferences={preferences} setPreferences={setPreferences} />
        )}
        {step === 6 && (
          <HomeworkStep subjects={subjects} homeworks={homeworks} setHomeworks={setHomeworks} />
        )}
        {step === 7 && (
          <TimetableDatesStep
            timetableName={timetableName}
            setTimetableName={setTimetableName}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
          />
        )}
        {step === 8 && (
          <GenerateStep
            subjects={subjects}
            topics={topics}
            testDates={testDates}
            preferences={preferences}
            homeworks={homeworks}
            topicAnalysis={topicAnalysis}
            timetableMode={timetableMode}
            timetableName={timetableName}
            startDate={startDate}
            endDate={endDate}
            onComplete={onComplete}
          />
        )}

        {step !== 3 && (
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={handleBack}
            >
              Back
            </Button>
            {step < totalSteps && (
              <Button
                onClick={handleNext}
                className="bg-gradient-primary hover:opacity-90"
                disabled={
                  (step === 1 && subjects.length === 0) ||
                  (step === 2 && topics.length === 0) ||
                  (step === 4 && !subjects.every(s => s.mode === "no-exam") && testDates.length === 0) ||
                  (step === 7 && (!startDate || !endDate || !timetableName.trim()))
                }
              >
                Next
              </Button>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="flex justify-start pt-4">
            <Button
              variant="outline"
              onClick={handleBack}
            >
              Back
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OnboardingWizard;
