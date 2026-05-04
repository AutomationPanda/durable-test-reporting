# Brain dump

This file contains a brain dump for the start of this project.
Use it to set up product, engineering, and feature spec files under `specs/`.


## Goal

I want to create a dashboard that reports live test results from a test suite as it is executing.
It should show when a test has started, when it has ended, and what its final result is (Pass/Fail).
The dashboard should be a web app.
The automated tests should publish results to the dashboard's service in real time as they execute, probably with hooks.
To make the result publishing "durable", the test automation should use Temporal workflows and activities.
That way, if the dashboard ever becomes unavailable, results won't be lost.


## Name

The name of the dashboard should be "Dashing".


## Tech stack

Dashboard should be a **full-stack Node.js** application written in **TypeScript**.

| Layer    | Choice     | Notes           |
| -------- | ---------- | --------------- |
| Frontend | React      | UI components   |
| Styling  | Tailwind   | CSS framework   |
| Backend  | Express    | API and server  |
| Database | SQLite     | Persistence     |


## Workflow

The "specs" folder should have a "features" folder.
The features folder should have a set of Markdown files, where each one represents the specs for a feature to add to the app.
The workflow is that the human should write each feature file with a user story, descriptions, and acceptance criteria.
Then, the human should direct the AI to implement the feature described in the Markdown file into the app.
