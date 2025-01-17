import React from 'react'
import './Navbar.css'
import { assets } from '../../assets/assets'
import { useNavigate } from 'react-router-dom'


const Navbar = ({setShowLogin}) => {

  const token = localStorage.getItem('token');
  const navigate = useNavigate(); 

  const logout = () =>{
    localStorage.removeItem("token")
    window.location.reload(); 
  }

  const goToProfile = () => {
    if (token) {
      navigate('/profile');  
    }
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
          <img src={assets.person_logo} alt='' style={{ cursor: 'pointer' }}/>
          <ul className="nav-profile-dropdown">
          <li onClick={goToProfile}>
                <img src={assets.person_logo} alt='' />
                <p>My Profile</p>
              </li>
            <li onClick={logout}><img src={assets.log_out_logo} alt='' /><p>Logout</p></li>
          </ul>
          </div>}
    </div>
  )
}

export default Navbar
