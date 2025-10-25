import React, { useRef, useEffect, useState, useCallback } from 'react';
import './PieChartCarousel.css';
import ShipmentPieChart from '../PieCharts/ShipmentPieChart';
import FinancePieChart from '../PieCharts/FinancePieChart';
import TruckingPieChart from '../PieCharts/TruckingPieChart';
import ContainerStatusPieChart from '../PieCharts/ContainerStatusPieChart';
import VerifierPieChart from '../PieCharts/VerifierPieChart';

const PieChartCarousel = () => {
  const carouselRef = useRef(null);
  const trackRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const charts = [
    {
      id: 'shipment',
      title: 'Shipment Status',
      component: ShipmentPieChart,
      description: 'Document processing status'
    },
    {
      id: 'finance',
      title: 'Finance Status',
      component: FinancePieChart,
      description: 'Payment completion status'
    },
    {
      id: 'trucking',
      title: 'Trucking Status',
      component: TruckingPieChart,
      description: 'Container operations status'
    },
    {
      id: 'container',
      title: 'Container Status',
      component: ContainerStatusPieChart,
      description: 'Container location status'
    },
    {
      id: 'verifier',
      title: 'Verifier Status',
      component: VerifierPieChart,
      description: 'Conflict resolution status'
    }
  ];

  // Get responsive settings based on screen size
  const getResponsiveSettings = useCallback(() => {
    const isMobile = window.innerWidth <= 768;
    const isTablet = window.innerWidth <= 1200 && window.innerWidth > 768;
    
    if (isMobile) {
      return { slidesToShow: 1, slideWidth: 100 };
    } else if (isTablet) {
      return { slidesToShow: 2, slideWidth: 50 };
    } else {
      return { slidesToShow: 3, slideWidth: 33.333 };
    }
  }, []);

  // Auto-scroll functionality
  useEffect(() => {
    if (!isAutoScrolling) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % charts.length;
        return nextIndex;
      });
    }, 4000); // Change slide every 4 seconds

    return () => clearInterval(interval);
  }, [isAutoScrolling, charts.length]);

  // Handle window resize to adjust carousel behavior
  useEffect(() => {
    const handleResize = () => {
      // Force re-render to adjust carousel layout
      setCurrentIndex(prev => prev);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update carousel position when currentIndex changes
  useEffect(() => {
    if (trackRef.current) {
      const settings = getResponsiveSettings();
      const translateX = -(currentIndex * (100 / settings.slidesToShow));
      trackRef.current.style.transform = `translateX(${translateX}%)`;
    }
  }, [currentIndex, getResponsiveSettings]);

  const handlePrev = () => {
    const prevIndex = currentIndex === 0 ? charts.length - 1 : currentIndex - 1;
    setCurrentIndex(prevIndex);
    setIsAutoScrolling(false);
  };

  const handleNext = () => {
    const nextIndex = (currentIndex + 1) % charts.length;
    setCurrentIndex(nextIndex);
    setIsAutoScrolling(false);
  };

  const handleDotClick = (index) => {
    setCurrentIndex(index);
    setIsAutoScrolling(false);
  };

  const handleChartClick = (index) => {
    if (index !== currentIndex) {
      setCurrentIndex(index);
      setIsAutoScrolling(false);
    }
  };

  // Touch event handlers for swipe functionality
  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
    setIsAutoScrolling(false);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  const handleMouseEnter = () => {
    setIsAutoScrolling(false);
  };

  const handleMouseLeave = () => {
    setIsAutoScrolling(true);
  };

  return (
    <div className="pie-chart-carousel">
      <div className="carousel-header">
        <h3>Department Status Overview</h3>
      </div>
      
      <div className="carousel-wrapper">
        {/* Navigation Arrows */}
        <button 
          className="carousel-nav carousel-nav-prev" 
          onClick={handlePrev}
          aria-label="Previous chart"
        >
          ‹
        </button>
        
        <button 
          className="carousel-nav carousel-nav-next" 
          onClick={handleNext}
          aria-label="Next chart"
        >
          ›
        </button>

        {/* Carousel Container */}
        <div 
          className="carousel-container"
          ref={carouselRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="charts-track" ref={trackRef}>
            {charts.map((chart, index) => {
              const ChartComponent = chart.component;
              const settings = getResponsiveSettings();
              const slideWidth = settings.slideWidth;
              
              return (
                <div 
                  key={chart.id} 
                  className={`chart-slide ${index === currentIndex ? 'active' : ''} ${index !== currentIndex ? 'clickable' : ''}`}
                  style={{ width: `${slideWidth}%` }}
                  onClick={() => handleChartClick(index)}
                  role="button"
                  tabIndex={0}
                  aria-label={`View ${chart.title} chart`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleChartClick(index);
                    }
                  }}
                >
                  <div className="chart-wrapper">
                    <ChartComponent />
                  </div>
                  <div className="chart-info">
                    <h4 className="chart-title">{chart.title}</h4>
                    <p className="chart-description">{chart.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dots Indicator */}
        <div className="carousel-dots">
          {charts.map((_, index) => (
            <button
              key={index}
              className={`carousel-dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => handleDotClick(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PieChartCarousel;
