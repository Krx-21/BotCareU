# BotCareU API Documentation

## Base URL
- **Development**: `http://localhost:3001/api/v1`
- **Production**: `https://api.botcareu.com/api/v1`

## Authentication

All protected endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

### Authentication Endpoints

#### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "YYYY-MM-DD",
  "gender": "male",
  "role": "patient"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "patient"
    },
    "tokens": {
      "accessToken": "jwt_access_token",
      "refreshToken": "jwt_refresh_token"
    }
  }
}
```

#### POST /auth/login
Authenticate user and receive access tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "patient"
    },
    "tokens": {
      "accessToken": "jwt_access_token",
      "refreshToken": "jwt_refresh_token"
    }
  }
}
```

#### POST /auth/refresh
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "jwt_refresh_token"
}
```

#### DELETE /auth/logout
Logout user and invalidate tokens.

**Headers:** `Authorization: Bearer <access_token>`

## User Management

#### GET /users/profile
Get current user profile.

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "YYYY-MM-DD",
    "gender": "male",
    "role": "patient",
    "preferences": {
      "temperatureUnit": "celsius",
      "feverThreshold": 37.5,
      "notificationsEnabled": true
    },
    "createdAt": "YYYY-MM-DDTHH:mm:ssZ",
    "updatedAt": "YYYY-MM-DDTHH:mm:ssZ"
  }
}
```

#### PUT /users/profile
Update user profile information.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "preferences": {
    "temperatureUnit": "fahrenheit",
    "feverThreshold": 99.5,
    "notificationsEnabled": true
  }
}
```

## Device Management

#### GET /devices
Get all devices associated with the current user.

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "device_uuid",
      "deviceId": "BotCareU_ABC123",
      "name": "Living Room Monitor",
      "status": "online",
      "batteryLevel": 85,
      "signalStrength": -45,
      "lastSeen": "YYYY-MM-DDTHH:mm:ssZ",
      "firmwareVersion": "1.0.0",
      "settings": {
        "measurementInterval": 60000,
        "feverThreshold": 37.5,
        "alertsEnabled": true
      }
    }
  ]
}
```

#### POST /devices/pair
Pair a new device with the user account.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "deviceId": "BotCareU_ABC123",
  "pairingCode": "123456",
  "name": "Living Room Monitor"
}
```

#### PUT /devices/{deviceId}/settings
Update device settings.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "name": "Bedroom Monitor",
  "settings": {
    "measurementInterval": 30000,
    "feverThreshold": 37.8,
    "alertsEnabled": true
  }
}
```

#### DELETE /devices/{deviceId}
Remove device from user account.

**Headers:** `Authorization: Bearer <access_token>`

## Temperature Data

#### GET /temperature/readings
Get temperature readings with optional filtering.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `deviceId` (optional): Filter by specific device
- `startDate` (optional): Start date for range (ISO 8601)
- `endDate` (optional): End date for range (ISO 8601)
- `limit` (optional): Number of results (default: 100, max: 1000)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "readings": [
      {
        "id": "reading_uuid",
        "deviceId": "BotCareU_ABC123",
        "infraredTemp": 36.8,
        "contactTemp": 36.9,
        "ambientTemp": 22.5,
        "measurementType": "infrared",
        "timestamp": "YYYY-MM-DDTHH:mm:ssZ",
        "isValid": true,
        "feverDetected": false
      }
    ],
    "pagination": {
      "total": 500,
      "limit": 100,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

#### POST /temperature/readings
Submit new temperature reading (typically from IoT device).

**Headers:** `Authorization: Bearer <device_token>`

**Request Body:**
```json
{
  "deviceId": "BotCareU_ABC123",
  "infraredTemp": 36.8,
  "contactTemp": 36.9,
  "ambientTemp": 22.5,
  "measurementType": "infrared",
  "timestamp": "YYYY-MM-DDTHH:mm:ssZ"
}
```

#### GET /temperature/analytics
Get temperature analytics and trends.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `deviceId` (optional): Filter by specific device
- `period` (optional): Time period (day, week, month, year)
- `startDate` (optional): Start date for analysis
- `endDate` (optional): End date for analysis

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "averageTemp": 36.7,
      "minTemp": 35.8,
      "maxTemp": 37.9,
      "feverEpisodes": 2,
      "totalReadings": 1440
    },
    "trends": [
      {
        "date": "YYYY-MM-DD",
        "averageTemp": 36.8,
        "minTemp": 36.2,
        "maxTemp": 37.1,
        "readingCount": 144
      }
    ],
    "hourlyPattern": [
      {
        "hour": 0,
        "averageTemp": 36.5
      }
    ]
  }
}
```

## Notifications

#### GET /notifications
Get user notifications.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `unreadOnly` (optional): Show only unread notifications (boolean)
- `type` (optional): Filter by notification type
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notification_uuid",
        "type": "fever_alert",
        "title": "Fever Detected",
        "message": "Temperature reading of 38.2°C detected on Living Room Monitor",
        "data": {
          "deviceId": "BotCareU_ABC123",
          "temperature": 38.2,
          "readingId": "reading_uuid"
        },
        "isRead": false,
        "createdAt": "YYYY-MM-DDTHH:mm:ssZ"
      }
    ],
    "unreadCount": 3
  }
}
```

#### PUT /notifications/{notificationId}/read
Mark notification as read.

**Headers:** `Authorization: Bearer <access_token>`

#### POST /notifications/send
Send custom notification (admin only).

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "userId": "user_uuid",
  "type": "system_alert",
  "title": "System Maintenance",
  "message": "Scheduled maintenance will occur tonight from 2-4 AM",
  "channels": ["push", "email"]
}
```

## Health Check

#### GET /health
Get API health status.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "YYYY-MM-DDTHH:mm:ssZ",
    "version": "1.0.0-alpha",
    "services": {
      "database": "healthy",
      "redis": "healthy",
      "mqtt": "healthy",
      "influxdb": "healthy"
    },
    "uptime": 86400
  }
}
```

## WebSocket Events

### Connection
Connect to WebSocket endpoint: `ws://localhost:3001` or `wss://api.botcareu.com`

### Authentication
Send authentication token after connection:
```json
{
  "type": "auth",
  "token": "jwt_access_token"
}
```

### Events

#### temperature:update
Real-time temperature reading updates.
```json
{
  "type": "temperature:update",
  "data": {
    "deviceId": "BotCareU_ABC123",
    "temperature": 36.8,
    "timestamp": "YYYY-MM-DDTHH:mm:ssZ"
  }
}
```

#### fever:alert
Fever detection alerts.
```json
{
  "type": "fever:alert",
  "data": {
    "deviceId": "BotCareU_ABC123",
    "temperature": 38.2,
    "severity": "moderate",
    "timestamp": "YYYY-MM-DDTHH:mm:ssZ"
  }
}
```

#### device:status
Device status updates.
```json
{
  "type": "device:status",
  "data": {
    "deviceId": "BotCareU_ABC123",
    "status": "online",
    "batteryLevel": 85,
    "timestamp": "YYYY-MM-DDTHH:mm:ssZ"
  }
}
```

## Error Responses

All error responses follow this format:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": "Additional error details if available"
  }
}
```

### Common Error Codes
- `UNAUTHORIZED`: Invalid or missing authentication token
- `FORBIDDEN`: Insufficient permissions
- `VALIDATION_ERROR`: Invalid request data
- `NOT_FOUND`: Requested resource not found
- `RATE_LIMITED`: Too many requests
- `INTERNAL_ERROR`: Server error

## Rate Limiting

API endpoints are rate limited:
- **General endpoints**: 100 requests per 15 minutes per IP
- **Authentication endpoints**: 10 requests per 15 minutes per IP
- **Temperature data**: 1000 requests per hour per device

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```
