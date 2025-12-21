const sharp = require('sharp');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

async function generateIcon() {
  const svgPath = path.join(__dirname, '../build/icon-template.svg');
  const pngPath = path.join(__dirname, '../build/icon.png');
  const buildDir = path.join(__dirname, '../build');

  console.log('Converting SVG to PNG...');
  await sharp(svgPath)
    .resize(1024, 1024)
    .png()
    .toFile(pngPath);

  console.log('Generating Electron icons...');
  try {
    execSync(`npx electron-icon-maker --input=${pngPath} --output=${buildDir}`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    console.log('✅ Icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error.message);
    process.exit(1);
  }
}

generateIcon().catch(console.error);

