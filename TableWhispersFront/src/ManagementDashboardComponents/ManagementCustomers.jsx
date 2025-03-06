import React, { useState, useEffect } from 'react';
import './ManagementDashboardCSS/MngCustomers.css';

const ManagementCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('last_visit');
  const [sortOrder, setSortOrder] = useState('desc'); 
  const restaurantId = '67937038eb604c7927e85d2a'; 
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  // Fetch customers data
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        
        const apiUrl = 'http://localhost:7000';
        const response = await fetch(`${apiUrl}/get_Restaurant_Clients/restaurant/${restaurantId}`, {
          headers: {
            'Authorization': localStorage.getItem('token') || ''
          }
        });
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch customers');
        }
        
        setCustomers(data.customers);
        setError(null);
      } catch (err) {
        console.error('Error fetching customers:', err);
        setError('Failed to load customers. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCustomers();
  }, [restaurantId]);
  
  // Apply filters and sorting
  const filteredAndSortedCustomers = [...customers]
    // Filter by search term
    .filter(customer => {
      if (!searchTerm) return true;
      
      const fullName = `${customer.first_name} ${customer.last_name}`.toLowerCase();
      const email = customer.email ? customer.email.toLowerCase() : '';
      const phone = customer.phone ? customer.phone.toLowerCase() : '';
      
      const search = searchTerm.toLowerCase();
      
      return fullName.includes(search) || 
             email.includes(search) || 
             phone.includes(search);
    })
    // Filter by customer type
    .filter(customer => {
      if (filterType === 'all') return true;
      return customer.type === filterType;
    })
    // Sort by selected field
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
          const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
          return sortOrder === 'asc' 
            ? nameA.localeCompare(nameB) 
            : nameB.localeCompare(nameA);
          
        case 'visits':
          return sortOrder === 'asc' 
            ? a.visits - b.visits 
            : b.visits - a.visits;
          
        case 'last_visit':
          if (!a.last_visit) return sortOrder === 'asc' ? -1 : 1;
          if (!b.last_visit) return sortOrder === 'asc' ? 1 : -1;
          
          return sortOrder === 'asc' 
            ? new Date(a.last_visit) - new Date(b.last_visit) 
            : new Date(b.last_visit) - new Date(a.last_visit);
          
        default:
          return 0;
      }
    });
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  // Toggle sort order when clicking on a header
  const handleSort = (field) => {
    if (sortBy === field) {
      // Toggle sort direction if already sorting by this field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Default to descending for new sort field
      setSortBy(field);
      setSortOrder('desc');
    }
  };
  
  // Handle selecting a customer
  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
  };
  
  // Close customer details modal
  const handleCloseDetails = () => {
    setSelectedCustomer(null);
  };
  
  if (loading) {
    return (
      <div className="mgc-container">
        <div className="mgc-loading">Loading customers data...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="mgc-container">
        <div className="mgc-error">{error}</div>
      </div>
    );
  }
  
  return (
    <div className="mgc-container">
      <div className="mgc-header">
        <h1>Customers</h1>
        <div className="mgc-stats">
          <div className="mgc-stat-item">
            <div className="mgc-stat-value">{customers.length}</div>
            <div className="mgc-stat-label">Total Customers</div>
          </div>
          <div className="mgc-stat-item">
            <div className="mgc-stat-value">
              {customers.filter(c => c.type === 'registered').length}
            </div>
            <div className="mgc-stat-label">Registered</div>
          </div>
          <div className="mgc-stat-item">
            <div className="mgc-stat-value">
              {customers.filter(c => c.type === 'guest').length}
            </div>
            <div className="mgc-stat-label">Guests</div>
          </div>
        </div>
      </div>
      
      <div className="mgc-filters">
        <div className="mgc-search">
          <input
            type="text"
            placeholder="Search by name, email or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="mgc-filter-controls">
          <div className="mgc-filter-group">
            <label>Type:</label>
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Customers</option>
              <option value="registered">Registered Only</option>
              <option value="guest">Guests Only</option>
            </select>
          </div>
          
          <div className="mgc-filter-group">
            <label>Sort by:</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="last_visit">Last Visit</option>
              <option value="name">Name</option>
              <option value="visits">Number of Visits</option>
            </select>
            
            <button 
              className={`mgc-sort-dir ${sortOrder}`}
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="mgc-customers-table">
        <table>
          <thead>
            <tr>
              <th className={sortBy === 'name' ? 'active' : ''} onClick={() => handleSort('name')}>
                Customer Name
                {sortBy === 'name' && <span className="sort-indicator">{sortOrder === 'asc' ? ' ↑' : ' ↓'}</span>}
              </th>
              <th>Email</th>
              <th>Phone</th>
              <th className={sortBy === 'visits' ? 'active' : ''} onClick={() => handleSort('visits')}>
                Visits
                {sortBy === 'visits' && <span className="sort-indicator">{sortOrder === 'asc' ? ' ↑' : ' ↓'}</span>}
              </th>
              <th className={sortBy === 'last_visit' ? 'active' : ''} onClick={() => handleSort('last_visit')}>
                Last Visit
                {sortBy === 'last_visit' && <span className="sort-indicator">{sortOrder === 'asc' ? ' ↑' : ' ↓'}</span>}
              </th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedCustomers.length > 0 ? (
              filteredAndSortedCustomers.map(customer => (
                <tr 
                  key={customer.id} 
                  onClick={() => handleSelectCustomer(customer)}
                  className={`mgc-customer-row ${customer.type}`}
                >
                  <td>
                    <div className="mgc-customer-name">
                      {customer.type === 'registered' && (
                        <div className="mgc-customer-initial">
                          {customer.first_name[0]}{customer.last_name[0]}
                        </div>
                      )}
                      <span>{customer.first_name} {customer.last_name}</span>
                    </div>
                  </td>
                  <td>{customer.email}</td>
                  <td>{customer.phone}</td>
                  <td className="mgc-visits-cell">{customer.visits}</td>
                  <td>{formatDate(customer.last_visit)}</td>
                  <td>
                    <span className={`mgc-customer-type ${customer.type}`}>
                      {customer.type === 'registered' ? 'Registered' : 'Guest'}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="mgc-no-results">
                  No customers found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {selectedCustomer && (
        <div className="mgc-customer-details-modal">
          <div className="mgc-customer-details">
            <div className="mgc-detail-header">
              <h2>Customer Details</h2>
              <button 
                className="mgc-close-btn"
                onClick={handleCloseDetails}
              >
                ×
              </button>
            </div>
            
            <div className="mgc-detail-content">
              <div className="mgc-detail-section">
                <h3>Personal Information</h3>
                
                {selectedCustomer.type === 'registered' && (
                  <div className="mgc-customer-avatar">
                    <div className="mgc-customer-initials">
                      {selectedCustomer.first_name[0]}{selectedCustomer.last_name[0]}
                    </div>
                  </div>
                )}
                
                <div className="mgc-detail-row">
                  <div className="mgc-detail-label">Name:</div>
                  <div className="mgc-detail-value">
                    {selectedCustomer.first_name} {selectedCustomer.last_name}
                  </div>
                </div>
                
                <div className="mgc-detail-row">
                  <div className="mgc-detail-label">Email:</div>
                  <div className="mgc-detail-value">{selectedCustomer.email}</div>
                </div>
                
                <div className="mgc-detail-row">
                  <div className="mgc-detail-label">Phone:</div>
                  <div className="mgc-detail-value">{selectedCustomer.phone}</div>
                </div>
                
                {selectedCustomer.type === 'registered' && selectedCustomer.age && (
                  <div className="mgc-detail-row">
                    <div className="mgc-detail-label">Age:</div>
                    <div className="mgc-detail-value">{selectedCustomer.age}</div>
                  </div>
                )}
                
                <div className="mgc-detail-row">
                  <div className="mgc-detail-label">Customer Type:</div>
                  <div className="mgc-detail-value">
                    <span className={`mgc-customer-type ${selectedCustomer.type}`}>
                      {selectedCustomer.type === 'registered' ? 'Registered' : 'Guest'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="mgc-detail-section">
                <h3>Visit Information</h3>
                
                <div className="mgc-detail-row">
                  <div className="mgc-detail-label">Total Visits:</div>
                  <div className="mgc-detail-value">{selectedCustomer.visits}</div>
                </div>
                
                <div className="mgc-detail-row">
                  <div className="mgc-detail-label">Last Visit:</div>
                  <div className="mgc-detail-value">
                    {formatDate(selectedCustomer.last_visit)}
                  </div>
                </div>
              </div>
              
              {selectedCustomer.type === 'registered' && selectedCustomer.allergies && selectedCustomer.allergies.length > 0 && (
                <div className="mgc-detail-section">
                  <h3>Allergies</h3>
                  <ul className="mgc-allergies-list">
                    {selectedCustomer.allergies.map((allergy, index) => (
                      <li key={index} className="mgc-allergy-item">
                        <span className="mgc-allergy-name">{allergy.name}</span>
                        {allergy.severity && (
                          <span className={`mgc-allergy-severity mgc-severity-${allergy.severity.toLowerCase()}`}>
                            {allergy.severity}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagementCustomers;