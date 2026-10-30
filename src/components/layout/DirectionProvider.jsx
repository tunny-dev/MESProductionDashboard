import { createContext, useContext, useEffect, useState } from 'react';
import { getCookie, setCookie, removeCookie } from '@/core/utils/cookies';

const DEFAULT_DIRECTION = 'ltr';
const DIRECTION_COOKIE_NAME = 'dir';
const DIRECTION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const DirectionContext = createContext(null);

export function DirectionProvider({ children }) {
  const [dir, setDirState] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_DIRECTION;
    return getCookie(DIRECTION_COOKIE_NAME) || DEFAULT_DIRECTION;
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const htmlElement = document.documentElement;
      htmlElement.setAttribute('dir', dir);
    }
  }, [dir]);

  const updateDirection = (newDir) => {
    setDirState(newDir);
    if (typeof window !== 'undefined') {
      setCookie(DIRECTION_COOKIE_NAME, newDir, DIRECTION_COOKIE_MAX_AGE);
    }
  };

  const resetDir = () => {
    setDirState(DEFAULT_DIRECTION);
    if (typeof window !== 'undefined') {
      removeCookie(DIRECTION_COOKIE_NAME);
    }
  };

  return (
    <DirectionContext.Provider
      value={{
        defaultDir: DEFAULT_DIRECTION,
        dir,
        setDir: updateDirection,
        resetDir,
      }}
    >
      <div dir={dir} className="contents">
        {children}
      </div>
    </DirectionContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDirection() {
  const context = useContext(DirectionContext);
  if (!context) {
    throw new Error('useDirection must be used within a DirectionProvider');
  }
  return context;
}
