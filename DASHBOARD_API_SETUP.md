# Dashboard API Setup Guide

## Quick Setup

### Step 1: Create Database Tables

Run this command to create the new dashboard tables:

```bash
node scripts/create-dashboard-tables.js
```

This will create:
- `stream_stats` - Stream session analytics
- `follower_growth` - Daily follower snapshots
- `banned_users` - Chat ban management

### Step 2: Seed Test Data (Optional)

Populate the tables with sample data for testing:

```bash
node scripts/seed-dashboard-data.js
```

### Step 3: Test the Endpoints

Update the JWT token in the test script, then run:

```bash
npm install axios  # If not already installed
node scripts/test-dashboard-endpoints.js
```

## Available Endpoints

### 1. Stream Statistics
```
GET /api/streams/stats/:username
Authorization: Bearer <JWT_TOKEN>
```

Returns current stream metrics including viewers, watch time, and chat activity.

### 2. Follower Growth
```
GET /api/streams/followers/growth/:username?days=7
Authorization: Bearer <JWT_TOKEN>
```

Returns historical follower count data for charts/analytics.

### 3. Banned Users
```
GET /api/chat/banned/:username
Authorization: Bearer <JWT_TOKEN>
```

Returns list of banned users (requires owner/moderator access).

## Daily Maintenance

### Set Up Follower Snapshot Cron Job

The follower growth endpoint requires daily snapshots. Set up a cron job:

**Linux/Mac:**
```bash
crontab -e
```

Add this line:
```
0 0 * * * cd /path/to/vimm-core && node scripts/snapshot-follower-growth.js >> logs/follower-snapshot.log 2>&1
```

**Windows Task Scheduler:**
1. Open Task Scheduler
2. Create Basic Task
3. Trigger: Daily at midnight
4. Action: Start a program
5. Program: `node`
6. Arguments: `C:\path\to\vimm-core\scripts\snapshot-follower-growth.js`
7. Start in: `C:\path\to\vimm-core`

## Troubleshooting

### Error: "no such table: stream_stats"

**Solution:** Run the table creation script:
```bash
node scripts/create-dashboard-tables.js
```

### Error: "Channel not found" (404)

**Solution:** Ensure the username exists in the `stream_keys` table and matches exactly (case-sensitive).

### Error: "Forbidden" (403) on banned users endpoint

**Solution:** The authenticated user must be:
- The channel owner (username matches), OR
- A moderator listed in `chat_configs.moderators` for that channel

### Empty follower growth data

**Solution:** Run the snapshot script manually once to populate initial data:
```bash
node scripts/snapshot-follower-growth.js
```

Then set up the daily cron job for ongoing snapshots.

## Files Created

### Database Models
- `src/db/models/streamStats.js`
- `src/db/models/followerGrowth.js`
- `src/db/models/bannedUsers.js`

### API Routes (Modified)
- `src/api/routes/streams.js` - Added 2 endpoints
- `src/api/routes/chat.js` - Added 1 endpoint

### Scripts
- `scripts/create-dashboard-tables.js` - Create database tables
- `scripts/seed-dashboard-data.js` - Seed test data
- `scripts/snapshot-follower-growth.js` - Daily follower snapshot
- `scripts/test-dashboard-endpoints.js` - Test the endpoints

### Documentation
- `DASHBOARD_API_IMPLEMENTATION.md` - Full implementation details
- `DASHBOARD_API_QUICK_REFERENCE.md` - Quick reference guide
- `DASHBOARD_API_SETUP.md` - This file

## Integration Notes

### Update Stream Stats in Real-Time

To keep stream statistics accurate, integrate these updates into your streaming system:

**When stream starts:**
```javascript
await StreamStats.create({
  hiveAccount: username,
  streamID: streamId,
  sessionStart: new Date(),
  peakViewers: 0,
  totalWatchTime: 0,
  chatMessages: 0,
  newFollowers: 0
});
```

**When viewer count changes:**
```javascript
const session = await StreamStats.findOne({
  where: { streamID: streamId, sessionEnd: null }
});

if (session && currentViewers > session.peakViewers) {
  await session.update({ peakViewers: currentViewers });
}
```

**When stream ends:**
```javascript
await StreamStats.update(
  { sessionEnd: new Date() },
  { where: { streamID: streamId, sessionEnd: null } }
);
```

**When chat message received:**
```javascript
await StreamStats.increment('chatMessages', {
  where: { streamID: streamId, sessionEnd: null }
});
```

## Production Checklist

- [ ] Database tables created
- [ ] Daily follower snapshot cron job configured
- [ ] Stream stats integrated with stream lifecycle
- [ ] Chat message counting integrated
- [ ] Ban/unban functionality connected to BannedUsers table
- [ ] Frontend updated to call new endpoints
- [ ] JWT authentication working correctly
- [ ] Error monitoring in place
- [ ] Backup strategy for new tables

## Support

For questions or issues:
1. Check the error logs
2. Verify database tables exist
3. Confirm JWT token is valid
4. Check that the user has appropriate permissions

See `DASHBOARD_API_IMPLEMENTATION.md` for detailed implementation information.
