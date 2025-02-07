import React, { useState, useEffect } from 'react';
import './HomePage.css';

const HomePage = () => {
  const [selectedPeople, setSelectedPeople] = useState(2);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('19:00');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [recommendedRestaurants, setRecommendedRestaurants] = useState([]);

  // פונקציה להבאת מסעדות מומלצות
  useEffect(() => {
    const fetchRecommendedRestaurants = async () => {
      try {
        const response = await fetch('http://localhost:5000/getRecommendedRestaurants');
        const data = await response.json();
        setRecommendedRestaurants(data);
      } catch (error) {
        console.error('Failed to fetch restaurants:', error);
      }
    };

    fetchRecommendedRestaurants();
  }, []);

  // פונקציה לחיפוש מסעדות
  const handleSearch = async () => {
    try {
      const response = await fetch('http://localhost:5000/searchRestaurants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          people: selectedPeople,
          date: selectedDate,
          time: selectedTime,
          location: selectedLocation
        })
      });
      
      const data = await response.json();
      setRecommendedRestaurants(data);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  return (
    <div className="homepage">
      {/* חיפוש */}
      <div className="search-section">
        <div className="search-container">
          <select 
            value={selectedPeople}
            onChange={(e) => setSelectedPeople(e.target.value)}
          >
            <option value="1">1 Person</option>
            <option value="2">2 People</option>
            <option value="3">3 People</option>
            <option value="4">4 People</option>
            <option value="5">5+ People</option>
          </select>

          <input 
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />

          <input 
            type="time"
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
          />

          <input 
            type="text"
            placeholder="Enter location..."
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
          />

          <button onClick={handleSearch}>Find</button>
        </div>
      </div>

      {/* מסעדות מומלצות */}
      <div className="recommended-section">
        <h2>Recommended Restaurants</h2>
        <div className="restaurants-grid">
          {recommendedRestaurants.map((restaurant) => (
            <div key={restaurant._id} className="restaurant-card">
              <img 
                src={restaurant.image} 
                alt={restaurant.name} 
                className="restaurant-image"
              />
              <div className="restaurant-info">
                <h3>{restaurant.name}</h3>
                <div className="rating">
                  {[...Array(5)].map((_, index) => (
                    <span key={index} className={index < restaurant.rating ? 'star-filled' : 'star-empty'}>
                      ★
                    </span>
                  ))}
                  <span className="review-count">({restaurant.reviewCount} reviews)</span>
                </div>
                <p className="location">{restaurant.location}</p>
                <p className="cuisine">{restaurant.cuisine}</p>
                <div className="available-times">
                  {restaurant.availableTimes.map((time) => (
                    <button key={time} className="time-slot">
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePage;