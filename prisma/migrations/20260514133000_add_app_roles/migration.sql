-- CreateEnum
CREATE TYPE "AppRole" AS ENUM ('SUPERADMIN', 'ADMIN', 'USER');

-- AlterTable
ALTER TABLE "user" ADD COLUMN "role" "AppRole" NOT NULL DEFAULT 'USER';
