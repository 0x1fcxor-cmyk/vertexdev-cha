const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function runCommand(command, cwd) {
  try {
    execSync(command, { cwd, stdio: 'inherit' });
    return true;
  } catch (error) {
    return false;
  }
}

async function buildElectronApp() {
  const rootDir = path.join(__dirname, '..');
  
  log('\n╔════════════════════════════════════════════════════════════╗', colors.cyan);
  log('║         LightChat - Automated Electron Build               ║', colors.cyan);
  log('╚════════════════════════════════════════════════════════════╝', colors.cyan);
  
  // Step 1: Check if node_modules exists
  log('\n📦 Step 1: Checking dependencies...', colors.blue);
  if (!fs.existsSync(path.join(rootDir, 'node_modules'))) {
    log('   Installing root dependencies...', colors.yellow);
    if (!runCommand('npm install', rootDir)) {
      log('✗ Failed to install root dependencies', colors.red);
      process.exit(1);
    }
  } else {
    log('   ✓ Root dependencies already installed', colors.green);
  }
  
  // Step 2: Install server dependencies
  log('\n📦 Step 2: Installing server dependencies...', colors.blue);
  if (!fs.existsSync(path.join(rootDir, 'server', 'node_modules'))) {
    if (!runCommand('npm install', path.join(rootDir, 'server'))) {
      log('✗ Failed to install server dependencies', colors.red);
      process.exit(1);
    }
  } else {
    log('   ✓ Server dependencies already installed', colors.green);
  }
  
  // Step 3: Install client dependencies
  log('\n📦 Step 3: Installing client dependencies...', colors.blue);
  if (!fs.existsSync(path.join(rootDir, 'client', 'node_modules'))) {
    if (!runCommand('npm install', path.join(rootDir, 'client'))) {
      log('✗ Failed to install client dependencies', colors.red);
      process.exit(1);
    }
  } else {
    log('   ✓ Client dependencies already installed', colors.green);
  }
  
  // Step 4: Build React client
  log('\n🔨 Step 4: Building React client...', colors.blue);
  if (!runCommand('npm run build', path.join(rootDir, 'client'))) {
    log('✗ Failed to build React client', colors.red);
    process.exit(1);
  }
  log('   ✓ React client built successfully', colors.green);
  
  // Step 5: Check .env file
  log('\n📝 Step 5: Checking environment configuration...', colors.blue);
  const envPath = path.join(rootDir, '.env');
  if (!fs.existsSync(envPath)) {
    const envExamplePath = path.join(rootDir, '.env.example');
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      log('   ✓ .env file created from .env.example', colors.green);
      log('   ⚠ Please update .env with your configuration before running the app', colors.yellow);
    } else {
      log('   ⚠ .env.example not found, creating basic .env', colors.yellow);
      const defaultEnv = `DATABASE_URL=postgresql://lightchat:lightchat123@localhost:5432/lightchat
REDIS_URL=redis://localhost:6379
PORT=3001
NODE_ENV=production
JWT_SECRET=change-this-to-a-secure-secret
CLIENT_URL=http://localhost:5173
`;
      fs.writeFileSync(envPath, defaultEnv);
    }
  } else {
    log('   ✓ .env file exists', colors.green);
  }
  
  // Step 6: Check Docker services
  log('\n🐳 Step 6: Checking Docker services...', colors.blue);
  try {
    execSync('docker ps', { stdio: 'pipe' });
    log('   ✓ Docker is running', colors.green);
  } catch (error) {
    log('   ⚠ Docker may not be running', colors.yellow);
    log('   ⚠ PostgreSQL and Redis are required for the app to function', colors.yellow);
  }
  
  // Step 7: Build Electron app
  log('\n🖥️  Step 7: Building Electron application...', colors.blue);
  if (!runCommand('npm run electron:build:win', rootDir)) {
    log('✗ Failed to build Electron app', colors.red);
    process.exit(1);
  }
  
  log('\n╔════════════════════════════════════════════════════════════╗', colors.green);
  log('║                  BUILD SUCCESSFUL!                         ║', colors.green);
  log('╚════════════════════════════════════════════════════════════╝', colors.green);
  
  log('\n📁 Output directory: dist/', colors.cyan);
  log('📦 Created files:', colors.cyan);
  log('   - LightChat Setup 1.0.0.exe (Installer)', colors.green);
  log('   - LightChat 1.0.0.exe (Portable)', colors.green);
  
  log('\n📝 Next steps:', colors.cyan);
  log('   1. Ensure PostgreSQL and Redis are running', colors.yellow);
  log('   2. Run database migration: cd server && npm run migrate', colors.yellow);
  log('   3. Run the installer or portable executable', colors.yellow);
  log('   4. Update .env with your database configuration', colors.yellow);
  
  log('\n✨ Done!', colors.green);
}

buildElectronApp().catch(error => {
  log(`\n✗ Build failed: ${error.message}`, colors.red);
  process.exit(1);
});
