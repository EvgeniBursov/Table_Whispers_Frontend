import React, { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar/Navbar'
import LoginPopUp from './components/LoginPopUp/loginPopUp'
import ClientProfile from './pages/ClientProfile/profile'
import RestaurantAuth from './pages/RestaurantAuth/RestaurantAuth';

const App = () => {
  const [showLogin, setShowLogin] = useState(false)
  
  return (
    <BrowserRouter>
      {showLogin ? <LoginPopUp setShowLogin={setShowLogin} /> : null}
      <div className='app'>
        <Navbar setShowLogin={setShowLogin} />
        <Routes>
          <Route path="/profile" element={<ClientProfile />} />
          <Route path="/restaurant/login" element={<RestaurantAuth />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App