import React, { useEffect } from 'react';
import TableReservation from './TableReservation';

const ReservationModal = ({ 
  isOpen, 
  onClose, 
  restaurantId, 
  restaurantName, 
  selectedTable, 
  selectedDate 
}) => {
  // Prevent scrolling on body when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
      
      // Handle escape key
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      
      window.addEventListener('keydown', handleEscape);
      
      return () => {
        document.body.classList.remove('modal-open');
        window.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  // Handle background click
  const handleBackgroundClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  return (
    <div className="mgt-modal-overlay" onClick={handleBackgroundClick}>
      <div className="mgt-modal mgt-reservation-modal">
        <div className="mgt-modal-header">
          <h2>Reservation for Table {selectedTable?.table_number}</h2>
          <button 
            className="mgt-modal-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        
        <div className="mgt-modal-content">
          <TableReservation 
            restaurantId={restaurantId}
            restaurantName={restaurantName || "Restaurant"}
            initialDate={selectedDate}
            initialTable={selectedTable}
            onReservationComplete={() => {
              setTimeout(() => {
                onClose();
              }, 5000);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ReservationModal;  