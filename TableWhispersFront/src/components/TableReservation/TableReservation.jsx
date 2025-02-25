import React, { useState } from 'react';
import './TableReservation.css';

const TableReservation = ({ restaurantId, restaurantName }) => {
    const [selectedPeople, setSelectedPeople] = useState(2);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
    const [selectedTime, setSelectedTime] = useState('19:00');
    const [availableSlots, setAvailableSlots] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      setIsLoading(true);
  
      try {
        const response = await fetch(`http://localhost:7000/api/reservations/check-availability`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            restaurantId,
            date: selectedDate,
            time: selectedTime,
            guests: selectedPeople
          }),
        });
  
        const data = await response.json();
        if (data.success) {
          setAvailableSlots(data.timeSlots);
        }
      } catch (error) {
        console.error('Error checking availability:', error);
      } finally {
        setIsLoading(false);
      }
    };
  
    return (
      <div className="table-reservation">
        <form onSubmit={handleSubmit} className="booking-form">
          <div className="input-group">
            <label>Party Size</label>
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
  
          <button type="submit" className="find-table-btn" disabled={isLoading}>
            {isLoading ? 'Searching...' : 'Find me a table'}
          </button>
        </form>
  
        {availableSlots && (
          <div className="available-times">
            <h3>Available times</h3>
            <p className="date-info">
              {new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              })} · {selectedPeople} {selectedPeople === 1 ? 'person' : 'people'}
            </p>
  
            <div className="seating-areas">
              <div className="area">
                <h4>Available slots</h4>
                <div className="time-slots">
                  {availableSlots.map((slot, index) => (
                    <button
                      key={index}
                      className={`time-slot ${slot.isAvailable ? '' : 'unavailable'}`}
                      onClick={() => slot.isAvailable && handleBooking(slot)}
                      disabled={!slot.isAvailable}
                    >
                      <span className="time">{slot.time}</span>
                      <span className="status">{slot.status}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
  
export default TableReservation;