const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Building LightChat for Windows...\n');

// Step 1: Build client
console.log('📦 Building React client...');
try {
  execSync('cd client && npm run build', { stdio: 'inherit' });
  console.log('✓ Client built successfully\n');
} catch (error) {
  console.error('✗ Failed to build client');
  process.exit(1);
}

// Step 2: Ensure .env exists
console.log('📝 Checking environment configuration...');
const envPath = path.join(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  console.log('⚠ .env file not found. Copying from .env.example...');
  const envExamplePath = path.join(__dirname, '../.env.example');
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✓ .env file created. Please update it with your configuration.\n');
  } else {
    console.error('✗ .env.example not found');
    process.exit(1);
  }
} else {
  console.log('✓ .env file exists\n');
}

// Step 3: Build Electron app
console.log('🖥️  Building Electron application...');
try {
  execSync('npm run electron:build:win', { stdio: 'inherit' });
  console.log('\n✓ Windows build completed successfully!');
  console.log('📁 Output directory: dist/');
} catch (error) {
  console.error('\n✗ Failed to build Electron app');
  process.exit(1);
}
