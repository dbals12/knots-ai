import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { initAnalytics } from '@/lib/analytics';
import { parseAndStoreAcquisition } from '@/lib/acquisition';
import track from '@/lib/track';

/**
 * Hook to initialize analytics and track page views.
 * Should be used once at the app root level.
 */
export function useAnalytics() {
  const location = useLocation();

  // Initialize GA4 + Meta Pixel + parse acquisition context on mount
  useEffect(() => {
    parseAndStoreAcquisition();
    initAnalytics();
  }, []);

  // Track page views on route change
  useEffect(() => {
    track.pageView(location.pathname);
  }, [location.pathname]);
}

export default useAnalytics;
