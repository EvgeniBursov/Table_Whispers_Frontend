import React, { useState, useEffect } from 'react';
import './ManagementDashboardCSS/MngReservationList.css';
import MngEmptyState from './ManagementEmptyState';

// Helper function to format time
const formatTime12h = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

// Helper function to calculate duration
const calculateDuration = (startTime, endTime) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const duration = Math.round((end - start) / (1000 * 60)); // duration in minutes
  return `${duration} min`;
};

const ManagementReservationList = ({ 
  reservations, 
  dateFilter, 
  setDateFilter, 
  statusFilter, 
  setStatusFilter,
  onSelectReservation,
  onAddReservation
}) => {
  const [filteredReservations, setFilteredReservations] = useState([]);

  // Filter reservations based on date and status
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
      console.log(`After date filter: ${filtered.length} reservations`);
    } else {
      console.log("No date filter applied - showing all dates");
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(res => 
        res.orderDetails?.status.toLowerCase() === statusFilter.toLowerCase()
      );
      console.log(`After status filter: ${filtered.length} reservations`);
    }
    
    setFilteredReservations(filtered);
  }, [reservations, dateFilter, statusFilter]);

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed': return 'mng-status-confirmed';
      case 'planning': return 'mng-status-pending';
      case 'cancelled': return 'mng-status-cancelled';
      case 'completed': return 'mng-status-completed';
      default: return '';
    }
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
        <h2>Reservations</h2>
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
                style={{
                  marginLeft: '5px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#555'
                }}
              >
                ✕ Clear
              </button>
            )}
          </div>
          <div className="mng-filter-group">
            <label>Status:</label>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="planning">Planning</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
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
                <th>Customer</th>
                <th>Guests</th>
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
                  className="mng-reservation-row"
                >
                  <td>{formatTime12h(reservation.orderDetails.startTime)}</td>
                  <td>
                    {reservation.customer ? (
                      <div>
                        <div>{reservation.customer.firstName} {reservation.customer.lastName}</div>
                        <div style={{fontSize: '11px', color: '#666'}}>{reservation.customer.email}</div>
                      </div>
                    ) : (
                      <span style={{color: '#999'}}>No customer data</span>
                    )}
                  </td>
                  <td>{reservation.orderDetails.guests}</td>
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
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle edit logic
                      }}
                    >
                      Edit
                    </button>
                    <button 
                      className="mng-action-btn mng-cancel-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle cancel logic
                      }}
                    >
                      Cancel
                    </button>
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
            onAction={() => {
              setDateFilter('');
              setStatusFilter('all');
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ManagementReservationList;