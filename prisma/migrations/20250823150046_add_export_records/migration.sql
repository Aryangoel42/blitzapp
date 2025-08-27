/*
  Warnings:

  - You are about to drop the column `date` on the `StreakLedger` table. All the data in the column will be lost.
  - You are about to drop the column `multiplier` on the `StreakLedger` table. All the data in the column will be lost.
  - You are about to drop the column `notification_nudge` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `presets_json` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `timezone` on the `User` table. All the data in the column will be lost.
  - Added the required column `updated_at` to the `FocusSession` table without a default value. This is not possible if the table is not empty.
  - Made the column `scheduled_at` on table `Notification` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `event_type` to the `StreakLedger` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `TreeInstance` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "ExportRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "export_type" TEXT NOT NULL,
    "filters" TEXT NOT NULL,
    "date_range" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "file_size" INTEGER,
    "error_message" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" DATETIME,
    CONSTRAINT "ExportRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FocusSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "taskId" TEXT,
    "focus_minutes" INTEGER NOT NULL,
    "break_minutes" INTEGER NOT NULL,
    "started_at" DATETIME NOT NULL,
    "ended_at" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "session_hash" TEXT NOT NULL,
    "awarded_points" INTEGER NOT NULL DEFAULT 0,
    "streak_multiplier" REAL NOT NULL DEFAULT 1.0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "FocusSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FocusSession_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_FocusSession" ("awarded_points", "break_minutes", "ended_at", "focus_minutes", "id", "notes", "session_hash", "started_at", "status", "streak_multiplier", "taskId", "userId") SELECT coalesce("awarded_points", 0) AS "awarded_points", "break_minutes", "ended_at", "focus_minutes", "id", "notes", "session_hash", "started_at", "status", coalesce("streak_multiplier", 1.0) AS "streak_multiplier", "taskId", "userId" FROM "FocusSession";
DROP TABLE "FocusSession";
ALTER TABLE "new_FocusSession" RENAME TO "FocusSession";
CREATE UNIQUE INDEX "FocusSession_session_hash_key" ON "FocusSession"("session_hash");
CREATE INDEX "FocusSession_userId_status_idx" ON "FocusSession"("userId", "status");
CREATE INDEX "FocusSession_userId_started_at_idx" ON "FocusSession"("userId", "started_at");
CREATE TABLE "new_Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "payload_json" TEXT NOT NULL,
    "scheduled_at" DATETIME NOT NULL,
    "sent_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Notification" ("channel", "id", "payload_json", "scheduled_at", "sent_at", "type", "userId") SELECT "channel", "id", "payload_json", "scheduled_at", "sent_at", "type", "userId" FROM "Notification";
DROP TABLE "Notification";
ALTER TABLE "new_Notification" RENAME TO "Notification";
CREATE INDEX "Notification_userId_type_idx" ON "Notification"("userId", "type");
CREATE INDEX "Notification_userId_scheduled_at_idx" ON "Notification"("userId", "scheduled_at");
CREATE INDEX "Notification_scheduled_at_sent_at_idx" ON "Notification"("scheduled_at", "sent_at");
CREATE TABLE "new_PointsLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "ref_id" TEXT,
    "meta_json" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PointsLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PointsLedger" ("created_at", "delta", "id", "meta_json", "reason", "ref_id", "userId") SELECT "created_at", "delta", "id", "meta_json", "reason", "ref_id", "userId" FROM "PointsLedger";
DROP TABLE "PointsLedger";
ALTER TABLE "new_PointsLedger" RENAME TO "PointsLedger";
CREATE INDEX "PointsLedger_userId_reason_idx" ON "PointsLedger"("userId", "reason");
CREATE INDEX "PointsLedger_userId_created_at_idx" ON "PointsLedger"("userId", "created_at");
CREATE TABLE "new_StreakLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "streak_days" INTEGER NOT NULL,
    "event_type" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StreakLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_StreakLedger" ("created_at", "id", "streak_days", "userId") SELECT "created_at", "id", "streak_days", "userId" FROM "StreakLedger";
DROP TABLE "StreakLedger";
ALTER TABLE "new_StreakLedger" RENAME TO "StreakLedger";
CREATE INDEX "StreakLedger_userId_created_at_idx" ON "StreakLedger"("userId", "created_at");
CREATE TABLE "new_TreeInstance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "speciesId" TEXT NOT NULL,
    "stage" INTEGER NOT NULL DEFAULT 0,
    "planted_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_growth_session_ids" TEXT NOT NULL DEFAULT '[]',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "TreeInstance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TreeInstance_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "TreeSpecies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_TreeInstance" ("id", "last_growth_session_ids", "planted_at", "speciesId", "stage", "userId") SELECT "id", "last_growth_session_ids", "planted_at", "speciesId", "stage", "userId" FROM "TreeInstance";
DROP TABLE "TreeInstance";
ALTER TABLE "new_TreeInstance" RENAME TO "TreeInstance";
CREATE INDEX "TreeInstance_userId_idx" ON "TreeInstance"("userId");
CREATE INDEX "TreeInstance_speciesId_idx" ON "TreeInstance"("speciesId");
CREATE TABLE "new_TreeSpecies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "stages" INTEGER NOT NULL,
    "unlock_cost" INTEGER NOT NULL DEFAULT 0,
    "art_refs" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_TreeSpecies" ("art_refs", "id", "name", "stages", "unlock_cost") SELECT "art_refs", "id", "name", "stages", "unlock_cost" FROM "TreeSpecies";
DROP TABLE "TreeSpecies";
ALTER TABLE "new_TreeSpecies" RENAME TO "TreeSpecies";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "auth_provider" TEXT NOT NULL DEFAULT 'email',
    "points" INTEGER NOT NULL DEFAULT 0,
    "streak_days" INTEGER NOT NULL DEFAULT 0,
    "notification_task_due" BOOLEAN NOT NULL DEFAULT true,
    "notification_focus_end" BOOLEAN NOT NULL DEFAULT true,
    "notification_daily_email" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_User" ("auth_provider", "created_at", "email", "id", "name", "notification_focus_end", "notification_task_due", "points", "streak_days", "updated_at") SELECT "auth_provider", "created_at", "email", "id", "name", "notification_focus_end", "notification_task_due", "points", "streak_days", "updated_at" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ExportRecord_userId_export_type_idx" ON "ExportRecord"("userId", "export_type");

-- CreateIndex
CREATE INDEX "ExportRecord_userId_status_idx" ON "ExportRecord"("userId", "status");

-- CreateIndex
CREATE INDEX "ExportRecord_userId_created_at_idx" ON "ExportRecord"("userId", "created_at");
