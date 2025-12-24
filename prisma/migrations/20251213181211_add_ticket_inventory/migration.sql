-- CreateTable
CREATE TABLE "TicketInventory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "eventId" INTEGER NOT NULL,
    "seriesLabel" TEXT NOT NULL DEFAULT 'Batch',
    "startNumber" INTEGER NOT NULL,
    "endNumber" INTEGER NOT NULL,
    "currentNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Available',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TicketInventory_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
