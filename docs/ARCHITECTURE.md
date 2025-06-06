# BotCareU System Architecture

## Overview

BotCareU is a comprehensive IoT health monitoring system designed to provide medical-grade temperature measurement with real-time data processing, secure cloud storage, and intuitive user interfaces. The system follows a microservices architecture with clear separation of concerns.

## System Components

### 1. IoT Device Layer (ESP32 Firmware)

**Purpose**: Hardware interface for temperature measurement and data collection

**Key Components**:
- **Temperature Sensors**:
  - MLX90614 infrared sensor (non-contact measurement)
  - DS18B20 digital sensor (contact measurement)
  - Medical-grade accuracy: ±0.1°C
- **Connectivity**: WiFi 802.11n, Bluetooth 5.0
- **Display**: 128x64 OLED for local readings
- **Security**: AES-256 encryption for data transmission

**Communication Protocols**:
- MQTT for real-time data streaming
- HTTP/HTTPS for configuration updates
- Bluetooth for mobile app pairing

### 2. Backend Services Layer

**Purpose**: API services, data processing, and business logic

**Architecture**: Node.js microservices with Express.js framework

**Core Services**:

#### 2.1 API Gateway Service
- Request routing and load balancing
- Authentication and authorization
- Rate limiting and security
- API versioning

#### 2.2 Authentication Service
- JWT-based authentication
- Role-based access control (RBAC)
- User registration and login
- Password reset and security

#### 2.3 Device Management Service
- Device registration and pairing
- Configuration management
- Firmware update distribution
- Device status monitoring

#### 2.4 Temperature Data Service
- Real-time temperature data ingestion
- Data validation and processing
- Historical data storage
- Fever detection algorithms

#### 2.5 Notification Service
- Real-time alerts for fever detection
- Multi-channel notifications (email, SMS, push)
- Emergency contact management
- Notification preferences

#### 2.6 Analytics Service
- Health trend analysis
- Statistical reporting
- Machine learning insights
- Population health analytics

### 3. Data Storage Layer

**Purpose**: Persistent data storage with optimized access patterns

**Databases**:

#### 3.1 PostgreSQL (Primary Database)
- **Purpose**: Structured data storage
- **Data Types**:
  - User profiles and authentication
  - Device information and settings
  - User preferences and configurations
  - Notification logs and settings

#### 3.2 InfluxDB (Time-Series Database)
- **Purpose**: Temperature measurement storage
- **Data Types**:
  - Real-time temperature readings
  - Device telemetry data
  - Historical measurement trends
  - Performance metrics

#### 3.3 Redis (Cache & Session Store)
- **Purpose**: High-performance caching and real-time data
- **Data Types**:
  - Session management
  - Real-time device status
  - Notification queues
  - API response caching

### 4. Frontend Applications Layer

**Purpose**: User interfaces for different user types and platforms

#### 4.1 Web Dashboard (React.js + TypeScript)
- **Target Users**: Healthcare providers, administrators
- **Features**:
  - Real-time monitoring dashboard
  - Patient management interface
  - Advanced analytics and reporting
  - System administration tools

#### 4.2 Mobile Application (React Native)
- **Target Users**: Patients, family members
- **Features**:
  - Personal health monitoring
  - Device pairing and management
  - Real-time notifications
  - Health history tracking

### 5. Communication Layer

**Purpose**: Real-time data transmission and messaging

#### 5.1 MQTT Broker (Eclipse Mosquitto)
- **Purpose**: IoT device communication
- **Features**:
  - Lightweight messaging protocol
  - Quality of Service (QoS) levels
  - Topic-based message routing
  - Secure authentication

#### 5.2 WebSocket Server (Socket.IO)
- **Purpose**: Real-time web communication
- **Features**:
  - Live dashboard updates
  - Instant notifications
  - Real-time device status
  - Bidirectional communication

## Data Flow Architecture

### 1. Temperature Measurement Flow

```
IoT Device → MQTT Broker → Backend API → Database Storage
     ↓
OLED Display ← Local Processing ← Sensor Reading
```

### 2. Real-time Notification Flow

```
Temperature Reading → Fever Detection → Notification Service → Multi-channel Delivery
                                              ↓
                                    WebSocket → Web Dashboard
                                    Push Notification → Mobile App
                                    Email/SMS → Emergency Contacts
```

### 3. User Interaction Flow

```
User Interface → API Gateway → Authentication → Service Router → Business Logic → Database
      ↑                                                                    ↓
WebSocket ← Real-time Updates ← Event Processing ← Data Changes ← Database Triggers
```

## Security Architecture

### 1. Data Encryption
- **In Transit**: TLS 1.3 for all HTTP/HTTPS communications
- **At Rest**: AES-256 encryption for sensitive data
- **Device Communication**: MQTT over TLS with client certificates

### 2. Authentication & Authorization
- **JWT Tokens**: Stateless authentication with refresh tokens
- **Role-Based Access Control**: Patient, Healthcare Provider, Administrator roles
- **API Security**: Rate limiting, input validation, SQL injection prevention

### 3. HIPAA Compliance
- **Data Minimization**: Only necessary health data collection
- **Audit Logging**: Comprehensive access and modification logs
- **Data Retention**: 7-year retention policy for medical records
- **User Consent**: Explicit consent for data collection and sharing

## Scalability Architecture

### 1. Horizontal Scaling
- **Microservices**: Independent service scaling
- **Load Balancing**: Nginx reverse proxy with multiple backend instances
- **Database Sharding**: Partitioned data storage for large datasets

### 2. Performance Optimization
- **Caching Strategy**: Multi-layer caching with Redis
- **CDN Integration**: Static asset delivery optimization
- **Database Indexing**: Optimized queries for time-series data

### 3. Monitoring & Observability
- **Health Checks**: Automated service health monitoring
- **Metrics Collection**: Performance and usage analytics
- **Error Tracking**: Centralized error logging and alerting

## Deployment Architecture

### 1. Development Environment
- **Docker Compose**: Local development stack
- **Hot Reloading**: Real-time code changes
- **Test Databases**: Isolated testing environment

### 2. Production Environment
- **Kubernetes**: Container orchestration
- **CI/CD Pipeline**: Automated testing and deployment
- **Blue-Green Deployment**: Zero-downtime updates

### 3. Cloud Infrastructure
- **Multi-Cloud Support**: AWS, Azure, Google Cloud compatibility
- **Auto-Scaling**: Dynamic resource allocation
- **Disaster Recovery**: Automated backup and recovery systems

## Integration Points

### 1. External APIs
- **Email Service**: SendGrid for transactional emails
- **SMS Service**: Twilio for text message alerts
- **Push Notifications**: Firebase Cloud Messaging (FCM)

### 2. Health Platforms
- **Apple Health**: iOS health data integration
- **Google Fit**: Android health data synchronization
- **FHIR**: Healthcare interoperability standards

### 3. Third-Party Services
- **Time Synchronization**: NTP servers for accurate timestamps
- **Geolocation**: IP-based location services
- **Analytics**: Custom analytics platform integration

## Future Architecture Considerations

### 1. Machine Learning Pipeline
- **Data Processing**: Real-time stream processing
- **Model Training**: Automated ML model updates
- **Prediction API**: Health prediction services

### 2. Edge Computing
- **Local Processing**: Reduced latency for critical alerts
- **Offline Capability**: Continued operation without internet
- **Edge Analytics**: Local data processing and insights

### 3. Blockchain Integration
- **Data Integrity**: Immutable health record storage
- **Patient Consent**: Blockchain-based consent management
- **Interoperability**: Secure health data sharing
