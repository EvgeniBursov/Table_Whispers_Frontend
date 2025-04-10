import React, { useState, useEffect } from 'react';
import './RestaurantManagementDashboard.css';

// Import components
import MngSidebar from '../../ManagementDashboardComponents/ManagementSideBar';
import MngHeader from '../../ManagementDashboardComponents/ManagementHeader';
import MngReservationList from '../../ManagementDashboardComponents/ManagementReservationList';
import MngReservationDetail from '../../ManagementDashboardComponents/ManagementReservationDetail';
import MngNewReservationForm from '../../ManagementDashboardComponents/ManagementNewReservationForm';
import MngEmptyState from '../../ManagementDashboardComponents/ManagementEmptyState';
import MngCustomers from '../../ManagementDashboardComponents/ManagementCustomers';
import MngTables from '../../ManagementTablesComponents/ManagementTables';
import MngMenu from '../../ManagementDashboardComponents/ManagementRestaurantMenu';
import MngAnalytics from '../../ManagementDashboardComponents/ManagementAnalytics';
import { io } from 'socket.io-client';

const RestaurantManagementDashboard = () => {
  // State variables
  const [activeView, setActiveView] = useState('reservations');
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [restaurantData, setRestaurantData] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  // Set today's date as default date filter
  const todayDate = new Date().toISOString().split('T')[0];
  const [dateFilter, setDateFilter] = useState(todayDate);
  
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Hardcoded restaurant ID - in production this would come from authentication
  const restaurantId = '67937038eb604c7927e85d2a';

  // Initialize socket.io connection once on component mount
  useEffect(() => {
    // Socket setup
    const socketUrl = 'http://localhost:5000';
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });

    // Handle socket connection
    socket.on('connect', () => {
      console.log('WebSocket connected!');
      setSocketConnected(true);
      
      // Join restaurant-specific room for targeted events
      socket.emit('joinRestaurantRoom', { restaurantId });
      console.log(`Joined restaurant room: restaurant_${restaurantId}`);
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setSocketConnected(false);
    });

    // Handle reservation updates from any source
    socket.on('reservationUpdated', (data) => {
      console.log('Received reservation update:', data);
      addNotification({
        type: 'update',
        message: `Reservation #${data.reservationId.slice(-6)} was updated`,
        timestamp: new Date(data.timestamp || Date.now())
      });
      
      // Refresh data after a short delay
      setTimeout(() => {
        loadRestaurantData();
      }, 300);
    });

    // Handle detailed reservation changes
    socket.on('reservationDetailsChanged', (data) => {
      console.log('Received detailed reservation change:', data);
      
      // Create a meaningful notification message
      let message = `Reservation for ${data.customerName || 'a customer'} was updated`;
      
      if (data.updates) {
        const changes = [];
        
        if (data.updates.dateChanged) changes.push('date');
        if (data.updates.timeChanged) changes.push('time');
        if (data.updates.guestsChanged) changes.push('number of guests');
        if (data.updates.tableChanged) changes.push('table assignment');
        
        if (changes.length > 0) {
          message = `${data.customerName || 'A customer'} changed reservation ${changes.join(', ')}`;
        }
      }
      
      addNotification({
        type: 'change',
        message,
        timestamp: new Date(data.timestamp || Date.now()),
        details: data
      });
      
      // Update the reservation in the state if it exists
      if (data.reservationId) {
        updateReservationInState(data);
      }
    });

    // Handle client reservation cancellations
    socket.on('clientCancelledReservation', (data) => {
      console.log('Received reservation cancellation:', data);
      
      // Create notification
      addNotification({
        type: 'cancellation',
        message: `${data.clientName || 'A customer'} cancelled their reservation`,
        timestamp: new Date(data.timestamp || Date.now()),
        details: data
      });
      
      // Refresh data to ensure everything is in sync
      loadRestaurantData();
    });

    // Handle new reservations
    socket.on('reservationCreated', (data) => {
      console.log('Received new reservation:', data);
      
      // Add notification
      addNotification({
        type: 'new',
        message: `New reservation created for ${data.newReservation?.customer?.firstName || 'a customer'}`,
        timestamp: new Date(),
        details: data
      });
      
      // Update state with new reservation
      setReservations(prev => [data.newReservation, ...prev]);
    });

    // Handle table assignments
    socket.on('tableAssigned', (data) => {
      console.log('Table assigned:', data);
      
      // Add notification
      addNotification({
        type: 'table',
        message: `Table ${data.tableNumber} assigned to reservation #${data.reservationId.slice(-6)}`,
        timestamp: new Date(),
        details: data
      });
      
      // Update any matching reservations in state
      setReservations(prev => prev.map(res => {
        if (res.id === data.reservationId) {
          return {
            ...res,
            orderDetails: {
              ...res.orderDetails,
              tableNumber: data.tableNumber
            }
          };
        }
        return res;
      }));
    });

    // Play a sound when a notification arrives (optional)
    const playNotificationSound = () => {
      try {
        const audio = new Audio('/notification-sound.mp3');
        audio.play();
      } catch (error) {
        console.error('Error playing notification sound:', error);
      }
    };

    // Listen for status changes
    socket.on('reservationStatusChanged', (data) => {
      console.log('Reservation status changed:', data);
      playNotificationSound();
      
      // Add notification
      addNotification({
        type: 'status',
        message: `Reservation #${data.reservationId.slice(-6)} status changed to ${data.newStatus}`,
        timestamp: new Date(data.timestamp || Date.now()),
        details: data
      });
      
      // Update reservation in state
      setReservations(prev => prev.map(res => {
        if (res.id === data.reservationId) {
          return {
            ...res,
            orderDetails: {
              ...res.orderDetails,
              status: data.newStatus
            }
          };
        }
        return res;
      }));
      
      // If we're viewing this reservation, update the selected reservation too
      if (selectedReservation && selectedReservation.id === data.reservationId) {
        setSelectedReservation(prev => ({
          ...prev,
          orderDetails: {
            ...prev.orderDetails,
            status: data.newStatus
          }
        }));
      }
    });

    // Cleanup on component unmount
    return () => {
      // Leave restaurant room before disconnecting
      socket.emit('leaveRestaurantRoom', { restaurantId });
      
      // Disconnect socket
      socket.disconnect();
    };
  }, [restaurantId]); // Empty dependency array means this effect runs once on mount

  // Fetch restaurant data on component mount and when date filter changes
  useEffect(() => {
    loadRestaurantData();
  }, [dateFilter]); // Re-fetch when date filter changes

  // Add a notification to the state
  const addNotification = (notification) => {
    setNotifications(prev => [{
      id: Date.now(),
      ...notification
    }, ...prev]);
  };

  // Update a reservation in state when receiving socket updates
  const updateReservationInState = (data) => {
    const { reservationId, updates } = data;
    
    // Update reservations list
    setReservations(prev => prev.map(res => {
      if (res.id === reservationId) {
        // Create a deep copy to update
        const updatedRes = { ...res };
        const updatedDetails = { ...res.orderDetails };
        
        // Apply updates
        if (updates.dateChanged || updates.timeChanged) {
          // If the api provides actual startTime and endTime, use those
          // Otherwise, we'd need to construct dates from the updates
          if (data.startTime) updatedDetails.startTime = data.startTime;
          if (data.endTime) updatedDetails.endTime = data.endTime;
        }
        
        if (updates.guestsChanged) {
          updatedDetails.guests = updates.newGuests;
        }
        
        if (updates.tableChanged) {
          updatedDetails.tableNumber = updates.newTableNumber;
        }
        
        updatedRes.orderDetails = updatedDetails;
        return updatedRes;
      }
      return res;
    }));
    
    // If we're viewing this reservation, update the selected reservation too
    if (selectedReservation && selectedReservation.id === reservationId) {
      setSelectedReservation(prev => {
        const updatedDetails = { ...prev.orderDetails };
        
        // Apply the same updates to selected reservation
        if (updates.dateChanged || updates.timeChanged) {
          if (data.startTime) updatedDetails.startTime = data.startTime;
          if (data.endTime) updatedDetails.endTime = data.endTime;
        }
        
        if (updates.guestsChanged) {
          updatedDetails.guests = updates.newGuests;
        }
        
        if (updates.tableChanged) {
          updatedDetails.tableNumber = updates.newTableNumber;
        }
        
        return {
          ...prev,
          orderDetails: updatedDetails
        };
      });
    }
  };

  // Load restaurant data and reservations
  const loadRestaurantData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Make the API call with date parameter
      const url = new URL(`http://localhost:5000/reservation/restaurant/${restaurantId}`);
      
      // Add date parameter if date filter is set
      if (dateFilter) {
        url.searchParams.append('date', dateFilter);
      }
      
      const response = await fetch(url);
      
      // Parse the JSON response
      const data = await response.json();
      
      console.log("API Response:", data);
      
      if (data && data.success) {
        // Set restaurant data
        setRestaurantData(data.restaurant);
        
        // Set reservations
        if (Array.isArray(data.reservations)) {
          console.log(`Found ${data.reservations.length} reservations for date: ${dateFilter || 'all dates'}`);
          setReservations(data.reservations);
        } else {
          console.log('No reservations array in response');
          setReservations([]);
        }
      } else {
        console.error('API call unsuccessful');
        setError('Failed to load restaurant data');
        setReservations([]);
      }
    } catch (err) {
      console.error('Error loading restaurant data:', err);
      setError(err.message || 'Failed to load restaurant data');
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle adding a new reservation
  const handleAddReservation = (newReservation) => {
    if (newReservation) {
      setReservations(prev => [newReservation, ...prev]);
      
      // Add a notification
      addNotification({
        type: 'new',
        message: `New reservation added for ${newReservation.customer?.firstName || 'a customer'}`,
        timestamp: new Date(),
        details: newReservation
      });
    }
    setShowReservationForm(false);
  };
  
  // Handle reservation status update
  const handleUpdateReservationStatus = async (reservationId, newStatus) => {
    setLoading(true);
    
    try {
      // Get customer information from the selected reservation
      const reservation = reservations.find(res => res.id === reservationId);
      const customerEmail = reservation?.customer?.email;
      const customerName = reservation?.customer?.firstName 
                         ? `${reservation.customer.firstName} ${reservation.customer.lastName || ''}`
                         : 'Customer';
      
      // Call the API to update the reservation status
      const response = await fetch(`http://localhost:5000/update_Reservation/restaurant/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reservation_id: reservationId,
          status: newStatus,
          notify_all: true, // This will notify all connected clients
          restaurant_id: restaurantId,
          client_email: customerEmail,
          client_name: customerName
        }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to update reservation status');
      }
      
      // Add notification
      addNotification({
        type: 'status',
        message: `Status updated to ${newStatus} for ${customerName}'s reservation`,
        timestamp: new Date(),
        details: { reservationId, newStatus, customerEmail, customerName }
      });
      
      // Update the reservations in state - though this should also happen via socket
      setReservations(prevReservations => 
        prevReservations.map(res => {
          if (res.id === reservationId) {
            return {
              ...res,
              orderDetails: {
                ...res.orderDetails,
                status: newStatus
              }
            };
          }
          return res;
        })
      );
      
      // If we're viewing the detail of this reservation, update the selected reservation too
      if (selectedReservation && selectedReservation.id === reservationId) {
        setSelectedReservation(prev => ({
          ...prev,
          orderDetails: {
            ...prev.orderDetails,
            status: newStatus
          }
        }));
      }
      
      return true;
    } catch (error) {
      console.error('Error updating reservation status:', error);
      
      // Add error notification
      addNotification({
        type: 'error',
        message: `Failed to update reservation: ${error.message}`,
        timestamp: new Date()
      });
      
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Handle reservation edit
  const handleUpdateReservation = async (action, updatedData) => {
    if (action === 'cancelled') {
      // Handle cancellation
      const success = await handleUpdateReservationStatus(selectedReservation.id, 'Cancelled');
      if (success) {
        setSelectedReservation(prev => ({
          ...prev,
          orderDetails: {
            ...prev.orderDetails,
            status: 'Cancelled'
          }
        }));
      }
    } else if (action === 'update') {
      try {
        // Get customer information from the selected reservation
        const customerEmail = selectedReservation?.customer?.email;
        const customerName = selectedReservation?.customer?.firstName 
                           ? `${selectedReservation.customer.firstName} ${selectedReservation.customer.lastName || ''}`
                           : 'Customer';
        
        // Make API call to update reservation details
        const response = await fetch(`http://localhost:5000/update_Reservation_Details/restaurant`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reservation_id: selectedReservation.id,
            ...updatedData,
            notify_all: true, // This will notify all connected clients
            restaurant_id: restaurantId,
            client_email: customerEmail,
            client_name: customerName
          }),
        });
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.message || 'Failed to update reservation details');
        }
        
        // Add notification
        addNotification({
          type: 'update',
          message: `Details updated for ${customerName}'s reservation`,
          timestamp: new Date(),
          details: { reservationId: selectedReservation.id, updatedData, customerEmail, customerName }
        });
        
        // Update state with new data - though this should also happen via socket
        setReservations(prevReservations => 
          prevReservations.map(res => {
            if (res.id === updatedData.id) {
              return {
                ...res,
                orderDetails: {
                  ...res.orderDetails,
                  ...updatedData.orderDetails
                }
              };
            }
            return res;
          })
        );
        
        // Update selected reservation if we're viewing it
        setSelectedReservation(prev => ({
          ...prev,
          orderDetails: {
            ...prev.orderDetails,
            ...updatedData.orderDetails
          }
        }));
      } catch (error) {
        console.error('Error updating reservation details:', error);
        
        // Add error notification
        addNotification({
          type: 'error',
          message: `Failed to update reservation details: ${error.message}`,
          timestamp: new Date()
        });
      }
    } else {
      // Handle other status updates (confirmed, seated, completed)
      const success = await handleUpdateReservationStatus(selectedReservation.id, action);
      if (success) {
        setSelectedReservation(prev => ({
          ...prev,
          orderDetails: {
            ...prev.orderDetails,
            status: action
          }
        }));
      }
    }
  };
  
  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
  };
  
  // Main Dashboard Render
  if (loading && !restaurantData) {
    return <div className="mng-loading">Loading dashboard...</div>;
  }
  
  if (error && !restaurantData) {
    return (
      <MngEmptyState 
        icon="❌" 
        title="Error Loading Data" 
        message={error} 
        actionText="Try Again" 
        onAction={loadRestaurantData} 
      />
    );
  }
  
  if (!restaurantData) {
    return (
      <MngEmptyState 
        icon="🏢" 
        title="Restaurant Not Found" 
        message="The requested restaurant information could not be found." 
        actionText="Try Again" 
        onAction={loadRestaurantData} 
      />
    );
  }
  
  return (
    <div className="mng-dashboard-container">
      <MngSidebar activeView={activeView} setActiveView={setActiveView} />
      <div className="mng-main-content">
        <MngHeader 
          restaurant={restaurantData} 
          notifications={notifications}
          socketConnected={socketConnected}
          onClearNotifications={clearAllNotifications}
        />
        
        {/* New Reservation Form Modal */}
        {showReservationForm && (
          <div className="mng-modal-overlay">
            <MngNewReservationForm 
              restaurantId={restaurantId}
              restaurantData={restaurantData}
              onSave={handleAddReservation}
              onCancel={() => setShowReservationForm(false)}
            />
          </div>
        )}
        
        {/* Main content area based on active view and selection */}
        {activeView === 'reservations' && !selectedReservation && (
        <MngReservationList 
          reservations={reservations}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onSelectReservation={setSelectedReservation}
          onAddReservation={() => setShowReservationForm(true)}
          setReservations={setReservations}
          restaurantId={restaurantId}
          socketConnected={socketConnected}
          notifications={notifications}
          onClearNotifications={clearAllNotifications}
        />
      )}
        
        {activeView === 'reservations' && selectedReservation && (
          <MngReservationDetail 
            reservation={selectedReservation}
            onBack={() => setSelectedReservation(null)}
            onUpdateStatus={handleUpdateReservation}
            loading={loading}
            socketConnected={socketConnected}
          />
        )}

        {/* Customers View */}
        {activeView === 'customers' && (
          <MngCustomers restaurantId={restaurantId} />
        )}

        {activeView === 'tables' && (
          <MngTables restaurantId={restaurantId} />
        )}

        {activeView === 'menu' && (
          <MngMenu restaurantId={restaurantId} />
        )}

        {activeView === 'analytics' && (
          <MngAnalytics restaurantId={restaurantId} />
        )}


        
        {/* Other sections (coming soon) */}
        {activeView !== 'reservations' && activeView !== 'customers' && activeView !== 'tables' &&
        activeView !== 'menu' && activeView !== 'analytics' && (
          <MngEmptyState 
            icon="🚧" 
            title={`${activeView.charAt(0).toUpperCase() + activeView.slice(1)} Management`} 
            message="This section is coming soon." 
          />
        )}
        
        {/* Toast container for real-time notifications */}
        <div id="toast-container" className="mng-toast-container"></div>
      </div>
    </div>
  );
};

export default RestaurantManagementDashboard;