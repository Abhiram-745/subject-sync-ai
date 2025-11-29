import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, BookOpen, CheckCircle2, Calendar, Coffee, FileText, Target, AlertCircle } from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, parseISO, addMinutes } from "date-fns";
import { DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Header from "@/components/Header";
import GuidedOnboarding from "@/components/tours/GuidedOnboarding";
import { useSectionTour } from "@/hooks/useSectionTour";
import PageTransition from "@/components/PageTransition";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CalendarItem {
  id: string;
  type: "session" | "event" | "homework";
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  color: string;
  data: any;
}

// Time slots for the grid (6 AM to 10 PM)
const TIME_SLOTS = Array.from({ length: 17 }, (_, i) => {
  const hour = i + 6;
  return `${hour.toString().padStart(2, '0')}:00`;
});

const HOUR_HEIGHT = 60; // pixels per hour

// Calculate position and height based on time
const getTimePosition = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  const totalMinutes = (hours - 6) * 60 + minutes;
  return (totalMinutes / 60) * HOUR_HEIGHT;
};

const getSessionHeight = (startTime: string, endTime: string) => {
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  const durationMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
  return Math.max((durationMinutes / 60) * HOUR_HEIGHT, 30);
};

// Get styles for different item types
const getItemStyles = (item: CalendarItem) => {
  if (item.type === "event") {
    return { bg: "bg-red-500", text: "text-white", icon: <AlertCircle className="h-3 w-3" /> };
  }
  if (item.type === "homework") {
    return { bg: "bg-purple-500", text: "text-white", icon: <FileText className="h-3 w-3" /> };
  }
  const sessionType = item.data?.type;
  if (sessionType === "homework") {
    return { bg: "bg-purple-500", text: "text-white", icon: <FileText className="h-3 w-3" /> };
  } else if (sessionType === "revision") {
    return { bg: "bg-blue-500", text: "text-white", icon: <BookOpen className="h-3 w-3" /> };
  } else if (sessionType === "break") {
    return { bg: "bg-slate-400", text: "text-white", icon: <Coffee className="h-3 w-3" /> };
  } else if (item.data?.testDate) {
    return { bg: "bg-orange-500", text: "text-white", icon: <Target className="h-3 w-3" /> };
  }
  return { bg: "bg-blue-500", text: "text-white", icon: <BookOpen className="h-3 w-3" /> };
};

// Draggable session item for time-based grid
const DraggableSession = ({ item }: { item: CalendarItem }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: item,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    top: `${getTimePosition(item.startTime)}px`,
    height: `${getSessionHeight(item.startTime, item.endTime)}px`,
    opacity: isDragging ? 0.5 : 1,
  };

  const styles = getItemStyles(item);
  const height = getSessionHeight(item.startTime, item.endTime);
  const isCompact = height < 50;

  return (
    <HoverCard openDelay={300}>
      <HoverCardTrigger asChild>
        <div
          ref={setNodeRef}
          style={style}
          {...listeners}
          {...attributes}
          className={`absolute left-1 right-1 rounded-md cursor-grab active:cursor-grabbing transition-all hover:shadow-lg hover:z-20 ${styles.bg} ${styles.text} px-2 py-1 overflow-hidden shadow-sm`}
        >
          {isCompact ? (
            <div className="flex items-center gap-1 h-full">
              {styles.icon}
              <p className="text-[10px] font-medium truncate flex-1">{item.title}</p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-1">
                {styles.icon}
                <p className="text-xs font-semibold truncate">{item.title}</p>
              </div>
              <p className="text-[10px] opacity-80 mt-0.5">{item.startTime} - {item.endTime}</p>
              {item.data?.subject && (
                <p className="text-[10px] opacity-70 truncate">{item.data.subject}</p>
              )}
            </div>
          )}
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-72 p-4 bg-card/95 backdrop-blur-sm z-50" side="right" align="start">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${styles.bg}`}>
              {styles.icon}
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{item.title}</p>
              <p className="text-xs text-muted-foreground capitalize">{item.data?.type || item.type}</p>
            </div>
          </div>
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{item.startTime} - {item.endTime}</span>
            </div>
            {item.data?.subject && (
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{item.data.subject}</span>
              </div>
            )}
            {item.data?.completed !== undefined && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`h-4 w-4 ${item.data.completed ? 'text-green-500' : 'text-muted-foreground'}`} />
                <span className="text-sm">{item.data.completed ? 'Completed' : 'Not completed'}</span>
              </div>
            )}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

// Droppable day column for time grid
const DroppableDay = ({ date, items }: { date: Date; items: CalendarItem[] }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: format(date, "yyyy-MM-dd"),
    data: { date },
  });

  const isToday = isSameDay(date, new Date());
  const dayItems = items.filter((item) => item.date === format(date, "yyyy-MM-dd"));

  return (
    <div
      ref={setNodeRef}
      className={`relative flex-1 min-w-[100px] border-r border-border/30 last:border-r-0 transition-colors ${
        isOver ? "bg-primary/10" : ""
      }`}
      style={{ height: `${TIME_SLOTS.length * HOUR_HEIGHT}px` }}
    >
      {/* Time slot lines */}
      {TIME_SLOTS.map((_, i) => (
        <div
          key={i}
          className="absolute left-0 right-0 border-t border-border/20"
          style={{ top: `${i * HOUR_HEIGHT}px` }}
        />
      ))}
      
      {/* Sessions */}
      {dayItems.map((item) => (
        <DraggableSession key={item.id} item={item} />
      ))}
      
      {/* Current time indicator */}
      {isToday && (
        <div
          className="absolute left-0 right-0 h-0.5 bg-red-500 z-30 pointer-events-none"
          style={{ top: `${getTimePosition(format(new Date(), 'HH:mm'))}px` }}
        >
          <div className="absolute -left-1 -top-1 w-2.5 h-2.5 rounded-full bg-red-500" />
        </div>
      )}
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
  const { viewedSections, handleSectionClick } = useSectionTour("calendar");

  useEffect(() => {
    fetchTimetables();
  }, []);

  useEffect(() => {
    if (selectedTimetableId) {
      fetchCalendarData();
    }
  }, [currentWeek, selectedTimetableId]);

  // Auto-trigger tour for first-time visitors
  useEffect(() => {
    if (!loading && timetables.length > 0 && !viewedSections.has("time-grid")) {
      setTimeout(() => handleSectionClick("time-grid"), 500);
    }
  }, [loading, timetables.length, viewedSections]);

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

      const eventItems: CalendarItem[] = (eventsData || []).map((event: any) => ({
        id: `event-${event.id}`,
        type: "event" as const,
        title: event.title,
        date: format(parseISO(event.start_time), "yyyy-MM-dd"),
        startTime: format(parseISO(event.start_time), "HH:mm"),
        endTime: format(parseISO(event.end_time), "HH:mm"),
        color: "red",
        data: event,
      }));

      // Fetch homework items
      const { data: homeworkData, error: homeworkError } = await supabase
        .from("homeworks")
        .select("*")
        .eq("user_id", user.id)
        .gte("due_date", weekStart)
        .lte("due_date", weekEnd);

      if (homeworkError) throw homeworkError;

      const homeworkItems: CalendarItem[] = (homeworkData || []).map((hw: any) => {
        const duration = hw.duration || 30;
        return {
          id: `homework-${hw.id}`,
          type: "homework" as const,
          title: hw.title,
          date: hw.due_date,
          startTime: "09:00",
          endTime: format(addMinutes(parseISO(`${hw.due_date}T09:00`), duration), "HH:mm"),
          color: "purple",
          data: {
            ...hw,
            type: "homework",
          },
        };
      });

      // Fetch timetable sessions
      const { data: timetableData, error: timetableError } = await supabase
        .from("timetables")
        .select("schedule")
        .eq("id", selectedTimetableId)
        .single();

      if (timetableError) throw timetableError;

      const sessionItems: CalendarItem[] = [];
      if (timetableData?.schedule) {
        const schedule = timetableData.schedule as Record<string, any[]>;
        
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
                title: session.topic || session.subject,
                date: format(sessionDate, "yyyy-MM-dd"),
                startTime: format(startTime, "HH:mm"),
                endTime: format(endTime, "HH:mm"),
                color: session.type === "homework" ? "purple" : session.type === "break" ? "gray" : "blue",
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

      setCalendarItems([...eventItems, ...homeworkItems, ...sessionItems]);
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
      } else if (draggedItem.type === "homework") {
        // Update homework due date
        await supabase
          .from("homeworks")
          .update({ due_date: newDate })
          .eq("id", draggedItem.data.id);

        toast.success("Homework rescheduled successfully");
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
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Loading calendar...</p>
          </div>
        </div>
      </div>
    );
  }

  if (timetables.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="p-8 flex flex-col items-center justify-center gap-4">
          <Calendar className="h-16 w-16 text-muted-foreground/50" />
          <p className="text-muted-foreground text-center">No timetables found. Create a timetable first to view your calendar.</p>
          <Button onClick={() => navigate("/timetables")}>
            Create Timetable
          </Button>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
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
                <p className="text-sm text-muted-foreground">
                  {format(currentWeek, "MMMM d")} - {format(addDays(currentWeek, 6), "MMMM d, yyyy")}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap" data-tour="week-navigation">
              {timetables.length > 0 && (
                <Select value={selectedTimetableId} onValueChange={setSelectedTimetableId}>
                  <SelectTrigger className="w-[180px]" data-tour="timetable-select">
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
              
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
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
          </div>

          {/* Legend at the top */}
          <Card data-tour="calendar-legend">
            <CardContent className="py-3 px-4">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="font-medium text-muted-foreground">Legend:</span>
                <div className="flex items-center gap-1.5">
                  <Badge className="bg-blue-500 hover:bg-blue-500 gap-1">
                    <BookOpen className="h-3 w-3" />
                    Revision
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge className="bg-purple-500 hover:bg-purple-500 gap-1">
                    <FileText className="h-3 w-3" />
                    Homework
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge className="bg-red-500 hover:bg-red-500 gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Events
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge className="bg-orange-500 hover:bg-orange-500 gap-1">
                    <Target className="h-3 w-3" />
                    Test Prep
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge className="bg-slate-400 hover:bg-slate-400 gap-1">
                    <Coffee className="h-3 w-3" />
                    Break
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calendar Grid */}
          <Card className="overflow-hidden" data-tour="time-grid">
            {/* Day Headers */}
            <div className="flex border-b bg-muted/30 sticky top-0 z-20">
              {/* Time column header */}
              <div className="w-16 flex-shrink-0 border-r border-border/30 p-2 text-center">
                <Clock className="h-4 w-4 mx-auto text-muted-foreground" />
              </div>
              {/* Day columns headers */}
              {weekDays.map((day) => {
                const isToday = isSameDay(day, new Date());
                return (
                  <div
                    key={format(day, "yyyy-MM-dd")}
                    className={`flex-1 min-w-[100px] text-center py-2 px-1 border-r border-border/30 last:border-r-0 ${
                      isToday ? "bg-primary/10" : ""
                    }`}
                  >
                    <p className={`text-xs font-medium uppercase tracking-wide ${
                      isToday ? "text-primary" : "text-muted-foreground"
                    }`}>
                      {format(day, "EEE")}
                    </p>
                    <p className={`text-lg font-bold mt-0.5 ${
                      isToday 
                        ? "bg-primary text-primary-foreground rounded-full w-8 h-8 mx-auto flex items-center justify-center" 
                        : ""
                    }`}>
                      {format(day, "d")}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Time Grid */}
            <ScrollArea className="h-[calc(100vh-320px)]">
              <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <div className="flex">
                  {/* Time axis */}
                  <div className="w-16 flex-shrink-0 border-r border-border/30 bg-muted/10">
                    {TIME_SLOTS.map((time) => (
                      <div
                        key={time}
                        className="text-[11px] text-muted-foreground text-right pr-2 relative"
                        style={{ height: `${HOUR_HEIGHT}px` }}
                      >
                        <span className="absolute -top-2 right-2">
                          {format(parseISO(`2024-01-01T${time}`), "h a")}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Day columns */}
                  <div className="flex flex-1">
                    {weekDays.map((day) => (
                      <DroppableDay
                        key={format(day, "yyyy-MM-dd")}
                        date={day}
                        items={calendarItems}
                      />
                    ))}
                  </div>
                </div>
                
                <DragOverlay>
                  {activeItem ? <DraggableSession item={activeItem} /> : null}
                </DragOverlay>
              </DndContext>
            </ScrollArea>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
};

export default CalendarView;
