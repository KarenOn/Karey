ALTER TABLE "notification" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE "notification" ADD COLUMN "eventKey" TEXT;
ALTER TABLE "notification" ADD COLUMN "targetUrl" TEXT;
ALTER TABLE "notificationrecipient" ADD COLUMN "readAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "notification_clinicId_eventKey_key" ON "notification"("clinicId", "eventKey");
CREATE INDEX "notificationrecipient_userId_readAt_idx" ON "notificationrecipient"("userId", "readAt");
