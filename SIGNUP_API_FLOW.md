# Signup API Flow - Correct Implementation

## API Endpoints

### 1. Create Profile
**POST** `/auth/signup/privy`

**Accepts:**
- `privyId` (required)
- `name` (required)
- `username` (required)
- `displayName` (optional)
- `email` (optional)
- `wallet` (optional)
- `phone` (optional)
- `twitter` (optional)
- `discord` (optional)
- `github` (optional)
- `google` (optional)
- `accountType` (required)
- `topics` (optional array)
- `following` (optional array)

**DOES NOT Accept:**
- ❌ `bio`
- ❌ `avatar_url` or `avatarUrl`

### 2. Update Profile
**PUT** `/users/{userId}/profile`

**Accepts:**
- `bio` (optional)
- `avatarUrl` (optional) - **Note: camelCase, not snake_case!**

**DOES NOT Accept:**
- ❌ `avatar_url` (snake_case)

### 3. Follow User
**POST** `/users/{targetUserId}/follow`

**Accepts:**
- `userId` (the user who is following)

### 4. Upload File
**POST** `/api/upload`

**Accepts:**
- `file` (multipart/form-data)
- `userId` (optional)

**Returns:**
- `url` (public URL to the uploaded file)
- `key` (file key in storage)

## Correct Signup Flow

### Steps 1-4: Collect Basic Info
- Step 1: Name & Username
- Step 2: Display Name
- Step 3: Topics (interests)
- Step 4: Follow Users (select users to follow)

**Action after Step 4:**
1. ✅ Call `POST /auth/signup/privy` with collected data (WITHOUT bio/avatar)
2. ✅ Get `userId` from response
3. ✅ For each selected user to follow: Call `POST /users/{targetUserId}/follow`

### Step 5: Avatar Upload

**Actions:**
1. ✅ Upload avatar file using `POST /api/upload`
2. ✅ Get `url` from response
3. ✅ Store avatar URL temporarily (don't call update yet)

### Step 6: Bio (Final Step)

**Actions:**
1. ✅ Call `PUT /users/{userId}/profile` with:
   ```json
   {
     "bio": "user's bio text",
     "avatarUrl": "https://..." // from step 5
   }
   ```

## Key Points

- **Profile must be created first** (Steps 1-4) before updating with bio/avatar
- **Use camelCase `avatarUrl`** in the update endpoint, not `avatar_url`
- **Follow API calls** should happen after profile creation
- **Avatar upload and bio update** happen in Steps 5-6 via profile update endpoint

## Testing

Run `node test-signup-apis.js` to verify all endpoints work correctly.
