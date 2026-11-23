import { lazy, Suspense, useEffect, type ComponentType } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigationType,
} from 'react-router';

/**
 * A lazy page. After a deploy an open tab still asks for the old page files, which are gone;
 * the import then fails and the screen would stay blank, so reload once to get the new build.
 */
const RELOADED = 'reloaded-for-new-build';
const page = (load: () => Promise<{ default: ComponentType }>) =>
  lazy(() =>
    load().then(
      (m) => {
        // Loaded fine, so the next deploy may reload again. (No sessionStorage in the prerender.)
        if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(RELOADED);
        return m;
      },
      (e: unknown) => {
        if (sessionStorage.getItem(RELOADED)) throw e; // already tried: a real failure
        sessionStorage.setItem(RELOADED, '1');
        location.reload();
        return new Promise<never>(() => {}); // hold the old page until the reload lands
      },
    ),
  );

const Landing = page(() => import('@/pages/landing'));
const HowToPlay = page(() => import('@/pages/how-to-play'));
const Guide = page(() => import('@/pages/guide'));
const Play = page(() => import('@/pages/play'));
const Room = page(() => import('@/pages/room'));
const Rooms = page(() => import('@/pages/rooms'));

/** A link to another page starts it at the top; Back and Forward keep the browser's own position. */
function ScrollToTop() {
  const { pathname } = useLocation();
  const type = useNavigationType();
  useEffect(() => {
    if (type === 'POP') return;
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
  }, [pathname, type]);
  return null;
}

/** The route tree, shared by the browser app and the build-time prerender. */
export function AppRoutes() {
  return (
    <Suspense fallback={null}>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/how-to-play" element={<HowToPlay />} />
        <Route path="/how-to-play/:game" element={<Guide />} />
        <Route path="/play" element={<Play />} />
        <Route path="/rooms" element={<Rooms />} />
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
