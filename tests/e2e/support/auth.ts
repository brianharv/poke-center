import { randomInt, randomUUID } from "node:crypto";
import { expect, type APIRequestContext } from "@playwright/test";

export async function verificationLink(
  request: APIRequestContext,
  email: string,
  minimumMessages = 1,
) {
  const inboxURL = process.env.MAILPIT_API_URL ?? "http://localhost:8025";
  let messageID = "";
  await expect
    .poll(async () => {
      const response = await request.get(`${inboxURL}/api/v1/search`, {
        params: { query: `to:${email}` },
      });
      expect(response.ok()).toBe(true);
      const inbox = await response.json();
      messageID =
        inbox.messages?.length >= minimumMessages ? inbox.messages[0].ID : "";
      return messageID;
    })
    .not.toBe("");
  const response = await request.get(`${inboxURL}/api/v1/message/${messageID}`);
  const message = await response.json();
  const url = message.Text.match(/https?:\/\/\S+/)?.[0];
  if (!url) throw new Error("Verification email did not contain a link.");
  return url as string;
}

export async function createVerifiedUser(request: APIRequestContext) {
  const email = `signin-${randomUUID()}@example.test`;
  const password = "a verified trainer passphrase";
  const response = await request.post("/api/auth/sign-up/email", {
    headers: {
      "x-forwarded-for": `198.19.${randomInt(256)}.${randomInt(1, 255)}`,
    },
    data: { email, password },
  });
  expect(response.ok()).toBe(true);
  const link = await verificationLink(request, email);
  const verification = await request.get(link);
  expect(verification.ok()).toBe(true);
  return { email, password };
}
