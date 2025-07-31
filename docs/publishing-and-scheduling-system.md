# Publishing and Scheduling System

This document describes the publishing and scheduling system implemented for the Book Social Content Analyzer.

## Overview

The system allows users to:
- Publish content immediately to connected social media accounts
- Schedule content for future publishing
- Manage scheduled posts (edit, cancel, reschedule)
- Retry failed publications
- Track publishing results and failures

## Architecture

### Core Services

#### PublishingService (`lib/publishing-service.ts`)
- Handles immediate publishing to social media platforms
- Supports Twitter/X, Instagram, LinkedIn, and Facebook
- Provides retry functionality for failed publications
- Updates database with publishing results

#### SchedulingService (`lib/scheduling-service.ts`)
- Manages scheduled posts using Redis/Upstash
- Handles post scheduling, cancellation, and rescheduling
- Processes due posts with retry logic
- Maintains scheduling queue with time-based processing

### API Endpoints

#### Publishing
- `POST /api/social/publish` - Publish content immediately
- `POST /api/social/retry` - Retry failed publication

#### Scheduling
- `POST /api/social/schedule` - Schedule content for future publishing
- `GET /api/social/schedule` - Get user's scheduled posts
- `DELETE /api/social/schedule/[postId]` - Cancel scheduled post
- `PUT /api/social/schedule/[postId]` - Reschedule post

#### Background Processing
- `POST /api/cron/process-scheduled-posts` - Process due posts (called by cron job)

### UI Components

#### PublishingInterface (`components/social/publishing-interface.tsx`)
- Account selection for publishing
- Immediate publishing with result display
- Post scheduling with date/time selection
- Retry functionality for failed publications

#### ScheduledPostsManager (`components/social/scheduled-posts-manager.tsx`)
- Display scheduled posts
- Edit/reschedule functionality
- Cancel scheduled posts
- Status tracking and error display

## Setup Requirements

### Environment Variables
Add to `.env`:
```
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
CRON_SECRET=your-secure-cron-secret-here
```

### Dependencies
The system requires:
- `@upstash/redis` - Redis client for scheduling queue
- `zod` - Request validation
- Existing social media OAuth setup

### Cron Job Setup
Set up a cron job to call the processing endpoint:
```bash
# Process scheduled posts every minute
* * * * * curl -X POST -H "Authorization: Bearer your-cron-secret" https://your-domain.com/api/cron/process-scheduled-posts
```

## Usage

### Publishing Content Immediately

```typescript
import { PublishingService } from '@/lib/publishing-service'

const results = await PublishingService.publishNow(userId, {
  contentId: 'content-123',
  accountIds: ['account-1', 'account-2']
})
```

### Scheduling Content

```typescript
import { SchedulingService } from '@/lib/scheduling-service'

await SchedulingService.schedulePost(userId, {
  contentId: 'content-123',
  accountIds: ['account-1'],
  scheduledAt: new Date('2024-12-25T10:00:00Z')
})
```

### Managing Scheduled Posts

```typescript
// Get scheduled posts
const posts = await SchedulingService.getScheduledPosts(userId)

// Cancel a post
await SchedulingService.cancelScheduledPost(userId, postId)

// Reschedule a post
await SchedulingService.reschedulePost(userId, postId, newDate)
```

## Error Handling

The system includes comprehensive error handling:

### Publishing Errors
- API rate limits with exponential backoff
- Authentication failures with token refresh
- Platform-specific error handling
- Retry mechanism with user notifications

### Scheduling Errors
- Validation of future dates
- Redis connection failures
- Concurrent processing protection
- Failed post retry with exponential backoff

### User Feedback
- Toast notifications for success/failure
- Detailed error messages
- Retry buttons for failed operations
- Status indicators for scheduled posts

## Testing

The system includes comprehensive tests:
- Unit tests for services (`lib/__tests__/`)
- API endpoint tests (`app/api/*/__tests__/`)
- Component tests (`components/*/__tests__/`)

Run tests with:
```bash
npm test -- --testPathPattern="publishing|scheduling"
```

## Database Schema

The system uses existing database tables:
- `generated_content` - Content with publishing status
- `social_accounts` - Connected social media accounts

Status values:
- `draft` - Not published or scheduled
- `scheduled` - Scheduled for future publishing
- `published` - Successfully published
- `failed` - Publishing failed

## Security Considerations

- Cron endpoint protected with secret token
- User authorization for all operations
- Secure token storage and refresh
- Input validation with Zod schemas
- Rate limiting protection

## Monitoring

The system provides:
- Publishing success/failure tracking
- Scheduled post status monitoring
- Error logging for debugging
- Performance metrics for optimization

## Future Enhancements

Potential improvements:
- Bulk scheduling operations
- Advanced scheduling rules (optimal times)
- Analytics integration
- Multi-account publishing strategies
- Content approval workflows