-- AlterTable
ALTER TABLE "Space" ADD COLUMN "positionX" INTEGER;
ALTER TABLE "Space" ADD COLUMN "positionY" INTEGER;

-- CreateTable
CREATE TABLE "MaterialAllocation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "exhibitorId" INTEGER NOT NULL,
    "materialId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "totalPrice" REAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MaterialAllocation_exhibitorId_fkey" FOREIGN KEY ("exhibitorId") REFERENCES "Exhibitor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MaterialAllocation_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MaterialAllocation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ElectricalAllocation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "exhibitorId" INTEGER NOT NULL,
    "electricalItemId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "totalPrice" REAL NOT NULL,
    "totalWattage" INTEGER NOT NULL,
    "eventId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ElectricalAllocation_exhibitorId_fkey" FOREIGN KEY ("exhibitorId") REFERENCES "Exhibitor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ElectricalAllocation_electricalItemId_fkey" FOREIGN KEY ("electricalItemId") REFERENCES "ElectricalItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ElectricalAllocation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShedAllocation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "exhibitorId" INTEGER NOT NULL,
    "shedId" INTEGER NOT NULL,
    "price" REAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ShedAllocation_exhibitorId_fkey" FOREIGN KEY ("exhibitorId") REFERENCES "Exhibitor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ShedAllocation_shedId_fkey" FOREIGN KEY ("shedId") REFERENCES "Shed" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ShedAllocation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
