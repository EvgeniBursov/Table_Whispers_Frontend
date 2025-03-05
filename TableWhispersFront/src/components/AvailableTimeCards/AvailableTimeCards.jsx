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

  return (
    <div className="available-time-cards">
      {availableTimes.map((timeSlot) => {
        // Extract hour and minutes for 24-hour format display
        const [hours, minutes] = timeSlot.time.split(':');
        const formattedTime = `${hours}:${minutes}`;
        
        const isSelected = selectedTime === timeSlot.time;
        
        // Determine table info text based on type
        let tableInfoText;
        if (type === 'bar') {
          tableInfoText = 'Bar';
        } else if (timeSlot.availableTables === 1) {
          tableInfoText = 'Last table!';
        } else {
          tableInfoText = `${timeSlot.availableTables} tables`;
        }
        
        return (
          <div 
            key={timeSlot.time}
            className={`time-card ${isSelected ? 'selected' : ''} ${
              timeSlot.availableTables === 1 ? 'last-table' : ''
            }`}
            onClick={(e) => {
              // Stop event propagation to prevent the restaurant card click from triggering
              e.stopPropagation();
              onSelectTime(timeSlot.time);
            }}
          >
            <div className="time">{formattedTime}</div>
            <div className="table-info">
              <span className={`dot ${type === 'bar' ? 'bar-dot' : ''}`}></span>
              {tableInfoText}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AvailableTimeCards;