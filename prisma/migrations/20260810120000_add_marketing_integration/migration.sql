-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('META_AD', 'WHATSAPP_ORGANIC', 'DIRECT', 'UNKNOWN');

-- CreateTable
CREATE TABLE "PosTicket" (
    "id" SERIAL NOT NULL,
    "odooId" INTEGER NOT NULL,
    "folio" TEXT NOT NULL,
    "dateUtc" TIMESTAMP(3) NOT NULL,
    "dayLocal" TEXT NOT NULL,
    "amountTotal" DOUBLE PRECISION NOT NULL,
    "branch" TEXT NOT NULL,
    "attributable" BOOLEAN NOT NULL,
    "customerPhone" TEXT,
    "odooPartnerId" INTEGER,
    "customerId" INTEGER,

    CONSTRAINT "PosTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosTicketLine" (
    "id" SERIAL NOT NULL,
    "odooId" INTEGER NOT NULL,
    "productOdooId" INTEGER NOT NULL,
    "productName" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "amountIncl" DOUBLE PRECISION NOT NULL,
    "businessLine" TEXT NOT NULL,
    "ticketId" INTEGER NOT NULL,

    CONSTRAINT "PosTicketLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncState" (
    "id" TEXT NOT NULL,
    "lastOdooId" INTEGER NOT NULL DEFAULT 0,
    "lastRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastOkAt" TIMESTAMP(3),
    "lastError" TEXT,

    CONSTRAINT "SyncState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdCampaign" (
    "id" TEXT NOT NULL,
    "metaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "objective" TEXT,

    CONSTRAINT "AdCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdInsightDaily" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "spend" DOUBLE PRECISION NOT NULL,
    "impressions" INTEGER NOT NULL,
    "clicks" INTEGER NOT NULL,
    "reach" INTEGER NOT NULL,
    "campaignId" TEXT NOT NULL,

    CONSTRAINT "AdInsightDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "source" "LeadSource" NOT NULL DEFAULT 'UNKNOWN',
    "metaCampaignId" TEXT,
    "firstMessageAt" TIMESTAMP(3),
    "attributedBy" TEXT,
    "customerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PosTicket_odooId_key" ON "PosTicket"("odooId");

-- CreateIndex
CREATE INDEX "PosTicket_dayLocal_idx" ON "PosTicket"("dayLocal");

-- CreateIndex
CREATE INDEX "PosTicket_branch_dayLocal_idx" ON "PosTicket"("branch", "dayLocal");

-- CreateIndex
CREATE INDEX "PosTicket_customerId_idx" ON "PosTicket"("customerId");

-- CreateIndex
CREATE INDEX "PosTicket_customerPhone_idx" ON "PosTicket"("customerPhone");

-- CreateIndex
CREATE UNIQUE INDEX "PosTicketLine_odooId_key" ON "PosTicketLine"("odooId");

-- CreateIndex
CREATE INDEX "PosTicketLine_ticketId_idx" ON "PosTicketLine"("ticketId");

-- CreateIndex
CREATE INDEX "PosTicketLine_businessLine_idx" ON "PosTicketLine"("businessLine");

-- CreateIndex
CREATE UNIQUE INDEX "AdCampaign_metaId_key" ON "AdCampaign"("metaId");

-- CreateIndex
CREATE INDEX "AdInsightDaily_date_idx" ON "AdInsightDaily"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AdInsightDaily_campaignId_date_key" ON "AdInsightDaily"("campaignId", "date");

-- CreateIndex
CREATE INDEX "Lead_customerId_idx" ON "Lead"("customerId");

-- CreateIndex
CREATE INDEX "Lead_metaCampaignId_idx" ON "Lead"("metaCampaignId");

-- AddForeignKey
ALTER TABLE "PosTicket" ADD CONSTRAINT "PosTicket_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosTicketLine" ADD CONSTRAINT "PosTicketLine_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "PosTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdInsightDaily" ADD CONSTRAINT "AdInsightDaily_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

