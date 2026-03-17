const fs = require("fs");
const { execSync } = require("child_process");

// Prisma 7's prisma.config.ts uses dotenv to read DATABASE_URL,
// but on Railway the env var is injected at runtime without a .env file.
// Write a .env file so dotenv can pick it up.
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("FATAL: DATABASE_URL is not set");
  process.exit(1);
}

fs.writeFileSync(".env", `DATABASE_URL="${url}"\n`);
console.log("Wrote .env for Prisma");

try {
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
} catch (e) {
  console.error("Migration failed:", e.message);
  process.exit(1);
}

// Start the app (using spawn so require.main === module works in index.js)
const { spawn } = require("child_process");
const app = spawn("node", ["dist/index.js"], { stdio: "inherit", env: process.env });
app.on("exit", (code) => process.exit(code));
