// Load apps/web/.env.local into process.env for integration tests.
// Node 20.12+/24 ships process.loadEnvFile; ignore if the file is absent.
try {
  (process as NodeJS.Process & { loadEnvFile?: (path?: string) => void }).loadEnvFile?.(
    ".env.local",
  );
} catch {
  // No .env.local — integration tests that require credentials will skip.
}
