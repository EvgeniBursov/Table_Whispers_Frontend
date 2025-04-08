import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './ManagementDashboardCSS/MngReservationList.css';
import './ManagementDashboardCSS/MngStatusModal.css';
import MngEmptyState from './ManagementEmptyState';
import TimeSelector from '../components/TimeSelector/TimeSelector';

// Helper function to format time in 24-hour format
const formatTime24h = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false  
  });
};

// Helper function to calculate duration
const calculateDuration = (startTime, endTime) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const duration = Math.round((end - start) / (1000 * 60)); // duration in minutes
  return `${duration} min`;
};

// Format date for display
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

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
  const [filteredReservations, setFilteredReservations] = useState([]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [isLoadingUpdate, setIsLoadingUpdate] = useState(false);
  
  // Time filter state
  const [startTimeFilter, setStartTimeFilter] = useState('');
  const [endTimeFilter, setEndTimeFilter] = useState('');

  // Watch for new notifications and show indicator
  useEffect(() => {
    if (notifications.length > 0) {
      setHasNewNotification(true);
      
      // Auto-hide indicator after 5 seconds
      const timer = setTimeout(() => {
        setHasNewNotification(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [notifications.length]);

  // Filter reservations based on date, time, and status
  useEffect(() => {
    if (!Array.isArray(reservations)) {
      setFilteredReservations([]);
      return;
    }
    
    let filtered = [...reservations];
    
    // Only apply date filter if a date is selected
    if (dateFilter && dateFilter.trim() !== '') {
      console.log("Filtering by date:", dateFilter);
      filtered = filtered.filter(res => {
        if (!res.orderDetails?.startTime) return false;
        const resDate = new Date(res.orderDetails.startTime);
        return resDate.toISOString().split('T')[0] === dateFilter;
      });
    }
    
    // Apply time range filter - now using hours only from the custom TimeSelector
    if (startTimeFilter) {
      console.log("Filtering by start time:", startTimeFilter);
      filtered = filtered.filter(res => {
        if (!res.orderDetails?.startTime) return false;
        const resTime = new Date(res.orderDetails.startTime);
        const [startHour] = startTimeFilter.split(':');
        const startHourInt = parseInt(startHour, 10);
        
        return resTime.getHours() >= startHourInt;
      });
    }
    
    if (endTimeFilter) {
      console.log("Filtering by end time:", endTimeFilter);
      filtered = filtered.filter(res => {
        if (!res.orderDetails?.startTime) return false;
        const resTime = new Date(res.orderDetails.startTime);
        const [endHour] = endTimeFilter.split(':');
        const endHourInt = parseInt(endHour, 10);
        
        return resTime.getHours() <= endHourInt;
      });
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(res => 
        res.orderDetails?.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }
    
    // Sort reservations by earliest time first
    filtered.sort((a, b) => {
      const timeA = new Date(a.orderDetails.startTime).getTime();
      const timeB = new Date(b.orderDetails.startTime).getTime();
      return timeA - timeB; // Sort by earliest time first
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

  // Function to update reservation status
  const updateReservationStatus = async (reservationId, newStatus) => {
    setIsLoadingUpdate(true);
    
    try {
      // Get customer information from the selected reservation
      const reservation = reservations.find(res => res.id === reservationId);
      const customerEmail = reservation?.customer?.email;
      const customerName = reservation?.customer?.firstName 
                         ? `${reservation.customer.firstName} ${reservation.customer.lastName || ''}`
                         : 'Customer';
      
      const response = await fetch(`http://localhost:5000/update_Reservation/restaurant/`, {
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
        // Close modal
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

  // Handler for Cancel button
  const handleCancelReservation = (e, reservation) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to cancel this reservation?')) {
      updateReservationStatus(reservation.id, 'Cancelled');
    }
  };

  // Handler for Edit button (to show status options)
  const handleEditStatus = (e, reservation) => {
    e.stopPropagation();
    setSelectedReservation(reservation);
    setShowStatusModal(true);
  };

  // Function to clear all filters
  const clearAllFilters = () => {
    setDateFilter('');
    setStatusFilter('all');
    setStartTimeFilter('');
    setEndTimeFilter('');
  };

  // Helper function to get table display info
  const getTableDisplay = (reservation) => {
    // Check all possible places where table number might be stored
    const tableNumber = 
      (reservation.orderDetails && reservation.orderDetails.tableNumber) || 
      reservation.tableNumber || 
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

  // Status Modal Component
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

  // Notifications Dropdown Component
  const NotificationsDropdown = () => {
    if (!showNotifications || notifications.length === 0) return null;
    
    // Group notifications by type
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
          {/* Status changes */}
          {groupedNotifications.status.length > 0 && (
            <div className="mng-notification-group">
              <h4>Status Updates</h4>
              {groupedNotifications.status.map(notification => (
                <div key={notification.id} className="mng-notification-item status">
                  <div className="mng-notification-message">{notification.message}</div>
                  <div className="mng-notification-time">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* New reservations */}
          {groupedNotifications.new.length > 0 && (
            <div className="mng-notification-group">
              <h4>New Reservations</h4>
              {groupedNotifications.new.map(notification => (
                <div key={notification.id} className="mng-notification-item new">
                  <div className="mng-notification-message">{notification.message}</div>
                  <div className="mng-notification-time">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Cancellations */}
          {groupedNotifications.cancellation.length > 0 && (
            <div className="mng-notification-group">
              <h4>Cancellations</h4>
              {groupedNotifications.cancellation.map(notification => (
                <div key={notification.id} className="mng-notification-item cancellation">
                  <div className="mng-notification-message">{notification.message}</div>
                  <div className="mng-notification-time">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Detail changes */}
          {groupedNotifications.change.length > 0 && (
            <div className="mng-notification-group">
              <h4>Detail Changes</h4>
              {groupedNotifications.change.map(notification => (
                <div key={notification.id} className="mng-notification-item change">
                  <div className="mng-notification-message">{notification.message}</div>
                  <div className="mng-notification-time">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Table assignments */}
          {groupedNotifications.table.length > 0 && (
            <div className="mng-notification-group">
              <h4>Table Assignments</h4>
              {groupedNotifications.table.map(notification => (
                <div key={notification.id} className="mng-notification-item table">
                  <div className="mng-notification-message">{notification.message}</div>
                  <div className="mng-notification-time">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Other updates */}
          {groupedNotifications.update.length > 0 && (
            <div className="mng-notification-group">
              <h4>Other Updates</h4>
              {groupedNotifications.update.map(notification => (
                <div key={notification.id} className="mng-notification-item update">
                  <div className="mng-notification-message">{notification.message}</div>
                  <div className="mng-notification-time">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Errors */}
          {groupedNotifications.error.length > 0 && (
            <div className="mng-notification-group">
              <h4>Errors</h4>
              {groupedNotifications.error.map(notification => (
                <div key={notification.id} className="mng-notification-item error">
                  <div className="mng-notification-message">{notification.message}</div>
                  <div className="mng-notification-time">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // If no reservations data available
  if (!Array.isArray(reservations) || reservations.length === 0) {
    return (
      <MngEmptyState 
        icon="📅" 
        title="No Reservations" 
        message="There are no reservations available for this restaurant." 
        actionText="Add Reservation" 
        onAction={onAddReservation}
      />
    );
  }

  return (
    <div className="mng-reservation-list-container">
      <div className="mng-reservation-header">
        <div className="mng-header-top">
          <h2>Reservations</h2>
          <div className="mng-header-actions">
            {/* Socket connection status */}
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
          
          {/* Time range filter using custom TimeSelector */}
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
          
          {/* Clear all filters button */}
          {(dateFilter || startTimeFilter || endTimeFilter || statusFilter !== 'all') && (
            <button 
              className="mng-clear-all-filters-btn"
              onClick={clearAllFilters}
            >
              Clear All Filters
            </button>
          )}
          
          <button className="mng-add-reservation-btn" onClick={onAddReservation}>
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
              {filteredReservations.map(reservation => (
                <tr 
                  key={reservation.id}
                  onClick={() => onSelectReservation(reservation)}
                  className={`mng-reservation-row ${reservation.orderDetails.status.toLowerCase() === 'cancelled' ? 'mng-reservation-cancelled' : ''}`}
                >
                  <td className="mng-time-column">{formatTime24h(reservation.orderDetails.startTime)}</td>
                  <td>{formatDate(reservation.orderDetails.startTime)}</td>
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
                  <td>{reservation.orderDetails.guests}</td>
                  <td>
                    {getTableDisplay(reservation)}
                  </td>
                  <td>
                    {calculateDuration(
                      reservation.orderDetails.startTime, 
                      reservation.orderDetails.endTime
                    )}
                  </td>
                  <td>
                    <span className={`mng-status-badge ${getStatusClass(reservation.orderDetails.status)}`}>
                      {reservation.orderDetails.status}
                    </span>
                  </td>
                  <td className="mng-action-buttons">
                    <button 
                      className="mng-action-btn mng-edit-btn" 
                      onClick={(e) => handleEditStatus(e, reservation)}
                      disabled={reservation.orderDetails.status.toLowerCase() === 'cancelled'}
                    >
                      Edit
                    </button>
                    {reservation.orderDetails.status.toLowerCase() !== 'cancelled' && (
                      <button 
                        className="mng-action-btn mng-cancel-btn"
                        onClick={(e) => handleCancelReservation(e, reservation)}
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
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
      
      {/* Render the status modal */}
      <StatusModal />
    </div>
  );
};

export default ManagementReservationList;