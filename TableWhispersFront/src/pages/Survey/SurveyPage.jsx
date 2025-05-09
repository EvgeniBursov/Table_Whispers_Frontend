import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './SurveyPage.css';
const API_URL = import.meta.env.VITE_BACKEND_API || 'http://localhost:5000';

// Star Rating Component
const StarRating = ({ rating, setRating, disabled = false }) => {
  const [hover, setHover] = useState(0);
  
  return (
    <div className="star-rating">
      {[...Array(5)].map((star, index) => {
        const ratingValue = index + 1;
        return (
          <label key={index}>
            <input
              type="radio"
              name="rating"
              value={ratingValue}
              onClick={() => !disabled && setRating(ratingValue)}
              disabled={disabled}
            />
            <span
              className={`star ${ratingValue <= (hover || rating) ? "filled" : ""} ${disabled ? "disabled" : ""}`}
              onMouseEnter={() => !disabled && setHover(ratingValue)}
              onMouseLeave={() => !disabled && setHover(0)}
            >
              ★
            </span>
          </label>
        );
      })}
    </div>
  );
};

const SurveyPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Rating states
  const [foodRating, setFoodRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [ambianceRating, setAmbianceRating] = useState(0);
  const [cleanlinessRating, setCleanlinessRating] = useState(0);
  const [overallRating, setOverallRating] = useState(0);
  
  // Get order_id from URL params
  const searchParams = new URLSearchParams(location.search);
  const order_id = searchParams.get('order');
  
  useEffect(() => {
    // Validate survey and fetch order details
    const validateSurvey = async () => {
      if (!order_id) {
        setError('Invalid survey link. Please check your email and try again.');
        setLoading(false);
        return;
      }
      
      try {
        const response = await fetch(`${API_URL}/validate-survey?order_id=${order_id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to validate survey');
        }
        
        setOrderDetails(data.orderDetails);
        setLoading(false);
      } catch (err) {
        console.error('Error validating survey:', err);
        setError('Unable to load survey. This survey may have expired or already been completed.');
        setLoading(false);
      }
    };
    
    validateSurvey();
  }, [order_id]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all ratings are selected
    if (foodRating === 0 || serviceRating === 0 || ambianceRating === 0 || 
        cleanlinessRating === 0 || overallRating === 0) {
      setError('Please rate all categories before submitting.');
      return;
    }
    
    setSubmitting(true);
    setError('');
    
    try {
      const response = await fetch(`${API_URL}/submit-survey`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id,
          ratings: {
            food: foodRating,
            service: serviceRating,
            ambiance: ambianceRating,
            cleanliness: cleanlinessRating,
            overall: overallRating
          }
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit survey');
      }
      
      setSuccess(true);
    } catch (err) {
      console.error('Error submitting survey:', err);
      setError(err.message || 'Failed to submit survey. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="survey-container loading">
        <div className="loader"></div>
        <p>Loading survey...</p>
      </div>
    );
  }
  
  if (error && !orderDetails) {
    return (
      <div className="survey-container error">
        <h2>⚠️ Error</h2>
        <p>{error}</p>
        <button 
          className="back-button"
          onClick={() => window.location.href = `${API_URL}/`}
        >
          Return to Homepage
        </button>
      </div>
    );
  }
  
  if (success) {
    return (
      <div className="survey-container success">
        <h2>🎉 Thank You!</h2>
        <p>Your feedback has been successfully submitted.</p>
        <p>We appreciate your input and look forward to serving you again!</p>
        <button 
          className="back-button"
          onClick={() => window.location.href = `${API_URL}/}
        >
          Return to Homepage
        </button>
      </div>
    );
  }
  
  return (
    <div className="survey-container">
      <div className="survey-header">
        <h1>Dining Experience Survey</h1>
        <p>Thank you for dining with us at <strong>{orderDetails?.restaurantName}</strong>.</p>
        <p>Please share your feedback to help us improve.</p>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit} className="survey-form">
        <div className="rating-section">
          <div className="rating-item">
            <label>Food Quality</label>
            <StarRating rating={foodRating} setRating={setFoodRating} disabled={submitting} />
          </div>
          
          <div className="rating-item">
            <label>Service Quality</label>
            <StarRating rating={serviceRating} setRating={setServiceRating} disabled={submitting} />
          </div>
          
          <div className="rating-item">
            <label>Ambiance</label>
            <StarRating rating={ambianceRating} setRating={setAmbianceRating} disabled={submitting} />
          </div>
          
          <div className="rating-item">
            <label>Cleanliness</label>
            <StarRating rating={cleanlinessRating} setRating={setCleanlinessRating} disabled={submitting} />
          </div>
          
          <div className="rating-item">
            <label>Overall Experience</label>
            <StarRating rating={overallRating} setRating={setOverallRating} disabled={submitting} />
          </div>
        </div>
        
        <button 
          type="submit" 
          className="submit-button"
          disabled={submitting}
        >
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
    </div>
  );
};

export default SurveyPage;