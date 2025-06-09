import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AvailableTimeCards from '../../components/AvailableTimeCards/AvailableTimeCards';
import ReservationModal from '../../components/TableReservation/ReservationModel';
import './HomePage.css';

const API_URL = import.meta.env.VITE_BACKEND_API || 'http://localhost:5000';

const HomePage = () => {
  const navigate = useNavigate();
  const [selectedPeople, setSelectedPeople] = useState(2);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedTime, setSelectedTime] = useState(findClosestTime());
  const [searchQuery, setSearchQuery] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [searchMessage, setSearchMessage] = useState(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [selectedRestaurantTime, setSelectedRestaurantTime] = useState({});
  const [realAvailabilityData, setRealAvailabilityData] = useState({}); 

  // Reservation modal state
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [reservationRestaurant, setReservationRestaurant] = useState(null);

  // Function to check if a time is valid (not past and with 30-min buffer)
  const isValidTimeSlot = (timeSlot) => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    
    // If future date, all times are valid
    if (selectedDate > today) {
      return true;
    }
    
    // If past date, no times are valid
    if (selectedDate < today) {
      return false;
    }
    
    // For today, check if time is in the future with buffer
    const [slotHour, slotMinute] = timeSlot.split(':').map(Number);
    const slotTime = new Date();
    slotTime.setHours(slotHour, slotMinute, 0, 0);
    
    const bufferTime = new Date(now);
    bufferTime.setMinutes(bufferTime.getMinutes() + 30);
    
    return slotTime >= bufferTime;
  };

  // Function to find the closest time to current time (with 30-min buffer)
  function findClosestTime() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    
    let bufferMinutes = currentMinutes + 30;
    let bufferHour = currentHour;
    
    if (bufferMinutes >= 60) {
      bufferHour += 1;
      bufferMinutes -= 60;
    }
    
    // Round to nearest 30-minute slot
    const roundedMinutes = bufferMinutes <= 30 ? 30 : 0;
    const adjustedHour = roundedMinutes === 0 ? bufferHour + 1 : bufferHour;
    
    // Ensure within reasonable dining hours (11:00 - 23:00)
    if (adjustedHour < 11) {
      return "11:00";
    }
    
    if (adjustedHour >= 23) {
      return "11:00"; // Next day
    }
    
    const formattedHour = adjustedHour.toString().padStart(2, '0');
    const formattedMinute = roundedMinutes.toString().padStart(2, '0');
    return `${formattedHour}:${formattedMinute}`;
  }

  // Generate time options for the time select dropdown (24-hour format)
  const generateTimeOptions = () => {
    const options = [];
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const isToday = selectedDate === today;
    
    // Generate 30-minute slots from 11:00 to 23:00
    for (let hour = 11; hour <= 23; hour++) {
      for (let minute of [0, 30]) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // For today, only show future times with buffer
        if (isToday && !isValidTimeSlot(timeString)) {
          continue;
        }
        
        options.push(timeString);
      }
    }
    
    return options;
  };

  // Convert 24-hour format to 12-hour format for display and API compatibility
  const convertTo12Hour = (timeString) => {
    const [hours24, minutes] = timeString.split(':').map(Number);
    const hours12 = hours24 % 12 || 12;
    const meridiem = hours24 >= 12 ? 'PM' : 'AM';
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${meridiem}`;
  };

  // Convert 12-hour format to 24-hour format for internal use
  const convertTo24Hour = (timeString) => {
    if (!timeString.includes('AM') && !timeString.includes('PM')) {
      return timeString; // Already in 24-hour format
    }
    
    const [timePart, meridiem] = timeString.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);
    
    if (meridiem === 'PM' && hours < 12) {
      hours += 12;
    } else if (meridiem === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Fetch real availability for all restaurants using the existing API
  const fetchRealAvailabilityForAllRestaurants = async (restaurantsList) => {
    if (!restaurantsList || restaurantsList.length === 0) {
      setLoadingAvailability(false);
      return;
    }

    setLoadingAvailability(true);
    const newRealAvailabilityData = {};
    
    try {
      console.log(`Fetching real availability for ${restaurantsList.length} restaurants`);
      
      // Create promises for fetching availability for each restaurant
      const availabilityPromises = restaurantsList.map(async (restaurant) => {
        try {
          console.log(`Fetching availability for ${restaurant.res_name} - Date: ${selectedDate}, Guests: ${selectedPeople}`);
          
          // Use the existing API endpoint
          const response = await fetch(
            `${API_URL}/restaurant/${restaurant._id}/availability?date=${selectedDate}&guests=${selectedPeople}`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              }
            }
          );
          
          if (!response.ok) {
            console.error(`Failed to fetch availability for ${restaurant._id}. Status: ${response.status}`);
            newRealAvailabilityData[restaurant._id] = [];
            return;
          }
          
          const data = await response.json();
          console.log(`Availability data for ${restaurant.res_name}:`, data);
          
          if (data.success && data.availability) {
            // Convert the availability object to array format
            // data.availability is like: { "14:00": 3, "14:30": 2, "15:00": 0, "15:30": 1 }
            const processedTimes = Object.entries(data.availability)
              .filter(([timeSlot, availableCount]) => availableCount > 0)
              .map(([timeSlot, availableCount]) => ({
                time: convertTo24Hour(timeSlot), // Convert to 24h format for internal use
                availableTables: availableCount
              }))
              .filter(slot => {
                // Only include valid times (future times with 30-min buffer for today)
                return isValidTimeSlot(slot.time);
              })
              .sort((a, b) => {
                // Sort times chronologically
                const timeA = a.time.split(':').map(Number);
                const timeB = b.time.split(':').map(Number);
                
                if (timeA[0] !== timeB[0]) {
                  return timeA[0] - timeB[0]; // Sort by hour
                }
                return timeA[1] - timeB[1]; // Then by minute
              });
            
            newRealAvailabilityData[restaurant._id] = processedTimes;
            console.log(`Processed ${processedTimes.length} available times for ${restaurant.res_name}`);
          } else {
            console.log(`No available times found for ${restaurant.res_name}`);
            newRealAvailabilityData[restaurant._id] = [];
          }
        } catch (error) {
          console.error(`Error fetching availability for restaurant ${restaurant._id}:`, error);
          newRealAvailabilityData[restaurant._id] = [];
        }
      });
      
      // Wait for all promises to resolve
      await Promise.all(availabilityPromises);
      
      // Update state with real availability data
      setRealAvailabilityData(newRealAvailabilityData);
      console.log("All real availability data loaded successfully");
      
    } catch (error) {
      console.error('Error fetching real availability:', error);
    } finally {
      setLoadingAvailability(false);
    }
  };

  // Get the 2 closest time slots to the selected time
  const getTwoClosestRealTimes = (availableTimes, baseTime) => {
    if (!availableTimes || availableTimes.length === 0) return [];
    
    const [baseHour, baseMinute] = baseTime.split(':').map(Number);
    const baseTimeInMinutes = baseHour * 60 + baseMinute;
    
    const timesWithDifference = availableTimes.map(slot => {
      const [slotHour, slotMinute] = slot.time.split(':').map(Number);
      const slotTimeInMinutes = slotHour * 60 + slotMinute;
      
      const diffInMinutes = Math.abs(slotTimeInMinutes - baseTimeInMinutes);
      
      return {
        ...slot,
        diffInMinutes
      };
    });
    
    const sortedByProximity = [...timesWithDifference].sort((a, b) => {
      return a.diffInMinutes - b.diffInMinutes;
    });
    
    return sortedByProximity.slice(0, 2).map(slot => ({
      time: slot.time,
      availableTables: slot.availableTables
    }));
  };

  // Update time selector when date changes
  useEffect(() => {
    const options = generateTimeOptions();
    
    if (options.length > 0 && !options.includes(selectedTime)) {
      setSelectedTime(options[0]);
    }
  }, [selectedDate]);

  // Fetch recommended restaurants on load
  useEffect(() => {
    fetchRecommendedRestaurants();
  }, []);

  // Fetch recommended restaurants
  const fetchRecommendedRestaurants = async () => {
    try {
      setLoadingAvailability(true);
      const response = await fetch(`${API_URL}/all_Restaurants_Data`); 
      const data = await response.json();

      let restaurantsList = [];
      if (Array.isArray(data)) {
        restaurantsList = data;
      } else if (data.data && Array.isArray(data.data)) {
        restaurantsList = data.data;
      } else {
        console.error("❌ Unexpected data format:", data);
        setSearchMessage("Could not load recommended restaurants");
        setLoadingAvailability(false);
        return;
      }
      
      setRestaurants(restaurantsList);
      setFilteredRestaurants(restaurantsList);
      
      // Fetch availability for all restaurants
      await fetchRealAvailabilityForAllRestaurants(restaurantsList);
      
    } catch (error) {
      console.error('❌ Error fetching data:', error);
      setSearchMessage("Error loading restaurants. Please try again.");
      setLoadingAvailability(false);
    }
  };

  // Re-fetch real availability when date or party size changes
  useEffect(() => {
    if (restaurants.length > 0) {
      console.log(`Refreshing availability due to change - Date: ${selectedDate}, People: ${selectedPeople}`);
      fetchRealAvailabilityForAllRestaurants(restaurants);
    }
  }, [selectedDate, selectedPeople]);

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
      const response = await fetch(`${API_URL}/all_Restaurants_Data`);
      const data = await response.json();
      
      let restaurantsList = [];
      if (Array.isArray(data)) {
        restaurantsList = data;
      } else if (data.data && Array.isArray(data.data)) {
        restaurantsList = data.data;
      } else {
        console.error("❌ Unexpected data format:", data);
        setSearchMessage("Could not find restaurants for your search criteria");
        setIsSearching(false);
        return;
      }
      
      setRestaurants(restaurantsList);
      
      // Fetch real availability
      await fetchRealAvailabilityForAllRestaurants(restaurantsList);
      
      // Wait a moment for availability data to be processed
      setTimeout(() => {
        // Filter restaurants that have real available times
        const restaurantsWithRealAvailability = restaurantsList.filter(restaurant => {
          const realAvailableTimes = realAvailabilityData[restaurant._id] || [];
          return realAvailableTimes.length > 0;
        });
        
        setFilteredRestaurants(restaurantsWithRealAvailability);
        
        if (restaurantsWithRealAvailability.length === 0) {
          setSearchMessage(`No restaurants available for ${selectedPeople} ${selectedPeople === 1 ? 'person' : 'people'} on ${selectedDate}`);
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error searching for restaurants:', error);
      setSearchMessage("Error searching for restaurants. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  // Handle restaurant card click
  const handleRestaurantClick = (e, restaurantId) => {
    if (isReservationModalOpen) return;
    navigate(`/restaurant/${restaurantId}`);
  };

  // Handle time slot selection
  const handleTimeSelect = (restaurantId, time) => {
    setSelectedRestaurantTime({
      ...selectedRestaurantTime,
      [restaurantId]: time
    });
    
    setSelectedRestaurant(restaurantId);
    
    const restaurant = restaurants.find(r => r._id === restaurantId);
    if (restaurant) {
      setReservationRestaurant(restaurant);
      setIsReservationModalOpen(true);
    }
  };

  // Close the reservation modal
  const handleCloseReservationModal = () => {
    setIsReservationModalOpen(false);
    setReservationRestaurant(null);
  };

  const today = new Date().toISOString().split("T")[0];
  
  return (
    <div className="homepage">
      <div className="search-section">
        <div className="search-container">
          <select 
            value={selectedPeople}
            onChange={(e) => {
              setSelectedPeople(Number(e.target.value));
            }}
            className="party-size-select"
            aria-label="Number of people"
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
            onChange={(e) => {
              setSelectedDate(e.target.value);
            }}
            className="date-input"
            aria-label="Reservation date"
          />

          <select
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            className="time-select"
            aria-label="Reservation time"
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
            disabled={isSearching || loadingAvailability}
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
        
        {loadingAvailability && (
          <div className="availability-loading">
            <p>Checking availability for {selectedPeople} {selectedPeople === 1 ? 'person' : 'people'} on {selectedDate}...</p>
          </div>
        )}
        
        {searchMessage && (
          <div className="search-message">
            {searchMessage}
          </div>
        )}
        
        {!loadingAvailability && filteredRestaurants.length === 0 && !searchMessage ? (
          <p className="no-results">🔎 No restaurants found with available tables.</p>
        ) : (
          <div className="restaurants-grid">
            {filteredRestaurants.map((restaurant) => {
              // Get real available times for this restaurant
              const realAvailableTimes = realAvailabilityData[restaurant._id] || [];
              
              // Get only the 2 closest times to the selected time
              const twoClosestRealTimes = getTwoClosestRealTimes(realAvailableTimes, selectedTime);
              
              // Only show restaurants with available times
              if (realAvailableTimes.length === 0 && !loadingAvailability) {
                return null;
              }
              
              return (
                <div 
                  key={restaurant._id} 
                  className="restaurant-card"
                  onClick={(e) => handleRestaurantClick(e, restaurant._id)}
                >
                  <img 
                    src={`${API_URL}/${restaurant.mainImage}`} 
                    alt={restaurant.res_name} 
                    className="restaurant-image"
                  />
                  <div className="restaurant-info">
                    <h3>{restaurant.res_name}</h3>
                    <div className="rating">
                      {[...Array(5)].map((_, index) => {
                        const ratingValue = restaurant.rating || 0;
                        
                        if (index < Math.floor(ratingValue)) {
                          return <span key={index} className="star-filled">★</span>;
                        } else if (index < Math.floor(ratingValue + 0.5)) {
                          return <span key={index} className="star-half">★</span>;
                        } else {
                          return <span key={index} className="star-empty">★</span>;
                        }
                      })}
                      <span className="rating-number">({restaurant.number_of_rating || 0} reviews)</span>
                    </div>
                    <p className="location">{restaurant.city || 'Unknown location'}</p>
                    <p className="description">{restaurant.description || ''}</p>
                    
                    <div className="available-times">
                      <h4>Available Times</h4>
                      
                      {loadingAvailability ? (
                        <p className="loading-times">Checking availability...</p>
                      ) : twoClosestRealTimes && twoClosestRealTimes.length > 0 ? (
                        <AvailableTimeCards
                          availableTimes={twoClosestRealTimes}
                          selectedTime={selectedRestaurantTime[restaurant._id]}
                          onSelectTime={(time) => {
                            handleTimeSelect(restaurant._id, time);
                          }}
                          type="table"
                        />
                      ) : (
                        <p className="no-times">No tables available for {selectedPeople} {selectedPeople === 1 ? 'person' : 'people'}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Reservation Modal */}
      {reservationRestaurant && (
        <ReservationModal
          isOpen={isReservationModalOpen}
          onClose={handleCloseReservationModal}
          restaurantId={reservationRestaurant._id}
          restaurantName={reservationRestaurant.res_name}
          selectedDate={selectedDate}
          selectedTime={selectedRestaurantTime[reservationRestaurant._id]}
          selectedPeople={selectedPeople}
        />
      )}
    </div>
  );
};

export default HomePage;