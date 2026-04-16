import bcrypt from 'bcrypt';

async function testBcrypt() {
  try {
    console.log('Testing bcrypt...');
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('password123', salt);
    console.log('Hash generated:', hash);
    const match = await bcrypt.compare('password123', hash);
    console.log('Match result:', match);
    console.log('✅ Bcrypt is working correctly.');
  } catch (error) {
    console.error('❌ Bcrypt test failed:', error);
  }
}

testBcrypt();
