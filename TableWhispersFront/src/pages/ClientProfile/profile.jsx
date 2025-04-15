import React, { useState, useEffect, useMemo } from "react";
import { assets } from "../../assets/assets";
import BillModal  from "../../components/Bills/Bills";
import { io } from 'socket.io-client';
import "./profile.css";
import ChatWithRestaurant from '../../ChatManagement/ChatWithRestaurant';

// Initialize Socket.io connection
const socketUrl = 'http://localhost:5000';

const ClientProfile = () => {
  const [profile, setProfile] = useState(null);
  const [allergies, setAllergies] = useState([]);
  const [selectedAllergy, setSelectedAllergy] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Planning");
  const [password, setPassword] = useState("");
  const [confirm_password, setConfirmPassword] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingPhone, setEditingPhone] = useState(false);
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const ordersPerPage = 3;
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [socket, setSocket] = useState(null);
  const [selectedBill, setSelectedBill] = useState(null);
  const [activeChatRestaurant, setActiveChatRestaurant] = useState(null);
  
  // State variables for reservation editing
  const [editingReservation, setEditingReservation] = useState(null);
  const [editFormData, setEditFormData] = useState({
    date: '',
    time: '',
    guests: ''
  });
  const [editFormError, setEditFormError] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const email = localStorage.getItem("userEmail");

  // Initialize socket connection
  useEffect(() => {
    // Create socket instance
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });
    
    setSocket(newSocket);
    
    // Socket connection handlers
    newSocket.on('connect', () => {
      console.log('WebSocket connected!');
      setSocketConnected(true);
      
      // Join customer-specific room for targeted updates
      if (email) {
        newSocket.emit('joinCustomerRoom', { customerEmail: email });
        console.log(`Joined customer room: customer_${email}`);
      }
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setSocketConnected(false);
    });

    // Cleanup on unmount
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [email]);

  // Set up WebSocket listeners once socket and profile are available
  useEffect(() => {
    if (!socket || !profile) return;

    // Listen for reservation updates
    socket.on('reservationUpdated', (data) => {
      console.log('Received reservation update:', data);
      
      // Add notification
      addNotification({
        type: 'update',
        message: `Reservation #${data.reservationId.slice(-6)} was updated`,
        timestamp: new Date(data.timestamp || Date.now())
      });
      
      // Refresh profile to get updated reservation data
      fetchProfile();
    });

    // Listen for specific reservation status changes
    socket.on('reservationStatusChanged', (data) => {
      console.log('Reservation status changed:', data);
      
      // Skip if not relevant to this customer
      if (data.customerEmail && data.customerEmail !== email) return;
      
      // Add notification
      addNotification({
        type: 'status',
        message: `Your reservation at ${data.restaurantName || 'restaurant'} status changed to ${data.newStatus}`,
        timestamp: new Date(data.timestamp || Date.now())
      });
      
      // Update the order status in the profile
      updateReservationInProfile(data.reservationId, {
        status: data.newStatus
      });
      
      // If status changed to "Cancelled", refresh entire profile
      if (data.newStatus.toLowerCase() === 'cancelled') {
        fetchProfile();
      }
    });

    // Listen for detailed reservation changes
    socket.on('reservationDetailsChanged', (data) => {
      console.log('Reservation details changed:', data);
      
      // Skip if not relevant to this customer
      if (data.customerEmail && data.customerEmail !== email) return;
      
      // Create a meaningful notification message
      let message = `Your reservation at ${data.restaurantName || 'restaurant'} was updated`;
      
      if (data.updates) {
        const changes = [];
        
        if (data.updates.dateChanged) changes.push('date');
        if (data.updates.timeChanged) changes.push('time');
        if (data.updates.guestsChanged) changes.push('number of guests');
        if (data.updates.tableChanged) changes.push('table number');
        
        if (changes.length > 0) {
          message = `Your reservation ${changes.join(', ')} was updated by the restaurant`;
        }
      }
      
      // Add notification
      addNotification({
        type: 'change',
        message,
        timestamp: new Date(data.timestamp || Date.now()),
        details: data
      });
      
      // Update the specific reservation in state
      if (data.reservationId && data.updates) {
        const updates = {};
        
        // Build updates object
        if (data.updates.dateChanged || data.updates.timeChanged) {
          // Need to update orderDate and possibly time fields
          fetchProfile(); // Refresh all data for now
          return;
        }
        
        if (data.updates.guestsChanged) {
          updates.guests = data.updates.newGuests;
        }
        
        if (data.updates.tableChanged) {
          updates.tableNumber = data.updates.newTableNumber;
        }
        
        // Apply updates
        updateReservationInProfile(data.reservationId, updates);
      }
    });

    // Listen for table assignments
    socket.on('tableAssigned', (data) => {
      console.log('Table assigned:', data);
      
      // Skip if not relevant to this customer
      if (data.customerEmail && data.customerEmail !== email) return;
      
      // Add notification
      addNotification({
        type: 'table',
        message: `Table ${data.tableNumber} assigned to your reservation`,
        timestamp: new Date()
      });
      
      // Update the reservation in profile
      updateReservationInProfile(data.reservationId, {
        tableNumber: data.tableNumber
      });
    });

    // Cleanup listeners on unmount or when dependencies change
    return () => {
      socket.off('reservationUpdated');
      socket.off('reservationStatusChanged');
      socket.off('reservationDetailsChanged');
      socket.off('tableAssigned');
    };
  }, [socket, profile, email]);

  // Add a notification to the state
  const addNotification = (notification) => {
    setNotifications(prev => [{
      id: Date.now(),
      ...notification
    }, ...prev]);
    
    // Play notification sound
    playNotificationSound();
    
    // Show toast notification
    showNotificationToast(notification.message);
  };

  // Play notification sound
  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification-sound.mp3');
      audio.play();
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  // Display toast notification
  const showNotificationToast = (message) => {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.innerHTML = `
      <div class="notification-icon">🔔</div>
      <div class="notification-content">${message}</div>
      <button class="notification-close">×</button>
    `;
    
    // Add to document
    document.body.appendChild(toast);
    
    // Add close functionality
    const closeBtn = toast.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
      toast.classList.add('notification-toast-hiding');
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    });
    
    // Auto-remove after 7 seconds
    setTimeout(() => {
      if (document.body.contains(toast)) {
        toast.classList.add('notification-toast-hiding');
        setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast);
          }
        }, 300);
      }
    }, 7000);
    
    // Animate in
    setTimeout(() => {
      toast.classList.add('notification-toast-visible');
    }, 10);
  };

  // Update a specific reservation in the profile state
  const updateReservationInProfile = (reservationId, updates) => {
    if (!profile || !profile.orders) return;
    
    setProfile(prevProfile => {
      // Create a new orders array with the updated reservation
      const updatedOrders = prevProfile.orders.map(order => {
        if (order.order_id === reservationId) {
          return {
            ...order,
            ...updates
          };
        }
        return order;
      });
      
      // Return updated profile
      return {
        ...prevProfile,
        orders: updatedOrders
      };
    });
  };

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/userProfile?email=${email}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch profile");
      const data = await response.json();
      console.log(data);
      setProfile(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchAllergies = async () => {
      try {
        const response = await fetch("http://localhost:5000/getListOfAllergies");
        if (!response.ok) throw new Error("Failed to fetch allergies");
        
        const data = await response.json();
        setAllergies(data); 
      } catch (error) {
        console.error("Error fetching allergies:", error); 
      }
    };
    
    fetchProfile();
    fetchAllergies();
    
  }, [email]);

  // Helper function for normalized string comparison
  const normalizedCompare = (a, b) => {
    return (a || '').toString().toLowerCase().trim() === 
           (b || '').toString().toLowerCase().trim();
  };

  // Filter and sort orders by status and date (newest to oldest)
  const getFilteredOrders = (status) => {
    if (!profile || !profile.orders) return [];
    
    // Use normalized comparison to handle potential whitespace or case issues
    const filteredOrders = profile.orders.filter(order => {
      return normalizedCompare(order.status, status);
    });
    
    return filteredOrders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
  };

  // Memoize filtered orders to avoid recalculating on every render
  const filteredOrdersByStatus = useMemo(() => {
    const result = {};
    if (profile && profile.orders) {
      ['Planning', 'Seated', 'Done', 'Cancelled'].forEach(status => {
        result[status] = getFilteredOrders(status);
      });
    }
    return result;
  }, [profile]);
  
  // Get current orders for pagination using memoized filtered orders
  const getCurrentOrders = (status) => {
    const filteredOrders = filteredOrdersByStatus[status] || [];
    const indexOfLastOrder = currentPage * ordersPerPage;
    const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
    return filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  };

  // Calculate total pages using memoized filtered orders
  const totalPages = (status) => {
    const filteredOrders = filteredOrdersByStatus[status] || [];
    return Math.ceil(filteredOrders.length / ordersPerPage);
  };

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1); // Reset to first page when changing tabs
    setEditingReservation(null); // Cancel any ongoing edits when changing tabs
  };

  const handleViewBill = (orderId) => {
    setSelectedBill(orderId);
  };

  const handleCloseBill = () => {
    setSelectedBill(null);
  };
  // Function to start editing a specific reservation
  const startReservationEdit = (order) => {
    if (order.orderDate) {
      const startDate = new Date(order.orderDate);
      
      // Format date for input field (YYYY-MM-DD)
      const formattedDate = startDate.toISOString().split('T')[0];
      
      // Format time for input field (HH:MM)
      let formattedTime = '';
      if (order.orderStart) {
        formattedTime = order.orderStart;
      } else {
        // Default to current time if no start time is available
        const now = new Date();
        formattedTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      }
      
      setEditFormData({
        date: formattedDate,
        time: formattedTime,
        guests: order.guests || 2
      });
    }
    
    setEditingReservation(order);
    setEditFormError('');
  };

  // Function to cancel editing
  const cancelReservationEdit = () => {
    setEditingReservation(null);
    setEditFormError('');
  };

  // Handle input changes in the edit form
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({
      ...editFormData,
      [name]: value
    });
  };

  // Submit the edit form to update reservation details
  const handleSubmitReservationEdit = async () => {
    if (!editingReservation) return;
    
    if (!editFormData.date || !editFormData.time || !editFormData.guests) {
      setEditFormError('Date, time and guests are required fields');
      return;
    }
    
    setIsSubmittingEdit(true);
    setEditFormError('');
    
    try {
      const startTime = new Date(`${editFormData.date}T${editFormData.time}`);
      
      // Set end time to 2 hours after start time
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 2);
      
      // Convert to ISO string format
      const startTimeISO = startTime.toISOString();
      const endTimeISO = endTime.toISOString();
      
      // Format time for display (HH:MM)
      const formattedStartTime = `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`;
      const formattedEndTime = `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`;
      
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/update_Reservation_Details/restaurant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reservation_id: editingReservation.order_id,
          date: editFormData.date,
          time: editFormData.time,
          guests: parseInt(editFormData.guests, 10),
          restaurant_id: editingReservation.restaurant_id || editingReservation.restaurantId,
          client_email: email,
          client_name: `${profile.first_name} ${profile.last_name}`,
          notify_all: true // Notify all connected clients
        }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        setEditFormError(data.message || 'Failed to update reservation');
        return;
      }
      
      // Emit socket event to notify all clients
      if (socket) {
        socket.emit('clientUpdatedReservation', {
          reservationId: editingReservation.order_id,
          restaurantId: editingReservation.restaurant_id || editingReservation.restaurantId,
          clientEmail: email,
          clientName: `${profile.first_name} ${profile.last_name}`,
          updatedDetails: {
            date: editFormData.date,
            time: editFormData.time,
            guests: parseInt(editFormData.guests, 10),
            startTime: startTimeISO,
            endTime: endTimeISO
          }
        });
      }
      
      // Add a notification
      addNotification({
        type: 'update',
        message: `Your reservation at ${editingReservation.restaurantName} was updated successfully`,
        timestamp: new Date()
      });
      
      // Update the reservation in the local state
      const updatedOrders = profile.orders.map(order => {
        if (order.order_id === editingReservation.order_id) {
          return {
            ...order,
            orderDate: startTimeISO,
            orderStart: formattedStartTime,
            orderEnd: formattedEndTime,
            guests: parseInt(editFormData.guests, 10)
          };
        }
        return order;
      });
      
      setProfile({
        ...profile,
        orders: updatedOrders
      });
      
      setEditingReservation(null);
    } catch (error) {
      console.error('Error updating reservation:', error);
      setEditFormError('An error occurred while updating the reservation');
      
      // Add error notification
      addNotification({
        type: 'error',
        message: `Failed to update reservation: ${error.message}`,
        timestamp: new Date()
      });
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle phone number edit
  const startPhoneEdit = () => {
    setNewPhoneNumber(profile.phone_number || "");
    setEditingPhone(true);
  };

  const cancelPhoneEdit = () => {
    setEditingPhone(false);
    setNewPhoneNumber("");
  };

  const handlePhoneNumberChange = async () => {
    if (!newPhoneNumber) {
      alert("Please enter a phone number!");
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/updateUserPhoneNumber", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email, phone_number: newPhoneNumber }),
      });

      let data;
      try {
        data = await response.json();
        console.log("Server response:", data);
      } catch (e) {
        console.error("Error parsing JSON:", e);
        alert("Server response was not valid JSON");
        return;
      }
      
      if (response.status === 300) {
        alert(data?.error || "Invalid phone number format");
        return;
      }

      if (!response.ok) {
        alert(data?.error || `Failed to update phone number (${response.status})`);
        return;
      }

      setProfile(prevProfile => ({
        ...prevProfile,
        phone_number: newPhoneNumber
      }));
      
      setEditingPhone(false);
      
      // Add notification
      addNotification({
        type: 'update',
        message: 'Phone number updated successfully',
        timestamp: new Date()
      });
    } catch (error) {
      console.error("Network error:", error);
      alert("Failed to connect to server. Please check your connection.");
    }
  }

  const handleCancelOrder = async (reservationId) => {
    const confirmation = window.confirm("Are you sure you want to cancel this reservation?");
    if (!confirmation) return false;
    
    setLoading(true);
    
    try {
      // Get the restaurant ID from the order
      const order = profile.orders.find(order => order.order_id === reservationId);
      const restaurantId = order?.restaurant_id || order?.restaurantId;
      
      // Call the API to update the reservation status
      const response = await fetch(`http://localhost:5000/update_Reservation/restaurant/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reservation_id: reservationId,
          status: "Cancelled",
          restaurant_id: restaurantId,
          client_email: email,
          client_name: `${profile.first_name} ${profile.last_name}`,
          notify_all: true // Notify all connected clients
        }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to update reservation status');
      }
      
      // Emit socket event to notify all clients
      if (socket) {
        socket.emit('clientCancelledReservation', {
          reservationId: reservationId,
          restaurantId: restaurantId,
          clientEmail: email,
          clientName: `${profile.first_name} ${profile.last_name}`
        });
      }
      
      // Update local state to reflect cancellation
      const updatedOrders = profile.orders.map(order => {
        if (order.order_id === reservationId) {
          return { ...order, status: "Cancelled" };
        }
        return order;
      });
      
      setProfile({
        ...profile,
        orders: updatedOrders
      });
      
      // Add notification
      addNotification({
        type: 'cancellation',
        message: `Reservation at ${order?.restaurantName || 'restaurant'} cancelled successfully`,
        timestamp: new Date()
      });
      
      return true;
    } catch (error) {
      console.error('Error updating reservation status:', error);
      
      // Add error notification
      addNotification({
        type: 'error',
        message: `Failed to cancel reservation: ${error.message}`,
        timestamp: new Date()
      });
      
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (password !== confirm_password) {
      alert("Passwords do not match!");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/resetClientPassword", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email, password, confirm_password }),
      });
      const data = await response.json();

      if (!response.ok) {
        alert(data.error);
        return;
      } else {
        // Add notification
        addNotification({
          type: 'update',
          message: 'Password updated successfully',
          timestamp: new Date()
        });
        
        alert(data.message);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to update password.");
    }
  };

  const handleDeleteProfile = async () => {
    const confirmation = window.confirm("Are you sure you want to delete your profile?");
    if (!confirmation) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/deleteClientProfile", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error("Failed to delete profile");
      alert("Profile deleted successfully!");
      localStorage.removeItem("token");
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert("Failed to delete profile.");
    }
  };
  
  const handleAllergyChange = async (type, allergy = selectedAllergy) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/updateUserAlergic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          email,
          name_allergies: allergy,
          type: type
        })
      });
   
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || `Failed to ${type} allergy`);
   
      setProfile({
        ...profile,
        allergies: data.allergies
      });
      
      if (type === "update") {
        setSelectedAllergy("");
        
        // Add notification
        addNotification({
          type: 'update',
          message: `Added allergy: ${allergy}`,
          timestamp: new Date()
        });
      } else if (type === "remove") {
        // Add notification
        addNotification({
          type: 'update',
          message: `Removed allergy: ${allergy}`,
          timestamp: new Date()
        });
      }
   
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check that file is an image
    if (!file.type.match('image.*')) {
      alert('Please select an image file (jpg, png, etc)');
      return;
    }
    
    // Limit file size to 2MB
    if (file.size > 2 * 1024 * 1024) {
      alert('Image file is too large. Please select an image smaller than 2MB.');
      return;
    }
    
    setImageFile(file);
    
    // Create preview of the image
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };
  
  // Function to upload the image to server
  const handleImageUpload = async () => {
    if (!imageFile) {
      alert('Please select an image first');
      return;
    }
    
    setUploadingImage(true);
    
    try {
      const formData = new FormData();
      formData.append('profileImage', imageFile);
      formData.append('email', email);
      
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/updateUserProfileImage", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      
      let data;
      try {
        data = await response.json();
      } catch (e) {
        console.error("Error parsing response:", e);
        alert("Server response was not valid JSON");
        return;
      } finally {
        setUploadingImage(false);
      }
      
      if (!response.ok) {
        alert(data?.error || `Failed to upload image (${response.status})`);
        return;
      }
      
      // Update profile with new image URL
      setProfile(prevProfile => ({
        ...prevProfile,
        profileImage: data.profileImage
      }));
      
      // Clean up image upload state
      setImageFile(null);
      setImagePreview(null);
      
      // Add notification
      addNotification({
        type: 'update',
        message: 'Profile image updated successfully',
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error uploading profile image:', error);
      alert("Failed to connect to server. Please check your connection.");
      setUploadingImage(false);
    }
  };
  
  // Function to cancel image selection
  const cancelImageSelection = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!profile) return <div className="error">No profile data found</div>;
  
  const getImageUrl = (imagePath) => {
    if (!imagePath) return assets.person_logo;
    
    // If it's already a complete URL, return it as is
    if (imagePath.startsWith('http')) return imagePath;
    
    // Otherwise, prepend the server URL
    return `http://localhost:5000${imagePath}`;
  };

  return (
    <div className="profile-container">
      {/* Notification indicator */}
      {notifications.length > 0 && (
        <div className="notification-center">
          <button className="notification-bell" onClick={() => document.getElementById('notification-dropdown').classList.toggle('active')}>
            🔔 <span className="notification-count">{notifications.length}</span>
          </button>
          <div id="notification-dropdown" className="notification-dropdown">
            <div className="notification-header">
              <h3>Notifications</h3>
              <button className="clear-notifications" onClick={clearAllNotifications}>
                Clear All
              </button>
            </div>
            <div className="notification-list">
              {notifications.length > 0 ? (
                notifications.map(notification => (
                  <div key={notification.id} className={`notification-item notification-${notification.type}`}>
                    <div className="notification-message">{notification.message}</div>
                    <div className="notification-time">
                      {notification.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-notifications">No notifications</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Socket connection indicator */}
      <div className="socket-indicator">
        {socketConnected ? (
          <div className="socket-connected">
            <span className="socket-status-dot connected"></span>
            Real-time updates active
          </div>
        ) : (
          <div className="socket-disconnected">
            <span className="socket-status-dot disconnected"></span>
            Offline mode
          </div>
        )}
      </div>

      {/* Personal Information */}
      <div className="profile-card">
        <div className="profile-header">
          {/* Profile Picture */}
          <div className="profile-image">
            <img src={imagePreview || getImageUrl(profile.profileImage)} alt="Profile" />
            {/* Update icon overlay that appears on hover */}
            <div className="image-upload-overlay" onClick={() => document.getElementById('profile-image-input').click()}>
              <span className="upload-icon">📷</span>
            </div>
            
            {/* Hidden input element for file selection */}
            <input
              type="file"
              id="profile-image-input"
              accept="image/*"
              onChange={handleImageSelect}
              style={{ display: 'none' }}
            />
          </div>

          {/* Image update panel that appears only when a new image is selected */}
          {imageFile && (
            <div className="image-upload-controls">
              <p>Upload new profile picture?</p>
              <div className="edit-phone-buttons">
                <button 
                  onClick={handleImageUpload} 
                  disabled={uploadingImage} 
                  className="edit-confirm-button"
                >
                  {uploadingImage ? 'Uploading...' : 'Confirm'}
                </button>
                <button 
                  onClick={cancelImageSelection} 
                  disabled={uploadingImage} 
                  className="edit-cancel-button"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {/* Personal Details */}
          <div className="profile-details">
            <h1>
              {profile.first_name} {profile.last_name}
            </h1>
            <div className="details-grid">
              <div className="detail-item">
                <p className="detail-label">Age</p>
                <p className="detail-value">{profile.age}</p>
              </div>
              <div className="detail-item">
                <p className="detail-label">Phone Number</p>
                {editingPhone ? (
                  <div className="edit-phone-container">
                    <input
                      type="text"
                      value={newPhoneNumber}
                      onChange={(e) => setNewPhoneNumber(e.target.value)}
                      className="edit-phone-input"
                    />
                    <div className="edit-phone-buttons">
                      <button onClick={handlePhoneNumberChange} className="edit-confirm-button">
                        Update
                      </button>
                      <button onClick={cancelPhoneEdit} className="edit-cancel-button">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="detail-value phone-value" onClick={startPhoneEdit}>
                    {profile.phone_number} <span className="edit-icon">✎</span>
                  </p>
                )}
              </div>
              <div className="detail-item">
                <p className="detail-label">Email</p>
                <p className="detail-value">{profile.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Allergies */}
      <div className="profile-card">
        <h2>Allergies</h2>
        <div className="allergies-form">
          <select 
            value={selectedAllergy} 
            onChange={(e) => setSelectedAllergy(e.target.value)} 
            className="allergy-select"
          >
            <option value="">Select an allergy</option>
            {allergies.map((allergy) => (
              <option key={allergy.id} value={allergy.name}>
                {allergy.name}
              </option>
            ))}
          </select>
          <button onClick={() => handleAllergyChange("update")} className="add-button">
            Add Allergy
          </button>
        </div>

        <div className="allergies-container">
          {profile.allergies?.map((allergy, index) => (
            <div key={index} className="allergy-tag">
              {allergy}
              <button 
                onClick={() => handleAllergyChange("remove", allergy)}
                className="remove-button"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Orders Section with 4 tabs and pagination */}
      <div className="profile-card">
        <h2>Orders</h2>
        <div className="tabs">
          <button
            className={`tab-button ${activeTab === "Planning" ? "active" : ""}`}
            onClick={() => handleTabChange("Planning")}
          >
            Upcoming Orders
          </button>
          <button
            className={`tab-button ${activeTab === "Seated" ? "active" : ""}`}
            onClick={() => handleTabChange("Seated")}
          >
            Seated Orders
          </button>
          <button
            className={`tab-button ${activeTab === "Done" ? "active" : ""}`}
            onClick={() => handleTabChange("Done")}
          >
            Completed Orders
          </button>
          <button
            className={`tab-button ${activeTab === "Cancelled" ? "active" : ""}`}
            onClick={() => handleTabChange("Cancelled")}
          >
            Cancelled Orders
          </button>
        </div>

        <div className="orders-container">
          {getCurrentOrders(activeTab).length > 0 ? (
            getCurrentOrders(activeTab).map((order) => (
              <div key={`${order.restaurantName}-${order._id || Math.random()}`} className="order-card">
                {/* If this is the order being edited, show edit form */}
                {editingReservation && editingReservation.order_id === order.order_id ? (
                  <div className="reservation-edit-form">
                    <h3>Edit Reservation at {order.restaurantName}</h3>
                    
                    {editFormError && <div className="form-error">{editFormError}</div>}
                    
                    <div className="form-group">
                      <label>Date:</label>
                      <input 
                        type="date" 
                        name="date"
                        value={editFormData.date}
                        onChange={handleEditInputChange}
                        min={new Date().toISOString().split("T")[0]}
                        required
                        className="edit-form-input"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Time (24h):</label>
                      <input 
                        type="time" 
                        name="time"
                        value={editFormData.time}
                        onChange={handleEditInputChange}
                        required
                        className="edit-form-input"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Number of Guests:</label>
                      <select 
                        name="guests"
                        value={editFormData.guests}
                        onChange={handleEditInputChange}
                        required
                        className="edit-form-input"
                      >
                        <option value="1">1 person</option>
                        <option value="2">2 people</option>
                        <option value="3">3 people</option>
                        <option value="4">4 people</option>
                        <option value="5">5 people</option>
                        <option value="6">6 people</option>
                        <option value="8">8 people</option>
                        <option value="10">10 people</option>
                      </select>
                    </div>
                    
                    <div className="form-actions">
                      <button 
                        onClick={cancelReservationEdit} 
                        className="edit-cancel-button"
                        disabled={isSubmittingEdit}
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleSubmitReservationEdit} 
                        className="edit-confirm-button"
                        disabled={isSubmittingEdit}
                      >
                        {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="order-header">
                      <h3>{order.restaurantName}</h3>
                      <span className={`status-tag status-${activeTab.toLowerCase()}`}>
                        {activeTab === "Planning" ? "Upcoming" : 
                        activeTab === "Seated" ? "Seated" : 
                        activeTab === "Done" ? "Completed" : "Cancelled"}
                      </span>
                    </div>
                    <div className="order-info">
                      <div className="order-detail">
                        <span className="detail-label">City</span>
                        <span className="detail-value">{order.restaurantCity}</span>
                      </div>
                      <div className="order-detail">
                        <span className="detail-label">Description</span>
                        <span className="detail-value">{order.restaurantDescription}</span>
                      </div>
                      <div className="order-detail">
                        <span className="detail-label">Phone</span>
                        <span className="detail-value">{order.restaurantPhone}</span>
                      </div>
                      <div className="order-detail">
                        <span className="detail-label">Guests</span>
                        <span className="detail-value">{order.guests}</span>
                      </div>
                      <div className="order-detail">
                        <span className="detail-label">Order Date</span>
                        <span className="detail-value">
                          {new Date(order.orderDate).toLocaleDateString()}
                        </span>
                      </div>
                      {/* Add start time */}
                      <div className="order-detail">
                        <span className="detail-label">Start Time</span>
                        <span className="detail-value">{order.orderStart || "N/A"}</span>
                      </div>
                      {/* Add end time */}
                      <div className="order-detail">
                        <span className="detail-label">End Time</span>
                        <span className="detail-value">{order.orderEnd || "N/A"}</span>
                      </div>
                      {/* Add table number if available */}
                      {order.tableNumber && (
                        <div className="order-detail">
                          <span className="detail-label">Table</span>
                          <span className="detail-value table-number">
                            {order.tableNumber}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="order-actions">
                    {activeTab === "Planning" && (
                      <>
                        <button 
                          onClick={() => startReservationEdit(order)} 
                          className="edit-reservation-button"
                        >
                          Edit Reservation
                        </button>
                        <button 
                          onClick={() => handleCancelOrder(order.order_id)} 
                          className="cancel-order-button"
                        >
                          Cancel Order
                        </button>
                        
                        <button 
                          onClick={() => setActiveChatRestaurant(order.order_id)} 
                          className="chat-with-restaurant-button"
                        >
                          <span className="chat-icon">💬</span> Chat
                        </button>
                      </>
                    )}
                    
                    {(activeTab === "Done" || activeTab === "Seated") && (
                      <button 
                        onClick={() => handleViewBill(order.order_id)} 
                        className="view-bill-button"
                      >
                        <span className="bill-icon">🧾</span> View Bill
                      </button>
                    )}
                  </div>
                  </>
                )}
              </div>
            ))
          ) : (
            <p className="no-data">No {activeTab.toLowerCase()} orders</p>
          )}
          
          {/* Pagination */}
          {totalPages(activeTab) > 1 && (
            <div className="pagination">
              {Array.from({ length: totalPages(activeTab) }, (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`pagination-button ${
                    currentPage === i + 1 ? "active" : ""
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Change Password */}
      <div className="profile-card">
        <h2>Change Password</h2>
        <div className="password-form">
          <input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirm_password}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button className="update-button" onClick={handlePasswordChange}>Update Password</button>
        </div>
      </div>

      {/* Delete Profile */}
      <div className="profile-card">
        <h2>Delete Profile</h2>
        <div className="delete-form">
          <button className="delete-button" onClick={handleDeleteProfile}>
            Delete My Profile
          </button>
        </div>
      </div>

      {selectedBill && (
        <BillModal 
          orderId={selectedBill} 
          onClose={handleCloseBill} 
          token={localStorage.getItem("token")}
        />
      )}

      {activeChatRestaurant && (
        <ChatWithRestaurant 
          restaurant={activeChatRestaurant} 
          customerEmail={email}
          onClose={() => setActiveChatRestaurant(null)} 
        />
      )}
      
      {/* Toast container for real-time notifications */}
      <div id="toast-container" className="toast-container"></div>
    </div>
  );
};

export default ClientProfile;