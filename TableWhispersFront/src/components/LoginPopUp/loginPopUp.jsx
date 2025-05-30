import React, { useState, useEffect } from 'react';
import './loginPopUp.css';
import { assets } from '../../assets/assets';

const API_URL = import.meta.env.VITE_BACKEND_API || 'http://localhost:5000';

const LoginPopUp = ({ setShowLogin }) => {
  const [currState, setCurrState] = useState("Sign Up");
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    age: '',
    email: '',
    password: '',
    confirm_password: '',
    phone_number: '',
    user_type: "",
    acceptedTerms: false
  });

  // Reset password states
  const [resetState, setResetState] = useState('email');
  const [resetEmail, setResetEmail] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verifiedCode, setVerifiedCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  // Google Sign-In state
  const [isGoogleScriptLoaded, setIsGoogleScriptLoaded] = useState(false);
  const [isProcessingGoogle, setIsProcessingGoogle] = useState(false);

  // Load Google Sign-In script
  useEffect(() => {
    // Only load the script if it's not already in the document
    if (!document.querySelector('script#google-client')) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.id = 'google-client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setIsGoogleScriptLoaded(true);
      };
      document.body.appendChild(script);

      return () => {
        // Clean up the script when component unmounts
        if (document.querySelector('script#google-client')) {
          document.body.removeChild(script);
        }
      };
    } else {
      setIsGoogleScriptLoaded(true);
    }
  }, []);

  // Initialize Google Sign-In once script is loaded
  useEffect(() => {
    if (isGoogleScriptLoaded && window.google) {
      const CLIENT_ID = import.meta.env.VITE_GOOGLE_AUTH;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleGoogleResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
        locale: 'en'
      });
      
      // Render the button
      window.google.accounts.id.renderButton(
        document.getElementById('google-signin-button'),
        {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          width: 280,
          locale: 'en',
        }
      );
    }
  }, [isGoogleScriptLoaded]);

  const handleGoogleResponse = async (response) => {
    if (response.credential) {
      setIsProcessingGoogle(true);
      try {
        // Send the ID token to your backend
        const backendResponse = await fetch(`${API_URL}/google_auth`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: response.credential,
            user_type: 'Client'
          }),
        });

        const data = await backendResponse.json();

        if (!backendResponse.ok) {
          throw new Error(data.error || 'Google authentication failed');
        }

        // Handle successful authentication
        localStorage.setItem("token", data.token);
        
        try {
          const base64Url = data.token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(window.atob(base64));
          console.log("[AUTH] User logged in with Google:", payload.email);
          localStorage.setItem("userEmail", payload.email);
        } catch (error) {
          console.error("[AUTH] Error extracting email from token:", error);
        }

        alert('Login with Google successful!');
        setShowLogin(false);
      } catch (error) {
        console.error('Google authentication error:', error);
        alert(error.message || 'Failed to authenticate with Google');
      } finally {
        setIsProcessingGoogle(false);
      }
    }
  };

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
        currState === "Sign Up"
          ? `${API_URL}/clientRegister`
          : `${API_URL}/clientLogin`,
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

      alert(currState === "Sign Up" ? 'Registration successful!' : 'Login successful!');
      localStorage.setItem("token", data.token);
      try {
        const base64Url = data.token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(window.atob(base64));
        console.log("[AUTH] User logged in:", payload.email);
       const email1 = payload.email || payload.user_email || payload.username || payload.sub || formData.email;

        localStorage.setItem("userEmail", email1);
      } catch (error) {
        console.error("[AUTH] Error extracting email from token:", error);
      }


      setShowLogin(false);
    } catch (error) {
      alert('Could not connect to the server.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      let url, payload;
      
      switch(resetState) {
        case 'email':
          if (!resetEmail) {
            alert('Please enter your email');
            return;
          }
          url = `${API_URL}/sendTotpCode`;
          payload = { email: resetEmail ,user_type:'Client'};
          break;

        case 'code':
          if (!verifiedEmail) {
            alert('Please complete email verification first');
            setResetState('email');
            return;
          }
          url = `${API_URL}/verifyTotpCode`;
          payload = { 
            email: verifiedEmail,
            user_type:'Client',
            totp_code: verificationCode 
          };
          break;

        case 'newPassword':
          if (!verifiedEmail || !verifiedCode) {
            alert('Please complete the verification process');
            setResetState('email');
            return;
          }
          if (newPassword !== confirmNewPassword) {
            alert('Passwords do not match');
            return;
          }
          url = `${API_URL}/resetClientPassword`;
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
          setVerifiedCode(verificationCode);  // Save verified code
          setResetState('newPassword');
          alert('Code verified successfully');
          break;

        case 'newPassword':
          alert('Password reset successfully!');
          // Reset all states
          setVerifiedEmail('');
          setVerifiedCode('');
          setResetEmail('');
          setVerificationCode('');
          setNewPassword('');
          setConfirmNewPassword('');
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
        setVerificationCode('');
      } else {
        alert(error.message || 'An error occurred');
      }
    }
  };

  const renderContent = () => {
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
              <button onClick={handleResetPassword}>Send Reset Code</button>
            </>
          );
        case 'code':
          return (
            <>
              <p className="verified-email">Email: {verifiedEmail}</p>
              <input
                type="text"
                placeholder="Enter verification code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
              />
              <button onClick={handleResetPassword}>Verify Code</button>
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
              <button onClick={handleResetPassword}>Reset Password</button>
            </>
          );
      }
    }

    return (
      <>
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
                name="phone_number"
                placeholder="Phone Number"
                value={formData.phone_number}
                onChange={handleChange}
                required
              />
            </>
          )}
          <input
            type="email"
            name="email"
            placeholder="Your Email Address"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Your Password"
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

        {/* Divider with "OR" text */}
        <div className="login-divider">
          <span>OR</span>
        </div>

        {/* Google Sign-In Button */}
        <div className="google-signin-container">
          {isProcessingGoogle ? (
            <div className="google-processing">
              <div className="loader"></div>
              <p>Processing...</p>
            </div>
          ) : (
            <div id="google-signin-button"></div>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="login-popup">
      <div className="login-popup-container">
        <div className="login-popup-title">
          <h2>{currState}</h2>
          <img 
            onClick={() => setShowLogin(false)} 
            src={assets.x_icon} 
            alt="close"
          />
        </div>
        
        {renderContent()}

        <div className="login-popup-footer">
          {currState === "Login" ? (
            <>
              <p onClick={() => {
                setCurrState("Forgot Password");
                setResetState('email');
                // Reset all states when starting password reset
                setVerifiedEmail('');
                setVerifiedCode('');
                setResetEmail('');
                setVerificationCode('');
                setNewPassword('');
                setConfirmNewPassword('');
              }}>Forgot Password?</p>
              <p>
                Don't have an account?{' '}
                <span onClick={() => setCurrState("Sign Up")}>Sign Up</span>
              </p>
            </>
          ) : currState === "Sign Up" ? (
            <p>
              Already have an account?{' '}
              <span onClick={() => setCurrState("Login")}>Login</span>
            </p>
          ) : (
            <p>
              <span onClick={() => {
                setCurrState("Login");
                // Reset all states when going back to login
                setVerifiedEmail('');
                setVerifiedCode('');
                setResetEmail('');
                setVerificationCode('');
                setNewPassword('');
                setConfirmNewPassword('');
              }}>Back to Login</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPopUp;