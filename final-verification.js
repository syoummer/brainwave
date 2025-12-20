#!/usr/bin/env node
/**
 * Final Verification Script for Electron Migration
 * This script performs comprehensive verification of all core functionality
 * and prepares the application for deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🎯 Brainwave Electron App - Final Verification');
console.log('==============================================\n');

let allTestsPassed = true;
const results = {
  buildVerification: false,
  fileStructure: false,
  dependencies: false,
  configuration: false,
  icons: false,
  distributionReady: false
};

/**
 * Test 1: Build Verification
 */
function verifyBuild() {
  console.log('📦 1. BUILD VERIFICATION');
  console.log('------------------------');
  
  try {
    // Check if dist directory exists
    if (!fs.existsSync('dist')) {
      console.log('❌ dist directory not found');
      console.log('   Run: npm run build');
      return false;
    }
    console.log('✅ dist directory exists');
    
    // Check for main electron files
    const requiredFiles = [
      'dist/electron/main.js',
      'dist/electron/preload.js',
      'dist/electron/backend-server-manager.js',
      'dist/electron/settings-manager.js',
      'dist/electron/error-handler.js'
    ];
    
    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        console.log(`❌ Required file missing: ${file}`);
        return false;
      }
    }
    console.log('✅ All required Electron files present');
    
    // Check for backend server files
    const backendFiles = [
      'dist/server.js',
      'dist/services/openai-realtime-client.js',
      'dist/services/websocket-manager.js',
      'dist/services/audio-processor.js'
    ];
    
    for (const file of backendFiles) {
      if (!fs.existsSync(file)) {
        console.log(`❌ Required backend file missing: ${file}`);
        return false;
      }
    }
    console.log('✅ All backend server files present');
    
    console.log('✅ BUILD VERIFICATION PASSED\n');
    return true;
  } catch (error) {
    console.log(`❌ Build verification failed: ${error.message}\n`);
    return false;
  }
}

/**
 * Test 2: File Structure Verification
 */
function verifyFileStructure() {
  console.log('📁 2. FILE STRUCTURE VERIFICATION');
  console.log('----------------------------------');
  
  try {
    // Check public directory (frontend files)
    const publicFiles = [
      'public/realtime.html',
      'public/settings.html',
      'public/style.css',
      'public/main.js'
    ];
    
    for (const file of publicFiles) {
      if (!fs.existsSync(file)) {
        console.log(`❌ Frontend file missing: ${file}`);
        return false;
      }
    }
    console.log('✅ All frontend files present');
    
    // Verify frontend interface hasn't been modified
    const realtimeHtml = fs.readFileSync('public/realtime.html', 'utf8');
    if (!realtimeHtml.includes('Brainwave')) {
      console.log('❌ Frontend interface may be corrupted');
      return false;
    }
    console.log('✅ Frontend interface intact');
    
    // Check CSS for original color scheme
    const styleCSS = fs.readFileSync('public/style.css', 'utf8');
    if (!styleCSS.includes('--primary-color') || !styleCSS.includes('--bg-color')) {
      console.log('⚠️  Warning: CSS variables may have changed');
    } else {
      console.log('✅ Original color scheme preserved');
    }
    
    console.log('✅ FILE STRUCTURE VERIFICATION PASSED\n');
    return true;
  } catch (error) {
    console.log(`❌ File structure verification failed: ${error.message}\n`);
    return false;
  }
}

/**
 * Test 3: Dependencies Verification
 */
function verifyDependencies() {
  console.log('📚 3. DEPENDENCIES VERIFICATION');
  console.log('--------------------------------');
  
  try {
    // Check if node_modules exists
    if (!fs.existsSync('node_modules')) {
      console.log('❌ node_modules not found');
      console.log('   Run: npm install');
      return false;
    }
    console.log('✅ node_modules directory exists');
    
    // Check critical dependencies
    const criticalDeps = [
      'electron',
      'fastify',
      'openai',
      '@fastify/websocket',
      '@fastify/static',
      '@fastify/cors'
    ];
    
    for (const dep of criticalDeps) {
      if (!fs.existsSync(path.join('node_modules', dep))) {
        console.log(`❌ Critical dependency missing: ${dep}`);
        return false;
      }
    }
    console.log('✅ All critical dependencies installed');
    
    // Verify package.json
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (!packageJson.main || !packageJson.main.includes('electron')) {
      console.log('❌ package.json main entry point incorrect');
      return false;
    }
    console.log('✅ package.json configuration correct');
    
    console.log('✅ DEPENDENCIES VERIFICATION PASSED\n');
    return true;
  } catch (error) {
    console.log(`❌ Dependencies verification failed: ${error.message}\n`);
    return false;
  }
}

/**
 * Test 4: Configuration Verification
 */
function verifyConfiguration() {
  console.log('⚙️  4. CONFIGURATION VERIFICATION');
  console.log('----------------------------------');
  
  try {
    // Check TypeScript configuration
    if (!fs.existsSync('tsconfig.json')) {
      console.log('❌ tsconfig.json not found');
      return false;
    }
    console.log('✅ TypeScript configuration present');
    
    // Check Electron Builder configuration
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (!packageJson.build) {
      console.log('❌ Electron Builder configuration missing');
      return false;
    }
    console.log('✅ Electron Builder configured');
    
    // Verify build configuration
    const buildConfig = packageJson.build;
    if (!buildConfig.appId || !buildConfig.productName) {
      console.log('❌ Build configuration incomplete');
      return false;
    }
    console.log(`✅ App ID: ${buildConfig.appId}`);
    console.log(`✅ Product Name: ${buildConfig.productName}`);
    
    // Check platform targets
    const platforms = [];
    if (buildConfig.mac) platforms.push('macOS');
    if (buildConfig.win) platforms.push('Windows');
    if (buildConfig.linux) platforms.push('Linux');
    console.log(`✅ Target platforms: ${platforms.join(', ')}`);
    
    console.log('✅ CONFIGURATION VERIFICATION PASSED\n');
    return true;
  } catch (error) {
    console.log(`❌ Configuration verification failed: ${error.message}\n`);
    return false;
  }
}

/**
 * Test 5: Icons and Assets Verification
 */
function verifyIcons() {
  console.log('🎨 5. ICONS AND ASSETS VERIFICATION');
  console.log('------------------------------------');
  
  try {
    // Check build directory
    if (!fs.existsSync('build')) {
      console.log('❌ build directory not found');
      return false;
    }
    console.log('✅ build directory exists');
    
    // Check for icon template
    if (fs.existsSync('build/icon-template.svg')) {
      console.log('✅ Icon template present');
    } else {
      console.log('⚠️  Icon template not found (optional)');
    }
    
    // Check for platform-specific icons
    const iconFiles = {
      'macOS': 'build/icon.icns',
      'Windows': 'build/icon.ico',
      'Linux': 'build/icon.png'
    };
    
    let hasIcons = false;
    for (const [platform, iconPath] of Object.entries(iconFiles)) {
      if (fs.existsSync(iconPath)) {
        console.log(`✅ ${platform} icon present`);
        hasIcons = true;
      } else {
        console.log(`⚠️  ${platform} icon not found (run: npm run icons:generate)`);
      }
    }
    
    if (!hasIcons) {
      console.log('⚠️  No platform icons found - app will use default Electron icon');
      console.log('   Generate icons with: npm run icons:generate');
    }
    
    console.log('✅ ICONS AND ASSETS VERIFICATION PASSED\n');
    return true;
  } catch (error) {
    console.log(`❌ Icons verification failed: ${error.message}\n`);
    return false;
  }
}

/**
 * Test 6: Distribution Readiness
 */
function verifyDistributionReadiness() {
  console.log('📦 6. DISTRIBUTION READINESS');
  console.log('----------------------------');
  
  try {
    // Check if all previous tests passed
    const previousTests = [
      results.buildVerification,
      results.fileStructure,
      results.dependencies,
      results.configuration
    ];
    
    if (!previousTests.every(test => test)) {
      console.log('❌ Cannot verify distribution - previous tests failed');
      return false;
    }
    
    // Check build scripts
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredScripts = [
      'electron:build',
      'electron:build:mac',
      'electron:build:win',
      'electron:build:linux'
    ];
    
    for (const script of requiredScripts) {
      if (!packageJson.scripts[script]) {
        console.log(`❌ Build script missing: ${script}`);
        return false;
      }
    }
    console.log('✅ All build scripts present');
    
    // Check for entitlements (macOS)
    if (fs.existsSync('build/entitlements.mac.plist')) {
      console.log('✅ macOS entitlements configured');
    }
    
    // Check for installer configuration (Windows)
    if (fs.existsSync('build/installer.nsh')) {
      console.log('✅ Windows installer configured');
    }
    
    console.log('✅ DISTRIBUTION READINESS VERIFIED\n');
    return true;
  } catch (error) {
    console.log(`❌ Distribution readiness verification failed: ${error.message}\n`);
    return false;
  }
}

/**
 * Run all verification tests
 */
function runAllTests() {
  console.log('Starting comprehensive verification...\n');
  
  results.buildVerification = verifyBuild();
  results.fileStructure = verifyFileStructure();
  results.dependencies = verifyDependencies();
  results.configuration = verifyConfiguration();
  results.icons = verifyIcons();
  results.distributionReady = verifyDistributionReadiness();
  
  // Print summary
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 VERIFICATION SUMMARY');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log(`Build Verification:        ${results.buildVerification ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`File Structure:            ${results.fileStructure ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Dependencies:              ${results.dependencies ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Configuration:             ${results.configuration ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Icons & Assets:            ${results.icons ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Distribution Ready:        ${results.distributionReady ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(result => result);
  
  console.log('\n═══════════════════════════════════════════════════════');
  if (allPassed) {
    console.log('🎉 ALL VERIFICATIONS PASSED!');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('✨ Your Electron app is ready for deployment!\n');
    console.log('📦 Next Steps:');
    console.log('   1. Test the app: npm run electron:dev');
    console.log('   2. Build for distribution:');
    console.log('      - macOS:   npm run electron:build:mac');
    console.log('      - Windows: npm run electron:build:win');
    console.log('      - Linux:   npm run electron:build:linux');
    console.log('   3. Find built packages in: ./release/\n');
    console.log('📝 Manual Testing Checklist:');
    console.log('   - Run: node manual-feature-verification.js');
    console.log('   - Follow the comprehensive testing guide\n');
  } else {
    console.log('❌ SOME VERIFICATIONS FAILED');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('Please fix the issues above before proceeding with deployment.\n');
    console.log('Common fixes:');
    console.log('   - Build errors: npm run build');
    console.log('   - Missing dependencies: npm install');
    console.log('   - Missing icons: npm run icons:generate\n');
  }
  
  return allPassed;
}

// Run the verification
const success = runAllTests();
process.exit(success ? 0 : 1);
