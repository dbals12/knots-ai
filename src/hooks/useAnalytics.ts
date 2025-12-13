import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { initAnalytics, trackPageView } from '@/lib/analytics';

/**
 * Hook to initialize analytics and track page views
 * Should be used once at the app root level
 */
export function useAnalytics() {
  const location = useLocation();

  // Initialize analytics on mount
  useEffect(() => {
    initAnalytics();
  }, []);

  // Track page views on route change
  useEffect(() => {
    trackPageView(location.pathname, document.title);
  }, [location.pathname]);
}

export default useAnalytics;
