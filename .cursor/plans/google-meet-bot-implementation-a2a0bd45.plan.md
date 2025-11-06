<!-- a2a0bd45-f3c7-4075-bd6e-675654396b37 55a6b3b3-3e6f-4456-8b06-722ef3523911 -->
# Google Meet Companion Bot Implementation

## Overview

Build a Google Meet companion bot that automatically joins meetings when the manager joins, records audio, transcribes conversations with speaker separation using OpenAI Whisper API, and stores transcripts as structured JSON/PDF files in the uploads directory with database references.

## Architecture Components

### 1. Google OAuth Integration

- **File**: `backend/routes/googleAuth.js` (new)
- **File**: `backend/models/GoogleAuth.js` (new)
- **File**: `backend/services/googleCalendarService.js` (new)
- Add Google OAuth 2.0 flow with authorization and callback endpoints
- Store access tokens, refresh tokens, and expiry in `GoogleAuth` model linked to User
- Implement automatic token refresh mechanism
- Add OAuth configuration to User model (optional field for Google account email)

### 2. Google Calendar Polling Service

- **File**: `backend/services/calendarPollingService.js` (new)
- **File**: `backend/services/meetingBotService.js` (new)
- Poll Google Calendar API every 5 minutes for upcoming meetings
- Check if user has joined a meeting (detect active meeting status)
- Trigger bot join when meeting is detected
- Background worker service that runs continuously

### 3. Meeting Bot with Puppeteer

- **File**: `backend/services/meetingBotService.js` (new)
- **File**: `backend/services/audioRecordingService.js` (new)
- Use Puppeteer to launch headless browser
- Automatically join Google Meet using meeting link from calendar
- Join as visible participant (bot name: "Meeting Assistant" or similar)
- Record audio from the meeting using browser audio capture APIs
- Save audio to temporary file (WAV/MP3 format)

### 4. Transcription with Speaker Separation

- **File**: `backend/services/transcriptionService.js` (new)
- Use OpenAI Whisper API for transcription
- Implement speaker diarization (separate speakers in transcript)
- Generate structured JSON transcript with speaker-wise segments
- Create PDF version of transcript for easy viewing
- Store both JSON and PDF in `backend/uploads/transcripts/` directory

### 5. Database Models & Storage

- **File**: `backend/models/GoogleAuth.js` (new)
- **File**: `backend/models/Meeting.js` (update)
- **File**: `backend/models/MeetingTranscript.js` (update)
- Add `GoogleAuth` model to store OAuth tokens per user
- Update `Meeting` model to support bot-generated meetings (add `source: 'bot' | 'manual'`)
- Update `MeetingTranscript` model to support bot-generated transcripts (add `source` field)
- Store transcript file paths and metadata

### 6. API Routes

- **File**: `backend/routes/googleAuth.js` (new)
- **File**: `backend/routes/meetingBot.js` (new)
- `GET /api/google-auth/authorize` - Initiate OAuth flow
- `GET /api/google-auth/callback` - Handle OAuth callback
- `GET /api/google-auth/status` - Check OAuth connection status
- `POST /api/google-auth/disconnect` - Disconnect Google account
- `GET /api/meeting-bot/status` - Get bot status for user
- `POST /api/meeting-bot/configure` - Configure bot settings (enable/disable)

### 7. Background Workers

- **File**: `backend/services/workers/calendarWorker.js` (new)
- **File**: `backend/services/workers/recordingWorker.js` (new)
- **File**: `backend/services/workers/transcriptionWorker.js` (new)
- **File**: `backend/services/workerManager.js` (new)
- Calendar polling worker (runs every 5 minutes)
- Recording worker (handles active meeting recordings)
- Transcription worker (processes recorded audio)
- Worker manager to coordinate all background tasks

### 8. Frontend Integration

- **File**: `frontend/app/profile/page.tsx` (update)
- **File**: `frontend/components/google/GoogleAuthButton.tsx` (new)
- **File**: `frontend/components/google/BotStatusCard.tsx` (new)
- **File**: `frontend/components/meetings/MeetingList.tsx` (update)
- **File**: `frontend/lib/api.ts` (update)
- Add Google OAuth connection UI in profile/settings page
- Display bot status (connected, active recording, etc.)
- Show bot-recorded meetings with special indicator
- Display transcripts from bot recordings
- Role-based access: Only managers can configure bot

### 9. Configuration & Environment

- **File**: `backend/.env.example` (update)
- Add Google OAuth credentials:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_REDIRECT_URI`
- Update package.json with new dependencies:
  - `googleapis` - Google APIs client
  - `puppeteer` - Headless browser automation
  - `fluent-ffmpeg` - Audio processing (if needed)
  - `pdfkit` - PDF generation for transcripts

## Implementation Details

### Google OAuth Flow

1. User clicks "Connect Google Account" in profile
2. Redirect to Google OAuth consent screen
3. User authorizes calendar and meet access
4. Store tokens in `GoogleAuth` model
5. Enable automatic calendar polling for that user

### Calendar Polling Logic

1. Every 5 minutes, check all users with Google OAuth connected
2. For each user, fetch upcoming meetings (next 30 minutes)
3. Check if meeting has Google Meet link
4. Detect if user has joined the meeting (check calendar event status)
5. If user joined and bot not already active, trigger bot join

### Bot Join Process

1. Launch Puppeteer with headless browser
2. Navigate to Google Meet link
3. Sign in using stored OAuth credentials (or use service account)
4. Join meeting with bot name
5. Start audio recording
6. Monitor meeting status (when user leaves, bot leaves)

### Recording & Transcription

1. Capture audio stream from browser
2. Save to temporary audio file
3. When meeting ends, process audio file
4. Send to OpenAI Whisper API with speaker diarization
5. Generate structured JSON transcript
6. Convert to PDF format
7. Save both files to uploads directory
8. Create MeetingTranscript record
9. Link to Meeting record (create if doesn't exist)

### Role-Based Access

- **Managers**: Can connect Google account, configure bot, view all their bot-recorded meetings
- **Admins**: Can view all bot-recorded meetings, manage bot settings
- **Employees**: Can view bot-recorded meetings for projects they're assigned to

## File Structure

```
backend/
├── models/
│   ├── GoogleAuth.js (new)
│   ├── Meeting.js (update)
│   └── MeetingTranscript.js (update)
├── routes/
│   ├── googleAuth.js (new)
│   └── meetingBot.js (new)
├── services/
│   ├── googleCalendarService.js (new)
│   ├── meetingBotService.js (new)
│   ├── audioRecordingService.js (new)
│   ├── transcriptionService.js (new)
│   └── workers/
│       ├── calendarWorker.js (new)
│       ├── recordingWorker.js (new)
│       ├── transcriptionWorker.js (new)
│       └── workerManager.js (new)
└── uploads/
    └── transcripts/ (existing - store bot transcripts here)

frontend/
├── app/
│   └── profile/
│       └── page.tsx (update)
├── components/
│   ├── google/
│   │   ├── GoogleAuthButton.tsx (new)
│   │   └── BotStatusCard.tsx (new)
│   └── meetings/
│       └── MeetingList.tsx (update)
└── lib/
    └── api.ts (update)
```

## Dependencies to Add

- `googleapis` - Google Calendar and Meet API
- `puppeteer` - Browser automation for joining meetings
- `pdfkit` - Generate PDF transcripts
- `fluent-ffmpeg` (optional) - Audio format conversion if needed

## Security Considerations

- Store OAuth tokens encrypted in database
- Implement token refresh before expiry
- Secure audio file storage
- Validate user permissions before bot operations
- Rate limiting on calendar API calls

### To-dos

- [ ] Set up Google OAuth integration: Create GoogleAuth model, OAuth routes, and token management service
- [ ] Implement Google Calendar polling service that checks for upcoming meetings every 5 minutes
- [ ] Build Puppeteer-based meeting bot service to automatically join Google Meet and record audio
- [ ] Implement audio recording service to capture meeting audio from browser
- [ ] Create transcription service using OpenAI Whisper API with speaker diarization
- [ ] Update Meeting and MeetingTranscript models to support bot-generated meetings and transcripts
- [ ] Implement background worker system for calendar polling, recording, and transcription processing
- [ ] Create API routes for Google OAuth flow, bot configuration, and status endpoints
- [ ] Build frontend components for Google OAuth connection, bot status display, and bot-recorded meeting indicators
- [ ] Implement role-based access control for bot features (managers can configure, employees can view assigned meetings)