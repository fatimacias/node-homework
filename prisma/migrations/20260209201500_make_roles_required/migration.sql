-- Backfill existing users
UPDATE "users" SET "roles" = 'user' WHERE "roles" IS NULL;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "roles" SET NOT NULL;
