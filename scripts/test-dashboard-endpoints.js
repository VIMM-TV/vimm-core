/**
 * API Endpoints Test Script
 * 
 * This script tests the three new dashboard API endpoints.
 * 
 * Prerequisites:
 * 1. Server must be running
 * 2. You must have a valid JWT token
 * 3. Test channel must exist in database
 * 
 * Usage: 
 * 1. Update JWT_TOKEN and TEST_USERNAME below
 * 2. Run: node scripts/test-dashboard-endpoints.js
 */

require('dotenv').config();
const https = require('https');
const http = require('http');

// ==================== CONFIGURATION ====================
// Update these values for your test environment
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const JWT_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Replace with a valid JWT token
const TEST_USERNAME = 'testuser'; // Replace with a test username
// =======================================================

const axios = require('axios');

// Configure axios to use HTTP/HTTPS based on SERVER_URL
const client = axios.create({
  baseURL: SERVER_URL,
  headers: {
    'Authorization': `Bearer ${JWT_TOKEN}`,
    'Content-Type': 'application/json'
  },
  // Disable SSL verification for local testing (remove in production)
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  httpAgent: new http.Agent()
});

async function testEndpoints() {
  console.log('='.repeat(60));
  console.log('Testing Dashboard API Endpoints');
  console.log('='.repeat(60));
  console.log(`Server: ${SERVER_URL}`);
  console.log(`Username: ${TEST_USERNAME}`);
  console.log('='.repeat(60));
  console.log();

  // Test 1: Stream Statistics
  console.log('Test 1: Stream Statistics Endpoint');
  console.log('-'.repeat(60));
  try {
    const response = await client.get(`/api/streams/stats/${TEST_USERNAME}`);
    console.log('✓ Status:', response.status);
    console.log('Response:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('✗ Error:', error.response?.status || error.message);
    if (error.response?.data) {
      console.log('Error details:', JSON.stringify(error.response.data, null, 2));
    }
  }
  console.log();

  // Test 2: Follower Growth (7 days)
  console.log('Test 2: Follower Growth Endpoint (7 days)');
  console.log('-'.repeat(60));
  try {
    const response = await client.get(`/api/streams/followers/growth/${TEST_USERNAME}?days=7`);
    console.log('✓ Status:', response.status);
    console.log('Response:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('✗ Error:', error.response?.status || error.message);
    if (error.response?.data) {
      console.log('Error details:', JSON.stringify(error.response.data, null, 2));
    }
  }
  console.log();

  // Test 3: Follower Growth (30 days)
  console.log('Test 3: Follower Growth Endpoint (30 days)');
  console.log('-'.repeat(60));
  try {
    const response = await client.get(`/api/streams/followers/growth/${TEST_USERNAME}?days=30`);
    console.log('✓ Status:', response.status);
    console.log('Response (truncated to first 3 entries):');
    const data = response.data;
    console.log(JSON.stringify(data.slice(0, 3), null, 2));
    if (data.length > 3) {
      console.log(`... and ${data.length - 3} more entries`);
    }
  } catch (error) {
    console.log('✗ Error:', error.response?.status || error.message);
    if (error.response?.data) {
      console.log('Error details:', JSON.stringify(error.response.data, null, 2));
    }
  }
  console.log();

  // Test 4: Banned Users List
  console.log('Test 4: Banned Users List Endpoint');
  console.log('-'.repeat(60));
  try {
    const response = await client.get(`/api/chat/banned/${TEST_USERNAME}`);
    console.log('✓ Status:', response.status);
    console.log('Response:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('✗ Error:', error.response?.status || error.message);
    if (error.response?.data) {
      console.log('Error details:', JSON.stringify(error.response.data, null, 2));
    }
  }
  console.log();

  // Test 5: Authentication Test (no token)
  console.log('Test 5: Authentication Test (no token - should fail with 401)');
  console.log('-'.repeat(60));
  try {
    const noAuthClient = axios.create({ baseURL: SERVER_URL });
    await noAuthClient.get(`/api/streams/stats/${TEST_USERNAME}`);
    console.log('✗ Unexpected success - authentication should have failed');
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✓ Correctly returned 401 Unauthorized');
      console.log('Error message:', error.response.data);
    } else {
      console.log('✗ Unexpected error:', error.response?.status || error.message);
    }
  }
  console.log();

  // Test 6: Non-existent channel (should return 404)
  console.log('Test 6: Non-existent Channel Test (should return 404)');
  console.log('-'.repeat(60));
  try {
    await client.get('/api/streams/stats/nonexistentuser12345');
    console.log('✗ Unexpected success - should have returned 404');
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('✓ Correctly returned 404 Not Found');
      console.log('Error message:', error.response.data);
    } else {
      console.log('✗ Unexpected error:', error.response?.status || error.message);
    }
  }
  console.log();

  console.log('='.repeat(60));
  console.log('Testing Complete');
  console.log('='.repeat(60));
}

// Check if axios is installed
try {
  require.resolve('axios');
} catch (e) {
  console.error('Error: axios is not installed.');
  console.error('Please run: npm install axios');
  process.exit(1);
}

// Check configuration
if (JWT_TOKEN === 'YOUR_JWT_TOKEN_HERE') {
  console.error('Error: Please update JWT_TOKEN in the script before running.');
  process.exit(1);
}

if (TEST_USERNAME === 'testuser') {
  console.warn('Warning: Using default test username. Update TEST_USERNAME for real testing.');
}

// Run tests
testEndpoints().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
