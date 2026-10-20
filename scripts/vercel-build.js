const { execSync } = require("node:child_process");

function getMigrationDatabaseUrl() {
  const directUrl = process.env.DIRECT_URL;
  const databaseUrl = directUrl || process.env.DATABASE_URL;
  if (!databaseUrl) return undefined;

  try {
    const url = new URL(databaseUrl);

    // Neon recommends a direct (non-pooler) endpoint for Prisma Migrate.
    // Prefer an explicitly configured DIRECT_URL; otherwise derive the
    // direct endpoint from the existing Neon pooled DATABASE_URL.
    if (!directUrl) {
      url.hostname = url.hostname.replace(/-pooler(?=\.)/, "");
    }

    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", "30");
    }

    return url.toString();
  } catch {
    return databaseUrl;
  }
}

const migrationDatabaseUrl = getMigrationDatabaseUrl();
const env = {
  ...process.env,
  ...(migrationDatabaseUrl ? { DATABASE_URL: migrationDatabaseUrl } : {}),
  PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: "1",
};

console.log(
  "Running Prisma production migrations using the direct database endpoint..."
);
execSync("npx prisma migrate deploy", {
  stdio: "inherit",
  env,
});

console.log("Running Next.js production build...");
execSync("npx next build", {
  stdio: "inherit",
  env: process.env,
});
