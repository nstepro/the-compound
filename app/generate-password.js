const bcrypt = require('bcrypt');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function generatePasswordHash(password, type = 'admin') {
  try {
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    
    const envVarName = type === 'guest' ? 'GUEST_PASSWORD_HASH' : 'ADMIN_PASSWORD_HASH';
    
    console.log(`\n=== ${type.charAt(0).toUpperCase() + type.slice(1)} Password Hash Generated ===`);
    console.log('Add this to your environment variables:');
    console.log(`${envVarName}=${hash}`);
    console.log('\nFor local development, add to .env.local:');
    console.log(`${envVarName}=${hash}`);
    console.log('\nFor Heroku deployment:');
    console.log(`heroku config:set ${envVarName}="${hash}"`);
    console.log('\nKeep this hash secret and secure!');
    
    return hash;
  } catch (error) {
    console.error('Error generating hash:', error);
    throw error;
  }
}

function printUsage() {
  console.log('Password Hash Generator');
  console.log('Usage:');
  console.log('  node generate-password.js [type] [password]');
  console.log('');
  console.log('Arguments:');
  console.log('  type      Password type: "admin" or "guest" (default: admin)');
  console.log('  password  The password to hash (if omitted, will prompt)');
  console.log('');
  console.log('Examples:');
  console.log('  node generate-password.js                    # Interactive mode (admin)');
  console.log('  node generate-password.js admin              # Interactive mode (admin)');
  console.log('  node generate-password.js guest              # Interactive mode (guest)');
  console.log('  node generate-password.js admin myPassword   # Direct mode (admin)');
  console.log('  node generate-password.js guest myPassword   # Direct mode (guest)');
}

async function promptForPassword(type) {
  return new Promise((resolve) => {
    rl.question(`Enter the ${type} password: `, (password) => {
      resolve(password);
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  
  // Handle help flag
  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }
  
  let type = 'admin';
  let password = null;
  
  // Parse arguments
  if (args.length >= 1) {
    if (args[0] === 'admin' || args[0] === 'guest') {
      type = args[0];
      password = args[1];
    } else {
      // First argument is password, default to admin
      password = args[0];
    }
  }
  
  try {
    // If no password provided, prompt for it
    if (!password) {
      password = await promptForPassword(type);
    }
    
    if (!password || password.trim() === '') {
      console.error('Error: Password cannot be empty');
      process.exit(1);
    }
    
    await generatePasswordHash(password, type);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main(); 