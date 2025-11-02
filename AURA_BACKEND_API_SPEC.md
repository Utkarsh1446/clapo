# Aura System - Backend API Endpoints Specification

## Base URL
`https://server.blazeswap.io/api/snaps`

---

## 📌 Endpoint 1: Get User Aura Balance

### `GET /aura/:userId`

**Description**: Get user's current Aura balance and statistics

**Parameters**:
- `userId` (path) - User UUID

**Response**:
```json
{
  "success": true,
  "aura": {
    "userId": "uuid",
    "balance": 450,
    "tier": 2,
    "tierName": "Active",
    "reachMultiplier": 1.5,
    "lastDecayAt": "2024-01-15T10:00:00Z",
    "totalEarned": 1200,
    "totalSpent": 750,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T14:30:00Z",
    "nextTier": 3,
    "nextTierThreshold": 500,
    "progressToNextTier": 90.0,
    "dailyPostsRemaining": 3,
    "canCreateOpinions": true,
    "auraEarnedToday": 30,
    "auraSpentToday": 0
  }
}
```

**SQL Query**:
```sql
-- Get balance
SELECT
  user_id,
  balance,
  tier,
  last_decay_at,
  total_earned,
  total_spent,
  created_at,
  updated_at
FROM aura_balances
WHERE user_id = $1;

-- Get today's stats
SELECT
  COALESCE(SUM(amount) FILTER (WHERE amount > 0), 0) as earned_today,
  COALESCE(SUM(ABS(amount)) FILTER (WHERE amount < 0), 0) as spent_today
FROM aura_transactions
WHERE user_id = $1
  AND DATE(created_at) = CURRENT_DATE;

-- Get posts today
SELECT post_count
FROM daily_post_limits
WHERE user_id = $1 AND date = CURRENT_DATE;
```

---

## 📌 Endpoint 2: Get Aura Transaction History

### `GET /aura/:userId/transactions`

**Description**: Get user's Aura transaction history

**Parameters**:
- `userId` (path) - User UUID
- `limit` (query, optional) - Number of transactions (default: 50, max: 100)
- `offset` (query, optional) - Pagination offset (default: 0)
- `type` (query, optional) - Filter by transaction type

**Response**:
```json
{
  "success": true,
  "transactions": [
    {
      "id": "uuid",
      "userId": "uuid",
      "amount": 10,
      "balanceAfter": 460,
      "transactionType": "post_creation",
      "sourceId": "post-uuid",
      "sourceType": "post",
      "metadata": { "postTitle": "My awesome post" },
      "createdAt": "2024-01-15T14:30:00Z"
    },
    {
      "id": "uuid",
      "userId": "uuid",
      "amount": -10,
      "balanceAfter": 450,
      "transactionType": "daily_decay",
      "sourceId": null,
      "sourceType": null,
      "metadata": null,
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 150,
  "hasMore": true
}
```

**SQL Query**:
```sql
-- Get transactions
SELECT
  id,
  user_id,
  amount,
  balance_after,
  transaction_type,
  source_id,
  source_type,
  metadata,
  created_at
FROM aura_transactions
WHERE user_id = $1
  AND ($2::varchar IS NULL OR transaction_type = $2)
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;

-- Get total count
SELECT COUNT(*)
FROM aura_transactions
WHERE user_id = $1
  AND ($2::varchar IS NULL OR transaction_type = $2);
```

---

## 📌 Endpoint 3: Get Aura Leaderboard

### `GET /aura/leaderboard`

**Description**: Get top Aura holders

**Parameters**:
- `limit` (query, optional) - Number of users (default: 100)
- `tier` (query, optional) - Filter by tier (1-5)

**Response**:
```json
{
  "success": true,
  "leaderboard": [
    {
      "rank": 1,
      "userId": "uuid",
      "username": "top_creator",
      "displayName": "Top Creator",
      "avatarUrl": "https://...",
      "auraBalance": 5000,
      "tier": 5,
      "tierName": "Legend",
      "totalEarned": 10000,
      "totalSpent": 5000,
      "followerCount": 10000
    }
  ],
  "total": 10543
}
```

**SQL Query**:
```sql
-- Use the view
SELECT * FROM aura_leaderboard
WHERE ($1::integer IS NULL OR tier = $1)
LIMIT $2;
```

---

## 📌 Endpoint 4: Update Aura Balance

### `POST /aura/:userId/update`

**Description**: Update user's Aura balance (internal use by other services)

**Parameters**:
- `userId` (path) - User UUID

**Request Body**:
```json
{
  "amount": 10,
  "transactionType": "post_creation",
  "sourceId": "post-uuid",
  "sourceType": "post",
  "metadata": {
    "postTitle": "My awesome post"
  }
}
```

**Response**:
```json
{
  "success": true,
  "newBalance": 460,
  "newTier": 2,
  "transaction": {
    "id": "uuid",
    "userId": "uuid",
    "amount": 10,
    "balanceAfter": 460,
    "transactionType": "post_creation",
    "sourceId": "post-uuid",
    "sourceType": "post",
    "metadata": { "postTitle": "My awesome post" },
    "createdAt": "2024-01-15T14:30:00Z"
  }
}
```

**SQL Function** (already created in migration):
```sql
SELECT * FROM update_aura_balance(
  $1, -- user_id
  $2, -- amount
  $3, -- transaction_type
  $4, -- source_id
  $5, -- source_type
  $6  -- metadata (JSONB)
);
```

---

## 📌 Endpoint 5: Check If User Can Create Post

### `GET /aura/:userId/can-post`

**Description**: Check if user has posts remaining today

**Parameters**:
- `userId` (path) - User UUID

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

**Or if limit reached**:
```json
{
  "success": true,
  "canPost": false,
  "postsRemaining": 0,
  "postsToday": 5,
  "maxPosts": 5,
  "reason": "Daily post limit reached. Come back tomorrow!"
}
```

**SQL Query**:
```sql
-- Get or create today's post limit record
INSERT INTO daily_post_limits (user_id, date, post_count)
VALUES ($1, CURRENT_DATE, 0)
ON CONFLICT (user_id, date)
DO NOTHING;

-- Get post count
SELECT post_count
FROM daily_post_limits
WHERE user_id = $1 AND date = CURRENT_DATE;
```

---

## 📌 Endpoint 6: Increment Daily Post Count

### `POST /aura/:userId/increment-post-count`

**Description**: Increment post count and award Aura (called when user creates post)

**Parameters**:
- `userId` (path) - User UUID

**Request Body**:
```json
{
  "postId": "uuid",
  "contentType": "post"
}
```

**Response**:
```json
{
  "success": true,
  "auraRewarded": 10,
  "newBalance": 460,
  "postsRemaining": 2,
  "message": "Post created! +10 Aura earned"
}
```

**SQL Logic**:
```sql
-- 1. Check if can post
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

-- 3. Award Aura
SELECT * FROM update_aura_balance(
  $1, -- user_id
  10, -- amount
  'post_creation', -- transaction_type
  $2, -- post_id
  'post', -- source_type
  NULL -- metadata
);
```

---

## 🔄 Integration Points

### When User Creates a Post:
```javascript
// 1. Check if can post
const canPost = await fetch(`/aura/${userId}/can-post`);

// 2. If can post, create post
const post = await createPost(postData);

// 3. Increment count and award Aura
await fetch(`/aura/${userId}/increment-post-count`, {
  method: 'POST',
  body: JSON.stringify({ postId: post.id, contentType: 'post' })
});
```

### When User Gets Engagement:
```javascript
// Award engagement bonus
await fetch(`/aura/${userId}/update`, {
  method: 'POST',
  body: JSON.stringify({
    amount: 1, // +1 for like
    transactionType: 'engagement_bonus',
    sourceId: postId,
    sourceType: 'like',
    metadata: { fromUserId: likerId }
  })
});
```

---

## 🔐 Authentication

All endpoints should require authentication. Use your existing auth middleware:

```javascript
// Example Express.js route
router.get('/aura/:userId', authenticateUser, async (req, res) => {
  // Verify req.user.id matches req.params.userId or is admin
  // ...
});
```

---

## 🚨 Error Handling

Standard error responses:

```json
{
  "success": false,
  "error": "User not found",
  "code": "USER_NOT_FOUND"
}
```

Common error codes:
- `USER_NOT_FOUND` - User doesn't exist
- `AURA_NOT_INITIALIZED` - User has no Aura balance (shouldn't happen after migration)
- `DAILY_LIMIT_REACHED` - User has posted 5 times today
- `INSUFFICIENT_AURA` - User doesn't have enough Aura for action
- `INVALID_TRANSACTION_TYPE` - Unknown transaction type

---

## ✅ Implementation Checklist

- [ ] Create GET /aura/:userId endpoint
- [ ] Create GET /aura/:userId/transactions endpoint
- [ ] Create GET /aura/leaderboard endpoint
- [ ] Create POST /aura/:userId/update endpoint (internal)
- [ ] Create GET /aura/:userId/can-post endpoint
- [ ] Create POST /aura/:userId/increment-post-count endpoint
- [ ] Add authentication middleware to all endpoints
- [ ] Add error handling
- [ ] Test with real user data
- [ ] Verify Aura is awarded on post creation
- [ ] Verify daily limit enforcement works

---

Once these endpoints are ready, I'll create the React components and Context provider to display Aura in the UI! 🚀
