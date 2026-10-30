import { defineConfig } from "@playwright/test"

const port = 3101
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command:
          "ADMIN_USERNAME=testadmin ADMIN_PASSWORD_HASH='scrypt$J7feFdjenQQCYGN9J2PAPPCTFdPvqNIw$XqC3pAQunQkUsTv77y38zp2EXDGPhVPA9ZEragVvJZMG5PrfVQz6LoCFsyIo4fgskGekGXq5ytM-EKmYc1bHMQ' ADMIN_SESSION_SECRET='test-session-secret-for-browser-check-2026-very-long' pnpm dev --port 3101",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: "ignore",
        stderr: "ignore",
      },
})
