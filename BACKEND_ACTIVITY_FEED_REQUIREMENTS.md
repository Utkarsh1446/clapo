# Backend Requirements: Activity Feed Username Support

**Date**: 2025-11-04
**Issue**: Activity feed currently returns wallet addresses instead of usernames
**Goal**: Show "titan bought a share of utkarsh" instead of "0x1234...5678 bought a share of 0xabcd...cdef"

---

## Option 1: Update Activity Feed API (RECOMMENDED)

### Modify Existing Endpoint

**Endpoint**: `GET /api/activity-feed/recent?limit={limit}`

**Current Response** (Problem):
```json
[
  {
    "id": "activity_123",
    "type": "post_token",
    "action": "bought",
    "user_address": "0x1234567890abcdef1234567890abcdef12345678",
    "username": "0x1234567890abcdef1234567890abcdef12345678",  // ❌ This is an address!
    "token_name": "Post #456",
    "creator_name": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",  // ❌ This is an address!
    "token_uuid": "token_789",
    "amount": 5,
    "price_per_token": 0.001,
    "total_cost": 0.005,
    "is_freebie": false,
    "created_at": "2025-11-04T12:34:56Z",
    "tx_hash": "0x..."
  }
]
```

**Required Response** (Solution):
```json
[
  {
    "id": "activity_123",
    "type": "post_token",
    "action": "bought",
    "user_address": "0x1234567890abcdef1234567890abcdef12345678",
    "username": "titan",  // ✅ Actual username!
    "token_name": "Post #456",
    "creator_name": "utkarsh",  // ✅ Actual username!
    "creator_address": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",  // Optional: Keep address for reference
    "token_uuid": "token_789",
    "amount": 5,
    "price_per_token": 0.001,
    "total_cost": 0.005,
    "is_freebie": false,
    "created_at": "2025-11-04T12:34:56Z",
    "tx_hash": "0x..."
  }
]
```

### Database Query Change

**Current Query** (Assumed):
```sql
SELECT
  a.id,
  a.type,
  a.action,
  a.user_address,
  a.user_address as username,  -- ❌ Using address as username
  a.token_name,
  a.creator_address as creator_name,  -- ❌ Using address as creator name
  a.token_uuid,
  a.amount,
  a.price_per_token,
  a.total_cost,
  a.is_freebie,
  a.created_at,
  a.tx_hash
FROM activities a
ORDER BY a.created_at DESC
LIMIT ?;
```

**Required Query** (Solution):
```sql
SELECT
  a.id,
  a.type,
  a.action,
  a.user_address,
  u.username as username,  -- ✅ Join to get user's username
  a.token_name,
  c.username as creator_name,  -- ✅ Join to get creator's username
  a.creator_address,  -- Optional: Keep address for reference
  a.token_uuid,
  a.amount,
  a.price_per_token,
  a.total_cost,
  a.is_freebie,
  a.created_at,
  a.tx_hash
FROM activities a
LEFT JOIN users u ON u.wallet_address = a.user_address
LEFT JOIN users c ON c.wallet_address = a.creator_address
ORDER BY a.created_at DESC
LIMIT ?;
```

### Python/FastAPI Implementation Example

```python
from fastapi import APIRouter, Query
from typing import List
import asyncpg

router = APIRouter()

@router.get("/activity-feed/recent")
async def get_recent_activity(
    limit: int = Query(20, le=100),
    db: asyncpg.Connection = Depends(get_db)
):
    """
    Get recent activity feed with usernames instead of addresses
    """
    query = """
        SELECT
            a.id,
            a.type,
            a.action,
            a.user_address,
            COALESCE(u.username, a.user_address) as username,  -- Fallback to address if no username
            a.token_name,
            COALESCE(c.username, a.creator_address) as creator_name,  -- Fallback to address
            a.creator_address,
            a.token_uuid,
            a.amount,
            a.price_per_token,
            a.total_cost,
            a.is_freebie,
            a.created_at,
            a.tx_hash
        FROM activities a
        LEFT JOIN users u ON u.wallet_address = a.user_address
        LEFT JOIN users c ON c.wallet_address = a.creator_address
        ORDER BY a.created_at DESC
        LIMIT $1
    """

    rows = await db.fetch(query, limit)

    return [dict(row) for row in rows]
```

---

## Option 2: Add Username Lookup Endpoint (ALTERNATIVE)

If you can't modify the activity feed endpoint immediately, add this:

### New Endpoint

**Endpoint**: `GET /api/users/wallet/{wallet_address}`

**Purpose**: Fetch username by wallet address (for frontend to resolve addresses to usernames)

**Request**:
```http
GET /api/users/wallet/0x1234567890abcdef1234567890abcdef12345678
```

**Response**:
```json
{
  "success": true,
  "wallet_address": "0x1234567890abcdef1234567890abcdef12345678",
  "username": "titan",
  "display_name": "Titan",
  "avatar_url": "https://...",
  "created_at": "2025-10-01T12:00:00Z"
}
```

**Error Response** (User not found):
```json
{
  "success": false,
  "error": "User not found",
  "wallet_address": "0x1234567890abcdef1234567890abcdef12345678"
}
```

### Database Query

```sql
SELECT
  id,
  wallet_address,
  username,
  display_name,
  avatar_url,
  created_at
FROM users
WHERE wallet_address = $1;
```

### Python/FastAPI Implementation

```python
from fastapi import APIRouter, HTTPException, Path
import asyncpg

router = APIRouter()

@router.get("/users/wallet/{wallet_address}")
async def get_user_by_wallet(
    wallet_address: str = Path(..., regex="^0x[a-fA-F0-9]{40}$"),  # Validate address format
    db: asyncpg.Connection = Depends(get_db)
):
    """
    Get user information by wallet address
    """
    query = """
        SELECT
            id,
            wallet_address,
            username,
            display_name,
            avatar_url,
            created_at
        FROM users
        WHERE LOWER(wallet_address) = LOWER($1)  -- Case-insensitive comparison
    """

    user = await db.fetchrow(query, wallet_address)

    if not user:
        raise HTTPException(
            status_code=404,
            detail={
                "success": False,
                "error": "User not found",
                "wallet_address": wallet_address
            }
        )

    return {
        "success": True,
        "wallet_address": user["wallet_address"],
        "username": user["username"],
        "display_name": user["display_name"],
        "avatar_url": user["avatar_url"],
        "created_at": user["created_at"].isoformat()
    }
```

---

## Option 3: Batch Username Lookup (OPTIMAL FOR FRONTEND)

If the frontend needs to look up many addresses at once:

### New Endpoint

**Endpoint**: `POST /api/users/batch-lookup`

**Purpose**: Get usernames for multiple wallet addresses in one request

**Request**:
```json
{
  "addresses": [
    "0x1234567890abcdef1234567890abcdef12345678",
    "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    "0x9876543210fedcba9876543210fedcba98765432"
  ]
}
```

**Response**:
```json
{
  "success": true,
  "users": {
    "0x1234567890abcdef1234567890abcdef12345678": {
      "username": "titan",
      "display_name": "Titan",
      "avatar_url": "https://..."
    },
    "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd": {
      "username": "utkarsh",
      "display_name": "Utkarsh",
      "avatar_url": "https://..."
    },
    "0x9876543210fedcba9876543210fedcba98765432": null  // User not found
  }
}
```

### Python/FastAPI Implementation

```python
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Dict, Optional
import asyncpg

router = APIRouter()

class BatchLookupRequest(BaseModel):
    addresses: List[str]

@router.post("/users/batch-lookup")
async def batch_lookup_users(
    request: BatchLookupRequest,
    db: asyncpg.Connection = Depends(get_db)
):
    """
    Batch lookup usernames for multiple wallet addresses
    """
    # Validate and normalize addresses
    addresses = [addr.lower() for addr in request.addresses if addr.startswith('0x')]

    if len(addresses) > 100:  # Limit batch size
        return {"success": False, "error": "Maximum 100 addresses per request"}

    query = """
        SELECT
            wallet_address,
            username,
            display_name,
            avatar_url
        FROM users
        WHERE LOWER(wallet_address) = ANY($1)
    """

    rows = await db.fetch(query, addresses)

    # Create lookup map
    users_map = {}
    for row in rows:
        users_map[row["wallet_address"].lower()] = {
            "username": row["username"],
            "display_name": row["display_name"],
            "avatar_url": row["avatar_url"]
        }

    # Add null for addresses not found
    result = {}
    for addr in request.addresses:
        result[addr] = users_map.get(addr.lower(), None)

    return {
        "success": True,
        "users": result
    }
```

---

## Recommendation

**Best Approach: Option 1 + Option 3**

1. **Update `/api/activity-feed/recent`** to return usernames (Option 1)
   - This is the cleanest solution
   - No additional API calls needed on frontend
   - Better performance

2. **Add `/api/users/batch-lookup`** endpoint (Option 3)
   - Useful for other parts of the app
   - Allows frontend to resolve addresses anywhere
   - Single API call for multiple addresses

---

## Testing

### Test Activity Feed Endpoint

```bash
# Test recent activity
curl -X GET "https://server.blazeswap.io/api/activity-feed/recent?limit=10" \
  -H "Content-Type: application/json"

# Expected: Should return usernames, not addresses
```

### Test Batch Lookup Endpoint

```bash
# Test batch lookup
curl -X POST "https://server.blazeswap.io/api/users/batch-lookup" \
  -H "Content-Type: application/json" \
  -d '{
    "addresses": [
      "0x1234567890abcdef1234567890abcdef12345678",
      "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
    ]
  }'

# Expected: Should return username mapping
```

---

## Database Indexes (For Performance)

Add these indexes if they don't exist:

```sql
-- Index for user lookup by wallet address
CREATE INDEX IF NOT EXISTS idx_users_wallet_address
ON users(LOWER(wallet_address));

-- Index for activity queries
CREATE INDEX IF NOT EXISTS idx_activities_created_at
ON activities(created_at DESC);

-- Composite index for joins
CREATE INDEX IF NOT EXISTS idx_activities_user_creator
ON activities(user_address, creator_address);
```

---

## Migration Steps

1. **Add indexes** (5 minutes)
   ```sql
   -- Run the index creation queries above
   ```

2. **Update activity feed endpoint** (30 minutes)
   - Modify query to join with users table
   - Test with sample data
   - Deploy to staging

3. **Add batch lookup endpoint** (optional, 20 minutes)
   - Implement endpoint
   - Test with sample addresses
   - Deploy to staging

4. **Test on frontend** (10 minutes)
   - Verify usernames appear correctly
   - Check for any edge cases (missing users)

5. **Deploy to production** (5 minutes)

**Total Time: ~1 hour**

---

## Edge Cases to Handle

1. **User has no username**
   - Fallback to truncated address: `0x1234...5678`
   - Or fallback to "User #{id}"

2. **User account deleted**
   - Show "Deleted User" or keep address

3. **Multiple users with same username** (if possible)
   - Ensure usernames are unique in database
   - Add unique constraint if not present:
     ```sql
     ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username);
     ```

4. **Case sensitivity**
   - Always compare addresses case-insensitively
   - Use `LOWER()` in queries

5. **Performance with large activity feed**
   - JOINs should be fast with proper indexes
   - Consider caching frequent lookups
   - Pagination helps (limit=20 default)

---

## Summary

**URGENT: Update `/api/activity-feed/recent` endpoint**

**Required Changes:**
1. Add LEFT JOINs to users table for both user and creator
2. Return `username` and `creator_name` as actual usernames
3. Optionally keep `user_address` and `creator_address` for reference

**Optional but Recommended:**
1. Add `/api/users/batch-lookup` endpoint for frontend flexibility
2. Add database indexes for performance

**Frontend Status:**
- ✅ Already updated to handle usernames
- ⏳ Will work once backend returns usernames
- ✅ Has fallback logic for addresses

**Estimated Time: 1 hour for complete implementation**

---

**Need help implementing? Let me know which option you prefer!**
