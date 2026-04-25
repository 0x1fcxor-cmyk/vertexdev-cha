const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting LightChat in Electron development mode...\n');

// Start backend server
console.log('📡 Starting backend server...');
const serverProcess = require('child_process').spawn(
  'npm',
  ['run', 'dev:server'],
  { cwd: path.join(__dirname, '../server'), stdio: 'inherit' }
);

// Wait a bit for server to start, then start Electron
setTimeout(() => {
  console.log('🖥️  Starting Electron...');
  try {
    execSync('npm run electron:dev', { stdio: 'inherit' });
  } catch (error) {
    console.error('Electron failed to start');
    serverProcess.kill();
    process.exit(1);
  }
}, 3000);

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  serverProcess.kill();
  process.exit(0);
});
