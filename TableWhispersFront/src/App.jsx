import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, useLocation, useParams } from 'react-router-dom'
import Navbar from './components/Navbar/Navbar'
import LoginPopUp from './components/LoginPopUp/loginPopUp'
import ClientProfile from './pages/ClientProfile/profile'
import RestaurantAuth from './pages/RestaurantAuth/RestaurantAuth'
import HomePage from './pages/HomePage/HomePage'
import RestaurantPage from './pages/RestaurantPage/RestaurantPage'
import RestaurantManagementDashboard from './pages/RestaurantManagementDashboard/RestaurantManagementDashboard'
import SurveyPage from './pages/Survey/SurveyPage'

const RestaurantDashboardWrapper = () => {
  const { restaurantId } = useParams();
  return <RestaurantManagementDashboard restaurantId={restaurantId} />;
};

const AppContent = () => {
  const [showLogin, setShowLogin] = useState(false)
  const location = useLocation()
  
  // Hide navbar only on restaurant dashboard page
  const hideNavbar = location.pathname.includes('/restaurant/login')
  
  return (
    <>
      {showLogin && <LoginPopUp setShowLogin={setShowLogin} />}
      <div className='app'>
        {!hideNavbar && <Navbar setShowLogin={setShowLogin} />}
        <Routes>
          <Route path="/profile" element={<ClientProfile />} />
          <Route path="/restaurant/login/:restaurantId" element={<RestaurantDashboardWrapper />} />
          <Route path="/HomePage" element={<HomePage />} />
          <Route path="/" element={<HomePage />} />
          <Route path="/restaurant/:id" element={<RestaurantPage />} />
          <Route path="/restaurant/auth/" element={<RestaurantAuth />} /> 
          <Route path="/survey" element={<SurveyPage />} />
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