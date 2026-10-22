import { randomBytes } from "node:crypto";
import { chmod, readFile, writeFile } from "node:fs/promises";

let contents;
try {
  contents = await readFile(".env", "utf8");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  contents = await readFile(".env.example", "utf8");
}

const secretLine = /^BETTER_AUTH_SECRET=(.*)$/m;
if (!contents.match(secretLine)?.[1]?.trim()) {
  const line = `BETTER_AUTH_SECRET=${randomBytes(32).toString("base64url")}`;
  contents = contents.match(secretLine)
    ? contents.replace(secretLine, line)
    : `${contents.trimEnd()}\n${line}\n`;
  await writeFile(".env", contents, { mode: 0o600 });
}
await chmod(".env", 0o600);
console.log(
  "Local .env is ready; existing settings and auth secrets are preserved.",
);
