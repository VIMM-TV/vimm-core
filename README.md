# VIMM Core

VIMM Core is a high-performance streaming server that forms the foundation of the VIMM ecosystem. It provides robust multi-protocol streaming capabilities, advanced media processing, and seamless integration with other VIMM components.

## VIMM Ecosystem

VIMM Core is part of a larger ecosystem of components:

- **VIMM Core** (this repository) - Core streaming server with multi-protocol support
- [VIMM Chat](https://github.com/VIMM-TV/vimm-chat) - Chat server and implementation for real-time stream interaction
- [VIMM Frontend](https://github.com/VIMM-TV/vimm-frontend) - Reference frontend application integrating all VIMM components

## Planned Features

### Streaming Capabilities
- Multi-protocol support (RTMP, WebRTC, HLS)
- Adaptive bitrate streaming
- Low-latency streaming options
- Stream transcoding and scaling
- Recording and VOD support

### Media Processing
- FFmpeg integration
- Hardware acceleration support
- Multiple quality profiles
- Thumbnail generation
- Stream health monitoring

### Integration Features
- WebSocket-based real-time updates
- Redis caching system
- REST API for stream management
- Authentication system
- Metrics and analytics

### Performance Features
- Horizontal scaling support
- Load balancing
- Edge caching
- Resource optimization
- Network resilience

## Technology Stack

- Node.js/TypeScript
- FFmpeg for media processing
- WebRTC/RTMP/HLS protocols
- Redis for caching
- WebSocket for real-time communication

## Dependencies

```bash
# For Ubuntu/Debian
sudo apt update
sudo apt install ffmpeg

# For NVIDIA support, also install:
sudo apt install nvidia-cuda-toolkit
```

## Development Status
This project is currently in active development. Our immediate priorities are:

### In Progress
- Comprehensive Streams API development for ecosystem integration
- WebRTC protocol support implementation
- Low Latency HLS support

### Completed Features
- Multi-protocol streaming support (RTMP)
- Stream key management and validation
- Hive blockchain integration
- Stream metadata management
- Error handling and logging system
- Hive Keychain authentication system
- User channel following/unfollowing functionality
- JWT-based session management
- RESTful API for user and channel management

## API Documentation

### Authentication Endpoints

#### Generate Challenge
```
GET /api/auth/challenge
```
Returns a challenge string for Hive authentication.

#### Hive Authentication  
```
POST /api/auth/hive
Content-Type: application/json

{
  "username": "hive_username",
  "signature": "signature_from_keychain", 
  "challenge": "challenge_string"
}
```
Authenticates a user with Hive Keychain and returns a JWT token.

### Channel Management Endpoints

#### Follow Channel
```
POST /api/channels/follow
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "channelUsername": "username_to_follow"
}
```

#### Unfollow Channel
```
DELETE /api/channels/unfollow
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "channelUsername": "username_to_unfollow"
}
```

#### Get Followed Channels
```
GET /api/user/followed-channels?page=1&limit=20
Authorization: Bearer <jwt_token>
```
Returns paginated list of channels the authenticated user follows.

### Stream Endpoints

#### Get Active Streams
```
GET /api/streams?page=1&limit=20&language=en&category=gaming
```

#### Get Stream Details
```
GET /api/streams/:streamId
```

## License
This project is licensed under the MIT License - see the LICENSE file for details.

## Support
[GitHub Issues](https://github.com/VIMM-TV/vimm-core/issues)

---

Powered by the Hive blockchain. Built by VIMM.