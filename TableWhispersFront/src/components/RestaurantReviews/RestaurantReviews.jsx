import React, { useState } from 'react';
import './RestaurantReviews.css';
const API_URL = import.meta.env.VITE_BACKEND_API || 'http://localhost:5000';

const RestaurantReviews = ({ reviews: initialReviews, restaurantId, isLoggedIn, currentUser, onAddReview }) => {
  const [reviews, setReviews] = useState(initialReviews || []);
  const [sortOrder, setSortOrder] = useState('newest');
  const [newReview, setNewReview] = useState({ 
    rating: 5, 
    comment: '' 
  });
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const sortedReviews = [...reviews].sort((a, b) => {
    if (sortOrder === 'newest') {
      return new Date(b.created_at) - new Date(a.created_at);
    } else {
      return new Date(a.created_at) - new Date(b.created_at);
    }
  });

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    
    if (!isLoggedIn) {
      setAlertMessage('Please login to write a review');
      setShowAlert(true);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/add_New_Reviews/restaurant/${restaurantId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurant_Id: restaurantId,
          rating: newReview.rating,
          review: newReview.comment,
          user_email: localStorage.getItem('userEmail'),
        }),
      });

      if (!response.ok) throw new Error('Failed to submit review');

      const submittedReview = await response.json();
      console.log('Server response:', submittedReview);
      
      if (submittedReview.success && submittedReview.review) {
        setReviews([...reviews, submittedReview.review]);
        
        if (onAddReview) {
          onAddReview(submittedReview.review);
        }
        
        setNewReview({ rating: 5, comment: '' });
        setAlertMessage('Review submitted successfully!');
        setShowAlert(true);
        
        setTimeout(() => {
          setShowAlert(false);
        }, 3000);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      setAlertMessage('Error submitting review. Please try again.');
      setShowAlert(true);
    }
  };

  return (
    <div className="reviews-section">
      {showAlert && (
        <div className="alert-message">
          <p>{alertMessage}</p>
          <button onClick={() => setShowAlert(false)} className="close-button">×</button>
        </div>
      )}

      <div className="reviews-header">
        <h2>Customer Reviews</h2>
        <select 
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="sort-select"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      <div className="review-form-container">
        {isLoggedIn ? (
          <form onSubmit={handleSubmitReview} className="review-form">
            <h3>Write a Review</h3>
            
            <div className="form-group rating-section">
              <label>Rating</label>
              <div className="star-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewReview({ ...newReview, rating: star })}
                    className={`star-button ${star <= newReview.rating ? 'active' : ''}`}
                  >
                    {star <= newReview.rating ? '★' : '☆'}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group comment-section">
              <label>Comment</label>
              <textarea
                value={newReview.comment}
                onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                placeholder="Share your experience..."
                required
              />
            </div>

            <button type="submit" className="submit-button">
              Submit Review
            </button>
          </form>
        ) : (
          <div className="login-prompt">
            Please login to write a review
          </div>
        )}
      </div>

      <div className="reviews-container">
        {sortedReviews.length > 0 ? (
          sortedReviews.map((review) => (
            <div key={review._id} className="review-card">
              <div className="review-header">
                <div className="review-user-info">
                  <h4>{review.user ? `${review.user.first_name} ${review.user.last_name}` : 'Anonymous User'}</h4>
                  <div className="review-rating">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className={star <= review.rating ? 'star-filled' : 'star-empty'}>
                        {star <= review.rating ? '★' : '☆'}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="review-date">
                  {new Date(review.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="review-comment">{review.comment || review.review}</p>
            </div>
          ))
        ) : (
          <div className="no-reviews">
            No reviews yet. Be the first to review!
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantReviews;