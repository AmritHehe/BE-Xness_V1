-- CreateTable
CREATE TABLE "public"."user" (
    "SNo" SERIAL NOT NULL,
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "lastLoggedIn" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("SNo")
);

-- CreateTable
CREATE TABLE "public"."existingTrades" (
    "SNo" SERIAL NOT NULL,
    "id" TEXT NOT NULL,
    "openPrice" DOUBLE PRECISION NOT NULL,
    "closePrice" DOUBLE PRECISION NOT NULL,
    "leverage" DOUBLE PRECISION NOT NULL,
    "pnl" DOUBLE PRECISION NOT NULL,
    "assetId" TEXT NOT NULL,
    "liquidated" BOOLEAN NOT NULL,
    "userId" TEXT NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "existingTrades_pkey" PRIMARY KEY ("SNo")
);

-- CreateTable
CREATE TABLE "public"."asset" (
    "SNo" SERIAL NOT NULL,
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL,

    CONSTRAINT "asset_pkey" PRIMARY KEY ("SNo")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_id_key" ON "public"."user"("id");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "public"."user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "asset_id_key" ON "public"."asset"("id");

-- AddForeignKey
ALTER TABLE "public"."existingTrades" ADD CONSTRAINT "existingTrades_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "public"."asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."existingTrades" ADD CONSTRAINT "existingTrades_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
