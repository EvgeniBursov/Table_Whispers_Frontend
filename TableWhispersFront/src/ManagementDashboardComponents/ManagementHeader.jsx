import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ManagementDashboardCSS/MngHeader.css';

const ManagementHeader = ({ 
  restaurant, 
  notifications = [], 
  socketConnected = false,
  onClearNotifications = () => {} 
}) => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  
  // Update the time every second for real-time clock
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);
  
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
  
  // Toggle notifications dropdown
  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    setHasNewNotification(false);
  };
  
  // Format notification time
  const formatNotificationTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    
    // Check if notification was today
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    // Otherwise show date and time
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Group notifications by type
  const groupedNotifications = {
    new: notifications.filter(n => n.type === 'new'),
    status: notifications.filter(n => n.type === 'status'),
    cancellation: notifications.filter(n => n.type === 'cancellation'),
    change: notifications.filter(n => n.type === 'change'),
    table: notifications.filter(n => n.type === 'table'),
    update: notifications.filter(n => n.type === 'update'),
    error: notifications.filter(n => n.type === 'error')
  };
  
  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new': return '🆕';
      case 'status': return '🔄';
      case 'cancellation': return '❌';
      case 'change': return '📝';
      case 'table': return '🍽️';
      case 'error': return '⚠️';
      default: return '🔔';
    }
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
        {/* Real-time status indicator */}
        <div className={`mng-realtime-status ${socketConnected ? 'connected' : 'disconnected'}`}>
          <span className="mng-status-indicator"></span>
          {socketConnected ? 'Connected' : 'Offline'}
        </div>
        
        {/* Notifications */}
        <div className="mng-notification-center">
          <button 
            className={`mng-notification-bell ${hasNewNotification ? 'has-new' : ''}`}
            onClick={toggleNotifications}
          >
            🔔
            {notifications.length > 0 && (
              <span className="mng-notification-count">{notifications.length}</span>
            )}
          </button>
          
          {/* Notifications dropdown */}
          {showNotifications && (
            <div className="mng-notifications-dropdown">
              <div className="mng-notifications-header">
                <h3>Notifications</h3>
                <button className="mng-clear-notifications" onClick={onClearNotifications}>
                  Clear All
                </button>
              </div>
              
              <div className="mng-notifications-content">
                {notifications.length === 0 ? (
                  <div className="mng-no-notifications">
                    No new notifications
                  </div>
                ) : (
                  <div className="mng-notifications-list">
                    {/* New reservations */}
                    {groupedNotifications.new.length > 0 && (
                      <div className="mng-notification-group">
                        <h4>New Reservations</h4>
                        {groupedNotifications.new.map(notification => (
                          <div key={notification.id} className="mng-notification-item new">
                            <div className="mng-notification-icon">{getNotificationIcon('new')}</div>
                            <div className="mng-notification-info">
                              <div className="mng-notification-message">{notification.message}</div>
                              <div className="mng-notification-time">
                                {formatNotificationTime(notification.timestamp)}
                              </div>
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
                            <div className="mng-notification-icon">{getNotificationIcon('cancellation')}</div>
                            <div className="mng-notification-info">
                              <div className="mng-notification-message">{notification.message}</div>
                              <div className="mng-notification-time">
                                {formatNotificationTime(notification.timestamp)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Status changes */}
                    {groupedNotifications.status.length > 0 && (
                      <div className="mng-notification-group">
                        <h4>Status Updates</h4>
                        {groupedNotifications.status.map(notification => (
                          <div key={notification.id} className="mng-notification-item status">
                            <div className="mng-notification-icon">{getNotificationIcon('status')}</div>
                            <div className="mng-notification-info">
                              <div className="mng-notification-message">{notification.message}</div>
                              <div className="mng-notification-time">
                                {formatNotificationTime(notification.timestamp)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Other notifications... */}
                    {groupedNotifications.change.length > 0 && (
                      <div className="mng-notification-group">
                        <h4>Changes</h4>
                        {groupedNotifications.change.map(notification => (
                          <div key={notification.id} className="mng-notification-item change">
                            <div className="mng-notification-icon">{getNotificationIcon('change')}</div>
                            <div className="mng-notification-info">
                              <div className="mng-notification-message">{notification.message}</div>
                              <div className="mng-notification-time">
                                {formatNotificationTime(notification.timestamp)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
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