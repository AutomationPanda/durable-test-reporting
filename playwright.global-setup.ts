import type { FullConfig } from "@playwright/test";
import { writeRunSuiteIdForGlobalSetup } from "./tests/support/playwrightRunSuiteId";

export default async function globalSetup(config: FullConfig): Promise<void> {
  writeRunSuiteIdForGlobalSetup(config.rootDir);
}
