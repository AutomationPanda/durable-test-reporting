import type { FullConfig } from "@playwright/test";
import { clearPlaywrightDashingRunArtifacts } from "./tests/support/playwrightRunSuiteId";

export default async function globalTeardown(config: FullConfig): Promise<void> {
  clearPlaywrightDashingRunArtifacts(config.rootDir);
}
