import React, { Suspense, lazy, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import ProtectedRoute from "./components/common/ProtectedRoute";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { PageLoadingFallback } from "./components/common/SkeletonLoader";

const Home = lazy(() => import("./pages/Home"));
const AuthPage = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Practice = lazy(() => import("./pages/Practice"));
const YouTubeHub = lazy(() => import("./pages/YouTubeHub"));
const Prephub = lazy(() => import("./pages/Prephub"));
const Settings = lazy(() => import("./pages/Settings"));
const PlaylistDetails = lazy(() => import("./pages/PlaylistDetails"));
const PlaylistPlayer = lazy(() => import("./pages/PlaylistPlayer"));

const PROTECTED_ROUTES = [
  {
    path: "/dashboard",
    element: <Dashboard />,
  },
  {
    path: "/practice",
    element: <Practice />,
  },
  {
    path: "/youtube",
    element: <YouTubeHub />,
  },
  {
    path: "/library",
    element: <YouTubeHub />,
  },
  {
    path: "/prephub",
    element: <Prephub />,
  },
  {
    path: "/profile",
    element: <Navigate to="/settings" replace />,
  },
  {
    path: "/settings",
    element: <Settings />,
  },
  {
    path: "/playlist/:id",
    element: <PlaylistDetails />,
  },
  {
    path: "/playlist/:playlistId/video/:videoId",
    element: <PlaylistPlayer />,
  },
];

const PAGE_TITLES = {
  "/": "StudyBuddy | Developer Learning Ecosystem & Practice Hub",
  "/practice": "Practice Studio — Striver SDE, NeetCode & CP Sheets | StudyBuddy",
  "/youtube": "Ad-Free YouTube Courses & Video Workspace | StudyBuddy",
  "/library": "Your Learning Library | StudyBuddy",
  "/prephub": "Prephub — CS Core Subjects & Interview Roadmap | StudyBuddy",
  "/dashboard": "Dashboard & Activity Heatmap | StudyBuddy",
  "/settings": "Account Settings & Preferences | StudyBuddy",
  "/login": "Sign In | StudyBuddy",
  "/signup": "Create Account | StudyBuddy",
};

function PageRouteHandler() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    const matchedTitle =
      PAGE_TITLES[pathname] ||
      (pathname.startsWith("/playlist/") ? "Course Player | StudyBuddy" : "StudyBuddy | Code, Study & Track");
    document.title = matchedTitle;
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <PageRouteHandler />
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/signup" element={<AuthPage />} />

            {PROTECTED_ROUTES.map(({ path, element }) => (
              <Route
                key={path}
                path={path}
                element={<ProtectedRoute>{element}</ProtectedRoute>}
              />
            ))}

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </ErrorBoundary>
  );
}
