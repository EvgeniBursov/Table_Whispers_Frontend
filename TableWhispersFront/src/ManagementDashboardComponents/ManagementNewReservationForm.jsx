import React from 'react';
import TableReservation from '../components/TableReservation/TableReservation';
import './ManagementDashboardCSS/MngNewReservationForm.css';

const ManagementNewReservationForm = ({ 
  restaurantId, 
  restaurantData, 
  tableNumber,  
  tableId,    
  onSave, 
  onCancel,
  isManagementReservation,
  isManagementReservationList 
}) => {
  // Using restaurant data passed from parent component
  const restaurantName = restaurantData?.res_name || restaurantData?.name || 'Restaurant';
  
  // Get today's date as default
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="mng-new-reservation-form">
      <div className="mng-form-header">
        <h2>Add New Reservation {tableNumber ? `- Table ${tableNumber.table_number}` : ''}</h2>
        <button className="mng-form-close-btn" onClick={onCancel}>×</button>
      </div>
      <div className="mng-form-content">
        <TableReservation 
            restaurantId={restaurantId}
            restaurantName={restaurantName}
            initialDate={today}
            initialTime=""
            initialPeople={2}
            initialTable={tableNumber}
            tableId={tableNumber?.id || tableNumber?._id}
            tableNumber={tableNumber?.table_number}
            isManagementReservation={isManagementReservation}
            isManagementReservationList={isManagementReservationList} 
            onReservationComplete={(newReservation) => {
              // Make sure tableId and tableNumber are included
              const completeReservation = {
                ...newReservation,
                tableId: tableNumber?.id || tableNumber?._id,
                tableNumber: tableNumber?.table_number
              };
              onSave(completeReservation);
            
              setTimeout(() => {
                onCancel();
              }, 3000);
            }}
          />
      </div>
    </div>
  );
};

export default ManagementNewReservationForm;