const { execSync } = require("node:child_process");

function withConnectionTimeout(connectionString) {
  if (!connectionString) return connectionString;

  try {
    const url = new URL(connectionString);
    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", "30");
    }
    return url.toString();
  } catch {
    return connectionString;
  }
}

const env = {
  ...process.env,
  DATABASE_URL: withConnectionTimeout(process.env.DATABASE_URL),
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
