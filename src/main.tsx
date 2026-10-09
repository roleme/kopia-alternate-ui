import "@fontsource-variable/nunito";
import "@mantine/core/styles.layer.css";
import "@mantine/dates/styles.layer.css";
import "@mantine/notifications/styles.layer.css";
import "mantine-datatable/styles.layer.css";
import "@mantine/charts/styles.layer.css";
import { lazy, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import BaseLayout from "./BaseLayout.tsx";
import "./index.css";

const PoliciesPage = lazy(() => import("./policies/PoliciesPage.tsx"));
const PreferencesPage = lazy(() => import("./preferences/PreferencesPage.tsx"));
const RepoPage = lazy(() => import("./repo/RepoPage.tsx"));
const SnapshotComparePage = lazy(() => import("./snapshot-compare/SnapshotComparePage.tsx"));
const SnapshotDirectory = lazy(() => import("./snapshot-directory/SnapshotDirectory.tsx"));
const SnapshotHistory = lazy(() => import("./snapshot-history/SnapshotHistory.tsx"));
const SnapshotMountsPage = lazy(() => import("./snapshot-mounts/SnapshotMountsPage.tsx"));
const SnapshotsPage = lazy(() => import("./snapshots/SnapshotsPage.tsx"));
const TaskDetailsPage = lazy(() => import("./tasks/TaskDetailsPage.tsx"));
const TasksPage = lazy(() => import("./tasks/TasksPage.tsx"));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<BaseLayout />}>
          <Route path="/snapshots" element={<SnapshotsPage />} />
          <Route path="/snapshots/single-source" element={<SnapshotHistory />} />
          <Route path="/snapshots/dir/:oid" element={<SnapshotDirectory />} />
          <Route path="/snapshots/compare" element={<SnapshotComparePage />} />
          <Route path="/mounts" element={<SnapshotMountsPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/tasks/:tid" element={<TaskDetailsPage />} />
          <Route path="/policies" element={<PoliciesPage />} />
          <Route path="/preferences" element={<PreferencesPage />} />
          <Route path="/repo" element={<RepoPage />} />
          <Route path="/" element={<Navigate to="/snapshots" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
