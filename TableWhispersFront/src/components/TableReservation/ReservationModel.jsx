import React, { useState, useEffect } from 'react';
import TableReservation from './TableReservation';
import './TableReservation.css'; // Using the shared CSS file

/**
 * Enhanced mobile-friendly modal popup for table reservation
 */
const ReservationModal = ({ 
  isOpen, 
  onClose, 
  restaurantId, 
  restaurantName,
  selectedDate,
  selectedTime: initialSelectedTime,
  selectedPeople
}) => {
  // Add state for selected time
  const [selectedTime, setSelectedTime] = useState(initialSelectedTime || '');

  // Update the time when selected from outside
  useEffect(() => {
    if (initialSelectedTime) {
      setSelectedTime(initialSelectedTime);
    }
  }, [initialSelectedTime]);
  
  // Prevent scrolling on body when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
      
      // Add event listener for back button/escape key
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      
      window.addEventListener('keydown', handleEscape);
      
      // Clean up
      return () => {
        document.body.classList.remove('modal-open');
        window.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Handle background click to close the modal
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // This is the important function that handles time selection
  const handleTimeSelection = (time) => {
    setSelectedTime(time);
  };
  
  return (
    <div className="reservation-modal-container" onClick={handleOverlayClick}>
      <div className="reservation-modal-overlay"></div>
      <div className="reservation-modal-content">
        <div className="reservation-modal-header">
          <h2>Reserve at {restaurantName}</h2>
          <button 
            className="reservation-modal-close"
            onClick={onClose}
            aria-label="Close reservation modal"
          >
            ×
          </button>
        </div>
        
        <div className="reservation-modal-body">
          <TableReservation 
            restaurantId={restaurantId}
            restaurantName={restaurantName}
            initialDate={selectedDate}
            initialTime={selectedTime}
            initialPeople={selectedPeople}
            onTimeSelect={handleTimeSelection}
            onReservationComplete={() => {
              // Close the modal after successful reservation
              setTimeout(() => {
                onClose();
              }, 5000); // Close after 5 seconds of showing confirmation
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ReservationModal;