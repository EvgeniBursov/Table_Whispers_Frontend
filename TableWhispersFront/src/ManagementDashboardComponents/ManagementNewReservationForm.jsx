import React, { useState } from 'react';
import TableReservation from '../components/TableReservation/TableReservation';
import './ManagementDashboardCSS/MngNewReservationForm.css';

const ManagementNewReservationForm = ({ 
  restaurantId, 
  restaurantData, 
  onSave, 
  onCancel 
}) => {
  // Using restaurant data passed from parent component
  const restaurantName = restaurantData?.res_name || restaurantData?.name || 'Restaurant';
  
  // Get today's date as default
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="mng-new-reservation-form">
      <div className="mng-form-header">
        <h2>Add New Reservation</h2>
        <button className="mng-form-close-btn" onClick={onCancel}>×</button>
      </div>
      
      <div className="mng-form-content">
        <TableReservation 
          restaurantId={restaurantId}
          restaurantName={restaurantName}
          initialDate={today}
          initialTime=""
          initialPeople={2}
          onReservationComplete={(newReservation) => {
            // Pass the new reservation data to parent component
            onSave(newReservation);
            
            // Close the form after successful reservation with a slight delay
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