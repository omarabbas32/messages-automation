import axios from 'axios';

async function testRegister() {
  try {
    const response = await axios.post('http://localhost:3000/api/auth/register', {
      email: `test_${Date.now()}@example.com`,
      password: 'password123'
    });
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('Error Status:', error.response?.status);
    console.log('Error Data:', error.response?.data);
    if (!error.response) {
      console.log('No response received:', error.message);
    }
  }
}

testRegister();
