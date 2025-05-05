import React, { useState } from 'react';
import './RestaurantAuth.css';

const RestaurantAuth = () => {
  const [currState, setCurrState] = useState("Sign Up");
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

  // מצבים לאימות TOTP
  const [showTOTP, setShowTOTP] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [tempUserData, setTempUserData] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (currState === "Sign Up" && formData.password !== formData.confirm_password) {
      alert('Passwords do not match.');
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/${currState === "Sign Up" ? 'resRegister' : 'resLogin'}`,
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
        return;
      }
      setTempUserData(data);
      setShowTOTP(true);

    } catch (error) {
      alert('Could not connect to the server.');
    }
  };

  const handleVerifyTOTP = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('http://localhost:5000/verifyTotpCode', {
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
        return;
      }

      // אם האימות הצליח
      localStorage.setItem("restaurantToken", data.token);
      try {
        const base64Url = data.token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(window.atob(base64));
        localStorage.setItem("restaurantEmail", payload.email);
      } catch (error) {
        console.error("[AUTH] Error extracting email from token:", error);
      }

      // ניווט לדף הרצוי
      window.location.href = '/restaurant/dashboard';
      
    } catch (error) {
      alert('Failed to verify code.');
    }
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
          <button onClick={handleVerifyTOTP}>Verify Code</button>
        </div>
      );
    }

    return (
      <form onSubmit={handleSubmit}>
        {currState === "Sign Up" && (
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
          </>
        )}
        
        <input
          type="text"
          name="username"
          placeholder="Username"
          value={formData.username}
          onChange={handleChange}
          required
        />
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
        {currState === "Sign Up" && (
          <>
            <input
              type="password"
              name="confirm_password"
              placeholder="Confirm Password"
              value={formData.confirm_password}
              onChange={handleChange}
              required
            />
            <label>
              <input
                type="checkbox"
                name="acceptedTerms"
                checked={formData.acceptedTerms}
                onChange={handleChange}
                required
              />
              I accept the terms and conditions
            </label>
          </>
        )}
        <button type="submit">
          {currState === "Sign Up" ? "Create Account" : "Login"}
        </button>
      </form>
    );
  };

  return (
    <div className="login-popup">
      <div className="login-popup-container">
        <div className="login-popup-title">
          <h2>{showTOTP ? 'Verify Account' : currState}</h2>
        </div>
        
        {renderContent()}

        {!showTOTP && (
          <div className="login-popup-footer">
            <p>
              {currState === "Login" ? "Don't have an account? " : "Already have an account? "}
              <span onClick={() => setCurrState(currState === "Login" ? "Sign Up" : "Login")}>
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