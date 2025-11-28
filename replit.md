# Vistari - GCSE Study Planning Application

## Overview
Vistari is a GCSE revision planner that creates personalized study timetables that fit around student schedules. Originally built on Lovable, migrated to Replit with Open Router AI integration.

## Recent Changes
**November 28, 2025**
- Migrated all 9 Supabase edge functions to use Open Router API
- Switched AI model to `google/gemma-3n-e4b-it:free` for cost optimization
- Fixed Gemma model limitation: merged system messages into user messages (Gemma 3n doesn't support developer/system instructions)
- Updated generate-logo function to return SVG placeholder (Gemma cannot generate images)

## AI Configuration
- **Provider**: Open Router (openrouter.ai)
- **Model**: `google/gemma-3n-e4b-it:free` - Google Gemma 3n 4B (free tier)
- **API Key**: Stored as `OPEN_ROUTER_API_KEY` in Replit secrets
- **Important**: Gemma 3n doesn't support system instructions, so all prompts use single user message format

## Edge Functions (supabase/functions/)
1. **generate-timetable** - Creates personalized study schedules
2. **analyze-difficulty** - Analyzes topic difficulty and priorities
3. **validate-email** - AI-assisted email validation
4. **analyze-test-score** - Provides feedback on test performance
5. **generate-insights** - Creates learning analytics and insights
6. **parse-topics** - Extracts topics from text/images
7. **adjust-schedule** - Modifies schedules based on user requests
8. **regenerate-tomorrow** - Regenerates next day's schedule
9. **generate-logo** - Returns placeholder SVG logo (no AI image generation)

## Project Structure
- `/client` - React frontend with Vite
- `/server` - Express backend
- `/supabase/functions` - Edge functions for AI features
- `/shared` - Shared types and schemas

## Running the Project
The workflow "Start application" runs `npm run dev` which starts both frontend and backend on port 5000.

## User Preferences
- Cost optimization: Using free Gemma model instead of paid alternatives
- AI features: Study planning, difficulty analysis, schedule adjustments
