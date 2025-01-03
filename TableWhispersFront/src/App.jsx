import React, { useState } from 'react'
import Navbar from './components/Navbar/Navbar'
import LoginPopUp from './components/LoginPopUp/loginPopUp'

const App = () => {
  const [showLogin, setShowLogin] = useState(false)
  
  return (
    <>
      {showLogin ? <LoginPopUp /> : null}
      <div className='app'>
        <Navbar setShowLogin={setShowLogin} />
      </div>
    </>
  )
}

export default App
