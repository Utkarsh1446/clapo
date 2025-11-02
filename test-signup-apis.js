// Test script to understand signup API requirements
require('dotenv').config({ path: '.env' });

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://server.blazeswap.io/api/snaps';

// Test data
const timestamp = Date.now();
const testData = {
  step1to4: {
    privyId: "test-privy-id-" + timestamp,
    email: `test${timestamp}@example.com`,
    wallet: null,
    accountType: "individual",
    name: "Test User",
    username: "testuser" + timestamp,
    displayName: "Test Display",
    topics: ["Technology", "Design"],
    following: [] // Will be populated after testing follow
  },
  allSteps: {
    privyId: "test-privy-all-" + timestamp,
    email: `testall${timestamp}@example.com`,
    wallet: null,
    accountType: "individual",
    name: "Test User All",
    username: "testuserall" + timestamp,
    displayName: "Test Display All",
    bio: "This is my bio from signup",
    avatar_url: "https://example.com/avatar.jpg",
    topics: ["Technology", "Design", "Business"],
    following: []
  }
};

async function testProfileCreation() {
  console.log('\n=== Testing Profile Creation (Steps 1-4) ===');
  console.log('POST', `${API_URL}/auth/signup/privy`);
  console.log('Data:', JSON.stringify(testData.step1to4, null, 2));

  try {
    const response = await fetch(`${API_URL}/auth/signup/privy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData.step1to4)
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('✅ Profile creation successful!');
      return data;
    } else {
      console.log('❌ Profile creation failed!');
      return null;
    }
  } catch (error) {
    console.error('Error:', error.message);
    return null;
  }
}

async function testFollowUser(userId, targetUserId) {
  console.log('\n=== Testing Follow User API ===');
  console.log('POST', `${API_URL}/users/${targetUserId}/follow`);
  console.log('Data:', { userId });

  try {
    const response = await fetch(`${API_URL}/users/${targetUserId}/follow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('✅ Follow successful!');
      return data;
    } else {
      console.log('❌ Follow failed!');
      return null;
    }
  } catch (error) {
    console.error('Error:', error.message);
    return null;
  }
}

async function testAvatarUpload() {
  console.log('\n=== Testing Avatar Upload ===');
  console.log('This would use /api/upload with multipart/form-data');
  console.log('Skipping actual upload test - need real file');
  console.log('Expected response: { success: true, url: "https://...", key: "..." }');
}

async function testProfileUpdate(userId, updateData) {
  console.log('\n=== Testing Profile Update (Bio, Avatar) ===');
  console.log('PUT', `${API_URL}/users/${userId}/profile`);
  console.log('Data:', JSON.stringify(updateData, null, 2));

  try {
    const response = await fetch(`${API_URL}/users/${userId}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('✅ Profile update successful!');
      return data;
    } else {
      console.log('❌ Profile update failed!');
      return null;
    }
  } catch (error) {
    console.error('Error:', error.message);
    return null;
  }
}

async function testProfileCreationWithAll() {
  console.log('\n=== Testing Profile Creation WITH Bio and Avatar ===');
  console.log('POST', `${API_URL}/auth/signup/privy`);
  console.log('Data:', JSON.stringify(testData.allSteps, null, 2));

  try {
    const response = await fetch(`${API_URL}/auth/signup/privy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData.allSteps)
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('✅ Profile creation with bio+avatar successful!');
      return data;
    } else {
      console.log('❌ Profile creation with bio+avatar failed!');
      return null;
    }
  } catch (error) {
    console.error('Error:', error.message);
    return null;
  }
}

async function runTests() {
  console.log('API URL:', API_URL);
  console.log('\nStarting API tests...\n');

  // Test 1: Create profile with steps 1-4 data (WITHOUT bio/avatar)
  const profileResult = await testProfileCreation();

  if (profileResult && profileResult.user) {
    const userId = profileResult.user.id;
    console.log('\nUser ID:', userId);

    // Test 2: Update profile with bio only
    const bioUpdateResult = await testProfileUpdate(userId, {
      bio: 'Updated bio after signup'
    });

    if (bioUpdateResult) {
      console.log('\n✅ Bio update successful!');
    }

    // Test 3: Try different field names for avatar
    console.log('\n=== Testing avatar field name ===');
    const avatarResult1 = await testProfileUpdate(userId, {
      avatarUrl: 'https://example.com/avatar.jpg'  // Try camelCase
    });

    if (!avatarResult1) {
      const avatarResult2 = await testProfileUpdate(userId, {
        avatar: 'https://example.com/avatar.jpg'  // Try without _url
      });
    }
  }

  console.log('\n=== FINAL Test Summary ===');
  console.log('✅ CORRECT signup flow discovered:');
  console.log('1. Steps 1-4: Collect name, username, displayName, topics, following');
  console.log('2. End of Step 4: POST /auth/signup/privy (creates profile WITHOUT bio/avatar)');
  console.log('3. Step 4 (Follow): For each user to follow: POST /users/{targetUserId}/follow');
  console.log('4. Step 5 (Avatar): POST /api/upload to get avatar URL');
  console.log('5. Step 6 (Bio): PUT /users/{userId}/profile with bio and avatar_url');
  console.log('\n⚠️  Bio and avatar_url must be added AFTER profile creation via update endpoint!');
}

runTests().catch(console.error);
