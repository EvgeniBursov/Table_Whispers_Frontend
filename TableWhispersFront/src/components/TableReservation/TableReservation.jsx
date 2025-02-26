import React, { useState, useEffect } from 'react';
import './TableReservation.css';

const TableReservation = ({ restaurantId, restaurantName, userId }) => {
    const [selectedPeople, setSelectedPeople] = useState(2);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
    const [selectedTime, setSelectedTime] = useState('19:00');
    const [isLoading, setIsLoading] = useState(false);
    const [reservationStatus, setReservationStatus] = useState(null);
    const [reservationDetails, setReservationDetails] = useState(null);
    const [bookingError, setBookingError] = useState(null);
    
    // Guest information fields
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [guestName, setGuestName] = useState('');
    const [guestEmail, setGuestEmail] = useState('');
    const [guestPhone, setGuestPhone] = useState('');
    
    // Check login status on component mount
    useEffect(() => {
      const token = localStorage.getItem('token');
      const userEmail = localStorage.getItem('userEmail');
      setIsLoggedIn(!!token && !!userEmail);
    }, []);

    // Form validation for guest information
    const validateGuestInfo = () => {
      if (!isLoggedIn) {
        // Basic validation
        if (!guestName.trim()) {
          setBookingError('Please enter your name');
          return false;
        }
        
        if (!guestEmail.trim() || !guestEmail.includes('@')) {
          setBookingError('Please enter a valid email');
          return false;
        }
        
        if (!guestPhone.trim() || guestPhone.length < 9) {
          setBookingError('Please enter a valid phone number');
          return false;
        }
      }
      return true;
    };

    // Direct reservation form submission
    const handleSubmit = (e) => {
      e.preventDefault();
      
      // Validate guest information if not logged in
      if (!validateGuestInfo()) {
        return;
      }
      
      // Create a reservation directly with the selected time
      const timeSlot = {
        time: selectedTime
      };
      
      handleBooking(timeSlot);
    };

    // Make reservation
    const handleBooking = async (slot) => {
      setIsLoading(true);
      setBookingError(null);
      
      try {
        // Convert selected date to day of week
        const selectedDay = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        
        // Build the request body based on login status
        const requestBody = {
          restaurant_Id: restaurantId,// || '67937038eb604c7927e85d2a',
          time: slot.time,
          day: selectedDay,
          guests: parseInt(selectedPeople),
          date: selectedDate
        };
        
        // Add user email if logged in, otherwise add guest info
        if (isLoggedIn) {
          requestBody.user_email = localStorage.getItem('userEmail');
        } else {
          // Guest user information
          requestBody.guestInfo = {
            full_name: guestName,
            user_email: guestEmail,
            phone_number: guestPhone,
          };
        }
        
        const response = await fetch(`http://localhost:7000/create_Reservation/restaurant/${restaurantId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': isLoggedIn ? localStorage.getItem('token') : '' 
          },
          body: JSON.stringify(requestBody),
        });
  
        const data = await response.json();
        if (!response.ok) {
          alert(data.error || data.message || 'Something went wrong');
          return;
        } else {
          setReservationStatus('success');
          setReservationDetails(data.reservation);
        } 
 
      } catch (error) {
        console.error('Error making reservation:', error);
        setReservationStatus('error');
        setBookingError('An error occurred while making your reservation. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    // Reset booking form
    const handleReset = () => {
      setReservationStatus(null);
      setReservationDetails(null);
      setBookingError(null);
    };
  
    // Render confirmation screen
    const renderConfirmation = () => {
      if (!reservationDetails) return null;
      
      // Format the date
      const reservationDate = reservationDetails.start_time 
        ? new Date(reservationDetails.start_time) 
        : new Date(selectedDate);
      
      const formattedDate = reservationDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Format the time
      const formattedTime = reservationDate.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit'
      });
      
      return (
        <div className="reservation-confirmation">
          <div className="confirmation-header">
            <h2>Reservation Confirmed!</h2>
            <div className="success-checkmark">✓</div>
          </div>
          
          <div className="confirmation-details">
            <div className="detail-row">
              <span className="detail-label">Restaurant:</span>
              <span className="detail-value">{restaurantName}</span>
            </div>
            
            <div className="detail-row">
              <span className="detail-label">Date:</span>
              <span className="detail-value">{formattedDate}</span>
            </div>
            
            <div className="detail-row">
              <span className="detail-label">Time:</span>
              <span className="detail-value">{formattedTime}</span>
            </div>
            
            <div className="detail-row">
              <span className="detail-label">Guests:</span>
              <span className="detail-value">{reservationDetails.guests}</span>
            </div>
            
            {!isLoggedIn && (
              <div className="detail-row">
                <span className="detail-label">Reserved for:</span>
                <span className="detail-value">{guestName}</span>
              </div>
            )}
          </div>
          
          <button onClick={handleReset} className="new-reservation-btn">
            NEW RESERVATION
          </button>
        </div>
      );
    };
  
    // If reservation was successful, show confirmation
    if (reservationStatus === 'success') {
      return renderConfirmation();
    }
  
    return (
      <div className="table-reservation">
        <form onSubmit={handleSubmit} className="booking-form">
          <div className="booking-form-grid">
            <div className="input-group">
              <label>Guests</label>
              <select 
                value={selectedPeople}
                onChange={(e) => setSelectedPeople(e.target.value)}
              >
                <option value="1">1 person</option>
                <option value="2">2 people</option>
                <option value="3">3 people</option>
                <option value="4">4 people</option>
                <option value="5">5+ people</option>
              </select>
            </div>
    
            <div className="input-group">
              <label>Date</label>
              <input 
                type="date"
                value={selectedDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
    
            <div className="input-group">
              <label>Time</label>
              <select 
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
              >
                {Array.from({ length: 32 }, (_, i) => {
                  const hour = Math.floor(i / 2) + 11;
                  const minute = i % 2 === 0 ? '00' : '30';
                  const time = `${hour}:${minute}`;
                  return <option key={time} value={time}>{time}</option>;
                })}
              </select>
            </div>
          </div>

          {/* Guest information fields when not logged in */}
          {!isLoggedIn && (
            <div className="guest-info-section">
              <h3>Guest Information</h3>
              <div className="guest-info-grid">
                <div className="input-group">
                  <label>Full Name</label>
                  <input 
                    type="text" 
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                
                <div className="input-group">
                  <label>Email</label>
                  <input 
                    type="email" 
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                </div>
                
                <div className="input-group">
                  <label>Phone</label>
                  <input 
                    type="tel" 
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="Enter your phone number"
                    required
                  />
                </div>
              </div>
            </div>
          )}
  
          <button type="submit" className="find-table-btn" disabled={isLoading}>
            {isLoading ? 'Processing...' : 'Book Table'}
          </button>
        </form>

        {bookingError && (
          <div className="error-message">
            {bookingError}
          </div>
        )}
      </div>
    );
  };
  
export default TableReservation;