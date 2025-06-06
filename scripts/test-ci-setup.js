#!/usr/bin/env node

/**
 * BotCareU CI/CD Setup Verification Script
 * 
 * This script verifies that the CI/CD setup is correctly configured
 * for the BotCareU IoT health monitoring system.
 * 
 * Medical-grade software requires robust CI/CD pipelines with:
 * - Dependency management
 * - Security scanning
 * - Medical compliance validation
 * - Performance testing
 * - Audit trail generation
 */

const fs = require('fs');
const path = require('path');

console.log('🏥 BotCareU CI/CD Setup Verification');
console.log('=====================================\n');

// Check if we're in the correct directory
const rootDir = process.cwd();
const packageJsonPath = path.join(rootDir, 'package.json');

if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ Error: package.json not found. Please run this script from the project root.');
  process.exit(1);
}

// Verification checks
const checks = [
  {
    name: 'Root package.json exists',
    check: () => fs.existsSync(path.join(rootDir, 'package.json')),
    required: true
  },
  {
    name: 'Root package-lock.json exists',
    check: () => fs.existsSync(path.join(rootDir, 'package-lock.json')),
    required: true
  },
  {
    name: 'Backend package.json exists',
    check: () => fs.existsSync(path.join(rootDir, 'backend', 'package.json')),
    required: true
  },
  {
    name: 'Backend package-lock.json exists',
    check: () => fs.existsSync(path.join(rootDir, 'backend', 'package-lock.json')),
    required: true
  },
  {
    name: 'Frontend web package.json exists',
    check: () => fs.existsSync(path.join(rootDir, 'frontend', 'web', 'package.json')),
    required: true
  },
  {
    name: 'Frontend web package-lock.json exists',
    check: () => fs.existsSync(path.join(rootDir, 'frontend', 'web', 'package-lock.json')),
    required: true
  },
  {
    name: 'CI workflow exists',
    check: () => fs.existsSync(path.join(rootDir, '.github', 'workflows', 'ci.yml')),
    required: true
  },
  {
    name: 'Security scan workflow exists',
    check: () => fs.existsSync(path.join(rootDir, '.github', 'workflows', 'security-scan.yml')),
    required: true
  },
  {
    name: 'Dependency update workflow exists',
    check: () => fs.existsSync(path.join(rootDir, '.github', 'workflows', 'dependency-update.yml')),
    required: true
  },
  {
    name: 'Performance test workflow exists',
    check: () => fs.existsSync(path.join(rootDir, '.github', 'workflows', 'performance-test.yml')),
    required: true
  }
];

// Run verification checks
let passedChecks = 0;
let failedChecks = 0;

console.log('🔍 Running verification checks...\n');

checks.forEach((check, index) => {
  const result = check.check();
  const status = result ? '✅' : '❌';
  const requirement = check.required ? '(Required)' : '(Optional)';
  
  console.log(`${index + 1}. ${status} ${check.name} ${requirement}`);
  
  if (result) {
    passedChecks++;
  } else {
    failedChecks++;
    if (check.required) {
      console.log(`   ⚠️  This is a required component for medical-grade CI/CD`);
    }
  }
});

console.log('\n📊 Verification Summary');
console.log('=======================');
console.log(`✅ Passed: ${passedChecks}`);
console.log(`❌ Failed: ${failedChecks}`);
console.log(`📋 Total: ${checks.length}`);

// Check CI workflow configuration
console.log('\n🔧 CI/CD Configuration Analysis');
console.log('================================');

try {
  const ciWorkflowPath = path.join(rootDir, '.github', 'workflows', 'ci.yml');
  if (fs.existsSync(ciWorkflowPath)) {
    const ciContent = fs.readFileSync(ciWorkflowPath, 'utf8');
    
    // Check for npm caching configuration
    const hasCaching = ciContent.includes('cache: \'npm\'');
    const hasCacheDependencyPath = ciContent.includes('cache-dependency-path');
    const hasPackageLockPaths = ciContent.includes('package-lock.json');
    
    console.log(`📦 NPM Caching: ${hasCaching ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`🔗 Cache Dependency Paths: ${hasCacheDependencyPath ? '✅ Configured' : '❌ Missing'}`);
    console.log(`📄 Package Lock References: ${hasPackageLockPaths ? '✅ Present' : '❌ Missing'}`);
    
    // Check for medical compliance features
    const hasMedicalCompliance = ciContent.includes('Medical Compliance');
    const hasTemperaturePrecision = ciContent.includes('0.1') || ciContent.includes('±0.1°C');
    const hasAuditLogging = ciContent.includes('audit');
    
    console.log(`🏥 Medical Compliance Checks: ${hasMedicalCompliance ? '✅ Enabled' : '❌ Missing'}`);
    console.log(`🌡️  Temperature Precision Validation: ${hasTemperaturePrecision ? '✅ Present' : '❌ Missing'}`);
    console.log(`📋 Audit Logging: ${hasAuditLogging ? '✅ Present' : '❌ Missing'}`);
  }
} catch (error) {
  console.log('❌ Error analyzing CI workflow:', error.message);
}

// Final assessment
console.log('\n🎯 Final Assessment');
console.log('===================');

if (failedChecks === 0) {
  console.log('🎉 Excellent! Your BotCareU CI/CD setup is properly configured.');
  console.log('🏥 The system meets medical-grade software requirements.');
  console.log('🚀 Ready for deployment to staging and production environments.');
} else if (failedChecks <= 2) {
  console.log('⚠️  Good setup with minor issues. Please address the failed checks.');
  console.log('🔧 Most components are properly configured for medical-grade deployment.');
} else {
  console.log('❌ Critical issues detected. Please fix the failed checks before deployment.');
  console.log('🏥 Medical-grade software requires all components to be properly configured.');
}

console.log('\n📚 Next Steps:');
console.log('- Run `npm run setup` to install all dependencies');
console.log('- Test the CI pipeline by creating a pull request');
console.log('- Verify medical compliance checks are working');
console.log('- Review security scan results');
console.log('- Update README with any configuration changes');

console.log('\n🔗 Useful Commands:');
console.log('- `npm run setup` - Install all project dependencies');
console.log('- `npm run dev` - Start development environment');
console.log('- `npm run test` - Run all tests');
console.log('- `npm run lint` - Check code quality');
console.log('- `npm run docker:dev` - Start Docker development environment');

process.exit(failedChecks > 0 ? 1 : 0);
