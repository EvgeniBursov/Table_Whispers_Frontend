import React, { useState, useEffect } from 'react';
import './ManagementDashboardCSS/MngRestaurantMenu.css';
const API_URL = import.meta.env.VITE_BACKEND_API || 'http://localhost:5000';


const RestaurantMenu = ({ restaurantId }) => {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20; // 5 columns × 4 rows
  
  // Modal states
  const [showAddMenuModal, setShowAddMenuModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [selectedMenuSection, setSelectedMenuSection] = useState(null);
  
  // Form states
  const [newMenuSectionTitle, setNewMenuSectionTitle] = useState('');
  const [newMenuItem, setNewMenuItem] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Appetizers'
  });

  // Fetch menu when component mounts
  useEffect(() => {
    fetchMenu();
  }, [restaurantId]);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/get_Restaurant_Menu/restaurant/${restaurantId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch menu');
      }
      
      const data = await response.json();
      setMenu(data.menu[0]?.menus || []);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch menu');
      setLoading(false);
    }
  };

  const handleMenuAction = async (action, data) => {
    try {
      const response = await fetch(`${API_URL}/update_Restaurant_Menu/restaurant/${restaurantId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          action,
          ...data
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to perform action');
      }
      
      fetchMenu();
      // Reset modals and forms
      setShowAddMenuModal(false);
      setShowAddItemModal(false);
      setNewMenuSectionTitle('');
      setNewMenuItem({
        name: '',
        description: '',
        price: '',
        category: 'Appetizers'
      });
    } catch (err) {
      alert(`Failed to ${action}`);
    }
  };

  const handleAddMenuSection = () => {
    handleMenuAction('add_menu', { menu_title: newMenuSectionTitle });
  };

  const handleRemoveMenuSection = (menuTitle) => {
    handleMenuAction('remove_menu', { menu_title: menuTitle });
  };

  const handleAddMenuItem = () => {
    handleMenuAction('add_item', {
      menu_title: selectedMenuSection,
      item_name: newMenuItem.name,
      item_description: newMenuItem.description,
      item_price: newMenuItem.price,
      item_category: newMenuItem.category
    });
  };

  const handleRemoveMenuItem = (menuTitle, itemName) => {
    handleMenuAction('remove_item', { 
      menu_title: menuTitle, 
      item_name: itemName 
    });
  };

  // Flatten items for pagination
  const allItems = menu.flatMap(section => 
    section.items.map(item => ({
      ...item,
      sectionTitle: section.title
    }))
  );

  // Pagination helpers
  const paginate = (items) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return items.slice(startIndex, startIndex + itemsPerPage);
  };

  const totalPages = Math.ceil(allItems.length / itemsPerPage);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  if (loading) return <div className="text-center py-4">Loading menu...</div>;
  if (error) return <div className="text-red-500 text-center py-4">{error}</div>;

  const paginatedItems = paginate(allItems);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Restaurant Menu</h1>
      
      {/* Add Menu Section Button */}
      <button 
        onClick={() => setShowAddMenuModal(true)}
        className="btn btn-add-section mb-6"
      >
        <span className="btn-icon">+</span> Add Menu Section
      </button>

      {/* Menu Items Grid */}
      <div className="menu-items-expanded-grid">
        {paginatedItems.map((item, index) => (
          <div 
            key={index} 
            className="menu-item-expanded"
          >
            <div className="menu-item-expanded-content">
              <h3 className="menu-item-name">{item.name}</h3>
              <p className="menu-item-description">{item.description}</p>
              <div className="menu-item-footer">
                <span className="menu-item-price">${item.price.toFixed(2)}</span>
                <span className="menu-item-category">{item.category}</span>
              </div>
              <div className="menu-item-section-title">
                Section: {item.sectionTitle}
              </div>
              <button 
                onClick={() => handleRemoveMenuItem(item.sectionTitle, item.name)}
                className="menu-item-remove-btn"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      <div className="pagination">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
          >
            {page}
          </button>
        ))}
      </div>

      {/* Modals remain the same as in previous version */}
      {/* Add Menu Section Modal */}
      {showAddMenuModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">Add Menu Section</h2>
            <input 
              type="text"
              placeholder="Menu Section Title"
              value={newMenuSectionTitle}
              onChange={(e) => setNewMenuSectionTitle(e.target.value)}
              className="modal-input"
            />
            <div className="modal-actions">
              <button 
                onClick={() => setShowAddMenuModal(false)}
                className="btn btn-cancel"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddMenuSection}
                className="btn btn-confirm"
              >
                Add Section
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Menu Item Modal */}
      {showAddItemModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">Add Menu Item to {selectedMenuSection}</h2>
            <input 
              type="text"
              placeholder="Item Name"
              value={newMenuItem.name}
              onChange={(e) => setNewMenuItem({...newMenuItem, name: e.target.value})}
              className="modal-input"
            />
            <textarea 
              placeholder="Item Description"
              value={newMenuItem.description}
              onChange={(e) => setNewMenuItem({...newMenuItem, description: e.target.value})}
              className="modal-input"
            />
            <input 
              type="number"
              placeholder="Price"
              value={newMenuItem.price}
              onChange={(e) => setNewMenuItem({...newMenuItem, price: e.target.value})}
              className="modal-input"
              step="0.01"
            />
            <select 
              value={newMenuItem.category}
              onChange={(e) => setNewMenuItem({...newMenuItem, category: e.target.value})}
              className="modal-input"
            >
              <option value="Appetizers">Appetizers</option>
              <option value="Main Course">Main Course</option>
              <option value="Side Dishes">Side Dishes</option>
              <option value="Desserts">Desserts</option>
              <option value="Drinks">Drinks</option>
            </select>
            <div className="modal-actions">
              <button 
                onClick={() => setShowAddItemModal(false)}
                className="btn btn-cancel"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddMenuItem}
                className="btn btn-confirm"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantMenu;