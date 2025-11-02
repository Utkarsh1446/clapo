// Test script to check and initialize Aura for a user
// Usage: node test-aura-init.js <userId>

const userId = process.argv[2];

if (!userId) {
  console.log('❌ Please provide a userId');
  console.log('Usage: node test-aura-init.js <userId>');
  process.exit(1);
}

const API_BASE = 'http://server.blazeswap.io/api';

async function testAuraAPI() {
  console.log(`\n🔍 Testing Aura API for user: ${userId}\n`);

  // 1. Check if user has Aura balance
  console.log('1️⃣ Checking existing Aura balance...');
  try {
    const response = await fetch(`${API_BASE}/aura/${userId}`);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ User has Aura balance:');
      console.log(JSON.stringify(data, null, 2));
      return;
    } else if (response.status === 404) {
      console.log('⚠️  User does not have Aura balance (404)');
    } else {
      console.log(`❌ Error: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.log(text);
      return;
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
    return;
  }

  // 2. Initialize Aura balance
  console.log('\n2️⃣ Initializing Aura balance...');
  try {
    const response = await fetch(`${API_BASE}/aura/${userId}/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: 110,
        transaction_type: 'initial_balance'
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Aura initialized successfully:');
      console.log(JSON.stringify(data, null, 2));

      // 3. Verify by fetching again
      console.log('\n3️⃣ Verifying Aura balance...');
      const verifyResponse = await fetch(`${API_BASE}/aura/${userId}`);
      const verifyData = await verifyResponse.json();
      console.log('✅ Current Aura balance:');
      console.log(JSON.stringify(verifyData, null, 2));
    } else {
      console.log(`❌ Failed to initialize: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.log(text);
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

testAuraAPI();
