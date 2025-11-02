# Aura System - Frontend Integration Complete

## Summary

The Aura system has been successfully integrated into the frontend. The API is now accessible and all components are ready to display Aura data to users.

---

## Changes Made

### 1. API Configuration

**File: `.env`**
- Added `NEXT_PUBLIC_AURA_API_URL=http://server.blazeswap.io/api`
- Kept existing API URLs unchanged

**File: `app/lib/auraApi.ts`**
- Updated to use `NEXT_PUBLIC_AURA_API_URL` environment variable
- API correctly points to `http://server.blazeswap.io/api`

### 2. Existing Components (Already Present)

**File: `app/Context/AuraProvider.tsx`**
- ✅ Already integrated into the app
- Provides Aura context to all child components
- Auto-fetches user Aura data when logged in
- Auto-refreshes every 5 minutes
- Includes caching for better performance

**File: `app/Context/AppProviders.tsx`**
- ✅ AuraProvider already included in the provider tree
- Available throughout the entire app

**File: `app/components/Navbar.tsx`**
- ✅ Already displays AuraBalance component for logged-in users
- Shows on both desktop and mobile views

**File: `app/components/Aura/AuraBalance.tsx`**
- ✅ Already created and working
- Displays user's Aura balance with tier badge
- Shows reach multiplier
- Has compact and expanded modes

### 3. New Components Created

**File: `app/components/Aura/AuraLeaderboard.tsx`**
- Displays top users ranked by Aura balance
- Shows rank, avatar, username, tier, and balance
- Includes refresh functionality
- Responsive design with hover effects

**File: `app/components/Aura/AuraTransactionHistory.tsx`**
- Shows transaction history with details
- Displays amount, type, timestamp, and metadata
- Color-coded (green for earned, red for spent)
- Load more functionality for pagination

**File: `app/components/Aura/AuraProfileCard.tsx`**
- Comprehensive profile card showing all Aura stats
- Progress bar to next tier
- Total earned/spent breakdown
- Today's activity summary
- Daily post limit status
- Opinion creation eligibility

**File: `app/components/Aura/index.ts`**
- Exports all Aura components for easy importing

---

## How to Use Aura Components

### 1. Display Aura Balance (Already in Navbar)

```tsx
import { AuraBalance } from '@/app/components/Aura';

// Compact mode (navbar)
<AuraBalance compact />

// Compact with details
<AuraBalance compact showDetails />

// Full display
<AuraBalance showDetails />
```

### 2. Show Leaderboard

```tsx
import { AuraLeaderboard } from '@/app/components/Aura';

// Default (top 20)
<AuraLeaderboard />

// Custom limit
<AuraLeaderboard limit={50} />

// Hide rank numbers
<AuraLeaderboard showRank={false} />
```

### 3. Display Transaction History

```tsx
import { AuraTransactionHistory } from '@/app/components/Aura';

// Default (10 transactions)
<AuraTransactionHistory />

// Custom limit
<AuraTransactionHistory limit={20} />

// Hide load more button
<AuraTransactionHistory showLoadMore={false} />
```

### 4. Show Profile Card

```tsx
import { AuraProfileCard } from '@/app/components/Aura';

// Full display (all features)
<AuraProfileCard />

// Minimal display
<AuraProfileCard
  showTransactionSummary={false}
  showPostLimit={false}
  showProgress={false}
/>
```

### 5. Use Aura Context in Any Component

```tsx
import { useAura } from '@/app/Context/AppProviders';

function MyComponent() {
  const {
    aura,           // Aura stats
    loading,        // Loading state
    error,          // Error message
    transactions,   // Transaction history
    postsRemaining, // Daily posts remaining
    canPost,        // Can create post today
    refreshAura,    // Force refresh
    incrementPostCount // Increment after post creation
  } = useAura();

  return (
    <div>
      {aura && (
        <p>Balance: {aura.balance}</p>
      )}
    </div>
  );
}
```

---

## API Integration Points

### Endpoints Being Used

1. **GET `/aura/:userId`** - Get user's Aura balance
   - Called on login and every 5 minutes
   - Cached for 2 minutes

2. **GET `/aura/:userId/transactions`** - Get transaction history
   - Supports pagination (limit, offset)
   - Called when viewing transaction history

3. **GET `/aura/leaderboard/top`** - Get leaderboard
   - Supports pagination
   - Called when viewing leaderboard

4. **GET `/aura/:userId/can-post`** - Check post limit
   - Called before post creation
   - Checked on login

5. **POST `/aura/:userId/increment-post`** - Increment post count
   - Should be called after successful post creation

### Integration with Post Creation

When creating a post, make sure to call:

```tsx
const { canPost, incrementPostCount } = useAura();

const handleCreatePost = async () => {
  // Check if user can post
  if (!canPost) {
    alert('Daily post limit reached!');
    return;
  }

  // Create the post
  const success = await createPost(postData);

  // If successful, increment the post count
  if (success) {
    await incrementPostCount();
  }
};
```

---

## Where Aura is Currently Visible

1. **Navbar** - AuraBalance component shows on:
   - Desktop: Top right (compact with details)
   - Mobile: Top right (compact)

2. **User Profile** - Can add AuraProfileCard component

3. **Leaderboard Page** - Can add AuraLeaderboard component

4. **Activity/History Page** - Can add AuraTransactionHistory component

---

## Recommended Next Steps

### 1. Add to User Profile Page

Create or update a profile page to show the AuraProfileCard:

```tsx
// app/profile/page.tsx
import { AuraProfileCard, AuraTransactionHistory } from '@/app/components/Aura';

export default function ProfilePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <AuraProfileCard />
        <AuraTransactionHistory limit={15} />
      </div>
    </div>
  );
}
```

### 2. Create Leaderboard Page

```tsx
// app/leaderboard/page.tsx
import { AuraLeaderboard } from '@/app/components/Aura';

export default function LeaderboardPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <AuraLeaderboard limit={50} />
    </div>
  );
}
```

### 3. Integrate Post Creation Flow

Update your post creation component to check post limits:

```tsx
import { useAura } from '@/app/Context/AppProviders';

function CreatePostComponent() {
  const { canPost, postsRemaining, incrementPostCount } = useAura();

  const handleSubmit = async (data) => {
    if (!canPost) {
      toast.error('Daily post limit reached!');
      return;
    }

    const success = await createPost(data);
    if (success) {
      await incrementPostCount();
      toast.success('Post created! Post count updated.');
    }
  };

  return (
    <div>
      <p>Posts remaining today: {postsRemaining}/5</p>
      <button disabled={!canPost}>Create Post</button>
    </div>
  );
}
```

### 4. Add Aura Rewards

When users perform actions that should earn Aura, call the update API:

```tsx
import { updateAuraBalance } from '@/app/lib/auraApi';

// Example: Award Aura for viral post
const awardViralBonus = async (userId: string, postId: string) => {
  await updateAuraBalance(
    userId,
    50, // amount
    'engagement_bonus',
    postId,
    'post',
    { reason: 'viral post', likes: 100 }
  );

  // Refresh user's Aura
  await refreshAura();
};
```

---

## Testing Checklist

- [x] API endpoints are accessible
- [x] AuraBalance displays in Navbar
- [x] AuraProvider fetches data on login
- [x] Components compile without errors
- [ ] Test with real user data
- [ ] Verify post limit enforcement
- [ ] Test leaderboard display
- [ ] Test transaction history
- [ ] Verify Aura rewards are working

---

## Environment Variables

Make sure your `.env` file has:

```env
NEXT_PUBLIC_AURA_API_URL=http://server.blazeswap.io/api
```

If you need to change it, restart the dev server after updating.

---

## Development Server

The app is running at: http://localhost:3000

All Aura components are now live and ready to use!
