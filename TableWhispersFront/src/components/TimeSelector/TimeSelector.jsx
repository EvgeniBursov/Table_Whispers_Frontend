import React, { useState, useRef, useEffect } from 'react';
import './TimeSelector.css';

const TimeSelector = ({ value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedHour, setSelectedHour] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('AM');
  const dropdownRef = useRef(null);
  
  // Hours array for dropdown (01-12)
  const hours = Array.from({ length: 12 }, (_, i) => {
    const hour = i + 1;
    return hour < 10 ? `0${hour}` : `${hour}`;
  });
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Parse the value prop (in 24-hour format) to set initial state
  useEffect(() => {
    if (value) {
      const [hour24] = value.split(':');
      const hour24Int = parseInt(hour24, 10);
      
      if (hour24Int === 0) {
        setSelectedHour('12');
        setSelectedPeriod('AM');
      } else if (hour24Int === 12) {
        setSelectedHour('12');
        setSelectedPeriod('PM');
      } else if (hour24Int > 12) {
        const hour12 = hour24Int - 12;
        setSelectedHour(hour12 < 10 ? `0${hour12}` : `${hour12}`);
        setSelectedPeriod('PM');
      } else {
        setSelectedHour(hour24Int < 10 ? `0${hour24Int}` : `${hour24Int}`);
        setSelectedPeriod('AM');
      }
    } else {
      setSelectedHour('');
      setSelectedPeriod('AM');
    }
  }, [value]);
  
  // Convert selected 12-hour time to 24-hour format and call onChange
  const handleTimeSelection = (hour, period) => {
    setSelectedHour(hour);
    setSelectedPeriod(period);
    
    let hour24 = parseInt(hour, 10);
    
    if (period === 'PM' && hour24 !== 12) {
      hour24 += 12;
    } else if (period === 'AM' && hour24 === 12) {
      hour24 = 0;
    }
    
    const hour24Str = hour24 < 10 ? `0${hour24}` : `${hour24}`;
    
    onChange(`${hour24Str}:00`);
    setIsOpen(false);
  };
  
  // Toggle dropdown
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };
  
  // Display value
  const displayValue = selectedHour 
    ? `${selectedHour} ${selectedPeriod}` 
    : placeholder || 'Select time';
  
  return (
    <div className="time-selector-container" ref={dropdownRef}>
      <div 
        className="time-selector-display" 
        onClick={toggleDropdown}
      >
        {displayValue}
        <span className="time-selector-arrow">▼</span>
      </div>
      
      {isOpen && (
        <div className="time-selector-dropdown">
          <div className="time-selector-columns">
            <div className="time-selector-column hours-column">
              {hours.map(hour => (
                <div 
                  key={hour}
                  className={`time-selector-option ${selectedHour === hour ? 'selected' : ''}`}
                  onClick={() => handleTimeSelection(hour, selectedPeriod)}
                >
                  {hour}
                </div>
              ))}
            </div>
            
            <div className="time-selector-column period-column">
              <div 
                className={`time-selector-option ${selectedPeriod === 'AM' ? 'selected' : ''}`}
                onClick={() => handleTimeSelection(selectedHour || '12', 'AM')}
              >
                AM
              </div>
              <div 
                className={`time-selector-option ${selectedPeriod === 'PM' ? 'selected' : ''}`}
                onClick={() => handleTimeSelection(selectedHour || '12', 'PM')}
              >
                PM
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeSelector;