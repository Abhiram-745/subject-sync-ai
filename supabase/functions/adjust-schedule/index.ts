import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { timetableId, currentDate, reflection, completedSessionIndices, incompleteSessions } = await req.json();

    console.log('Adjust schedule request:', {
      timetableId,
      currentDate,
      reflectionLength: reflection?.length || 0,
      completedCount: completedSessionIndices?.length || 0,
      incompleteCount: incompleteSessions?.length || 0
    });

    // Fetch the timetable
    const { data: timetable, error: timetableError } = await supabase
      .from('timetables')
      .select('*')
      .eq('id', timetableId)
      .eq('user_id', user.id)
      .single();

    if (timetableError || !timetable) {
      console.error('Timetable error:', timetableError);
      return new Response(JSON.stringify({ error: 'Timetable not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all homework to match against mentions in reflection
    const { data: homeworkList, error: homeworkError } = await supabase
      .from('homeworks')
      .select('*')
      .eq('user_id', user.id)
      .eq('completed', false);

    // Fetch all events to match against mentions
    const { data: eventsList, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', user.id);

    const schedule = timetable.schedule as Record<string, any[]>;
    const currentDateObj = new Date(currentDate);
    
    // Get all dates after current date within timetable range
    const endDate = new Date(timetable.end_date);
    const futureDates = Object.keys(schedule)
      .filter(date => {
        const d = new Date(date);
        return d > currentDateObj && d <= endDate;
      })
      .sort();

    if (futureDates.length === 0 || incompleteSessions.length === 0) {
      return new Response(JSON.stringify({
        message: 'No future dates available or no incomplete sessions',
        updatedSchedule: schedule
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build comprehensive context for AI
    const futureScheduleDetails = futureDates.slice(0, 7).map(date => {
      const sessions = schedule[date] || [];
      return {
        date,
        sessionCount: sessions.length,
        sessions: sessions.map((s: any) => ({
          time: s.time,
          subject: s.subject,
          topic: s.topic,
          duration: s.duration,
          type: s.type
        }))
      };
    });

    // Use AI to intelligently reschedule
    const prompt = `You are an expert study scheduling AI that reorganizes entire schedules based on student needs, progress, and preferences.

**CONTEXT**
Current Date: ${currentDate}
Student's Reflection: "${reflection || 'No reflection provided'}"

**INCOMPLETE SESSIONS FROM TODAY**
${JSON.stringify(incompleteSessions, null, 2)}

**AVAILABLE HOMEWORK** (Match these EXACTLY if student mentions them - use the correct subject!)
${JSON.stringify(homeworkList?.map(h => ({
  subject: h.subject,
  title: h.title,
  description: h.description,
  dueDate: h.due_date,
  duration: h.duration
})) || [], null, 2)}

**UPCOMING EVENTS** (Consider these when scheduling)
${JSON.stringify(eventsList?.map(e => ({
  title: e.title,
  description: e.description,
  startTime: e.start_time,
  endTime: e.end_time
}))?.slice(0, 10) || [], null, 2)}

**TEST DAY CHECK**
${timetable.test_dates && Array.isArray(timetable.test_dates) && timetable.test_dates.length > 0 ?
  (() => {
    const currentDateStr = currentDate.split('T')[0];
    const isTestDay = timetable.test_dates.some((test: any) => test.test_date === currentDateStr);
    if (isTestDay) {
      return `CRITICAL: Today is a TEST DAY. Do NOT schedule any study sessions for today. The user cannot study on test days.`;
    }
    
    // Show upcoming test days
    const upcomingTests = timetable.test_dates
      .filter((test: any) => new Date(test.test_date) >= new Date(currentDateStr))
      .slice(0, 5);
    if (upcomingTests.length > 0) {
      return `Upcoming test days (DO NOT schedule study sessions on these dates):
${upcomingTests.map((test: any) => `- ${test.test_date}: ${test.subject} ${test.test_type} [BLOCKED]`).join('\n')}`;
    }
    return '';
  })()
: ''}

**CURRENT SCHEDULE (Next 7 Days)**
${JSON.stringify(futureScheduleDetails, null, 2)}

**YOUR MISSION**
Analyze the student's reflection and reorganize their entire upcoming schedule to:
1. **Prioritize** what the student needs most based on their feedback
2. **Reschedule** incomplete tasks from today to optimal future slots
3. **Add** any new tasks/homework the student mentioned (match EXACTLY from homework list)
4. **Remove** tasks the student wants to skip or postpone
5. **Rebalance** the workload across days to prevent overload
6. **Optimize** timing based on task difficulty and available energy

**CRITICAL RULES**
✓ When student mentions a task (e.g. "metals theory"), find it in homework list and use CORRECT subject
✓ All times MUST be HH:MM format between 00:00-23:59 (NEVER use 24:00 or 25:00)
✓ Calculate times by analyzing gaps in existing schedule - don't blindly append
✓ Move/update existing sessions instead of duplicating (same subject+topic+type = same task)
✓ Distribute incomplete tasks across multiple days (max 3 new per day)
✓ Respect student's explicit requests (e.g., "don't do X tomorrow", "focus on Y")
✓ Consider homework due dates when scheduling
✓ Balance difficult and easy tasks throughout each day

**RESPONSE FORMAT**
Return ONLY valid JSON:
{
  "rescheduledSessions": {
    "YYYY-MM-DD": [
      {
        "time": "HH:MM",
        "subject": "string",
        "topic": "string", 
        "duration": number,
        "type": "study|homework|revision",
        "notes": "Why this was scheduled here"
      }
    ]
  },
  "sessionsToRemove": {
    "YYYY-MM-DD": [0, 2, 5]
  },
  "summary": "Plain English summary of ALL changes made, e.g.: 'I moved Chemistry homework to tomorrow morning, removed the Maths session you wanted to skip, and added the Design & Technology metals theory homework on Sunday. I also rescheduled 2 incomplete topics from today across the next 3 days to balance your workload.'",
  "reasoning": "Detailed technical explanation of scheduling decisions and task matching"
}

**EXAMPLE THOUGHT PROCESS**
1. Student mentions "metals theory" → Search homework list → Found "Metals Theory; Group Presentation Tasks" under Design & Technology → Use that subject
2. Student says "don't do algebraic fractions tomorrow" → Find and remove that session from tomorrow
3. Two incomplete sessions from today → Distribute to next 2-3 days based on available gaps and subject priority
4. Check all times are valid (00:00-23:59) and realistic
5. Write clear summary explaining what changed and why`;


    console.log('Calling AI for schedule adjustment...');

    const systemPrompt = 'You are an expert study scheduling assistant. Always return valid JSON.';

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const response = await fetch(
      'https://ai.gateway.lovable.dev/v1/chat/completions',
      {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "user", content: `${systemPrompt}\n\n${prompt}` }
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway request failed: ${response.status}`);
    }

    const aiResult = await response.json();
    console.log('AI response:', JSON.stringify(aiResult, null, 2));

    // Extract content from AI response
    let responseText: string | undefined;
    if (aiResult.choices?.[0]?.message?.content) {
      responseText = aiResult.choices[0].message.content;
    }

    if (!responseText || responseText.trim() === "") {
      console.error('Empty AI response. Raw result:', JSON.stringify(aiResult, null, 2));
      throw new Error('AI did not generate a response. Please try again.');
    }

    // Extract JSON from markdown if present
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      responseText = jsonMatch[1];
    }

    const aiResultParsed = JSON.parse(responseText);
    console.log('AI scheduling result:', aiResultParsed);

    // Apply the changes
    const updatedSchedule = { ...schedule };
    
    // First, remove sessions if requested
    if (aiResultParsed.sessionsToRemove) {
      Object.entries(aiResultParsed.sessionsToRemove).forEach(([date, indices]: [string, any]) => {
        if (updatedSchedule[date]) {
          // Sort indices in reverse to remove from end first
          const sortedIndices = (indices as number[]).sort((a, b) => b - a);
          sortedIndices.forEach(index => {
            updatedSchedule[date].splice(index, 1);
          });
        }
      });
    }
    
    // Then, add rescheduled sessions at specified times
    if (aiResultParsed.rescheduledSessions) {
      Object.entries(aiResultParsed.rescheduledSessions).forEach(([date, sessions]: [string, any]) => {
        if (!updatedSchedule[date]) {
          updatedSchedule[date] = [];
        }

        // Add or merge each session with the AI-specified time
        (sessions as any[]).forEach((session: any) => {
          // Validate time format
          const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
          let sessionTime = session.time || '09:00';

          if (!timeRegex.test(sessionTime)) {
            console.warn(`Invalid time format: ${sessionTime}, defaulting to 09:00`);
            sessionTime = '09:00';
          }

          // Check if time is within valid range
          const [hours, minutes] = sessionTime.split(':').map(Number);
          if (hours >= 24 || minutes >= 60) {
            console.warn(`Time out of range: ${sessionTime}, defaulting to 09:00`);
            sessionTime = '09:00';
          }

          const normalizedType = session.type || 'study';

          // If a session with the same subject/topic/type already exists on this day,
          // treat this as a MOVE/UPDATE instead of creating a duplicate.
          const existingIndex = updatedSchedule[date].findIndex((s: any) =>
            s.subject === session.subject &&
            s.topic === session.topic &&
            (s.type || 'study') === normalizedType
          );

          const newSession = {
            time: sessionTime,
            subject: session.subject,
            topic: session.topic,
            duration: session.duration,
            type: normalizedType,
            notes: session.notes || `Rescheduled from ${currentDate}`,
            completed: false,
          };

          if (existingIndex !== -1) {
            console.log('Merging rescheduled session with existing one', {
              date,
              subject: session.subject,
              topic: session.topic,
              type: normalizedType,
            });
            updatedSchedule[date][existingIndex] = {
              ...updatedSchedule[date][existingIndex],
              ...newSession,
            };
          } else {
            updatedSchedule[date].push(newSession);
          }
        });

        // Sort sessions by time
        updatedSchedule[date].sort((a: any, b: any) => {
          const timeA = a.time || '00:00';
          const timeB = b.time || '00:00';
          return timeA.localeCompare(timeB);
        });
      });
    }

    // Update the timetable
    const { error: updateError } = await supabase
      .from('timetables')
      .update({ schedule: updatedSchedule })
      .eq('id', timetableId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    console.log('Schedule updated successfully');

    return new Response(JSON.stringify({
      success: true,
      rescheduledSessions: aiResultParsed.rescheduledSessions,
      summary: aiResultParsed.summary || 'Schedule updated successfully',
      reasoning: aiResultParsed.reasoning,
      updatedSchedule
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in adjust-schedule:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
