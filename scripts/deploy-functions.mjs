// Deploys Cloud Functions. The CLI gives the functions code 10 s to load while it
// reads their definitions; a cold start on Windows sometimes needs longer.
import { execSync } from "node:child_process";

execSync("firebase deploy --only functions --force", {
  stdio: "inherit",
  env: { ...process.env, FUNCTIONS_DISCOVERY_TIMEOUT: process.env.FUNCTIONS_DISCOVERY_TIMEOUT ?? "60" },
});
