const request = require('supertest');
const express = require('express');
const NodeMediaServer = require('node-media-server');
const streamStatusRoutes = require('../../api/routes/stream-status');
const { getUserByStreamId } = require('../../auth/streamkey');

// Mock dependencies
jest.mock('node-media-server');
jest.mock('../../auth/streamkey');

describe('Stream Status API Endpoints', () => {
    let app;
    const mockSession = {
        isStarting: true,
        startTime: Date.now() - 3600000, // Started 1 hour ago
        viewers: 42,
        videoWidth: 1920,
        videoHeight: 1080,
        videoFps: 60,
        videoBitrate: 6000,
        audioCodec: 'aac',
        videoCodec: 'h264',
        droppedFrames: 10,
        bandwidth: 8500000
    };

    const mockUserData = {
        hiveAccount: 'chirenonhive',
        streamTitle: 'Test Stream',
        streamDescription: 'Testing stream status',
        streamCategory: 'Gaming',
        streamLanguage: 'EN',
        streamTags: ['test', 'gaming'],
        chatEnabled: true,
        chatModeration: 'standard',
        allowReplays: true
    };

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Create Express app instance
        app = express();
        app.use(express.json());
        app.use('/api/stream', streamStatusRoutes);

        // Setup Node-Media-Server mock
        NodeMediaServer.mockImplementation(() => ({
            getSession: jest.fn().mockReturnValue({
                'test-stream-id': mockSession
            })
        }));

        // Setup getUserByStreamId mock
        getUserByStreamId.mockImplementation((streamId) => 
            streamId === 'test-stream-id' ? mockUserData : null
        );
    });

    describe('GET /api/stream/:streamId/status', () => {
        it('should return stream status for valid stream ID', async () => {
            const response = await request(app)
                .get('/api/stream/test-stream-id/status')
                .expect(200);

            expect(response.body).toHaveProperty('status');
            expect(response.body.status).toHaveProperty('id', 'test-stream-id');
            expect(response.body.status).toHaveProperty('online', true);
            expect(response.body.status).toHaveProperty('username', 'chirenonhive');
            expect(response.body.status.statistics).toHaveProperty('viewers', 42);
            expect(response.body.status.quality).toHaveProperty('width', 1920);
            expect(response.body.status.quality).toHaveProperty('height', 1080);
            expect(response.body).toHaveProperty('timestamp');
        });

        it('should return 404 for non-existent stream', async () => {
            const response = await request(app)
                .get('/api/stream/non-existent-stream/status')
                .expect(404);

            expect(response.body).toHaveProperty('error', 'Stream not found');
        });

        it('should return correct stream health metrics', async () => {
            const response = await request(app)
                .get('/api/stream/test-stream-id/status')
                .expect(200);

            expect(response.body.status.health).toHaveProperty('status');
            expect(response.body.status.health).toHaveProperty('droppedFrames');
            expect(response.body.status.health).toHaveProperty('bandwidth');
        });

        it('should handle server errors gracefully', async () => {
            // Force getUserByStreamId to throw an error
            getUserByStreamId.mockImplementation(() => {
                throw new Error('Database error');
            });

            const response = await request(app)
                .get('/api/stream/test-stream-id/status')
                .expect(500);

            expect(response.body).toHaveProperty('error', 'Internal server error');
        });
    });
});