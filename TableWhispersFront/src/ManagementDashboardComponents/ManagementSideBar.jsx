import React, { useState, useEffect } from 'react';
import './ManagementDashboardCSS/MngSidebar.css';

const ManagementSideBar = ({ activeView, setActiveView }) => {
  const [restaurantName, setRestaurantName] = useState('Loading...');
  const restaurantId = '67937038eb604c7927e85d2a';

  useEffect(() => {
    const fetchRestaurantName = async () => {
      try {

        const response = await fetch(`http://localhost:7000/restaurant/${restaurantId}`);
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
    { id: 'orders', label: 'Orders', icon: '🧾' },
    { id: 'menu', label: 'Menu', icon: '🍲' },
    { id: 'staff', label: 'Staff', icon: '👨‍🍳' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
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