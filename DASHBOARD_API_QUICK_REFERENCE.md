# Dashboard API Quick Reference

## Quick Start

### 1. Initialize Database
The new tables will be created automatically when you start the server:
```bash
npm start
```

### 2. Seed Test Data (Optional)
```bash
node scripts/seed-dashboard-data.js
```

### 3. Test Endpoints
Update the JWT token and username in the test script, then run:
```bash
npm install axios  # If not already installed
node scripts/test-dashboard-endpoints.js
```

## API Endpoints

### Stream Statistics
```http
GET /api/streams/stats/:username
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "currentViewers": 42,
  "peakViewers": 67,
  "totalWatchTime": 180,
  "newFollowers": 5,
  "chatMessageRate": 2.13,
  "uptime": 1728936000000,
  "isLive": true
}
```

### Follower Growth
```http
GET /api/streams/followers/growth/:username?days=7
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
[
  { "date": "2025-10-08", "followers": 145 },
  { "date": "2025-10-09", "followers": 152 },
  { "date": "2025-10-10", "followers": 158 }
]
```

### Banned Users
```http
GET /api/chat/banned/:username
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
[
  {
    "username": "spammer123",
    "bannedAt": "2025-10-07T10:30:00Z",
    "bannedBy": "moderator1",
    "reason": "Excessive spam"
  }
]
```

## Status Codes

| Code | Meaning | When It Happens |
|------|---------|-----------------|
| 200 | Success | Request completed successfully |
| 400 | Bad Request | Invalid parameters (e.g., days > 365) |
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | User lacks permission (banned users endpoint) |
| 404 | Not Found | Channel/user doesn't exist |
| 500 | Server Error | Internal server error |

## cURL Examples

### Get Stream Stats
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/streams/stats/username
```

### Get 30-Day Follower Growth
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/streams/followers/growth/username?days=30"
```

### Get Banned Users
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/chat/banned/username
```

## Daily Maintenance

### Set Up Follower Growth Snapshot (Linux/Mac)
Add to crontab:
```bash
0 0 * * * cd /path/to/vimm-core && node scripts/snapshot-follower-growth.js >> logs/follower-snapshot.log 2>&1
```

### Set Up Follower Growth Snapshot (Windows)
Use Task Scheduler to run daily at midnight:
```bash
node C:\path\to\vimm-core\scripts\snapshot-follower-growth.js
```

## Database Tables

### stream_stats
Tracks individual stream sessions with metrics.

### follower_growth
Daily snapshots of follower counts for each channel.

### banned_users
List of users banned from channels with ban details.

## Integration with Stream Events

To get accurate real-time data, integrate these updates into your stream lifecycle:

### When Stream Starts
```javascript
await StreamStats.create({
  hiveAccount: username,
  streamID: streamId,
  sessionStart: new Date(),
  sessionEnd: null,
  peakViewers: 0,
  totalWatchTime: 0,
  chatMessages: 0,
  newFollowers: 0
});
```

### When Viewer Count Changes
```javascript
const session = await StreamStats.findOne({
  where: { streamID: streamId, sessionEnd: null }
});

if (session && viewerCount > session.peakViewers) {
  await session.update({ peakViewers: viewerCount });
}
```

### When Stream Ends
```javascript
await StreamStats.update(
  { sessionEnd: new Date() },
  { where: { streamID: streamId, sessionEnd: null } }
);
```

## Common Issues

### Issue: Getting 404 for existing channel
**Solution:** Ensure the username matches the `hive_account` field in `stream_keys` table exactly (case-sensitive).

### Issue: follower_growth returns empty array
**Solution:** Run the snapshot script to populate historical data:
```bash
node scripts/snapshot-follower-growth.js
```

### Issue: Getting 403 on banned users endpoint
**Solution:** The authenticated user must be either:
- The channel owner (username matches channel), OR
- A moderator listed in the channel's `chat_configs.moderators` array

### Issue: Chat message rate is 0
**Solution:** The `chatMessages` field in `stream_stats` must be updated when chat messages are sent. Integrate chat event tracking.

## Files Modified/Created

### New Models
- `src/db/models/streamStats.js`
- `src/db/models/followerGrowth.js`
- `src/db/models/bannedUsers.js`

### Modified Routes
- `src/api/routes/streams.js` (added 2 endpoints)
- `src/api/routes/chat.js` (added 1 endpoint)

### Modified Database Setup
- `src/db/models/associations.js`
- `src/db/init.js`

### Helper Scripts
- `scripts/seed-dashboard-data.js`
- `scripts/snapshot-follower-growth.js`
- `scripts/test-dashboard-endpoints.js`

### Documentation
- `DASHBOARD_API_IMPLEMENTATION.md`
- `DASHBOARD_API_QUICK_REFERENCE.md` (this file)

## Next Steps

1. ✅ Database tables created automatically on server start
2. ⚠️ Set up daily follower snapshot cron job
3. ⚠️ Integrate StreamStats updates into stream lifecycle
4. ⚠️ Integrate chat message counting
5. ⚠️ Add ban/unban functionality to chat system
6. ⚠️ Update frontend to use these endpoints
7. ⚠️ Test in production environment
