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
    const formatDateWithoutTimezone = (date) => {
      const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December'];
      
      return `${weekdays[date.getUTCDay()]}, ${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
    };

    const formatTimeWithoutTimezone = (date) => {
      const hours = date.getUTCHours();
      const minutes = date.getUTCMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    };

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
    const [tableAvailability, setTableAvailability] = useState({});
    const [showTableSelection, setShowTableSelection] = useState(false);
    const [termsAgreed, setTermsAgreed] = useState(false);
    
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [guestName, setGuestName] = useState('');
    const [guestEmail, setGuestEmail] = useState('');
    const [guestPhone, setGuestPhone] = useState('');
    
    useEffect(() => {
      const token = localStorage.getItem('token');
      const userEmail = localStorage.getItem('userEmail');
      setIsLoggedIn(!!token && !!userEmail);
      
      if (!!token && !!userEmail) {
        setGuestEmail(userEmail);
      }

      fetchRestaurantData();
      if (selectedDate && restaurantId) {
        fetchRealAvailability();
      }
    }, []);

    useEffect(() => {
      if (initialTable) {
        setSelectedTable(initialTable);
        setShowTableSelection(true);
      }
    }, [initialTable]);

    const fetchRestaurantData = async () => {
      try {
        setLoadingTimes(true);
        const response = await fetch(`${API_URL}/restaurant/${restaurantId}`);
        const data = await response.json();
        setRestaurantData(data);

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

  const fetchRealAvailability = async () => {
  if (!selectedDate || !restaurantId) return;
  
      try {
        const response = await fetch(
          `${API_URL}/restaurant/${restaurantId}/availability?date=${selectedDate}&guests=${selectedPeople || 2}`
        );
        
        if (!response.ok) {
          console.error('Failed to fetch availability');
          return;
        }
        
        const data = await response.json();
        if (data.success && data.availability) {
          setTableAvailability(data.availability);
        }
      } catch (error) {
        console.error('Error fetching availability:', error);
      }
    };

    useEffect(() => {
      if (restaurantData && selectedDate) {
        updateTimesForSelectedDay(selectedDate, restaurantData);
      }
    }, [selectedDate, selectedPeople]);

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

    const convertTo12Hour = (timeString) => {
      const [hours24, minutes] = timeString.split(':').map(Number);
      const hours12 = hours24 % 12 || 12;
      const meridiem = hours24 >= 12 ? 'PM' : 'AM';
      return `${hours12}:${minutes.toString().padStart(2, '0')} ${meridiem}`;
    };

  const updateTimesForSelectedDay = async (date, restaurant) => {
      setLoadingTimes(true);
      
      try {
        const dateObj = new Date(date);
        const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayOfWeek = daysOfWeek[dateObj.getDay()];
        
        if (restaurant.open_time && restaurant.open_time[dayOfWeek]) {
          const dayHours = restaurant.open_time[dayOfWeek];
          
          if (dayHours.open === 'Closed' || !dayHours.open || !dayHours.close) {
            setAvailableTimes([]);
            setSelectedTime('');
          } else {
            const openTime24h = convertTo24Hour(dayHours.open);
            const closeTime24h = convertTo24Hour(dayHours.close);
            
            const slots = generateTimeSlots(openTime24h, closeTime24h);
            
            await fetchRealAvailability();
            
            setAvailableTimes(slots);
            
            if (initialTime && slots.includes(initialTime)) {
              setSelectedTime(initialTime);
            } else if (slots.length > 0) {
              setSelectedTime(slots[0]);
            }
          }
        } else {
          setAvailableTimes([]);
          setSelectedTime('');
        }
      } catch (error) {
        console.error('Error updating times:', error);
        setAvailableTimes([]);
      }
      
      setLoadingTimes(false);
    };

    const generateTimeSlots = (openTime24h, closeTime24h) => {
      const slots = [];
      
      let [openHours, openMinutes] = openTime24h.split(':').map(Number);
      
      let [closeHours, closeMinutes] = closeTime24h.split(':').map(Number);
      
      const startTime = new Date();
      startTime.setHours(openHours, openMinutes, 0, 0);
      
      const endTime = new Date();
      endTime.setHours(closeHours, closeMinutes, 0, 0);
      
      const lastPossibleSlot = new Date(endTime);
      lastPossibleSlot.setMinutes(lastPossibleSlot.getMinutes() - 90);
      
      const currentSlot = new Date(startTime);
      
      while (currentSlot <= lastPossibleSlot) {
        const hours = currentSlot.getHours().toString().padStart(2, '0');
        const minutes = currentSlot.getMinutes().toString().padStart(2, '0');
        
        const timeStr = `${hours}:${minutes}`;
        slots.push(timeStr);
        
        currentSlot.setMinutes(currentSlot.getMinutes() + 30);
      }
      
      return slots;
    };

    const getAvailabilityClass = (time) => {
      const tablesAvailable = tableAvailability[time] || 0;
      if (tablesAvailable === 0) return 'no-availability';
      if (tablesAvailable >= 3) return 'high-availability';
      if (tablesAvailable === 2) return 'medium-availability';
      return 'low-availability';
    };

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

    useEffect(() => {
      if (selectedTime && showTableSelection) {
        fetchAvailableTables();
      }
    }, [selectedTime, showTableSelection]);

    const validateGuestInfo = () => {
      if (!guestEmail.trim() || !guestEmail.includes('@')) {
        setBookingError('Please enter a valid email');
        return false;
      }
      
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
      
      if (selectedTable && !termsAgreed && !isManagementReservation) {
        setBookingError('Please agree to the table reservation terms');
        return false;
      }
      
      return true;
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      
      if (!validateGuestInfo()) {
        return;
      }
      
      if (!selectedTime) {
        setBookingError('Please select a time');
        return;
      }
      
      const timeSlot = {
        time: selectedTime
      };
      
      handleBooking(timeSlot);
    };

    const handleBooking = async (slot) => {
      setIsLoading(true);
      setBookingError(null);
      
      try {
        const selectedDay = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        
        const time12h = convertTo12Hour(slot.time);
        
        const requestBody = {
          restaurant_Id: restaurantId,
          time: time12h,
          day: selectedDay,
          guests: parseInt(selectedPeople),
          date: selectedDate,
          tableId: null,
          tableNumber: null
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
        
        if (isLoggedIn) {
          requestBody.user_email = localStorage.getItem('userEmail');
        } else {
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
    
    const handleReset = () => {
      setReservationStatus(null);
      setReservationDetails(null);
      setBookingError(null);
    };

    const handleProceedToTableSelection = () => {
      if (!selectedTime) {
        setBookingError('Please select a time first');
        return;
      }
      setShowTableSelection(true);
      fetchAvailableTables();
    };

    const handleTableSelection = (table) => {
      setSelectedTable(table);
    };
  
    const renderConfirmation = () => {
      if (!reservationDetails) return null;
      
      const reservationDate = reservationDetails.start_time 
        ? new Date(reservationDetails.start_time) 
        : new Date(selectedDate);
      
      const formattedDate = formatDateWithoutTimezone(reservationDate);
      const formattedTime = formatTimeWithoutTimezone(reservationDate);
      
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
                  availableTimes.map((time) => {
                    const tablesCount = tableAvailability[time] || 0;
                    return (
                      <option 
                        key={time} 
                        value={time} 
                        className={`time-option ${getAvailabilityClass(time)}`}
                        disabled={tablesCount === 0}
                      >
                        {time} 
                        {tablesCount === 0 
                          ? " (No tables available)" 
                          : tablesCount === 1 
                          ? " (Last table!)" 
                          : ` (${tablesCount} tables available)`}
                      </option>
                    );
                  })
                )}
              </select>
            </div>
          </div>

          {selectedTime && tableAvailability[selectedTime] === 1 && (
            <div className="low-availability-warning">
              ⚠️ Only 1 table available for this time - book soon!
            </div>
          )}

          {!showTableSelection && selectedTime && (isLoggedIn || (isManagementReservation && isManagementReservationList)) && (
            <div className="table-selection-proceed">
              <button 
                type="button" 
                className="choose-table-btn"
                onClick={handleProceedToTableSelection}
                disabled={!selectedTime || loadingTimes || (tableAvailability[selectedTime] || 0) === 0}
              >
                Choose Your Table
              </button>
            </div>
          )}

          {showTableSelection && (isLoggedIn || (isManagementReservation && isManagementReservationList)) && (
            <div className="table-selection-wrapper">
              <TableSelection 
                availableTables={availableTables}
                onTableSelect={handleTableSelection}
                selectedTableId={selectedTable ? (selectedTable.id || selectedTable._id) : null}
              />
              
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

          <div className="input-group email-field">
            <label>Email</label>
            <input 
              type="email" 
              value={isLoggedIn ? localStorage.getItem('userEmail') : guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={isLoggedIn}
            />
            {isLoggedIn && <span className="email-note">Using your account email</span>}
          </div>

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
            disabled={isLoading || loadingTimes || availableTimes.length === 0 || (selectedTime && (tableAvailability[selectedTime] || 0) === 0)}
          >
            {isLoading ? 'Processing...' : (selectedTable ? `BOOK TABLE ${selectedTable.table_number}` : 'BOOK A TABLE')}
          </button>
        </form>
      </div>
    );
  };
  
export default TableReservation;