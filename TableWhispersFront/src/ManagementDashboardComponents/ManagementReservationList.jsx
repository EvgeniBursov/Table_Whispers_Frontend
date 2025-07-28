import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './ManagementDashboardCSS/MngReservationList.css';
import './ManagementDashboardCSS/MngStatusModal.css';
import MngEmptyState from './ManagementEmptyState';
import TimeSelector from '../components/TimeSelector/TimeSelector';

import { 
  calculateDuration,
  getCurrentDateInIsrael
} from '../../timeUtils'; 

const API_URL = import.meta.env.VITE_BACKEND_API || 'http://localhost:5000';

const ManagementReservationList = ({ 
  reservations, 
  dateFilter, 
  setDateFilter, 
  statusFilter, 
  setStatusFilter,
  onSelectReservation,
  onAddReservation,
  setReservations,
  restaurantId,
  socketConnected,
  notifications = [],
  onClearNotifications = () => {}
}) => {
// CHECK
  const getCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatTime24hWithoutTimezone = (dateString) => {
    try {
      if (!dateString) return '--:--';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '--:--';
      
      const hours = date.getUTCHours().toString().padStart(2, '0');
      const minutes = date.getUTCMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch (error) {
      console.error('Error formatting time:', error);
      return '--:--';
    }
  };

  const formatDateWithoutTimezone = (dateString) => {
    try {
      if (!dateString) return '--';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '--';
      
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return '--';
    }
  };

  const formatTimeDisplayWithoutTimezone = (dateString) => {
    try {
      if (!dateString) return '--:-- --';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '--:-- --';
      
      const hours = date.getUTCHours();
      const minutes = date.getUTCMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    } catch (error) {
      console.error('Error formatting time display:', error);
      return '--:-- --';
    }
  };

  const [filteredReservations, setFilteredReservations] = useState([]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [isLoadingUpdate, setIsLoadingUpdate] = useState(false);
  
  const [startTimeFilter, setStartTimeFilter] = useState(getCurrentTime());
  const [endTimeFilter, setEndTimeFilter] = useState('');

  useEffect(() => {
    if (notifications.length > 0) {
      setHasNewNotification(true);
      
      const timer = setTimeout(() => {
        setHasNewNotification(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [notifications.length]);

  useEffect(() => {
    if (!Array.isArray(reservations)) {
      setFilteredReservations([]);
      return;
    }
    
    let filtered = [...reservations];
    
    // סינון להזמנות שיש להן נתונים תקינים
    filtered = filtered.filter(res => {
      // בדיקה שיש orderDetails ו-startTime תקינים
      return res && 
             res.orderDetails && 
             res.orderDetails.startTime && 
             typeof res.orderDetails.startTime === 'string';
    });
    
    if (dateFilter && dateFilter.trim() !== '') {
      console.log("Filtering by date:", dateFilter);
      filtered = filtered.filter(res => {
        try {
          const resDateFormatted = formatDateWithoutTimezone(res.orderDetails.startTime);
          return resDateFormatted === dateFilter;
        } catch (error) {
          console.error('Error formatting date for reservation:', res.id, error);
          return false;
        }
      });
    }
    
    if (startTimeFilter) {
      console.log("Filtering by start time:", startTimeFilter);
      filtered = filtered.filter(res => {
        try {
          const resTime = new Date(res.orderDetails.startTime);
          const resHour = resTime.getUTCHours();
          const resMinute = resTime.getUTCMinutes();
          
          const [startHour, startMinute] = startTimeFilter.split(':');
          const startHourInt = parseInt(startHour, 10);
          const startMinuteInt = parseInt(startMinute, 10);
          
          const resTimeInMinutes = resHour * 60 + resMinute;
          const startTimeInMinutes = startHourInt * 60 + startMinuteInt;
          
          return resTimeInMinutes >= startTimeInMinutes;
        } catch (error) {
          console.error('Error filtering by start time for reservation:', res.id, error);
          return false;
        }
      });
    }
    
    if (endTimeFilter) {
      console.log("Filtering by end time:", endTimeFilter);
      filtered = filtered.filter(res => {
        try {
          const resTime = new Date(res.orderDetails.startTime);
          const resHour = resTime.getUTCHours();
          const resMinute = resTime.getUTCMinutes();
          
          const [endHour, endMinute] = endTimeFilter.split(':');
          const endHourInt = parseInt(endHour, 10);
          const endMinuteInt = parseInt(endMinute, 10);
          
          const resTimeInMinutes = resHour * 60 + resMinute;
          const endTimeInMinutes = endHourInt * 60 + endMinuteInt;
          
          return resTimeInMinutes <= endTimeInMinutes;
        } catch (error) {
          console.error('Error filtering by end time for reservation:', res.id, error);
          return false;
        }
      });
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(res => {
        try {
          return res.orderDetails?.status?.toLowerCase() === statusFilter.toLowerCase();
        } catch (error) {
          console.error('Error filtering by status for reservation:', res.id, error);
          return false;
        }
      });
    }
    
    // מיון בטוח עם בדיקת שגיאות
    filtered.sort((a, b) => {
      try {
        // בדיקה נוספת שהנתונים קיימים
        if (!a.orderDetails?.startTime || !b.orderDetails?.startTime) {
          return 0; // אל תשנה את הסדר אם אין נתונים
        }
        
        const timeA = new Date(a.orderDetails.startTime);
        const timeB = new Date(b.orderDetails.startTime);
        
        // בדיקה שהתאריכים תקינים
        if (isNaN(timeA.getTime()) || isNaN(timeB.getTime())) {
          return 0;
        }
        
        return timeA.getTime() - timeB.getTime();
      } catch (error) {
        console.error('Error sorting reservations:', error);
        return 0;
      }
    });
    
    setFilteredReservations(filtered);
  }, [reservations, dateFilter, statusFilter, startTimeFilter, endTimeFilter]);

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'planning': return 'mng-status-pending';
      case 'done': return 'mng-status-completed';
      case 'cancelled': return 'mng-status-cancelled';
      case 'seated': return 'mng-status-confirmed';
      default: return '';
    }
  };

  const updateReservationStatus = async (reservationId, newStatus) => {
    setIsLoadingUpdate(true);
    
    try {
      const reservation = reservations.find(res => res.id === reservationId);
      const customerEmail = reservation?.customer?.email;
      const customerName = reservation?.customer?.firstName 
                         ? `${reservation.customer.firstName} ${reservation.customer.lastName || ''}`
                         : 'Customer';
      
      const response = await fetch(`${API_URL}/update_Reservation/restaurant/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('token') || ''
        },
        body: JSON.stringify({
          reservation_id: reservationId,
          status: newStatus,
          notify_all: true,
          restaurant_id: restaurantId,
          client_email: customerEmail,
          client_name: customerName
        }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        alert(`Failed to update status: ${data.message}`);
      } else {
        setShowStatusModal(false);
        setSelectedReservation(null);
      }
    } catch (error) {
      console.error('Error updating reservation status:', error);
      alert('Failed to update reservation status. Please try again.');
    } finally {
      setIsLoadingUpdate(false);
    }
  };

  const handleCancelReservation = (e, reservation) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to cancel this reservation?')) {
      updateReservationStatus(reservation.id, 'Cancelled');
    }
  };

  const handleEditStatus = (e, reservation) => {
    e.stopPropagation();
    setSelectedReservation(reservation);
    setShowStatusModal(true);
  };

  const clearAllFilters = () => {
    setDateFilter('');
    setStatusFilter('all');
    setStartTimeFilter('');
    setEndTimeFilter('');
  };

  const getTableDisplay = (reservation) => {
    const tableNumber = 
      (reservation.orderDetails && reservation.orderDetails.table) || 
      reservation.orderDetails.tableNumber || 
      null;
    
    if (tableNumber) {
      return (
        <span className="mng-table-number">
          Table {tableNumber}
        </span>
      );
    } else {
      return <span className="mng-table-not-assigned">Not assigned</span>;
    }
  };

  const StatusModal = () => {
    if (!showStatusModal || !selectedReservation) return null;
    
    return (
      <div className="mng-status-modal-overlay">
        <div className="mng-status-modal">
          <h3>Update Reservation Status</h3>
          <p>Reservation for {selectedReservation.customer?.firstName} {selectedReservation.customer?.lastName}</p>
          <div className="mng-status-buttons">
            <button 
              className="mng-status-btn mng-status-planning"
              onClick={() => updateReservationStatus(selectedReservation.id, 'Planning')}
              disabled={isLoadingUpdate}
            >
              Planning
            </button>
            <button 
              className="mng-status-btn mng-status-seated"
              onClick={() => updateReservationStatus(selectedReservation.id, 'Seated')}
              disabled={isLoadingUpdate}
            >
              Seated
            </button>
            <button 
              className="mng-status-btn mng-status-done"
              onClick={() => updateReservationStatus(selectedReservation.id, 'Done')}
              disabled={isLoadingUpdate}
            >
              Completed
            </button>
            <button 
              className="mng-status-btn mng-status-cancelled"
              onClick={() => updateReservationStatus(selectedReservation.id, 'Cancelled')}
              disabled={isLoadingUpdate}
            >
              Cancelled
            </button>
          </div>
          <button 
            className="mng-modal-close"
            onClick={() => setShowStatusModal(false)}
            disabled={isLoadingUpdate}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  const NotificationsDropdown = () => {
    if (!showNotifications || notifications.length === 0) return null;
    
    const groupedNotifications = {
      update: notifications.filter(n => n.type === 'update'),
      status: notifications.filter(n => n.type === 'status'),
      new: notifications.filter(n => n.type === 'new'),
      cancellation: notifications.filter(n => n.type === 'cancellation'),
      change: notifications.filter(n => n.type === 'change'),
      table: notifications.filter(n => n.type === 'table'),
      error: notifications.filter(n => n.type === 'error')
    };
    
    return (
      <div className="mng-notifications-dropdown">
        <div className="mng-notifications-header">
          <h3>Notifications</h3>
          <button className="mng-clear-all-button" onClick={onClearNotifications}>
            Clear All
          </button>
        </div>
        
        <div className="mng-notifications-content">
          {groupedNotifications.status.length > 0 && (
            <div className="mng-notification-group">
              <h4>Status Updates</h4>
              {groupedNotifications.status.map(notification => (
                <div key={notification.id} className="mng-notification-item status">
                  <div className="mng-notification-message">{notification.message}</div>
                  <div className="mng-notification-time">
                    {formatTimeDisplayWithoutTimezone(notification.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {groupedNotifications.new.length > 0 && (
            <div className="mng-notification-group">
              <h4>New Reservations</h4>
              {groupedNotifications.new.map(notification => (
                <div key={notification.id} className="mng-notification-item new">
                  <div className="mng-notification-message">{notification.message}</div>
                  <div className="mng-notification-time">
                    {formatTimeDisplayWithoutTimezone(notification.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {groupedNotifications.cancellation.length > 0 && (
            <div className="mng-notification-group">
              <h4>Cancellations</h4>
              {groupedNotifications.cancellation.map(notification => (
                <div key={notification.id} className="mng-notification-item cancellation">
                  <div className="mng-notification-message">{notification.message}</div>
                  <div className="mng-notification-time">
                    {formatTimeDisplayWithoutTimezone(notification.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {groupedNotifications.change.length > 0 && (
            <div className="mng-notification-group">
              <h4>Detail Changes</h4>
              {groupedNotifications.change.map(notification => (
                <div key={notification.id} className="mng-notification-item change">
                  <div className="mng-notification-message">{notification.message}</div>
                  <div className="mng-notification-time">
                    {formatTimeDisplayWithoutTimezone(notification.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {groupedNotifications.table.length > 0 && (
            <div className="mng-notification-group">
              <h4>Table Assignments</h4>
              {groupedNotifications.table.map(notification => (
                <div key={notification.id} className="mng-notification-item table">
                  <div className="mng-notification-message">{notification.message}</div>
                  <div className="mng-notification-time">
                    {formatTimeDisplayWithoutTimezone(notification.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {groupedNotifications.update.length > 0 && (
            <div className="mng-notification-group">
              <h4>Other Updates</h4>
              {groupedNotifications.update.map(notification => (
                <div key={notification.id} className="mng-notification-item update">
                  <div className="mng-notification-message">{notification.message}</div>
                  <div className="mng-notification-time">
                    {formatTimeDisplayWithoutTimezone(notification.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {groupedNotifications.error.length > 0 && (
            <div className="mng-notification-group">
              <h4>Errors</h4>
              {groupedNotifications.error.map(notification => (
                <div key={notification.id} className="mng-notification-item error">
                  <div className="mng-notification-message">{notification.message}</div>
                  <div className="mng-notification-time">
                    {formatTimeDisplayWithoutTimezone(notification.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!Array.isArray(reservations) || reservations.length === 0) {
    return (
      <MngEmptyState 
        icon="📅" 
        title="No Reservations" 
        message="There are no reservations available for this restaurant." 
        actionText="Add Reservation" 
        onAction={() => onAddReservation({ isManagementReservation: true, isManagementReservationList: true})}
      />
    );
  }

  return (
    <div className="mng-reservation-list-container">
      <div className="mng-reservation-header">
        <div className="mng-header-top">
          <h2>Reservations</h2>
          <div className="mng-header-actions">
            <div className={`mng-realtime-status ${socketConnected ? 'connected' : 'disconnected'}`}>
              <span className="mng-status-indicator"></span>
              {socketConnected ? 'Real-time Updates Active' : 'Offline Mode'}
            </div>
          </div>
        </div>
        <div className="mng-reservation-filters">
          <div className="mng-filter-group">
            <label>Date:</label>
            <input 
              type="date" 
              value={dateFilter} 
              onChange={(e) => setDateFilter(e.target.value)}
              min={getCurrentDateInIsrael()} 
            />
            {dateFilter && (
              <button 
                onClick={() => setDateFilter('')}
                className="mng-clear-filter-btn"
              >
                ✕
              </button>
            )}
          </div>
          
          <div className="mng-filter-group">
            <label>From:</label>
            <TimeSelector 
              value={startTimeFilter}
              onChange={setStartTimeFilter}
              placeholder="Start"
            />
          </div>
          
          <div className="mng-filter-group">
            <label>To:</label>
            <TimeSelector 
              value={endTimeFilter}
              onChange={setEndTimeFilter}
              placeholder="End"
            />
          </div>
          
          <div className="mng-filter-group">
            <label>Status:</label>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="planning">Planning</option>
              <option value="seated">Seated</option>
              <option value="done">Done</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          {(dateFilter || startTimeFilter || endTimeFilter || statusFilter !== 'all') && (
            <button 
              className="mng-clear-all-filters-btn"
              onClick={clearAllFilters}
            >
              Clear All Filters
            </button>
          )}
          
          <button className="mng-add-reservation-btn" onClick={() => onAddReservation({ isManagementReservation: true, isManagementReservationList: true })}>
            + Add Reservation
          </button>
        </div>
      </div>
      
      <div className="mng-reservation-table-container">
        {filteredReservations.length > 0 ? (
          <table className="mng-reservation-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Guests</th>
                <th>Table</th> 
                <th>Duration</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReservations.map(reservation => {
                // בדיקת בטיחות לפני רינדור
                if (!reservation || !reservation.orderDetails || !reservation.id) {
                  console.warn('Skipping invalid reservation:', reservation);
                  return null;
                }
                
                return (
                  <tr 
                    key={reservation.id}
                    onClick={() => onSelectReservation(reservation)}
                    className={`mng-reservation-row ${reservation.orderDetails.status?.toLowerCase() === 'cancelled' ? 'mng-reservation-cancelled' : ''}`}
                  >
                    <td className="mng-time-column">
                      {reservation.orderDetails.startTime ? 
                        formatTime24hWithoutTimezone(reservation.orderDetails.startTime) : 
                        '--:--'
                      }
                    </td>
                    <td>
                      {reservation.orderDetails.startTime ? 
                        formatDateWithoutTimezone(reservation.orderDetails.startTime) : 
                        '--'
                      }
                    </td>
                    <td>
                      {reservation.customer ? (
                        <div>
                          <div>{reservation.customer.firstName} {reservation.customer.lastName}</div>
                          <div className="mng-customer-email">{reservation.customer.email}</div>
                        </div>
                      ) : (
                        <span className="mng-no-customer-data">No customer data</span>
                      )}
                    </td>
                    <td>{reservation.orderDetails.guests || 0}</td>
                    <td>
                      {getTableDisplay(reservation)}
                    </td>
                    <td>
                      {reservation.orderDetails.startTime && reservation.orderDetails.endTime ? 
                        calculateDuration(
                          reservation.orderDetails.startTime, 
                          reservation.orderDetails.endTime
                        ) : 
                        '--'
                      }
                    </td>
                    <td>
                      <span className={`mng-status-badge ${getStatusClass(reservation.orderDetails.status || 'unknown')}`}>
                        {reservation.orderDetails.status || 'Unknown'}
                      </span>
                    </td>
                    <td className="mng-action-buttons">
                      <button 
                        className="mng-action-btn mng-edit-btn" 
                        onClick={(e) => handleEditStatus(e, reservation)}
                        disabled={reservation.orderDetails.status?.toLowerCase() === 'cancelled'}
                      >
                        Edit
                      </button>
                      {reservation.orderDetails.status?.toLowerCase() !== 'cancelled' && (
                        <button 
                          className="mng-action-btn mng-cancel-btn"
                          onClick={(e) => handleCancelReservation(e, reservation)}
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <MngEmptyState 
            icon="🔍" 
            title="No Matching Reservations" 
            message="No reservations found for the selected filters." 
            actionText="Clear Filters" 
            onAction={clearAllFilters}
          />
        )}
      </div>
      
      <StatusModal />
    </div>
  );
};

export default ManagementReservationList;