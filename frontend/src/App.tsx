import { type ReactElement } from "react";
import { Route, Routes } from "react-router-dom";
import HomeDashboard from "./HomeDashboard";
import SuiteTestsPage from "./SuiteTestsPage";

export default function App(): ReactElement {
  return (
    <Routes>
      <Route path="/" element={<HomeDashboard />} />
      <Route path="/suites/:suiteUuid/tests" element={<SuiteTestsPage />} />
    </Routes>
  );
}
