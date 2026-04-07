-- CreateTable
CREATE TABLE "diets" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "calories" INTEGER,
    "protein" INTEGER,
    "carbs" INTEGER,
    "fat" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meals" (
    "id" TEXT NOT NULL,
    "dietId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "time" TEXT,
    "foods" TEXT NOT NULL,
    "calories" INTEGER,
    "protein" INTEGER,
    "carbs" INTEGER,
    "fat" INTEGER,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "meals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "diets_clientId_idx" ON "diets"("clientId");

-- CreateIndex
CREATE INDEX "diets_trainerId_idx" ON "diets"("trainerId");

-- CreateIndex
CREATE INDEX "meals_dietId_idx" ON "meals"("dietId");

-- CreateIndex
CREATE INDEX "clients_trainerId_idx" ON "clients"("trainerId");

-- CreateIndex
CREATE INDEX "exercises_routineId_idx" ON "exercises"("routineId");

-- CreateIndex
CREATE INDEX "routines_clientId_idx" ON "routines"("clientId");

-- CreateIndex
CREATE INDEX "trainer_videos_trainerId_idx" ON "trainer_videos"("trainerId");

-- AddForeignKey
ALTER TABLE "diets" ADD CONSTRAINT "diets_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diets" ADD CONSTRAINT "diets_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "trainers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meals" ADD CONSTRAINT "meals_dietId_fkey" FOREIGN KEY ("dietId") REFERENCES "diets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
