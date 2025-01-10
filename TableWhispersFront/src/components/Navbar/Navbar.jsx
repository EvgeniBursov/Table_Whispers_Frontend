import React from 'react'
import './Navbar.css'
import { assets } from '../../assets/assets'



const Navbar = ({setShowLogin}) => {
  return (
    <div className='navbar'>
        <img src={assets.logo} alt="" className='logo' />
        <ul className="navbar-menu"></ul>
            <li>Signup</li>
            <li>Search</li>
            <li>ForBusinesses</li>
            <li>Contact Us</li>
        <button onClick={()=>setShowLogin(true)}>sign up</button>
    </div>
  )
}

export default Navbar
