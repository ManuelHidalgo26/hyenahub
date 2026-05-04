-- Add durationWeeks to routine_templates
ALTER TABLE "routine_templates" ADD COLUMN "durationWeeks" INTEGER NOT NULL DEFAULT 0;

-- Add durationWeeks to routines
ALTER TABLE "routines" ADD COLUMN "durationWeeks" INTEGER NOT NULL DEFAULT 0;

-- CreateTable diet_templates
CREATE TABLE "diet_templates" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "calories" INTEGER,
    "protein" INTEGER,
    "carbs" INTEGER,
    "fat" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diet_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable diet_template_meals
CREATE TABLE "diet_template_meals" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "time" TEXT,
    "foods" TEXT NOT NULL,
    "calories" INTEGER,
    "protein" INTEGER,
    "carbs" INTEGER,
    "fat" INTEGER,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "diet_template_meals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "diet_templates_trainerId_idx" ON "diet_templates"("trainerId");

-- CreateIndex
CREATE INDEX "diet_template_meals_templateId_idx" ON "diet_template_meals"("templateId");

-- AddForeignKey
ALTER TABLE "diet_templates" ADD CONSTRAINT "diet_templates_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "trainers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diet_template_meals" ADD CONSTRAINT "diet_template_meals_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "diet_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
