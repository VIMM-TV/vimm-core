# VIMM Core

VIMM Core is an advanced streaming server that enables live streaming through multiple protocols with integrated Hive blockchain authentication, metadata management, and configurable transcoding capabilities. It is designed to be fully compatible with other VIMM ecosystem components.

## VIMM Ecosystem

VIMM Core is part of a larger ecosystem of components that work together to provide a complete streaming solution:

- **VIMM Core** (this repository) - Core streaming server with multi-protocol support and transcoding capabilities
- **VIMM Chat** - Dedicated chat server and implementation for real-time stream interaction
- **VIMM Frontend** - Reference frontend application showcasing core streaming features, chat integration, and Hive social features

## Planned Features

### Streaming Protocols
- **WebRTC**
  - Ultra-low latency streaming
  - Peer-to-peer capabilities
  - Adaptive bitrate support
  
- **HLS (HTTP Live Streaming)**
  - Broad device compatibility
  - Adaptive quality streaming
  
- **RTMP**
  - Traditional streaming ingest
  - Compatible with most streaming software
  - Low-latency configuration options

### Transcoding
- **Quality Profiles**
  - Configurable output resolutions
  - Multiple bitrate support
  - Adaptive CPU/GPU utilization
  
- **Hardware Support**
  - CPU transcoding
  - NVIDIA GPU acceleration (NVENC)
  - Optional transcoding configuration based on available hardware
  
- **Performance**
  - Load balancing for multiple transcoding instances
  - Resource usage monitoring
  - Quality vs performance optimization options

### Authentication & Authorization
- Hive blockchain authentication
- Stream key management
- Permission-based access control
- Role-based authorization system

### Metadata Management
- Stream metadata storage and retrieval
- Hive blockchain integration for persistent storage
- Real-time updates
- Customizable metadata schemas

### Integration Points
- **Chat Integration**
  - WebSocket endpoints for VIMM Chat server communication
  - Chat authentication hooks
  - Stream-specific chat room management
  
- **Frontend Integration**
  - RESTful API for stream management
  - WebSocket endpoints for real-time updates
  - Hive social feature hooks (comments, votes)

## Architecture

```
src/
├── protocols/          # Streaming protocol implementations
│   ├── webrtc/
│   ├── hls/
│   └── rtmp/
├── transcoding/        # Transcoding management
│   ├── profiles/
│   ├── hardware/
│   └── monitoring/
├── auth/              # Authentication and authorization
│   ├── hive/
│   └── streamKeys/
├── metadata/          # Stream metadata management
├── integration/       # Integration points for other VIMM components
│   ├── chat/
│   └── frontend/
├── utils/             # Utility functions
└── config/            # Configuration management
```

## Development Status

This project is currently in early development. We are actively working on the core streaming functionality, transcoding capabilities, and Hive blockchain integration. The server is being designed with integration points for the VIMM Chat server and VIMM Frontend reference implementation.

## Related Repositories
- [VIMM Chat](https://github.com/VIMM-TV/vimm-chat)
- [VIMM Frontend](https://github.com/VIMM-TV/vimm-frontend)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- [GitHub Issues](https://github.com/VIMM-TV/vimm-core/issues)

---

Powered by the Hive blockchain. Built by VIMM.
