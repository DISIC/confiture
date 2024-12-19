-- CreateEnum
CREATE TYPE "FileDisplay" AS ENUM ('EDITOR', 'ATTACHMENT');

-- AlterTable
ALTER TABLE "AuditFile" ADD COLUMN     "display" "FileDisplay" NOT NULL DEFAULT 'ATTACHMENT';

-- AlterTable
ALTER TABLE "StoredFile" ADD COLUMN     "display" "FileDisplay" NOT NULL DEFAULT 'ATTACHMENT';
