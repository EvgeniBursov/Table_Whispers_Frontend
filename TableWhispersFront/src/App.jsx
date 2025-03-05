import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar/Navbar'
import LoginPopUp from './components/LoginPopUp/loginPopUp'
import ClientProfile from './pages/ClientProfile/profile'
import RestaurantAuth from './pages/RestaurantAuth/RestaurantAuth'
import HomePage from './pages/HomePage/HomePage'
import RestaurantPage from './pages/RestaurantPage/RestaurantPage'
import RestaurantDashboard from './pages/RestaurantManagementDashboard/RestaurantManagementDashboard'

// Wrapper component to use useLocation
const AppContent = () => {
  const [showLogin, setShowLogin] = useState(false)
  const location = useLocation()
  
  // Hide navbar only on restaurant dashboard page
  const hideNavbar = location.pathname === '/restaurant/login'
  
  return (
    <>
      {showLogin && <LoginPopUp setShowLogin={setShowLogin} />}
      <div className='app'>
        {!hideNavbar && <Navbar setShowLogin={setShowLogin} />}
        <Routes>
          <Route path="/profile" element={<ClientProfile />} />
          <Route path="/restaurant/login" element={<RestaurantDashboard />} />
          <Route path="/HomePage" element={<HomePage />} />
          <Route path="/" element={<HomePage />} />
          <Route path="/restaurant/:id" element={<RestaurantPage />} /> 
        </Routes>
      </div>
    </>
  )
}

const App = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App