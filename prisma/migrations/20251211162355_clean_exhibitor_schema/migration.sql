/*
  Warnings:

  - You are about to drop the column `contactPerson` on the `Exhibitor` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Exhibitor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "faciaName" TEXT NOT NULL DEFAULT '',
    "productCategory" TEXT NOT NULL DEFAULT '',
    "idProof" TEXT NOT NULL DEFAULT '',
    "contact" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "secondaryPhone" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "advancePaid" REAL NOT NULL DEFAULT 0.0,
    "isPhysicalFormSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Exhibitor" ("address", "advancePaid", "contact", "createdAt", "email", "faciaName", "id", "idProof", "isPhysicalFormSubmitted", "name", "phone", "productCategory", "secondaryPhone", "updatedAt") SELECT "address", "advancePaid", "contact", "createdAt", "email", "faciaName", "id", "idProof", "isPhysicalFormSubmitted", "name", "phone", "productCategory", "secondaryPhone", "updatedAt" FROM "Exhibitor";
DROP TABLE "Exhibitor";
ALTER TABLE "new_Exhibitor" RENAME TO "Exhibitor";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
