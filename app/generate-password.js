const bcrypt = require('bcrypt');

async function generatePasswordHash(password) {
  try {
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('Password hash generated:');
    console.log(hash);
    console.log('\nAdd this to your .env file:');
    console.log(`ADMIN_PASSWORD_HASH=${hash}`);
  } catch (error) {
    console.error('Error generating hash:', error);
  }
}

// Get password from command line argument or prompt
const password = process.argv[2];

if (!password) {
  console.log('Usage: node generate-password.js <your-password>');
  console.log('Example: node generate-password.js mySecurePassword123');
  process.exit(1);
}

generatePasswordHash(password); 