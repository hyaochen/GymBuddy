-- CreateEnum
CREATE TYPE "EquipmentCategory" AS ENUM ('FREE_WEIGHTS', 'MACHINES', 'CABLES', 'CARDIO', 'BODYWEIGHT', 'STATIONS');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "ExerciseType" AS ENUM ('COMPOUND', 'ISOLATION', 'CARDIO', 'STRETCH');

-- CreateEnum
CREATE TYPE "BodyRegion" AS ENUM ('CHEST', 'BACK', 'SHOULDERS', 'ARMS', 'LEGS', 'CORE', 'FULL_BODY', 'CARDIO');

-- CreateEnum
CREATE TYPE "FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ChallengeType" AS ENUM ('STREAK', 'TOTAL_SESSIONS', 'WEIGHT_PR', 'VOLUME');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "googleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passkeys" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" BYTEA NOT NULL,
    "counter" BIGINT NOT NULL DEFAULT 0,
    "transports" TEXT[],
    "deviceName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "passkeys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "EquipmentCategory" NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "muscle_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bodyRegion" "BodyRegion" NOT NULL,

    CONSTRAINT "muscle_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "stepInstructions" JSONB NOT NULL DEFAULT '[]',
    "difficulty" "Difficulty" NOT NULL DEFAULT 'INTERMEDIATE',
    "exerciseType" "ExerciseType" NOT NULL DEFAULT 'COMPOUND',
    "isTimeBased" BOOLEAN NOT NULL DEFAULT false,
    "gifUrl" TEXT,
    "videoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_equipment" (
    "exerciseId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,

    CONSTRAINT "exercise_equipment_pkey" PRIMARY KEY ("exerciseId","equipmentId")
);

-- CreateTable
CREATE TABLE "exercise_muscles" (
    "exerciseId" TEXT NOT NULL,
    "muscleGroupId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "exercise_muscles_pkey" PRIMARY KEY ("exerciseId","muscleGroupId")
);

-- CreateTable
CREATE TABLE "exercise_alternatives" (
    "exerciseId" TEXT NOT NULL,
    "alternativeExerciseId" TEXT NOT NULL,

    CONSTRAINT "exercise_alternatives_pkey" PRIMARY KEY ("exerciseId","alternativeExerciseId")
);

-- CreateTable
CREATE TABLE "workout_plans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "daysPerWeek" INTEGER NOT NULL DEFAULT 3,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_plan_days" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "dayName" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "workout_plan_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_plan_exercises" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "defaultSets" INTEGER NOT NULL DEFAULT 3,
    "defaultRepsMin" INTEGER NOT NULL DEFAULT 8,
    "defaultRepsMax" INTEGER NOT NULL DEFAULT 12,
    "defaultWeightKg" DECIMAL(6,2),
    "defaultDurationMin" INTEGER,
    "defaultDurationMax" INTEGER,
    "restSeconds" INTEGER NOT NULL DEFAULT 90,
    "notes" TEXT,

    CONSTRAINT "workout_plan_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT,
    "dayId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationMin" INTEGER,
    "notes" TEXT,

    CONSTRAINT "workout_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_exercises" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "substituteForId" TEXT,

    CONSTRAINT "session_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_sets" (
    "id" TEXT NOT NULL,
    "sessionExerciseId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "repsPerformed" INTEGER NOT NULL,
    "weightKg" DECIMAL(6,2) NOT NULL,
    "durationSeconds" INTEGER,
    "restAfterSeconds" INTEGER,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_exercise_summaries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "maxWeight" DECIMAL(6,2) NOT NULL,
    "maxWeightDate" TIMESTAMP(3) NOT NULL,
    "maxVolume" DECIMAL(10,2) NOT NULL,
    "maxVolumeDate" TIMESTAMP(3) NOT NULL,
    "estimated1rm" DECIMAL(6,2) NOT NULL,
    "totalSessions" INTEGER NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_exercise_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "weightKg" DECIMAL(6,2) NOT NULL,
    "reps" INTEGER NOT NULL,
    "estimated1rm" DECIMAL(6,2) NOT NULL,
    "achievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personal_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "friendships" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "status" "FriendshipStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "friendships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_feed_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_feed_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kudos" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feedItemId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '💪',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kudos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "showStreak" BOOLEAN NOT NULL DEFAULT true,
    "showWorkouts" BOOLEAN NOT NULL DEFAULT true,
    "showPRs" BOOLEAN NOT NULL DEFAULT false,
    "showWeight" BOOLEAN NOT NULL DEFAULT false,
    "publicAnalytics" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenges" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "ChallengeType" NOT NULL,
    "targetValue" INTEGER NOT NULL,
    "exerciseId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_participants" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentValue" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "challenge_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared_templates" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "daysPerWeek" INTEGER NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "targetMuscles" TEXT,
    "days" TEXT NOT NULL,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shared_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_likes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "template_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_badges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeKey" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_name_key" ON "users"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "passkeys_credentialId_key" ON "passkeys"("credentialId");

-- CreateIndex
CREATE INDEX "passkeys_userId_idx" ON "passkeys"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_name_key" ON "equipment"("name");

-- CreateIndex
CREATE UNIQUE INDEX "muscle_groups_name_key" ON "muscle_groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "exercises_name_key" ON "exercises"("name");

-- CreateIndex
CREATE INDEX "exercises_difficulty_idx" ON "exercises"("difficulty");

-- CreateIndex
CREATE INDEX "exercises_exerciseType_idx" ON "exercises"("exerciseType");

-- CreateIndex
CREATE INDEX "exercise_equipment_equipmentId_idx" ON "exercise_equipment"("equipmentId");

-- CreateIndex
CREATE INDEX "exercise_muscles_muscleGroupId_idx" ON "exercise_muscles"("muscleGroupId");

-- CreateIndex
CREATE INDEX "exercise_muscles_isPrimary_idx" ON "exercise_muscles"("isPrimary");

-- CreateIndex
CREATE INDEX "exercise_alternatives_exerciseId_idx" ON "exercise_alternatives"("exerciseId");

-- CreateIndex
CREATE INDEX "workout_plans_userId_idx" ON "workout_plans"("userId");

-- CreateIndex
CREATE INDEX "workout_plans_userId_isActive_idx" ON "workout_plans"("userId", "isActive");

-- CreateIndex
CREATE INDEX "workout_plan_days_planId_idx" ON "workout_plan_days"("planId");

-- CreateIndex
CREATE INDEX "workout_plan_exercises_dayId_idx" ON "workout_plan_exercises"("dayId");

-- CreateIndex
CREATE INDEX "workout_plan_exercises_exerciseId_idx" ON "workout_plan_exercises"("exerciseId");

-- CreateIndex
CREATE INDEX "workout_sessions_userId_idx" ON "workout_sessions"("userId");

-- CreateIndex
CREATE INDEX "workout_sessions_userId_startedAt_idx" ON "workout_sessions"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "workout_sessions_planId_idx" ON "workout_sessions"("planId");

-- CreateIndex
CREATE INDEX "session_exercises_sessionId_idx" ON "session_exercises"("sessionId");

-- CreateIndex
CREATE INDEX "session_exercises_exerciseId_idx" ON "session_exercises"("exerciseId");

-- CreateIndex
CREATE INDEX "session_sets_sessionExerciseId_idx" ON "session_sets"("sessionExerciseId");

-- CreateIndex
CREATE INDEX "user_exercise_summaries_userId_idx" ON "user_exercise_summaries"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_exercise_summaries_userId_exerciseId_key" ON "user_exercise_summaries"("userId", "exerciseId");

-- CreateIndex
CREATE INDEX "personal_records_userId_exerciseId_idx" ON "personal_records"("userId", "exerciseId");

-- CreateIndex
CREATE INDEX "personal_records_userId_idx" ON "personal_records"("userId");

-- CreateIndex
CREATE INDEX "personal_records_userId_achievedAt_idx" ON "personal_records"("userId", "achievedAt");

-- CreateIndex
CREATE INDEX "friendships_receiverId_status_idx" ON "friendships"("receiverId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "friendships_requesterId_receiverId_key" ON "friendships"("requesterId", "receiverId");

-- CreateIndex
CREATE INDEX "activity_feed_items_userId_createdAt_idx" ON "activity_feed_items"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "activity_feed_items_isPublic_createdAt_idx" ON "activity_feed_items"("isPublic", "createdAt");

-- CreateIndex
CREATE INDEX "activity_feed_items_createdAt_idx" ON "activity_feed_items"("createdAt");

-- CreateIndex
CREATE INDEX "kudos_feedItemId_idx" ON "kudos"("feedItemId");

-- CreateIndex
CREATE UNIQUE INDEX "kudos_userId_feedItemId_key" ON "kudos"("userId", "feedItemId");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_userId_key" ON "user_profiles"("userId");

-- CreateIndex
CREATE INDEX "challenges_endDate_idx" ON "challenges"("endDate");

-- CreateIndex
CREATE INDEX "challenge_participants_userId_idx" ON "challenge_participants"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_participants_challengeId_userId_key" ON "challenge_participants"("challengeId", "userId");

-- CreateIndex
CREATE INDEX "shared_templates_likes_idx" ON "shared_templates"("likes");

-- CreateIndex
CREATE INDEX "shared_templates_createdAt_idx" ON "shared_templates"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "template_likes_userId_templateId_key" ON "template_likes"("userId", "templateId");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");

-- CreateIndex
CREATE INDEX "user_badges_userId_idx" ON "user_badges"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_badges_userId_badgeKey_key" ON "user_badges"("userId", "badgeKey");

-- AddForeignKey
ALTER TABLE "passkeys" ADD CONSTRAINT "passkeys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_equipment" ADD CONSTRAINT "exercise_equipment_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_equipment" ADD CONSTRAINT "exercise_equipment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_muscles" ADD CONSTRAINT "exercise_muscles_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_muscles" ADD CONSTRAINT "exercise_muscles_muscleGroupId_fkey" FOREIGN KEY ("muscleGroupId") REFERENCES "muscle_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_alternatives" ADD CONSTRAINT "exercise_alternatives_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_alternatives" ADD CONSTRAINT "exercise_alternatives_alternativeExerciseId_fkey" FOREIGN KEY ("alternativeExerciseId") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_plans" ADD CONSTRAINT "workout_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_plan_days" ADD CONSTRAINT "workout_plan_days_planId_fkey" FOREIGN KEY ("planId") REFERENCES "workout_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_plan_exercises" ADD CONSTRAINT "workout_plan_exercises_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "workout_plan_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_plan_exercises" ADD CONSTRAINT "workout_plan_exercises_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "workout_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "workout_plan_days"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_exercises" ADD CONSTRAINT "session_exercises_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "workout_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_exercises" ADD CONSTRAINT "session_exercises_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_sets" ADD CONSTRAINT "session_sets_sessionExerciseId_fkey" FOREIGN KEY ("sessionExerciseId") REFERENCES "session_exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_exercise_summaries" ADD CONSTRAINT "user_exercise_summaries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_exercise_summaries" ADD CONSTRAINT "user_exercise_summaries_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_feed_items" ADD CONSTRAINT "activity_feed_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kudos" ADD CONSTRAINT "kudos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kudos" ADD CONSTRAINT "kudos_feedItemId_fkey" FOREIGN KEY ("feedItemId") REFERENCES "activity_feed_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_participants" ADD CONSTRAINT "challenge_participants_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_participants" ADD CONSTRAINT "challenge_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_templates" ADD CONSTRAINT "shared_templates_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_likes" ADD CONSTRAINT "template_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_likes" ADD CONSTRAINT "template_likes_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "shared_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

