import React, { useState, useEffect } from 'react';
import './TableReservation.css';

const TableReservation = ({ restaurantId, restaurantName, userId }) => {
    const [selectedPeople, setSelectedPeople] = useState(2);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
    const [selectedTime, setSelectedTime] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingTimes, setLoadingTimes] = useState(false);
    const [reservationStatus, setReservationStatus] = useState(null);
    const [reservationDetails, setReservationDetails] = useState(null);
    const [bookingError, setBookingError] = useState(null);
    const [availableTimes, setAvailableTimes] = useState([]);
    const [restaurantData, setRestaurantData] = useState(null);
    const [tableAvailability, setTableAvailability] = useState({}); // Table availability info
    
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
      
      // If user is logged in, pre-fill the email to ensure it's always sent
      if (!!token && !!userEmail) {
        setGuestEmail(userEmail);
      }

      // Fetch restaurant data on mount
      fetchRestaurantData();
    }, []);

    // Fetch restaurant data from the server
    const fetchRestaurantData = async () => {
      try {
        setLoadingTimes(true);
        const response = await fetch(`http://localhost:7000/restaurant/${restaurantId}`);
        const data = await response.json();
        setRestaurantData(data);

        // Load times for today initially
        if (data) {
          updateTimesForSelectedDay(selectedDate, data);
        }
        setLoadingTimes(false);
      } catch (error) {
        console.error('Error fetching restaurant data:', error);
        setBookingError('Could not load restaurant data');
        setLoadingTimes(false);
      }
    };

    // Update times when date changes
    useEffect(() => {
      if (restaurantData && selectedDate) {
        updateTimesForSelectedDay(selectedDate, restaurantData);
      }
    }, [selectedDate, selectedPeople]);

    // Helper function to convert "11:00 AM" to 24-hour format "11:00"
    const convertTo24Hour = (timeString) => {
      const [timePart, meridiem] = timeString.split(' ');
      let [hours, minutes] = timePart.split(':').map(Number);
      
      if (meridiem === 'PM' && hours < 12) {
        hours += 12;
      } else if (meridiem === 'AM' && hours === 12) {
        hours = 0;
      }
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    };

    // Helper function to convert 24-hour format "14:30" to "2:30 PM" for backend
    const convertTo12Hour = (timeString) => {
      const [hours24, minutes] = timeString.split(':').map(Number);
      const hours12 = hours24 % 12 || 12;
      const meridiem = hours24 >= 12 ? 'PM' : 'AM';
      return `${hours12}:${minutes.toString().padStart(2, '0')} ${meridiem}`;
    };

    // Get the available times for the selected day from restaurant data
    const updateTimesForSelectedDay = (date, restaurant) => {
      setLoadingTimes(true);
      
      try {
        // Get day of week from the selected date
        const dateObj = new Date(date);
        const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayOfWeek = daysOfWeek[dateObj.getDay()];
        
        // Check if restaurant has open_time data for this day
        if (restaurant.open_time && restaurant.open_time[dayOfWeek]) {
          const dayHours = restaurant.open_time[dayOfWeek];
          
          if (dayHours.open === 'Closed' || !dayHours.open || !dayHours.close) {
            // Restaurant is closed this day
            setAvailableTimes([]);
            setSelectedTime('');
          } else {
            // Convert from AM/PM format to 24h format
            const openTime24h = convertTo24Hour(dayHours.open);
            const closeTime24h = convertTo24Hour(dayHours.close);
            
            // Generate time slots every 30 minutes
            const slots = generateTimeSlots(openTime24h, closeTime24h);
            
            // Add mock availability data - we'll enhance this with real data later
            const availabilityMap = {};
            slots.forEach(slot => {
              // Simulate different availability levels
              const randomAvailability = Math.floor(Math.random() * 4) + 1; // 1-4 tables
              availabilityMap[slot] = randomAvailability;
            });
            setTableAvailability(availabilityMap);
            
            setAvailableTimes(slots);
            
            // Set first time slot as default selection
            if (slots.length > 0) {
              setSelectedTime(slots[0]);
            }
          }
        } else {
          // No time data for this day
          setAvailableTimes([]);
          setSelectedTime('');
        }
      } catch (error) {
        console.error('Error updating times:', error);
        setAvailableTimes([]);
      }
      
      setLoadingTimes(false);
    };

    // Helper function to generate time slots in 24h format
    const generateTimeSlots = (openTime24h, closeTime24h) => {
      const slots = [];
      
      // Parse the opening time (e.g., "11:00")
      let [openHours, openMinutes] = openTime24h.split(':').map(Number);
      
      // Parse the closing time (e.g., "22:00")
      let [closeHours, closeMinutes] = closeTime24h.split(':').map(Number);
      
      // Create date objects for easier time manipulation
      const startTime = new Date();
      startTime.setHours(openHours, openMinutes, 0, 0);
      
      const endTime = new Date();
      endTime.setHours(closeHours, closeMinutes, 0, 0);
      
      // Last slot should be 90 minutes before closing (standard reservation duration)
      const lastPossibleSlot = new Date(endTime);
      lastPossibleSlot.setMinutes(lastPossibleSlot.getMinutes() - 90);
      
      // Generate slots every 30 minutes
      const currentSlot = new Date(startTime);
      
      while (currentSlot <= lastPossibleSlot) {
        // Format time in 24-hour format
        const hours = currentSlot.getHours().toString().padStart(2, '0');
        const minutes = currentSlot.getMinutes().toString().padStart(2, '0');
        
        // Format as HH:MM
        const timeStr = `${hours}:${minutes}`;
        slots.push(timeStr);
        
        // Move to next 30-minute slot
        currentSlot.setMinutes(currentSlot.getMinutes() + 30);
      }
      
      return slots;
    };

    // Helper function to get availability class
    const getAvailabilityClass = (time) => {
      const tablesAvailable = tableAvailability[time];
      if (!tablesAvailable) return '';
      if (tablesAvailable >= 3) return 'high-availability';
      if (tablesAvailable === 2) return 'medium-availability';
      return 'low-availability';
    };

    // Form validation for guest information
    const validateGuestInfo = () => {
      // Always require email (for all types of users)
      if (!guestEmail.trim() || !guestEmail.includes('@')) {
        setBookingError('Please enter a valid email');
        return false;
      }
      
      // Only require additional info for non-logged in users
      if (!isLoggedIn) {
        if (!guestName.trim()) {
          setBookingError('Please enter your name');
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
      
      // Validate guest information
      if (!validateGuestInfo()) {
        return;
      }
      
      // Check if time is selected
      if (!selectedTime) {
        setBookingError('Please select a time');
        return;
      }
      
      // Create a reservation with the selected time
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
        
        // Convert from 24-hour format to 12-hour format for the backend
        const time12h = convertTo12Hour(slot.time);
        
        // Build the request body
        const requestBody = {
          restaurant_Id: restaurantId,
          time: time12h, // Send in 12-hour format for the backend
          day: selectedDay,
          guests: parseInt(selectedPeople),
          date: selectedDate
        };
        
        // Always include email - either from logged in user or form input
        if (isLoggedIn) {
          requestBody.user_email = localStorage.getItem('userEmail');
        } else {
          // For guest users, provide email for checking and full guest info
          requestBody.user_email = guestEmail;
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
          setBookingError(data.message || 'Something went wrong');
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
            
            <div className="detail-row">
              <span className="detail-label">Email:</span>
              <span className="detail-value">{isLoggedIn ? localStorage.getItem('userEmail') : guestEmail}</span>
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
        {bookingError && (
          <div className="error-message">
            {bookingError}
          </div>
        )}
        
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
                <option value="5">5 people</option>
                <option value="6">6 people</option>
                <option value="8">8 people</option>
                <option value="10">10+ people</option>
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
                disabled={loadingTimes || availableTimes.length === 0}
                className="time-select"
              >
                {loadingTimes ? (
                  <option value="">Loading times...</option>
                ) : availableTimes.length === 0 ? (
                  <option value="">No times available</option>
                ) : (
                  availableTimes.map((time) => (
                    <option key={time} value={time} className={`time-option ${getAvailabilityClass(time)}`}>
                      {time} 
                      {tableAvailability[time] === 1 
                        ? " (Last table!)" 
                        : ` (${tableAvailability[time]} tables available)`}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {selectedTime && tableAvailability[selectedTime] === 1 && (
            <div className="low-availability-warning">
              ⚠️ Only 1 table available for this time - book soon!
            </div>
          )}

          {/* Email field is always required */}
          <div className="input-group email-field">
            <label>Email</label>
            <input 
              type="email" 
              value={isLoggedIn ? localStorage.getItem('userEmail') : guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={isLoggedIn} // Disable if user is logged in
            />
            {isLoggedIn && <span className="email-note">Using your account email</span>}
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
  
          <button 
            type="submit" 
            className="find-table-btn" 
            disabled={isLoading || loadingTimes || availableTimes.length === 0}
          >
            {isLoading ? 'Processing...' : 'Book Table'}
          </button>
        </form>
      </div>
    );
  };
  
export default TableReservation;