import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './ManagementDashboardCSS/MngReservationList.css';
import './ManagementDashboardCSS/MngStatusModal.css';
import MngEmptyState from './ManagementEmptyState';
import TimeSelector from '../components/TimeSelector/TimeSelector';

// For local development, use localhost with your server port
const socketUrl = 'http://localhost:7000'; // Use your actual port here
const apiUrl = 'http://localhost:7000'; // Use your actual port here

// Initialize Socket.IO connection
const socket = io(socketUrl, {
  transports: ['websocket', 'polling']
});

// Helper function to format time in 24-hour format
const formatTime24h = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false  
  });
};

// Helper function to format time in 12-hour format with AM/PM
const formatTime12h = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
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
  onAddReservation,
  setReservations  // Prop to update the parent's state
}) => {
  const [filteredReservations, setFilteredReservations] = useState([]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  
  // Time filter state 
  const [startTimeFilter, setStartTimeFilter] = useState('');
  const [endTimeFilter, setEndTimeFilter] = useState('');

  // Load reservations with table numbers
  useEffect(() => {
    const loadReservationsWithTableNumbers = async () => {
      try {
        // If we already have reservations but need to fetch table numbers
        if (Array.isArray(reservations) && reservations.length > 0) {
          // Make a call to get table assignments
          const response = await fetch(`${apiUrl}/get_table_assignments`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': localStorage.getItem('token') || ''
            }
          });
          
          if (response.ok) {
            const tableData = await response.json();
            
            // Update reservations with table data
            const updatedReservations = reservations.map(res => {
              // Find table assignment for this reservation
              const tableAssignment = tableData.find(t => t.reservation_id === res.id);
              
              if (tableAssignment) {
                return {
                  ...res,
                  tableNumber: tableAssignment.table_number,
                  orderDetails: {
                    ...res.orderDetails,
                    tableNumber: tableAssignment.table_number
                  }
                };
              }
              return res;
            });
            
            // Update parent state
            if (setReservations) {
              setReservations(updatedReservations);
            }
          }
        }
      } catch (error) {
        console.error('Error loading table assignments:', error);
      }
    };
    
    loadReservationsWithTableNumbers();
  }, [reservations, setReservations]);

  // Set up WebSocket listeners
  useEffect(() => {
    // Track connection status
    socket.on('connect', () => {
      console.log('WebSocket connected!');
      setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setSocketConnected(false);
    });

    // Listen for reservation updates
    socket.on('reservationUpdated', (data) => {
      console.log('Received reservation update:', data);
      
      // Update the reservations in parent component if setReservations is provided
      if (setReservations) {
        setReservations(prevReservations => 
          prevReservations.map(res => {
            if (res.id === data.reservationId) {
              // Preserve tableNumber during updates
              return {
                ...res,
                orderDetails: {
                  ...res.orderDetails,
                  status: data.newStatus,
                  tableNumber: res.orderDetails.tableNumber || null
                }
              };
            }
            return res;
          })
        );
      }

      // Update filtered reservations directly
      setFilteredReservations(prevReservations => 
        prevReservations.map(res => {
          if (res.id === data.reservationId) {
            // Preserve tableNumber during updates
            return {
              ...res,
              orderDetails: {
                ...res.orderDetails,
                status: data.newStatus,
                tableNumber: res.orderDetails.tableNumber || null
              }
            };
          }
          return res;
        })
      );
    });

    socket.on('reservationCreated', (data) => {
      console.log('Received new reservation:', data);
      
      // Add the new reservation to the parent component's state if setReservations is provided
      if (setReservations) {
        setReservations(prevReservations => [data.newReservation, ...prevReservations]);
      }
      
      // Check if the new reservation should be included in the filtered list
      const shouldAdd = shouldIncludeInFiltered(data.newReservation);
      
      if (shouldAdd) {
        setFilteredReservations(prevReservations => [data.newReservation, ...prevReservations]);
      }
    });

    // Listen for table assignments
    socket.on('tableAssigned', (data) => {
      console.log('Table assigned:', data);
      
      // Update reservations with new table assignment
      if (setReservations) {
        setReservations(prevReservations => 
          prevReservations.map(res => {
            if (res.id === data.reservationId) {
              return {
                ...res,
                tableNumber: data.tableNumber,
                orderDetails: {
                  ...res.orderDetails,
                  tableNumber: data.tableNumber
                }
              };
            }
            return res;
          })
        );
      }
      
      // Update filtered reservations
      setFilteredReservations(prevReservations => 
        prevReservations.map(res => {
          if (res.id === data.reservationId) {
            return {
              ...res,
              tableNumber: data.tableNumber,
              orderDetails: {
                ...res.orderDetails,
                tableNumber: data.tableNumber
              }
            };
          }
          return res;
        })
      );
    });

    // Cleanup function
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('reservationUpdated');
      socket.off('reservationCreated');
      socket.off('tableAssigned');
    };
  }, [setReservations, dateFilter, statusFilter, startTimeFilter, endTimeFilter]);

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
      console.log(`After date filter: ${filtered.length} reservations`);
    } else {
      console.log("No date filter applied - showing all dates");
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
      console.log(`After start time filter: ${filtered.length} reservations`);
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
      console.log(`After end time filter: ${filtered.length} reservations`);
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(res => 
        res.orderDetails?.status.toLowerCase() === statusFilter.toLowerCase()
      );
      console.log(`After status filter: ${filtered.length} reservations`);
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

  const shouldIncludeInFiltered = (reservation) => {
    // Check date filter
    if (dateFilter && dateFilter.trim() !== '') {
      const resDate = new Date(reservation.orderDetails.startTime);
      const resDateStr = resDate.toISOString().split('T')[0];
      if (resDateStr !== dateFilter) {
        return false;
      }
    }
    
    // Check time filters
    if (startTimeFilter) {
      const resTime = new Date(reservation.orderDetails.startTime);
      const [startHour] = startTimeFilter.split(':');
      const startHourInt = parseInt(startHour, 10);
      
      if (resTime.getHours() < startHourInt) {
        return false;
      }
    }
    
    if (endTimeFilter) {
      const resTime = new Date(reservation.orderDetails.startTime);
      const [endHour] = endTimeFilter.split(':');
      const endHourInt = parseInt(endHour, 10);
      
      if (resTime.getHours() > endHourInt) {
        return false;
      }
    }
    
    // Check status filter
    if (statusFilter !== 'all' && 
        reservation.orderDetails.status.toLowerCase() !== statusFilter.toLowerCase()) {
      return false;
    }
    
    return true;
  };

  // Function to update reservation status
  const updateReservationStatus = async (reservationId, newStatus) => {
    try {
      const response = await fetch(`${apiUrl}/update_Reservation/restaurant/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('token') || ''
        },
        body: JSON.stringify({
          reservation_id: reservationId,
          status: newStatus
        }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        alert(`Failed to update status: ${data.message}`);
      }
      
      // No need to manually update state or reload - WebSocket will handle it
    } catch (error) {
      console.error('Error updating reservation status:', error);
      alert('Failed to update reservation status. Please try again.');
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
              onClick={() => {
                updateReservationStatus(selectedReservation.id, 'Planning');
                setShowStatusModal(false);
              }}
            >
              Planning
            </button>
            <button 
              className="mng-status-btn mng-status-seated"
              onClick={() => {
                updateReservationStatus(selectedReservation.id, 'Seated');
                setShowStatusModal(false);
              }}
            >
              Seated
            </button>
            <button 
              className="mng-status-btn mng-status-done"
              onClick={() => {
                updateReservationStatus(selectedReservation.id, 'Done');
                setShowStatusModal(false);
              }}
            >
              Done
            </button>
          </div>
          <button 
            className="mng-modal-close"
            onClick={() => setShowStatusModal(false)}
          >
            Cancel
          </button>
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
          {socketConnected && (
            <div className="mng-realtime-badge">
              Realtime Updates Active
            </div>
          )}
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
                  className="mng-reservation-row"
                >
                  <td className="mng-time-column">{formatTime24h(reservation.orderDetails.startTime)}</td>
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
                    >
                      Edit
                    </button>
                    <button 
                      className="mng-action-btn mng-cancel-btn"
                      onClick={(e) => handleCancelReservation(e, reservation)}
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