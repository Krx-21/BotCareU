# BotCareU System Verification and Testing Script (PowerShell)
# This script performs comprehensive testing of all system components

Write-Host "🧪 BotCareU System Verification and Testing" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan

# Test results
$TestsPassed = 0
$TestsFailed = 0
$FailedTests = @()

# Function to run tests
function Test-Component {
    param(
        [string]$TestName,
        [scriptblock]$TestCommand
    )
    
    Write-Host "[TEST] Running: $TestName" -ForegroundColor Blue
    
    try {
        $result = & $TestCommand
        if ($result -or $LASTEXITCODE -eq 0) {
            Write-Host "[PASS] $TestName" -ForegroundColor Green
            $script:TestsPassed++
            return $true
        } else {
            Write-Host "[FAIL] $TestName" -ForegroundColor Red
            $script:TestsFailed++
            $script:FailedTests += $TestName
            return $false
        }
    } catch {
        Write-Host "[FAIL] $TestName - Error: $($_.Exception.Message)" -ForegroundColor Red
        $script:TestsFailed++
        $script:FailedTests += $TestName
        return $false
    }
}

# Function to test file existence
function Test-FileExists {
    param([string]$FilePath)
    return Test-Path $FilePath
}

# Function to test directory existence
function Test-DirectoryExists {
    param([string]$DirPath)
    return Test-Path $DirPath -PathType Container
}

Write-Host ""
Write-Host "📋 1. Code Quality Tests" -ForegroundColor Yellow
Write-Host "========================" -ForegroundColor Yellow

# Check if Node.js is installed
Test-Component "Node.js installation" { node --version }

# Check if npm is installed
Test-Component "npm installation" { npm --version }

# Check if Docker is available
Test-Component "Docker availability" { docker --version }

# Check if Docker Compose is available
Test-Component "Docker Compose availability" { docker-compose --version }

Write-Host ""
Write-Host "⚙️  2. Configuration Tests" -ForegroundColor Yellow
Write-Host "==========================" -ForegroundColor Yellow

# Check if required config files exist
Test-Component "Backend config file exists" { Test-FileExists "backend/src/config/config.js" }
Test-Component "Backend env example exists" { Test-FileExists "backend/.env.example" }
Test-Component "Docker compose dev exists" { Test-FileExists "docker-compose.dev.yml" }
Test-Component "Docker compose prod exists" { Test-FileExists "docker-compose.prod.yml" }
Test-Component "Firmware config exists" { Test-FileExists "firmware/src/config.h" }
Test-Component "Firmware secrets example exists" { Test-FileExists "firmware/src/secrets.h.example" }

# Check if required directories exist
Test-Component "Backend models directory" { Test-DirectoryExists "backend/src/models" }
Test-Component "Backend routes directory" { Test-DirectoryExists "backend/src/routes" }
Test-Component "Backend services directory" { Test-DirectoryExists "backend/src/services" }
Test-Component "Frontend components directory" { Test-DirectoryExists "frontend/web/src/components" }
Test-Component "Frontend contexts directory" { Test-DirectoryExists "frontend/web/src/contexts" }

Write-Host ""
Write-Host "🗄️  3. Database Schema Tests" -ForegroundColor Yellow
Write-Host "============================" -ForegroundColor Yellow

# Check migration files
Test-Component "Users migration exists" { Test-FileExists "backend/database/migrations/001_create_users_table.js" }
Test-Component "Devices migration exists" { Test-FileExists "backend/database/migrations/002_create_devices_table.js" }
Test-Component "Temperature readings migration exists" { Test-FileExists "backend/database/migrations/003_create_temperature_readings_table.js" }
Test-Component "Notifications migration exists" { Test-FileExists "backend/database/migrations/004_create_notifications_table.js" }

# Check model files
Test-Component "User model exists" { Test-FileExists "backend/src/models/User.js" }
Test-Component "Device model exists" { Test-FileExists "backend/src/models/Device.js" }
Test-Component "TemperatureReading model exists" { Test-FileExists "backend/src/models/TemperatureReading.js" }
Test-Component "Notification model exists" { Test-FileExists "backend/src/models/Notification.js" }

Write-Host ""
Write-Host "🌐 4. API Endpoint Tests" -ForegroundColor Yellow
Write-Host "=======================" -ForegroundColor Yellow

# Check route files
Test-Component "Auth routes exist" { Test-FileExists "backend/src/routes/auth.js" }
Test-Component "Users routes exist" { Test-FileExists "backend/src/routes/users.js" }
Test-Component "Devices routes exist" { Test-FileExists "backend/src/routes/devices.js" }
Test-Component "Temperature routes exist" { Test-FileExists "backend/src/routes/temperature.js" }
Test-Component "Notifications routes exist" { Test-FileExists "backend/src/routes/notifications.js" }
Test-Component "Health routes exist" { Test-FileExists "backend/src/routes/health.js" }

# Check controller files
Test-Component "Auth controller exists" { Test-FileExists "backend/src/controllers/authController.js" }
Test-Component "Device controller exists" { Test-FileExists "backend/src/controllers/deviceController.js" }

Write-Host ""
Write-Host "🔧 5. Service Tests" -ForegroundColor Yellow
Write-Host "==================" -ForegroundColor Yellow

# Check service files
Test-Component "MQTT service exists" { Test-FileExists "backend/src/services/mqttService.js" }
Test-Component "WebSocket service exists" { Test-FileExists "backend/src/services/websocketService.js" }
Test-Component "Notification service exists" { Test-FileExists "backend/src/services/notificationService.js" }
Test-Component "Database service exists" { Test-FileExists "backend/src/services/databaseService.js" }

# Check middleware files
Test-Component "Auth middleware exists" { Test-FileExists "backend/src/middleware/auth.js" }
Test-Component "Error handler middleware exists" { Test-FileExists "backend/src/middleware/errorHandler.js" }

Write-Host ""
Write-Host "🖥️  6. Frontend Tests" -ForegroundColor Yellow
Write-Host "===================" -ForegroundColor Yellow

# Check context files
Test-Component "Auth context exists" { Test-FileExists "frontend/web/src/contexts/AuthContext.tsx" }
Test-Component "WebSocket context exists" { Test-FileExists "frontend/web/src/contexts/WebSocketContext.tsx" }
Test-Component "Device context exists" { Test-FileExists "frontend/web/src/contexts/DeviceContext.tsx" }

# Check service files
Test-Component "API service exists" { Test-FileExists "frontend/web/src/services/api.ts" }

# Check component files
Test-Component "Layout component exists" { Test-FileExists "frontend/web/src/components/Layout/Layout.tsx" }
Test-Component "Dashboard page exists" { Test-FileExists "frontend/web/src/pages/Dashboard/DashboardPage.tsx" }
Test-Component "Login page exists" { Test-FileExists "frontend/web/src/pages/Auth/LoginPage.tsx" }

Write-Host ""
Write-Host "📱 7. Mobile App Tests" -ForegroundColor Yellow
Write-Host "=====================" -ForegroundColor Yellow

# Check mobile app structure
Test-Component "Mobile App.tsx exists" { Test-FileExists "frontend/mobile/src/App.tsx" }
Test-Component "Bluetooth service exists" { Test-FileExists "frontend/mobile/src/services/bluetoothService.ts" }

Write-Host ""
Write-Host "🔌 8. Firmware Tests" -ForegroundColor Yellow
Write-Host "===================" -ForegroundColor Yellow

# Check firmware files
Test-Component "Main firmware file exists" { Test-FileExists "firmware/src/main.cpp" }
Test-Component "PlatformIO config exists" { Test-FileExists "firmware/platformio.ini" }

Write-Host ""
Write-Host "📚 9. Documentation Tests" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow

# Check documentation files
Test-Component "README exists" { Test-FileExists "README.md" }
Test-Component "Architecture docs exist" { Test-FileExists "docs/ARCHITECTURE.md" }
Test-Component "API documentation exists" { Test-FileExists "docs/API_DOCUMENTATION.md" }

Write-Host ""
Write-Host "📊 Test Summary" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan
Write-Host "Tests Passed: $TestsPassed" -ForegroundColor Green
Write-Host "Tests Failed: $TestsFailed" -ForegroundColor Red
Write-Host "Total Tests: $($TestsPassed + $TestsFailed)"

if ($TestsFailed -eq 0) {
    Write-Host "✅ All tests passed! System is ready for deployment." -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ Some tests failed. Please fix the following issues:" -ForegroundColor Red
    foreach ($test in $FailedTests) {
        Write-Host "  - $test" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Please run the setup script to fix missing files:" -ForegroundColor Yellow
    Write-Host "  ./scripts/setup.sh" -ForegroundColor Yellow
    exit 1
}
