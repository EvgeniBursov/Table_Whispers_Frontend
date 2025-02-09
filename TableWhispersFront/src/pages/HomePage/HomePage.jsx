import React, { useState, useEffect } from 'react';
import './HomePage.css';

const HomePage = () => {
  const [selectedPeople, setSelectedPeople] = useState(2);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedTime, setSelectedTime] = useState('19:00');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [recommendedRestaurants, setRecommendedRestaurants] = useState([]);

  useEffect(() => {
    const fetchRecommendedRestaurants = async () => {
      try {
        const response = await fetch('http://localhost:7000/all_Restaurants_Data');
        const data = await response.json();
        console.log("🔹 Data from server:", data);

        if (Array.isArray(data)) {
          setRecommendedRestaurants(data);
        } else if (data.data && Array.isArray(data.data)) {
          setRecommendedRestaurants(data.data);
        } else {
          console.error("❌ Unexpected data format:", data);
        }
      } catch (error) {
        console.error('❌ Error fetching data:', error);
      }
    };

    fetchRecommendedRestaurants();
  }, []);

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
      console.log("🔍 Search results:", data);

      if (Array.isArray(data)) {
        setRecommendedRestaurants(data);
      } else {
        console.error("❌ Unexpected format in search results:", data);
      }
    } catch (error) {
      console.error('❌ Error searching for restaurants:', error);
    }
  };

  return (
    <div className="homepage">
      <div className="search-section">
        <div className="search-container">
          <select 
            value={selectedPeople}
            onChange={(e) => setSelectedPeople(Number(e.target.value))}
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

      <div className="recommended-section">
        <h2>Recommended Restaurants</h2>
        {recommendedRestaurants.length === 0 ? (
          <p>🔎 No restaurants found.</p>
        ) : (
          <div className="restaurants-grid">
            {recommendedRestaurants.map((restaurant) => (
              <div key={restaurant._id} className="restaurant-card">
                <img 
                  src={`http://localhost:7000/${restaurant.mainImage}` || 'https://via.placeholder.com/150'} 
                  alt={restaurant.name} 
                  className="restaurant-image"
                />
                <div className="restaurant-info">
                  <h3>{restaurant.name}</h3>
                  <div className="rating">
                    {/* Display filled stars based on the restaurant rating */}
                    {[...Array(5)].map((_, index) => (
                      <span key={index} className={index < restaurant.rating ? 'star-filled' : 'star-empty'}>
                        ★
                      </span>
                    ))}
                    
                    {/* Display the number of reviews */}
                    <span className="review-count">({restaurant.reviewCount || 0} reviews)</span>
                  </div>
                  <p className="restaurant">{restaurant.res_name || ''}</p>
                  <p className="location">{restaurant.city || 'Unknown location'}</p>
                  <p className="description">{restaurant.description || ''}</p>
                  <div className="available-times">
                    {restaurant.availableTimes && restaurant.availableTimes.length > 0 ? (
                      restaurant.availableTimes.map((time) => (
                        <button key={time} className="time-slot">
                          {time}
                        </button>
                      ))
                    ) : (
                      <p>❌ No available times</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
