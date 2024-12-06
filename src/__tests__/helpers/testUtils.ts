import { StreamConfig, QualityProfile, StreamMetadata } from '../../types';

export const createMockStreamConfig = (
  overrides: Partial<StreamConfig> = {}
): StreamConfig => ({
  id: 'test-stream-1',
  key: 'test-key',
  protocol: 'rtmp',
  quality: createMockQualityProfile(),
  metadata: createMockStreamMetadata(),
  ...overrides
});

export const createMockQualityProfile = (
  overrides: Partial<QualityProfile> = {}
): QualityProfile => ({
  resolution: '1920x1080',
  bitrate: 4500,
  fps: 30,
  ...overrides
});

export const createMockStreamMetadata = (
  overrides: Partial<StreamMetadata> = {}
): StreamMetadata => ({
  title: 'Test Stream',
  description: 'This is a test stream',
  tags: ['test', 'streaming'],
  category: 'testing',
  hiveUsername: 'tester',
  timestamp: Date.now(),
  ...overrides
});

export const mockEventEmitter = () => {
  const listeners: { [key: string]: Function[] } = {};
  
  return {
    on: jest.fn((event: string, callback: Function) => {
      if (!listeners[event]) {
        listeners[event] = [];
      }
      listeners[event].push(callback);
    }),
    emit: jest.fn((event: string, ...args: any[]) => {
      if (listeners[event]) {
        listeners[event].forEach(callback => callback(...args));
      }
    }),
    removeAllListeners: jest.fn((event?: string) => {
      if (event) {
        delete listeners[event];
      } else {
        Object.keys(listeners).forEach(key => delete listeners[key]);
      }
    })
  };
};