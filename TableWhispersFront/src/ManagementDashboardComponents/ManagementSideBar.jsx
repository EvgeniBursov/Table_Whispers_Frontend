import React, { useState, useEffect } from 'react';
import './ManagementDashboardCSS/MngSidebar.css';
const API_URL = import.meta.env.VITE_BACKEND_API || 'http://localhost:5000';



const ManagementSideBar = ({ activeView, setActiveView, restaurantId }) => {
  const [restaurantName, setRestaurantName] = useState('Loading...');
  const restaurant_Id = restaurantId;

  useEffect(() => {
    const fetchRestaurantName = async () => {
      try {

        const response = await fetch(`${API_URL}/restaurant/${restaurant_Id}`);
        const data = await response.json();
        setRestaurantName(data.res_name)
      } catch (error) {
        console.error('Error fetching restaurant name:', error);
        setRestaurantName('Restaurant');
      }
    };
    
    fetchRestaurantName();
  }, []);

  const menuItems = [
    { id: 'reservations', label: 'Reservations', icon: '📅' },
    { id: 'tables', label: 'Tables', icon: '🍽️' },
    { id: 'customers', label: 'Customers', icon: '👥' },
    { id: 'menu', label: 'Menu', icon: '🍲' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'surveys', label: 'Surveys', icon: '🗳️' },
    { id: 'restaurantPage', label: 'Restaurant Page', icon: '🏠' },
    { id: 'chat', label: 'Chat', icon: '💬' },
  ];

  return (
    <div className="mng-sidebar">
      <div className="mng-logo-container">
        <div className="mng-logo">{restaurantName}</div>
      </div>
      <div className="mng-menu-items">
        {menuItems.map(item => (
          <div 
            key={item.id}
            className={`mng-menu-item ${activeView === item.id ? 'active' : ''}`}
            onClick={() => setActiveView(item.id)}
          >
            <span className="mng-icon">{item.icon}</span>
            <span className="mng-label">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ManagementSideBar;