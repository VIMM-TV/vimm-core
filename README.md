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

## Configuration

VIMM Core uses environment variables for configuration. Copy `.env.example` to `.env` and customize as needed:

```bash
cp .env.example .env
```

### Database Configuration

VIMM Core supports multiple database backends:

- **SQLite** (default) - No additional setup required
- **MySQL** - Requires MySQL server
- **PostgreSQL** - Requires PostgreSQL server

Configure your database using these environment variables:

```bash
# Database type
DB_DIALECT=sqlite  # sqlite, mysql, postgres

# For SQLite (default)
DB_STORAGE=database.sqlite

# For MySQL/PostgreSQL
DB_HOST=localhost
DB_PORT=3306       # 3306 for MySQL, 5432 for PostgreSQL
DB_NAME=vimm_core
DB_USERNAME=root
DB_PASSWORD=your_password
```

### Testing Database Configuration

You can test your database configuration by running:

```bash
npm run init-db
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

## License
This project is licensed under the MIT License - see the LICENSE file for details.

## Support
[GitHub Issues](https://github.com/VIMM-TV/vimm-core/issues)

---

Powered by the Hive blockchain. Built by VIMM.