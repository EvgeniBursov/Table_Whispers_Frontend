import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AvailableTimeCards from '../../components/AvailableTimeCards/AvailableTimeCards';
import ReservationModal from '../../components/TableReservation/ReservationModel';
import './HomePage.css';

const HomePage = () => {
  const navigate = useNavigate();
  const [selectedPeople, setSelectedPeople] = useState(2);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedTime, setSelectedTime] = useState(findClosestTime()); // Initialize with closest time
  const [searchQuery, setSearchQuery] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [searchMessage, setSearchMessage] = useState(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [selectedRestaurantTime, setSelectedRestaurantTime] = useState({});
  const [availabilityData, setAvailabilityData] = useState({}); // Store availability data by restaurant ID

  // Reservation modal state
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [reservationRestaurant, setReservationRestaurant] = useState(null);

  // Function to check if a time is valid (not past and with 30-min buffer)
  const isValidTimeSlot = (timeSlot) => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    
    // If the date is in the future, all times are valid
    if (selectedDate > today) {
      return true;
    }
    
    // If the date is in the past, no times are valid
    if (selectedDate < today) {
      return false;
    }
    
    // For today, we need to check the time
    const [slotHour, slotMinute] = timeSlot.time.split(':').map(Number);
    const slotTime = new Date();
    slotTime.setHours(slotHour, slotMinute, 0, 0);
    
    // Calculate current time plus 30 minutes buffer
    const bufferTime = new Date(now);
    bufferTime.setMinutes(bufferTime.getMinutes() + 30);
    
    // Return true if slot time is at least 30 minutes in the future
    return slotTime >= bufferTime;
  };

  // Function to find the closest time to current time (with 30-min buffer)
  function findClosestTime() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    
    // Add 30 minutes buffer
    let bufferMinutes = currentMinutes + 30;
    let bufferHour = currentHour;
    
    // Adjust hour if buffer minutes roll over to next hour
    if (bufferMinutes >= 60) {
      bufferHour += 1;
      bufferMinutes -= 60;
    }
    
    // If buffer time is before restaurant opening hours (11:00), return 11:00
    if (bufferHour < 11) {
      return "11:00";
    }
    
    // If buffer time is after closing (23:30), return the earliest time for tomorrow
    if (bufferHour >= 23 && bufferMinutes > 30) {
      return "11:00";
    }
    
    // Round buffer minutes up to nearest 30 minutes
    const roundedMinutes = bufferMinutes <= 30 ? "30" : "00";
    const adjustedHour = roundedMinutes === "00" ? bufferHour + 1 : bufferHour;
    
    // Return the formatted time with zero-padded hours if needed
    const formattedHour = adjustedHour.toString().padStart(2, '0');
    return `${formattedHour}:${roundedMinutes}`;
  }

  // Generate time options for the time select dropdown (24-hour format)
  const generateTimeOptions = () => {
    const options = [];
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const isToday = selectedDate === today;
    
    // Calculate minimum valid time (now + 30 min)
    let minHour = 0;
    let minMinute = 0;
    
    if (isToday) {
      // Add 30 minutes to current time
      let bufferMinutes = now.getMinutes() + 30;
      let bufferHour = now.getHours();
      
      if (bufferMinutes >= 60) {
        bufferHour += 1;
        bufferMinutes -= 60;
      }
      
      // Round up to nearest 30-minute interval
      if (bufferMinutes > 0 && bufferMinutes < 30) {
        minMinute = 30;
        minHour = bufferHour;
      } else if (bufferMinutes >= 30) {
        minMinute = 0;
        minHour = bufferHour + 1;
      }
    }
    
    // Generate time options for the full day
    for (let hour = 0; hour < 24; hour++) {
      for (let minute of [0, 30]) {
        // Skip times before the minimum valid time on today
        if (isToday && (hour < minHour || (hour === minHour && minute < minMinute))) {
          continue;
        }
        
        // Format hours and minutes with leading zeros
        const formattedHour = hour.toString().padStart(2, '0');
        const formattedMinute = minute === 0 ? '00' : '30';
        options.push(`${formattedHour}:${formattedMinute}`);
      }
    }
    
    return options;
  };

  // Format displayed time (optional: convert to 12-hour format for display)
  const formatDisplayTime = (time) => {
    // You can customize this if you want to display time differently
    return time;
  };

  // Convert 24-hour format to 12-hour format for API
  const convertTo12HourFormat = (time) => {
    const [hours24, minutes] = time.split(':').map(Number);
    const period = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 || 12; // Convert 0 to 12 for 12 AM
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Convert 12-hour format to 24-hour format for display
  const convertTo24HourFormat = (time12h) => {
    if (!time12h) return '';
    
    // Check if the time is already in 24-hour format
    if (!time12h.toLowerCase().includes('am') && !time12h.toLowerCase().includes('pm')) {
      return time12h; // Already in 24-hour format
    }
    
    const [timePart, period] = time12h.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);
    
    // Convert to 24-hour
    if (period.toUpperCase() === 'PM' && hours < 12) {
      hours += 12;
    } else if (period.toUpperCase() === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Update time selector when date changes
  useEffect(() => {
    // If we have a selected time, regenerate the dropdown with new constraints
    const options = generateTimeOptions();
    
    // If the currently selected time is no longer valid, pick the first available time
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
      const response = await fetch('http://localhost:7000/all_Restaurants_Data');
      const data = await response.json();
      console.log("🔹 Data from server:", data);

      if (Array.isArray(data)) {
        setRestaurants(data);
        setFilteredRestaurants(data);
        
        // Fetch availability for all restaurants
        fetchAvailabilityForAllRestaurants(data);
      } else if (data.data && Array.isArray(data.data)) {
        setRestaurants(data.data);
        setFilteredRestaurants(data.data);
        
        // Fetch availability for all restaurants
        fetchAvailabilityForAllRestaurants(data.data);
      } else {
        console.error("❌ Unexpected data format:", data);
        setSearchMessage("Could not load recommended restaurants");
      }
    } catch (error) {
      console.error('❌ Error fetching data:', error);
      setSearchMessage("Error loading restaurants. Please try again.");
    }
  };

  // Fetch availability for all restaurants
  const fetchAvailabilityForAllRestaurants = async (restaurantsList) => {
    setLoadingAvailability(true);
    
    // Create a new object to store availability data
    const newAvailabilityData = {};
    
    try {
      // Create an array of promises for fetching availability
      const availabilityPromises = restaurantsList.map(async (restaurant) => {
        try {
          // Use the correct endpoint based on router configuration
          const response = await fetch(
            `http://localhost:7000/get_Available_Times/reservation/restaurant/${restaurant._id}?date=${selectedDate}&partySize=${selectedPeople}`
          );
          
          if (!response.ok) {
            console.error(`API error (${response.status}): ${response.statusText}`);
            throw new Error(`Failed to fetch availability for restaurant ${restaurant._id}`);
          }
          
          const data = await response.json();
          console.log(`Availability data for ${restaurant.res_name}:`, data);
          
          if (data.success && data.availableTimes) {
            // Process the available times
            const processedTimes = processAvailableTimes(data.availableTimes);
            console.log("Processed times:", processedTimes);
            
            // Filter to only include valid times (future times with 30-min buffer)
            const validTimes = processedTimes.filter(slot => isValidTimeSlot(slot));
            console.log("Valid times:", validTimes);
            
            // Store in our object
            newAvailabilityData[restaurant._id] = validTimes;
          } else {
            console.log(`No available times found for ${restaurant.res_name}`);
            newAvailabilityData[restaurant._id] = [];
          }
        } catch (error) {
          console.error(`Error fetching availability for restaurant ${restaurant._id}:`, error);
          newAvailabilityData[restaurant._id] = [];
        }
      });
      
      // Wait for all promises to resolve
      await Promise.all(availabilityPromises);
      
      // Update state with the new availability data
      setAvailabilityData(newAvailabilityData);
      console.log("All availability data:", newAvailabilityData);
    } catch (error) {
      console.error('Error fetching availability for restaurants:', error);
    } finally {
      setLoadingAvailability(false);
    }
  };

  // Process available times data from the API
  const processAvailableTimes = (availableTimes) => {
    console.log("Processing available times:", availableTimes);
    
    if (!availableTimes || !Array.isArray(availableTimes)) {
      console.warn("Available times is not an array:", availableTimes);
      return [];
    }
    
    return availableTimes.map(slot => {
      // Check if the slot is already in the correct format
      if (typeof slot === 'object' && slot.time) {
        return {
          time: convertTo24HourFormat(slot.time),
          availableTables: slot.availableTables || 1
        };
      } else if (typeof slot === 'string') {
        // If it's just a string time, convert it and assume 1 table
        return {
          time: convertTo24HourFormat(slot),
          availableTables: 1
        };
      }
      
      // Default case - shouldn't happen with proper API response
      return {
        time: convertTo24HourFormat(slot.toString()),
        availableTables: 1
      };
    }).sort((a, b) => {
      // Sort times chronologically
      const timeA = a.time.split(':').map(Number);
      const timeB = b.time.split(':').map(Number);
      
      if (timeA[0] !== timeB[0]) {
        return timeA[0] - timeB[0]; // Sort by hour
      }
      return timeA[1] - timeB[1]; // Then by minute
    });
  };

  // Get only the 2 closest time slots to the selected time
  const getTwoClosestTimes = (availableTimes, baseTime) => {
    if (!availableTimes || availableTimes.length === 0) return [];
    
    // Parse the base time
    const [baseHour, baseMinute] = baseTime.split(':').map(Number);
    const baseTimeInMinutes = baseHour * 60 + baseMinute;
    
    // Calculate the time difference for each slot
    const timesWithDifference = availableTimes.map(slot => {
      const [slotHour, slotMinute] = slot.time.split(':').map(Number);
      const slotTimeInMinutes = slotHour * 60 + slotMinute;
      
      // Calculate absolute difference in minutes
      const diffInMinutes = Math.abs(slotTimeInMinutes - baseTimeInMinutes);
      
      return {
        ...slot,
        diffInMinutes
      };
    });
    
    // Sort by proximity to base time (closest first)
    const sortedByProximity = [...timesWithDifference].sort((a, b) => {
      return a.diffInMinutes - b.diffInMinutes;
    });
    
    // Take just the 2 closest times and remove the diff property
    return sortedByProximity.slice(0, 2).map(slot => ({
      time: slot.time,
      availableTables: slot.availableTables
    }));
  };

  // Re-fetch availability when date or party size changes
  useEffect(() => {
    if (restaurants.length > 0) {
      fetchAvailabilityForAllRestaurants(restaurants);
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
      // First try to use the search_restaurants endpoint if available
      try {
        const response = await fetch(
          `http://localhost:7000/search_restaurants?date=${selectedDate}&time=${convertTo12HourFormat(selectedTime)}&partySize=${selectedPeople}`
        );
        
        const data = await response.json();
        
        if (data.success && data.restaurants) {
          setFilteredRestaurants(data.restaurants);
          
          // Fetch availability for search results
          fetchAvailabilityForAllRestaurants(data.restaurants);
          
          if (data.restaurants.length === 0) {
            setSearchMessage(`No restaurants available for ${selectedPeople} people at ${selectedTime} on ${selectedDate}`);
          }
          
          setIsSearching(false);
          return;
        }
      } catch (error) {
        console.log("Search endpoint not available, using fallback...");
      }
      
      // Fallback - fetch all restaurants and filter by availability
      const response = await fetch('http://localhost:7000/all_Restaurants_Data');
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setRestaurants(data);
        
        // Fetch availability for all restaurants
        await fetchAvailabilityForAllRestaurants(data);
        
        // Filter restaurants that have available times
        const restaurantsWithAvailability = data.filter(restaurant => {
          const availableTimes = availabilityData[restaurant._id] || [];
          return availableTimes.length > 0;
        });
        
        setFilteredRestaurants(restaurantsWithAvailability);
        
        if (restaurantsWithAvailability.length === 0) {
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
  const handleRestaurantClick = (e, restaurantId) => {
    // If a modal is open, don't navigate
    if (isReservationModalOpen) return;
    
    // Navigate to restaurant page
    navigate(`/restaurant/${restaurantId}`);
  };

  // Handle time slot selection - now opens the reservation modal
  const handleTimeSelect = (restaurantId, time) => {
    // Store selected time
    setSelectedRestaurantTime({
      ...selectedRestaurantTime,
      [restaurantId]: time
    });
    
    // Set the selected restaurant
    setSelectedRestaurant(restaurantId);
    
    // Find the restaurant data
    const restaurant = restaurants.find(r => r._id === restaurantId);
    if (restaurant) {
      // Set reservation restaurant data and open the modal
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
            onChange={(e) => setSelectedPeople(Number(e.target.value))}
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
            onChange={(e) => setSelectedDate(e.target.value)}
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
                {formatDisplayTime(timeOption)}
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
        
        {loadingAvailability && (
          <div className="availability-loading">
            <p>Loading availability information...</p>
          </div>
        )}
        
        {searchMessage && (
          <div className="search-message">
            {searchMessage}
          </div>
        )}
        
        {filteredRestaurants.length === 0 && !searchMessage && !loadingAvailability ? (
          <p className="no-results">🔎 No restaurants found.</p>
        ) : (
          <div className="restaurants-grid">
            {filteredRestaurants.map((restaurant) => {
              // Get available times for this restaurant
              const allAvailableTimes = availabilityData[restaurant._id] || [];
              
              // Get only the 2 closest times to the selected time
              const twoClosestTimes = getTwoClosestTimes(allAvailableTimes, selectedTime);
              
              return (
                <div 
                  key={restaurant._id} 
                  className="restaurant-card"
                  onClick={(e) => handleRestaurantClick(e, restaurant._id)}
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
                      <h4>Closest Available Times</h4>
                      
                      {loadingAvailability ? (
                        <p className="loading-times">Loading available times...</p>
                      ) : twoClosestTimes && twoClosestTimes.length > 0 ? (
                        <AvailableTimeCards
                          availableTimes={twoClosestTimes}
                          selectedTime={selectedRestaurantTime[restaurant._id]}
                          onSelectTime={(time) => {
                            // This will open the modal instead of navigating
                            handleTimeSelect(restaurant._id, time);
                          }}
                          type="table" // Default to table, could be enhanced if API provides seating type
                        />
                      ) : (
                        <p className="no-times">No available times</p>
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