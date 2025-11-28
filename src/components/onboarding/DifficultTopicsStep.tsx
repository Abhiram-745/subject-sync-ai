import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, TrendingUp, AlertCircle, Plus, X } from "lucide-react";
import { Subject, Topic } from "../OnboardingWizard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DifficultTopicsStepProps {
  subjects: Subject[];
  topics: Topic[];
  onAnalysisComplete: (analysis: any) => void;
  onSkip: () => void;
}

const DifficultTopicsStep = ({ subjects, topics, onAnalysisComplete, onSkip }: DifficultTopicsStepProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [difficultTopics, setDifficultTopics] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");

  const getSubjectName = (subjectId: string) => {
    const index = parseInt(subjectId);
    return subjects[index]?.name || "";
  };

  const analyzeTopics = async () => {
    if (difficultTopics.length === 0) {
      toast.error("Please select topics you find difficult or want to focus on");
      return;
    }

    setIsAnalyzing(true);
    try {
      const selectedTopicsData = topics
        .filter(t => difficultTopics.includes(t.name))
        .map(t => ({
          ...t,
          subject: getSubjectName(t.subject_id)
        }));

      const { data, error } = await supabase.functions.invoke('analyze-difficulty', {
        body: { topics: selectedTopicsData, focusTopics: difficultTopics }
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setAnalysis(data);
      onAnalysisComplete(data);
      toast.success("Analysis complete!");
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error("Failed to analyze topics. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getPriorityColor = (score: number) => {
    if (score >= 8) return "destructive";
    if (score >= 5) return "secondary";
    return "outline";
  };

  const availableTopics = topics.filter(
    (t) => t.subject_id === selectedSubject && !difficultTopics.includes(t.name)
  );

  const addDifficultTopic = () => {
    if (selectedTopic) {
      setDifficultTopics([...difficultTopics, selectedTopic]);
      setSelectedTopic("");
      toast.success("Topic added to focus list");
    }
  };

  const removeDifficultTopic = (topicName: string) => {
    setDifficultTopics(difficultTopics.filter((t) => t !== topicName));
  };

  const getTopicSubject = (topicName: string) => {
    const topic = topics.find((t) => t.name === topicName);
    return topic ? getSubjectName(topic.subject_id) : "";
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">AI Analysis</span>
        </div>
        <h3 className="text-2xl font-bold">Study Priority Analysis</h3>
        <p className="text-muted-foreground">
          Select topics you find difficult or want to focus on
        </p>
      </div>

      {!analysis && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              Topics I Find Difficult or Want to Focus On
            </CardTitle>
            <CardDescription>
              Select topics that are challenging or require extra attention. AI will analyze these to optimize your study schedule.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subject-select">Select Subject</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger id="subject-select">
                    <SelectValue placeholder="Choose a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedSubject && (
                <div className="space-y-2">
                  <Label htmlFor="topic-select">Select Topic</Label>
                  <Select
                    value={selectedTopic}
                    onValueChange={setSelectedTopic}
                    disabled={availableTopics.length === 0}
                  >
                    <SelectTrigger id="topic-select">
                      <SelectValue
                        placeholder={
                          availableTopics.length === 0
                            ? "No available topics"
                            : "Choose a topic"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTopics.map((topic, index) => (
                        <SelectItem key={index} value={topic.name}>
                          {topic.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <Button
              type="button"
              onClick={addDifficultTopic}
              disabled={!selectedTopic}
              className="w-full"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add to Focus List
            </Button>

            {difficultTopics.length > 0 && (
              <div className="space-y-2 mt-4">
                <Label>Your Focus Topics ({difficultTopics.length})</Label>
                <div className="space-y-2">
                  {difficultTopics.map((topicName, index) => {
                    const topic = topics.find((t) => t.name === topicName);
                    return (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{topicName}</p>
                          <p className="text-xs text-muted-foreground">
                            {getTopicSubject(topicName)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeDifficultTopic(topicName)}
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
          </CardContent>
        </Card>
      )}

      {isAnalyzing && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Analyzing {difficultTopics.length} focus topics...</p>
        </div>
      )}

      {analysis && (
        <div className="space-y-6">
          {/* Difficult Topics Results */}
          {analysis.difficult_topics && analysis.difficult_topics.length > 0 && (
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  Difficult Topics (Needs Extra Focus)
                </CardTitle>
                <CardDescription>
                  These topics have been identified as challenging and will receive more study time
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {analysis.difficult_topics.map((topic: any, index: number) => (
                  <div key={index} className="p-4 bg-muted rounded-lg space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-destructive">{topic.topic_name}</p>
                        <p className="text-sm text-muted-foreground mt-1">{topic.reason}</p>
                      </div>
                    </div>
                    <div className="p-3 bg-background/50 rounded border border-border">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Study Suggestion:</p>
                      <p className="text-sm">{topic.study_suggestion}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Priority Scores Section */}
          {analysis.priorities && analysis.priorities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Study Priorities
                </CardTitle>
                <CardDescription>
                  Priority scores help allocate study time effectively (1=low priority, 10=high priority)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {analysis.priorities
                  .sort((a: any, b: any) => b.priority_score - a.priority_score)
                  .map((item: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{item.topic_name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{item.reasoning}</p>
                      </div>
                      <Badge variant={getPriorityColor(item.priority_score)} className="ml-4">
                        Priority: {item.priority_score}/10
                      </Badge>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}

          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 inline mr-2" />
              This analysis will be used to create a smart timetable that allocates more time to challenging topics
            </p>
          </div>
        </div>
      )}

      {!analysis && !isAnalyzing && (
        <div className="flex gap-3">
          <Button
            onClick={onSkip}
            variant="outline"
            className="flex-1"
          >
            Skip this step
          </Button>
          <Button
            onClick={analyzeTopics}
            className="flex-1 bg-gradient-primary hover:opacity-90"
            disabled={difficultTopics.length === 0}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Analyze {difficultTopics.length} Focus Topics
          </Button>
        </div>
      )}
    </div>
  );
};

export default DifficultTopicsStep;
