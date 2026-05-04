# Dashboard Tests


## User Story

As a tester,
I want to see all the test cases for a suite run on my dashboard,
So that I know what my test results are.


## Design

When the use clicks a test suite run on the home page,
Dashing should open a new page that shows all the test cases that are part of that suite.
The test case data should follow the standards set in [test-result-events.md](../engineering/test-result-events.md).

The test cases should be presented in a list/table in chronological order from top to bottom.
Each test should be displayed with its name and start time.
If the test is still running, it should be marked as "In Progress".
If the test has finished, it should be marked as Pass or Fail depending upon its result, and its end time should be displayed.
