import { useState, useEffect } from 'react';

export interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  viewportWidth: number;
}

export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>(() => {
    const w = window.innerWidth;
    return {
      isMobile: w < 768,
      isTablet: w >= 768 && w < 1024,
      isDesktop: w >= 1024,
      viewportWidth: w,
    };
  });

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const mql2 = window.matchMedia('(max-width: 1023px)');

    const update = () => {
      const w = window.innerWidth;
      setState({
        isMobile: mql.matches,
        isTablet: mql2.matches && !mql.matches,
        isDesktop: !mql2.matches,
        viewportWidth: w,
      });
    };

    mql.addEventListener('change', update);
    mql2.addEventListener('change', update);

    return () => {
      mql.removeEventListener('change', update);
      mql2.removeEventListener('change', update);
    };
  }, []);

  return state;
}
