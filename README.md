# VIMM Core

> ⚠️ **IMPORTANT NOTICE**: This repository is currently under active development and is not ready for production use. The code is being developed in public for transparency as part of DHF proposal #320. Many components are incomplete or not fully implemented. Attempting to run the server in its current state will not work.
>
> Follow our progress:
> - [DHF Proposal #320](https://peakd.com/proposals/320)
> - [Development Updates](https://github.com/VIMM-TV/vimm-core/discussions)

VIMM Core is an advanced streaming server that enables live streaming through multiple protocols with integrated Hive blockchain authentication, metadata management, and configurable transcoding capabilities. It is designed to be fully compatible with other VIMM ecosystem components.

## Development Status

This repository represents ongoing work to create an open-source streaming framework for the Hive blockchain. The code is being developed iteratively and in public to maintain transparency with the community. Current status:

- ✅ Core architecture design
- ✅ Basic component structure
- 🚧 Protocol implementations (In Progress)
- 🚧 Transcoding system (In Progress)
- ⏳ Hive integration (Planned)
- ⏳ Testing framework (Planned)

## Architecture Overview

VIMM Core follows a modular, event-driven architecture with clear separation of concerns:

```
src/
├── core/               # Core server components
│   └── StreamManager   # Central stream management
├── protocols/          # Streaming protocol implementations
│   ├── ProtocolManager
│   ├── WebRTCHandler
│   ├── HLSHandler
│   └── RTMPHandler
├── transcoding/        # Transcoding management
│   └── TranscodingManager
├── auth/              # Authentication and authorization
│   ├── AuthManager
│   └── HiveAuthenticator
├── metadata/          # Stream metadata management
│   ├── MetadataManager
│   └── HiveClient
├── types/             # TypeScript type definitions
└── Server.ts          # Main server class
```

### Core Components

#### StreamManager
- Central component managing active streams
- Coordinates between other system components
- Handles stream lifecycle events
- Validates stream keys and permissions

#### ProtocolManager
- Manages multiple streaming protocols
- Supports WebRTC, HLS, and RTMP
- Handles protocol-specific initialization and shutdown
- Coordinates stream routing between protocols

#### TranscodingManager
- Manages stream transcoding processes
- Supports multiple quality profiles
- Handles hardware acceleration (NVIDIA GPU)
- Optimizes resource usage based on server load

#### AuthManager
- Manages Hive blockchain authentication
- Handles stream key generation and validation
- Provides role-based access control
- Integrates with Hive's signature verification

#### MetadataManager
- Manages stream metadata storage and retrieval
- Integrates with Hive blockchain for persistent storage
- Handles real-time metadata updates
- Provides synchronization with Hive

## Features

### Streaming Protocols
- **WebRTC**
  - Ultra-low latency streaming
  - Peer-to-peer capabilities
  - Adaptive bitrate support
  
- **HLS (HTTP Live Streaming)**
  - Broad device compatibility
  - Adaptive quality streaming
  - VOD support
  
- **RTMP**
  - Traditional streaming ingest
  - Compatible with most streaming software
  - Low-latency configuration options

### Transcoding
- Multiple quality profiles
- Hardware acceleration support
- Adaptive bitrate streaming
- Resource usage optimization

### Authentication
- Hive blockchain integration
- Stream key management
- Role-based permissions
- Secure token generation

### Metadata Management
- Blockchain-based persistence
- Real-time updates
- Custom metadata schemas
- Automatic synchronization

## Getting Started

### Prerequisites
- Node.js 18.x or higher
- TypeScript 5.x
- NVIDIA drivers (optional, for GPU transcoding)

### Installation
```bash
# Clone the repository
git clone https://github.com/VIMM-TV/vimm-core.git

# Install dependencies
cd vimm-core
npm install
```

### Configuration
Create a `.env` file in the root directory:
```env
PORT=3000
NODE_ENV=development
HIVE_NODE=https://api.hive.blog
GPU_TRANSCODING=true
```

### Running the Server
```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

## Development

### Building
```bash
# Build TypeScript files
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

### Adding a New Protocol
1. Create a new handler in `src/protocols/`
2. Implement the protocol interface
3. Register the handler in `ProtocolManager`

### Custom Transcoding Profiles
Create a profile configuration in `src/transcoding/profiles/`:
```typescript
{
  resolution: "1920x1080",
  bitrate: 6000000,
  fps: 60,
  hardware: "nvenc"
}
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Related Repositories
- [VIMM Chat](https://github.com/VIMM-TV/vimm-chat)
- [VIMM Frontend](https://github.com/VIMM-TV/vimm-frontend)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- [GitHub Issues](https://github.com/VIMM-TV/vimm-core/issues)
- [Discord Community](https://discord.gg/vimm)

---

Powered by the Hive blockchain. Built by VIMM.