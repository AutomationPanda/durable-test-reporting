/**
 * Wire payloads for POST /api/events.
 * Keep in sync with temporal-worker/src/dashingEvent.ts.
 */
export type DashingEvent =
  | {
      type: "suite_start";
      suiteUuid: string;
      suiteName: string;
      startTime: string;
    }
  | {
      type: "suite_end";
      suiteUuid: string;
      endTime: string;
    }
  | {
      type: "test_case_start";
      testUuid: string;
      suiteUuid: string;
      testName: string;
      startTime: string;
    }
  | {
      type: "test_case_end";
      testUuid: string;
      endTime: string;
      testResult: "pass" | "fail";
    };
