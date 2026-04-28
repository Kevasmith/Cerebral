-- =============================================================================
-- Cerebral — Row Level Security
-- Run this once against your Railway Postgres database.
-- Usage: psql $DATABASE_URL -f rls.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Enable RLS on every user-data table.
--    FORCE ROW LEVEL SECURITY also enforces policies when the connecting role
--    is the table owner (needed because Railway's db user owns the tables).
-- ---------------------------------------------------------------------------
ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE users         FORCE  ROW LEVEL SECURITY;

ALTER TABLE accounts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts      FORCE  ROW LEVEL SECURITY;

ALTER TABLE transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions  FORCE  ROW LEVEL SECURITY;

ALTER TABLE insights      ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights      FORCE  ROW LEVEL SECURITY;

ALTER TABLE preferences   ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferences   FORCE  ROW LEVEL SECURITY;

-- opportunities are global content (no userId), no RLS needed.

-- ---------------------------------------------------------------------------
-- 2. Drop and recreate policies so this script is idempotent.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS rls_users        ON users;
DROP POLICY IF EXISTS rls_accounts     ON accounts;
DROP POLICY IF EXISTS rls_transactions ON transactions;
DROP POLICY IF EXISTS rls_insights     ON insights;
DROP POLICY IF EXISTS rls_preferences  ON preferences;

DROP FUNCTION IF EXISTS cerebral_current_user_id();

-- ---------------------------------------------------------------------------
-- 3. Helper function: resolves the app user's UUID from their Better Auth ID.
--
--    The app sets app.current_user_id = <betterAuthId> (a session variable).
--    This function does a join-free lookup so it is cached per statement by
--    the planner (STABLE). No SECURITY DEFINER needed — the users policy
--    already limits the lookup to the caller's own row, which is correct.
-- ---------------------------------------------------------------------------
CREATE FUNCTION cerebral_current_user_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT id
  FROM   users
  WHERE  "betterAuthId" = current_setting('app.current_user_id', true)
$$;

-- ---------------------------------------------------------------------------
-- 4. Policies
--
--    current_setting('app.current_user_id', true) returns '' (empty string)
--    when unset (the true flag suppresses errors). All equality checks against
--    '' return false, so unauthenticated queries see zero rows.
-- ---------------------------------------------------------------------------

-- users: each user sees only their own record
CREATE POLICY rls_users ON users
  USING ("betterAuthId" = current_setting('app.current_user_id', true));

-- accounts: must belong to the current user
CREATE POLICY rls_accounts ON accounts
  USING ("userId" = cerebral_current_user_id());

-- transactions: belong to one of the current user's accounts
CREATE POLICY rls_transactions ON transactions
  USING (
    "accountId" IN (
      SELECT id FROM accounts WHERE "userId" = cerebral_current_user_id()
    )
  );

-- insights: generated for the current user
CREATE POLICY rls_insights ON insights
  USING ("userId" = cerebral_current_user_id());

-- preferences: one row per user
CREATE POLICY rls_preferences ON preferences
  USING ("userId" = cerebral_current_user_id());

-- ---------------------------------------------------------------------------
-- 5. Index on betterAuthId for fast policy evaluation
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_better_auth_id ON users ("betterAuthId");

-- Done
SELECT 'RLS enabled on users, accounts, transactions, insights, preferences' AS result;
