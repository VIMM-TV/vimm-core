// Set up environment variables for testing
process.env.NODE_ENV = 'test';
process.env.SERVER_HOST = 'localhost';
process.env.RTMP_BASE_PORT = '1935';
process.env.HLS_OUTPUT_DIR = 'test/media/hls';

// Global test timeout
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
};