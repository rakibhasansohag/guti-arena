import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';

const Landing = lazy(() => import('@/pages/landing'));
const HowToPlay = lazy(() => import('@/pages/how-to-play'));
const Play = lazy(() => import('@/pages/play'));
const Room = lazy(() => import('@/pages/room'));

/** The route tree, shared by the browser app and the build-time prerender. */
export function AppRoutes() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/how-to-play" element={<HowToPlay />} />
        <Route path="/play" element={<Play />} />
        <Route path="/r/:code" element={<Room />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
