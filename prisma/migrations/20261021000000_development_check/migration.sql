CREATE TABLE "DevelopmentCheck" (
    "id" INTEGER NOT NULL,
    "initializedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DevelopmentCheck_pkey" PRIMARY KEY ("id")
);

INSERT INTO "DevelopmentCheck" ("id") VALUES (1);
