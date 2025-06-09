import React from 'react';
import './AvailableTimeCards.css';

/**
 * Component to display available time slots as selectable cards
 * 
 * @param {Array} availableTimes - Array of time slot objects with time and availableTables properties
 * @param {Function} onSelectTime - Function to call when a time is selected
 * @param {String} selectedTime - Currently selected time
 * @param {String} type - Type of seating ('table' or 'bar')
 */
const AvailableTimeCards = ({ availableTimes, onSelectTime, selectedTime, type = 'table' }) => {
  // If no times available, show a message
  if (!availableTimes || availableTimes.length === 0) {
    return (
      <div className="no-times-available">
        <p>No available times for this date</p>
      </div>
    );
  }

  // Function to get availability class based on table count
  const getAvailabilityClass = (availableTables) => {
    if (availableTables === 1) return 'low-availability';
    if (availableTables <= 3) return 'medium-availability';
    return 'high-availability';
  };

  return (
    <div className="available-time-cards">
      {availableTimes.map((timeSlot) => {
        // Handle both object format {time: "14:30", availableTables: 3} and string format "14:30"
        const time = typeof timeSlot === 'string' ? timeSlot : timeSlot.time;
        const availableTables = typeof timeSlot === 'object' ? (timeSlot.availableTables || 1) : 1;
        
        // Extract hour and minutes for 24-hour format display
        const [hours, minutes] = time.split(':');
        const formattedTime = `${hours}:${minutes}`;
        
        const isSelected = selectedTime === time;
        
        // Determine table info text based on type and availability
        let tableInfoText;
        if (type === 'bar') {
          tableInfoText = 'Bar';
        } else if (availableTables === 1) {
          tableInfoText = 'Last table!';
        } else if (availableTables <= 3) {
          tableInfoText = `${availableTables} tables left`;
        } else {
          tableInfoText = `${availableTables} tables`;
        }
        
        return (
          <div 
            key={time}
            className={`time-card ${isSelected ? 'selected' : ''} ${getAvailabilityClass(availableTables)}`}
            onClick={(e) => {
              // Stop event propagation to prevent the restaurant card click from triggering
              e.stopPropagation();
              onSelectTime(time);
            }}
          >
            <div className="time">{formattedTime}</div>
            <div className="table-info">
              <span className={`dot ${type === 'bar' ? 'bar-dot' : ''}`}></span>
              {tableInfoText}
              {availableTables === 1 && type !== 'bar' && (
                <span className="urgency-warning">⚠️</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AvailableTimeCards;