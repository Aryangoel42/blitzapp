-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
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
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "completed_at" DATETIME,
    CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Task_parent_task_id_fkey" FOREIGN KEY ("parent_task_id") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("completed_at", "created_at", "description", "due_at", "estimate_min", "id", "parent_task_id", "priority", "recurrence_rule", "reminder_frequency", "reminder_time", "status", "tags_json", "title", "updated_at", "userId") SELECT "completed_at", "created_at", "description", "due_at", "estimate_min", "id", "parent_task_id", "priority", "recurrence_rule", "reminder_frequency", "reminder_time", "status", "tags_json", "title", "updated_at", "userId" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE INDEX "Task_userId_status_idx" ON "Task"("userId", "status");
CREATE INDEX "Task_userId_due_at_idx" ON "Task"("userId", "due_at");
CREATE INDEX "Task_parent_task_id_idx" ON "Task"("parent_task_id");
CREATE INDEX "Task_reminder_time_idx" ON "Task"("reminder_time");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
