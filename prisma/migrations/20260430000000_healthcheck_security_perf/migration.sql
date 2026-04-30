CREATE TABLE IF NOT EXISTS "rate_limit_buckets" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStartedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("key")
);

CREATE INDEX IF NOT EXISTS "rate_limit_buckets_expiresAt_idx" ON "rate_limit_buckets"("expiresAt");

CREATE TABLE IF NOT EXISTS "push_jobs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "fireAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "push_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "push_jobs_userId_tag_key" ON "push_jobs"("userId", "tag");
CREATE INDEX IF NOT EXISTS "push_jobs_status_fireAt_idx" ON "push_jobs"("status", "fireAt");
CREATE INDEX IF NOT EXISTS "push_jobs_userId_status_idx" ON "push_jobs"("userId", "status");

ALTER TABLE "push_jobs"
    ADD CONSTRAINT "push_jobs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "workout_sessions_dayId_completedAt_idx" ON "workout_sessions"("dayId", "completedAt");
CREATE INDEX IF NOT EXISTS "workout_sessions_userId_completedAt_startedAt_idx" ON "workout_sessions"("userId", "completedAt", "startedAt");
CREATE INDEX IF NOT EXISTS "workout_sessions_userId_dayId_completedAt_idx" ON "workout_sessions"("userId", "dayId", "completedAt");
CREATE INDEX IF NOT EXISTS "session_exercises_sessionId_id_idx" ON "session_exercises"("sessionId", "id");
CREATE INDEX IF NOT EXISTS "challenges_isPublic_endDate_idx" ON "challenges"("isPublic", "endDate");
CREATE INDEX IF NOT EXISTS "challenge_participants_challengeId_idx" ON "challenge_participants"("challengeId");
