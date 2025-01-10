import React, { useState } from 'react';
import './loginPopUp.css';
import { assets } from '../../assets/assets';

const LoginPopUp = ({ setShowLogin }) => {
  const [currState, setCurrState] = useState("Sign Up");
  const [first_name, setFirstName] = useState('');
  const [last_name, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm_password, setConfirmPassword] = useState('');
  const [phone_number, setPhoneNumber] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false); 

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (currState === "Sign Up" && password !== confirm_password) {
      window.alert('Passwords do not match.');
      return;
    }

    const payload = {
      first_name,
      last_name,
      age,
      email,
      phone_number,
      password,
      confirm_password
    };

    try {
      const response = await fetch(
        currState === "Sign Up"
          ? 'http://localhost:5000/clientRegister'
          : 'http://localhost:5000/clientLogin',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );
      const result = await response.json();
      console.log(result);

      if (!response.ok) {
        window.alert(result.error);
        return;
      }
      window.alert(currState === "Sign Up" ? 'Registration successful!' : 'Login successful!');
      localStorage.setItem("token",result.token)
      setShowLogin(false)
    } catch (error) {
      window.alert('Could not connect to the server.');
    }
  };

  return (
    <div className='login-popup'>
      <form onSubmit={handleSubmit} className="login-popup-container">
        <div className="login-popup-title">
          <h2>{currState}</h2>
          <img onClick={() => setShowLogin(false)} src={assets.x_icon} alt="" />
        </div>
        <div className="login-popup-inputs">
          {currState === "Sign Up" && (
            <>
              <input
                type="text"
                placeholder="First Name"
                value={first_name}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Last Name"
                value={last_name}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
              <input
                type="number"
                placeholder="Age"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Phone Number"
                value={phone_number}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
            </>
          )}
          <input
            type="email"
            placeholder="Your Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Your Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {currState === "Sign Up" && (
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirm_password}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          )}
            {currState === "Sign Up" && (
            <div className="terms-checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={() => setAcceptedTerms(!acceptedTerms)}
                />
                I accept the <a href="/terms" target="_blank" rel="noopener noreferrer">terms and conditions</a>
              </label>
            </div>
          )}
        </div>
        <button type='submit'>{currState === "Sign Up" ? "Create Account" : "Login"}</button>
        <div className="login-popup-toggle">
          <p>
            {currState === "Sign Up"
              ? "Already have an account?"
              : "Don't have an account?"}
          </p>
          <span onClick={() => setCurrState(currState === "Sign Up" ? "Login" : "Sign Up")}>
            {currState === "Sign Up" ? "Login" : "Sign Up"}
          </span>
        </div>
      </form>
    </div>
  );
};

export default LoginPopUp;
