import React, { useState, useEffect } from 'react';
import './ManagementDashboardCSS/MngNewReservationForm.css';
//import { createReservation } from '../api/restaurantApi';
//import { convertTo24Hour, convertTo12Hour, generateTimeSlots } from '../utils/dateUtils';

const ManagementNewReservationForm = ({ restaurantId, restaurantData, onSave, onCancel }) => {
  // Form state
  const [selectedPeople, setSelectedPeople] = useState(2);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedTime, setSelectedTime] = useState('');
  const [availableTimes, setAvailableTimes] = useState([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [tableAvailability, setTableAvailability] = useState({});
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Effect to load available times when date changes
  useEffect(() => {
    if (restaurantData && selectedDate) {
      updateTimesForSelectedDay(selectedDate);
    }
  }, [restaurantData, selectedDate, selectedPeople]);

  // Get available times based on restaurant hours
  const updateTimesForSelectedDay = (date) => {
    setLoadingTimes(true);
    
    try {
      // Get day of week from the selected date
      const dateObj = new Date(date);
      const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayOfWeek = daysOfWeek[dateObj.getDay()];
      
      // Check if restaurant has open_time data for this day
      if (restaurantData.open_time && restaurantData.open_time[dayOfWeek]) {
        const dayHours = restaurantData.open_time[dayOfWeek];
        
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
          
          // Create availability data based on time slots
          const availabilityMap = {};
          slots.forEach(slot => {
            // For now, simulate availability - in a real app, this would come from the backend
            const randomAvailability = Math.floor(Math.random() * 4) + 1; // 1-4 tables
            availabilityMap[slot] = randomAvailability;
          });
          setTableAvailability(availabilityMap);
          
          setAvailableTimes(slots);
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
  
  // Helper function to get availability class
  const getAvailabilityClass = (time) => {
    const tablesAvailable = tableAvailability[time];
    if (!tablesAvailable) return '';
    if (tablesAvailable >= 3) return 'mng-high-availability';
    if (tablesAvailable === 2) return 'mng-medium-availability';
    return 'mng-low-availability';
  };

  // Form validation
  const validateForm = () => {
    if (!customerName.trim()) {
      setFormError('Please enter customer name');
      return false;
    }
    
    if (!customerEmail.trim() || !customerEmail.includes('@')) {
      setFormError('Please enter a valid email');
      return false;
    }
    
    if (!customerPhone.trim() || customerPhone.length < 9) {
      setFormError('Please enter a valid phone number');
      return false;
    }
    
    if (!selectedTime) {
      setFormError('Please select a time');
      return false;
    }
    
    return true;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setFormError(null);
    
    try {
      // Convert selected date to day of week
      const selectedDay = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      
      // Parse customer name into first and last name
      const nameParts = customerName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      // Convert from 24-hour format to 12-hour format for the backend
      const time12h = convertTo12Hour(selectedTime);
      
      // Calculate expected end time (2 hours after start by default)
      const startDate = new Date(`${selectedDate}T${selectedTime}`);
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 2);
      
      // Build reservation data
      const reservationData = {
        restaurantId: restaurantId,
        reservation: {
          time: time12h,
          day: selectedDay,
          date: selectedDate,
          guests: parseInt(selectedPeople),
          special_requests: specialRequests || '',
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString()
        },
        customer: {
          first_name: firstName,
          last_name: lastName,
          email: customerEmail,
          phone_number: customerPhone
        }
      };
      
      // Submit to API
      const newReservation = await createReservation(reservationData);
      
      // If successful, call onSave with the new reservation
      if (newReservation) {
        onSave(newReservation);
        
        // Reset form fields
        setSelectedPeople(2);
        setSelectedDate(new Date().toISOString().split("T")[0]);
        setSelectedTime('');
        setCustomerName('');
        setCustomerEmail('');
        setCustomerPhone('');
        setSpecialRequests('');
      } else {
        setFormError('Failed to create reservation');
      }
    } catch (error) {
      console.error('Error creating reservation:', error);
      setFormError(error.message || 'An error occurred while creating the reservation');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="mng-new-reservation-container">
      <div className="mng-form-header">
        <h2>New Reservation</h2>
        <button className="mng-close-btn" onClick={onCancel}>×</button>
      </div>
      
      {formError && (
        <div className="mng-form-error">
          {formError}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="mng-reservation-form">
        <div className="mng-form-section">
          <h3>Reservation Details</h3>
          
          <div className="mng-form-row">
            <div className="mng-form-group">
              <label>Party Size</label>
              <select 
                value={selectedPeople}
                onChange={(e) => setSelectedPeople(e.target.value)}
                required
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
            
            <div className="mng-form-group">
              <label>Date</label>
              <input 
                type="date"
                value={selectedDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="mng-form-group">
            <label>Time</label>
            <select 
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              disabled={loadingTimes || availableTimes.length === 0}
              required
              className="mng-time-select"
            >
              {loadingTimes ? (
                <option value="">Loading times...</option>
              ) : availableTimes.length === 0 ? (
                <option value="">No times available</option>
              ) : (
                availableTimes.map((time) => (
                  <option key={time} value={time} className={getAvailabilityClass(time)}>
                    {time} 
                    {tableAvailability[time] === 1 
                      ? " (Last table!)" 
                      : ` (${tableAvailability[time]} tables available)`}
                  </option>
                ))
              )}
            </select>
          </div>
          
          {selectedTime && tableAvailability[selectedTime] === 1 && (
            <div className="mng-availability-warning">
              Only 1 table available for this time!
            </div>
          )}
        </div>
        
        <div className="mng-form-section">
          <h3>Customer Information</h3>
          
          <div className="mng-form-group">
            <label>Full Name</label>
            <input 
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Enter customer's full name"
              required
            />
          </div>
          
          <div className="mng-form-row">
            <div className="mng-form-group">
              <label>Email</label>
              <input 
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="Enter customer's email"
                required
              />
            </div>
            
            <div className="mng-form-group">
              <label>Phone</label>
              <input 
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Enter customer's phone"
                required
              />
            </div>
          </div>
          
          <div className="mng-form-group">
            <label>Special Requests</label>
            <textarea
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="Enter any special requests or notes"
              rows="3"
            ></textarea>
          </div>
        </div>
        
        <div className="mng-form-actions">
          <button 
            type="button" 
            className="mng-cancel-btn" 
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="mng-save-btn" 
            disabled={isSubmitting || loadingTimes || availableTimes.length === 0}
          >
            {isSubmitting ? 'Creating...' : 'Create Reservation'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ManagementNewReservationForm;