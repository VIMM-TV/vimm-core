# Authentication Integration Specification
## vimm-core Authentication System - External Component Integration Guide

**Purpose**: Reference document for implementing authentication in external components that interface with vimm-core APIs.
**Target Use**: AI-assisted implementation in separate repositories that need authenticated API access.
**Note**: Source files referenced below DO NOT exist in consuming repositories - this spec provides all necessary implementation details.

---

## System Overview

Authentication flow: Hive Keychain (browser) → Challenge-Response → JWT Token → Authenticated API Access

**Core Dependencies Required in External Repos**:
```json
{
  "jsonwebtoken": "^9.0.2",
  "@hiveio/dhive": "^1.3.2"  // Only if implementing signature verification
}
```

---

## API Endpoints Reference

### Base URL Pattern
All authentication endpoints: `{CORE_API_BASE}/api/auth/*`
All authenticated endpoints: `{CORE_API_BASE}/api/*`

Default: `http://localhost:8080/api` or production URL as configured.

---

## Authentication Flow Implementation

### Step 1: Request Challenge
**Endpoint**: `GET /api/auth/challenge`

**Request**: None required

**Response**:
```json
{
  "challenge": "64-character-hex-string"
}
```

**Client Implementation**:
```javascript
async function getChallenge(apiBase) {
  const response = await fetch(`${apiBase}/api/auth/challenge`);
  const data = await response.json();
  return data.challenge;
}
```

**Server-side details** (for reference only):
- Challenge generated via `crypto.randomBytes(32).toString('hex')`
- Stored in-memory Map with timestamp
- Expires after 5 minutes (300000ms)
- Single-use (deleted after verification)

---

### Step 2: Sign Challenge with Hive Keychain
**Browser-side Implementation** (requires Hive Keychain extension):

```javascript
function signChallenge(username, challenge) {
  return new Promise((resolve, reject) => {
    if (!window.hive_keychain) {
      reject(new Error('Hive Keychain not installed'));
      return;
    }

    // Message format: username + challenge concatenated
    const message = username + challenge;
    
    window.hive_keychain.requestSignBuffer(
      username,
      message,
      'Posting',  // Use posting key authority
      response => {
        if (response.success) {
          resolve({
            username: response.data.username,
            signature: response.result,
            challenge: challenge
          });
        } else {
          reject(new Error(response.message));
        }
      }
    );
  });
}
```

**Critical Details**:
- Message to sign: `${username}${challenge}` (direct concatenation, no separator)
- Key type: 'Posting' authority
- Response contains signature in `response.result`

---

### Step 3: Submit Authentication
**Endpoint**: `POST /api/auth/hive`

**Request Body**:
```json
{
  "username": "hiveusername",
  "signature": "signature-from-keychain",
  "challenge": "original-challenge-string"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "username": "hiveusername",
  "message": "Authentication successful"
}
```

**Error Responses**:
- 400: Missing fields, invalid challenge, or challenge expired
- 401: Invalid signature format
- 500: Server error

**Client Implementation**:
```javascript
async function authenticate(apiBase, username, signature, challenge) {
  const response = await fetch(`${apiBase}/api/auth/hive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, signature, challenge })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Authentication failed');
  }
  
  const data = await response.json();
  // Store token for subsequent requests
  localStorage.setItem('auth_token', data.token);
  return data;
}
```

---

## JWT Token Details

**Token Structure**:
```javascript
// Payload
{
  "hiveAccount": "username",
  "iat": 1234567890,  // Issued at timestamp
  "exp": 1234567890   // Expiration (7 days from issue)
}
```

**Token Configuration**:
- Algorithm: HS256
- Secret: `process.env.JWT_SECRET` (fallback: 'your-secret-key' - CHANGE IN PRODUCTION)
- Expiration: 7 days
- Header format: `Authorization: Bearer {token}`

**Token Generation** (reference only, happens server-side):
```javascript
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function generateToken(hiveAccount) {
  return jwt.sign(
    { hiveAccount },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}
```

---

## Using Authenticated Endpoints

### Token Verification Endpoint
**Endpoint**: `POST /api/auth/verify`

**Request Headers**:
```
Authorization: Bearer {token}
```

**Success Response** (200):
```json
{
  "success": true,
  "valid": true,
  "username": "hiveusername",
  "message": "Token is valid"
}
```

**Error Responses**:
- 401: Missing/invalid token, token expired

**Client Implementation**:
```javascript
async function verifyToken(apiBase, token) {
  const response = await fetch(`${apiBase}/api/auth/verify`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    return false;
  }
  
  const data = await response.json();
  return data.valid;
}
```

---

### Making Authenticated API Calls

**Pattern for ALL authenticated endpoints**:
```javascript
async function authenticatedRequest(apiBase, endpoint, method = 'GET', body = null) {
  const token = localStorage.getItem('auth_token');
  
  if (!token) {
    throw new Error('Not authenticated');
  }
  
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
  
  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${apiBase}${endpoint}`, options);
  
  if (response.status === 401 || response.status === 403) {
    // Token invalid or expired - trigger re-authentication
    localStorage.removeItem('auth_token');
    throw new Error('Authentication required');
  }
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Request failed');
  }
  
  return await response.json();
}
```

---

## Authenticated Endpoint Inventory

### User Endpoints
**Base**: `/api/user`

#### GET /api/user/followed-channels
**Auth**: Required
**Query Params**: 
- `page` (number, default: 1)
- `limit` (number, default: 20, max: 100)

**Response**:
```json
{
  "followedChannels": [
    {
      "followId": 1,
      "followedAt": "2023-01-01T00:00:00.000Z",
      "channel": {
        "username": "streamer1",
        "title": "Stream Title",
        "description": "...",
        "language": "en",
        "category": "gaming",
        "isLive": true,
        "streamId": "ABC123",
        "thumbnail": "/thumbnails/ABC123.jpg",
        "streamPath": "/live/ABC123"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 100,
    "itemsPerPage": 20
  }
}
```

**Usage**:
```javascript
const followedChannels = await authenticatedRequest(
  apiBase, 
  '/api/user/followed-channels?page=1&limit=20'
);
```

---

### Channel Endpoints
**Base**: `/api/channels`

#### POST /api/channels/follow
**Auth**: Required
**Body**:
```json
{
  "channelUsername": "username-to-follow"
}
```

**Success Response** (201):
```json
{
  "success": true,
  "message": "Successfully followed @username",
  "follow": {
    "id": 123,
    "follower": "your-username",
    "followed": "username-to-follow",
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
}
```

**Error Responses**:
- 400: Missing channelUsername or attempting self-follow
- 404: Channel not found
- 409: Already following

**Usage**:
```javascript
await authenticatedRequest(
  apiBase,
  '/api/channels/follow',
  'POST',
  { channelUsername: 'streamer1' }
);
```

#### DELETE /api/channels/unfollow
**Auth**: Required
**Body**:
```json
{
  "channelUsername": "username-to-unfollow"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Successfully unfollowed @username"
}
```

**Usage**:
```javascript
await authenticatedRequest(
  apiBase,
  '/api/channels/unfollow',
  'DELETE',
  { channelUsername: 'streamer1' }
);
```

#### GET /api/channels/my-channel
**Auth**: Required
**Description**: Get authenticated user's channel settings and stream information

**Response**:
```json
{
  "channel": {
    "username": "your-username",
    "streamKey": "your-stream-key",
    "streamId": "STREAM123",
    "isLive": false,
    "title": "My Stream",
    "description": "Stream description",
    "language": "en",
    "category": "gaming",
    "lastUsed": "2023-01-01T00:00:00.000Z"
  }
}
```

#### PUT /api/channels/my-channel
**Auth**: Required
**Description**: Update authenticated user's channel settings

**Body** (all fields optional):
```json
{
  "streamTitle": "New Stream Title",
  "streamDescription": "New description",
  "streamLanguage": "en",
  "streamCategory": "gaming"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Channel settings updated successfully",
  "channel": {
    "username": "your-username",
    "streamTitle": "New Stream Title",
    "streamDescription": "New description",
    "streamLanguage": "en",
    "streamCategory": "gaming"
  }
}
```

---

### Stream Key Endpoint
**Endpoint**: `POST /api/auth/stream-key`

**Auth**: NOT required (uses Hive Keychain verification instead)
**Note**: This endpoint is separate from JWT auth flow

**Body**:
```json
{
  "username": "hiveusername"
}
```

**Response**:
```json
{
  "streamKey": "64-character-hex-string"
}
```

**Usage**: For OBS/streaming software configuration

---

## Complete Authentication Flow Example

```javascript
class VimmAuth {
  constructor(apiBase) {
    this.apiBase = apiBase;
    this.token = localStorage.getItem('auth_token');
  }

  async login(username) {
    // Step 1: Get challenge
    const challengeResp = await fetch(`${this.apiBase}/api/auth/challenge`);
    const { challenge } = await challengeResp.json();

    // Step 2: Sign with Hive Keychain
    const signResult = await new Promise((resolve, reject) => {
      if (!window.hive_keychain) {
        reject(new Error('Hive Keychain not installed'));
        return;
      }

      const message = username + challenge;
      
      window.hive_keychain.requestSignBuffer(
        username,
        message,
        'Posting',
        response => {
          if (response.success) {
            resolve({
              signature: response.result,
              username: response.data.username
            });
          } else {
            reject(new Error(response.message));
          }
        }
      );
    });

    // Step 3: Authenticate
    const authResp = await fetch(`${this.apiBase}/api/auth/hive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: signResult.username,
        signature: signResult.signature,
        challenge
      })
    });

    if (!authResp.ok) {
      const error = await authResp.json();
      throw new Error(error.message);
    }

    const { token, username: authenticatedUser } = await authResp.json();
    this.token = token;
    localStorage.setItem('auth_token', token);
    
    return { token, username: authenticatedUser };
  }

  async verifyToken() {
    if (!this.token) return false;

    try {
      const response = await fetch(`${this.apiBase}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }

  logout() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  async request(endpoint, options = {}) {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${this.apiBase}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 401 || response.status === 403) {
      this.logout();
      throw new Error('Authentication required');
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }

    return await response.json();
  }
}

// Usage
const auth = new VimmAuth('http://localhost:8080');

// Login
await auth.login('hiveusername');

// Make authenticated requests
const channels = await auth.request('/api/user/followed-channels');
await auth.request('/api/channels/follow', {
  method: 'POST',
  body: JSON.stringify({ channelUsername: 'streamer1' })
});
```

---

## Server-Side Middleware Pattern

If implementing server-side proxy/middleware in external component:

```javascript
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      error: 'Access denied',
      message: 'No token provided' 
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ 
      error: 'Invalid token',
      message: 'Token is invalid or expired' 
    });
  }
}
```

**Note**: `req.user` will contain `{ hiveAccount: "username", iat: timestamp, exp: timestamp }`

---

## Error Handling Reference

### Common Error Patterns

**401 Unauthorized**:
- Missing token
- Invalid token
- Expired token
- Action: Trigger re-authentication

**403 Forbidden**:
- Valid token but insufficient permissions
- Action: Show permission denied message

**400 Bad Request**:
- Invalid challenge
- Expired challenge
- Missing required fields
- Action: Retry with new challenge or fix request

**404 Not Found**:
- Resource doesn't exist (e.g., channel to follow)
- Action: Show user-friendly error

**409 Conflict**:
- Resource already exists (e.g., already following)
- Action: Handle gracefully, may not be actual error

**500 Internal Server Error**:
- Server-side issue
- Action: Retry with exponential backoff

---

## Security Considerations

1. **Token Storage**: Use `localStorage` for web, secure storage for mobile
2. **Token Refresh**: No refresh token - re-authenticate after 7 days
3. **HTTPS Required**: All production communication must use HTTPS
4. **CORS**: Core API has CORS enabled - no proxy needed for browser apps
5. **Secret Key**: JWT_SECRET MUST be set via environment variable in production
6. **Challenge Expiration**: 5 minutes - handle expired challenges gracefully
7. **Hive Keychain**: Required for browser authentication - no fallback

---

## Testing Authentication

### Manual Test Sequence
1. Check Hive Keychain installed: `window.hive_keychain !== undefined`
2. GET challenge: `curl http://localhost:8080/api/auth/challenge`
3. Sign challenge with Keychain (browser only)
4. POST authentication with signature
5. Verify token: `curl -H "Authorization: Bearer {token}" http://localhost:8080/api/auth/verify`
6. Test authenticated endpoint: `curl -H "Authorization: Bearer {token}" http://localhost:8080/api/user/followed-channels`

### Expected Token Lifespan
- Issue: T+0
- Expiration: T+7days
- No automatic refresh
- User must re-authenticate after expiration

---

## Public (Non-Authenticated) Endpoints

For reference, these do NOT require authentication:

- `GET /api/streams` - List active streams
- `GET /api/streams/:username` - Get specific stream info
- `GET /api/auth/challenge` - Get authentication challenge
- `POST /api/auth/hive` - Submit authentication
- `POST /api/auth/verify` - Verify token (but needs token to verify)
- `POST /api/auth/stream-key` - Generate stream key (Keychain-based, not JWT)

---

## Implementation Checklist

When integrating in new component:

- [ ] Install dependencies: `jsonwebtoken` (optional: `@hiveio/dhive`)
- [ ] Configure API base URL (environment variable recommended)
- [ ] Implement challenge request function
- [ ] Implement Hive Keychain signing (browser) or alternative signing (server)
- [ ] Implement authentication submission
- [ ] Implement token storage (localStorage/secure storage)
- [ ] Implement token verification check on app load
- [ ] Implement authenticated request wrapper
- [ ] Add token expiration handling (401/403 responses)
- [ ] Add re-authentication flow when token expires
- [ ] Implement logout functionality
- [ ] Test complete authentication flow
- [ ] Test authenticated endpoint access
- [ ] Test token expiration handling
- [ ] Verify HTTPS in production
- [ ] Configure JWT_SECRET environment variable

---

## Environment Variables

Required in external component:

```env
VIMM_CORE_API_BASE=http://localhost:8080  # or production URL
JWT_SECRET=your-production-secret-key      # Must match vimm-core secret
```

Optional:
```env
AUTH_TOKEN_KEY=auth_token                  # localStorage key name
TOKEN_EXPIRY_DAYS=7                        # Must match server config
```

---

## Signature Verification (Advanced)

If implementing server-side signature verification (not typical for external components):

```javascript
const { Signature } = require('@hiveio/dhive');
const crypto = require('crypto');

function verifyHiveSignature(username, challenge, signature, publicKey) {
  try {
    const message = username + challenge;
    const messageHash = crypto.createHash('sha256').update(message, 'utf8').digest();
    const sig = Signature.fromString(signature);
    const pubKey = PrivateKey.fromString(publicKey).createPublic();
    return sig.verify(messageHash, pubKey);
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}
```

**Note**: This is handled by vimm-core API. External components typically don't need to verify signatures - they just pass signature to core API and receive JWT token.

---

## Quick Reference: Request Headers

**Authenticated Request**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Standard Request**:
```
Content-Type: application/json
```

---

## Complete API Surface Summary

### Authentication Endpoints (No Auth Required)
- `GET /api/auth/challenge` → Get challenge string
- `POST /api/auth/hive` → Submit signature, receive JWT
- `POST /api/auth/verify` → Verify token validity
- `POST /api/auth/stream-key` → Generate streaming key

### User Endpoints (Auth Required)
- `GET /api/user/followed-channels` → Get user's followed channels list

### Channel Endpoints (Auth Required)
- `POST /api/channels/follow` → Follow a channel
- `DELETE /api/channels/unfollow` → Unfollow a channel
- `GET /api/channels/my-channel` → Get own channel info
- `PUT /api/channels/my-channel` → Update own channel settings

### Public Stream Endpoints (No Auth)
- `GET /api/streams` → List all active streams
- `GET /api/streams/:username` → Get specific user's stream

---

## Token Payload Structure

```json
{
  "hiveAccount": "username",
  "iat": 1697203200,
  "exp": 1697808000
}
```

**Fields**:
- `hiveAccount`: Hive blockchain username (string)
- `iat`: Issued at timestamp (Unix epoch seconds)
- `exp`: Expiration timestamp (Unix epoch seconds)

**Access in middleware**: `req.user.hiveAccount` after token verification

---

## Framework Integration Notes

**For Frontend Components** (React, Vue, etc.):
- Store VimmAuth instance in state management (Redux, Vuex, Context)
- Check token validity on app mount
- Implement auth guards for protected routes
- Handle 401 responses globally (redirect to login)
- Show Keychain install prompt if not detected

**For Backend Components** (Node.js services):
- Use JWT secret from environment
- Implement middleware for protected routes
- Forward auth headers when proxying to vimm-core
- Don't store tokens - validate on each request
- Log authentication attempts for security

**For Mobile Apps**:
- Use secure storage for tokens (Keychain/KeyStore)
- Implement Hive Keychain mobile signing equivalent
- Handle background token expiration
- Implement token refresh prompt

---

**End of Specification**

This document contains all necessary information to implement authentication against vimm-core APIs without access to vimm-core source code. All referenced patterns, endpoints, and data structures are production-ready and currently implemented in vimm-core v1.0.0.
