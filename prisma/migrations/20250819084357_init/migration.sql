-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "auth_provider" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "notification_task_due" BOOLEAN NOT NULL DEFAULT true,
    "notification_focus_end" BOOLEAN NOT NULL DEFAULT true,
    "notification_nudge" BOOLEAN NOT NULL DEFAULT true,
    "presets_json" TEXT NOT NULL DEFAULT '[]',
    "streak_days" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "role" TEXT NOT NULL DEFAULT 'end_user',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "due_at" DATETIME,
    "estimate_min" INTEGER DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "tags_json" TEXT NOT NULL DEFAULT '[]',
    "recurrence_rule" TEXT,
    "reminder_time" DATETIME,
    "reminder_frequency" TEXT,
    "parent_task_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "completed_at" DATETIME,
    CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FocusSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "taskId" TEXT,
    "focus_minutes" INTEGER NOT NULL,
    "break_minutes" INTEGER NOT NULL,
    "started_at" DATETIME NOT NULL,
    "ended_at" DATETIME,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "session_hash" TEXT NOT NULL,
    "awarded_points" INTEGER,
    "streak_multiplier" REAL,
    CONSTRAINT "FocusSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FocusSession_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PointsLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "ref_id" TEXT,
    "meta_json" TEXT NOT NULL DEFAULT '{}',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PointsLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StreakLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "streak_days" INTEGER NOT NULL,
    "multiplier" REAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StreakLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TreeSpecies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "stages" INTEGER NOT NULL,
    "unlock_cost" INTEGER NOT NULL,
    "art_refs" TEXT NOT NULL DEFAULT '[]'
);

-- CreateTable
CREATE TABLE "TreeInstance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "speciesId" TEXT NOT NULL,
    "stage" INTEGER NOT NULL DEFAULT 0,
    "planted_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_growth_session_ids" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "TreeInstance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TreeInstance_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "TreeSpecies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "payload_json" TEXT NOT NULL DEFAULT '{}',
    "scheduled_at" DATETIME,
    "sent_at" DATETIME,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "FocusSession_session_hash_key" ON "FocusSession"("session_hash");
