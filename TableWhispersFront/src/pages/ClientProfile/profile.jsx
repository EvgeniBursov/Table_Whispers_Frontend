import React, { useState, useEffect } from "react";
import { assets } from "../../assets/assets";
import "./profile.css";

const ClientProfile = () => {
  const [profile, setProfile] = useState(null);
  const [allergies, setAllergies] = useState([]); // Store allergies list
  const [selectedAllergy, setSelectedAllergy] = useState(""); // Selected allergy
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [password, setPassword] = useState("");
  const [confirm_password, setConfirmPassword] = useState("");
  const [pastOrders, setPastOrders] = useState([]); // Store past orders
  const [upcomingOrders, setUpcomingOrders] = useState([]); // Store upcoming orders

  const email = localStorage.getItem("userEmail");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token"); // If you need authentication
        const response = await fetch(
          `http://localhost:5000/userProfile?email=${email}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`, // Optional: Include token for auth
            },
          }
        );
        if (!response.ok) throw new Error("Failed to fetch profile");
        const data = await response.json();
        console.log(data);
        setProfile(data);
        const pastOrders = data.orders.filter(order => order.status === "Done");
        const upcomingOrders = data.orders.filter(order => order.status === "Planning");
        setPastOrders(pastOrders);
        setUpcomingOrders(upcomingOrders);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    const fetchAllergies = async () => {
      try {
        console.log("Fetching allergies...");
        const response = await fetch("http://localhost:5000/getListOfAllergies");
        if (!response.ok) throw new Error("Failed to fetch allergies");
        
        const data = await response.json();
        console.log("Allergies data received:", data); // תראה אם התקבלו הנתונים כראוי
        setAllergies(data); // עדכון האלרגיות
      } catch (error) {
        console.error("Error fetching allergies:", error); // נרצה לראות אם יש שגיאה
      }
    };
    

    fetchProfile()
    fetchAllergies();
    
  }, [email]); // Dependency array includes `email`

  const handlePasswordChange = async () => {
    if (password !== confirm_password) {
      alert("Passwords do not match!");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/resetClientPassword", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email, password, confirm_password }),
      });
      const data = await response.json();

      if (!response.ok) {
        alert(data.error);
        return;
      }else{
        alert(data.message)
      }
    } catch (error) {
      console.error(error);
      alert("Failed to update password.");
    }
  };

  const handleDeleteProfile = async () => {
    const confirmation = window.confirm("Are you sure you want to delete your profile?");
    if (!confirmation) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/deleteClientProfile", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error("Failed to delete profile");
      alert("Profile deleted successfully!");
      localStorage.removeItem("token");
      window.location.reload(); // Redirect or refresh the page
    } catch (error) {
      console.error(error);
      alert("Failed to delete profile.");
    }
  };
  
  const handleAllergyChange = async (type, allergy = selectedAllergy) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/updateUserAlergic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          email,
          name_allergies: allergy, // שינוי - שולח את שם האלרגיה הספציפית
          type: type
        })
      });
   
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || `Failed to ${type} allergy`);
   
      setProfile({
        ...profile,
        allergies: data.allergies
      });
      
      if (type === "update") {
        setSelectedAllergy("");
      }
   
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
   };

  if (loading) return <div className="loading">Loading...</div>;
  if (!profile) return <div className="error">No profile data found</div>;

  return (
    <div className="profile-container">
      {/* Personal Information */}
      <div className="profile-card">
        <div className="profile-header">
          {/* Profile Picture */}
          <div className="profile-image">
            <img src={profile.profileImage || assets.person_logo} alt="Profile" />
          </div>

          {/* Personal Details */}
          <div className="profile-details">
            <h1>
              {profile.first_name} {profile.last_name}
            </h1>
            <div className="details-grid">
              <div className="detail-item">
                <p className="detail-label">Age</p>
                <p className="detail-value">{profile.age}</p>
              </div>
              <div className="detail-item">
                <p className="detail-label">Phone Number</p>
                <p className="detail-value">{profile.phone_number}</p>
              </div>
              <div className="detail-item">
                <p className="detail-label">Email</p>
                <p className="detail-value">{profile.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Allergies */}
      <div className="profile-card">
 <h2>Allergies</h2>
 <div className="allergies-form">
   <select 
     value={selectedAllergy} 
     onChange={(e) => setSelectedAllergy(e.target.value)} 
     className="allergy-select"
   >
     <option value="">Select an allergy</option>
     {allergies.map((allergy) => (
       <option key={allergy.id} value={allergy.name}>
         {allergy.name}
       </option>
     ))}
   </select>
   <button onClick={() => handleAllergyChange("update")} className="add-button">
     Add Allergy
   </button>
 </div>

 <div className="allergies-container">
   {profile.allergies?.map((allergy, index) => (
     <div key={index} className="allergy-tag">
       {allergy}
       <button 
         onClick={() => handleAllergyChange("remove", allergy)}
         className="remove-button"
       >
         ×
       </button>
     </div>
   ))}
 </div>
</div>

 {/* Orders */}
{/* Orders Section */}
<div className="profile-card">
       <h2>Orders</h2>
       <div className="tabs">
         <button
           className={`tab-button ${activeTab === "upcoming" ? "active" : ""}`}
           onClick={() => setActiveTab("upcoming")}
         >
           Upcoming Orders
         </button>
         <button
           className={`tab-button ${activeTab === "past" ? "active" : ""}`}
           onClick={() => setActiveTab("past")}
         >
           Past Orders
         </button>
       </div>

       <div className="orders-container">
         {activeTab === "upcoming" ? (
           profile.orders?.filter(order => order.status === "Planning").length > 0 ? (
             profile.orders
               .filter(order => order.status === "Planning")
               .map((order) => (
                 <div key={order.restaurantName} className="order-card">
                   <div className="order-header">
                     <h3>{order.restaurantName}</h3>
                     <span className="status-tag status-planing">Upcoming</span>
                   </div>
                   <div className="order-info">
                     <div className="order-detail">
                       <span className="detail-label">City</span>
                       <span className="detail-value">{order.restaurantCity}</span>
                     </div>
                     <div className="order-detail">
                       <span className="detail-label">Description</span>
                       <span className="detail-value">{order.restaurantDescription}</span>
                     </div>
                     <div className="order-detail">
                       <span className="detail-label">Phone</span>
                       <span className="detail-value">{order.restaurantPhone}</span>
                     </div>
                     <div className="order-detail">
                       <span className="detail-label">Guests</span>
                       <span className="detail-value">{order.guests}</span>
                     </div>
                     <div className="order-detail">
                       <span className="detail-label">Order Date</span>
                       <span className="detail-value">
                         {new Date(order.orderDate).toLocaleDateString()}
                       </span>
                     </div>
                   </div>
                 </div>
               ))
           ) : (
             <p className="no-data">No upcoming orders</p>
           )
         ) : profile.orders?.filter(order => order.status === "Done").length > 0 ? (
           profile.orders
             .filter(order => order.status === "Done")
             .map((order) => (
               <div key={order.restaurantName} className="order-card">
                 <div className="order-header">
                   <h3>{order.restaurantName}</h3>
                   <span className="status-tag status-done">Completed</span>
                 </div>
                 <div className="order-info">
                   <div className="order-detail">
                     <span className="detail-label">City</span>
                     <span className="detail-value">{order.restaurantCity}</span>
                   </div>
                   <div className="order-detail">
                     <span className="detail-label">Description</span>
                     <span className="detail-value">{order.restaurantDescription}</span>
                   </div>
                   <div className="order-detail">
                     <span className="detail-label">Phone</span>
                     <span className="detail-value">{order.restaurantPhone}</span>
                   </div>
                   <div className="order-detail">
                     <span className="detail-label">Guests</span>
                     <span className="detail-value">{order.guests}</span>
                   </div>
                   <div className="order-detail">
                     <span className="detail-label">Order Date</span>
                     <span className="detail-value">
                       {new Date(order.orderDate).toLocaleDateString()}
                     </span>
                   </div>
                 </div>
               </div>
             ))
         ) : (
           <p className="no-data">No past orders</p>
         )}
       </div>
     </div>


      {/* Change Password */}
      <div className="profile-card">
        <h2>Change Password</h2>
        <div className="password-form">
          <input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirm_password}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button className="update-button" onClick={handlePasswordChange}>Update Password</button>
        </div>
      </div>

      {/* Delete Profile */}
      <div className="profile-card">
        <h2>Delete Profile</h2>
        <div className="delete-form">
        <button className="delete-button" onClick={handleDeleteProfile}>
          Delete My Profile
        </button>
      </div>
      </div>
    </div>
  );
};

export default ClientProfile;
