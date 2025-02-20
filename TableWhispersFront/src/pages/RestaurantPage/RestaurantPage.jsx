import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './RestaurantPage.css';

const RestaurantPage = () => {
    const { id } = useParams();
    const [restaurant, setRestaurant] = useState(null);
    const [selectedPeople, setSelectedPeople] = useState(2);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
    const [selectedTime, setSelectedTime] = useState('19:00');
    const [activeTab, setActiveTab] = useState('overview');
    
    useEffect(() => {
      const fetchRestaurantData = async () => {
        try {
          const response = await fetch(`http://localhost:7000/restaurant/${id}`);
          const data = await response.json();
          console.log("Restaurant data:", data);
          setRestaurant(data);
        } catch (error) {
          console.error('Error fetching restaurant:', error);
        }
      };
  
      fetchRestaurantData();
    }, [id]);

    if (!restaurant) return <div>Loading...</div>;

    return (
        <div className="restaurant-page">
            <div className="restaurant-header">
                {/* תמונה ראשית */}
                <img 
                    src={`http://localhost:7000/${restaurant.mainImage}`} 
                    alt={restaurant.res_name} 
                    className="main-image"
                />

                <div className="header-content">
                    <h1>{restaurant.res_name}</h1>
                    <div className="restaurant-info">
                        {/* דירוג */}
                        <div className="rating">
                            {[...Array(5)].map((_, index) => (
                                <span key={index} className={index < Math.floor(restaurant.rating) ? 'star-filled' : 'star-empty'}>★</span>
                            ))}
                            <span className="rating-number">{restaurant.rating}</span>
                        </div>

                        {/* פרטי קשר ומיקום */}
                        <div className="contact-info">
                            <p className="phone">{restaurant.phone_number}</p>
                            <p className="address">{restaurant.full_address}</p>
                            <p className="city">{restaurant.city}</p>
                        </div>
                    </div>
                </div>

                {/* Reservation Card */}
        <div className="reservation-card">
          <h3>Make a reservation</h3>
          <div className="reservation-inputs">
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
            
            <input 
              type="date"
              value={selectedDate}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            
            <select 
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
            >
              {restaurant.availableTimes?.map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>

          <button className="reserve-button">Complete reservation</button>
          
          <div className="booked-info">
            Booked {restaurant.todayBookings} times today
          </div>
        </div>
      
            </div>

            {/* Navigation Tabs */}
            <div className="restaurant-nav">
                <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>Overview</button>
                <button className={activeTab === 'menu' ? 'active' : ''} onClick={() => setActiveTab('menu')}>Menu</button>
                <button className={activeTab === 'gallery' ? 'active' : ''} onClick={() => setActiveTab('gallery')}>Gallery</button>
                <button className={activeTab === 'reviews' ? 'active' : ''} onClick={() => setActiveTab('reviews')}>Reviews</button>

            </div>

            {/* תוכן הטאבים */}
            {activeTab === 'overview' && (
                <div className="overview-section">
                    <h2>About Us</h2>
                    <p className="description">{restaurant.description}</p>
                    <p className="full-description">{restaurant.full_description}</p>
                    
                    {/* Opening Hours */}
                <div className="opening-hours">
                    <h3>Opening Hours</h3>
                    {restaurant.open_time ? (
                        Object.entries(restaurant.open_time).map(([day, { open, close }]) => (
                            <p key={day}>
                                <strong>{day.charAt(0).toUpperCase() + day.slice(1)}</strong>
                                <span className={`time ${open === 'Closed' ? 'closed' : ''}`}>
                                    {open === 'Closed' ? 'Closed' : `${open} - ${close}`}
                                </span>
                            </p>
                        ))
                    ) : (
                        <p className="closed">Contact restaurant for hours</p>
                    )}
                </div>
                </div>
            )}

    {activeTab === 'menu' && (
        <div className="menu-section">
            <h2>Our Menu</h2>
            {restaurant?.menu && restaurant.menu.length > 0 ? (
                <div>
                    {['Appetizers', 'Main Course', 'Side Dishes', 'Desserts', 'Drinks'].map((category) => {
                        // Filter items for the current category across all menus
                        const categoryItems = restaurant.menu[0].menus.flatMap(menu => 
                            menu.items.filter(item => item.category === category)
                        );

                        // Only render the category if it has items
                        return categoryItems.length > 0 ? (
                            <div key={category} className="menu-category">
                                <h3>{category}</h3>
                                <div className="menu-items">
                                    {categoryItems.map((item, itemIndex) => (
                                        <div 
                                            key={item._id || itemIndex} 
                                            className="menu-item-details"
                                        >
                                            <div className="item-header">
                                                <h4>{item.name}</h4>
                                                <span className="price">
                                                    ${item.price.toFixed(2)}
                                                </span>
                                            </div>
                                            <p className="description">{item.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null;
                    })}
                </div>
            ) : (
                <div className="no-items">Menu not available</div>
            )}
        </div>
    )}
        {activeTab === 'reviews' && (
        <div className="reviews-section">
            <h2>Customer Reviews</h2>
            {restaurant.reviews && restaurant.reviews.length > 0 ? (
                <div className="reviews-container">
                    {restaurant.reviews.map((review) => (
                        <div key={review._id} className="review-card">
                            <div className="review-header">
                                <div className="review-user-info">
                                    <h4>{review.user ? `${review.user.first_name} ${review.user.last_name}` : 'Anonymous User'}</h4>
                                    <div className="review-rating">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <span 
                                                key={star} 
                                                className={`star ${star <= review.rating ? 'star-filled' : 'star-empty'}`}
                                            >
                                                ★
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <span className="review-date">
                                    {new Date(review.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <p className="review-comment">{review.comment}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="no-reviews">
                    No reviews yet. Be the first to review!
                </div>
            )}
        </div>
    )}

            {activeTab === 'gallery' && (
                <div className="gallery-section">
                    <h2>Gallery</h2>
                    <div className="gallery-grid">
                        {restaurant.all_images && restaurant.all_images.map((image, index) => (
                            <img 
                                key={index}
                                src={`http://localhost:7000/${image}`}
                                alt={`${restaurant.res_name} ${index + 1}`}
                                className="gallery-image"
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RestaurantPage;