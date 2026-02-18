/**
 * PWA Icon Generator Script
 * 
 * This script generates PNG icons from the SVG icon for PWA support.
 * Run this script after installing dependencies:
 * 
 * npm install sharp
 * node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('Sharp not installed. Creating placeholder icons...');
  createPlaceholderIcons();
  process.exit(0);
}

const sizes = [192, 512];
const inputSvg = path.join(__dirname, '../public/icons/icon.svg');
const outputDir = path.join(__dirname, '../public/icons');

async function generateIcons() {
  console.log('Generating PWA icons...');
  
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
    
    try {
      await sharp(inputSvg)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Generated ${outputPath}`);
    } catch (error) {
      console.error(`✗ Failed to generate ${size}x${size} icon:`, error.message);
    }
  }
  
  console.log('\nDone! Icons generated successfully.');
}

function createPlaceholderIcons() {
  // Create simple placeholder PNG icons using base64
  // These are minimal valid PNG files with lime-green color
  
  const sizes = [192, 512];
  
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
    
    // Create a minimal PNG with the Polyva green color
    // This is a valid 1x1 PNG that browsers will scale
    const pngBase64 = createMinimalPNG(size);
    const buffer = Buffer.from(pngBase64, 'base64');
    
    fs.writeFileSync(outputPath, buffer);
    console.log(`✓ Created placeholder ${outputPath}`);
  }
}

function createMinimalPNG(size) {
  // Base64 encoded 1x1 lime green PNG
  // This is a valid minimal PNG that the browser can use
  return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
}

generateIcons().catch(console.error);
