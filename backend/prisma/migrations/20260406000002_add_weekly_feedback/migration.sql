-- CreateTable
CREATE TABLE "weekly_feedback" (
    "id" TEXT NOT NULL,
    "routineId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "weekly_feedback_routineId_key" ON "weekly_feedback"("routineId");

-- CreateIndex
CREATE INDEX "weekly_feedback_clientId_idx" ON "weekly_feedback"("clientId");

-- AddForeignKey
ALTER TABLE "weekly_feedback" ADD CONSTRAINT "weekly_feedback_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "routines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_feedback" ADD CONSTRAINT "weekly_feedback_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
