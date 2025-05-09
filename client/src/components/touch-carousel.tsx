import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { motion, PanInfo, useAnimation } from 'framer-motion';
import { useDeviceDetection } from '@/hooks/use-device-detection';
import haptics from '@/lib/haptics';

interface TouchCarouselProps {
  children: ReactNode[];
  className?: string;
  slideClassName?: string;
  showDots?: boolean;
  loop?: boolean;
  autoplay?: boolean;
  autoplayInterval?: number;
  slideSpacing?: number;
  snapThreshold?: number;
  onChange?: (index: number) => void;
}

/**
 * TouchCarousel - A premium touch-optimized carousel component
 * Features:
 * - Smooth physics-based animations
 * - Haptic feedback
 * - iOS-like momentum and bounce
 * - Snap points and pagination
 * - Autoplay with pause on touch
 */
export function TouchCarousel({
  children,
  className = '',
  slideClassName = '',
  showDots = true,
  loop = false,
  autoplay = false,
  autoplayInterval = 5000,
  slideSpacing = 16,
  snapThreshold = 0.2,
  onChange
}: TouchCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideWidth, setSlideWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const slideCount = children.length;
  const controls = useAnimation();
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const device = useDeviceDetection();
  
  // Calculate dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        setContainerWidth(width);
        setSlideWidth(width);
      }
    };
    
    updateDimensions();
    
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);
  
  // Handle autoplay
  useEffect(() => {
    const startAutoplay = () => {
      if (autoplay && slideCount > 1) {
        autoplayTimerRef.current = setInterval(() => {
          goToSlide((currentIndex + 1) % slideCount);
        }, autoplayInterval);
      }
    };
    
    const stopAutoplay = () => {
      if (autoplayTimerRef.current) {
        clearInterval(autoplayTimerRef.current);
        autoplayTimerRef.current = null;
      }
    };
    
    if (!isDragging) {
      startAutoplay();
    } else {
      stopAutoplay();
    }
    
    return stopAutoplay;
  }, [autoplay, autoplayInterval, currentIndex, isDragging, slideCount]);
  
  // Handle slide navigation
  const goToSlide = (index: number) => {
    const boundedIndex = loop
      ? ((index % slideCount) + slideCount) % slideCount
      : Math.max(0, Math.min(index, slideCount - 1));
    
    // Don't animate if we're already at this index
    if (boundedIndex === currentIndex) return;
    
    setCurrentIndex(boundedIndex);
    
    // Animate to the target position
    controls.start({
      x: -boundedIndex * (slideWidth + slideSpacing),
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 60
      }
    });
    
    // Trigger haptic feedback on slide change
    if (device.isMobile) {
      haptics.selectionChange();
    }
    
    // Call onChange callback
    if (onChange) {
      onChange(boundedIndex);
    }
  };
  
  // Handle pan gesture start
  const handleDragStart = () => {
    setIsDragging(true);
    
    // Optional: add haptic feedback on drag start
    if (device.isMobile) {
      haptics.subtle();
    }
  };
  
  // Handle pan gesture end
  const handleDragEnd = (e: any, info: PanInfo) => {
    setIsDragging(false);
    
    const velocity = info.velocity.x;
    const offset = info.offset.x;
    
    // Determine the target slide based on drag distance and velocity
    let targetIndex = currentIndex;
    
    // Fast swipe detection (high velocity)
    if (Math.abs(velocity) > 500) {
      targetIndex = velocity > 0 ? currentIndex - 1 : currentIndex + 1;
    } 
    // Regular drag (threshold-based)
    else if (Math.abs(offset) > slideWidth * snapThreshold) {
      targetIndex = offset > 0 ? currentIndex - 1 : currentIndex + 1;
    }
    
    // Handle boundaries if not looping
    if (!loop) {
      targetIndex = Math.max(0, Math.min(targetIndex, slideCount - 1));
    }
    
    // Go to the calculated slide
    goToSlide(targetIndex);
    
    // Optional: add haptic feedback on slide change
    if (targetIndex !== currentIndex && device.isMobile) {
      haptics.selectionChange();
    }
  };
  
  return (
    <div className={`touch-carousel relative overflow-hidden ${className}`} ref={containerRef}>
      <motion.div
        className="flex"
        drag="x"
        dragConstraints={{ left: -((slideCount - 1) * (slideWidth + slideSpacing)), right: 0 }}
        dragElastic={0.1}
        animate={controls}
        initial={{ x: 0 }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        style={{ gap: `${slideSpacing}px` }}
      >
        {children.map((child, index) => (
          <div
            key={index}
            className={`touch-carousel-slide flex-shrink-0 ${slideClassName}`}
            style={{ width: slideWidth }}
          >
            {child}
          </div>
        ))}
      </motion.div>
      
      {/* Pagination dots */}
      {showDots && slideCount > 1 && (
        <div className="flex justify-center mt-4 gap-2">
          {Array.from({ length: slideCount }).map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'bg-brown-dark scale-125'
                  : 'bg-brown/30'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}