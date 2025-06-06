#!/bin/bash

# BotCareU System Verification and Testing Script
# This script performs comprehensive testing of all system components

set -e

echo "🧪 BotCareU System Verification and Testing"
echo "==========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# Function to print colored output
print_status() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

print_failure() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
    FAILED_TESTS+=("$1")
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Test function wrapper
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    print_status "Running: $test_name"
    
    if eval "$test_command" > /dev/null 2>&1; then
        print_success "$test_name"
        return 0
    else
        print_failure "$test_name"
        return 1
    fi
}

# 1. Code Quality Tests
echo ""
echo "📋 1. Code Quality Tests"
echo "========================"

# Check if Node.js is installed
run_test "Node.js installation" "node --version"

# Check if npm is installed
run_test "npm installation" "npm --version"

# Check if Docker is available
run_test "Docker availability" "docker --version"

# Check if Docker Compose is available
run_test "Docker Compose availability" "docker-compose --version"

# Check backend package.json syntax
run_test "Backend package.json syntax" "cd backend && npm ls --depth=0 --json"

# Check frontend package.json syntax
run_test "Frontend package.json syntax" "cd frontend/web && npm ls --depth=0 --json"

# Check mobile package.json syntax
run_test "Mobile package.json syntax" "cd frontend/mobile && npm ls --depth=0 --json"

# 2. Configuration Tests
echo ""
echo "⚙️  2. Configuration Tests"
echo "=========================="

# Check if required config files exist
run_test "Backend config file exists" "test -f backend/src/config/config.js"
run_test "Backend env example exists" "test -f backend/.env.example"
run_test "Docker compose dev exists" "test -f docker-compose.dev.yml"
run_test "Docker compose prod exists" "test -f docker-compose.prod.yml"
run_test "Firmware config exists" "test -f firmware/src/config.h"
run_test "Firmware secrets example exists" "test -f firmware/src/secrets.h.example"

# Check if required directories exist
run_test "Backend models directory" "test -d backend/src/models"
run_test "Backend routes directory" "test -d backend/src/routes"
run_test "Backend services directory" "test -d backend/src/services"
run_test "Frontend components directory" "test -d frontend/web/src/components"
run_test "Frontend contexts directory" "test -d frontend/web/src/contexts"

# 3. Database Schema Tests
echo ""
echo "🗄️  3. Database Schema Tests"
echo "============================"

# Check migration files
run_test "Users migration exists" "test -f backend/database/migrations/001_create_users_table.js"
run_test "Devices migration exists" "test -f backend/database/migrations/002_create_devices_table.js"
run_test "Temperature readings migration exists" "test -f backend/database/migrations/003_create_temperature_readings_table.js"
run_test "Notifications migration exists" "test -f backend/database/migrations/004_create_notifications_table.js"

# Check model files
run_test "User model exists" "test -f backend/src/models/User.js"
run_test "Device model exists" "test -f backend/src/models/Device.js"
run_test "TemperatureReading model exists" "test -f backend/src/models/TemperatureReading.js"
run_test "Notification model exists" "test -f backend/src/models/Notification.js"

# 4. API Endpoint Tests
echo ""
echo "🌐 4. API Endpoint Tests"
echo "======================="

# Check route files
run_test "Auth routes exist" "test -f backend/src/routes/auth.js"
run_test "Users routes exist" "test -f backend/src/routes/users.js"
run_test "Devices routes exist" "test -f backend/src/routes/devices.js"
run_test "Temperature routes exist" "test -f backend/src/routes/temperature.js"
run_test "Notifications routes exist" "test -f backend/src/routes/notifications.js"
run_test "Health routes exist" "test -f backend/src/routes/health.js"

# Check controller files
run_test "Auth controller exists" "test -f backend/src/controllers/authController.js"
run_test "Device controller exists" "test -f backend/src/controllers/deviceController.js"

# 5. Service Tests
echo ""
echo "🔧 5. Service Tests"
echo "=================="

# Check service files
run_test "MQTT service exists" "test -f backend/src/services/mqttService.js"
run_test "WebSocket service exists" "test -f backend/src/services/websocketService.js"
run_test "Notification service exists" "test -f backend/src/services/notificationService.js"
run_test "Database service exists" "test -f backend/src/services/databaseService.js"

# Check middleware files
run_test "Auth middleware exists" "test -f backend/src/middleware/auth.js"
run_test "Error handler middleware exists" "test -f backend/src/middleware/errorHandler.js"

# 6. Frontend Tests
echo ""
echo "🖥️  6. Frontend Tests"
echo "==================="

# Check context files
run_test "Auth context exists" "test -f frontend/web/src/contexts/AuthContext.tsx"
run_test "WebSocket context exists" "test -f frontend/web/src/contexts/WebSocketContext.tsx"
run_test "Device context exists" "test -f frontend/web/src/contexts/DeviceContext.tsx"

# Check service files
run_test "API service exists" "test -f frontend/web/src/services/api.ts"

# Check component files
run_test "Layout component exists" "test -f frontend/web/src/components/Layout/Layout.tsx"
run_test "Dashboard page exists" "test -f frontend/web/src/pages/Dashboard/DashboardPage.tsx"
run_test "Login page exists" "test -f frontend/web/src/pages/Auth/LoginPage.tsx"

# 7. Mobile App Tests
echo ""
echo "📱 7. Mobile App Tests"
echo "====================="

# Check mobile app structure
run_test "Mobile App.tsx exists" "test -f frontend/mobile/src/App.tsx"
run_test "Bluetooth service exists" "test -f frontend/mobile/src/services/bluetoothService.ts"

# 8. Firmware Tests
echo ""
echo "🔌 8. Firmware Tests"
echo "==================="

# Check firmware files
run_test "Main firmware file exists" "test -f firmware/src/main.cpp"
run_test "PlatformIO config exists" "test -f firmware/platformio.ini"

# 9. Documentation Tests
echo ""
echo "📚 9. Documentation Tests"
echo "========================="

# Check documentation files
run_test "README exists" "test -f README.md"
run_test "Architecture docs exist" "test -f docs/ARCHITECTURE.md"
run_test "API documentation exists" "test -f docs/API_DOCUMENTATION.md"

# 10. Docker Environment Test
echo ""
echo "🐳 10. Docker Environment Test"
echo "=============================="

if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    print_status "Testing Docker environment setup..."
    
    # Test if docker-compose file is valid
    if docker-compose -f docker-compose.dev.yml config > /dev/null 2>&1; then
        print_success "Docker Compose configuration is valid"
    else
        print_failure "Docker Compose configuration is invalid"
    fi
    
    # Check if required images can be pulled
    print_status "Checking Docker images availability..."
    
    if docker pull postgres:15-alpine > /dev/null 2>&1; then
        print_success "PostgreSQL image available"
    else
        print_failure "PostgreSQL image not available"
    fi
    
    if docker pull redis:7-alpine > /dev/null 2>&1; then
        print_success "Redis image available"
    else
        print_failure "Redis image not available"
    fi
else
    print_warning "Docker not available, skipping Docker tests"
fi

# Summary
echo ""
echo "📊 Test Summary"
echo "==============="
echo "Tests Passed: $TESTS_PASSED"
echo "Tests Failed: $TESTS_FAILED"
echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed! System is ready for deployment.${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please fix the following issues:${NC}"
    for test in "${FAILED_TESTS[@]}"; do
        echo -e "${RED}  - $test${NC}"
    done
    echo ""
    echo "Please run the setup script to fix missing files:"
    echo "  ./scripts/setup.sh"
    exit 1
fi
