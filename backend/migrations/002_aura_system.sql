-- ============================================================================
-- AURA SYSTEM DATABASE MIGRATION
-- Version: 1.0
-- Description: Core Aura reputation system tables
-- ============================================================================

-- ============================================================================
-- TABLE: aura_balances
-- Purpose: Track each user's current Aura balance and tier
-- ============================================================================
CREATE TABLE IF NOT EXISTS aura_balances (
  user_id UUID PRIMARY KEY,
  balance INTEGER NOT NULL DEFAULT 100,
  tier INTEGER NOT NULL DEFAULT 2,
  last_decay_at TIMESTAMP NOT NULL DEFAULT NOW(),
  total_earned INTEGER NOT NULL DEFAULT 100,
  total_spent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for aura_balances
CREATE INDEX IF NOT EXISTS idx_aura_balances_tier ON aura_balances(tier);
CREATE INDEX IF NOT EXISTS idx_aura_balances_balance ON aura_balances(balance DESC);
CREATE INDEX IF NOT EXISTS idx_aura_balances_last_decay ON aura_balances(last_decay_at);
CREATE INDEX IF NOT EXISTS idx_aura_balances_updated ON aura_balances(updated_at DESC);

-- ============================================================================
-- TABLE: aura_transactions
-- Purpose: Complete history of all Aura movements
-- ============================================================================
CREATE TABLE IF NOT EXISTS aura_transactions (
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

-- Indexes for aura_transactions
CREATE INDEX IF NOT EXISTS idx_aura_transactions_user ON aura_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aura_transactions_type ON aura_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_aura_transactions_source ON aura_transactions(source_id, source_type);
CREATE INDEX IF NOT EXISTS idx_aura_transactions_created ON aura_transactions(created_at DESC);

-- ============================================================================
-- TABLE: daily_post_limits
-- Purpose: Track daily post counts to enforce 5 post/day limit
-- ============================================================================
CREATE TABLE IF NOT EXISTS daily_post_limits (
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  post_count INTEGER NOT NULL DEFAULT 0,
  opinion_count INTEGER NOT NULL DEFAULT 0,
  last_post_at TIMESTAMP,
  PRIMARY KEY (user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for daily_post_limits
CREATE INDEX IF NOT EXISTS idx_daily_post_limits_date ON daily_post_limits(date);
CREATE INDEX IF NOT EXISTS idx_daily_post_limits_user_date ON daily_post_limits(user_id, date DESC);

-- ============================================================================
-- VIEWS: Aura Statistics
-- ============================================================================

-- View: aura_leaderboard
-- Purpose: Real-time leaderboard of top Aura holders
CREATE OR REPLACE VIEW aura_leaderboard AS
SELECT
  u.id,
  u.username,
  u.avatar_url,
  u.display_name,
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

-- View: user_aura_stats
-- Purpose: Comprehensive Aura statistics per user
CREATE OR REPLACE VIEW user_aura_stats AS
SELECT
  u.id,
  u.username,
  u.display_name,
  ab.balance as current_aura,
  ab.tier,
  ab.total_earned,
  ab.total_spent,
  ab.last_decay_at,
  COUNT(DISTINCT p.id) FILTER (WHERE p.created_at >= CURRENT_DATE) as posts_today,
  COUNT(DISTINCT at.id) FILTER (WHERE at.created_at >= CURRENT_DATE AND at.amount > 0) as aura_earned_today,
  COUNT(DISTINCT at2.id) FILTER (WHERE at2.created_at >= CURRENT_DATE AND at2.amount < 0) as aura_spent_today
FROM users u
LEFT JOIN aura_balances ab ON u.id = ab.user_id
LEFT JOIN posts p ON u.id = p.user_id
LEFT JOIN aura_transactions at ON u.id = at.user_id
LEFT JOIN aura_transactions at2 ON u.id = at2.user_id
GROUP BY u.id, u.username, u.display_name, ab.balance, ab.tier, ab.total_earned, ab.total_spent, ab.last_decay_at;

-- ============================================================================
-- FUNCTIONS: Aura Helper Functions
-- ============================================================================

-- Function: calculate_aura_tier
-- Purpose: Calculate tier based on Aura balance
CREATE OR REPLACE FUNCTION calculate_aura_tier(aura_balance INTEGER)
RETURNS INTEGER AS $$
BEGIN
  IF aura_balance >= 2500 THEN RETURN 5; -- Legend
  ELSIF aura_balance >= 1000 THEN RETURN 4; -- Leader
  ELSIF aura_balance >= 500 THEN RETURN 3; -- Influencer
  ELSIF aura_balance >= 100 THEN RETURN 2; -- Active
  ELSE RETURN 1; -- Lurker
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: get_tier_name
-- Purpose: Get tier name from tier number
CREATE OR REPLACE FUNCTION get_tier_name(tier INTEGER)
RETURNS VARCHAR(20) AS $$
BEGIN
  CASE tier
    WHEN 5 THEN RETURN 'Legend';
    WHEN 4 THEN RETURN 'Leader';
    WHEN 3 THEN RETURN 'Influencer';
    WHEN 2 THEN RETURN 'Active';
    ELSE RETURN 'Lurker';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: get_reach_multiplier
-- Purpose: Get reach multiplier based on tier
CREATE OR REPLACE FUNCTION get_reach_multiplier(tier INTEGER)
RETURNS DECIMAL(5, 2) AS $$
BEGIN
  CASE tier
    WHEN 5 THEN RETURN 5.0; -- Legend: 5x reach
    WHEN 4 THEN RETURN 3.0; -- Leader: 3x reach
    WHEN 3 THEN RETURN 2.0; -- Influencer: 2x reach
    WHEN 2 THEN RETURN 1.5; -- Active: 1.5x reach
    ELSE RETURN 1.0; -- Lurker: 1x reach
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: update_aura_balance
-- Purpose: Update user's Aura balance and record transaction
CREATE OR REPLACE FUNCTION update_aura_balance(
  p_user_id UUID,
  p_amount INTEGER,
  p_transaction_type VARCHAR(50),
  p_source_id UUID DEFAULT NULL,
  p_source_type VARCHAR(50) DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS TABLE(new_balance INTEGER, new_tier INTEGER) AS $$
DECLARE
  v_new_balance INTEGER;
  v_new_tier INTEGER;
BEGIN
  -- Update balance
  UPDATE aura_balances
  SET
    balance = GREATEST(0, balance + p_amount),
    total_earned = CASE WHEN p_amount > 0 THEN total_earned + p_amount ELSE total_earned END,
    total_spent = CASE WHEN p_amount < 0 THEN total_spent + ABS(p_amount) ELSE total_spent END,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance, calculate_aura_tier(balance) INTO v_new_balance, v_new_tier;

  -- Update tier if changed
  UPDATE aura_balances
  SET tier = v_new_tier
  WHERE user_id = p_user_id AND tier != v_new_tier;

  -- Record transaction
  INSERT INTO aura_transactions (
    user_id, amount, balance_after, transaction_type, source_id, source_type, metadata
  ) VALUES (
    p_user_id, p_amount, v_new_balance, p_transaction_type, p_source_id, p_source_type, p_metadata
  );

  RETURN QUERY SELECT v_new_balance, v_new_tier;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS: Automatic Updates
-- ============================================================================

-- Trigger: update_aura_balances_updated_at
-- Purpose: Automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_aura_balances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_aura_balances_updated_at ON aura_balances;
CREATE TRIGGER trigger_update_aura_balances_updated_at
  BEFORE UPDATE ON aura_balances
  FOR EACH ROW
  EXECUTE FUNCTION update_aura_balances_updated_at();

-- ============================================================================
-- INITIAL DATA: Migrate Existing Users
-- ============================================================================

-- Create Aura balances for existing users
-- Starting balance = 100 + (reputation_score / 10)
INSERT INTO aura_balances (user_id, balance, tier, total_earned)
SELECT
  u.id as user_id,
  100 + COALESCE(rs.reputation_score / 10, 0) as balance,
  calculate_aura_tier(100 + COALESCE(rs.reputation_score / 10, 0)) as tier,
  100 + COALESCE(rs.reputation_score / 10, 0) as total_earned
FROM users u
LEFT JOIN reputation_scores rs ON u.id = rs.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM aura_balances ab WHERE ab.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Record initial balance as transaction
INSERT INTO aura_transactions (user_id, amount, balance_after, transaction_type)
SELECT
  user_id,
  balance as amount,
  balance as balance_after,
  'initial_balance' as transaction_type
FROM aura_balances
WHERE NOT EXISTS (
  SELECT 1 FROM aura_transactions at
  WHERE at.user_id = aura_balances.user_id
  AND at.transaction_type = 'initial_balance'
);

-- ============================================================================
-- COMMENTS: Table Documentation
-- ============================================================================

COMMENT ON TABLE aura_balances IS 'Stores current Aura balance and tier for each user';
COMMENT ON TABLE aura_transactions IS 'Complete transaction history of all Aura movements';
COMMENT ON TABLE daily_post_limits IS 'Tracks daily post counts to enforce posting limits';

COMMENT ON COLUMN aura_balances.balance IS 'Current Aura balance (can be 0 or positive)';
COMMENT ON COLUMN aura_balances.tier IS 'User tier: 1=Lurker, 2=Active, 3=Influencer, 4=Leader, 5=Legend';
COMMENT ON COLUMN aura_balances.last_decay_at IS 'Timestamp of last daily decay application';
COMMENT ON COLUMN aura_balances.total_earned IS 'Total Aura earned over lifetime';
COMMENT ON COLUMN aura_balances.total_spent IS 'Total Aura spent over lifetime';

COMMENT ON COLUMN aura_transactions.transaction_type IS 'Type: post_creation, daily_decay, engagement_bonus, opinion_bet, opinion_win, campaign_reward, etc.';
COMMENT ON COLUMN aura_transactions.source_id IS 'UUID of related entity (post_id, opinion_id, etc.)';
COMMENT ON COLUMN aura_transactions.source_type IS 'Type of source entity (post, opinion, campaign, etc.)';

-- ============================================================================
-- VERIFICATION: Check Migration Success
-- ============================================================================

-- Verify tables exist
DO $$
DECLARE
  v_table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('aura_balances', 'aura_transactions', 'daily_post_limits');

  IF v_table_count = 3 THEN
    RAISE NOTICE '✅ All Aura tables created successfully';
  ELSE
    RAISE WARNING '⚠️ Some Aura tables missing. Expected 3, found %', v_table_count;
  END IF;
END $$;

-- Display migration summary
SELECT
  'aura_balances' as table_name,
  COUNT(*) as row_count,
  AVG(balance)::INTEGER as avg_balance,
  MAX(balance) as max_balance,
  MIN(balance) as min_balance
FROM aura_balances
UNION ALL
SELECT
  'aura_transactions' as table_name,
  COUNT(*) as row_count,
  AVG(amount)::INTEGER as avg_amount,
  MAX(amount) as max_amount,
  MIN(amount) as min_amount
FROM aura_transactions;

RAISE NOTICE '✅ Aura System Migration Complete';
