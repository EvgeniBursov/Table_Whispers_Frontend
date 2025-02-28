import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';

const HomePage = () => {
  const navigate = useNavigate();
  const [selectedPeople, setSelectedPeople] = useState(2);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedTime, setSelectedTime] = useState('19:00');
  const [searchQuery, setSearchQuery] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [selectedRestaurantTime, setSelectedRestaurantTime] = useState({});

  // Generate time options for the time select dropdown (24-hour format)
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 11; hour <= 23; hour++) {
      options.push(`${hour}:00`);
      options.push(`${hour}:30`);
    }
    return options;
  };

  // Fetch recommended restaurants on load
  useEffect(() => {
    fetchRecommendedRestaurants();
  }, []);

  // Fetch recommended restaurants
  const fetchRecommendedRestaurants = async () => {
    try {
      const response = await fetch('http://localhost:7000/all_Restaurants_Data');
      const data = await response.json();
      console.log("🔹 Data from server:", data);

      if (Array.isArray(data)) {
        // Add random available times for demonstration
        const enhancedData = data.map(restaurant => ({
          ...restaurant,
          availableTimes: generateMockAvailableTimes()
        }));
        setRestaurants(enhancedData);
        setFilteredRestaurants(enhancedData);
      } else if (data.data && Array.isArray(data.data)) {
        const enhancedData = data.data.map(restaurant => ({
          ...restaurant,
          availableTimes: generateMockAvailableTimes()
        }));
        setRestaurants(enhancedData);
        setFilteredRestaurants(enhancedData);
      } else {
        console.error("❌ Unexpected data format:", data);
        setSearchMessage("Could not load recommended restaurants");
      }
    } catch (error) {
      console.error('❌ Error fetching data:', error);
      setSearchMessage("Error loading restaurants. Please try again.");
    }
  };

  // Generate mock available times for demonstration
  const generateMockAvailableTimes = () => {
    const availableTimes = [];
    const baseHour = Math.floor(Math.random() * 5) + 17; // 17-21 (5pm-9pm)
    
    // Generate 2-4 time slots
    const numberOfSlots = Math.floor(Math.random() * 3) + 2; // 2-4 slots
    
    for (let i = 0; i < numberOfSlots; i++) {
      const hour = baseHour + Math.floor(i / 2);
      const minute = (i % 2) * 30;
      const timeSlot = `${hour}:${minute === 0 ? '00' : minute}`;
      
      // Add tables information
      const tables = Math.floor(Math.random() * 4) + 1; // 1-4 tables
      
      availableTimes.push({
        time: timeSlot,
        availableTables: tables
      });
    }
    
    return availableTimes;
  };

  // Search restaurants by query
  const searchRestaurants = (query) => {
    if (!query) {
      setFilteredRestaurants(restaurants);
      return;
    }

    const filtered = restaurants.filter(restaurant => 
      restaurant.res_name?.toLowerCase().includes(query.toLowerCase()) ||
      restaurant.city?.toLowerCase().includes(query.toLowerCase()) ||
      restaurant.description?.toLowerCase().includes(query.toLowerCase())
    );

    setFilteredRestaurants(filtered);
  };

  // Handle main search form submission
  const handleSearch = async () => {
    setIsSearching(true);
    setSearchMessage(null);
    
    try {
      // First try to use the search_restaurants endpoint if available
      try {
        const response = await fetch(
          `http://localhost:7000/search_restaurants?date=${selectedDate}&time=${selectedTime}&partySize=${selectedPeople}`
        );
        
        const data = await response.json();
        
        if (data.success && data.restaurants) {
          setFilteredRestaurants(data.restaurants);
          setRestaurants(data.restaurants);
          
          if (data.restaurants.length === 0) {
            setSearchMessage(`No restaurants available for ${selectedPeople} people at ${selectedTime} on ${selectedDate}`);
          }
          
          setIsSearching(false);
          return;
        }
      } catch (error) {
        console.log("Search endpoint not available, using fallback...");
      }
      
      // Fallback to the old endpoint or generate mock data
      const response = await fetch('http://localhost:7000/all_Restaurants_Data');
      const data = await response.json();
      
      if (Array.isArray(data)) {
        // Filter restaurants with available times around the selected time
        const filteredData = data.filter(restaurant => {
          // Use mock logic because we don't actually have availability data
          return Math.random() > 0.3; // Randomly filter out 30% of restaurants
        });
        
        // Add mock available times for the selected time
        const enhancedData = filteredData.map(restaurant => {
          // Generate time slots around the selected time
          const availableTimes = [];
          const [hours, minutes] = selectedTime.split(':').map(Number);
          
          // Add selected time
          availableTimes.push({
            time: selectedTime,
            availableTables: Math.floor(Math.random() * 3) + 1 // 1-3 tables
          });
          
          // Add time slot 30 minutes before
          if (hours > 11 || (hours === 11 && minutes === 30)) {
            let prevHour = hours;
            let prevMinutes = minutes - 30;
            
            if (prevMinutes < 0) {
              prevHour -= 1;
              prevMinutes = 30;
            }
            
            availableTimes.push({
              time: `${prevHour}:${prevMinutes === 0 ? '00' : prevMinutes}`,
              availableTables: Math.floor(Math.random() * 3) + 1 // 1-3 tables
            });
          }
          
          // Add time slot 30 minutes after
          if (hours < 23 || (hours === 22 && minutes === 30)) {
            let nextHour = hours;
            let nextMinutes = minutes + 30;
            
            if (nextMinutes >= 60) {
              nextHour += 1;
              nextMinutes = 0;
            }
            
            availableTimes.push({
              time: `${nextHour}:${nextMinutes === 0 ? '00' : nextMinutes}`,
              availableTables: Math.floor(Math.random() * 3) + 1 // 1-3 tables
            });
          }
          
          return {
            ...restaurant,
            availableTimes: availableTimes.sort((a, b) => a.time.localeCompare(b.time))
          };
        });
        
        setRestaurants(enhancedData);
        setFilteredRestaurants(enhancedData);
        
        if (enhancedData.length === 0) {
          setSearchMessage(`No restaurants available for ${selectedPeople} people at ${selectedTime} on ${selectedDate}`);
        }
      } else {
        console.error("❌ Unexpected data format:", data);
        setSearchMessage("Could not find restaurants for your search criteria");
      }
    } catch (error) {
      console.error('❌ Error searching for restaurants:', error);
      setSearchMessage("Error searching for restaurants. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  // Handle restaurant card click
  const handleRestaurantClick = (restaurantId) => {
    // If user has selected a time, include it in navigation
    const selectedTime = selectedRestaurantTime[restaurantId];
    
    if (selectedTime) {
      navigate(`/restaurant/${restaurantId}`, {
        state: {
          reservationParams: {
            date: selectedDate,
            time: selectedTime,
            partySize: selectedPeople
          }
        }
      });
    } else {
      navigate(`/restaurant/${restaurantId}`);
    }
  };

  // Handle time slot selection
  const handleTimeSelect = (restaurantId, time) => {
    setSelectedRestaurantTime({
      ...selectedRestaurantTime,
      [restaurantId]: time
    });
    
    // Set the selected restaurant
    setSelectedRestaurant(restaurantId);
  };

  const today = new Date().toISOString().split("T")[0];
  
  return (
    <div className="homepage">
      <div className="search-section">
        <div className="search-container">
          <select 
            value={selectedPeople}
            onChange={(e) => setSelectedPeople(Number(e.target.value))}
            className="party-size-select"
          >
            <option value="1">1 Person</option>
            <option value="2">2 People</option>
            <option value="3">3 People</option>
            <option value="4">4 People</option>
            <option value="5">5 People</option>
            <option value="6">6 People</option>
            <option value="8">8 People</option>
            <option value="10">10+ People</option>
          </select>

          <input 
            type="date"
            value={selectedDate}
            min={today} 
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-input"
          />

          <select
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            className="time-select"
          >
            {generateTimeOptions().map((timeOption) => (
              <option key={timeOption} value={timeOption}>
                {timeOption}
              </option>
            ))}
          </select>

          <button 
            onClick={handleSearch}
            className="find-button"
            disabled={isSearching}
          >
            {isSearching ? 'Searching...' : 'FIND ME A TABLE'}
          </button>

          <div className="restaurant-search">
            <input
              type="text"
              placeholder="Search restaurants by name, city or description..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchRestaurants(e.target.value);
              }}
              className="search-input"
            />
          </div>
        </div>
      </div>

      <div className="recommended-section">
        <h2>{searchQuery ? 'Search Results' : 'Available Restaurants'}</h2>
        
        {searchMessage && (
          <div className="search-message">
            {searchMessage}
          </div>
        )}
        
        {filteredRestaurants.length === 0 && !searchMessage ? (
          <p className="no-results">🔎 No restaurants found.</p>
        ) : (
          <div className="restaurants-grid">
            {filteredRestaurants.map((restaurant) => (
              <div 
                key={restaurant._id} 
                className="restaurant-card"
                onClick={() => handleRestaurantClick(restaurant._id)}
              >
                <img 
                  src={`http://localhost:7000/${restaurant.mainImage}`} 
                  alt={restaurant.res_name} 
                  className="restaurant-image"
                />
                <div className="restaurant-info">
                  <h3>{restaurant.res_name}</h3>
                  <div className="rating">
                    {[...Array(5)].map((_, index) => (
                      <span key={index} className={index < Math.floor(restaurant.rating) ? 'star-filled' : 'star-empty'}>
                        ★
                      </span>
                    ))}
                    <span className="rating-number">({restaurant.reviewCount || 0} reviews)</span>
                  </div>
                  <p className="location">{restaurant.city || 'Unknown location'}</p>
                  <p className="description">{restaurant.description || ''}</p>
                  
                  <div className="available-times">
                    {restaurant.availableTimes && restaurant.availableTimes.length > 0 ? (
                      <>
                        <h4>Available Times</h4>
                        <div className="time-slots">
                          {restaurant.availableTimes.map((timeSlot) => (
                            <button 
                              key={timeSlot.time} 
                              className={`time-slot ${selectedRestaurantTime[restaurant._id] === timeSlot.time ? 'selected' : ''} ${timeSlot.availableTables === 1 ? 'last-table' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent card click
                                handleTimeSelect(restaurant._id, timeSlot.time);
                              }}
                            >
                              <span className="time-text">{timeSlot.time}</span>
                              <span className="table-info">
                                <span className={`dot ${timeSlot.availableTables === 1 ? 'low' : ''}`}></span>
                                {timeSlot.availableTables === 1 ? 'Last table!' : `${timeSlot.availableTables} tables`}
                              </span>
                            </button>
                          ))}
                        </div>
                        
                        {selectedRestaurant === restaurant._id && selectedRestaurantTime[restaurant._id] && (
                          <button 
                            className="reserve-now-btn"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent card click
                              handleRestaurantClick(restaurant._id);
                            }}
                          >
                            Reserve for {selectedRestaurantTime[restaurant._id]}
                          </button>
                        )}
                      </>
                    ) : (
                      <p className="no-times">❌ No available times</p>
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