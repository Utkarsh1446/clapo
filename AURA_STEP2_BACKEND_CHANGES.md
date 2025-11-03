# Aura System - Step 2 Backend Implementation Guide

## Overview
This document outlines the backend changes needed to support Aura rewards and daily post limits.

---

## 🔧 Required API Endpoints

### 1. Check If User Can Post
**Endpoint**: `GET /aura/:userId/can-post`

**Purpose**: Check if user has posts remaining today

**Response**:
```json
{
  "success": true,
  "canPost": true,
  "postsRemaining": 3,
  "postsToday": 2,
  "maxPosts": 5
}
```

**SQL Implementation**:
```sql
-- Get or create today's post limit record
INSERT INTO daily_post_limits (user_id, date, post_count)
VALUES ($1, CURRENT_DATE, 0)
ON CONFLICT (user_id, date) DO NOTHING;

-- Get current post count
SELECT
  post_count,
  (5 - post_count) as posts_remaining,
  CASE WHEN post_count >= 5 THEN false ELSE true END as can_post
FROM daily_post_limits
WHERE user_id = $1 AND date = CURRENT_DATE;
```

**Node.js Example**:
```javascript
app.get('/aura/:userId/can-post', async (req, res) => {
  const { userId } = req.params;

  try {
    // Ensure record exists for today
    await pool.query(`
      INSERT INTO daily_post_limits (user_id, date, post_count)
      VALUES ($1, CURRENT_DATE, 0)
      ON CONFLICT (user_id, date) DO NOTHING
    `, [userId]);

    // Get post count
    const result = await pool.query(`
      SELECT
        post_count,
        (5 - post_count) as posts_remaining,
        CASE WHEN post_count >= 5 THEN false ELSE true END as can_post
      FROM daily_post_limits
      WHERE user_id = $1 AND date = CURRENT_DATE
    `, [userId]);

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        canPost: true,
        postsRemaining: 5,
        postsToday: 0,
        maxPosts: 5
      });
    }

    const row = result.rows[0];
    res.json({
      success: true,
      canPost: row.can_post,
      postsRemaining: row.posts_remaining,
      postsToday: row.post_count,
      maxPosts: 5
    });
  } catch (error) {
    console.error('Error checking post limit:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check post limit'
    });
  }
});
```

---

### 2. Increment Post Count and Award Aura
**Endpoint**: `POST /aura/:userId/increment-post`

**Purpose**: Award +10 Aura and increment daily post count after successful post creation

**Request Body**:
```json
{
  "postId": "uuid-of-the-post",
  "contentType": "post"
}
```

**Response**:
```json
{
  "success": true,
  "auraRewarded": 10,
  "newBalance": 460,
  "newTier": 2,
  "postsRemaining": 2,
  "message": "Post created! +10 Aura earned"
}
```

**SQL Implementation**:
```sql
-- 1. Check if user can post (should be checked before this, but validate again)
SELECT post_count FROM daily_post_limits
WHERE user_id = $1 AND date = CURRENT_DATE;

-- If post_count >= 5, return error

-- 2. Increment post count
INSERT INTO daily_post_limits (user_id, date, post_count, last_post_at)
VALUES ($1, CURRENT_DATE, 1, NOW())
ON CONFLICT (user_id, date)
DO UPDATE SET
  post_count = daily_post_limits.post_count + 1,
  last_post_at = NOW();

-- 3. Award Aura using the function created in Step 1
SELECT * FROM update_aura_balance(
  $1::uuid,           -- user_id
  10,                 -- amount (+10 Aura)
  'post_creation',    -- transaction_type
  $2::uuid,           -- source_id (post_id)
  'post',             -- source_type
  NULL                -- metadata
);

-- 4. Get updated post count
SELECT (5 - post_count) as posts_remaining
FROM daily_post_limits
WHERE user_id = $1 AND date = CURRENT_DATE;
```

**Node.js Example**:
```javascript
app.post('/aura/:userId/increment-post', async (req, res) => {
  const { userId } = req.params;
  const { postId, contentType } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Check current post count
    const checkResult = await client.query(`
      SELECT post_count FROM daily_post_limits
      WHERE user_id = $1 AND date = CURRENT_DATE
    `, [userId]);

    if (checkResult.rows.length > 0 && checkResult.rows[0].post_count >= 5) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Daily post limit reached'
      });
    }

    // 2. Increment post count
    await client.query(`
      INSERT INTO daily_post_limits (user_id, date, post_count, last_post_at)
      VALUES ($1, CURRENT_DATE, 1, NOW())
      ON CONFLICT (user_id, date)
      DO UPDATE SET
        post_count = daily_post_limits.post_count + 1,
        last_post_at = NOW()
    `, [userId]);

    // 3. Award Aura
    const auraResult = await client.query(`
      SELECT * FROM update_aura_balance(
        $1::uuid,
        10,
        'post_creation',
        $2::uuid,
        'post',
        NULL
      )
    `, [userId, postId]);

    const auraData = auraResult.rows[0];

    // 4. Get updated post count
    const countResult = await client.query(`
      SELECT (5 - post_count) as posts_remaining
      FROM daily_post_limits
      WHERE user_id = $1 AND date = CURRENT_DATE
    `, [userId]);

    await client.query('COMMIT');

    res.json({
      success: true,
      auraRewarded: 10,
      newBalance: auraData.new_balance,
      newTier: auraData.new_tier,
      postsRemaining: countResult.rows[0].posts_remaining,
      message: 'Post created! +10 Aura earned'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error incrementing post count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to increment post count'
    });
  } finally {
    client.release();
  }
});
```

---

## 🔄 Integration with Existing Post Creation

### Option A: Call from Frontend (Current Implementation)

**Flow**:
1. Frontend calls existing `POST /posts` endpoint
2. Post is created successfully
3. Frontend then calls `POST /aura/:userId/increment-post`
4. Aura is awarded and count is incremented

**Pros**:
- No changes to existing post creation logic
- Aura system is isolated
- Easy to debug

**Cons**:
- Two API calls instead of one
- Potential for desync if second call fails

---

### Option B: Integrate into Post Creation Endpoint (Recommended)

**Modified Post Creation Endpoint**:

```javascript
app.post('/posts', async (req, res) => {
  const { userId, content, mediaUrl, uuid } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Check if user can post (Aura limit)
    const limitCheck = await client.query(`
      SELECT post_count FROM daily_post_limits
      WHERE user_id = $1 AND date = CURRENT_DATE
    `, [userId]);

    if (limitCheck.rows.length > 0 && limitCheck.rows[0].post_count >= 5) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Daily post limit reached (5 posts per day)'
      });
    }

    // 2. Create the post (your existing logic)
    const postResult = await client.query(`
      INSERT INTO posts (id, user_id, content, media_url, created_at, uuid)
      VALUES (gen_random_uuid(), $1, $2, $3, NOW(), $4)
      RETURNING *
    `, [userId, content, mediaUrl, uuid]);

    const post = postResult.rows[0];

    // 3. Increment post count
    await client.query(`
      INSERT INTO daily_post_limits (user_id, date, post_count, last_post_at)
      VALUES ($1, CURRENT_DATE, 1, NOW())
      ON CONFLICT (user_id, date)
      DO UPDATE SET
        post_count = daily_post_limits.post_count + 1,
        last_post_at = NOW()
    `, [userId]);

    // 4. Award Aura
    await client.query(`
      SELECT * FROM update_aura_balance(
        $1::uuid,
        10,
        'post_creation',
        $2::uuid,
        'post',
        jsonb_build_object('content', $3)
      )
    `, [userId, post.id, content.substring(0, 50)]);

    await client.query('COMMIT');

    res.json({
      success: true,
      post: post,
      auraAwarded: true,
      auraAmount: 10
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create post'
    });
  } finally {
    client.release();
  }
});
```

---

## 📋 Summary of Backend Changes

### Required Changes:

1. **Add Endpoint**: `GET /aura/:userId/can-post`
   - Returns whether user can post today
   - Returns posts remaining

2. **Add Endpoint**: `POST /aura/:userId/increment-post`
   - Increments daily post count
   - Awards +10 Aura
   - Returns new balance and posts remaining

3. **Modify Endpoint** (Optional but Recommended): `POST /posts`
   - Add daily limit check before creating post
   - Call Aura functions after successful post creation
   - Makes it atomic (single transaction)

### Database Prerequisites:

All required tables and functions were created in **Step 1 migration**:
- ✅ `aura_balances` table exists
- ✅ `aura_transactions` table exists
- ✅ `daily_post_limits` table exists
- ✅ `update_aura_balance()` function exists

No additional migrations needed!

---

## 🧪 Testing Endpoints

### Test 1: Check Can Post
```bash
curl http://server.blazeswap.io/api/aura/{userId}/can-post
```

**Expected Response**:
```json
{
  "success": true,
  "canPost": true,
  "postsRemaining": 5,
  "postsToday": 0,
  "maxPosts": 5
}
```

### Test 2: Increment Post Count
```bash
curl -X POST http://server.blazeswap.io/api/aura/{userId}/increment-post \
  -H "Content-Type: application/json" \
  -d '{
    "postId": "550e8400-e29b-41d4-a716-446655440000",
    "contentType": "post"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "auraRewarded": 10,
  "newBalance": 110,
  "newTier": 2,
  "postsRemaining": 4,
  "message": "Post created! +10 Aura earned"
}
```

### Test 3: Try 6th Post
After creating 5 posts, try to create another:

```bash
curl http://server.blazeswap.io/api/aura/{userId}/can-post
```

**Expected Response**:
```json
{
  "success": true,
  "canPost": false,
  "postsRemaining": 0,
  "postsToday": 5,
  "maxPosts": 5
}
```

---

## 🔐 Authentication

Make sure to add authentication middleware to all endpoints:

```javascript
const authenticateUser = (req, res, next) => {
  // Your auth logic here
  // Verify req.user.id matches req.params.userId or user is admin
  next();
};

app.get('/aura/:userId/can-post', authenticateUser, handler);
app.post('/aura/:userId/increment-post', authenticateUser, handler);
```

---

## 🚨 Error Handling

### Common Errors:

1. **Daily Limit Reached**
```json
{
  "success": false,
  "error": "Daily post limit reached (5 posts per day)",
  "code": "DAILY_LIMIT_REACHED"
}
```

2. **User Not Found**
```json
{
  "success": false,
  "error": "User not found",
  "code": "USER_NOT_FOUND"
}
```

3. **Aura System Error**
```json
{
  "success": false,
  "error": "Failed to award Aura",
  "code": "AURA_UPDATE_FAILED"
}
```

---

## 📊 Daily Reset Logic

Posts automatically reset daily because the `daily_post_limits` table uses `date` as part of the primary key:

```sql
PRIMARY KEY (user_id, date)
```

Each new day creates a new row, so counts automatically reset to 0.

**No cron job needed for daily reset!**

---

## ✅ Implementation Checklist

Backend developers should:

- [ ] Implement `GET /aura/:userId/can-post` endpoint
- [ ] Implement `POST /aura/:userId/increment-post` endpoint
- [ ] (Optional) Modify `POST /posts` to integrate Aura
- [ ] Add authentication middleware
- [ ] Add error handling
- [ ] Test with 5+ posts from same user
- [ ] Verify Aura balance increases by 10 per post
- [ ] Verify daily limit enforcement works
- [ ] Test that limits reset daily

---

## 🎯 Quick Start

**Minimal Implementation** (if you want to start simple):

1. Copy the two endpoint examples above
2. Add them to your existing API routes
3. Test with curl/Postman
4. Frontend will automatically start working

**Time Estimate**: 30-60 minutes for basic implementation

---

That's it! These are the only backend changes needed for Step 2. The database schema from Step 1 already supports everything. 🚀
