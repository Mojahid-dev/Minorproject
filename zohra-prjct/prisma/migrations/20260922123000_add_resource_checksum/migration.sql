-- AlterTable
ALTER TABLE "resource" ADD COLUMN "checksum" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "resource_userId_checksum_key" ON "resource"("userId", "checksum");
