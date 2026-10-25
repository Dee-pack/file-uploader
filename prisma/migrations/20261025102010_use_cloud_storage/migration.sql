/*
  Warnings:

  - You are about to drop the column `storedName` on the `File` table. All the data in the column will be lost.
  - Added the required column `storagePath` to the `File` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "File" DROP COLUMN "storedName",
ADD COLUMN     "storagePath" TEXT NOT NULL;
