-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Goal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "thrust_area" TEXT DEFAULT 'Sales',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "uom_type" TEXT DEFAULT 'Numeric',
    "target_value" REAL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "weightage" INTEGER NOT NULL DEFAULT 0,
    "smart_score" INTEGER,
    "cycle_id" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" DATETIME,
    "approved_by" INTEGER,
    CONSTRAINT "Goal_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Goal_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Goal_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "Cycle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Goal" ("created_at", "cycle_id", "description", "id", "status", "title", "user_id", "weightage") SELECT "created_at", "cycle_id", "description", "id", "status", "title", "user_id", "weightage" FROM "Goal";
DROP TABLE "Goal";
ALTER TABLE "new_Goal" RENAME TO "Goal";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
