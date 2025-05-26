import React, { useState } from 'react';
import './ManagementDashboardCSS/MngReservationDetail.css';
import CustomerReservationHistory from './ManagementCustomerReservationHistory';
import BillModal from '../components/Bills/Bills'; 

const API_URL = import.meta.env.VITE_BACKEND_API || 'http://localhost:5000';

const ManagementReservationDetail = ({ reservation, onBack, onUpdateStatus, loading }) => {
  const formatTime24hWithoutTimezone = (dateString) => {
    const date = new Date(dateString);
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatDateWithoutTimezone = (dateString) => {
    const date = new Date(dateString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const calculateDurationWithoutTimezone = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffInMinutes = Math.round((end - start) / (1000 * 60));
    const hours = Math.floor(diffInMinutes / 60);
    const minutes = diffInMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  const getCurrentDateWithoutTimezone = () => {
    const today = new Date();
    const year = today.getUTCFullYear();
    const month = String(today.getUTCMonth() + 1).padStart(2, '0');
    const day = String(today.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const convertFromUTCTime = (dateString) => {
    const date = new Date(dateString);
    const dateStr = formatDateWithoutTimezone(dateString);
    const timeStr = formatTime24hWithoutTimezone(dateString);
    return { date: dateStr, time: timeStr };
  };

  const createUTCDate = (dateStr, timeStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    return new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    date: '',
    time: '',
    guests: '',
    tableNumber: ''
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  
  const [selectedBill, setSelectedBill] = useState(null);

  if (!reservation) return null;
  
  const customer = reservation.customer || {};
  const orderDetails = reservation.orderDetails || {};
  
  const hasAllergies = customer.allergies && 
                       Array.isArray(customer.allergies) &&
                       customer.allergies.length > 0;

  const handleViewBill = () => {
    setSelectedBill(reservation.id);
  };

  const handleCloseBill = () => {
    setSelectedBill(null);
  };

  const handleEditClick = () => {
    if (orderDetails.startTime) {
      const { date, time } = convertFromUTCTime(orderDetails.startTime);
      
      setEditFormData({
        date: date,
        time: time,
        guests: orderDetails.guests || 2,
        tableNumber: orderDetails.tableNumber || ''
      });
    }
    
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setFormError('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({
      ...editFormData,
      [name]: value
    });
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    return `${API_URL}${imagePath}`;
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    
    if (!editFormData.date || !editFormData.time || !editFormData.guests) {
      setFormError('Date, time and guests are required fields');
      return;
    }
    
    setIsSubmitting(true);
    setFormError('');
    
    try {
      const startTime = createUTCDate(editFormData.date, editFormData.time);
      
      const endTime = new Date(startTime);
      endTime.setUTCHours(endTime.getUTCHours() + 2);
      
      const startTimeISO = startTime.toISOString();
      const endTimeISO = endTime.toISOString();
      
      const response = await fetch(`${API_URL}/update_Reservation_Details/restaurant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('token') || ''
        },
        body: JSON.stringify({
          reservation_id: reservation.id,
          date: editFormData.date,
          time: editFormData.time,
          guests: parseInt(editFormData.guests, 10),
          tableNumber: editFormData.tableNumber || null,
          notify_all: true,
          client_email: reservation.customer?.email || '',
          restaurant_id: reservation.restaurantId || reservation.restaurant_id || ''
        }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        setFormError(data.message || 'Failed to update reservation');
        return;
      }
      
      if (onUpdateStatus) {
        onUpdateStatus('update', {
          id: reservation.id,
          orderDetails: {
            ...orderDetails,
            startTime: startTimeISO,
            endTime: endTimeISO,
            guests: parseInt(editFormData.guests, 10),
            tableNumber: editFormData.tableNumber || null
          }
        });
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating reservation:', error);
      setFormError('An error occurred while updating the reservation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelReservation = async () => {
    if (window.confirm('Are you sure you want to cancel this reservation?')) {
      try {
        const response = await fetch(`${API_URL}/update_Reservation/restaurant/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': localStorage.getItem('token') || ''
          },
          body: JSON.stringify({
            reservation_id: reservation.id,
            status: 'Cancelled',
            notify_all: true,
            client_email: reservation.customer?.email || '',
            restaurant_id: reservation.restaurantId || reservation.restaurant_id || ''
          }),
        });
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.message || 'Failed to cancel reservation');
        }
        
        if (onUpdateStatus) {
          await onUpdateStatus('cancelled');
        }
      } catch (error) {
        console.error('Error cancelling reservation:', error);
        alert('Failed to cancel reservation. Please try again.');
      }
    }
  };

  const handleToggleHistory = () => {
    setShowHistory(!showHistory);
  };
  
  const handleSelectHistoryReservation = (historyReservation) => {
    console.log('Selected reservation from history:', historyReservation);
  };

  return (
    <div className="mng-reservation-detail-container">
      <div className="mng-detail-header">
        <button className="mng-back-button" onClick={onBack}>← Back to List</button>
        <h2>Reservation Details</h2>
      </div>
      
      <div className="mng-detail-content">
        <div className="mng-detail-section">
          <h3>Customer Information</h3>
          
          <div className="mng-customer-profile-section">
            {customer.userType === "registered" && (
              <div className="mng-customer-image-container">
                {customer.profileImage ? (
                  <img 
                    src={getImageUrl(customer.profileImage)} 
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
            
            <div className="mng-customer-details">
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
              {customer.userType === "registered" && (
              <div className="mng-detail-row">
                <div className="mng-detail-label">Age:</div>
                <div className="mng-detail-value">{customer.age || 'Not provided'}</div>
              </div>
            )}
                        
              {customer.userType === "registered" && (
                <div className="mng-detail-row">
                  <div className="mng-detail-label">Customer Type:</div>
                  <div className="mng-detail-value">
                    <span className="mng-customer-type-badge">Registered</span>
                  </div>
                </div>
              )}
              
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
          </div>
        </div>
        
        <div className="mng-detail-section">
          <h3>Reservation Information</h3>
          
          {customer.userType === "registered" && (
            <div className="mng-history-toggle">
              <button 
                className="mng-history-toggle-btn"
                onClick={handleToggleHistory}
              >
                {showHistory ? 'Hide Reservation History' : 'Show Reservation History'}
              </button>
            </div>
          )}
          
          {showHistory && customer.userType === "registered" && (
            <div className="mng-history-container">
              <h4 className="mng-history-title">Reservation History</h4>
              <CustomerReservationHistory 
                customer={{
                  id: customer.id,
                  email: customer.email
                }}
                onSelectReservation={handleSelectHistoryReservation}
              />
            </div>
          )}
          
          {isEditing ? (
            <form className="mng-edit-form" onSubmit={handleSubmitEdit}>
              {formError && <div className="mng-form-error">{formError}</div>}
              
              <div className="mng-form-group">
                <label>Date:</label>
                <input 
                  type="date" 
                  name="date"
                  value={editFormData.date}
                  onChange={handleInputChange}
                  min={getCurrentDateWithoutTimezone()} 
                  required
                />
              </div>
              
              <div className="mng-form-group">
                <label>Time (24h):</label>
                <input 
                  type="time" 
                  name="time"
                  value={editFormData.time}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="mng-form-group">
                <label>Table Number:</label>
                <input 
                  type="text" 
                  name="tableNumber"
                  value={editFormData.tableNumber}
                  onChange={handleInputChange}
                  placeholder="Enter table number"
                />
                <small className="mng-form-help-text">Leave empty if not assigned yet</small>
              </div>
              
              <div className="mng-form-group">
                <label>Number of Guests:</label>
                <select 
                  name="guests"
                  value={editFormData.guests}
                  onChange={handleInputChange}
                  required
                >
                  <option value="1">1 person</option>
                  <option value="2">2 people</option>
                  <option value="3">3 people</option>
                  <option value="4">4 people</option>
                  <option value="5">5 people</option>
                  <option value="6">6 people</option>
                  <option value="8">8 people</option>
                  <option value="10">10 people</option>
                </select>
              </div>
              
              <div className="mng-form-actions">
                <button 
                  type="button" 
                  className="mng-btn mng-cancel-btn"
                  onClick={handleCancelEdit}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="mng-btn mng-save-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="mng-reservation-details">
              {orderDetails.startTime && (
                <>
                  <div className="mng-detail-row">
                    <div className="mng-detail-label">Date:</div>
                    <div className="mng-detail-value">{formatDateWithoutTimezone(orderDetails.startTime)}</div>
                  </div>
                  <div className="mng-detail-row">
                    <div className="mng-detail-label">Time:</div>
                    <div className="mng-detail-value">{formatTime24hWithoutTimezone(orderDetails.startTime)}</div>
                  </div>
                </>
              )}
              
              {orderDetails.endTime && (
                <div className="mng-detail-row">
                  <div className="mng-detail-label">End Time:</div>
                  <div className="mng-detail-value">{formatTime24hWithoutTimezone(orderDetails.endTime)}</div>
                </div>
              )}
              
              {orderDetails.startTime && orderDetails.endTime && (
                <div className="mng-detail-row">
                  <div className="mng-detail-label">Duration:</div>
                  <div className="mng-detail-value">{calculateDurationWithoutTimezone(orderDetails.startTime, orderDetails.endTime)}</div>
                </div>
              )}
              
              <div className="mng-detail-row">
                <div className="mng-detail-label">Table:</div>
                <div className="mng-detail-value">
                  {orderDetails.table ? (
                    <span className="mng-table-number">Table {orderDetails.table}</span>
                  ) : (
                    <span className="mng-table-not-assigned">Not assigned</span>
                  )}
                </div>
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
                  <div className="mng-detail-value">{formatDateWithoutTimezone(orderDetails.orderDate)}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="mng-detail-actions">
        {!isEditing && (
          <>
            <button 
              className="mng-action-btn mng-edit-btn"
              onClick={handleEditClick}
              disabled={orderDetails.status === 'cancelled' || orderDetails.status === 'done'}
            >
              Edit Reservation
            </button>
            
            {(['seated', 'done'].includes(orderDetails.status?.toLowerCase())) && (
              <button 
                className="mng-action-btn mng-bill-btn"
                onClick={handleViewBill}
              >
                <span className="bill-icon">🧾</span> View Bill
              </button>
            )}
            
            {orderDetails.status !== 'cancelled' && orderDetails.status !== 'done' && (
              <button 
                className="mng-action-btn mng-cancel-btn"
                onClick={handleCancelReservation}
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
                onClick={() => onUpdateStatus('done')}
                disabled={loading}
              >
                Mark as Complete
              </button>
            )}
          </>
        )}
      </div>
      
      {selectedBill && (
        <BillModal 
          orderId={selectedBill} 
          onClose={handleCloseBill} 
          token={localStorage.getItem('token')}
        />
      )}
    </div>
  );
};

const getStatusClass = (status) => {
  switch (status?.toLowerCase()) {
    case 'confirmed': return 'mng-status-confirmed';
    case 'planning': return 'mng-status-pending';
    case 'cancelled': return 'mng-status-cancelled';
    case 'done': return 'mng-status-completed';
    case 'seated': return 'mng-status-seated';
    default: return '';
  }
};

export default ManagementReservationDetail;