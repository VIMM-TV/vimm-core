import { VIMMServer } from '../Server';
import { StreamManager } from '../core/StreamManager';
import { ProtocolManager } from '../protocols/ProtocolManager';
import { MetadataManager } from '../metadata/MetadataManager';
import { StreamConfig } from '../types';

// Mock the managers
jest.mock('../core/StreamManager');
jest.mock('../protocols/ProtocolManager');
jest.mock('../metadata/MetadataManager');

describe('VIMMServer', () => {
  let server: VIMMServer;
  let streamManager: jest.Mocked<StreamManager>;
  let protocolManager: jest.Mocked<ProtocolManager>;
  let metadataManager: jest.Mocked<MetadataManager>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create a new server instance
    server = new VIMMServer();
    
    // Get the mocked instances
    streamManager = (StreamManager as jest.Mock).mock.instances[0] as jest.Mocked<StreamManager>;
    protocolManager = (ProtocolManager as jest.Mock).mock.instances[0] as jest.Mocked<ProtocolManager>;
    metadataManager = (MetadataManager as jest.Mock).mock.instances[0] as jest.Mocked<MetadataManager>;
  });

  describe('initialization', () => {
    it('should create manager instances on construction', () => {
      expect(StreamManager).toHaveBeenCalled();
      expect(ProtocolManager).toHaveBeenCalled();
      expect(MetadataManager).toHaveBeenCalled();
    });

    it('should start successfully', async () => {
      await expect(server.start()).resolves.not.toThrow();
    });

    it('should stop successfully', async () => {
      await expect(server.stop()).resolves.not.toThrow();
    });
  });

  describe('stream events', () => {
    const mockStreamConfig: StreamConfig = {
      id: 'test-stream-1',
      key: 'test-key',
      protocol: 'rtmp',
      quality: {
        resolution: '1920x1080',
        bitrate: 4500,
        fps: 30
      },
      metadata: {
        title: 'Test Stream',
        hiveUsername: 'tester',
        timestamp: Date.now()
      }
    };

    it('should handle streamStarted event', () => {
      // Mock getStream to return our mock config
      streamManager.getStream.mockReturnValue(mockStreamConfig);

      // Simulate stream started event
      streamManager.emit('streamStarted', mockStreamConfig.id);

      // Verify protocol initialization was called
      expect(protocolManager.initializeProtocol).toHaveBeenCalledWith(
        mockStreamConfig.protocol,
        mockStreamConfig.id
      );
    });

    it('should handle streamEnded event', () => {
      // Mock getStream to return our mock config
      streamManager.getStream.mockReturnValue(mockStreamConfig);

      // Simulate stream ended event
      streamManager.emit('streamEnded', mockStreamConfig.id);

      // Verify protocol and metadata cleanup
      expect(protocolManager.stopProtocol).toHaveBeenCalledWith(
        mockStreamConfig.protocol,
        mockStreamConfig.id
      );
      expect(metadataManager.deleteStreamMetadata).toHaveBeenCalledWith(
        mockStreamConfig.id
      );
    });

    it('should not initialize protocol if stream config is not found', () => {
      // Mock getStream to return undefined
      streamManager.getStream.mockReturnValue(undefined);

      // Simulate stream started event
      streamManager.emit('streamStarted', 'non-existent-stream');

      // Verify protocol initialization was not called
      expect(protocolManager.initializeProtocol).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle initialization errors gracefully', async () => {
      // Mock StreamManager to throw on start
      const error = new Error('Failed to initialize');
      streamManager.start = jest.fn().mockRejectedValue(error);

      // Start server and expect it to handle the error
      await expect(server.start()).rejects.toThrow('Failed to initialize');
    });

    it('should handle shutdown errors gracefully', async () => {
      // Mock StreamManager to throw on stop
      const error = new Error('Failed to shutdown');
      streamManager.stop = jest.fn().mockRejectedValue(error);

      // Stop server and expect it to handle the error
      await expect(server.stop()).rejects.toThrow('Failed to shutdown');
    });
  });
});