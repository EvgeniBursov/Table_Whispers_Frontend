import React, { useState } from 'react'
import './Navbar.css'
import { assets } from '../../assets/assets'
import { useNavigate } from 'react-router-dom'

const Navbar = ({setShowLogin}) => {
 const token = localStorage.getItem('token');
 const navigate = useNavigate();

 const [menu, setMenu] = useState("home")

 const logout = () => {
   localStorage.removeItem("token")
   localStorage.removeItem("userEmail"); 
   navigate('/'); 
   window.location.reload(); 
 }

 const goToProfile = () => {
   if (token) {
     navigate('/profile');  
   }
 }

 /*const goToRestaurantAuth = () => {
   navigate('/restaurant/login');
 }*/

 return (
   <div className='navbar'>
       <img src={assets.logo} alt="" className='logo' />
       <ul className="navbar-menu"></ul>
           <li onClick={()=>navigate("/HomePage") } className={menu==="Home Page"?"active":""}>Home Page</li>
           <li onClick={()=>setMenu("Search")} className={menu==="Search"?"active":""}>Search</li>
           <li onClick={() => navigate('/restaurant/login')}>Restaurant</li>
           <li onClick={()=>setMenu("Contact Us")} className={menu==="Contact Us"?"active":""}>Contact Us</li>
       {!token ? 
         <button onClick={()=>setShowLogin(true)}>sign up</button>
         :
         <div className='navbar-profile'>
           <img 
             src={assets.person_logo} 
             alt='' 
             onClick={goToProfile}
             style={{ cursor: 'pointer' }}
           />
           <ul className="nav-profile-dropdown">
             <li onClick={goToProfile}>
               <img src={assets.person_logo} alt='' />
               <p>My Profile</p>
             </li>
             <li onClick={logout}>
               <img src={assets.log_out_logo} alt='' />
               <p>Logout</p>
             </li>
           </ul>
         </div>
       }
   </div>
 )
}

export default Navbar