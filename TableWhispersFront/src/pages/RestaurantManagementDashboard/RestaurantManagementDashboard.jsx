import React, { useState, useEffect } from 'react';
import './RestaurantManagementDashboard.css';

// Import components
import MngSidebar from '../../ManagementDashboardComponents/ManagementSideBar';
import MngHeader from '../../ManagementDashboardComponents/ManagementHeader';
import MngReservationList from '../../ManagementDashboardComponents/ManagementReservationList';
import MngReservationDetail from '../../ManagementDashboardComponents/ManagementReservationDetail';
import MngNewReservationForm from '../../ManagementDashboardComponents/ManagementNewReservationForm';
import MngEmptyState from '../../ManagementDashboardComponents/ManagementEmptyState';

const RestaurantManagementDashboard = () => {
  // State variables
  const [activeView, setActiveView] = useState('reservations');
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [restaurantData, setRestaurantData] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReservationForm, setShowReservationForm] = useState(false);
  
  // Set today's date as default date filter
  const todayDate = new Date().toISOString().split('T')[0];
  const [dateFilter, setDateFilter] = useState(todayDate);
  
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Hardcoded restaurant ID
  const restaurantId = '67937038eb604c7927e85d2a';
  
  // Fetch restaurant data on component mount
  useEffect(() => {
    loadRestaurantData();
  }, [dateFilter]); // Re-fetch when date filter changes

  // Load restaurant data and reservations
  const loadRestaurantData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Make the API call with date parameter
      const url = new URL(`http://localhost:7000/reservation/restaurant/${restaurantId}`);
      
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
    }
    setShowReservationForm(false);
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
        <MngHeader restaurant={restaurantData} />
        
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
          />
        )}
        
        {activeView === 'reservations' && selectedReservation && (
          <MngReservationDetail 
            reservation={selectedReservation}
            onBack={() => setSelectedReservation(null)}
            loading={loading}
          />
        )}
        
        {/* Other sections (coming soon) */}
        {activeView !== 'reservations' && (
          <MngEmptyState 
            icon="🚧" 
            title={`${activeView.charAt(0).toUpperCase() + activeView.slice(1)} Management`} 
            message="This section is coming soon." 
          />
        )}
      </div>
    </div>
  );
};

export default RestaurantManagementDashboard;