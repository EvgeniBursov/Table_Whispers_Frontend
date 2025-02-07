import React, { useState } from 'react';
import './RestaurantAuth.css';

const RestaurantAuth = () => {
  const [currState, setCurrState] = useState('Login');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    phone_number: '',
    first_name: '',
    last_name: '',
    age: '',
    confirm_password: '',
    city: '',
    restaurant_name: '',
    acceptedTerms: false
  });

  // TOTP Verification States
  const [verificationStage, setVerificationStage] = useState('credentials');
  const [totpCode, setTotpCode] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmitCredentials = async (e) => {
    e.preventDefault();
    
    // Validate form data (add your specific validations)
    if (currState === "Sign Up" && formData.password !== formData.confirm_password) {
      alert('Passwords do not match.');
      return;
    }

    try {
      const endpoint = currState === "Sign Up" 
        ? 'http://localhost:7000/resRegister'  // Modified endpoint for initial registration request
        : 'http://localhost:7000/resLogin';    // Modified endpoint for login request

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'An error occurred');
        return;
      }

      // Save the email for verification
      setVerificationEmail(formData.email);
      
      // Move to verification stage
      setVerificationStage('verify');
    } catch (error) {
      alert('Could not connect to the server: ' + error.message);
    }
  };

  const handleVerifyTOTP = async (e) => {
    e.preventDefault();

    try {
      const endpoint = currState === "Sign Up" 
        ? 'http://localhost:5000/verifyTotpCode'  // Verify registration TOTP
        : 'http://localhost:5000/verifyTotpCode';    // Verify login TOTP

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: verificationEmail,
          totp_code: totpCode
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Verification failed');
        return;
      }

      // Successful verification
      if (currState === "Sign Up") {
        alert('Registration successful!');
        setCurrState('Login');
      } else {
        // Store token and redirect
        localStorage.setItem('restaurantToken', data.token);
        window.location.href = '/restaurant/dashboard';
      }
    } catch (error) {
      alert('Could not verify TOTP: ' + error.message);
    }
  };

  const renderContent = () => {
    // Verification stage
    if (verificationStage === 'verify') {
      return (
        <div className="verification-container">
          <h3>Enter Verification Code</h3>
          <p>A 6-digit code has been sent to {verificationEmail}</p>
          <form onSubmit={handleVerifyTOTP}>
            <input
              type="text"
              placeholder="Enter 6-digit code"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              maxLength="6"
              required
            />
            <button type="submit">Verify</button>
          </form>
          <p 
            className="resend-code"
            onClick={() => {
              // Implement resend logic if needed
              alert('Resend functionality to be implemented');
            }}
          >
            Didn't receive code? Resend
          </p>
        </div>
      );
    }

    // Credentials stage
    return (
      <form onSubmit={handleSubmitCredentials}>
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
              name="restaurant_name"
              placeholder="Restaurant Name"
              value={formData.restaurant_name}
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
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
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
          {currState === "Sign Up" ? "Request Registration" : "Request Login"}
        </button>
      </form>
    );
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{currState}</h2>
        
        {renderContent()}

        <div className="auth-footer">
          {verificationStage === 'credentials' && (
            <p className="auth-toggle">
              {currState === "Login" ? (
                <>
                  Don't have an account?{' '}
                  <span onClick={() => {
                    setCurrState("Sign Up");
                    setVerificationStage('credentials');
                  }}>
                    Sign Up
                  </span>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <span onClick={() => {
                    setCurrState("Login");
                    setVerificationStage('credentials');
                  }}>
                    Login
                  </span>
                </>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RestaurantAuth;