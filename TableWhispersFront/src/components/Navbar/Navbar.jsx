import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Navbar.css';
import { assets } from '../../assets/assets';

const Navbar = ({ setShowLogin }) => {
  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Detect mobile size
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const closeMenu = (e) => {
      if (isMenuOpen && !e.target.closest('.navbar-user-menu') && !e.target.closest('.menu-toggle')) {
        setIsMenuOpen(false);
      }
    };
    
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, [isMenuOpen]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    navigate('/');
    window.location.reload();
  };

  const goToProfile = () => {
    if (token) {
      navigate('/profile');
      setIsMenuOpen(false);
    }
  };

  return (
    <nav className="navbar">
      {/* Logo */}
      <div className="navbar-logo" onClick={() => navigate("/HomePage")}>
        <img src={assets.logo} alt="Table Whispers" />
      </div>

      {/* Mobile hamburger button */}
      <div 
        className={`menu-toggle ${isMenuOpen ? 'open' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          setIsMenuOpen(!isMenuOpen);
        }}
      >
        <span></span>
        <span></span>
        <span></span>
      </div>

      {/* Menu items (desktop + mobile) */}
      <div className={`navbar-menu ${isMenuOpen ? 'open' : ''}`}>
        <div 
          className={`navbar-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => {
            navigate("/HomePage");
            setActiveTab('home');
            setIsMenuOpen(false);
          }}
        >
          Home Page
        </div>
        {/* Restaurant link - hidden on mobile */}
        {!isMobile && (
          <div 
            className="navbar-item"
            onClick={() => {
              navigate('/restaurant/auth/');
              setActiveTab('restaurant');
              setIsMenuOpen(false);
            }}
          >
            Restaurant
          </div>
        )}
        
        {/* Auth section */}
        {!token ? (
          <button 
            className="navbar-signup" 
            onClick={() => {
              setShowLogin(true);
              setIsMenuOpen(false);
            }}
          >
            Sign Up
          </button>
        ) : (
          <div className="navbar-user-menu">
            <div 
              className="user-icon"
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(!isMenuOpen);
              }}
            >
              <span>{localStorage.getItem("userEmail")?.charAt(0)?.toUpperCase() || 'U'}</span>
            </div>
            <div className={`user-dropdown ${isMenuOpen ? 'open' : ''}`}>
              <div className="dropdown-item" onClick={goToProfile}>
                <div className="icon profile-icon"></div>
                <span>My Profile</span>
              </div>
              <div className="dropdown-item" onClick={logout}>
                <div className="icon logout-icon"></div>
                <span>Logout</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;