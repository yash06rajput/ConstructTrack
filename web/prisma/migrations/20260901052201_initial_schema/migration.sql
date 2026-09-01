-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'DELAYED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ProgressStatus" AS ENUM ('AHEAD', 'ON_TRACK', 'AT_RISK', 'DELAYED');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'PLANNING',
    "startDate" TIMESTAMP(3) NOT NULL,
    "expectedEndDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "managerId" TEXT NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progress_records" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "recordDate" TIMESTAMP(3) NOT NULL,
    "plannedProgress" DOUBLE PRECISION NOT NULL,
    "actualProgress" DOUBLE PRECISION,
    "deviation" DOUBLE PRECISION,
    "status" "ProgressStatus",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "progress_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "construction_images" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "progressRecordId" TEXT,
    "storagePath" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "fileSizeBytes" INTEGER,
    "analysisStatus" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "construction_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_analyses" (
    "id" TEXT NOT NULL,
    "constructionImageId" TEXT NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "modelVersion" TEXT,
    "imageWidth" INTEGER,
    "imageHeight" INTEGER,
    "detectedObjects" JSONB,
    "objectCounts" JSONB,
    "averageConfidence" DOUBLE PRECISION,
    "analysisSummary" TEXT,
    "annotatedStoragePath" TEXT,
    "processingTimeMs" INTEGER,
    "errorMessage" TEXT,
    "completionPercentage" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delay_predictions" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "progressRecordId" TEXT NOT NULL,
    "deviation" DOUBLE PRECISION NOT NULL,
    "estimatedDelayDays" INTEGER NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "explanation" TEXT NOT NULL,
    "methodology" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delay_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "progressRecordId" TEXT,
    "title" TEXT NOT NULL,
    "reportData" JSONB NOT NULL,
    "reportUrl" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "projects_managerId_idx" ON "projects"("managerId");

-- CreateIndex
CREATE INDEX "progress_records_projectId_idx" ON "progress_records"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "progress_records_projectId_recordDate_key" ON "progress_records"("projectId", "recordDate");

-- CreateIndex
CREATE INDEX "construction_images_projectId_idx" ON "construction_images"("projectId");

-- CreateIndex
CREATE INDEX "construction_images_progressRecordId_idx" ON "construction_images"("progressRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_analyses_constructionImageId_key" ON "ai_analyses"("constructionImageId");

-- CreateIndex
CREATE UNIQUE INDEX "delay_predictions_progressRecordId_key" ON "delay_predictions"("progressRecordId");

-- CreateIndex
CREATE INDEX "delay_predictions_projectId_idx" ON "delay_predictions"("projectId");

-- CreateIndex
CREATE INDEX "reports_projectId_idx" ON "reports"("projectId");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_records" ADD CONSTRAINT "progress_records_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_images" ADD CONSTRAINT "construction_images_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_images" ADD CONSTRAINT "construction_images_progressRecordId_fkey" FOREIGN KEY ("progressRecordId") REFERENCES "progress_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_constructionImageId_fkey" FOREIGN KEY ("constructionImageId") REFERENCES "construction_images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delay_predictions" ADD CONSTRAINT "delay_predictions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delay_predictions" ADD CONSTRAINT "delay_predictions_progressRecordId_fkey" FOREIGN KEY ("progressRecordId") REFERENCES "progress_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_progressRecordId_fkey" FOREIGN KEY ("progressRecordId") REFERENCES "progress_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
