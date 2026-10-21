import { readFileSync } from "node:fs";

const { engines } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
if (process.versions.node !== engines.node) {
  console.error(
    `Node.js ${engines.node} is required; found ${process.versions.node}. Run nvm install && nvm use, or use Docker Compose.`,
  );
  process.exit(1);
}
