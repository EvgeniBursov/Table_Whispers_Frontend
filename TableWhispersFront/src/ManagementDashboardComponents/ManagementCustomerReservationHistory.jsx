import React, { useState, useEffect } from 'react';
import './ManagementDashboardCSS/MngCustomerReservationHistory.css';
const API_URL = import.meta.env.VITE_BACKEND_API || 'http://localhost:5000';


// Define the utility functions that are needed - using 24-hour format
const formatTime24h = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false // Use 24-hour format
  });
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const CustomerReservationHistory = ({ customer, onSelectReservation,restaurantId }) => {
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5; // Number of items to display per page
    
    useEffect(() => {
      const fetchReservationHistory = async () => {
        if (!customer || (!customer.email && !customer.id)) return;
        
        try {
          setLoading(true);
          
          const params = new URLSearchParams();
          if (customer.id) params.append('customer_id', customer.id);
          if (customer.email) params.append('email', customer.email);
          params.append('restaurantId', restaurantId);
          const response = await fetch(`${API_URL}/get_Customer_Reservation_History/restaurant/?${params}`, {
            headers: {
              'Authorization': localStorage.getItem('token') || ''
            }
          });
          
          const data = await response.json();
          
          if (!data.success) {
            throw new Error(data.message || 'Failed to fetch reservation history');
          }
          
          setReservations(data.reservations);
          setError(null);
        } catch (err) {
          console.error('Error fetching reservation history:', err);
          setError('Failed to load reservation history. Please try again.');
        } finally {
          setLoading(false);
        }
      };
      
      fetchReservationHistory();
    }, [customer]);
    
    // Calculate pagination values
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = reservations.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(reservations.length / itemsPerPage);
    
    // Handle page changes
    const handlePageChange = (pageNumber) => {
      setCurrentPage(pageNumber);
    };
    
    if (loading) {
      return <div className="crh-loading">Loading reservation history...</div>;
    }
    
    if (error) {
      return <div className="crh-error">{error}</div>;
    }
    
    if (!reservations || reservations.length === 0) {
      return <div className="crh-empty">No previous reservations found.</div>;
    }
    
    return (
      <div className="crh-container">
        <table className="crh-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Date</th>
              <th>Time</th>
              <th>Guests</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((reservation) => (
              <tr 
                key={reservation.id} 
                className={`crh-table-row crh-status-${reservation.status?.toLowerCase() || 'unknown'}`}
                onClick={() => onSelectReservation && onSelectReservation(reservation)}
              >
                <td>{reservation.customerName}</td>
                <td>{reservation.date ? formatDate(reservation.date) : '-'}</td>
                <td>{reservation.time ? formatTime24h(reservation.time) : '-'}</td>
                <td>{reservation.guests || '-'}</td>
                <td>
                  <span className={`crh-status-badge ${getStatusClass(reservation.status)}`}>
                    {reservation.status || 'Unknown'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {totalPages > 1 && (
          <div className="crh-pagination">
            <button 
              className="crh-pagination-btn" 
              onClick={() => handlePageChange(currentPage - 1)} 
              disabled={currentPage === 1}
            >
              &laquo; Prev
            </button>
            
            <span className="crh-pagination-info">
              Page {currentPage} of {totalPages}
            </span>
            
            <button 
              className="crh-pagination-btn" 
              onClick={() => handlePageChange(currentPage + 1)} 
              disabled={currentPage === totalPages}
            >
              Next &raquo;
            </button>
          </div>
        )}
      </div>
    );
  };
  
  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed': return 'crh-status-confirmed';
      case 'planning': return 'crh-status-pending';
      case 'cancelled': return 'crh-status-cancelled';
      case 'done': return 'crh-status-completed';
      case 'seated': return 'crh-status-seated';
      default: return '';
    }
  };

export default CustomerReservationHistory;