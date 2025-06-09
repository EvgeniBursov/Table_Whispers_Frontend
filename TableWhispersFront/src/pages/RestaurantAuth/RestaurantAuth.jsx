import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './RestaurantAuth.css';

const API_URL = import.meta.env.VITE_BACKEND_API || 'http://localhost:5000';

const RestaurantAuth = () => {
  const navigate = useNavigate();
  const [currState, setCurrState] = useState("Sign Up");
  const [formPart, setFormPart] = useState(1); 
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

  // Reset password states
  const [resetState, setResetState] = useState('email');
  const [resetEmail, setResetEmail] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [resetVerificationCode, setResetVerificationCode] = useState('');
  const [verifiedCode, setVerifiedCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  // Username recovery states
  const [usernameRecoveryEmail, setUsernameRecoveryEmail] = useState('');
  const [usernameRecoveryCode, setUsernameRecoveryCode] = useState('');
  const [usernameRecoveryState, setUsernameRecoveryState] = useState('email'); // 'email', 'code', 'complete'

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleClose = () => {
    navigate('/'); 
  };

  const handleNextPart = () => {
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

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      let url, payload;
      
      switch(resetState) {
        case 'email':
          if (!resetEmail) {
            alert('Please enter your email');
            setLoading(false);
            return;
          }
          url = `${API_URL}/sendTotpCode`;
          payload = { email: resetEmail, user_type: 'Restaurant' };
          break;

        case 'code':
          if (!verifiedEmail) {
            alert('Please complete email verification first');
            setResetState('email');
            setLoading(false);
            return;
          }
          url = `${API_URL}/verifyTotpCode`;
          payload = { 
            email: verifiedEmail,
            user_type: 'Restaurant',
            totp_code: resetVerificationCode 
          };
          break;

        case 'newPassword':
          if (!verifiedEmail || !verifiedCode) {
            alert('Please complete the verification process');
            setResetState('email');
            setLoading(false);
            return;
          }
          if (newPassword !== confirmNewPassword) {
            alert('Passwords do not match');
            setLoading(false);
            return;
          }
          url = `${API_URL}/changeResPassword`;
          payload = { 
            email: verifiedEmail,
            password: newPassword,
            confirm_password: confirmNewPassword
          };
          break;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);

      // Handle successful response based on current state
      switch(resetState) {
        case 'email':
          setVerifiedEmail(resetEmail);  // Save verified email
          setResetState('code');
          alert('Verification code sent to your email');
          break;

        case 'code':
          setVerifiedCode(resetVerificationCode);  // Save verified code
          setResetState('newPassword');
          alert('Code verified successfully');
          break;

        case 'newPassword':
          alert('Password reset successfully!');
          // Reset all states
          resetAllPasswordStates();
          setCurrState('Login');
          break;
      }
    } catch (error) {
      // Handle specific errors
      if (error.message.includes('not found')) {
        alert('Email not found');
        setResetState('email');
      } else if (error.message.includes('invalid code')) {
        alert('Invalid verification code');
        setResetVerificationCode('');
      } else {
        alert(error.message || 'An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameRecovery = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let url, payload;

      switch(usernameRecoveryState) {
        case 'email':
          if (!usernameRecoveryEmail) {
            alert('Please enter your email');
            setLoading(false);
            return;
          }
          url = `${API_URL}/sendTotpCode`;
          payload = { email: usernameRecoveryEmail, user_type: 'Restaurant' };
          break;

        case 'code':
          if (!usernameRecoveryCode) {
            alert('Please enter the verification code');
            setLoading(false);
            return;
          }
          url = `${API_URL}/verifyTotpCode`;
          payload = { 
            email: usernameRecoveryEmail,
            user_type: 'Restaurant',
            totp_code: usernameRecoveryCode 
          };
          break;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);

      switch(usernameRecoveryState) {
        case 'email':
          setUsernameRecoveryState('code');
          alert('Verification code sent to your email');
          break;

        case 'code':
          // After successful verification, send the username
          await sendUsername();
          break;
      }
    } catch (error) {
      if (error.message.includes('not found')) {
        alert('Email not found');
        setUsernameRecoveryState('email');
      } else if (error.message.includes('invalid code')) {
        alert('Invalid verification code');
        setUsernameRecoveryCode('');
      } else {
        alert(error.message || 'An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const sendUsername = async () => {
    try {
      const response = await fetch(`${API_URL}/sendUserName`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: usernameRecoveryEmail })
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);

      setUsernameRecoveryState('complete');
      alert('Username has been sent to your email!');
      
      // Reset states after a delay
      setTimeout(() => {
        resetAllUsernameStates();
        setCurrState('Login');
      }, 3000);
      
    } catch (error) {
      alert(error.message || 'Failed to send username');
    }
  };

  const resetAllPasswordStates = () => {
    setVerifiedEmail('');
    setVerifiedCode('');
    setResetEmail('');
    setResetVerificationCode('');
    setNewPassword('');
    setConfirmNewPassword('');
    setResetState('email');
  };

  const resetAllUsernameStates = () => {
    setUsernameRecoveryEmail('');
    setUsernameRecoveryCode('');
    setUsernameRecoveryState('email');
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

    if (currState === "Forgot Password") {
      switch(resetState) {
        case 'email':
          return (
            <>
              <input
                type="email"
                placeholder="Your Email Address"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
              <button onClick={handleResetPassword} disabled={loading} className="modern-button">
                {loading ? 'Sending...' : 'Send Reset Code'}
              </button>
            </>
          );
        case 'code':
          return (
            <>
              <p className="verified-email">Email: {verifiedEmail}</p>
              <input
                type="text"
                placeholder="Enter verification code"
                value={resetVerificationCode}
                onChange={(e) => setResetVerificationCode(e.target.value)}
              />
              <button onClick={handleResetPassword} disabled={loading} className="modern-button">
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
            </>
          );
        case 'newPassword':
          return (
            <>
              <p className="verified-email">Email: {verifiedEmail}</p>
              <input
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <input
                type="password"
                placeholder="Confirm New Password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
              />
              <button onClick={handleResetPassword} disabled={loading} className="modern-button">
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </>
          );
      }
    }

    if (currState === "Username Recovery") {
      switch(usernameRecoveryState) {
        case 'email':
          return (
            <>
              <p>Enter your email to recover your username</p>
              <input
                type="email"
                placeholder="Your Email Address"
                value={usernameRecoveryEmail}
                onChange={(e) => setUsernameRecoveryEmail(e.target.value)}
              />
              <button onClick={handleUsernameRecovery} disabled={loading} className="modern-button">
                {loading ? 'Sending...' : 'Send Verification Code'}
              </button>
            </>
          );
        case 'code':
          return (
            <>
              <p className="verified-email">Email: {usernameRecoveryEmail}</p>
              <p>Enter the verification code sent to your email</p>
              <input
                type="text"
                placeholder="Enter verification code"
                value={usernameRecoveryCode}
                onChange={(e) => setUsernameRecoveryCode(e.target.value)}
              />
              <button onClick={handleUsernameRecovery} disabled={loading} className="modern-button">
                {loading ? 'Verifying...' : 'Verify & Send Username'}
              </button>
            </>
          );
        case 'complete':
          return (
            <>
              <p className="success-message">✅ Username sent to your email!</p>
              <p>Check your email for your username.</p>
            </>
          );
      }
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
            {currState === "Login" ? (
              <>
                <p onClick={() => {
                  setCurrState("Forgot Password");
                  resetAllPasswordStates();
                }}>Forgot Password?</p>
                <p onClick={() => {
                  setCurrState("Username Recovery");
                  resetAllUsernameStates();
                }}>Forgot Username?</p>
                <p>
                  Don't have an account?{' '}
                  <span onClick={() => {setCurrState("Sign Up"); setFormPart(1);}}>
                    Sign Up
                  </span>
                </p>
              </>
            ) : currState === "Sign Up" ? (
              <p>
                Already have an account?{' '}
                <span onClick={() => {setCurrState("Login"); setFormPart(1);}}>
                  Login
                </span>
              </p>
            ) : currState === "Forgot Password" ? (
              <p>
                <span onClick={() => {
                  setCurrState("Login");
                  resetAllPasswordStates();
                }}>Back to Login</span>
              </p>
            ) : currState === "Username Recovery" ? (
              <p>
                <span onClick={() => {
                  setCurrState("Login");
                  resetAllUsernameStates();
                }}>Back to Login</span>
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantAuth;