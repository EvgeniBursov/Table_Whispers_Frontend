import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ManagementDashboardCSS/MngHeader.css';

const ManagementHeader = ({ restaurant }) => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Update the time every second for real-time clock
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);
  
  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  
  // Use 24-hour format (hour12: false)
  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false  // Use 24-hour format
  });
  
  // Handle logout functionality
  const handleLogout = () => {
    // Clear authentication data from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    
    // Redirect to homepage
    navigate('/HomePage');
  };

  return (
    <div className="mng-header">
      <div className="mng-date-time">
        <div className="mng-date">{formattedDate}</div>
        <div className="mng-time">{formattedTime}</div>
      </div>
      
      {restaurant && (
        <div className="mng-restaurant-info">
          <h2 className="mng-restaurant-name">{restaurant.res_name || restaurant.name}</h2>
        </div>
      )}
      
      <div className="mng-search-container">
        <input 
          type="text" 
          placeholder="Search..." 
          className="mng-search-input" 
        />
      </div>
      
      <div className="mng-header-actions">
        <div className="mng-notification-icon">🔔</div>
        <div className="mng-user-profile">
          <div className="mng-avatar">👤</div>
          <div className="mng-user-name">Admin</div>
        </div>
        <div className="mng-logout-btn" onClick={handleLogout}>
          <span className="mng-logout-icon">🚪</span>
          <span className="mng-logout-text">Logout</span>
        </div>
      </div>
    </div>
  );
};

export default ManagementHeader;