-- CreateTable
CREATE TABLE "routine_templates" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routine_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routine_template_exercises" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sets" INTEGER NOT NULL,
    "reps" INTEGER NOT NULL,
    "weight" DOUBLE PRECISION,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "routine_template_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "routine_templates_trainerId_idx" ON "routine_templates"("trainerId");

-- CreateIndex
CREATE INDEX "routine_template_exercises_templateId_idx" ON "routine_template_exercises"("templateId");

-- AddForeignKey
ALTER TABLE "routine_templates" ADD CONSTRAINT "routine_templates_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "trainers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_template_exercises" ADD CONSTRAINT "routine_template_exercises_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "routine_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
