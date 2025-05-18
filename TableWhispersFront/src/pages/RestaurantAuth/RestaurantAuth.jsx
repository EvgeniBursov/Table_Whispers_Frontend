import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './RestaurantAuth.css';
const API_URL = import.meta.env.VITE_BACKEND_API || 'http://localhost:5000';

const RestaurantAuth = () => {
  const navigate = useNavigate();
  const [currState, setCurrState] = useState("Sign Up");
  const [formPart, setFormPart] = useState(1); // מעקב אחר חלק הטופס הנוכחי
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    age: '',
    email: '',
    password: '',
    confirm_password: '',
    phone_number: '',
    city: '',
    restaurant_name: '',
    username: '',
    user_type: 'Restaurant',
    acceptedTerms: false
  });

  const [showTOTP, setShowTOTP] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [tempUserData, setTempUserData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleClose = () => {
    navigate('/'); // ניווט חזרה לדף הבית
  };

  const handleNextPart = () => {
    // בדיקת תקינות לחלק הראשון לפני המעבר לחלק השני
    if (!formData.first_name || !formData.last_name || !formData.age || !formData.city || !formData.restaurant_name) {
      alert('Please fill all fields');
      return;
    }
    setFormPart(2);
  };

  const handlePrevPart = () => {
    setFormPart(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    if (currState === "Sign Up" && formData.password !== formData.confirm_password) {
      alert('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/${currState === "Sign Up" ? 'resRegister' : 'resLogin'}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        alert(data.error);
        setLoading(false);
        return;
      }
      
      const restaurantId = data.restaurant_id || data.user?.restaurant_id || data.connect?.restaurant_id;
      
      if (!restaurantId) {
        console.error("Restaurant ID not found in response:", data);
        alert("Could not retrieve restaurant ID. Please contact support.");
        setLoading(false);
        return;
      }
      
      // Store the data and restaurantId for after TOTP verification
      setTempUserData({...data, restaurantId});
      setShowTOTP(true);
      setLoading(false);

    } catch (error) {
      console.error("Error during login/signup:", error);
      alert('Could not connect to the server.');
      setLoading(false);
    }
  };

  const handleVerifyTOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/verifyTotpCode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          totp_code: verificationCode,
          user_type: 'Restaurant'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error);
        setLoading(false);
        return;
      }

      // Store token in localStorage if needed
      if (data.token) {
        localStorage.setItem("restaurantToken", data.token);
        try {
          const base64Url = data.token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(window.atob(base64));
          localStorage.setItem("restaurantEmail", payload.email);
        } catch (error) {
          console.error("[AUTH] Error extracting email from token:", error);
        }
      }
      
      // Navigate to the dashboard using the previously stored restaurant ID
      const restaurantId = data.restaurant_id || tempUserData?.restaurantId;
      
      if (restaurantId) {
        navigate(`/restaurant/login/${restaurantId}`);
      } else {
        console.error("Failed to get restaurant ID after verification", data);
        alert("Verification successful but couldn't load your dashboard. Please try logging in again.");
      }
      
    } catch (error) {
      console.error("Error during TOTP verification:", error);
      alert('Failed to verify code.');
      setLoading(false);
    }
  };

  const renderFormPart1 = () => {
    return (
      <>
        <input
          type="text"
          name="first_name"
          placeholder="First Name"
          value={formData.first_name}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="last_name"
          placeholder="Last Name"
          value={formData.last_name}
          onChange={handleChange}
          required
        />
        <input
          type="number"
          name="age"
          placeholder="Age"
          value={formData.age}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="city"
          placeholder="City"
          value={formData.city}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="restaurant_name"
          placeholder="Restaurant Name"
          value={formData.restaurant_name}
          onChange={handleChange}
          required
        />
        <button type="button" onClick={handleNextPart} className="modern-button next-button">
          Next
        </button>
      </>
    );
  };

  const renderFormPart2 = () => {
    return (
      <>
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <input
          type="tel"
          name="phone_number"
          placeholder="Phone Number"
          value={formData.phone_number}
          onChange={handleChange}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
        />
        <input
          type="password"
          name="confirm_password"
          placeholder="Confirm Password"
          value={formData.confirm_password}
          onChange={handleChange}
          required
        />
        <label className="terms-label">
          <input
            type="checkbox"
            name="acceptedTerms"
            checked={formData.acceptedTerms}
            onChange={handleChange}
            required
          />
          <span>I accept the terms and conditions</span>
        </label>
        <div className="form-buttons">
          <button type="button" onClick={handlePrevPart} className="modern-button back-button">
            Back
          </button>
          <button type="submit" disabled={loading} className="modern-button submit-button">
            {loading ? 'Processing...' : "Create Account"}
          </button>
        </div>
      </>
    );
  };

  const renderContent = () => {
    if (showTOTP) {
      return (
        <div className="totp-verification">
          <h3>Enter Verification Code</h3>
          <p>A verification code has been sent to your email</p>
          <input
            type="text"
            placeholder="Enter verification code"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
          />
          <button onClick={handleVerifyTOTP} disabled={loading} className="modern-button">
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>
        </div>
      );
    }

    if (currState === "Sign Up") {
      return (
        <form onSubmit={handleSubmit}>
          {formPart === 1 ? renderFormPart1() : renderFormPart2()}
        </form>
      );
    } else {
      return (
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            required
          />
          <input
            type="tel"
            name="phone_number"
            placeholder="Phone Number"
            value={formData.phone_number}
            onChange={handleChange}
            required
          />
          <button type="submit" disabled={loading} className="modern-button">
            {loading ? 'Processing...' : "Login"}
          </button>
        </form>
      );
    }
  };

  return (
    <div className="login-popup">
      <div className="login-popup-container">
        <div className="login-popup-header">
          <h2>{showTOTP ? 'Verify Account' : currState}</h2>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>
        
        {renderContent()}

        {!showTOTP && (
          <div className="login-popup-footer">
            <p>
              {currState === "Login" ? "Don't have an account? " : "Already have an account? "}
              <span onClick={() => {setCurrState(currState === "Login" ? "Sign Up" : "Login"); setFormPart(1);}}>
                {currState === "Login" ? "Sign Up" : "Login"}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantAuth;