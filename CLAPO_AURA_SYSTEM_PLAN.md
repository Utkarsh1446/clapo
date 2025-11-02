# Clapo Aura System Integration Plan
**Version 1.0 | Comprehensive Architecture & Implementation Guide**

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [Aura System Overview](#aura-system-overview)
4. [Database Schema Changes](#database-schema-changes)
5. [API Endpoints](#api-endpoints)
6. [Frontend Components](#frontend-components)
7. [Algorithm Design](#algorithm-design)
8. [Economic Model](#economic-model)
9. [Implementation Phases](#implementation-phases)
10. [Architecture Diagrams](#architecture-diagrams)
11. [Migration Strategy](#migration-strategy)

---

## 1. Executive Summary

### Vision
Transform Clapo into an Aura-driven engagement platform where content quality and reach are determined by user reputation (Aura), with betting mechanics on Opinions and quality-gated campaign participation.

### Core Concept
- **Posts**: Users create content to farm Aura (max 5/day, +10 Aura each)
- **Opinions**: Prediction markets where users bet Aura/USDC on outcomes
- **Campaigns**: Projects set minimum Aura requirements for quality creators
- **Reach**: Higher Aura = More visibility (5x multiplier at top tier)
- **Daily Activity**: -10 Aura decay/day, requires 1 post minimum to maintain

### Key Benefits
- **For Creators**: Quality content gets rewarded with reach
- **For Projects**: Access to high-quality creators only
- **For Users**: Earn Aura through engagement, bet on predictions
- **For Platform**: Sustainable engagement loop, reduced spam

---

## 2. Current Architecture Analysis

### 2.1 Existing Content Types

#### **Snaps (Posts)**
- Text content with media support
- Engagement metrics: views, likes, comments, retweets
- Post popularity scoring
- Mention support
- Already has `post_popularity_score` field

#### **Munch (Short Videos)**
- ≤60 second videos
- Like, comment, view, share tracking
- Feed algorithms: General + Following
- Video-specific engagement

#### **Stories**
- 24-hour expiration
- Image/video support
- View tracking
- Viewer lists for owners

### 2.2 Existing User System

**Current User Profile Fields:**
```typescript
{
  id, username, email, bio, avatarUrl
  account_type: 'individual' | 'community'
  followerCount, followingCount
  reputation_score: 0-1000 (existing!)
  reputation_tier: Bronze/Silver/Gold/Platinum/Diamond
  total_posts, total_likes_given, total_comments_made
}
```

**Existing Reputation System:**
- Daily stats: claps, replies, remixes, givereps
- Daily decay mechanism (already implemented!)
- Streak tracking
- Leaderboard support
- Database tables: `reputation_scores`, `reputation_events`, `giverep_transactions`

### 2.3 Existing Creator Economy

**Post Tokens (SnapsShares):**
- Smart contract: `0xcaC4DF2Bd3723CEA847e1AE07F37Fb4B33c6Cb61`
- Quadratic pricing model
- Buy/sell mechanics
- Portfolio tracking
- Fee distribution: creator, reward pool, platform

**Creator Tokens:**
- Profile-level shares
- Access token system
- Gated content support
- Token holder benefits

### 2.4 Existing Infrastructure

**Technology Stack:**
- Next.js 14 (App Router)
- TypeScript
- PostgreSQL database
- Google Cloud Storage
- Base Sepolia blockchain
- Ethers.js for smart contracts
- RESTful API at `https://server.blazeswap.io/api/snaps`

**API Patterns:**
- RESTful design
- User authentication (Privy + NextAuth)
- Comprehensive CRUD operations
- Real-time updates

---

## 3. Aura System Overview

### 3.1 Core Mechanics

#### **Aura Definition**
Aura is a reputation currency that determines:
1. Content reach and visibility
2. Ability to create Opinions
3. Campaign participation eligibility
4. Messaging access to high-tier users

#### **Aura Balance Formula**
```
Starting Aura = 100
Daily Decay = -10 Aura/day
Post Creation = +10 Aura/post (max 5 posts = +50/day)

Minimum Daily Activity = 1 post to maintain Aura
Net Growth Potential = 40 Aura/day (5 posts - 10 decay)

Bonus Aura:
- Engagement: +1-5 Aura per interaction (like/comment/share)
- Opinion Wins: +% of bet amount as Aura
- Creator Share Holdings: +2% of holdings as daily Aura
- Campaign Rewards: Variable by campaign
```

### 3.2 Aura Tiers

| Tier | Name | Aura Range | Reach Multiplier | Features |
|------|------|------------|------------------|----------|
| 1 | Lurker | 0-99 | 1.0x | Limited reach, no Opinions, read-only |
| 2 | Active | 100-499 | 1.5x | Normal features, can create Opinions |
| 3 | Influencer | 500-999 | 2.0x | Enhanced reach, priority in feeds |
| 4 | Leader | 1000-2499 | 3.0x | High visibility, campaign priority |
| 5 | Legend | 2500+ | 5.0x | Maximum reach, premium features |

### 3.3 Content Type Restructuring

#### **Posts (Aura Farming)**
- Purpose: Farm Aura through quality content
- Limit: 5 posts per day
- Reward: +10 Aura per post
- Engagement bonus: Additional Aura from likes/comments/shares
- Reach: Determined by author's Aura tier

#### **Opinions (Aura Betting)**
- Purpose: Prediction markets with betting
- Requirement: Minimum Aura threshold (configurable, default 100)
- Betting: Users bet Aura or USDC on outcomes
- Resolution: Creator resolves the opinion
- Payouts: Winners split pool (minus platform fee)
- Visibility: Weighted by total bet amount + author Aura

### 3.4 Campaign System

**Purpose**: Allow projects to work with quality creators

**Features:**
- Projects create campaigns with:
  - Minimum Aura requirement (e.g., 500 Aura)
  - Reward pool (USDC)
  - Duration (start/end dates)
  - Content requirements
- Only users meeting Aura threshold can participate
- Rewards distributed based on performance + Aura weight
- Ensures high-quality creator participation

**Why Projects Will Use This:**
- Quality over quantity (10 high-Aura creators > 10,000 low-Aura users)
- Better ROI on marketing spend
- Content from high-Aura users reaches wider audience
- Built-in quality filter

### 3.5 Messaging Access Gates

**Current Problem**: Open DMs = spam
**Solution**: Aura or Creator Share requirements

**Access Rules:**
```
User can message if:
1. Has minimum Aura threshold (set by recipient, e.g., 200 Aura)
   OR
2. Holds Creator Shares of the recipient
   OR
3. Already in an existing conversation
   OR
4. Mutual follows + both have 100+ Aura
```

**Benefits:**
- Reduces spam
- Creates value for Aura accumulation
- Monetization opportunity (buy Creator Shares to DM)
- Protects high-profile users

### 3.6 Creator Share Integration

**Modified Revenue Split:**
```
Post earnings (from Post Tokens):
- 40% → Creator (direct)
- 10-30% → Creator Share holders (min 10%, configurable by creator)
- 30-50% → Reward pool (for future distribution)
- 10% → Platform fee

Creator Share Holder Benefits:
1. Earnings percentage (10-30% of post revenue)
2. +2% of holdings value as daily Aura boost
3. Priority access to creator's content
4. Discount on creator's Opinion bets (optional)
5. Direct messaging access
```

**Example:**
- User holds 100 Creator Shares of @creator
- @creator sets 15% revenue share
- @creator's post earns 1000 USDC
- Share holder receives: (100 shares / total shares) × 150 USDC
- Share holder gets +2 Aura daily (2% of 100 shares)

---

## 4. Database Schema Changes

### 4.1 New Tables

#### **aura_balances**
Tracks each user's current Aura balance and tier.

```sql
CREATE TABLE aura_balances (
  user_id UUID PRIMARY KEY,
  balance INTEGER NOT NULL DEFAULT 100,
  tier INTEGER NOT NULL DEFAULT 2,
  last_decay_at TIMESTAMP NOT NULL DEFAULT NOW(),
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_aura_balances_tier ON aura_balances(tier);
CREATE INDEX idx_aura_balances_balance ON aura_balances(balance DESC);
CREATE INDEX idx_aura_balances_last_decay ON aura_balances(last_decay_at);
```

#### **aura_transactions**
Complete history of all Aura movements.

```sql
CREATE TABLE aura_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  source_id UUID,
  source_type VARCHAR(50),
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_aura_transactions_user ON aura_transactions(user_id, created_at DESC);
CREATE INDEX idx_aura_transactions_type ON aura_transactions(transaction_type);
CREATE INDEX idx_aura_transactions_source ON aura_transactions(source_id, source_type);

-- Transaction types:
-- 'post_creation', 'daily_decay', 'engagement_bonus',
-- 'opinion_bet', 'opinion_win', 'opinion_loss',
-- 'campaign_reward', 'creator_share_bonus',
-- 'boost_spend', 'message_unlock'
```

#### **opinions**
Prediction market posts where users can bet on outcomes.

```sql
CREATE TABLE opinions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  minimum_aura_to_bet INTEGER NOT NULL DEFAULT 50,
  minimum_bet_amount INTEGER NOT NULL DEFAULT 10,
  resolution_time TIMESTAMP,
  resolved_at TIMESTAMP,
  resolved_option_id VARCHAR(50),
  total_bet_amount_aura INTEGER NOT NULL DEFAULT 0,
  total_bet_amount_usdc DECIMAL(20, 6) NOT NULL DEFAULT 0,
  total_bets INTEGER NOT NULL DEFAULT 0,
  platform_fee_percentage INTEGER NOT NULL DEFAULT 5,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_opinions_user ON opinions(user_id);
CREATE INDEX idx_opinions_status ON opinions(status);
CREATE INDEX idx_opinions_created ON opinions(created_at DESC);
CREATE INDEX idx_opinions_resolution ON opinions(resolution_time);

-- Status: 'active', 'resolved', 'cancelled'
-- Options format: [
--   { id: 'option_1', text: 'Yes', total_aura: 0, total_usdc: 0, bet_count: 0 },
--   { id: 'option_2', text: 'No', total_aura: 0, total_usdc: 0, bet_count: 0 }
-- ]
```

#### **opinion_bets**
Individual bets placed on opinions.

```sql
CREATE TABLE opinion_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opinion_id UUID NOT NULL,
  user_id UUID NOT NULL,
  option_id VARCHAR(50) NOT NULL,
  bet_amount INTEGER NOT NULL,
  bet_currency VARCHAR(10) NOT NULL,
  potential_payout DECIMAL(20, 6),
  actual_payout DECIMAL(20, 6),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP,
  FOREIGN KEY (opinion_id) REFERENCES opinions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_opinion_bets_opinion ON opinion_bets(opinion_id);
CREATE INDEX idx_opinion_bets_user ON opinion_bets(user_id, created_at DESC);
CREATE INDEX idx_opinion_bets_status ON opinion_bets(status);

-- bet_currency: 'aura' or 'usdc'
-- status: 'pending', 'won', 'lost', 'refunded'
```

#### **daily_post_limits**
Tracks daily post counts to enforce 5 post/day limit.

```sql
CREATE TABLE daily_post_limits (
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  post_count INTEGER NOT NULL DEFAULT 0,
  opinion_count INTEGER NOT NULL DEFAULT 0,
  last_post_at TIMESTAMP,
  PRIMARY KEY (user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_daily_post_limits_date ON daily_post_limits(date);
```

#### **campaigns**
Project campaigns with Aura-gated participation.

```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_user_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  media_url TEXT,
  minimum_aura INTEGER NOT NULL,
  reward_pool_usdc DECIMAL(20, 6) NOT NULL DEFAULT 0,
  reward_pool_aura INTEGER NOT NULL DEFAULT 0,
  max_participants INTEGER,
  current_participants INTEGER NOT NULL DEFAULT 0,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  content_requirements JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (creator_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_dates ON campaigns(start_date, end_date);
CREATE INDEX idx_campaigns_min_aura ON campaigns(minimum_aura);

-- status: 'draft', 'active', 'ended', 'cancelled'
-- content_requirements: { post_count: 3, include_hashtags: ['#campaign'] }
```

#### **campaign_participants**
Tracks users participating in campaigns.

```sql
CREATE TABLE campaign_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL,
  user_id UUID NOT NULL,
  aura_at_join INTEGER NOT NULL,
  posts_created INTEGER NOT NULL DEFAULT 0,
  total_engagement INTEGER NOT NULL DEFAULT 0,
  reward_earned_usdc DECIMAL(20, 6) NOT NULL DEFAULT 0,
  reward_earned_aura INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (campaign_id, user_id)
);

CREATE INDEX idx_campaign_participants_campaign ON campaign_participants(campaign_id);
CREATE INDEX idx_campaign_participants_user ON campaign_participants(user_id);

-- status: 'active', 'completed', 'disqualified'
```

#### **campaign_posts**
Links posts to campaigns for tracking.

```sql
CREATE TABLE campaign_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL,
  participant_id UUID NOT NULL,
  post_id UUID NOT NULL,
  engagement_score INTEGER NOT NULL DEFAULT 0,
  meets_requirements BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (participant_id) REFERENCES campaign_participants(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  UNIQUE (campaign_id, post_id)
);

CREATE INDEX idx_campaign_posts_campaign ON campaign_posts(campaign_id);
CREATE INDEX idx_campaign_posts_participant ON campaign_posts(participant_id);
```

#### **message_access_requirements**
User-configured requirements for receiving DMs.

```sql
CREATE TABLE message_access_requirements (
  user_id UUID PRIMARY KEY,
  minimum_aura INTEGER,
  requires_creator_share BOOLEAN NOT NULL DEFAULT false,
  requires_mutual_follow BOOLEAN NOT NULL DEFAULT false,
  allow_verified_only BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 4.2 Modified Existing Tables

#### **posts**
Add fields to support content types and Aura mechanics.

```sql
-- Add new columns to posts table
ALTER TABLE posts ADD COLUMN content_type VARCHAR(20) DEFAULT 'post';
ALTER TABLE posts ADD COLUMN opinion_id UUID REFERENCES opinions(id);
ALTER TABLE posts ADD COLUMN aura_reward_given BOOLEAN DEFAULT false;
ALTER TABLE posts ADD COLUMN aura_boost_spent INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN reach_multiplier DECIMAL(5, 2) DEFAULT 1.0;
ALTER TABLE posts ADD COLUMN campaign_id UUID REFERENCES campaigns(id);

CREATE INDEX idx_posts_content_type ON posts(content_type);
CREATE INDEX idx_posts_opinion ON posts(opinion_id);
CREATE INDEX idx_posts_campaign ON posts(campaign_id);

-- content_type: 'post' or 'opinion'
```

#### **users**
Add Aura-related tracking fields.

```sql
-- Add new columns to users table
ALTER TABLE users ADD COLUMN current_aura_tier INTEGER DEFAULT 2;
ALTER TABLE users ADD COLUMN daily_post_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN last_post_reset_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE users ADD COLUMN can_create_opinions BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN message_access_aura INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN total_opinions_created INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN total_bets_placed INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN total_bets_won INTEGER DEFAULT 0;

CREATE INDEX idx_users_aura_tier ON users(current_aura_tier);
```

### 4.3 Database Views

#### **aura_leaderboard**
Real-time leaderboard of top Aura holders.

```sql
CREATE VIEW aura_leaderboard AS
SELECT
  u.id,
  u.username,
  u.avatar_url,
  ab.balance as aura_balance,
  ab.tier as aura_tier,
  ab.total_earned,
  ab.total_spent,
  u.follower_count,
  RANK() OVER (ORDER BY ab.balance DESC) as rank
FROM users u
JOIN aura_balances ab ON u.id = ab.user_id
WHERE ab.balance > 0
ORDER BY ab.balance DESC;
```

#### **user_aura_stats**
Comprehensive Aura statistics per user.

```sql
CREATE VIEW user_aura_stats AS
SELECT
  u.id,
  u.username,
  ab.balance as current_aura,
  ab.tier,
  ab.total_earned,
  ab.total_spent,
  COUNT(DISTINCT p.id) as total_posts,
  COUNT(DISTINCT o.id) as total_opinions,
  COUNT(DISTINCT ob.id) as total_bets,
  COUNT(DISTINCT CASE WHEN ob.status = 'won' THEN ob.id END) as bets_won,
  COUNT(DISTINCT cp.id) as campaigns_participated
FROM users u
LEFT JOIN aura_balances ab ON u.id = ab.user_id
LEFT JOIN posts p ON u.id = p.user_id AND p.content_type = 'post'
LEFT JOIN opinions o ON u.id = o.user_id
LEFT JOIN opinion_bets ob ON u.id = ob.user_id
LEFT JOIN campaign_participants cp ON u.id = cp.user_id
GROUP BY u.id, u.username, ab.balance, ab.tier, ab.total_earned, ab.total_spent;
```

#### **active_campaigns**
Currently active campaigns with participant info.

```sql
CREATE VIEW active_campaigns AS
SELECT
  c.*,
  u.username as creator_username,
  u.avatar_url as creator_avatar,
  COUNT(cp.id) as participant_count,
  AVG(cp.aura_at_join) as avg_participant_aura,
  SUM(cp.posts_created) as total_posts_created
FROM campaigns c
JOIN users u ON c.creator_user_id = u.id
LEFT JOIN campaign_participants cp ON c.id = cp.campaign_id
WHERE c.status = 'active'
  AND c.start_date <= NOW()
  AND c.end_date > NOW()
GROUP BY c.id, u.username, u.avatar_url;
```

---

## 5. API Endpoints

### 5.1 Aura Management

**Base path:** `/api/aura`

#### **GET /aura/:userId**
Get user's current Aura balance and statistics.

**Response:**
```json
{
  "userId": "uuid",
  "balance": 450,
  "tier": 2,
  "tierName": "Active",
  "reachMultiplier": 1.5,
  "totalEarned": 1200,
  "totalSpent": 750,
  "lastDecayAt": "2024-01-15T10:00:00Z",
  "nextDecayAt": "2024-01-16T10:00:00Z",
  "dailyPostsRemaining": 3,
  "canCreateOpinions": true
}
```

#### **GET /aura/:userId/transactions**
Get user's Aura transaction history.

**Query params:**
- `limit` (default: 50)
- `offset` (default: 0)
- `type` (filter by transaction type)

**Response:**
```json
{
  "transactions": [
    {
      "id": "uuid",
      "amount": 10,
      "balanceAfter": 450,
      "transactionType": "post_creation",
      "sourceId": "post-uuid",
      "sourceType": "post",
      "createdAt": "2024-01-15T14:30:00Z"
    }
  ],
  "total": 150,
  "hasMore": true
}
```

#### **GET /aura/leaderboard**
Get top Aura holders.

**Query params:**
- `limit` (default: 100)
- `tier` (filter by tier)

**Response:**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "userId": "uuid",
      "username": "top_creator",
      "avatarUrl": "https://...",
      "auraBalance": 5000,
      "tier": 5,
      "tierName": "Legend"
    }
  ]
}
```

#### **POST /aura/process-decay**
Run daily decay for all users (cron job endpoint).

**Auth:** Admin only

**Response:**
```json
{
  "success": true,
  "usersProcessed": 10543,
  "totalAuraDecayed": 105430,
  "executionTime": "2.3s"
}
```

### 5.2 Posts (Modified)

**Base path:** `/api/posts`

#### **POST /posts**
Create a new post (with daily limit check and Aura reward).

**Request:**
```json
{
  "userId": "uuid",
  "content": "Post content",
  "mediaUrl": "https://...",
  "contentType": "post",
  "mentions": ["@username"],
  "campaignId": "uuid" // optional
}
```

**Response:**
```json
{
  "success": true,
  "post": { /* post object */ },
  "auraReward": 10,
  "newAuraBalance": 460,
  "dailyPostsRemaining": 2,
  "reachMultiplier": 1.5
}
```

**Errors:**
- `400`: Daily post limit reached (5 posts)
- `400`: User has negative Aura balance

#### **GET /posts/feed**
Get Aura-weighted feed.

**Query params:**
- `userId` (for personalization)
- `limit` (default: 20)
- `offset` (default: 0)

**Algorithm:** Posts sorted by:
```
score = (engagement * 0.3) + (authorAura * 0.4) + (recency * 0.2) + (userHistory * 0.1)
score = score * authorReachMultiplier
```

#### **POST /posts/:postId/boost**
Spend Aura to boost post reach.

**Request:**
```json
{
  "userId": "uuid",
  "auraAmount": 50
}
```

**Response:**
```json
{
  "success": true,
  "newReachMultiplier": 2.5,
  "auraSpent": 50,
  "newAuraBalance": 400,
  "boostDuration": "24h"
}
```

### 5.3 Opinions

**Base path:** `/api/opinions`

#### **POST /opinions**
Create a new opinion (requires minimum Aura).

**Request:**
```json
{
  "userId": "uuid",
  "content": "Opinion content/context",
  "mediaUrl": "https://...",
  "question": "Will BTC reach $100k by end of 2024?",
  "options": [
    { "id": "yes", "text": "Yes" },
    { "id": "no", "text": "No" }
  ],
  "minimumAuraToBet": 50,
  "minimumBetAmount": 10,
  "resolutionTime": "2024-12-31T23:59:59Z",
  "platformFeePercentage": 5
}
```

**Response:**
```json
{
  "success": true,
  "opinion": {
    "id": "uuid",
    "userId": "uuid",
    "question": "...",
    "options": [...],
    "status": "active",
    "createdAt": "2024-01-15T15:00:00Z"
  }
}
```

**Errors:**
- `403`: Insufficient Aura (requires minimum 100)
- `400`: Invalid options format

#### **GET /opinions**
Get opinion feed.

**Query params:**
- `limit` (default: 20)
- `status` (active, resolved)
- `sortBy` (trending, new, ending_soon)

**Response:**
```json
{
  "opinions": [
    {
      "id": "uuid",
      "author": {
        "userId": "uuid",
        "username": "predictor",
        "avatarUrl": "https://...",
        "auraTier": 3
      },
      "question": "...",
      "options": [
        {
          "id": "yes",
          "text": "Yes",
          "totalBets": 150,
          "totalAura": 5000,
          "totalUsdc": 250.50,
          "percentage": 45.5
        }
      ],
      "totalBets": 300,
      "resolutionTime": "2024-12-31T23:59:59Z",
      "status": "active"
    }
  ]
}
```

#### **POST /opinions/:opinionId/bet**
Place a bet on an opinion.

**Request:**
```json
{
  "userId": "uuid",
  "optionId": "yes",
  "betAmount": 100,
  "betCurrency": "aura"
}
```

**Response:**
```json
{
  "success": true,
  "bet": {
    "id": "uuid",
    "opinionId": "uuid",
    "optionId": "yes",
    "betAmount": 100,
    "betCurrency": "aura",
    "potentialPayout": 180.5,
    "currentOdds": 1.805,
    "status": "pending"
  },
  "newAuraBalance": 350
}
```

**Errors:**
- `403`: Insufficient Aura for bet
- `403`: User Aura below minimum threshold
- `400`: Opinion already resolved

#### **POST /opinions/:opinionId/resolve**
Resolve an opinion (creator only).

**Request:**
```json
{
  "userId": "uuid",
  "resolvedOptionId": "yes",
  "resolution": "BTC reached $102,000 on Dec 15, 2024"
}
```

**Response:**
```json
{
  "success": true,
  "opinion": {
    "id": "uuid",
    "status": "resolved",
    "resolvedOptionId": "yes",
    "resolvedAt": "2024-12-31T18:00:00Z"
  },
  "payouts": {
    "totalWinners": 145,
    "totalPaidOut": 8500,
    "platformFee": 450
  }
}
```

#### **GET /opinions/:opinionId/bets**
Get all bets for an opinion.

**Query params:**
- `userId` (filter by user)
- `optionId` (filter by option)

#### **GET /opinions/user/:userId**
Get user's created opinions.

### 5.4 Campaigns

**Base path:** `/api/campaigns`

#### **POST /campaigns**
Create a new campaign.

**Request:**
```json
{
  "creatorUserId": "uuid",
  "title": "Launch Campaign for ProjectX",
  "description": "Create content about our new product",
  "mediaUrl": "https://...",
  "minimumAura": 500,
  "rewardPoolUsdc": 5000,
  "rewardPoolAura": 10000,
  "maxParticipants": 50,
  "startDate": "2024-02-01T00:00:00Z",
  "endDate": "2024-02-28T23:59:59Z",
  "contentRequirements": {
    "minPosts": 3,
    "hashtags": ["#ProjectX"],
    "mentions": ["@ProjectX"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "campaign": {
    "id": "uuid",
    "status": "draft",
    "createdAt": "2024-01-15T16:00:00Z"
  }
}
```

#### **GET /campaigns**
List campaigns.

**Query params:**
- `status` (active, ended, draft)
- `minAura` (filter by minimum Aura)
- `limit`, `offset`

**Response:**
```json
{
  "campaigns": [
    {
      "id": "uuid",
      "title": "Launch Campaign for ProjectX",
      "creator": {
        "userId": "uuid",
        "username": "projectx",
        "avatarUrl": "https://..."
      },
      "minimumAura": 500,
      "rewardPoolUsdc": 5000,
      "currentParticipants": 35,
      "maxParticipants": 50,
      "startDate": "2024-02-01T00:00:00Z",
      "endDate": "2024-02-28T23:59:59Z",
      "status": "active"
    }
  ]
}
```

#### **POST /campaigns/:campaignId/join**
Join a campaign.

**Request:**
```json
{
  "userId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "participant": {
    "id": "uuid",
    "campaignId": "uuid",
    "userId": "uuid",
    "auraAtJoin": 750,
    "joinedAt": "2024-02-02T10:00:00Z"
  }
}
```

**Errors:**
- `403`: Insufficient Aura (below campaign minimum)
- `400`: Campaign is full
- `400`: Campaign not active

#### **GET /campaigns/:campaignId/participants**
Get campaign participants and leaderboard.

**Response:**
```json
{
  "participants": [
    {
      "userId": "uuid",
      "username": "creator1",
      "avatarUrl": "https://...",
      "auraAtJoin": 750,
      "postsCreated": 5,
      "totalEngagement": 5000,
      "rewardEarned": 250.50,
      "rank": 1
    }
  ]
}
```

#### **POST /campaigns/:campaignId/distribute-rewards**
Distribute campaign rewards (creator only).

**Request:**
```json
{
  "creatorUserId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "distributed": {
    "totalParticipants": 35,
    "totalUsdcDistributed": 4500,
    "totalAuraDistributed": 9000,
    "topPerformer": {
      "userId": "uuid",
      "username": "creator1",
      "reward": 450.50
    }
  }
}
```

### 5.5 Messaging (Modified)

**Base path:** `/api/messages`

#### **POST /messages/check-access**
Check if user can send message to recipient.

**Request:**
```json
{
  "senderId": "uuid",
  "recipientId": "uuid"
}
```

**Response:**
```json
{
  "canMessage": true,
  "reason": "has_creator_shares",
  "details": {
    "senderAura": 350,
    "requiredAura": 200,
    "hasCreatorShares": true,
    "mutualFollow": true
  }
}
```

**Possible reasons:**
- `sufficient_aura`: Sender has enough Aura
- `has_creator_shares`: Sender holds recipient's Creator Shares
- `mutual_follow`: Both users follow each other with 100+ Aura
- `existing_conversation`: Already in conversation
- `blocked`: Sender doesn't meet requirements

#### **POST /messages/unlock-access**
Spend Aura to unlock messaging with a user.

**Request:**
```json
{
  "senderId": "uuid",
  "recipientId": "uuid",
  "auraAmount": 50
}
```

**Response:**
```json
{
  "success": true,
  "unlocked": true,
  "auraSpent": 50,
  "newAuraBalance": 300,
  "expiresAt": "2024-01-22T16:00:00Z"
}
```

---

## 6. Frontend Components

### 6.1 New Component Structure

```
/app/components/
├── Aura/
│   ├── AuraBalance.tsx              # Display user's Aura with tier badge
│   ├── AuraBalanceCard.tsx          # Detailed Aura card with stats
│   ├── AuraTransactionHistory.tsx   # List of Aura transactions
│   ├── AuraLeaderboard.tsx          # Top Aura holders
│   ├── AuraBoostButton.tsx          # Boost post reach with Aura
│   ├── AuraTierBadge.tsx            # Visual tier indicator
│   ├── AuraProgressBar.tsx          # Progress to next tier
│   └── DailyPostLimitIndicator.tsx  # Show posts remaining
│
├── Opinion/
│   ├── OpinionComposer.tsx          # Create new opinion
│   ├── OpinionCard.tsx              # Display opinion with betting UI
│   ├── BettingInterface.tsx         # Place bets (Aura/USDC)
│   ├── OpinionResults.tsx           # Show resolved results
│   ├── MyBets.tsx                   # User's active bets
│   ├── OpinionFeed.tsx              # Feed of opinions
│   └── OpinionStats.tsx             # Statistics dashboard
│
├── Campaign/
│   ├── CampaignBrowser.tsx          # Browse all campaigns
│   ├── CampaignCard.tsx             # Campaign display card
│   ├── CampaignDetails.tsx          # Detailed campaign view
│   ├── CampaignParticipation.tsx    # Join/participate UI
│   ├── CampaignCreator.tsx          # Create new campaign
│   ├── CampaignLeaderboard.tsx      # Campaign participant rankings
│   └── MyCampaigns.tsx              # User's campaigns
│
├── Messaging/
│   ├── MessageAccessGate.tsx        # Show unlock requirements
│   ├── UnlockMessageButton.tsx      # Unlock DM with Aura
│   └── AccessRequirementsBadge.tsx  # Display user's requirements
│
└── Post/
    ├── ContentTypeSelector.tsx      # Post vs Opinion selector
    ├── PostComposerEnhanced.tsx     # Enhanced composer with Aura info
    └── ReachIndicator.tsx           # Show expected reach
```

### 6.2 Key Component Designs

#### **AuraBalance.tsx**
```tsx
interface AuraBalanceProps {
  userId: string;
  compact?: boolean;
}

// Displays:
// - Current Aura balance with animated counter
// - Tier badge with color coding
// - Reach multiplier (e.g., "2.0x reach")
// - Next tier progress bar
// - Quick stats: earned today, spent today
```

#### **OpinionCard.tsx**
```tsx
interface OpinionCardProps {
  opinion: Opinion;
  onBet: (optionId: string, amount: number, currency: 'aura' | 'usdc') => void;
  showResults?: boolean;
}

// Displays:
// - Question and context
// - Options with current odds
// - Total pool size (Aura + USDC)
// - Resolution time countdown
// - Betting interface
// - User's current bets (if any)
// - Results (if resolved)
```

#### **CampaignCard.tsx**
```tsx
interface CampaignCardProps {
  campaign: Campaign;
  userAura: number;
  onJoin: () => void;
}

// Displays:
// - Campaign title and description
// - Minimum Aura requirement (with user's eligibility)
// - Reward pool size
// - Participant count / max
// - Time remaining
// - Join button (disabled if ineligible)
// - Requirements checklist
```

#### **DailyPostLimitIndicator.tsx**
```tsx
interface DailyPostLimitProps {
  postsRemaining: number;
  auraPerPost: number;
}

// Displays:
// - "3 posts remaining today"
// - Progress bar (5 total)
// - Aura potential: "Up to +30 Aura today"
// - Reset countdown
// - Encouragement message
```

---

## 7. Algorithm Design

### 7.1 Aura-Weighted Feed Algorithm

```typescript
interface FeedPost {
  id: string;
  content: string;
  authorId: string;
  authorAura: number;
  authorTier: number;
  createdAt: Date;
  engagement: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
  auraBoost: number;
}

function calculatePostScore(
  post: FeedPost,
  viewerUserId: string,
  viewerInteractionHistory: Map<string, number>
): number {
  // 1. Base engagement score (0-1000)
  const engagementScore = (
    post.engagement.views * 0.1 +
    post.engagement.likes * 1.0 +
    post.engagement.comments * 2.0 +
    post.engagement.shares * 3.0
  );

  // 2. Author Aura score (0-1000)
  const auraScore = post.authorAura;

  // 3. Recency score (0-1000)
  const hoursSincePost = (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60);
  const recencyScore = Math.max(0, 1000 - (hoursSincePost * 10));

  // 4. User interaction history (0-1000)
  const interactionScore = viewerInteractionHistory.get(post.authorId) || 0;

  // 5. Reach multiplier based on author tier
  const reachMultiplier = getTierReachMultiplier(post.authorTier);

  // 6. Aura boost (additional multiplier)
  const boostMultiplier = 1 + (post.auraBoost / 100);

  // Combined score
  const baseScore = (
    engagementScore * 0.3 +
    auraScore * 0.4 +
    recencyScore * 0.2 +
    interactionScore * 0.1
  );

  return baseScore * reachMultiplier * boostMultiplier;
}

function getTierReachMultiplier(tier: number): number {
  const multipliers = {
    1: 1.0,   // Lurker
    2: 1.5,   // Active
    3: 2.0,   // Influencer
    4: 3.0,   // Leader
    5: 5.0    // Legend
  };
  return multipliers[tier] || 1.0;
}

// Feed generation
function generateFeed(
  allPosts: FeedPost[],
  viewerUserId: string,
  limit: number = 20
): FeedPost[] {
  const viewerInteractions = getUserInteractionHistory(viewerUserId);

  const scoredPosts = allPosts.map(post => ({
    post,
    score: calculatePostScore(post, viewerUserId, viewerInteractions)
  }));

  // Sort by score and apply diversity filter
  scoredPosts.sort((a, b) => b.score - a.score);

  // Diversity: Don't show more than 2 consecutive posts from same author
  const diversifiedPosts = applyDiversityFilter(scoredPosts);

  return diversifiedPosts.slice(0, limit).map(sp => sp.post);
}
```

### 7.2 Opinion Visibility Algorithm

```typescript
function calculateOpinionScore(opinion: Opinion): number {
  // 1. Total pool value (Aura + USDC equivalent)
  const totalPoolValue = opinion.totalBetAmountAura + (opinion.totalBetAmountUsdc * 100);

  // 2. Author Aura
  const authorAura = opinion.authorAura;

  // 3. Participant count (more bettors = more interesting)
  const participantScore = opinion.totalBets * 10;

  // 4. Time until resolution (urgency factor)
  const hoursUntilResolution = (opinion.resolutionTime.getTime() - Date.now()) / (1000 * 60 * 60);
  const urgencyScore = hoursUntilResolution < 24 ? 500 :
                       hoursUntilResolution < 168 ? 300 : 100;

  // 5. Controversy score (more balanced = more interesting)
  const optionPercentages = opinion.options.map(opt =>
    opt.totalBets / opinion.totalBets
  );
  const controversyScore = 1000 * (1 - Math.max(...optionPercentages));

  return (
    totalPoolValue * 0.3 +
    authorAura * 0.2 +
    participantScore * 0.2 +
    urgencyScore * 0.15 +
    controversyScore * 0.15
  );
}
```

### 7.3 Campaign Reward Distribution Algorithm

```typescript
interface CampaignParticipant {
  userId: string;
  auraAtJoin: number;
  postsCreated: number;
  totalEngagement: number;
  meetsRequirements: boolean;
}

function distributeRewards(
  campaign: Campaign,
  participants: CampaignParticipant[]
): Map<string, number> {
  // Filter qualified participants
  const qualified = participants.filter(p => p.meetsRequirements);

  // Calculate individual scores
  const scores = qualified.map(participant => {
    // 1. Engagement score (40%)
    const engagementScore = participant.totalEngagement;

    // 2. Aura weight (30%) - higher Aura = higher reach
    const auraWeight = participant.auraAtJoin / 1000;

    // 3. Post count (20%)
    const postScore = participant.postsCreated * 100;

    // 4. Consistency (10%) - completed all requirements
    const consistencyScore = 1000;

    const totalScore = (
      engagementScore * 0.4 +
      auraWeight * 0.3 +
      postScore * 0.2 +
      consistencyScore * 0.1
    );

    return {
      userId: participant.userId,
      score: totalScore
    };
  });

  // Calculate total score
  const totalScore = scores.reduce((sum, s) => sum + s.score, 0);

  // Distribute rewards proportionally
  const rewardMap = new Map<string, number>();
  scores.forEach(({ userId, score }) => {
    const rewardShare = (score / totalScore) * campaign.rewardPoolUsdc;
    rewardMap.set(userId, rewardShare);
  });

  return rewardMap;
}
```

### 7.4 Daily Aura Decay Job

```typescript
async function processDailyAuraDecay() {
  const users = await db.query(`
    SELECT user_id, balance, last_decay_at
    FROM aura_balances
    WHERE last_decay_at < NOW() - INTERVAL '1 day'
  `);

  for (const user of users) {
    const daysSinceDecay = Math.floor(
      (Date.now() - user.last_decay_at.getTime()) / (1000 * 60 * 60 * 24)
    );

    const totalDecay = daysSinceDecay * 10;
    const newBalance = Math.max(0, user.balance - totalDecay);

    // Update balance
    await db.query(`
      UPDATE aura_balances
      SET balance = $1,
          tier = $2,
          last_decay_at = NOW()
      WHERE user_id = $3
    `, [newBalance, calculateTier(newBalance), user.user_id]);

    // Record transaction
    await db.query(`
      INSERT INTO aura_transactions (
        user_id, amount, balance_after, transaction_type
      ) VALUES ($1, $2, $3, 'daily_decay')
    `, [user.user_id, -totalDecay, newBalance]);
  }

  return users.length;
}

function calculateTier(auraBalance: number): number {
  if (auraBalance >= 2500) return 5; // Legend
  if (auraBalance >= 1000) return 4; // Leader
  if (auraBalance >= 500) return 3;  // Influencer
  if (auraBalance >= 100) return 2;  // Active
  return 1; // Lurker
}
```

---

## 8. Economic Model

### 8.1 Aura Flow Analysis

#### **Daily Active User (Tier 2 - 300 Aura)**
```
Starting balance: 300 Aura
Daily decay: -10 Aura
Posts (3 per day): +30 Aura
Engagement bonus (avg): +15 Aura
Opinion win (occasional): +20 Aura
Creator share bonus: +5 Aura

Net daily gain: +60 Aura
Monthly growth: +1,800 Aura
```

#### **Moderately Active User (Tier 2 - 250 Aura)**
```
Starting balance: 250 Aura
Daily decay: -10 Aura
Posts (2 per day): +20 Aura
Engagement bonus: +5 Aura

Net daily gain: +15 Aura
Monthly growth: +450 Aura
Reaches Tier 3 (Influencer) in ~17 days
```

#### **Inactive User**
```
Starting balance: 200 Aura
Daily decay: -10 Aura
No posts: 0
No engagement: 0

Net daily loss: -10 Aura
Reaches Tier 1 (Lurker) in 10 days
Reaches 0 Aura in 20 days
```

### 8.2 Aura Sources & Sinks

#### **Sources (Aura Creation):**
```
1. Post creation: +10 Aura per post (max 50/day)
2. Engagement bonus: +1-5 Aura per interaction
3. Opinion wins: +% of bet as Aura
4. Campaign rewards: Variable (50-500 Aura)
5. Creator share holdings: +2% of holdings as daily Aura
6. Welcome bonus: +100 Aura (new users)
7. Referrals: +50 Aura per referral
```

**Daily Aura Creation Estimate:**
- 10,000 users × 2.5 posts average = 25,000 posts
- 25,000 × 10 Aura = 250,000 Aura from posts
- 250,000 × 0.3 engagement bonus = 75,000 Aura from engagement
- **Total: ~325,000 Aura created/day**

#### **Sinks (Aura Destruction):**
```
1. Daily decay: -10 Aura per user per day
2. Lost opinion bets: Variable
3. Post boosts: User-initiated spending
4. Message unlocks: 50-200 Aura per unlock
5. Campaign entry fees: 10-50 Aura (optional)
```

**Daily Aura Destruction Estimate:**
- 10,000 users × 10 Aura = 100,000 Aura from decay
- Opinion losses: ~50,000 Aura
- Post boosts: ~30,000 Aura
- Message unlocks: ~10,000 Aura
- **Total: ~190,000 Aura destroyed/day**

**Net Daily Aura Inflation:**
```
325,000 created - 190,000 destroyed = +135,000 Aura/day
+135,000 / 10,000 users = +13.5 Aura per user per day

This is healthy inflation that rewards active users.
```

### 8.3 Balance Mechanisms

**To prevent runaway inflation:**

1. **Progressive decay:** Users with 1000+ Aura lose -15/day instead of -10
2. **Diminishing returns:** After 3 posts/day, Aura reward drops to +5
3. **Aura caps:** Maximum 10,000 Aura per user (encourages spending)
4. **Deflationary events:** Monthly Aura halvings (reduce all balances by 10%)
5. **Premium sinks:** High-value features that consume large amounts

**To encourage spending:**

1. **Post boost effectiveness:** Boosts are most effective in first 24 hours
2. **Opinion bet multipliers:** Higher bets = higher potential payouts
3. **Campaign bonuses:** Spending Aura on boost before campaign posts = 2x visibility
4. **Leaderboard rewards:** Top Aura spenders get monthly rewards
5. **Status displays:** Show "Spent 5,000 Aura this month" badge

### 8.4 Opinion Betting Economics

#### **Example Opinion:**
```
Question: "Will ETH reach $5000 by end of Q1 2024?"
Options: Yes (60% of bets), No (40% of bets)

Total bets: 10,000 Aura + 500 USDC
Platform fee: 5%

If "Yes" wins:
- Winners (6000 Aura + 300 USDC worth): Split 9500 Aura + 475 USDC
- Average winner bet 100 Aura, gets back 158.33 Aura (58.33% profit)
- Platform takes 500 Aura + 25 USDC

If "No" wins:
- Winners (4000 Aura + 200 USDC worth): Split 9500 Aura + 475 USDC
- Average winner bet 100 Aura, gets back 237.5 Aura (137.5% profit)
- Platform takes 500 Aura + 25 USDC
```

#### **Opinion Creator Incentives:**
```
Creators get 10% of platform fee = 50 Aura + 2.5 USDC
High-quality opinions attract more bets
Popular opinion creators become trusted predictors
Reputation system for opinion accuracy
```

### 8.5 Campaign ROI Analysis

**Example Campaign:**
```
Project: Launch campaign for new DeFi protocol
Budget: $5,000 USDC
Minimum Aura: 500 (Tier 3 - Influencers)
Max participants: 50
Requirements: 3 posts minimum with #hashtag

Campaign results:
- 45 participants (avg Aura: 750)
- Reach multiplier: 2.0x average
- Total posts created: 135
- Total engagement: 450,000 (views, likes, comments, shares)
- Average engagement per post: 3,333

Reward distribution:
- Top 10 performers: $200 each = $2,000
- Next 20 performers: $100 each = $2,000
- Remaining 15: $66 each = $1,000
- Total distributed: $5,000

ROI calculation:
- Cost per post: $37
- Cost per engagement: $0.011
- Compared to traditional ads: 3-5x cheaper
- Quality creators: 100% (all met minimum Aura)
```

---

## 9. Implementation Phases

### Phase 1: Foundation (Weeks 1-2)

#### **Goals:**
- Set up Aura infrastructure
- Implement daily decay
- Basic Aura transaction system

#### **Tasks:**
1. Database migrations for Aura tables
2. Aura balance service (create, update, get)
3. Daily decay cron job
4. Aura transaction recording
5. Tier calculation logic
6. API endpoints: `/aura/*`
7. Basic Aura display in UI
8. Migration script for existing users

#### **Deliverables:**
- ✅ Users have Aura balances
- ✅ Daily decay runs automatically
- ✅ Transaction history tracked
- ✅ API fully functional
- ✅ Basic UI showing Aura

---

### Phase 2: Content Types (Weeks 3-4)

#### **Goals:**
- Implement Post/Opinion distinction
- Daily post limits
- Aura rewards for posts

#### **Tasks:**
1. Modify posts table schema
2. Implement daily post limit checks
3. Post creation rewards Aura
4. Content type selector in composer
5. Opinion data structure
6. Opinion creation UI
7. Opinion feed
8. Modified feed algorithm (Aura-weighted)

#### **Deliverables:**
- ✅ Users can create posts (max 5/day)
- ✅ Posts grant +10 Aura
- ✅ Opinion structure in place
- ✅ Feed shows Aura-weighted content
- ✅ UI shows post limits and Aura rewards

---

### Phase 3: Opinion Betting (Weeks 5-6)

#### **Goals:**
- Full opinion betting system
- Bet placement and resolution
- Payout distribution

#### **Tasks:**
1. Opinion betting UI/UX
2. Bet placement logic (Aura + USDC)
3. Opinion resolution system
4. Payout calculation
5. Winner distribution
6. Opinion statistics
7. My Bets dashboard
8. Opinion leaderboard

#### **Deliverables:**
- ✅ Users can create opinions
- ✅ Users can bet Aura/USDC
- ✅ Creators can resolve opinions
- ✅ Winners receive payouts
- ✅ Full opinion marketplace

---

### Phase 4: Campaigns (Weeks 7-8)

#### **Goals:**
- Campaign creation and participation
- Aura-gated access
- Reward distribution

#### **Tasks:**
1. Campaign database schema
2. Campaign creation UI
3. Campaign browser/discovery
4. Aura eligibility checks
5. Campaign participation tracking
6. Post-campaign linking
7. Reward distribution algorithm
8. Campaign analytics

#### **Deliverables:**
- ✅ Projects can create campaigns
- ✅ Users can join (if eligible)
- ✅ Posts link to campaigns
- ✅ Automated reward distribution
- ✅ Campaign leaderboards

---

### Phase 5: Access Control (Weeks 9-10)

#### **Goals:**
- Messaging access gates
- Aura unlock system
- Post boost mechanics

#### **Tasks:**
1. Message access requirements table
2. Access check logic
3. Aura unlock for messaging
4. Creator share unlock integration
5. Post boost implementation
6. Boost UI/UX
7. Access gate UI
8. Settings for users to configure

#### **Deliverables:**
- ✅ Messaging requires Aura or shares
- ✅ Users can unlock DMs with Aura
- ✅ Posts can be boosted for reach
- ✅ User-configurable access rules

---

### Phase 6: Polish & Optimization (Weeks 11-12)

#### **Goals:**
- Fine-tune algorithms
- Balance economy
- Improve UX

#### **Tasks:**
1. Algorithm optimization (A/B testing)
2. Economic model balancing
3. UI/UX improvements
4. Analytics dashboard
5. Aura leaderboard enhancements
6. Anti-gaming measures
7. Performance optimization
8. Documentation

#### **Deliverables:**
- ✅ Balanced Aura economy
- ✅ Optimized feed algorithms
- ✅ Polished UI/UX
- ✅ Comprehensive analytics
- ✅ Anti-spam measures

---

## 10. Architecture Diagrams

### 10.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Web App    │  │  Mobile App  │  │   API SDK    │          │
│  │  (Next.js)   │  │  (React      │  │  (TypeScript)│          │
│  │              │  │   Native)    │  │              │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                  │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   API GATEWAY   │
                    │   (REST API)    │
                    │   Base Sepolia  │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼─────┐    ┌─────────▼────────┐   ┌──────▼──────┐
│   Aura      │    │   Content        │   │  Campaign   │
│   Service   │    │   Service        │   │  Service    │
│             │    │                  │   │             │
│ - Balance   │    │ - Posts          │   │ - Creation  │
│   CRUD      │    │ - Opinions       │   │ - Join      │
│ - Decay     │    │ - Feed Algo      │   │ - Track     │
│ - Trans     │    │ - Daily Limit    │   │ - Rewards   │
│ - Tiers     │    │ - Engagement     │   │ - Analytics │
└─────┬───────┘    └─────────┬────────┘   └──────┬──────┘
      │                      │                    │
      └──────────────────────┼────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   PostgreSQL    │
                    │   Database      │
                    │                 │
                    │ - users         │
                    │ - aura_*        │
                    │ - opinions      │
                    │ - campaigns     │
                    │ - posts         │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼─────┐    ┌─────────▼────────┐   ┌──────▼──────┐
│   Smart     │    │   GCS Storage    │   │   Cron      │
│   Contracts │    │                  │   │   Jobs      │
│  (Base)     │    │ - Images         │   │             │
│             │    │ - Videos         │   │ - Decay     │
│ - Post      │    │ - Media          │   │   (daily)   │
│   Tokens    │    │                  │   │ - Cleanup   │
│ - USDC      │    │                  │   │ - Stats     │
└─────────────┘    └──────────────────┘   └─────────────┘
```

### 10.2 Aura Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       AURA ECONOMY FLOW                          │
└─────────────────────────────────────────────────────────────────┘

USER ACTIONS                    AURA BALANCE                SYSTEM
─────────────                   ────────────                ──────

Create Post
    │                          ┌──────────┐
    ├───────(+10 Aura)───────>│  User    │
    │                          │ Balance  │
Get Likes/Comments             │          │
    │                          │  450     │
    ├───────(+1-5 Aura)──────>│  Aura    │
    │                          └────┬─────┘
Win Opinion Bet                     │
    │                               │
    ├───────(+% of bet)────────────>│
    │                               │
Daily Activity                      │<───(-10 Aura)───── Daily Decay
                                    │                    (Cron Job)
Spend on Boost                      │
    │                               │
    └───────(-50 Aura)─────────────>│
                                    │
Bet on Opinion                      │
    │                               │
    └───────(-100 Aura)────────────>│
                                    │
                                    ▼
                            ┌───────────────┐
                            │  TIER UPDATE  │
                            │               │
                            │  Tier 2 (1.5x)│
                            └───────────────┘
                                    │
                                    ▼
                            ┌───────────────┐
                            │  REACH MULTI  │
                            │   APPLIED     │
                            └───────────────┘
```

### 10.3 Content Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONTENT CREATION FLOW                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Composer   │
│     UI       │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│  Content Type?   │
└──────┬───────────┘
       │
       ├─────────────────────────────┐
       │                             │
       ▼                             ▼
┌──────────────┐            ┌──────────────┐
│    POST      │            │   OPINION    │
└──────┬───────┘            └──────┬───────┘
       │                           │
       ▼                           ▼
┌──────────────────┐      ┌──────────────────┐
│ Check Daily      │      │ Check Min Aura   │
│ Limit (5 posts)  │      │ Requirement      │
└──────┬───────────┘      └──────┬───────────┘
       │                         │
       ├─────[Limit OK]          ├─────[Aura OK]
       │                         │
       ▼                         ▼
┌──────────────────┐      ┌──────────────────┐
│ Create Post      │      │ Create Opinion   │
│ in Database      │      │ + Betting Pool   │
└──────┬───────────┘      └──────┬───────────┘
       │                         │
       ▼                         ▼
┌──────────────────┐      ┌──────────────────┐
│ Award +10 Aura   │      │ Open for Bets    │
└──────┬───────────┘      └──────┬───────────┘
       │                         │
       ▼                         │
┌──────────────────┐            │
│ Update Daily     │            │
│ Post Count       │            │
└──────┬───────────┘            │
       │                         │
       └─────────┬───────────────┘
                 │
                 ▼
         ┌──────────────────┐
         │  Add to Feed     │
         │  (Aura-Weighted) │
         └──────┬───────────┘
                │
                ▼
         ┌──────────────────┐
         │  Notify          │
         │  Followers       │
         └──────────────────┘
```

### 10.4 Campaign Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      CAMPAIGN LIFECYCLE                          │
└─────────────────────────────────────────────────────────────────┘

PROJECT/BRAND                    PLATFORM                    CREATORS
─────────────                    ────────                    ────────

Create Campaign
  │
  ├─ Set Min Aura (500)
  ├─ Set Reward Pool ($5k)
  ├─ Set Requirements
  │
  ▼
┌────────────────┐
│ Campaign Live  │────────────[Discovery]─────────> Browse Campaigns
└────────┬───────┘                                        │
         │                                                │
         │                                        ┌───────▼────────┐
         │                                        │ Check Aura:    │
         │                                        │ User: 750      │
         │                                        │ Required: 500  │
         │                                        │ ✅ Eligible     │
         │                                        └───────┬────────┘
         │                                                │
         │<───────────────[Join Campaign]────────────────┘
         │
         ▼
┌─────────────────┐
│ Track Posts     │<─────────[Create Posts]──────── Create Content
│ & Engagement    │                                  (3 posts min)
└────────┬────────┘
         │
         │ (Campaign ends)
         │
         ▼
┌─────────────────┐
│ Calculate       │
│ Performance     │
│ Scores          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Distribute      │────────[Rewards Sent]─────────> Receive Rewards
│ Rewards         │                                  Based on Score
└─────────────────┘
```

### 10.5 Database Relationship Diagram

```
┌──────────────┐
│    users     │
└──────┬───────┘
       │ 1
       │
       │ 1:1
       ├─────────────────────────────────────────────┐
       │                                             │
       ▼                                             ▼
┌──────────────────┐                        ┌──────────────────┐
│  aura_balances   │                        │ message_access_  │
│                  │                        │  requirements    │
│ - balance        │                        │                  │
│ - tier           │                        │ - minimum_aura   │
│ - last_decay_at  │                        └──────────────────┘
└──────┬───────────┘
       │ 1
       │
       │ 1:N
       ▼
┌──────────────────────┐
│ aura_transactions    │
│                      │
│ - user_id            │
│ - amount             │
│ - transaction_type   │
│ - source_id          │
└──────────────────────┘


┌──────────────┐
│    posts     │
└──────┬───────┘
       │
       ├─────────────────┐
       │                 │
       │ 1:1 (optional)  │
       ▼                 │
┌──────────────┐        │
│  opinions    │        │
│              │        │
│ - question   │        │
│ - options    │        │
│ - status     │        │
└──────┬───────┘        │
       │ 1              │
       │                │
       │ 1:N            │
       ▼                │
┌──────────────────┐   │
│  opinion_bets    │   │
│                  │   │
│ - user_id        │   │
│ - option_id      │   │
│ - bet_amount     │   │
│ - status         │   │
└──────────────────┘   │
                       │
                       │ 1:1 (optional)
                       ▼
                ┌──────────────────┐
                │   campaigns      │
                │                  │
                │ - min_aura       │
                │ - reward_pool    │
                │ - status         │
                └──────┬───────────┘
                       │ 1
                       │
                       │ 1:N
                       ▼
                ┌──────────────────────┐
                │ campaign_participants│
                │                      │
                │ - user_id            │
                │ - aura_at_join       │
                │ - reward_earned      │
                └──────┬───────────────┘
                       │ 1
                       │
                       │ 1:N
                       ▼
                ┌──────────────────┐
                │ campaign_posts   │
                │                  │
                │ - post_id        │
                │ - engagement     │
                └──────────────────┘
```

---

## 11. Migration Strategy

### 11.1 User Migration

#### **Existing Users Start with Bonus Aura**

```sql
-- Calculate starting Aura based on reputation
INSERT INTO aura_balances (user_id, balance, tier)
SELECT
  id as user_id,
  100 + (reputation_score / 10) as balance,
  CASE
    WHEN 100 + (reputation_score / 10) >= 2500 THEN 5
    WHEN 100 + (reputation_score / 10) >= 1000 THEN 4
    WHEN 100 + (reputation_score / 10) >= 500 THEN 3
    WHEN 100 + (reputation_score / 10) >= 100 THEN 2
    ELSE 1
  END as tier
FROM users;

-- Example: User with 500 reputation starts with 150 Aura (Tier 2)
```

#### **Creator Share Holders Get Bonus**

```sql
-- Award bonus Aura to users holding creator shares
INSERT INTO aura_transactions (user_id, amount, transaction_type)
SELECT
  user_address as user_id,
  (total_holdings / 10) as amount,
  'migration_bonus' as transaction_type
FROM creator_token_holdings
WHERE total_holdings > 0;

-- Update balances
UPDATE aura_balances ab
SET balance = balance + (
  SELECT COALESCE(SUM(amount), 0)
  FROM aura_transactions at
  WHERE at.user_id = ab.user_id
    AND at.transaction_type = 'migration_bonus'
);
```

### 11.2 Content Migration

#### **Tag Existing Posts**

```sql
-- Mark all existing posts as 'post' type (not opinions)
UPDATE posts
SET content_type = 'post',
    aura_reward_given = true,  -- Don't retroactively award Aura
    reach_multiplier = 1.0
WHERE content_type IS NULL;
```

#### **Preserve Existing Creator Economy**

```sql
-- Existing Post Tokens continue to work
-- No changes needed to post_tokens, post_token_transactions, etc.

-- Creator shares continue to work
-- No changes to creator_tokens, creator_token_holdings, etc.
```

### 11.3 Feature Rollout Strategy

#### **Week 1: Soft Launch**
- Enable Aura balances (view only)
- Show Aura in UI but no mechanics yet
- Announce upcoming features
- User education materials

#### **Week 2: Daily Decay Enabled**
- Start daily decay (-10/day)
- Users can see their Aura decreasing
- Messaging: "Start posting to earn Aura!"

#### **Week 3: Post Rewards**
- Enable +10 Aura per post
- Daily limit enforcement (5 posts)
- Users can now maintain/grow Aura

#### **Week 4: Aura-Weighted Feed**
- Feed algorithm uses Aura for ranking
- Users see immediate benefit of higher Aura
- High-Aura users get more reach

#### **Week 5-6: Opinions Beta**
- Limited beta for 100 users
- Test betting mechanics
- Collect feedback
- Refine economics

#### **Week 7-8: Opinions Full Launch**
- Open to all Tier 2+ users
- Full betting marketplace
- Marketing push

#### **Week 9-10: Campaigns Beta**
- Work with 5 partner projects
- Test campaign mechanics
- Gather creator feedback

#### **Week 11-12: Campaigns Full Launch**
- Open campaign creation
- Marketing to brands/projects
- Showcase successful case studies

### 11.4 Backward Compatibility

#### **Existing Features Continue to Work:**
- ✅ Post creation (now grants Aura)
- ✅ Munch videos (unchanged)
- ✅ Stories (unchanged)
- ✅ Post Tokens (unchanged)
- ✅ Creator Tokens (unchanged)
- ✅ Messaging (now with access gates)
- ✅ Communities (unchanged)
- ✅ Reputation system (runs in parallel)

#### **No Breaking Changes:**
- All existing API endpoints continue to work
- New fields are additive (defaults provided)
- Existing UI components still functional
- Mobile apps continue to work (graceful degradation)

---

## 12. Key Features Summary

### ✅ Core Features

1. **Aura Balance System**
   - Dynamic reputation currency
   - 5 tiers with increasing benefits
   - Daily decay mechanism
   - Transaction history

2. **Posts (Aura Farming)**
   - Max 5 posts per day
   - +10 Aura per post
   - Engagement bonuses
   - Aura-weighted feed algorithm

3. **Opinions (Prediction Markets)**
   - Bet Aura or USDC on outcomes
   - Creator-resolved results
   - Winner payout distribution
   - Requires minimum Aura

4. **Campaigns (Quality-Gated)**
   - Projects set minimum Aura
   - Reward pools in USDC/Aura
   - Performance-based rewards
   - Access to quality creators

5. **Reach System**
   - Tier-based multipliers (1x to 5x)
   - Higher Aura = More visibility
   - Post boost mechanics
   - Algorithmic fairness

6. **Access Control**
   - Messaging requires Aura or shares
   - Unlock with Aura spend
   - User-configurable settings
   - Anti-spam protection

7. **Creator Share Benefits**
   - 10-30% revenue share
   - Daily Aura bonus (+2% of holdings)
   - Priority access
   - Direct messaging

---

## 13. Success Metrics

### **Engagement Metrics:**
- Daily Active Users (DAU)
- Average posts per user per day
- Daily Aura earned per user
- Opinion participation rate
- Campaign join rate

### **Economic Metrics:**
- Total Aura in circulation
- Aura inflation/deflation rate
- Opinion betting volume
- Campaign revenue
- Creator earnings

### **Content Quality Metrics:**
- Average engagement per post
- Post engagement by tier
- Opinion resolution accuracy
- Campaign completion rate
- User satisfaction scores

### **Growth Metrics:**
- New user retention (7-day, 30-day)
- User tier progression
- Creator share adoption
- Campaign creation rate
- Platform revenue

---

## 14. Risk Mitigation

### **Economic Risks:**
1. **Runaway inflation:** Implement caps, progressive decay, deflationary events
2. **Aura hoarding:** Encourage spending through time-limited benefits
3. **Gaming the system:** Anti-spam measures, diminishing returns, pattern detection

### **Technical Risks:**
1. **Database performance:** Proper indexing, caching, read replicas
2. **Algorithm fairness:** A/B testing, bias detection, transparency
3. **Smart contract bugs:** Audits, test coverage, gradual rollout

### **User Experience Risks:**
1. **Complexity:** Progressive disclosure, onboarding flow, tooltips
2. **Frustration:** Fair mechanics, clear rules, responsive support
3. **Confusion:** Clear documentation, in-app guidance, community education

---

## 15. Conclusion

This comprehensive plan integrates the Aura system seamlessly into Clapo's existing architecture while introducing powerful new engagement mechanics. The system is designed to:

- **Reward quality** over quantity through Aura-weighted reach
- **Prevent spam** through daily limits and decay mechanics
- **Enable prediction markets** through Opinion betting
- **Connect brands with quality creators** through Aura-gated campaigns
- **Create sustainable value** through balanced economic design

The phased implementation approach ensures stable rollout with continuous feedback loops, while backward compatibility maintains the existing user experience.

---

**Document Version:** 1.0
**Last Updated:** January 2025
**Status:** Ready for Implementation

---

*For questions or clarification, please refer to the development team or technical lead.*