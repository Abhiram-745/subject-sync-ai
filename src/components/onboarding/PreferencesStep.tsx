import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { StudyPreferences, DayTimeSlot } from "../OnboardingWizard";
import { Card } from "@/components/ui/card";

interface PreferencesStepProps {
  preferences: StudyPreferences;
  setPreferences: (prefs: StudyPreferences) => void;
}

const PreferencesStep = ({ preferences, setPreferences }: PreferencesStepProps) => {
  const weekDays = [
    { value: "monday", label: "Monday" },
    { value: "tuesday", label: "Tuesday" },
    { value: "wednesday", label: "Wednesday" },
    { value: "thursday", label: "Thursday" },
    { value: "friday", label: "Friday" },
    { value: "saturday", label: "Saturday" },
    { value: "sunday", label: "Sunday" },
  ];

  const toggleDay = (day: string) => {
    setPreferences({
      ...preferences,
      day_time_slots: preferences.day_time_slots.map((slot) =>
        slot.day === day ? { ...slot, enabled: !slot.enabled } : slot
      ),
    });
  };

  const updateTimeSlot = (day: string, field: 'startTime' | 'endTime', value: string) => {
    setPreferences({
      ...preferences,
      day_time_slots: preferences.day_time_slots.map((slot) =>
        slot.day === day ? { ...slot, [field]: value } : slot
      ),
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="daily-hours">Daily Study Hours (Target)</Label>
          <Input
            id="daily-hours"
            type="number"
            min="1"
            max="12"
            value={preferences.daily_study_hours}
            onChange={(e) =>
              setPreferences({
                ...preferences,
                daily_study_hours: parseInt(e.target.value) || 2,
              })
            }
          />
        </div>

        <div className="space-y-3">
          <Label>Session & Break Duration Mode</Label>
          <RadioGroup
            value={preferences.duration_mode}
            onValueChange={(value: "fixed" | "flexible") =>
              setPreferences({
                ...preferences,
                duration_mode: value,
              })
            }
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="flexible" id="flexible" />
              <Label htmlFor="flexible" className="font-normal cursor-pointer">
                Flexible - AI tailors session length based on task type (homework, focus topics, etc.)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="fixed" id="fixed" />
              <Label htmlFor="fixed" className="font-normal cursor-pointer">
                Fixed - Use specific durations for all sessions
              </Label>
            </div>
          </RadioGroup>
        </div>

        {preferences.duration_mode === "fixed" && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="session-duration">Session Duration (mins)</Label>
              <Input
                id="session-duration"
                type="number"
                min="15"
                max="120"
                value={preferences.session_duration}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    session_duration: parseInt(e.target.value) || 45,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="break-duration">Break Duration (mins)</Label>
              <Input
                id="break-duration"
                type="number"
                min="5"
                max="60"
                value={preferences.break_duration}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    break_duration: parseInt(e.target.value) || 15,
                  })
                }
              />
            </div>
          </div>
        )}

        {preferences.duration_mode === "flexible" && (
          <Card className="p-3 bg-muted">
            <p className="text-sm text-muted-foreground">
              With flexible mode, the AI will automatically adjust session lengths:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Homework: Uses exact estimated duration</li>
                <li>Focus topics: 60-90 minute sessions</li>
                <li>Regular topics: 30-45 minute sessions</li>
                <li>Breaks: 10-15 minutes between sessions</li>
              </ul>
            </p>
          </Card>
        )}

        <div className="space-y-3">
          <Label>Study Days & Time Periods</Label>
          <p className="text-sm text-muted-foreground">
            Select days and set specific time periods for each day
          </p>
          <div className="space-y-2">
            {weekDays.map((day) => {
              const slot = preferences.day_time_slots.find((s) => s.day === day.value);
              return (
                <Card key={day.value} className="p-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2 min-w-[120px]">
                      <Checkbox
                        id={day.value}
                        checked={slot?.enabled || false}
                        onCheckedChange={() => toggleDay(day.value)}
                      />
                      <label
                        htmlFor={day.value}
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        {day.label}
                      </label>
                    </div>
                    
                    {slot?.enabled && (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => updateTimeSlot(day.value, 'startTime', e.target.value)}
                          className="w-32"
                        />
                        <span className="text-sm text-muted-foreground">to</span>
                        <Input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) => updateTimeSlot(day.value, 'endTime', e.target.value)}
                          className="w-32"
                        />
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <Label>Morning Sessions (Before School)</Label>
          <p className="text-sm text-muted-foreground">
            Do you want to include morning study sessions in your timetable?
          </p>
          <Card className="p-3 space-y-3">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="before-school"
                  checked={preferences.study_before_school || false}
                  onCheckedChange={(checked) =>
                    setPreferences({
                      ...preferences,
                      study_before_school: !!checked,
                    })
                  }
                />
                <label
                  htmlFor="before-school"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Yes, create morning sessions before school (short homework sessions only)
                </label>
              </div>
              
              {preferences.study_before_school && (
                <div className="ml-6 flex items-center gap-2 pt-2">
                  <Input
                    type="time"
                    value={preferences.before_school_start || "07:00"}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        before_school_start: e.target.value,
                      })
                    }
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">to</span>
                  <Input
                    type="time"
                    value={preferences.before_school_end || "08:00"}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        before_school_end: e.target.value,
                      })
                    }
                    className="w-32"
                  />
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="during-lunch"
                  checked={preferences.study_during_lunch || false}
                  onCheckedChange={(checked) =>
                    setPreferences({
                      ...preferences,
                      study_during_lunch: !!checked,
                    })
                  }
                />
                <label
                  htmlFor="during-lunch"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Study during lunch time (15-20 min homework)
                </label>
              </div>
              
              {preferences.study_during_lunch && (
                <div className="ml-6 flex items-center gap-2 pt-2">
                  <Input
                    type="time"
                    value={preferences.lunch_start || "12:00"}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        lunch_start: e.target.value,
                      })
                    }
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">to</span>
                  <Input
                    type="time"
                    value={preferences.lunch_end || "12:30"}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        lunch_end: e.target.value,
                      })
                    }
                    className="w-32"
                  />
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="free-periods"
                checked={preferences.study_during_free_periods || false}
                onCheckedChange={(checked) =>
                  setPreferences({
                    ...preferences,
                    study_during_free_periods: !!checked,
                  })
                }
              />
              <label
                htmlFor="free-periods"
                className="text-sm font-medium leading-none cursor-pointer"
              >
                Study during free periods (short homework)
              </label>
            </div>
            
            <p className="text-xs text-muted-foreground pt-2 border-t">
              Morning, lunch, and free period sessions will only schedule quick homework tasks (15-25 mins), not full revision sessions. If unchecked, no sessions will be scheduled during these times.
            </p>
          </Card>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ai-notes">Notes for AI (Optional)</Label>
          <Textarea
            id="ai-notes"
            placeholder="Add any special instructions for the AI, like 'Exclude trigonometry topics as I've already revised them' or 'Focus more on evenings than mornings'"
            value={preferences.aiNotes || ""}
            onChange={(e) =>
              setPreferences({
                ...preferences,
                aiNotes: e.target.value,
              })
            }
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Tell the AI how you want your timetable structured - topics to exclude, time preferences, or any other custom requirements
          </p>
        </div>
      </div>
    </div>
  );
};

export default PreferencesStep;
