#!/usr/bin/env node

// BotCareU Implementation Verification Script
// This script checks if all critical components are properly implemented

const fs = require('fs');
const path = require('path');

console.log('🔍 BotCareU Implementation Verification');
console.log('=======================================\n');

let totalChecks = 0;
let passedChecks = 0;
const failedChecks = [];

function checkFile(filePath, description) {
    totalChecks++;
    const fullPath = path.join(process.cwd(), filePath);
    
    if (fs.existsSync(fullPath)) {
        console.log(`✅ ${description}`);
        passedChecks++;
        return true;
    } else {
        console.log(`❌ ${description} - Missing: ${filePath}`);
        failedChecks.push(`${description} (${filePath})`);
        return false;
    }
}

function checkDirectory(dirPath, description) {
    totalChecks++;
    const fullPath = path.join(process.cwd(), dirPath);
    
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
        console.log(`✅ ${description}`);
        passedChecks++;
        return true;
    } else {
        console.log(`❌ ${description} - Missing: ${dirPath}`);
        failedChecks.push(`${description} (${dirPath})`);
        return false;
    }
}

function checkPackageJson(filePath, description) {
    totalChecks++;
    const fullPath = path.join(process.cwd(), filePath);
    
    try {
        if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            JSON.parse(content); // Validate JSON syntax
            console.log(`✅ ${description}`);
            passedChecks++;
            return true;
        } else {
            console.log(`❌ ${description} - Missing: ${filePath}`);
            failedChecks.push(`${description} (${filePath})`);
            return false;
        }
    } catch (error) {
        console.log(`❌ ${description} - Invalid JSON: ${error.message}`);
        failedChecks.push(`${description} (${filePath}) - Invalid JSON`);
        return false;
    }
}

// 1. Core Backend Files
console.log('🔧 Backend Core Files');
console.log('--------------------');
checkFile('backend/src/server.js', 'Main server file');
checkFile('backend/src/config/config.js', 'Configuration file');
checkFile('backend/.env.example', 'Environment example file');
checkPackageJson('backend/package.json', 'Backend package.json');
checkFile('backend/knexfile.js', 'Database configuration');

// 2. Database Models
console.log('\n🗄️ Database Models');
console.log('------------------');
checkFile('backend/src/models/User.js', 'User model');
checkFile('backend/src/models/Device.js', 'Device model');
checkFile('backend/src/models/TemperatureReading.js', 'TemperatureReading model');
checkFile('backend/src/models/Notification.js', 'Notification model');

// 3. API Routes
console.log('\n🌐 API Routes');
console.log('-------------');
checkFile('backend/src/routes/auth.js', 'Authentication routes');
checkFile('backend/src/routes/users.js', 'User routes');
checkFile('backend/src/routes/devices.js', 'Device routes');
checkFile('backend/src/routes/temperature.js', 'Temperature routes');
checkFile('backend/src/routes/notifications.js', 'Notification routes');
checkFile('backend/src/routes/health.js', 'Health check routes');

// 4. Controllers
console.log('\n🎮 Controllers');
console.log('--------------');
checkFile('backend/src/controllers/authController.js', 'Authentication controller');
checkFile('backend/src/controllers/deviceController.js', 'Device controller');

// 5. Services
console.log('\n⚙️ Services');
console.log('-----------');
checkFile('backend/src/services/mqttService.js', 'MQTT service');
checkFile('backend/src/services/websocketService.js', 'WebSocket service');
checkFile('backend/src/services/notificationService.js', 'Notification service');
checkFile('backend/src/services/databaseService.js', 'Database service');

// 6. Middleware
console.log('\n🛡️ Middleware');
console.log('-------------');
checkFile('backend/src/middleware/auth.js', 'Authentication middleware');
checkFile('backend/src/middleware/errorHandler.js', 'Error handler middleware');

// 7. Database Migrations
console.log('\n📊 Database Migrations');
console.log('----------------------');
checkFile('backend/database/migrations/001_create_users_table.js', 'Users table migration');
checkFile('backend/database/migrations/002_create_devices_table.js', 'Devices table migration');
checkFile('backend/database/migrations/003_create_temperature_readings_table.js', 'Temperature readings migration');
checkFile('backend/database/migrations/004_create_notifications_table.js', 'Notifications migration');

// 8. Frontend Core
console.log('\n🖥️ Frontend Core');
console.log('----------------');
checkFile('frontend/web/src/App.tsx', 'Main App component');
checkPackageJson('frontend/web/package.json', 'Frontend package.json');
checkFile('frontend/web/vite.config.ts', 'Vite configuration');

// 9. Frontend Contexts
console.log('\n🔄 Frontend Contexts');
console.log('--------------------');
checkFile('frontend/web/src/contexts/AuthContext.tsx', 'Authentication context');
checkFile('frontend/web/src/contexts/WebSocketContext.tsx', 'WebSocket context');
checkFile('frontend/web/src/contexts/DeviceContext.tsx', 'Device context');

// 10. Frontend Services
console.log('\n🌐 Frontend Services');
console.log('--------------------');
checkFile('frontend/web/src/services/api.ts', 'API service');

// 11. Frontend Components
console.log('\n🧩 Frontend Components');
console.log('----------------------');
checkFile('frontend/web/src/components/Layout/Layout.tsx', 'Layout component');
checkFile('frontend/web/src/components/Auth/ProtectedRoute.tsx', 'Protected route component');
checkFile('frontend/web/src/components/UI/LoadingSpinner.tsx', 'Loading spinner component');
checkFile('frontend/web/src/components/ErrorBoundary/ErrorFallback.tsx', 'Error fallback component');

// 12. Frontend Pages
console.log('\n📄 Frontend Pages');
console.log('-----------------');
checkFile('frontend/web/src/pages/Auth/LoginPage.tsx', 'Login page');
checkFile('frontend/web/src/pages/Dashboard/DashboardPage.tsx', 'Dashboard page');
checkFile('frontend/web/src/components/Dashboard/RecentReadingsTable.tsx', 'Recent readings table');

// 13. Mobile App
console.log('\n📱 Mobile App');
console.log('-------------');
checkFile('frontend/mobile/src/App.tsx', 'Mobile App component');
checkPackageJson('frontend/mobile/package.json', 'Mobile package.json');
checkFile('frontend/mobile/src/services/bluetoothService.ts', 'Bluetooth service');

// 14. Firmware
console.log('\n🔌 Firmware');
console.log('-----------');
checkFile('firmware/src/main.cpp', 'Main firmware file');
checkFile('firmware/src/config.h', 'Firmware configuration');
checkFile('firmware/src/secrets.h.example', 'Firmware secrets example');
checkFile('firmware/platformio.ini', 'PlatformIO configuration');

// 15. Docker Configuration
console.log('\n🐳 Docker Configuration');
console.log('-----------------------');
checkFile('docker-compose.dev.yml', 'Development Docker Compose');
checkFile('docker-compose.prod.yml', 'Production Docker Compose');
checkFile('backend/Dockerfile.dev', 'Backend development Dockerfile');
checkFile('frontend/web/Dockerfile.dev', 'Frontend development Dockerfile');

// 16. Scripts
console.log('\n📜 Scripts');
console.log('----------');
checkFile('scripts/setup.sh', 'Setup script');
checkFile('scripts/test-system.sh', 'Test script');

// 17. Documentation
console.log('\n📚 Documentation');
console.log('----------------');
checkFile('README.md', 'Main README');
checkFile('docs/ARCHITECTURE.md', 'Architecture documentation');
checkFile('docs/API_DOCUMENTATION.md', 'API documentation');

// Summary
console.log('\n📊 Verification Summary');
console.log('=======================');
console.log(`Total Checks: ${totalChecks}`);
console.log(`Passed: ${passedChecks}`);
console.log(`Failed: ${totalChecks - passedChecks}`);
console.log(`Success Rate: ${Math.round((passedChecks / totalChecks) * 100)}%`);

if (failedChecks.length > 0) {
    console.log('\n❌ Failed Checks:');
    failedChecks.forEach(check => console.log(`  - ${check}`));
    console.log('\n💡 Run the setup script to create missing files:');
    console.log('   npm run setup');
} else {
    console.log('\n🎉 All checks passed! The BotCareU system is ready for development.');
}

process.exit(failedChecks.length > 0 ? 1 : 0);
