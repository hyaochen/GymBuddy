-- Kudo reactions are now stored as keys (see src/lib/kudos.ts) instead of emoji characters.
-- Only the column default changes; existing rows were converted separately.
ALTER TABLE "kudos" ALTER COLUMN "emoji" SET DEFAULT 'flex';
