import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './ManagementTables.css';

const ManagementTables = ({ restaurantId }) => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [timeFilter, setTimeFilter] = useState({
    enabled: false,
    startTime: '00:00',
    endTime: '23:59'
  });
  const [newTableData, setNewTableData] = useState({
    table_number: '',
    seats: 2,
    shape: 'square',
    size: 100,
    width: 100,
    height: 100,
    section: 'main',
    x_position: 50,
    y_position: 50
  });
  const [draggedTable, setDraggedTable] = useState(null);
  const [sections, setSections] = useState(['main']);
  const [activeSection, setActiveSection] = useState('main');
  const [floorPlanSize, setFloorPlanSize] = useState({ width: '100%', height: 600 });
  const [zoomLevel, setZoomLevel] = useState(100);
  
  const floorPlanRef = useRef(null);
  const socketRef = useRef(null);
  
  // Format date for API requests (YYYY-MM-DD)
  const formatDateForApi = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // Format time for display (HH:MM format)
  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };
  
  // Format duration for display in parentheses
  const formatDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return '';
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMinutes = Math.round((end - start) / (1000 * 60));
    
    if (durationMinutes > 59) {
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      return `(${hours}:${String(minutes).padStart(2, '0')})`;
    }
    
    return `(${String(durationMinutes).padStart(2, '0')})`;
  };
  
  // Check if a reservation falls within the current time filter
  const isWithinTimeFilter = (reservation) => {
    if (!timeFilter.enabled) return true;
    
    const reservationStart = formatTime(reservation.start_time);
    const reservationEnd = formatTime(reservation.end_time);
    
    // If reservation period overlaps with filter period, show it
    return (reservationStart >= timeFilter.startTime && reservationStart <= timeFilter.endTime) ||
           (reservationEnd >= timeFilter.startTime && reservationEnd <= timeFilter.endTime) ||
           (reservationStart <= timeFilter.startTime && reservationEnd >= timeFilter.endTime);
  };
  
  // Filter tables based on time filter
  const getFilteredTables = () => {
    // First filter by section
    let filtered = tables.filter(table => table.section === activeSection);
    
    // If time filter is enabled, filter tables that have reservations in that time range
    if (timeFilter.enabled) {
      filtered = filtered.map(table => {
        // Create a new table object with filtered schedule
        const filteredTable = {...table};
        
        // If the table has a schedule, filter it
        if (filteredTable.schedule && filteredTable.schedule.length > 0) {
          filteredTable.schedule = filteredTable.schedule.filter(isWithinTimeFilter);
        }
        
        // If current client exists, check if they fall within filter
        if (filteredTable.current_client) {
          const now = new Date();
          const clientEndTime = new Date(filteredTable.current_client.end_time);
          const formattedNowTime = formatTime(now);
          const formattedEndTime = formatTime(clientEndTime);
          
          // If current client doesn't fall within time filter, remove it
          if (!(formattedNowTime >= timeFilter.startTime && formattedNowTime <= timeFilter.endTime) &&
              !(formattedEndTime >= timeFilter.startTime && formattedEndTime <= timeFilter.endTime)) {
            filteredTable.current_client = null;
          }
        }
        
        return filteredTable;
      });
    }
    
    return filtered;
  };
  
  // Connect to Socket.IO server
  useEffect(() => {
    // Create socket connection
    const socket = io('http://localhost:7000'); // Use your actual server URL
    socketRef.current = socket;
    
    socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      
      // Join room for real-time updates specific to this restaurant
      if (restaurantId) {
        socket.emit('joinRestaurant', restaurantId);
      }
    });
    
    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });
    
    // Handle floor layout updated event (refresh everything)
    socket.on('floorLayoutUpdated', (data) => {
      if (data.restaurantId === restaurantId) {
        console.log('Floor layout updated, refreshing data');
        fetchTables();
      }
    });
    
    // Handle table added event
    socket.on('tableAdded', (data) => {
      if (data.restaurantId === restaurantId) {
        console.log('Table added:', data.table);
        setTables(prevTables => [...prevTables, data.table]);
      }
    });
    
    // Handle table position updated event
    socket.on('tablePositionUpdated', (data) => {
      if (data.restaurantId === restaurantId) {
        console.log('Table position updated:', data);
        setTables(prevTables => 
          prevTables.map(table => {
            if (table.id === data.tableId || table._id === data.tableId) {
              return {
                ...table,
                x_position: data.x_position,
                y_position: data.y_position
              };
            }
            return table;
          })
        );
      }
    });
    
    // Handle table details updated event
    socket.on('tableDetailsUpdated', (data) => {
      if (data.restaurantId === restaurantId) {
        console.log('Table details updated:', data.table);
        setTables(prevTables => 
          prevTables.map(table => {
            if (table.id === data.table._id || table._id === data.table._id) {
              return {
                ...table,
                ...data.table
              };
            }
            return table;
          })
        );
      }
    });
    
    // Handle table deleted event
    socket.on('tableDeleted', (data) => {
      if (data.restaurantId === restaurantId) {
        console.log('Table deleted:', data.tableId);
        setTables(prevTables => 
          prevTables.filter(table => (
            table.id !== data.tableId && table._id !== data.tableId
          ))
        );
        
        // Close details modal if it was for the deleted table
        if (selectedTable && (selectedTable.id === data.tableId || selectedTable._id === data.tableId)) {
          setSelectedTable(null);
        }
      }
    });
    
    // Handle reservation assigned to table event
    socket.on('reservationAssigned', (data) => {
      if (data.restaurantId === restaurantId) {
        console.log('Reservation assigned:', data);
        fetchTables(); // Easier to refresh all tables
      }
    });
    
    // Handle table status updated event
    socket.on('tableStatusUpdated', (data) => {
      if (data.restaurantId === restaurantId) {
        console.log('Table status updated:', data);
        setTables(prevTables => 
          prevTables.map(table => {
            if (table.id === data.tableId || table._id === data.tableId) {
              return {
                ...table,
                status: data.status
              };
            }
            return table;
          })
        );
      }
    });
    
    // Clean up on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [restaurantId]);
  
  // Fetch tables data
  const fetchTables = async () => {
    try {
      setLoading(true);
      
      const apiUrl = 'http://localhost:7000';
      const formattedDate = formatDateForApi(selectedDate);
      const response = await fetch(`${apiUrl}/restaurant/${restaurantId}/floor-layout?date=${formattedDate}`, {
        headers: {
          'Authorization': localStorage.getItem('token') || ''
        }
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch tables');
      }
      
      setTables(data.layout || []);
      
      // Extract unique sections
      if (data.layout && data.layout.length > 0) {
        const uniqueSections = [...new Set(data.layout.map(table => table.section || 'main'))];
        setSections(uniqueSections);
        
        // Only set active section if current one doesn't exist in new sections
        if (!uniqueSections.includes(activeSection)) {
          setActiveSection(uniqueSections[0]);
        }
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching tables:', err);
      setError('Failed to load tables. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch tables when component mounts or date changes
  useEffect(() => {
    if (restaurantId) {
      fetchTables();
    }
  }, [restaurantId, selectedDate]);
  
  // Handle zoom in/out
  const handleZoomChange = (change) => {
    setZoomLevel(prevZoom => {
      const newZoom = prevZoom + change;
      return Math.min(Math.max(50, newZoom), 200); // Limit between 50% and 200%
    });
  };
  
  // Start dragging a table
  const handleDragStart = (e, tableId) => {
    if (!editMode) return;
    
    setDraggedTable(tableId);
    e.dataTransfer.effectAllowed = 'move';
    // Required for Firefox
    e.dataTransfer.setData('text/plain', tableId);
  };
  
  // Allow dropping
  const handleDragOver = (e) => {
    if (!editMode || !draggedTable) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  // Handle drop to position table
  const handleDrop = (e) => {
    if (!editMode || !draggedTable) return;
    
    e.preventDefault();
    
    // Get floor plan dimensions and position
    const floorPlan = floorPlanRef.current;
    if (!floorPlan) return;
    
    const floorPlanRect = floorPlan.getBoundingClientRect();
    
    // Calculate new position relative to floor plan
    const x = e.clientX - floorPlanRect.left;
    const y = e.clientY - floorPlanRect.top;
    
    // Update table position
    updateTablePosition(draggedTable, x, y);
    
    setDraggedTable(null);
  };
  
  // API call to update table position
  const updateTablePosition = async (tableId, x, y) => {
    try {
      const apiUrl = 'http://localhost:7000';
      const response = await fetch(`${apiUrl}/tables/${tableId}/position`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('token') || ''
        },
        body: JSON.stringify({
          x_position: Math.max(0, x),
          y_position: Math.max(0, y)
        }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to update table position');
      }
      
      // Table will be updated via Socket.IO event
    } catch (error) {
      console.error('Error updating table position:', error);
      setError('Failed to update table position. Please try again.');
    }
  };
  
  // Handle table selection
  const handleTableClick = (table) => {
    if (editMode) {
      setSelectedTable(table);
    } else {
      fetchTableDetails(table.id);
    }
  };
  
  // Fetch detailed table information including all reservations
  const fetchTableDetails = async (tableId) => {
    try {
      const apiUrl = 'http://localhost:7000';
      const formattedDate = formatDateForApi(selectedDate);
      
      const response = await fetch(`${apiUrl}/tables/${tableId}/reservations?date=${formattedDate}`, {
        headers: {
          'Authorization': localStorage.getItem('token') || ''
        }
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch table details');
      }
      
      // Find the table in our current state and combine with reservation data
      const tableInfo = tables.find(t => t.id === tableId || t._id === tableId);
      
      if (tableInfo) {
        setSelectedTable({
          ...tableInfo,
          reservations: data.reservations || []
        });
      }
    } catch (error) {
      console.error('Error fetching table details:', error);
      setError('Failed to load table details. Please try again.');
    }
  };
  
  // Close table details modal
  const handleCloseDetails = () => {
    setSelectedTable(null);
  };
  
  // Handle form input changes for new table
  const handleNewTableInputChange = (e) => {
    const { name, value } = e.target;
    setNewTableData({
      ...newTableData,
      [name]: name === 'table_number' ? value : 
              (name === 'seats' || name === 'size' || 
               name === 'width' || name === 'height' || 
               name === 'x_position' || name === 'y_position') ? 
              parseInt(value, 10) : value
    });
  };
  
  // Submit new table form
  const handleAddTable = async (e) => {
    e.preventDefault();
    
    try {
      const apiUrl = 'http://localhost:7000';
      const response = await fetch(`${apiUrl}/tables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('token') || ''
        },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          ...newTableData
        }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to add table');
      }
      
      // Table will be added via Socket.IO event
      
      // Reset form and hide it
      setNewTableData({
        table_number: '',
        seats: 2,
        shape: 'square',
        size: 100,
        width: 100,
        height: 100,
        section: activeSection,
        x_position: 50,
        y_position: 50
      });
      setShowAddForm(false);
      
    } catch (error) {
      console.error('Error adding table:', error);
      setError('Failed to add table. Please try again.');
    }
  };
  
  // Update existing table
  const handleUpdateTable = async (tableId, updateData) => {
    try {
      const apiUrl = 'http://localhost:7000';
      const response = await fetch(`${apiUrl}/tables/${tableId}/details`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('token') || ''
        },
        body: JSON.stringify(updateData),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to update table');
      }
      
      // Table will be updated via Socket.IO event
      
      // Close details modal
      setSelectedTable(null);
      
    } catch (error) {
      console.error('Error updating table:', error);
      setError('Failed to update table. Please try again.');
    }
  };
  
  // Delete a table
  const handleDeleteTable = async (tableId) => {
    if (!window.confirm('Are you sure you want to delete this table?')) {
      return;
    }
    
    try {
      const apiUrl = 'http://localhost:7000';
      const response = await fetch(`${apiUrl}/tables/${tableId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': localStorage.getItem('token') || ''
        }
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to delete table');
      }
      
      // Table will be removed via Socket.IO event
      
    } catch (error) {
      console.error('Error deleting table:', error);
      setError('Failed to delete table. Please try again.');
    }
  };
  
  // Add a new section
  const handleAddSection = () => {
    const sectionName = prompt('Enter new section name:');
    if (sectionName && !sections.includes(sectionName)) {
      setSections([...sections, sectionName]);
      setActiveSection(sectionName);
    }
  };
  
  // Handle resizing the floor plan
  const handleFloorPlanResize = (dimension, value) => {
    setFloorPlanSize(prev => ({
      ...prev,
      [dimension]: value
    }));
  };
  
  // Render table based on its shape and status with reservation information
  const renderTable = (table) => {
    const isSelected = selectedTable && (selectedTable.id === table.id || selectedTable._id === table._id);
    const isDragging = draggedTable === table.id || draggedTable === table._id;
    
    let statusClass = '';
    switch(table.status?.toLowerCase()) {
      case 'available':
        statusClass = 'mgt-table-available';
        break;
      case 'reserved':
        statusClass = 'mgt-table-reserved';
        break;
      case 'occupied':
        statusClass = 'mgt-table-occupied';
        break;
      case 'maintenance':
      case 'inactive':
        statusClass = 'mgt-table-maintenance';
        break;
      default:
        statusClass = 'mgt-table-available';
    }
    
    // Determine dimensions based on shape
    let width, height;
    if (table.shape === 'round') {
      width = height = table.size || 100;
    } else {
      width = table.width || 100;
      height = table.height || 100;
    }
    
    // Apply zoom level to dimensions and position
    const zoomFactor = zoomLevel / 100;
    
    const style = {
      left: `${table.x_position * zoomFactor}px`,
      top: `${table.y_position * zoomFactor}px`,
      width: `${width * zoomFactor}px`,
      height: `${height * zoomFactor}px`,
      transform: `scale(${zoomFactor})`,
      transformOrigin: 'top left'
    };
    
    // Check if we have schedule entries for this table
    const hasSchedule = table.schedule && table.schedule.length > 0;
    
    // Base table element with new design
    return (
      <div 
        className={`mgt-table ${table.shape === 'round' ? 'mgt-table-round' : ''} ${statusClass} ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
        style={style}
        onClick={() => handleTableClick(table)}
        draggable={editMode}
        onDragStart={(e) => handleDragStart(e, table.id || table._id)}
      >
        {/* Table header with number and seats */}
        <div className="mgt-table-header">
          <span className="mgt-table-number">{table.table_number}</span>
          <span className="mgt-table-seats">{table.seats}</span>
        </div>
        
        {/* Reservation schedule display */}
        <div className="mgt-table-reservations">
          {hasSchedule && table.schedule.map((reservation, index) => (
            <div 
              key={reservation.id || index} 
              className={`mgt-reservation ${reservation.is_current ? 'current-reservation' : ''}`}
            >
              <div className="mgt-client-name">
                {reservation.client_name || 
                 `${reservation.first_name || 'Guest'} ${reservation.last_name || ''}`}
              </div>
              <div className="mgt-reservation-time">
                {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
              </div>
              <div className="mgt-reservation-duration">
                {formatDuration(reservation.start_time, reservation.end_time)}
              </div>
              <div className="mgt-guest-count">{reservation.guests}</div>
            </div>
          ))}
          
          {!hasSchedule && (
            <div className="mgt-empty-table">Available</div>
          )}
        </div>
      </div>
    );
  };
  
  if (loading && tables.length === 0) {
    return (
      <div className="mgt-container">
        <div className="mgt-loading">Loading tables data...</div>
      </div>
    );
  }
  
  if (error && tables.length === 0) {
    return (
      <div className="mgt-container">
        <div className="mgt-error">{error}</div>
      </div>
    );
  }
  
  // Get filtered tables
  const filteredTables = getFilteredTables();
  
  return (
    <div className="mgt-container">
      <div className="mgt-controls-panel">
        <div className="mgt-header">
          <h1>Table Management</h1>
          <div className="mgt-date-time-filters">
            <div className="mgt-date-picker">
              <label>Date:</label>
              <input 
                type="date" 
                className="mgt-date-selector"
                value={formatDateForApi(selectedDate)}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
              />
            </div>
            
            <div className="mgt-time-filter">
              <div className="mgt-time-filter-header">
                <label>
                  <input 
                    type="checkbox" 
                    checked={timeFilter.enabled}
                    onChange={() => setTimeFilter(prev => ({...prev, enabled: !prev.enabled}))}
                  />
                  Filter by time
                </label>
              </div>
              
              {timeFilter.enabled && (
                <div className="mgt-time-range">
                  <div className="mgt-time-input">
                    <label>From:</label>
                    <input 
                      type="time" 
                      value={timeFilter.startTime}
                      onChange={(e) => setTimeFilter(prev => ({...prev, startTime: e.target.value}))}
                    />
                  </div>
                  <div className="mgt-time-input">
                    <label>To:</label>
                    <input 
                      type="time" 
                      value={timeFilter.endTime}
                      onChange={(e) => setTimeFilter(prev => ({...prev, endTime: e.target.value}))}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="mgt-actions">
            <button 
              className={`mgt-btn ${editMode ? 'mgt-btn-active' : ''}`}
              onClick={() => setEditMode(!editMode)}
            >
              {editMode ? 'Exit Edit Mode' : 'Edit Layout'}
            </button>
            
            {editMode && (
              <button 
                className="mgt-btn mgt-btn-add"
                onClick={() => setShowAddForm(true)}
              >
                Add New Table
              </button>
            )}
          </div>
        </div>
        
        {error && <div className="mgt-error-message">{error}</div>}
        
        <div className="mgt-controls-row">
          <div className="mgt-sections">
            {sections.map((section) => (
              <button 
                key={section}
                className={`mgt-section-btn ${activeSection === section ? 'active' : ''}`}
                onClick={() => setActiveSection(section)}
              >
                {section}
              </button>
            ))}
            {editMode && (
              <button 
                className="mgt-section-btn mgt-add-section-btn"
                onClick={handleAddSection}
              >
                + Add Section
              </button>
            )}
          </div>
          
          <div className="mgt-floor-plan-controls">
            <div className="mgt-zoom-controls">
              <button className="mgt-btn mgt-zoom-btn" onClick={() => handleZoomChange(-10)}>−</button>
              <span>{zoomLevel}%</span>
              <button className="mgt-btn mgt-zoom-btn" onClick={() => handleZoomChange(10)}>+</button>
            </div>
            
            <div className="mgt-size-controls">
              <label>Height:</label>
              <select 
                value={floorPlanSize.height} 
                onChange={(e) => handleFloorPlanResize('height', parseInt(e.target.value, 10))}
              >
                <option value={500}>Small (500px)</option>
                <option value={600}>Medium (600px)</option>
                <option value={800}>Large (800px)</option>
                <option value={1000}>Extra Large (1000px)</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="mgt-status-legend">
          <div className="mgt-legend-item">
            <div className="mgt-legend-color mgt-table-available"></div>
            <span>Available</span>
          </div>
          <div className="mgt-legend-item">
            <div className="mgt-legend-color mgt-table-reserved"></div>
            <span>Reserved</span>
          </div>
          <div className="mgt-legend-item">
            <div className="mgt-legend-color mgt-table-occupied"></div>
            <span>Occupied</span>
          </div>
          <div className="mgt-legend-item">
            <div className="mgt-legend-color mgt-table-maintenance"></div>
            <span>Maintenance/Inactive</span>
          </div>
        </div>
      </div>
      
      <div 
        className="mgt-floor-plan-container"
        style={{ height: `${floorPlanSize.height}px` }}
      >
        <div 
          className="mgt-floor-plan"
          ref={floorPlanRef}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          style={{ 
            width: floorPlanSize.width, 
            height: '100%', 
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'top left'
          }}
        >
          {filteredTables.map(table => renderTable(table))}
          
          {editMode && (
            <div className="mgt-edit-instructions">
              {draggedTable ? 'Drop table to place it' : 'Drag tables to reposition them'}
            </div>
          )}
        </div>
      </div>
      
      {/* Add New Table Form Modal */}
      {showAddForm && (
        <div className="mgt-modal-overlay">
          <div className="mgt-modal">
            <div className="mgt-modal-header">
              <h2>Add New Table</h2>
              <button className="mgt-modal-close" onClick={() => setShowAddForm(false)}>×</button>
            </div>
            
            <form className="mgt-table-form" onSubmit={handleAddTable}>
              <div className="mgt-form-group">
                <label>Table Number:</label>
                <input 
                  type="text" 
                  name="table_number"
                  value={newTableData.table_number}
                  onChange={handleNewTableInputChange}
                  required
                />
              </div>
              
              <div className="mgt-form-group">
                <label>Seats:</label>
                <input 
                  type="number" 
                  name="seats"
                  value={newTableData.seats}
                  onChange={handleNewTableInputChange}
                  min="1"
                  required
                />
              </div>
              
              <div className="mgt-form-group">
                <label>Shape:</label>
                <select 
                  name="shape"
                  value={newTableData.shape}
                  onChange={handleNewTableInputChange}
                >
                  <option value="square">Square</option>
                  <option value="round">Round</option>
                  <option value="rectangle">Rectangle</option>
                </select>
              </div>
              
              {newTableData.shape === 'round' ? (
                <div className="mgt-form-group">
                  <label>Size (diameter in px):</label>
                  <input 
                    type="number" 
                    name="size"
                    value={newTableData.size}
                    onChange={handleNewTableInputChange}
                    min="50"
                    required
                  />
                </div>
              ) : (
                <>
                  <div className="mgt-form-group">
                    <label>Width (px):</label>
                    <input 
                      type="number" 
                      name="width"
                      value={newTableData.width}
                      onChange={handleNewTableInputChange}
                      min="50"
                      required
                    />
                  </div>
                  
                  <div className="mgt-form-group">
                    <label>Height (px):</label>
                    <input 
                      type="number" 
                      name="height"
                      value={newTableData.height}
                      onChange={handleNewTableInputChange}
                      min="50"
                      required
                    />
                  </div>
                </>
              )}
              
              <div className="mgt-form-group">
                <label>Section:</label>
                <select 
                  name="section"
                  value={newTableData.section}
                  onChange={handleNewTableInputChange}
                >
                  {sections.map((section) => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </select>
              </div>
              
              <div className="mgt-form-actions">
                <button 
                  type="button" 
                  className="mgt-btn mgt-btn-cancel"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="mgt-btn mgt-btn-save"
                >
                  Add Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Table Details Modal */}
      {selectedTable && (
        <div className="mgt-modal-overlay">
          <div className="mgt-modal">
            <div className="mgt-modal-header">
              <h2>Table {selectedTable.table_number} Details</h2>
              <button className="mgt-modal-close" onClick={handleCloseDetails}>×</button>
            </div>
            
            <div className="mgt-modal-content">
              <div className="mgt-table-details">
                <div className="mgt-detail-row">
                  <div className="mgt-detail-label">Status:</div>
                  <div className="mgt-detail-value">
                    <span className={`mgt-status-badge mgt-status-${selectedTable.status?.toLowerCase() || 'available'}`}>
                      {selectedTable.status || 'Available'}
                    </span>
                  </div>
                </div>
                
                <div className="mgt-detail-row">
                  <div className="mgt-detail-label">Seats:</div>
                  <div className="mgt-detail-value">{selectedTable.seats} people</div>
                </div>
                
                <div className="mgt-detail-row">
                  <div className="mgt-detail-label">Section:</div>
                  <div className="mgt-detail-value">{selectedTable.section}</div>
                </div>
                
                <div className="mgt-detail-row">
                  <div className="mgt-detail-label">Shape:</div>
                  <div className="mgt-detail-value">{selectedTable.shape}</div>
                </div>
                
                {selectedTable.shape === 'round' ? (
                  <div className="mgt-detail-row">
                    <div className="mgt-detail-label">Size:</div>
                    <div className="mgt-detail-value">{selectedTable.size}px</div>
                  </div>
                ) : (
                  <div className="mgt-detail-row">
                    <div className="mgt-detail-label">Dimensions:</div>
                    <div className="mgt-detail-value">{selectedTable.width}px × {selectedTable.height}px</div>
                  </div>
                )}
              </div>
              
              {/* Current client if table is occupied */}
              {selectedTable.current_client && (
                <div className="mgt-reservation-details">
                  <h3>Current Customer</h3>
                  
                  <div className="mgt-detail-row">
                    <div className="mgt-detail-label">Name:</div>
                    <div className="mgt-detail-value">{selectedTable.current_client.name}</div>
                  </div>
                  
                  <div className="mgt-detail-row">
                    <div className="mgt-detail-label">Guests:</div>
                    <div className="mgt-detail-value">{selectedTable.current_client.guests}</div>
                  </div>
                  
                  <div className="mgt-detail-row">
                    <div className="mgt-detail-label">End Time:</div>
                    <div className="mgt-detail-value">{formatTime(selectedTable.current_client.end_time)}</div>
                  </div>
                </div>
              )}
              
              {/* All reservations for today */}
              {selectedTable.schedule && selectedTable.schedule.length > 0 && (
                <div className="mgt-reservation-details">
                  <h3>Today's Reservations</h3>
                  
                  {selectedTable.schedule.map((reservation, index) => (
                    <div key={reservation.id || index} className="mgt-reservation-item">
                      <div className="mgt-detail-row">
                        <div className="mgt-detail-label">Time:</div>
                        <div className="mgt-detail-value">
                          {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
                          {" "}{formatDuration(reservation.start_time, reservation.end_time)}
                        </div>
                      </div>
                      
                      <div className="mgt-detail-row">
                        <div className="mgt-detail-label">Customer:</div>
                        <div className="mgt-detail-value">
                          {reservation.client_name || 
                           `${reservation.first_name || 'Guest'} ${reservation.last_name || ''}`}
                        </div>
                      </div>
                      
                      <div className="mgt-detail-row">
                        <div className="mgt-detail-label">Guests:</div>
                        <div className="mgt-detail-value">{reservation.guests}</div>
                      </div>
                      
                      <div className="mgt-detail-row">
                        <div className="mgt-detail-label">Status:</div>
                        <div className="mgt-detail-value">
                          <span className={`mgt-reservation-status mgt-reservation-${reservation.status?.toLowerCase() || 'planning'}`}>
                            {reservation.status}
                          </span>
                        </div>
                      </div>
                      
                      {index < selectedTable.schedule.length - 1 && (
                        <hr className="mgt-reservation-divider" />
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {editMode ? (
                <div className="mgt-table-actions">
                  <button 
                    className="mgt-btn mgt-btn-edit"
                    onClick={() => {
                      const seats = prompt('Enter new seats capacity:', selectedTable.seats);
                      if (seats && !isNaN(parseInt(seats, 10))) {
                        handleUpdateTable(selectedTable.id || selectedTable._id, { seats: parseInt(seats, 10) });
                      }
                    }}
                  >
                    Edit Seats
                  </button>
                  
                  <button 
                    className="mgt-btn mgt-btn-edit"
                    onClick={() => {
                      const section = prompt('Enter new section:', selectedTable.section);
                      if (section) {
                        handleUpdateTable(selectedTable.id || selectedTable._id, { section });
                        
                        // Add new section if it doesn't exist
                        if (!sections.includes(section)) {
                          setSections([...sections, section]);
                        }
                      }
                    }}
                  >
                    Change Section
                  </button>
                  
                  {!selectedTable.current_client && (
                    <button 
                      className="mgt-btn mgt-btn-edit"
                      onClick={() => {
                        const statusOptions = ['available', 'reserved', 'maintenance', 'inactive'];
                        const status = prompt(`Enter new status (${statusOptions.join('/')}):`, selectedTable.status);
                        if (status && statusOptions.includes(status)) {
                          handleUpdateTable(selectedTable.id || selectedTable._id, { status });
                        }
                      }}
                    >
                      Change Status
                    </button>
                  )}
                  
                  <button 
                    className="mgt-btn mgt-btn-delete"
                    onClick={() => handleDeleteTable(selectedTable.id || selectedTable._id)}
                  >
                    Delete Table
                  </button>
                </div>
              ) : (
                <div className="mgt-table-actions">
                  {selectedTable.status === 'available' && (
                    <button 
                      className="mgt-btn mgt-btn-reserve"
                      onClick={() => handleMakeReservation(selectedTable)}
                    >
                      Make Reservation
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagementTables;