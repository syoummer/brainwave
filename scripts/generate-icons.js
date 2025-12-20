#!/usr/bin/env node

/**
 * Icon Generation Script for Brainwave Electron App
 * 
 * This script helps generate the required icon files from the SVG template.
 * 
 * Prerequisites:
 * - Install ImageMagick: https://imagemagick.org/script/download.php
 * - Or use online converters for manual conversion
 * 
 * Usage:
 * node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BUILD_DIR = path.join(__dirname, '..', 'build');
const SVG_TEMPLATE = path.join(BUILD_DIR, 'icon-template.svg');

// Icon sizes for different platforms
const ICON_SIZES = {
  png: [16, 32, 48, 64, 128, 256, 512, 1024],
  ico: [16, 32, 48, 64, 128, 256],
  icns: [16, 32, 64, 128, 256, 512, 1024]
};

function checkImageMagick() {
  try {
    execSync('magick -version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    try {
      execSync('convert -version', { stdio: 'ignore' });
      return true;
    } catch (error) {
      return false;
    }
  }
}

function generatePngIcons() {
  console.log('Generating PNG icons...');
  
  const pngDir = path.join(BUILD_DIR, 'png');
  if (!fs.existsSync(pngDir)) {
    fs.mkdirSync(pngDir, { recursive: true });
  }

  ICON_SIZES.png.forEach(size => {
    const outputFile = path.join(pngDir, `icon-${size}x${size}.png`);
    try {
      execSync(`magick "${SVG_TEMPLATE}" -resize ${size}x${size} "${outputFile}"`);
      console.log(`✓ Generated ${size}x${size} PNG`);
    } catch (error) {
      console.error(`✗ Failed to generate ${size}x${size} PNG:`, error.message);
    }
  });

  // Create the main icon.png (512x512)
  const mainIcon = path.join(BUILD_DIR, 'icon.png');
  try {
    execSync(`magick "${SVG_TEMPLATE}" -resize 512x512 "${mainIcon}"`);
    console.log('✓ Generated main icon.png');
  } catch (error) {
    console.error('✗ Failed to generate main icon.png:', error.message);
  }
}

function generateIcoIcon() {
  console.log('Generating ICO icon...');
  
  const pngDir = path.join(BUILD_DIR, 'png');
  const icoFile = path.join(BUILD_DIR, 'icon.ico');
  
  // Create ICO from multiple PNG sizes
  const pngFiles = ICON_SIZES.ico.map(size => 
    path.join(pngDir, `icon-${size}x${size}.png`)
  ).filter(file => fs.existsSync(file));

  if (pngFiles.length === 0) {
    console.error('✗ No PNG files found for ICO generation');
    return;
  }

  try {
    execSync(`magick ${pngFiles.join(' ')} "${icoFile}"`);
    console.log('✓ Generated icon.ico');
  } catch (error) {
    console.error('✗ Failed to generate icon.ico:', error.message);
  }
}

function generateIcnsIcon() {
  console.log('Generating ICNS icon...');
  
  const pngDir = path.join(BUILD_DIR, 'png');
  const icnsFile = path.join(BUILD_DIR, 'icon.icns');
  const iconsetDir = path.join(BUILD_DIR, 'icon.iconset');

  // Create iconset directory
  if (!fs.existsSync(iconsetDir)) {
    fs.mkdirSync(iconsetDir, { recursive: true });
  }

  // Copy PNG files with proper naming for iconset
  const iconsetFiles = [
    { size: 16, name: 'icon_16x16.png' },
    { size: 32, name: 'icon_16x16@2x.png' },
    { size: 32, name: 'icon_32x32.png' },
    { size: 64, name: 'icon_32x32@2x.png' },
    { size: 128, name: 'icon_128x128.png' },
    { size: 256, name: 'icon_128x128@2x.png' },
    { size: 256, name: 'icon_256x256.png' },
    { size: 512, name: 'icon_256x256@2x.png' },
    { size: 512, name: 'icon_512x512.png' },
    { size: 1024, name: 'icon_512x512@2x.png' }
  ];

  iconsetFiles.forEach(({ size, name }) => {
    const sourceFile = path.join(pngDir, `icon-${size}x${size}.png`);
    const targetFile = path.join(iconsetDir, name);
    
    if (fs.existsSync(sourceFile)) {
      fs.copyFileSync(sourceFile, targetFile);
    }
  });

  // Generate ICNS using iconutil (macOS only)
  if (process.platform === 'darwin') {
    try {
      execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsFile}"`);
      console.log('✓ Generated icon.icns using iconutil');
    } catch (error) {
      console.error('✗ Failed to generate icon.icns with iconutil:', error.message);
      // Fallback to ImageMagick
      generateIcnsWithImageMagick(pngDir, icnsFile);
    }
  } else {
    generateIcnsWithImageMagick(pngDir, icnsFile);
  }

  // Clean up iconset directory
  try {
    fs.rmSync(iconsetDir, { recursive: true, force: true });
  } catch (error) {
    console.warn('Warning: Could not clean up iconset directory');
  }
}

function generateIcnsWithImageMagick(pngDir, icnsFile) {
  const pngFiles = ICON_SIZES.icns.map(size => 
    path.join(pngDir, `icon-${size}x${size}.png`)
  ).filter(file => fs.existsSync(file));

  if (pngFiles.length === 0) {
    console.error('✗ No PNG files found for ICNS generation');
    return;
  }

  try {
    execSync(`magick ${pngFiles.join(' ')} "${icnsFile}"`);
    console.log('✓ Generated icon.icns using ImageMagick');
  } catch (error) {
    console.error('✗ Failed to generate icon.icns with ImageMagick:', error.message);
  }
}

function printInstructions() {
  console.log('\n📋 Manual Icon Generation Instructions:');
  console.log('');
  console.log('If ImageMagick is not available, you can generate icons manually:');
  console.log('');
  console.log('1. Use the SVG template: build/icon-template.svg');
  console.log('2. Generate the following files:');
  console.log('   - build/icon.png (512x512) - for Linux');
  console.log('   - build/icon.ico (multi-size) - for Windows');
  console.log('   - build/icon.icns (multi-size) - for macOS');
  console.log('');
  console.log('3. Online tools you can use:');
  console.log('   - https://convertio.co/svg-png/ (SVG to PNG)');
  console.log('   - https://convertio.co/png-ico/ (PNG to ICO)');
  console.log('   - https://iconverticons.com/online/ (PNG to ICNS)');
  console.log('');
  console.log('4. Required sizes:');
  console.log('   - PNG: 16, 32, 48, 64, 128, 256, 512px');
  console.log('   - ICO: 16, 32, 48, 64, 128, 256px (combined)');
  console.log('   - ICNS: 16, 32, 64, 128, 256, 512, 1024px (combined)');
}

function main() {
  console.log('🎨 Brainwave Icon Generator');
  console.log('============================');

  if (!fs.existsSync(SVG_TEMPLATE)) {
    console.error('✗ SVG template not found:', SVG_TEMPLATE);
    console.log('Please ensure build/icon-template.svg exists');
    process.exit(1);
  }

  if (!checkImageMagick()) {
    console.warn('⚠️  ImageMagick not found. Cannot generate icons automatically.');
    printInstructions();
    return;
  }

  console.log('✓ ImageMagick found. Generating icons...\n');

  try {
    generatePngIcons();
    generateIcoIcon();
    generateIcnsIcon();
    
    console.log('\n🎉 Icon generation completed!');
    console.log('Generated files:');
    console.log('  - build/icon.png (Linux)');
    console.log('  - build/icon.ico (Windows)');
    console.log('  - build/icon.icns (macOS)');
    console.log('  - build/png/ (individual PNG files)');
    
  } catch (error) {
    console.error('✗ Icon generation failed:', error.message);
    printInstructions();
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  generatePngIcons,
  generateIcoIcon,
  generateIcnsIcon,
  checkImageMagick
};