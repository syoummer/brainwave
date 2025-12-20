#!/usr/bin/env node
/**
 * Deployment Preparation Script
 * This script prepares the Electron app for distribution by building and packaging
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Brainwave Electron App - Deployment Preparation');
console.log('==================================================\n');

/**
 * Execute command with proper error handling
 */
function executeCommand(command, description) {
  console.log(`📋 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed\n`);
    return true;
  } catch (error) {
    console.log(`❌ ${description} failed: ${error.message}\n`);
    return false;
  }
}

/**
 * Clean previous builds
 */
function cleanPreviousBuilds() {
  console.log('🧹 CLEANING PREVIOUS BUILDS');
  console.log('----------------------------');
  
  try {
    if (fs.existsSync('dist')) {
      fs.rmSync('dist', { recursive: true, force: true });
      console.log('✅ Removed dist directory');
    }
    
    if (fs.existsSync('release')) {
      fs.rmSync('release', { recursive: true, force: true });
      console.log('✅ Removed release directory');
    }
    
    console.log('✅ CLEANUP COMPLETED\n');
    return true;
  } catch (error) {
    console.log(`❌ Cleanup failed: ${error.message}\n`);
    return false;
  }
}

/**
 * Install dependencies
 */
function installDependencies() {
  console.log('📦 INSTALLING DEPENDENCIES');
  console.log('---------------------------');
  
  return executeCommand('npm install', 'Installing dependencies');
}

/**
 * Build the application
 */
function buildApplication() {
  console.log('🔨 BUILDING APPLICATION');
  console.log('-----------------------');
  
  return executeCommand('npm run build', 'Building TypeScript sources');
}

/**
 * Generate icons if needed
 */
function generateIcons() {
  console.log('🎨 GENERATING ICONS');
  console.log('-------------------');
  
  // Check if icons already exist
  const iconFiles = ['build/icon.icns', 'build/icon.ico', 'build/icon.png'];
  const hasIcons = iconFiles.some(file => fs.existsSync(file));
  
  if (hasIcons) {
    console.log('✅ Icons already exist, skipping generation\n');
    return true;
  }
  
  if (fs.existsSync('scripts/generate-icons.js')) {
    return executeCommand('npm run icons:generate', 'Generating platform icons');
  } else {
    console.log('⚠️  Icon generation script not found, using default icons\n');
    return true;
  }
}

/**
 * Test the build
 */
function testBuild() {
  console.log('🧪 TESTING BUILD');
  console.log('----------------');
  
  try {
    // Run integration tests
    if (fs.existsSync('src/electron/integration-test.ts')) {
      console.log('Running integration tests...');
      execSync('node dist/electron/integration-test.js', { stdio: 'inherit' });
      console.log('✅ Integration tests passed');
    }
    
    // Run functionality tests
    if (fs.existsSync('src/electron/functionality-test.ts')) {
      console.log('Running functionality tests...');
      execSync('node dist/electron/functionality-test.js', { stdio: 'inherit' });
      console.log('✅ Functionality tests passed');
    }
    
    console.log('✅ BUILD TESTING COMPLETED\n');
    return true;
  } catch (error) {
    console.log(`❌ Build testing failed: ${error.message}\n`);
    return false;
  }
}

/**
 * Package for distribution
 */
function packageForDistribution() {
  console.log('📦 PACKAGING FOR DISTRIBUTION');
  console.log('------------------------------');
  
  const platform = process.platform;
  let buildCommand;
  
  switch (platform) {
    case 'darwin':
      buildCommand = 'npm run electron:build:mac';
      console.log('Building for macOS...');
      break;
    case 'win32':
      buildCommand = 'npm run electron:build:win';
      console.log('Building for Windows...');
      break;
    case 'linux':
      buildCommand = 'npm run electron:build:linux';
      console.log('Building for Linux...');
      break;
    default:
      console.log('⚠️  Unknown platform, building for all platforms...');
      buildCommand = 'npm run electron:build';
  }
  
  return executeCommand(buildCommand, 'Packaging application');
}

/**
 * Verify distribution packages
 */
function verifyDistribution() {
  console.log('✅ VERIFYING DISTRIBUTION');
  console.log('-------------------------');
  
  try {
    if (!fs.existsSync('release')) {
      console.log('❌ Release directory not found');
      return false;
    }
    
    const releaseFiles = fs.readdirSync('release');
    if (releaseFiles.length === 0) {
      console.log('❌ No distribution packages found');
      return false;
    }
    
    console.log('✅ Distribution packages created:');
    releaseFiles.forEach(file => {
      const filePath = path.join('release', file);
      const stats = fs.statSync(filePath);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`   📦 ${file} (${sizeInMB} MB)`);
    });
    
    console.log('✅ DISTRIBUTION VERIFICATION COMPLETED\n');
    return true;
  } catch (error) {
    console.log(`❌ Distribution verification failed: ${error.message}\n`);
    return false;
  }
}

/**
 * Main deployment preparation function
 */
function prepareDeployment() {
  console.log('Starting deployment preparation...\n');
  
  const steps = [
    { name: 'Clean Previous Builds', fn: cleanPreviousBuilds },
    { name: 'Install Dependencies', fn: installDependencies },
    { name: 'Build Application', fn: buildApplication },
    { name: 'Generate Icons', fn: generateIcons },
    { name: 'Test Build', fn: testBuild },
    { name: 'Package for Distribution', fn: packageForDistribution },
    { name: 'Verify Distribution', fn: verifyDistribution }
  ];
  
  let allStepsSucceeded = true;
  
  for (const step of steps) {
    const success = step.fn();
    if (!success) {
      console.log(`❌ Step failed: ${step.name}`);
      allStepsSucceeded = false;
      break;
    }
  }
  
  console.log('═══════════════════════════════════════════════════════');
  if (allStepsSucceeded) {
    console.log('🎉 DEPLOYMENT PREPARATION COMPLETED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('✨ Your Electron app is ready for distribution!\n');
    console.log('📦 Distribution packages are available in: ./release/\n');
    console.log('📋 Next Steps:');
    console.log('   1. Test the packaged app before distribution');
    console.log('   2. Upload to your distribution platform');
    console.log('   3. Update release notes and documentation\n');
    console.log('🧪 Manual Testing:');
    console.log('   - Install and run the packaged app');
    console.log('   - Verify all features work correctly');
    console.log('   - Test on clean systems without development tools\n');
  } else {
    console.log('❌ DEPLOYMENT PREPARATION FAILED');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('Please fix the issues above and run the script again.\n');
  }
  
  return allStepsSucceeded;
}

// Run deployment preparation
const success = prepareDeployment();
process.exit(success ? 0 : 1);