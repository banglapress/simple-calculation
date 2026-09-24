const { execSync } = require("node:child_process");

const env = {
  ...process.env,
  PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: "1",
};

console.log("Running Prisma production migrations...");
execSync("npx prisma migrate deploy", {
  stdio: "inherit",
  env,
});

console.log("Running Next.js production build...");
execSync("npx next build", {
  stdio: "inherit",
  env: process.env,
});
