-- Social: reject cool-down for friend invitations + social push opt-out.
-- All changes are additive and safe on existing rows.

-- 1. Keep rejected invitations (with timestamp) so a re-invite can be throttled.
ALTER TYPE "FriendshipStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

ALTER TABLE "friendships" ADD COLUMN "rejectedAt" TIMESTAMP(3);

-- 2. Per-user switch for social push notifications (default on, as before).
ALTER TABLE "user_profiles" ADD COLUMN "notifySocial" BOOLEAN NOT NULL DEFAULT true;
