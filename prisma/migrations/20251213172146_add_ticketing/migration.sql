-- CreateTable
CREATE TABLE "TicketType" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "eventId" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TicketType_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TicketBatch" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ticketTypeId" INTEGER NOT NULL,
    "startNumber" INTEGER NOT NULL,
    "endNumber" INTEGER NOT NULL,
    "currentNumber" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TicketBatch_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "TicketType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TicketSale" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "eventId" INTEGER NOT NULL,
    "totalAmount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TicketSale_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TicketSaleItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "saleId" INTEGER NOT NULL,
    "ticketTypeId" INTEGER NOT NULL,
    "ticketNumber" INTEGER NOT NULL,
    "price" REAL NOT NULL,
    CONSTRAINT "TicketSaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "TicketSale" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TicketSaleItem_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "TicketType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
