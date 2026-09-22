/*
  Warnings:

  - You are about to drop the `alsintan` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `alsintan_rentals` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `order_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `orders` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payments` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "alsintan_rentals" DROP CONSTRAINT "alsintan_rentals_alsintanId_fkey";

-- DropForeignKey
ALTER TABLE "alsintan_rentals" DROP CONSTRAINT "alsintan_rentals_userId_fkey";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_orderId_fkey";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_productId_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_userId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_orderId_fkey";

-- DropTable
DROP TABLE "alsintan";

-- DropTable
DROP TABLE "alsintan_rentals";

-- DropTable
DROP TABLE "order_items";

-- DropTable
DROP TABLE "orders";

-- DropTable
DROP TABLE "payments";

-- DropEnum
DROP TYPE "OrderStatus";

-- DropEnum
DROP TYPE "RentalStatus";
