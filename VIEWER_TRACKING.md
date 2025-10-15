# Viewer Tracking Implementation

## Overview
This implementation tracks live viewers by monitoring HLS segment requests. It's a passive tracking system that doesn't require any client-side JavaScript changes.

## How It Works

### 1. **Segment Request Tracking**
- The middleware `trackViewerActivity` is applied to the `/live` route
- Every time a viewer's player requests HLS content (playlists or segments), their activity is recorded
- Each viewer is identified by their IP address
- Activity timestamps are stored in memory for fast access

### 2. **Viewer Count Calculation**
- A viewer is considered "active" if they've made a request within the last 30 seconds
- The `ViewerTracker` class maintains a map of: `streamId -> (viewerIp -> lastActivityTimestamp)`
- Stale viewers (no activity for 30+ seconds) are automatically cleaned up every 15 seconds

### 3. **Database Updates**
- Viewer counts are updated in the `StreamKey` table every 10 seconds
- The `viewerCount` field is now automatically maintained and accurate

### 4. **Stream Lifecycle**
- When a stream starts: `viewerCount` is initialized to 0
- During streaming: `viewerCount` is updated every 10 seconds based on active segment requests
- When a stream ends: all viewer tracking data is cleared immediately

## Configuration

You can adjust these settings in `src/server/viewer-tracker.js`:

```javascript
this.VIEWER_TIMEOUT = 30000;    // 30s - viewer inactive timeout
this.UPDATE_INTERVAL = 10000;   // 10s - database update frequency
this.CLEANUP_INTERVAL = 15000;  // 15s - stale viewer cleanup frequency
```

## API Endpoints

### Existing Endpoints Enhanced
These endpoints now return accurate `viewerCount`:

- `GET /api/streams` - List all streams with viewer counts
- `GET /api/streams/:streamId` - Get stream details with viewer count
- `GET /api/streams/stats/:username` - Get real-time stats including current viewers

### Tracking Points
Viewer activity is recorded at:

1. **HLS Content Requests** - `/live/:streamId/*` (playlists and segments)
2. **Token Generation** - `POST /api/hls/token/:streamId` (when player initializes)
3. **Key Requests** - `GET /api/hls/key/:streamId` (during encrypted playback)

## Accuracy

### Strengths
- Tracks actual video consumption (not just page views)
- Works with any HLS-compatible player
- No client-side dependencies
- Lightweight and efficient (in-memory tracking)

### Limitations
- Uses IP address for identification (multiple users behind same NAT will be counted as one)
- 30-second timeout means viewer count updates with slight delay
- Won't track viewers who pause for more than 30 seconds

### Accuracy Improvements Possible
- Use more sophisticated fingerprinting (IP + User-Agent)
- Implement cookie/session-based tracking for authenticated users
- Reduce the VIEWER_TIMEOUT for more responsive counts (at cost of more false drops)

## Memory Usage

The system is very memory-efficient:
- Each viewer entry: ~100 bytes (IP string + timestamp)
- 1000 concurrent viewers across all streams: ~100 KB
- Automatic cleanup prevents memory leaks

## Monitoring

To check the current state of viewer tracking:

```javascript
const viewerTracker = require('./server/viewer-tracker');
console.log(viewerTracker.getDebugInfo());
```

Output example:
```json
{
  "totalStreams": 3,
  "streams": {
    "ABC123": {
      "totalViewers": 15,
      "activeViewers": 12
    },
    "XYZ789": {
      "totalViewers": 8,
      "activeViewers": 7
    }
  }
}
```

## Testing

1. Start a stream
2. Open the stream in a player (or multiple browsers)
3. Check the database: `SELECT streamID, viewerCount FROM StreamKeys WHERE isLive = true;`
4. The count should update within 10-40 seconds of starting playback
5. Close a player and wait 30 seconds - count should decrease

## Future Enhancements

Possible improvements:
- Add viewer session tracking (duration, buffering events, quality changes)
- Store historical viewer count snapshots for analytics
- Implement peak viewer tracking per stream session
- Add geographic distribution tracking
- WebSocket notifications for real-time viewer count updates to streamers
