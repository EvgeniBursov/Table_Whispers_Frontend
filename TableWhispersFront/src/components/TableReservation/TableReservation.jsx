import React, { useState, useEffect } from 'react';
import './TableReservation.css';
import TableSelection from './TableSelectionModel';
const API_URL = import.meta.env.VITE_BACKEND_API || 'http://localhost:5000';


const TableReservation = ({ 
  restaurantId, 
  restaurantName, 
  initialDate,
  initialTime,
  initialPeople,
  initialTable,
  tableId, 
  tableNumber,
  isManagementReservation=false,
  isManagementReservationList=false,  
  onReservationComplete
}) => {
    const [selectedPeople, setSelectedPeople] = useState(initialPeople || 2);
    const [selectedDate, setSelectedDate] = useState(initialDate || new Date().toISOString().split("T")[0]);
    const [selectedTime, setSelectedTime] = useState(initialTime || '');
    const [selectedTable, setSelectedTable] = useState(initialTable || null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingTimes, setLoadingTimes] = useState(false);
    const [loadingTables, setLoadingTables] = useState(false);
    const [reservationStatus, setReservationStatus] = useState(null);
    const [reservationDetails, setReservationDetails] = useState(null);
    const [bookingError, setBookingError] = useState(null);
    const [availableTimes, setAvailableTimes] = useState([]);
    const [availableTables, setAvailableTables] = useState([]);
    const [restaurantData, setRestaurantData] = useState(null);
    const [tableAvailability, setTableAvailability] = useState({}); // Table availability info
    const [showTableSelection, setShowTableSelection] = useState(false);
    const [termsAgreed, setTermsAgreed] = useState(false);
    
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

    // When initialTable is provided, set it
    useEffect(() => {
      if (initialTable) {
        setSelectedTable(initialTable);
        setShowTableSelection(true);
      }
    }, [initialTable]);

    // Fetch restaurant data from the server
    const fetchRestaurantData = async () => {
      try {
        setLoadingTimes(true);
        const response = await fetch(`${API_URL}/restaurant/${restaurantId}`);
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
            
            // If initial time is provided and valid, use it
            if (initialTime && slots.includes(initialTime)) {
              setSelectedTime(initialTime);
            } else if (slots.length > 0) {
              // Otherwise, set first time slot as default selection
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

    // Fetch available tables for the selected time
    const fetchAvailableTables = async () => {
      if (!selectedTime || !selectedDate) {
        setBookingError('Please select a date and time first');
        return;
      }

      setLoadingTables(true);
      setBookingError(null);
      
      try {
        const time12h = convertTo12Hour(selectedTime);
        const response = await fetch(`${API_URL}/restaurant/${restaurantId}/tables?date=${selectedDate}&time=${time12h}&guests=${selectedPeople}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch available tables');
        }
        
        const data = await response.json();
        
        if (data.success) {
          setAvailableTables(data.tables || []);
          setShowTableSelection(true);
        } else {
          setBookingError(data.message || 'No tables available for selected time');
          setAvailableTables([]);
        }
      } catch (error) {
        console.error('Error fetching tables:', error);
        setBookingError('Error loading tables. Please try again.');
        setAvailableTables([]);
      } finally {
        setLoadingTables(false);
      }
    };

    // When time is selected, fetch available tables
    useEffect(() => {
      if (selectedTime && showTableSelection) {
        fetchAvailableTables();
      }
    }, [selectedTime, showTableSelection]);

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
      
      // Check terms agreement if a specific table is selected
      if (selectedTable && !termsAgreed && !isManagementReservation) {
        setBookingError('Please agree to the table reservation terms');
        return false;
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
          date: selectedDate,
          tableId: null, // Explicitly set tableId to null by default
          tableNumber: null // Explicitly set tableNumber to null by default
        };
        
          if (selectedTable && showTableSelection) {
            requestBody.tableId = selectedTable.id || selectedTable._id;
            requestBody.tableNumber = selectedTable.table_number;
          } else if (tableId) {
            requestBody.tableId = tableId;
            requestBody.tableNumber = tableNumber;
          } else if (initialTable) {
            requestBody.tableId = initialTable.id || initialTable._id;
            requestBody.tableNumber = initialTable.table_number;
          }
        
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
        
        const response = await fetch(`${API_URL}/create_Reservation/restaurant/${restaurantId}`, {
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
          
          // Call the callback if provided
          if (onReservationComplete) {
            onReservationComplete(data.reservation);
          }
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

    // Handle proceeding to table selection
    const handleProceedToTableSelection = () => {
      if (!selectedTime) {
        setBookingError('Please select a time first');
        return;
      }
      setShowTableSelection(true);
      fetchAvailableTables();
    };

    // Handle selecting a table
    const handleTableSelection = (table) => {
      setSelectedTable(table);
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
            
            {selectedTable && (
              <div className="detail-row">
                <span className="detail-label">Table:</span>
                <span className="detail-value">
                  Table {selectedTable.table_number} 
                  {selectedTable.section && ` - ${selectedTable.section} Section`}
                </span>
              </div>
            )}
            
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
                onChange={(e) => {
                  setSelectedPeople(e.target.value);
                  // Reset table selection if guest count changes
                  setSelectedTable(null);
                  setShowTableSelection(false);
                }}
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
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  // Reset table selection if date changes
                  setSelectedTable(null);
                  setShowTableSelection(false);
                }}
              />
            </div>
    
            <div className="input-group">
              <label>Time</label>
              <select 
                value={selectedTime}
                onChange={(e) => {
                  setSelectedTime(e.target.value);
                  // Reset table selection if time changes
                  setSelectedTable(null);
                  setShowTableSelection(false);
                }}
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

          {/* Show "Choose Your Table" button only for logged-in users */}
          {!showTableSelection && selectedTime && (isLoggedIn || (isManagementReservation && isManagementReservationList)) && (
            <div className="table-selection-proceed">
              <button 
                type="button" 
                className="choose-table-btn"
                onClick={handleProceedToTableSelection}
                disabled={!selectedTime || loadingTimes}
              >
                Choose Your Table
              </button>
            </div>
          )}

          {/* Table selection component - only for logged in users */}
          {showTableSelection && (isLoggedIn || (isManagementReservation && isManagementReservationList)) && (
            <div className="table-selection-wrapper">
              <TableSelection 
                availableTables={availableTables}
                onTableSelect={handleTableSelection}
                selectedTableId={selectedTable ? (selectedTable.id || selectedTable._id) : null}
              />
              
              {/* Terms agreement checkbox - only show when a table is selected */}
              {selectedTable && !isManagementReservation &&(
                <div className="terms-agreement">
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      checked={termsAgreed}
                      onChange={(e) => setTermsAgreed(e.target.checked)}
                    />
                    <span className="checkbox-label">
                      I agree to the table reservation terms and conditions
                    </span>
                  </label>
                  <div className="terms-note">
                    By selecting a specific table, you agree to arrive on time. The table will be held for 15 minutes past your reservation time.
                  </div>
                </div>
              )}
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
            {isLoading ? 'Processing...' : (selectedTable ? `BOOK TABLE ${selectedTable.table_number}` : 'BOOK A TABLE')}
          </button>
        </form>
      </div>
    );
  };
  
export default TableReservation;