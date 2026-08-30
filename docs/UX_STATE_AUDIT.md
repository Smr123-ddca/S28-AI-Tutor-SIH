# Learnify (S28-AI-Tutor-SIH) — UX State Audit

## Overview
Learnify is an AI tutor platform built with React 19 and Vite, featuring role-based experiences for Students (curriculum chat, grounded citations, practice checks, document library) and Teachers (misconceptions analytics, syllabus file ingestion, cohort remediation). Authentication is managed via Supabase with mock-mode support (`VITE_MOCK_AUTH` and `VITE_USE_MOCKS`).

This audit assesses the UX resilience and state completeness across all application routes:
- `/` (Home / Features)
- `/login` (Authentication & Educator Invite Gate)
- `/dashboard` (Legacy redirect to `/chat`)
- `/chat` (AI Tutor Socratic Workspace)
- `/library` (Curriculum Document Repository)
- `/teacher` (Educator Diagnostics & Ingestion Hub)

---

## UX State Audit Matrix

| State | Status | Evidence (File Path / Route) | Required Action |
|---|---|---|---|
| **404 / Unknown Route** | `APPLICABLE_MISSING` | `Frontend/src/App.jsx:69` (`<Route path="*" element={<Navigate to="/" replace />} />`) | Create a dedicated, accessible `NotFoundPage` (404) with study-app visual tokens, clear navigation actions (Return Home, Open Tutor Chat), and wire it into the router's catch-all route instead of silent redirection. |
| **403 / Permission Denied** | `EXISTS_NEEDS_IMPROVEMENT` | `Frontend/src/components/auth/RequireRole.jsx:46-54`, `Frontend/src/App.jsx:55,63` | Replace silent bounce redirects with clear forbidden handling. Create a reusable `ForbiddenPage` (403) or contextual access-denied state with role switcher/back-to-home actions so users understand why an area is restricted. |
| **500 / Unexpected Error & Global Crash Protection** | `APPLICABLE_MISSING` | `Frontend/src/main.jsx:1-13`, `Frontend/src/App.jsx` | Implement a top-level React `ErrorBoundary` component with a graceful 500 error screen, dev error stack accordion, reload action, and recovery navigation to prevent white-screen crashes. |
| **Loading State (API in-flight)** | `EXISTS_NEEDS_IMPROVEMENT` | `Frontend/src/pages/TeacherDashboard.jsx:35` (loading unused), `Frontend/src/pages/LibraryPage.jsx:26` (no loading state), `Frontend/src/pages/ChatPage.jsx:632` | Build a reusable `LoadingState` component with animated skeleton loaders, spinners, and screen reader announcements (`role="status"`, `aria-busy="true"`). Integrate into `TeacherDashboard`, `LibraryPage`, and `ChatPage`. |
| **Empty State (No initial data)** | `EXISTS_NEEDS_IMPROVEMENT` | `Frontend/src/pages/TeacherDashboard.jsx:375` (empty `<tbody>`), `Frontend/src/pages/LibraryPage.jsx:104` (empty grid), `Frontend/src/pages/ChatPage.jsx:225` (plain text) | Build a reusable `EmptyState` component with thematic illustrations, descriptive guidance, and primary action buttons (e.g., "Ingest Syllabus", "Ask First Doubt"). Integrate across all data-driven views. |
| **No-Results State (Search/filter empty)** | `APPLICABLE_MISSING` | `Frontend/src/pages/LibraryPage.jsx:33-41,104`, `Frontend/src/pages/TeacherDashboard.jsx:111-117` | Create a reusable `NoResultsState` (or configured `EmptyState` variant) displaying the user's active query/filter with a 1-click "Reset Filters" action button. |
| **Error State (Failed API fetch with retry)** | `EXISTS_NEEDS_IMPROVEMENT` | `Frontend/src/pages/TeacherDashboard.jsx:62` (unhandled error catch), `Frontend/src/pages/LibraryPage.jsx:26` (no try/catch/error state), `Frontend/src/components/tutor/MessageBubble.jsx:175` (error has no retry) | Build a reusable `ErrorState` component with error details, visual styling, and an interactive `onRetry` button. Add retry capability to `TeacherDashboard`, `LibraryPage`, and `MessageBubble` in `ChatPage`. |
| **Session Expired (Supabase auth lapse mid-use)** | `EXISTS_NEEDS_IMPROVEMENT` | `Frontend/src/context/AuthContext.jsx:41-50`, `Frontend/src/App.jsx:36-38` | Enhance `AuthContext` and `Login.jsx` to intercept session expiration, clear state safely, and display an explicit "Session Expired" alert on `/login?session_expired=true` without infinite redirect loops. |
| **Offline State (Network-loss detection)** | `APPLICABLE_MISSING` | `Frontend/src/components/layout/AppShell.jsx`, `Frontend/src/App.jsx` | Build a global `useOnlineStatus` hook and an accessible, non-intrusive `OfflineBanner` in `AppShell` alerting users to network disconnection and cached/mock fallback mode. |
| **Legal / Privacy / Terms / Billing / Shipping Pages** | `NOT_APPLICABLE` | Entire codebase (`Frontend/src`, `Backend/src`) | **NOT APPLICABLE**. Learnify is an educational AI tutoring hackathon application without payments, billing, subscriptions, or e-commerce features. No legal, billing, or checkout pages are required or created. |
| **Login Teacher Access Code Form Bug** | `EXISTS_NEEDS_IMPROVEMENT` | `Frontend/src/pages/Login.jsx:49,53,348` | Fix undefined `setRole` call inside `Login.jsx` to prevent runtime error during teacher invitation code verification and toggle. |

---

## Reusable Components Architecture Plan

To ensure consistency and maintain the study-app design system, the following modular UX components will be constructed in `Frontend/src/components/common/`:

1. **`LoadingState.jsx`**:
   - Customizable variants: `spinner`, `skeleton-cards`, `skeleton-table`, `fullscreen`.
   - Screen-reader accessible (`role="status"`, `aria-live="polite"`).
2. **`EmptyState.jsx`**:
   - Configurable icon, title, description, badge/pill, and primary/secondary action buttons.
3. **`NoResultsState.jsx`**:
   - Search/filter empty feedback with active query display and `onReset` handler.
4. **`ErrorState.jsx`**:
   - Visual error container with error title, message, technical details toggle, and `onRetry` callback.
5. **`ErrorBoundary.jsx`**:
   - Class-based React Error Boundary catching unhandled runtime exceptions with 500 fallback UI.
6. **`OfflineBanner.jsx`**:
   - Sticky, floating warning indicator appearing when `navigator.onLine === false`.
7. **`NotFoundPage.jsx` & `ForbiddenPage.jsx`**:
   - Polished 404 & 403 page experiences wired directly into React Router.
