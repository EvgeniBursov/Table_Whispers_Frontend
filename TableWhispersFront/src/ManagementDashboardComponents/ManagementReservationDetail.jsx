import React from 'react';
import './ManagementDashboardCSS/MngReservationDetail.css';

// Define the utility functions that are needed
const formatTime12h = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const calculateDuration = (startTime, endTime) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const duration = Math.round((end - start) / (1000 * 60)); // duration in minutes
  return `${duration} min`;
};

const ManagementReservationDetail = ({ reservation, onBack, onUpdateStatus, loading }) => {
  if (!reservation) return null;
  
  // Extract customer and orderDetails from the structure used in the list component
  const customer = reservation.customer || {};
  const orderDetails = reservation.orderDetails || {};
  
  // Check if there are allergies to display
  const hasAllergies = customer.allergies && 
                       Array.isArray(customer.allergies) &&
                       customer.allergies.length > 0;
  
  return (
    <div className="mng-reservation-detail-container">
      <div className="mng-detail-header">
        <button className="mng-back-button" onClick={onBack}>← Back to List</button>
        <h2>Reservation Details</h2>
      </div>
      
      <div className="mng-detail-content">
        <div className="mng-detail-section">
          <h3>Customer Information</h3>
          {/* Display customer image only for registered users */}
          {customer.userType === "registered" && (
            <div className="mng-customer-image-container">
              {customer.profileImage ? (
                <img 
                  src={customer.profileImage} 
                  alt={`${customer.firstName} ${customer.lastName}`}
                  className="mng-customer-profile-image" 
                />
              ) : (
                <div className="mng-customer-profile-placeholder">
                  {customer.firstName && customer.firstName[0]}
                  {customer.lastName && customer.lastName[0]}
                </div>
              )}
            </div>
          )}
          <div className="mng-detail-row">
            <div className="mng-detail-label">Name:</div>
            <div className="mng-detail-value">
              {customer.firstName && customer.lastName ? 
                `${customer.firstName} ${customer.lastName}` : 
                'Not provided'}
            </div>
          </div>
          <div className="mng-detail-row">
            <div className="mng-detail-label">Phone:</div>
            <div className="mng-detail-value">{customer.phone || 'Not provided'}</div>
          </div>
          <div className="mng-detail-row">
            <div className="mng-detail-label">Email:</div>
            <div className="mng-detail-value">{customer.email || 'Not provided'}</div>
          </div>
          
          {hasAllergies && (
            <div className="mng-detail-row">
              <div className="mng-detail-label">Allergies:</div>
              <div className="mng-detail-value">
                <ul className="mng-allergies-list">
                  {customer.allergies.map((allergy, index) => (
                    <li key={index} className="mng-allergy-item">
                      <span className="mng-allergy-name">{allergy.name}</span>
                      {allergy.severity && (
                        <span className={`mng-allergy-severity mng-severity-${allergy.severity.toLowerCase()}`}>
                          {allergy.severity}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
        
        <div className="mng-detail-section">
          <h3>Reservation Information</h3>
          {orderDetails.startTime && (
            <>
              <div className="mng-detail-row">
                <div className="mng-detail-label">Date:</div>
                <div className="mng-detail-value">{formatDate(orderDetails.startTime)}</div>
              </div>
              <div className="mng-detail-row">
                <div className="mng-detail-label">Time:</div>
                <div className="mng-detail-value">{formatTime12h(orderDetails.startTime)}</div>
              </div>
            </>
          )}
          
          {orderDetails.endTime && (
            <div className="mng-detail-row">
              <div className="mng-detail-label">End Time:</div>
              <div className="mng-detail-value">{formatTime12h(orderDetails.endTime)}</div>
            </div>
          )}
          
          {orderDetails.startTime && orderDetails.endTime && (
            <div className="mng-detail-row">
              <div className="mng-detail-label">Duration:</div>
              <div className="mng-detail-value">{calculateDuration(orderDetails.startTime, orderDetails.endTime)}</div>
            </div>
          )}
          
          <div className="mng-detail-row">
            <div className="mng-detail-label">Table:</div>
            <div className="mng-detail-value">{orderDetails.tableNumber || 'Not assigned'}</div>
          </div>
          
          <div className="mng-detail-row">
            <div className="mng-detail-label">Number of Guests:</div>
            <div className="mng-detail-value">{orderDetails.guests || 'Not specified'}</div>
          </div>
          
          <div className="mng-detail-row">
            <div className="mng-detail-label">Status:</div>
            <div className="mng-detail-value">
              <span className={`mng-status-badge ${getStatusClass(orderDetails.status)}`}>
                {orderDetails.status || 'Not specified'}
              </span>
            </div>
          </div>
          
          {orderDetails.orderDate && (
            <div className="mng-detail-row">
              <div className="mng-detail-label">Order Date:</div>
              <div className="mng-detail-value">{formatDate(orderDetails.orderDate)}</div>
            </div>
          )}
        </div>
        

      </div>
      
      <div className="mng-detail-actions">
        <button className="mng-action-btn mng-edit-btn">Edit Reservation</button>
        {orderDetails.status !== 'cancelled' && (
          <button 
            className="mng-action-btn mng-cancel-btn"
            onClick={() => onUpdateStatus('cancelled')}
            disabled={loading}
          >
            Cancel Reservation
          </button>
        )}
        {orderDetails.status === 'planning' && (
          <button 
            className="mng-action-btn mng-confirm-btn"
            onClick={() => onUpdateStatus('confirmed')}
            disabled={loading}
          >
            Confirm Reservation
          </button>
        )}
        {orderDetails.status === 'confirmed' && (
          <button 
            className="mng-action-btn mng-seated-btn"
            onClick={() => onUpdateStatus('seated')}
            disabled={loading}
          >
            Mark as Seated
          </button>
        )}
        {orderDetails.status === 'seated' && (
          <button 
            className="mng-action-btn mng-complete-btn"
            onClick={() => onUpdateStatus('completed')}
            disabled={loading}
          >
            Mark as Complete
          </button>
        )}
      </div>
    </div>
  );
};

// Helper function to get status class
const getStatusClass = (status) => {
  switch (status?.toLowerCase()) {
    case 'confirmed': return 'mng-status-confirmed';
    case 'planning': return 'mng-status-pending';
    case 'cancelled': return 'mng-status-cancelled';
    case 'completed': return 'mng-status-completed';
    case 'seated': return 'mng-status-seated'; // New status for customers who have arrived
    default: return '';
  }
};

export default ManagementReservationDetail;