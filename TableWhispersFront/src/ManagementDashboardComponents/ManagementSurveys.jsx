import React, { useState, useEffect } from 'react';
import './ManagementDashboardCSS/MngSurveys.css';

const StarDisplay = ({ rating }) => {
    return (
      <div className="star-display">
        {[...Array(5)].map((_, index) => (
          <span 
            key={index} 
            className={`star ${index < rating ? "filled" : ""}`}
          >
            ★
          </span>
        ))}
        <span className="rating-value">{rating.toFixed(1)}</span>
      </div>
    );
  };
  
  // Rating Progress Bar Component
  const RatingProgressBar = ({ percentage, count, total }) => {
    return (
      <div className="rating-progress-container">
        <div className="rating-progress-bar" style={{ width: `${percentage}%` }}></div>
        <span className="rating-progress-count">{count}</span>
      </div>
    );
  };
  
  const ManagementSurveys = ({ restaurantId }) => {
    const [surveys, setSurveys] = useState([]);
    const [filteredSurveys, setFilteredSurveys] = useState([]);
    const [statistics, setStatistics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedSurvey, setSelectedSurvey] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'submitted_at', direction: 'desc' });
    const [dateRange, setDateRange] = useState({
      start: null,
      end: null
    });
    const [ratingFilter, setRatingFilter] = useState(0); // 0 means no filter
  
    // Fetch survey data on component mount
    useEffect(() => {
      const fetchSurveys = async () => {
        try {
          setLoading(true);
          const response = await fetch(`http://localhost:5000/getRestaurantSurveysDetailed/${restaurantId}`);
          
          if (!response.ok) {
            throw new Error('Failed to fetch surveys');
          }
          
          const data = await response.json();
          
          if (data.success) {
            setSurveys(data.surveys);
            setFilteredSurveys(data.surveys);
            setStatistics(data.statistics);
          } else {
            throw new Error(data.message || 'Failed to load survey data');
          }
        } catch (err) {
          console.error('Error loading surveys:', err);
          setError(err.message || 'Failed to load surveys');
        } finally {
          setLoading(false);
        }
      };
      
      fetchSurveys();
    }, [restaurantId]);
  
    // Filter and sort surveys
    useEffect(() => {
      let result = [...surveys];
      
      // Filter by search term
      if (searchTerm) {
        const lowerCaseSearch = searchTerm.toLowerCase();
        result = result.filter(survey => 
          (survey.client?.name?.toLowerCase().includes(lowerCaseSearch)) ||
          (survey.client?.email?.toLowerCase().includes(lowerCaseSearch)) ||
          (survey.order_details?.table_number?.toString().includes(lowerCaseSearch))
        );
      }
      
      // Filter by date range
      if (dateRange.start && dateRange.end) {
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59); // End of the day
        
        result = result.filter(survey => {
          const surveyDate = new Date(survey.submitted_at);
          return surveyDate >= startDate && surveyDate <= endDate;
        });
      }
      
      // Filter by rating
      if (ratingFilter > 0) {
        result = result.filter(survey => {
          return Math.round(survey.average_rating) === ratingFilter;
        });
      }
      
      // Sort
      if (sortConfig.key) {
        result.sort((a, b) => {
          // Handle nested properties
          let aValue, bValue;
          
          if (sortConfig.key.includes('.')) {
            const keys = sortConfig.key.split('.');
            aValue = keys.reduce((obj, key) => obj?.[key], a);
            bValue = keys.reduce((obj, key) => obj?.[key], b);
          } else {
            aValue = a[sortConfig.key];
            bValue = b[sortConfig.key];
          }
          
          // Handle dates
          if (sortConfig.key === 'submitted_at' || sortConfig.key === 'order_details.order_date') {
            aValue = new Date(aValue || 0);
            bValue = new Date(bValue || 0);
          }
          
          if (aValue < bValue) {
            return sortConfig.direction === 'asc' ? -1 : 1;
          }
          if (aValue > bValue) {
            return sortConfig.direction === 'asc' ? 1 : -1;
          }
          return 0;
        });
      }
      
      setFilteredSurveys(result);
    }, [surveys, searchTerm, sortConfig, dateRange, ratingFilter]);
  
    // Sort handler
    const requestSort = (key) => {
      let direction = 'asc';
      if (sortConfig.key === key && sortConfig.direction === 'asc') {
        direction = 'desc';
      }
      setSortConfig({ key, direction });
    };
  
    // Clear all filters
    const clearFilters = () => {
      setSearchTerm('');
      setDateRange({ start: null, end: null });
      setRatingFilter(0);
      setFilteredSurveys(surveys);
    };
  
    // Format date for display
    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(date);
    };
  
    if (loading) {
      return <div className="surveys-loading">Loading survey data...</div>;
    }
  
    if (error) {
      return (
        <div className="surveys-error">
          <h2>Error Loading Surveys</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Try Again</button>
        </div>
      );
    }
  
    return (
      <div className="surveys-container">
        <div className="surveys-header">
          <h1>Customer Feedback Surveys</h1>
          <p>{statistics?.total_surveys || 0} surveys submitted</p>
        </div>
  
        {/* Survey Overview Section */}
        {statistics && (
          <div className="survey-statistics">
            <div className="rating-overview">
              <div className="average-rating-card">
                <h3>Overall Rating</h3>
                <div className="average-rating">
                  <span className="rating-number">{statistics.average_ratings.combined || "0.0"}</span>
                  <StarDisplay rating={parseFloat(statistics.average_ratings.combined) || 0} />
                </div>
                <div className="total-reviews">{statistics.total_surveys} reviews</div>
              </div>
              
              <div className="rating-categories">
                <div className="rating-category">
                  <div className="category-label">Food</div>
                  <StarDisplay rating={parseFloat(statistics.average_ratings.food) || 0} />
                </div>
                <div className="rating-category">
                  <div className="category-label">Service</div>
                  <StarDisplay rating={parseFloat(statistics.average_ratings.service) || 0} />
                </div>
                <div className="rating-category">
                  <div className="category-label">Ambiance</div>
                  <StarDisplay rating={parseFloat(statistics.average_ratings.ambiance) || 0} />
                </div>
                <div className="rating-category">
                  <div className="category-label">Cleanliness</div>
                  <StarDisplay rating={parseFloat(statistics.average_ratings.cleanliness) || 0} />
                </div>
              </div>
              
              {/* Rating Distribution */}
              {statistics.rating_distribution && (
                <div className="rating-distribution">
                  <h3>Rating Distribution</h3>
                  <div className="distribution-bars">
                    {[5, 4, 3, 2, 1].map(star => {
                      const count = statistics.rating_distribution.overall[star - 1];
                      const percentage = statistics.total_surveys > 0 
                        ? (count / statistics.total_surveys) * 100 
                        : 0;
                      
                      return (
                        <div key={star} className="distribution-row">
                          <div className="star-label">{star} ★</div>
                          <RatingProgressBar 
                            percentage={percentage} 
                            count={count} 
                            total={statistics.total_surveys} 
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
  
        {/* Filters and Search */}
        <div className="surveys-filters">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by customer name, email or table..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <div className="date-filter">
              <label>From:</label>
              <input
                type="date"
                value={dateRange.start || ''}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              />
              <label>To:</label>
              <input
                type="date"
                value={dateRange.end || ''}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              />
            </div>
            
            <div className="rating-filter">
              <label>Rating:</label>
              <select 
                value={ratingFilter} 
                onChange={(e) => setRatingFilter(parseInt(e.target.value))}
              >
                <option value="0">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>
            
            <button className="clear-filters" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        </div>
  
        {/* Survey List */}
        <div className="survey-list-container">
          {filteredSurveys.length === 0 ? (
            <div className="no-surveys">
              <p>No surveys found matching your filters.</p>
            </div>
          ) : (
            <table className="survey-table">
              <thead>
                <tr>
                  <th onClick={() => requestSort('client.name')}>
                    Customer
                    {sortConfig.key === 'client.name' && (
                      <span className="sort-indicator">
                        {sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}
                      </span>
                    )}
                  </th>
                  <th onClick={() => requestSort('submitted_at')}>
                    Date Submitted
                    {sortConfig.key === 'submitted_at' && (
                      <span className="sort-indicator">
                        {sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}
                      </span>
                    )}
                  </th>
                  <th onClick={() => requestSort('order_details.order_date')}>
                    Dining Date
                    {sortConfig.key === 'order_details.order_date' && (
                      <span className="sort-indicator">
                        {sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}
                      </span>
                    )}
                  </th>
                  <th onClick={() => requestSort('average_rating')}>
                    Rating
                    {sortConfig.key === 'average_rating' && (
                      <span className="sort-indicator">
                        {sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}
                      </span>
                    )}
                  </th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredSurveys.map(survey => (
                  <tr key={survey.survey_id}>
                    <td className="customer-cell">
                      {survey.client ? (
                        <div className="customer-info">
                          {survey.client.profile_image ? (
                            <img 
                              className="customer-avatar" 
                              src={survey.client.profile_image} 
                              alt={survey.client.name} 
                            />
                          ) : (
                            <div className="customer-avatar customer-initials">
                              {survey.client.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="customer-details">
                            <div className="customer-name">{survey.client.name}</div>
                            <div className="customer-email">{survey.client.email}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="no-customer">No customer data</div>
                      )}
                    </td>
                    <td>{formatDate(survey.submitted_at)}</td>
                    <td>{formatDate(survey.order_details?.order_date)}</td>
                    <td>
                      <div className="table-rating">
                        <StarDisplay rating={survey.average_rating} />
                      </div>
                    </td>
                    <td>
                      <button 
                        className="view-details-btn"
                        onClick={() => setSelectedSurvey(survey)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
  
        {/* Survey Detail Modal */}
        {selectedSurvey && (
          <div className="survey-modal-overlay">
            <div className="survey-modal">
              <div className="survey-modal-header">
                <h2>Survey Details</h2>
                <button 
                  className="close-modal"
                  onClick={() => setSelectedSurvey(null)}
                >
                  ×
                </button>
              </div>
              
              <div className="survey-modal-content">
                <div className="modal-customer-info">
                  <h3>Customer Information</h3>
                  {selectedSurvey.client ? (
                    <div className="modal-customer-details">
                      <div className="modal-customer-row">
                        <span className="modal-label">Name:</span>
                        <span>{selectedSurvey.client.name}</span>
                      </div>
                      <div className="modal-customer-row">
                        <span className="modal-label">Email:</span>
                        <span>{selectedSurvey.client.email}</span>
                      </div>
                      <div className="modal-customer-row">
                        <span className="modal-label">Phone:</span>
                        <span>{selectedSurvey.client.phone}</span>
                      </div>
                      <div className="modal-customer-row">
                        <span className="modal-label">Customer Type:</span>
                        <span>{selectedSurvey.client.client_type === 'ClientUser' ? 'Registered User' : 'Guest'}</span>
                      </div>
                    </div>
                  ) : (
                    <p>No customer information available</p>
                  )}
                </div>
                
                <div className="modal-order-info">
                  <h3>Order Information</h3>
                  {selectedSurvey.order_details ? (
                    <div className="modal-order-details">
                      <div className="modal-order-row">
                        <span className="modal-label">Order Date:</span>
                        <span>{formatDate(selectedSurvey.order_details.order_date)}</span>
                      </div>
                      <div className="modal-order-row">
                        <span className="modal-label">Table Number:</span>
                        <span>{selectedSurvey.order_details.table_number || 'N/A'}</span>
                      </div>
                      <div className="modal-order-row">
                        <span className="modal-label">Number of Guests:</span>
                        <span>{selectedSurvey.order_details.guests}</span>
                      </div>
                      <div className="modal-order-row">
                        <span className="modal-label">Order Status:</span>
                        <span>{selectedSurvey.order_details.status}</span>
                      </div>
                    </div>
                  ) : (
                    <p>No order information available</p>
                  )}
                </div>
                
                <div className="modal-ratings">
                  <h3>Survey Ratings</h3>
                  <div className="modal-rating-details">
                    <div className="modal-rating-item">
                      <span className="modal-label">Food Quality:</span>
                      <StarDisplay rating={selectedSurvey.ratings.food} />
                    </div>
                    <div className="modal-rating-item">
                      <span className="modal-label">Service Quality:</span>
                      <StarDisplay rating={selectedSurvey.ratings.service} />
                    </div>
                    <div className="modal-rating-item">
                      <span className="modal-label">Ambiance:</span>
                      <StarDisplay rating={selectedSurvey.ratings.ambiance} />
                    </div>
                    <div className="modal-rating-item">
                      <span className="modal-label">Cleanliness:</span>
                      <StarDisplay rating={selectedSurvey.ratings.cleanliness} />
                    </div>
                    <div className="modal-rating-item">
                      <span className="modal-label">Overall Experience:</span>
                      <StarDisplay rating={selectedSurvey.ratings.overall} />
                    </div>
                    <div className="modal-rating-item average-rating-item">
                      <span className="modal-label">Average Rating:</span>
                      <StarDisplay rating={selectedSurvey.average_rating} />
                    </div>
                  </div>
                </div>
                
                <div className="modal-survey-meta">
                  <h3>Survey Metadata</h3>
                  <div className="modal-meta-details">
                    <div className="modal-meta-row">
                      <span className="modal-label">Survey ID:</span>
                      <span>{selectedSurvey.survey_id}</span>
                    </div>
                    <div className="modal-meta-row">
                      <span className="modal-label">Submitted on:</span>
                      <span>{formatDate(selectedSurvey.submitted_at)}</span>
                    </div>
                    <div className="modal-meta-row">
                      <span className="modal-label">Order ID:</span>
                      <span>{selectedSurvey.order_id}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="survey-modal-footer">
                <button 
                  className="close-modal-btn"
                  onClick={() => setSelectedSurvey(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  export default ManagementSurveys;