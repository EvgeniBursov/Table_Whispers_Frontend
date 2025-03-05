import React, { useEffect } from 'react';
import TableReservation from './TableReservation';
import './TableReservation.css'; // Using the shared CSS file

/**
 * Enhanced mobile-friendly modal popup for table reservation
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {function} props.onClose - Function to call to close the modal
 * @param {string} props.restaurantId - ID of the restaurant
 * @param {string} props.restaurantName - Name of the restaurant
 * @param {string} props.selectedDate - Selected date (YYYY-MM-DD)
 * @param {string} props.selectedTime - Selected time (HH:MM)
 * @param {number} props.selectedPeople - Number of people for the reservation
 */
const ReservationModal = ({ 
  isOpen, 
  onClose, 
  restaurantId, 
  restaurantName,
  selectedDate,
  selectedTime,
  selectedPeople
}) => {
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