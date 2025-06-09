import React, { useState, useEffect } from 'react';
import TableReservation from '../../components/TableReservation/TableReservation';
import RestaurantReviews from '../../components/RestaurantReviews/RestaurantReviews';
import AvailableTimeCards from '../../components/AvailableTimeCards/AvailableTimeCards';
import { useParams } from 'react-router-dom';
import './RestaurantPage.css';
const API_URL = import.meta.env.VITE_BACKEND_API || 'http://localhost:5000';

const RestaurantPage = () => {
    const { id } = useParams();
    const [restaurant, setRestaurant] = useState(null);
    const [selectedPeople, setSelectedPeople] = useState(2);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
    const [selectedTime, setSelectedTime] = useState('19:00');
    const [activeTab, setActiveTab] = useState('overview');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [availableTimes, setAvailableTimes] = useState([]);
    const [loadingAvailability, setLoadingAvailability] = useState(false);
    const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userEmail = localStorage.getItem('userEmail');
        
        if (token) {
          setIsLoggedIn(true);
          setCurrentUser({
            id: localStorage.getItem('userId'),
            email: userEmail
          });
        }
    }, []);
    
    useEffect(() => {
      const fetchRestaurantData = async () => {
        try {
          const response = await fetch(`${API_URL}/restaurant/${id}`);
          const data = await response.json();
          console.log("Restaurant data:", data);
          setRestaurant(data);
        } catch (error) {
          console.error('Error fetching restaurant:', error);
        }
      };
  
      fetchRestaurantData();
    }, [id]);

    const handleAddReview = (newReview) => {
        setRestaurant(prevRestaurant => ({
            ...prevRestaurant,
            reviews: [...(prevRestaurant.reviews || []), newReview],
            number_of_rating: (prevRestaurant.number_of_rating || 0) + 1
        }));
    };

    if (!restaurant) return <div>Loading...</div>;

    return (
        <div className="restaurant-page">
            <div className="restaurant-header">
                <img 
                    src={`${API_URL}/${restaurant.mainImage}`} 
                    alt={restaurant.res_name} 
                    className="main-image"
                />

                <div className="header-content">
                        <h1>{restaurant.res_name}</h1>
                        <div className="restaurant-info">
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
                            <div className="contact-info">
                                <p className="phone">{restaurant.phone_number}</p>
                                <p className="address">{restaurant.full_address}</p>
                                <p className="city">{restaurant.city}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <TableReservation 
                    restaurantId={id}
                    restaurantName={restaurant.res_name}
                />

            <div className="restaurant-nav">
                <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>Overview</button>
                <button className={activeTab === 'menu' ? 'active' : ''} onClick={() => setActiveTab('menu')}>Menu</button>
                <button className={activeTab === 'gallery' ? 'active' : ''} onClick={() => setActiveTab('gallery')}>Gallery</button>
                <button className={activeTab === 'reviews' ? 'active' : ''} onClick={() => setActiveTab('reviews')}>Reviews</button>
            </div>

            {activeTab === 'overview' && (
                <div className="overview-section">
                    <h2>About Us</h2>
                    <p className="description">{restaurant.description}</p>
                    <p className="full-description">{restaurant.full_description}</p>
                    
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
                        const categoryItems = restaurant.menu[0].menus.flatMap(menu => 
                            menu.items.filter(item => item.category === category)
                        );

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
    <RestaurantReviews 
        reviews={restaurant.reviews}
        restaurantId={id}
        isLoggedIn={isLoggedIn}
        currentUser={currentUser}
        onAddReview={handleAddReview}
    />
    )}

            {activeTab === 'gallery' && (
                <div className="gallery-section">
                    <h2>Gallery</h2>
                    <div className="gallery-grid">
                        {restaurant.all_images && restaurant.all_images.map((image, index) => (
                            <img 
                                key={index}
                                src={`${API_URL}/${image}`}
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