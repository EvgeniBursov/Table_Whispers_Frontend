import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'
import './HomePage.css';

const HomePage = () => {
 const navigate = useNavigate();
 const [selectedPeople, setSelectedPeople] = useState(2);
 const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
 const [selectedTime, setSelectedTime] = useState('19:00');
 const [selectedLocation, setSelectedLocation] = useState('');
 const [recommendedRestaurants, setRecommendedRestaurants] = useState([]);
 const [searchQuery, setSearchQuery] = useState('');
 const [filteredRestaurants, setFilteredRestaurants] = useState([]);

 const handleRestaurantClick = (restaurantId) => {
  navigate(`/restaurant/${restaurantId}`);  // שיניתי את הנתיב
};

 useEffect(() => {
   const fetchRecommendedRestaurants = async () => {
     try {
       const response = await fetch('http://localhost:7000/all_Restaurants_Data');
       const data = await response.json();
       console.log("🔹 Data from server:", data);

       if (Array.isArray(data)) {
         setRecommendedRestaurants(data);
         setFilteredRestaurants(data);
       } else if (data.data && Array.isArray(data.data)) {
         setRecommendedRestaurants(data.data);
         setFilteredRestaurants(data.data);
       } else {
         console.error("❌ Unexpected data format:", data);
       }
     } catch (error) {
       console.error('❌ Error fetching data:', error);
     }
   };

   fetchRecommendedRestaurants();
 }, []);

 const searchRestaurants = (query) => {
   if (!query) {
     setFilteredRestaurants(recommendedRestaurants);
     return;
   }

   const filtered = recommendedRestaurants.filter(restaurant => 
     restaurant.res_name?.toLowerCase().includes(query.toLowerCase()) ||
     restaurant.city?.toLowerCase().includes(query.toLowerCase()) ||
     restaurant.description?.toLowerCase().includes(query.toLowerCase())
   );

   setFilteredRestaurants(filtered);
 };

 const handleSearch = async () => {
   try {
     const response = await fetch('http://localhost:7000/searchRestaurants', {
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
       setFilteredRestaurants(data);
     } else {
       console.error("❌ Unexpected format in search results:", data);
     }
   } catch (error) {
     console.error('❌ Error searching for restaurants:', error);
   }
 };
 const today = new Date().toISOString().split("T")[0];
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
          min={today} 
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
       <h2>Recommended Restaurants</h2>
       {filteredRestaurants.length === 0 ? (
         <p>🔎 No restaurants found.</p>
       ) : (
         <div className="restaurants-grid">
           {filteredRestaurants.map((restaurant) => (
             <div key={restaurant._id} 
             className="restaurant-card"
             onClick={() => handleRestaurantClick(restaurant._id)}
             >
               <img 
                 src={`http://localhost:7000/${restaurant.mainImage}` || 'https://via.placeholder.com/150'} 
                 alt={restaurant.name} 
                 className="restaurant-image"
               />
               <div className="restaurant-info">
                 <h3>{restaurant.res_name}</h3>
                 <div className="rating">
                   {[...Array(5)].map((_, index) => (
                     <span key={index} className={index < restaurant.rating ? 'star-filled' : 'star-empty'}>
                       ★
                     </span>
                   ))}
                   <span className="review-count">({restaurant.reviewCount || 0} reviews)</span>
                 </div>
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