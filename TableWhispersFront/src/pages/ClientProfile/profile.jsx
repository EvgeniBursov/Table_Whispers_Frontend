import React, { useState, useEffect, useMemo } from "react";
import { assets } from "../../assets/assets";
import "./profile.css";

const ClientProfile = () => {
  const [profile, setProfile] = useState(null);
  const [allergies, setAllergies] = useState([]); // Store allergies list
  const [selectedAllergy, setSelectedAllergy] = useState(""); // Selected allergy
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Planning");
  const [password, setPassword] = useState("");
  const [confirm_password, setConfirmPassword] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingPhone, setEditingPhone] = useState(false);
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const ordersPerPage = 3;
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const email = localStorage.getItem("userEmail");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `http://localhost:5000/userProfile?email=${email}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!response.ok) throw new Error("Failed to fetch profile");
        const data = await response.json();
        console.log(data)
        setProfile(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    const fetchAllergies = async () => {
      try {
        const response = await fetch("http://localhost:5000/getListOfAllergies");
        if (!response.ok) throw new Error("Failed to fetch allergies");
        
        const data = await response.json();
        setAllergies(data); 
      } catch (error) {
        console.error("Error fetching allergies:", error); 
      }
    };
    
    fetchProfile();
    fetchAllergies();
    
  }, [email]);



  // Helper function for normalized string comparison
  const normalizedCompare = (a, b) => {
    return (a || '').toString().toLowerCase().trim() === 
           (b || '').toString().toLowerCase().trim();
  };

  // Filter and sort orders by status and date (newest to oldest)
  const getFilteredOrders = (status) => {
    if (!profile || !profile.orders) return [];
    
    // Use normalized comparison to handle potential whitespace or case issues
    const filteredOrders = profile.orders.filter(order => {
      return normalizedCompare(order.status, status);
    });
    
    return filteredOrders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
  };

  // Memoize filtered orders to avoid recalculating on every render
  const filteredOrdersByStatus = useMemo(() => {
    const result = {};
    if (profile && profile.orders) {
      ['Planning', 'Seated', 'Done', 'Cancelled'].forEach(status => {
        result[status] = getFilteredOrders(status);
      });
    }
    return result;
  }, [profile]);
  
  // Get current orders for pagination using memoized filtered orders
  const getCurrentOrders = (status) => {
    const filteredOrders = filteredOrdersByStatus[status] || [];
    const indexOfLastOrder = currentPage * ordersPerPage;
    const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
    return filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  };

  // Calculate total pages using memoized filtered orders
  const totalPages = (status) => {
    const filteredOrders = filteredOrdersByStatus[status] || [];
    return Math.ceil(filteredOrders.length / ordersPerPage);
  };

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1); // Reset to first page when changing tabs
  };

  // Handle phone number edit
  const startPhoneEdit = () => {
    setNewPhoneNumber(profile.phone_number || "");
    setEditingPhone(true);
  };

  const cancelPhoneEdit = () => {
    setEditingPhone(false);
    setNewPhoneNumber("");
  };

  const handlePhoneNumberChange = async () => {
    if (!newPhoneNumber) {
      alert("Please enter a phone number!");
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/updateUserPhoneNumber", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email, phone_number: newPhoneNumber }),
      });

      let data;
      try {
        data = await response.json();
        console.log("Server response:", data);
      } catch (e) {
        console.error("Error parsing JSON:", e);
        alert("Server response was not valid JSON");
        return;
      }
      
      if (response.status === 300) {
        alert(data?.error || "Invalid phone number format");
        return;
      }

      if (!response.ok) {
        alert(data?.error || `Failed to update phone number (${response.status})`);
        return;
      }

      setProfile(prevProfile => ({
        ...prevProfile,
        phone_number: newPhoneNumber
      }));
      
      setEditingPhone(false);
      
      alert(data?.message || "Phone number updated successfully!");
    } catch (error) {
      console.error("Network error:", error);
      alert("Failed to connect to server. Please check your connection.");
    }
  }

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
      } else {
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
      window.location.reload();
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
          name_allergies: allergy,
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

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check that file is an image
    if (!file.type.match('image.*')) {
      alert('Please select an image file (jpg, png, etc)');
      return;
    }
    
    // Limit file size to 2MB
    if (file.size > 2 * 1024 * 1024) {
      alert('Image file is too large. Please select an image smaller than 2MB.');
      return;
    }
    
    setImageFile(file);
    
    // Create preview of the image
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };
  
  // Function to upload the image to server
  const handleImageUpload = async () => {
    if (!imageFile) {
      alert('Please select an image first');
      return;
    }
    
    setUploadingImage(true);
    
    try {
      const formData = new FormData();
      formData.append('profileImage', imageFile);
      formData.append('email', email);
      
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/updateUserProfileImage", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      
      let data;
      try {
        data = await response.json();
      } catch (e) {
        console.error("Error parsing response:", e);
        alert("Server response was not valid JSON");
        return;
      } finally {
        setUploadingImage(false);
      }
      
      if (!response.ok) {
        alert(data?.error || `Failed to upload image (${response.status})`);
        return;
      }
      
      // Update profile with new image URL
      setProfile(prevProfile => ({
        ...prevProfile,
        profileImage: data.profileImage
      }));
      
      // Clean up image upload state
      setImageFile(null);
      setImagePreview(null);
      
      alert('Profile image updated successfully!');
    } catch (error) {
      console.error('Error uploading profile image:', error);
      alert("Failed to connect to server. Please check your connection.");
      setUploadingImage(false);
    }
  };
  
  // Function to cancel image selection
  const cancelImageSelection = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!profile) return <div className="error">No profile data found</div>;
  const getImageUrl = (imagePath) => {
    if (!imagePath) return assets.person_logo;
    
    // If it's already a complete URL, return it as is
    if (imagePath.startsWith('http')) return imagePath;
    
    // Otherwise, prepend the server URL
    return `http://localhost:5000${imagePath}`;
  };

  return (
    <div className="profile-container">
      {/* Personal Information */}
      <div className="profile-card">
        <div className="profile-header">
          {/* Profile Picture */}
          <div className="profile-image">
            <img src={imagePreview || getImageUrl(profile.profileImage)} alt="Profile" />
            {/* Update icon overlay that appears on hover */}
            <div className="image-upload-overlay" onClick={() => document.getElementById('profile-image-input').click()}>
              <span className="upload-icon">📷</span>
            </div>
            
            {/* Hidden input element for file selection */}
            <input
              type="file"
              id="profile-image-input"
              accept="image/*"
              onChange={handleImageSelect}
              style={{ display: 'none' }}
            />
          </div>

          {/* Image update panel that appears only when a new image is selected */}
          {imageFile && (
            <div className="image-upload-controls">
              <p>Upload new profile picture?</p>
              <div className="edit-phone-buttons">
                <button 
                  onClick={handleImageUpload} 
                  disabled={uploadingImage} 
                  className="edit-confirm-button"
                >
                  {uploadingImage ? 'Uploading...' : 'Confirm'}
                </button>
                <button 
                  onClick={cancelImageSelection} 
                  disabled={uploadingImage} 
                  className="edit-cancel-button"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
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
                {editingPhone ? (
                  <div className="edit-phone-container">
                    <input
                      type="text"
                      value={newPhoneNumber}
                      onChange={(e) => setNewPhoneNumber(e.target.value)}
                      className="edit-phone-input"
                    />
                    <div className="edit-phone-buttons">
                      <button onClick={handlePhoneNumberChange} className="edit-confirm-button">
                        Update
                      </button>
                      <button onClick={cancelPhoneEdit} className="edit-cancel-button">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="detail-value phone-value" onClick={startPhoneEdit}>
                    {profile.phone_number} <span className="edit-icon">✎</span>
                  </p>
                )}
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



      {/* Orders Section with 4 tabs and pagination */}
      <div className="profile-card">
        <h2>Orders</h2>
        <div className="tabs">
          <button
            className={`tab-button ${activeTab === "Planning" ? "active" : ""}`}
            onClick={() => handleTabChange("Planning")}
          >
            Upcoming Orders
          </button>
          <button
            className={`tab-button ${activeTab === "Seated" ? "active" : ""}`}
            onClick={() => handleTabChange("Seated")}
          >
            Seated Orders
          </button>
          <button
            className={`tab-button ${activeTab === "Done" ? "active" : ""}`}
            onClick={() => handleTabChange("Done")}
          >
            Completed Orders
          </button>
          <button
            className={`tab-button ${activeTab === "Cancelled" ? "active" : ""}`}
            onClick={() => handleTabChange("Cancelled")}
          >
            Cancelled Orders
          </button>
        </div>

        <div className="orders-container">
          {getCurrentOrders(activeTab).length > 0 ? (
            getCurrentOrders(activeTab).map((order) => (
              <div key={`${order.restaurantName}-${order._id || Math.random()}`} className="order-card">
                <div className="order-header">
                  <h3>{order.restaurantName}</h3>
                  <span className={`status-tag status-${activeTab.toLowerCase()}`}>
                    {activeTab === "Planning" ? "Upcoming" : 
                     activeTab === "Seated" ? "Seated" : 
                     activeTab === "Done" ? "Completed" : "Cancelled"}
                  </span>
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
            <p className="no-data">No {activeTab.toLowerCase()} orders</p>
          )}
          
          {/* Pagination */}
          {totalPages(activeTab) > 1 && (
            <div className="pagination">
              {Array.from({ length: totalPages(activeTab) }, (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`pagination-button ${
                    currentPage === i + 1 ? "active" : ""
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
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