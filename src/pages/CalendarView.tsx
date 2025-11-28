import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, BookOpen, CheckCircle2 } from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, parseISO, addMinutes } from "date-fns";
import { DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Header from "@/components/Header";
import GuidedOnboarding from "@/components/tours/GuidedOnboarding";

interface TimetableSession {
  date: string;
  sessions: {
    subject: string;
    topic: string;
    duration: number;
    startTime: string;
    endTime: string;
    type: string;
    completed?: boolean;
    sessionIndex: number;
  }[];
}

interface Event {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  parent_event_id: string | null;
}

interface CalendarItem {
  id: string;
  type: "session" | "event";
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  color: string;
  data: any;
}

// Minimal draggable item - Notion Calendar style
const DraggableItem = ({ item }: { item: CalendarItem }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: item,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const getItemStyles = () => {
    if (item.type === "event") {
      return {
        bg: "bg-red-500/90 dark:bg-red-600/90 hover:bg-red-600 dark:hover:bg-red-700",
        text: "text-white",
        icon: "⛔"
      };
    }
    
    const sessionType = item.data?.type;
    
    if (sessionType === "homework") {
      return {
        bg: "bg-purple-500/90 dark:bg-purple-600/90 hover:bg-purple-600 dark:hover:bg-purple-700",
        text: "text-white",
        icon: "📝"
      };
    } else if (sessionType === "revision") {
      return {
        bg: "bg-blue-500/90 dark:bg-blue-600/90 hover:bg-blue-600 dark:hover:bg-blue-700",
        text: "text-white",
        icon: "📚"
      };
    } else if (sessionType === "break") {
      return {
        bg: "bg-muted/70 hover:bg-muted/90",
        text: "text-muted-foreground",
        icon: "☕"
      };
    } else if (item.data?.testDate) {
      return {
        bg: "bg-orange-500/90 dark:bg-orange-600/90 hover:bg-orange-600 dark:hover:bg-orange-700",
        text: "text-white",
        icon: "🎯"
      };
    }
    
    return {
      bg: "bg-primary/80 dark:bg-primary/70 hover:bg-primary/90",
      text: "text-primary-foreground",
      icon: "📖"
    };
  };

  const styles = getItemStyles();

  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <div
          ref={setNodeRef}
          style={style}
          {...listeners}
          {...attributes}
          className={`mb-1.5 rounded-md cursor-move transition-all hover:shadow-md ${styles.bg} ${styles.text} px-2 py-1.5 flex items-center gap-1.5 min-h-[32px]`}
        >
          <span className="text-sm shrink-0">{styles.icon}</span>
          <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
            <p className="text-xs font-medium leading-tight truncate">{item.title}</p>
            <span className="text-[10px] font-medium opacity-80 shrink-0">{item.startTime}</span>
          </div>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-4 bg-background/95 backdrop-blur-sm z-50" side="right" align="start">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{styles.icon}</span>
            <div>
              <p className="text-sm font-bold text-foreground">{item.title}</p>
              <p className="text-xs text-muted-foreground">
                {item.type === "event" 
                  ? "Event" 
                  : item.data?.type === "homework" 
                  ? "Homework" 
                  : item.data?.type === "revision" 
                  ? "Revision"
                  : item.data?.type === "break"
                  ? "Break"
                  : "Study Session"}
              </p>
            </div>
          </div>
          
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{item.startTime} - {item.endTime}</span>
              {item.data?.duration && (
                <span className="text-xs text-muted-foreground">({item.data.duration} min)</span>
              )}
            </div>
            
            {item.data?.subject && (
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{item.data.subject}</span>
              </div>
            )}
            
            {item.data?.topic && (
              <p className="text-xs text-muted-foreground pl-6">{item.data.topic}</p>
            )}
            
            {item.data?.completed !== undefined && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`h-4 w-4 ${item.data.completed ? 'text-green-600' : 'text-muted-foreground'}`} />
                <span className={`text-sm ${item.data.completed ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
                  {item.data.completed ? 'Completed' : 'Not completed'}
                </span>
              </div>
            )}
            
            {item.data?.notes && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">{item.data.notes}</p>
              </div>
            )}
            
            {item.type === "event" && item.data?.description && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">{item.data.description}</p>
              </div>
            )}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

// Droppable day column - Notion Calendar style
const DroppableDay = ({ date, items, children }: { date: Date; items: CalendarItem[]; children?: React.ReactNode }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: format(date, "yyyy-MM-dd"),
    data: { date },
  });

  const isToday = isSameDay(date, new Date());
  const dayItems = items.filter((item) => item.date === format(date, "yyyy-MM-dd"));

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg p-2 min-h-[280px] transition-all ${
        isOver 
          ? "bg-primary/10 border-2 border-primary shadow-lg" 
          : isToday
          ? "bg-primary/5 border-2 border-primary/30"
          : "bg-card/50 border border-border/50"
      }`}
    >
      {/* Compact header */}
      <div className="mb-2 pb-1.5 border-b flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          {format(date, "EEE")}
        </span>
        <div className={`flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${
          isToday 
            ? "bg-primary text-primary-foreground" 
            : "text-foreground"
        }`}>
          {format(date, "d")}
        </div>
      </div>
      
      {/* Items list */}
      <div className="space-y-0.5">
        {dayItems
          .sort((a, b) => a.startTime.localeCompare(b.startTime))
          .map((item) => (
            <DraggableItem key={item.id} item={item} />
          ))}
      </div>
      
      {children}
    </div>
  );
};

const CalendarView = () => {
  const navigate = useNavigate();
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [timetables, setTimetables] = useState<any[]>([]);
  const [selectedTimetableId, setSelectedTimetableId] = useState<string>("");

  useEffect(() => {
    fetchTimetables();
  }, []);

  useEffect(() => {
    if (selectedTimetableId) {
      fetchCalendarData();
    }
  }, [currentWeek, selectedTimetableId]);

  const fetchTimetables = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("timetables")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      setTimetables(data || []);
      if (data && data.length > 0) {
        setSelectedTimetableId(data[0].id);
      } else {
        // No timetables found, stop loading
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching timetables:", error);
      toast.error("Failed to load timetables");
      setLoading(false);
    }
  };

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const weekStart = format(currentWeek, "yyyy-MM-dd");
      const weekEnd = format(addDays(currentWeek, 6), "yyyy-MM-dd");

      // Fetch events
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .eq("user_id", user.id)
        .gte("start_time", weekStart)
        .lte("start_time", weekEnd + "T23:59:59");

      if (eventsError) throw eventsError;

      const eventItems: CalendarItem[] = (eventsData || []).map((event: Event) => ({
        id: `event-${event.id}`,
        type: "event" as const,
        title: event.title,
        date: format(parseISO(event.start_time), "yyyy-MM-dd"),
        startTime: format(parseISO(event.start_time), "HH:mm"),
        endTime: format(parseISO(event.end_time), "HH:mm"),
        color: "red",
        data: event,
      }));

      // Fetch timetable sessions
      const { data: timetableData, error: timetableError } = await supabase
        .from("timetables")
        .select("schedule")
        .eq("id", selectedTimetableId)
        .single();

      if (timetableError) throw timetableError;

      const sessionItems: CalendarItem[] = [];
      if (timetableData?.schedule) {
        const schedule = timetableData.schedule as Record<string, TimetableSession["sessions"]>;
        
        Object.entries(schedule).forEach(([date, sessions]) => {
          const sessionDate = parseISO(date);
          if (sessionDate >= currentWeek && sessionDate <= addDays(currentWeek, 6)) {
            sessions.forEach((session: any, index: number) => {
              const startParts = session.time.split(":");
              const startTime = new Date(sessionDate);
              startTime.setHours(parseInt(startParts[0]), parseInt(startParts[1]));
              const endTime = addMinutes(startTime, session.duration);

              sessionItems.push({
                id: `session-${date}-${index}`,
                type: "session" as const,
                title: session.topic,
                date: format(sessionDate, "yyyy-MM-dd"),
                startTime: format(startTime, "HH:mm"),
                endTime: format(endTime, "HH:mm"),
                color: session.type === "homework" ? "purple" : "blue",
                data: {
                  ...session,
                  sessionIndex: index,
                  originalDate: date,
                },
              });
            });
          }
        });
      }

      setCalendarItems([...eventItems, ...sessionItems]);
    } catch (error) {
      console.error("Error fetching calendar data:", error);
      toast.error("Failed to load calendar data");
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const draggedItem = calendarItems.find((item) => item.id === active.id);
    if (!draggedItem) return;

    const newDate = over.id as string;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (draggedItem.type === "session") {
        // Update timetable session
        const { data: timetableData } = await supabase
          .from("timetables")
          .select("schedule")
          .eq("id", selectedTimetableId)
          .single();

        if (timetableData && timetableData.schedule) {
          const schedule: Record<string, any[]> = JSON.parse(JSON.stringify(timetableData.schedule));
          const oldDate = draggedItem.data.originalDate;
          const sessionIndex = draggedItem.data.sessionIndex;

          // Remove from old date
          if (schedule[oldDate]) {
            schedule[oldDate] = schedule[oldDate].filter((_: any, i: number) => i !== sessionIndex);
            if (schedule[oldDate].length === 0) {
              delete schedule[oldDate];
            }
          }

          // Add to new date
          if (!schedule[newDate]) {
            schedule[newDate] = [];
          }
          const sessionData = draggedItem.data;
          schedule[newDate].push({
            time: draggedItem.startTime,
            subject: sessionData.subject || "",
            topic: sessionData.topic || "",
            duration: sessionData.duration || 60,
            type: sessionData.type || "revision",
            notes: sessionData.notes || "",
          });

          await supabase
            .from("timetables")
            .update({ schedule })
            .eq("id", selectedTimetableId);

          toast.success("Session rescheduled successfully");
          fetchCalendarData();
        }
      } else if (draggedItem.type === "event") {
        // Update event
        const eventId = draggedItem.data.id;
        const [hours, minutes] = draggedItem.startTime.split(":").map(Number);
        const newStart = new Date(newDate);
        newStart.setHours(hours, minutes, 0, 0);
        
        const duration = (parseISO(draggedItem.data.end_time).getTime() - parseISO(draggedItem.data.start_time).getTime()) / 1000 / 60;
        const newEnd = addMinutes(newStart, duration);

        await supabase
          .from("events")
          .update({
            start_time: newStart.toISOString(),
            end_time: newEnd.toISOString(),
          })
          .eq("id", eventId);

        toast.success("Event rescheduled successfully");
        fetchCalendarData();
      }
    } catch (error) {
      console.error("Error rescheduling:", error);
      toast.error("Failed to reschedule");
    }
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));

  const activeItem = activeId ? calendarItems.find((item) => item.id === activeId) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="p-8 flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (timetables.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="p-8 flex flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">No timetables found. Create a timetable first to view your calendar.</p>
          <Button onClick={() => navigate("/timetables")}>
            Create Timetable
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Guided Onboarding Tour */}
      <GuidedOnboarding />
      
      <Header />
      
      <div className="p-4 md:p-6 space-y-4">
        {/* Header with navigation */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/timetables")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Calendar View</h1>
              <p className="text-sm text-muted-foreground">Week of {format(currentWeek, "MMM d")}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {timetables.length > 0 && (
              <Select value={selectedTimetableId} onValueChange={setSelectedTimetableId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select timetable" />
                </SelectTrigger>
                <SelectContent>
                  {timetables.map((tt) => (
                    <SelectItem key={tt.id} value={tt.id}>
                      {tt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Week grid */}
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => (
              <DroppableDay key={format(day, "yyyy-MM-dd")} date={day} items={calendarItems} />
            ))}
          </div>
          
          <DragOverlay>
            {activeItem ? <DraggableItem item={activeItem} /> : null}
          </DragOverlay>
        </DndContext>

        {/* Compact legend */}
        <Card className="p-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span>Revision</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-purple-500" />
              <span>Homework</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span>Events</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-orange-500" />
              <span>Test Prep</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-muted" />
              <span>Break</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CalendarView;
