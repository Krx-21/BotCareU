#!/bin/bash

# BotCareU Project Setup Script
# This script sets up the development environment for the BotCareU IoT health monitoring system

set -e

echo "🏥 BotCareU IoT Health Monitoring System Setup"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_requirements() {
    print_status "Checking system requirements..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 16+ and try again."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        print_error "Node.js version 16+ is required. Current version: $(node --version)"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm and try again."
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_warning "Docker is not installed. Some features may not work."
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_warning "Docker Compose is not installed. Some features may not work."
    fi
    
    print_success "System requirements check completed"
}

# Setup backend
setup_backend() {
    print_status "Setting up backend..."
    
    cd backend
    
    # Install dependencies
    print_status "Installing backend dependencies..."
    npm install
    
    # Copy environment file
    if [ ! -f .env ]; then
        print_status "Creating backend environment file..."
        cp .env.example .env
        print_warning "Please update backend/.env with your configuration"
    fi
    
    cd ..
    print_success "Backend setup completed"
}

# Setup web frontend
setup_web_frontend() {
    print_status "Setting up web frontend..."
    
    cd frontend/web
    
    # Install dependencies
    print_status "Installing web frontend dependencies..."
    npm install
    
    # Create environment file
    if [ ! -f .env ]; then
        print_status "Creating web frontend environment file..."
        cat > .env << EOF
VITE_API_URL=http://localhost:3001/api/v1
VITE_WS_URL=ws://localhost:3001
VITE_MQTT_WS_URL=ws://localhost:9001
EOF
        print_success "Web frontend environment file created"
    fi
    
    cd ../..
    print_success "Web frontend setup completed"
}

# Setup mobile app
setup_mobile_app() {
    print_status "Setting up mobile app..."
    
    cd frontend/mobile
    
    # Install dependencies
    print_status "Installing mobile app dependencies..."
    npm install
    
    # Create environment file
    if [ ! -f .env ]; then
        print_status "Creating mobile app environment file..."
        cat > .env << EOF
API_URL=http://localhost:3001/api/v1
WS_URL=ws://localhost:3001
EOF
        print_success "Mobile app environment file created"
    fi
    
    cd ../..
    print_success "Mobile app setup completed"
}

# Setup firmware
setup_firmware() {
    print_status "Setting up firmware..."
    
    cd firmware
    
    # Copy secrets file
    if [ ! -f src/secrets.h ]; then
        print_status "Creating firmware secrets file..."
        cp src/secrets.h.example src/secrets.h
        print_warning "Please update firmware/src/secrets.h with your WiFi and MQTT credentials"
    fi
    
    cd ..
    print_success "Firmware setup completed"
}

# Setup database
setup_database() {
    print_status "Setting up database..."
    
    # Create database directory
    mkdir -p backend/database/init
    
    # Create initialization script
    cat > backend/database/init/01-init.sql << EOF
-- BotCareU Database Initialization
-- This script creates the initial database structure

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create initial admin user (password: admin123)
-- This should be changed in production
INSERT INTO users (id, email, password, first_name, last_name, role, is_active, is_email_verified)
VALUES (
    uuid_generate_v4(),
    'admin@botcareu.com',
    '\$2a\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', -- admin123
    'System',
    'Administrator',
    'admin',
    true,
    true
) ON CONFLICT (email) DO NOTHING;

-- Create sample patient user (password: patient123)
INSERT INTO users (id, email, password, first_name, last_name, role, is_active, is_email_verified)
VALUES (
    uuid_generate_v4(),
    'patient@botcareu.com',
    '\$2a\$12\$8K1p3a8lkfj2l3k4j5l6m7n8o9p0q1r2s3t4u5v6w7x8y9z0a1b2c3', -- patient123
    'John',
    'Doe',
    'patient',
    true,
    true
) ON CONFLICT (email) DO NOTHING;

COMMIT;
EOF
    
    print_success "Database setup completed"
}

# Setup MQTT configuration
setup_mqtt() {
    print_status "Setting up MQTT configuration..."
    
    mkdir -p backend/mqtt
    
    # Create MQTT configuration
    cat > backend/mqtt/mosquitto.conf << EOF
# BotCareU MQTT Broker Configuration

# Basic settings
listener 1883
allow_anonymous true

# WebSocket support
listener 9001
protocol websockets

# Logging
log_dest stdout
log_type all

# Persistence
persistence true
persistence_location /mosquitto/data/

# Security (for production, enable authentication)
# password_file /mosquitto/config/passwd
# acl_file /mosquitto/config/acl
EOF
    
    print_success "MQTT configuration completed"
}

# Setup Docker environment
setup_docker() {
    if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
        print_status "Setting up Docker environment..."
        
        # Create .env file for Docker Compose
        if [ ! -f .env ]; then
            cat > .env << EOF
# Database Configuration
DB_USER=botcareu_user
DB_PASSWORD=botcareu_password_change_in_production

# InfluxDB Configuration
INFLUXDB_USER=admin
INFLUXDB_PASSWORD=admin_password_change_in_production
INFLUXDB_TOKEN=dev-token-please-change-in-production

# Redis Configuration
REDIS_PASSWORD=redis_password_change_in_production

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
ENCRYPTION_KEY=your-32-character-encryption-key

# External Services (update with your credentials)
SENDGRID_API_KEY=your-sendgrid-api-key
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token

# Monitoring
GRAFANA_PASSWORD=admin_password_change_in_production
EOF
            print_warning "Please update .env file with your production credentials"
        fi
        
        print_success "Docker environment setup completed"
    else
        print_warning "Docker not available, skipping Docker setup"
    fi
}

# Main setup function
main() {
    print_status "Starting BotCareU setup..."
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
        print_error "Please run this script from the BotCareU project root directory"
        exit 1
    fi
    
    check_requirements
    setup_backend
    setup_web_frontend
    setup_mobile_app
    setup_firmware
    setup_database
    setup_mqtt
    setup_docker
    
    # Install root dependencies
    print_status "Installing root dependencies..."
    npm install
    
    print_success "🎉 BotCareU setup completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Update configuration files with your credentials:"
    echo "   - backend/.env"
    echo "   - firmware/src/secrets.h"
    echo "   - .env (for Docker)"
    echo ""
    echo "2. Start the development environment:"
    echo "   npm run docker:dev"
    echo ""
    echo "3. Access the applications:"
    echo "   - Web Dashboard: http://localhost:3000"
    echo "   - API Documentation: http://localhost:3001"
    echo "   - Database Admin: http://localhost:8080"
    echo ""
    echo "For more information, see the README.md file."
}

# Run main function
main "$@"
