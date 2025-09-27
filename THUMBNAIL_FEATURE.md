# Thumbnail Generation Feature

## Overview

The VIMM Core server now includes automatic thumbnail generation for all active streams. Thumbnails are generated every 5 minutes (configurable) and provide visual previews of the current stream content.

## Features

- **Automatic Generation**: Thumbnails are automatically generated for all active streams
- **Configurable Resolution**: Maximum thumbnail resolution can be configured to save bandwidth and storage
- **Scheduled Updates**: Thumbnails are updated every 5 minutes by default
- **Cleanup**: Old thumbnails are automatically cleaned up when streams go offline
- **API Integration**: Thumbnails are served through the existing streams API

## Configuration

Thumbnail settings are configured in `config/default.js`:

```javascript
thumbnails: {
    enabled: true,                    // Enable/disable thumbnail generation
    maxResolution: '640x360',         // Maximum resolution (WIDTHxHEIGHT)
    quality: 2,                       // JPEG quality (1-31, lower is better)
    interval: 5 * 60 * 1000,         // Generation interval in milliseconds
    thumbnailDir: './media/thumbnails', // Storage directory
    keepCount: 5                      // Number of thumbnails to keep per stream
}
```

### Configuration Options

- **enabled**: Set to `false` to disable thumbnail generation completely
- **maxResolution**: Format is `WIDTHxHEIGHT`. Common options:
  - `1280x720` (720p)
  - `640x360` (360p) - Recommended for balance of quality and size
  - `320x180` (180p) - Minimal size
- **quality**: JPEG quality setting (1-31, where 1 is highest quality, 31 is lowest)
- **interval**: How often thumbnails are generated (in milliseconds)
- **thumbnailDir**: Directory where thumbnails are stored
- **keepCount**: Number of historical thumbnails to keep per stream (current thumbnail is always kept)

## API Endpoints

### Stream Listings
All stream listing endpoints (`/api/streams`) now include a `thumbnail` field pointing to the current thumbnail:

```json
{
  "streams": [
    {
      "id": "stream123",
      "username": "user1",
      "title": "My Stream",
      "thumbnail": "/thumbnails/stream123_current.jpg",
      // ... other fields
    }
  ]
}
```

### Thumbnail Information
Get detailed thumbnail information for a specific stream:

```
GET /api/streams/:streamId/thumbnail
```

Response:
```json
{
  "streamId": "stream123",
  "thumbnailUrl": "/thumbnails/stream123_current.jpg",
  "lastGenerated": "2025-09-27T13:24:00.000Z",
  "size": 45678
}
```

### Direct Thumbnail Access
Thumbnails are served as static files:

```
GET /thumbnails/:streamId_current.jpg
```

## File Structure

Thumbnails are stored in the `media/thumbnails/` directory:

```
media/
└── thumbnails/
    ├── stream123_current.jpg          # Current thumbnail
    ├── stream123_2025-09-27T13-24-00-000Z.jpg  # Historical thumbnail
    ├── stream456_current.jpg
    └── ...
```

## Requirements

- **FFmpeg**: Must be installed and available at `/usr/bin/ffmpeg`
- **Active Streams**: Only generates thumbnails for streams that are currently live and have HLS segments available
- **Disk Space**: Consider thumbnail storage when setting `keepCount` and `maxResolution`

## Troubleshooting

### No Thumbnails Generated

1. Check if FFmpeg is installed: `which ffmpeg`
2. Verify stream is actually producing HLS segments in `media/live/:streamId/source/`
3. Check server logs for thumbnail generation errors
4. Ensure `thumbnails.enabled` is `true` in configuration

### Thumbnails Not Updating

1. Verify the generation interval in configuration
2. Check that streams are actively producing new segments
3. Look for FFmpeg errors in server logs

### High Storage Usage

1. Reduce `keepCount` to keep fewer historical thumbnails
2. Lower `maxResolution` to reduce file sizes
3. Increase `quality` value to reduce JPEG quality (smaller files)
4. Consider implementing external storage cleanup scripts

## Performance Considerations

- Thumbnail generation uses minimal CPU as it only processes single frames
- Generation is throttled to process max 3 streams concurrently
- Old thumbnails are automatically cleaned up to prevent storage bloat
- Failed thumbnail generation attempts are logged but don't affect stream performance

## Security Notes

- Thumbnails are served as static files without authentication
- Consider the privacy implications of publicly accessible stream thumbnails
- Thumbnail URLs are predictable based on stream IDs
