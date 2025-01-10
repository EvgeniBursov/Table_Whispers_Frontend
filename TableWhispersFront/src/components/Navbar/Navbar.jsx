import React from 'react'
import './Navbar.css'
import { assets } from '../../assets/assets'



const Navbar = ({setShowLogin}) => {

  const token = localStorage.getItem('token');

  const logout = () =>{
    localStorage.removeItem("token")
    window.location.reload(); 
  }

  return (
    <div className='navbar'>
        <img src={assets.logo} alt="" className='logo' />
        <ul className="navbar-menu"></ul>
            <li>Signup</li>
            <li>Search</li>
            <li>ForBusinesses</li>
            <li>Contact Us</li>
        {!token?<button onClick={()=>setShowLogin(true)}>sign up</button>
        :<div className='navbar-profile'>
          <img src={assets.person_logo} alt=''/>
          <ul className="nav-profile-dropdown">
            <li onClick={logout}><img src={assets.log_out_logo} alt='' /><p>Logout</p></li>
          </ul>
          </div>}
    </div>
  )
}

export default Navbar
