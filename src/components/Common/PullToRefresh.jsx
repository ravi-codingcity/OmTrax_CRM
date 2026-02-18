import { useState, useRef, useCallback, useEffect } from 'react';
import { hapticLight, isNative } from '../../utils/capacitor';

const PullToRefresh = ({ onRefresh, children, className = '', disabled = false }) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef(null);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const canPullRef = useRef(false);

  const PULL_THRESHOLD = 70;
  const MAX_PULL = 100;

  // Check if at top of scroll
  const isAtTop = useCallback(() => {
    if (!containerRef.current) return false;
    return window.scrollY === 0 || containerRef.current.scrollTop === 0;
  }, []);

  const handleTouchStart = useCallback((e) => {
    if (disabled || isRefreshing) return;
    
    if (isAtTop()) {
      startYRef.current = e.touches[0].clientY;
      canPullRef.current = true;
    } else {
      canPullRef.current = false;
    }
  }, [disabled, isRefreshing, isAtTop]);

  const handleTouchMove = useCallback((e) => {
    if (disabled || !canPullRef.current || isRefreshing) return;

    currentYRef.current = e.touches[0].clientY;
    const diff = currentYRef.current - startYRef.current;

    if (diff > 0 && isAtTop()) {
      // Use resistance curve for more natural feel
      const resistance = 0.4;
      const distance = Math.min(diff * resistance, MAX_PULL);
      
      if (distance > 5) {
        setIsPulling(true);
        setPullDistance(distance);

        // Trigger haptic when crossing threshold
        if (distance >= PULL_THRESHOLD && pullDistance < PULL_THRESHOLD) {
          hapticLight();
        }
      }
    }
  }, [disabled, isRefreshing, isAtTop, pullDistance]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || disabled) return;

    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      hapticLight();
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh error:', error);
      }
      
      setIsRefreshing(false);
    }

    setIsPulling(false);
    setPullDistance(0);
    canPullRef.current = false;
  }, [isPulling, pullDistance, isRefreshing, onRefresh, disabled]);

  // Add touch event listeners with passive: false for preventDefault support
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const touchMoveHandler = (e) => {
      if (isPulling && pullDistance > 5) {
        e.preventDefault();
      }
      handleTouchMove(e);
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', touchMoveHandler, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', touchMoveHandler);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, isPulling, pullDistance]);

  const pullProgress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const showIndicator = pullDistance > 10 || isRefreshing;

  // Only show on native platforms or mobile
  if (!isNative() && window.innerWidth > 768) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{ 
        minHeight: '100%',
        overscrollBehavior: 'contain',
      }}
    >
      {/* Pull indicator */}
      <div
        className={`absolute left-0 right-0 flex items-center justify-center transition-all duration-200 z-50 ${
          showIndicator ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          top: -60,
          transform: `translateY(${pullDistance}px)`,
        }}
      >
        <div className={`bg-white rounded-full shadow-lg p-2 ${isRefreshing ? 'animate-pulse' : ''}`}>
          <svg
            className={`w-6 h-6 text-blue-500 transition-transform duration-200 ${isRefreshing ? 'animate-spin' : ''}`}
            style={{
              transform: isRefreshing ? 'rotate(0deg)' : `rotate(${pullProgress * 360}deg)`,
            }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {isRefreshing ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            )}
          </svg>
        </div>
      </div>

      {/* Content with transform */}
      <div
        className="transition-transform duration-200"
        style={{
          transform: isPulling || isRefreshing ? `translateY(${pullDistance}px)` : 'translateY(0)',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
