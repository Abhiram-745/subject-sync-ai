import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, Calendar, Clock, BookOpen } from "lucide-react";
import { Subject } from "../OnboardingWizard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SubjectsStepProps {
  subjects: Subject[];
  setSubjects: (subjects: Subject[]) => void;
}

const GCSE_SUBJECTS = [
  "Mathematics",
  "English Language",
  "English Literature",
  "Biology",
  "Chemistry",
  "Physics",
  "Combined Science",
  "History",
  "Geography",
  "French",
  "Spanish",
  "German",
  "Computer Science",
  "Business Studies",
  "Economics",
  "Psychology",
  "Sociology",
  "Religious Studies",
  "Art & Design",
  "Drama",
  "Music",
  "Physical Education",
  "Food Technology",
  "Design & Technology",
];

const EXAM_BOARDS = [
  "AQA",
  "Edexcel",
  "OCR",
  "WJEC",
  "CCEA",
  "Eduqas",
];

const SubjectsStep = ({ subjects, setSubjects }: SubjectsStepProps) => {
  const [subjectName, setSubjectName] = useState("");
  const [examBoard, setExamBoard] = useState("");
  const [mode, setMode] = useState<"short-term-exam" | "long-term-exam" | "no-exam">("long-term-exam");

  const addSubject = () => {
    if (subjectName.trim() && examBoard.trim()) {
      setSubjects([...subjects, { 
        id: crypto.randomUUID(),
        name: subjectName, 
        exam_board: examBoard,
        mode: mode
      }]);
      setSubjectName("");
      setExamBoard("");
      setMode("long-term-exam");
    }
  };

  const removeSubject = (index: number) => {
    setSubjects(subjects.filter((_, i) => i !== index));
  };

  const getModeInfo = (mode: Subject["mode"]) => {
    switch (mode) {
      case "short-term-exam":
        return { icon: Calendar, label: "Short-Term Exam Prep", color: "destructive", description: "1-4 weeks" };
      case "long-term-exam":
        return { icon: Clock, label: "Long-Term Exam Prep", color: "primary", description: "5-8+ weeks" };
      case "no-exam":
        return { icon: BookOpen, label: "No Exam Focus", color: "secondary", description: "Getting ahead on topics" };
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="subject-name">Subject</Label>
          <Select value={subjectName} onValueChange={setSubjectName}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select a subject" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {GCSE_SUBJECTS.map((subject) => (
                <SelectItem key={subject} value={subject}>
                  {subject}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="exam-board">Exam Board</Label>
          <Select value={examBoard} onValueChange={setExamBoard}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select exam board" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {EXAM_BOARDS.map((board) => (
                <SelectItem key={board} value={board}>
                  {board}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Mode Selection */}
      <div className="space-y-2">
        <Label>Study Mode for this Subject</Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(["short-term-exam", "long-term-exam", "no-exam"] as const).map((m) => {
            const info = getModeInfo(m);
            const Icon = info.icon;
            return (
              <Card
                key={m}
                className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                  mode === m ? "border-2 border-primary bg-primary/5" : "border"
                }`}
                onClick={() => setMode(m)}
              >
                <div className="flex flex-col items-center text-center gap-2">
                  <Icon className={`h-5 w-5 ${mode === m ? "text-primary" : "text-muted-foreground"}`} />
                  <div>
                    <p className={`text-sm font-medium ${mode === m ? "text-primary" : ""}`}>
                      {info.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{info.description}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Button
        type="button"
        onClick={addSubject}
        disabled={!subjectName.trim() || !examBoard.trim()}
        className="w-full bg-gradient-secondary hover:opacity-90"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Subject
      </Button>

      {subjects.length > 0 && (
        <div className="space-y-2">
          <Label>Your Subjects ({subjects.length})</Label>
          <div className="space-y-2">
            {subjects.map((subject, index) => {
              const info = getModeInfo(subject.mode);
              const Icon = info.icon;
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{subject.name}</p>
                      <Badge variant="outline" className="text-xs">
                        <Icon className="h-3 w-3 mr-1" />
                        {info.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{subject.exam_board}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSubject(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectsStep;
