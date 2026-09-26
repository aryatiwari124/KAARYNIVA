-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "voidedAt" TIMESTAMP(3),
ADD COLUMN     "voidedReason" TEXT;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "voidedAt" TIMESTAMP(3),
ADD COLUMN     "voidedReason" TEXT;

-- CreateTable
CREATE TABLE "Counter" (
    "name" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Counter_pkey" PRIMARY KEY ("name")
);
