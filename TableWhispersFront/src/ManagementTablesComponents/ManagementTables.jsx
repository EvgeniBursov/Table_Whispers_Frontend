import React, { useState, useEffect, useRef } from 'react';
import './ManagementTables.css';

const ManagementTables = ({ restaurantId }) => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTableData, setNewTableData] = useState({
    table_number: '',
    seats: 2,
    shape: 'square',
    size: 100, // for round tables
    width: 100, // for rectangle/square tables
    height: 100, // for rectangle/square tables
    section: 'main',
    x_position: 50,
    y_position: 50
  });
  const [draggedTable, setDraggedTable] = useState(null);
  const [sections, setSections] = useState(['main']);
  const [activeSection, setActiveSection] = useState('main');
  
  const floorPlanRef = useRef(null);
  
  // Fetch tables data
  useEffect(() => {
    const fetchTables = async () => {
      try {
        setLoading(true);
        
        const apiUrl = 'http://localhost:7000';
        const response = await fetch(`${apiUrl}/restaurant/${restaurantId}/tables`, {
          headers: {
            'Authorization': localStorage.getItem('token') || ''
          }
        });
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch tables');
        }
        
        setTables(data.tables);
        
        // Extract unique sections
        if (data.tables && data.tables.length > 0) {
          const uniqueSections = [...new Set(data.tables.map(table => table.section))];
          setSections(uniqueSections);
          setActiveSection(uniqueSections[0]);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching tables:', err);
        setError('Failed to load tables. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTables();
  }, [restaurantId]);
  
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
      
      // Update tables in state
      setTables(prevTables => 
        prevTables.map(table => {
          if (table._id === tableId) {
            return {
              ...table,
              x_position: Math.max(0, x),
              y_position: Math.max(0, y)
            };
          }
          return table;
        })
      );
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
      setSelectedTable(table);
      // In non-edit mode, show reservation details if available
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
      
      // Add new table to state
      setTables([...tables, data.table]);
      
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
      
      // If this introduces a new section, add it to sections list
      if (!sections.includes(data.table.section)) {
        setSections([...sections, data.table.section]);
      }
      
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
      
      // Update tables in state
      setTables(prevTables => 
        prevTables.map(table => {
          if (table._id === tableId) {
            return {
              ...table,
              ...updateData
            };
          }
          return table;
        })
      );
      
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
      
      // Remove table from state
      setTables(prevTables => prevTables.filter(table => table._id !== tableId));
      
      // Close details modal if open
      if (selectedTable && selectedTable._id === tableId) {
        setSelectedTable(null);
      }
      
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
  
  // Render table based on its shape and status
  const renderTable = (table) => {
    const isSelected = selectedTable && selectedTable._id === table._id;
    const isDragging = draggedTable === table._id;
    
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
    
    const style = {
      left: `${table.x_position}px`,
      top: `${table.y_position}px`,
      width: `${width}px`,
      height: `${height}px`
    };
    
    let tableElement;
    
    switch(table.shape) {
      case 'round':
        tableElement = (
          <div 
            className={`mgt-table mgt-table-round ${statusClass} ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
            style={{
              ...style,
              borderRadius: '50%'
            }}
            onClick={() => handleTableClick(table)}
            draggable={editMode}
            onDragStart={(e) => handleDragStart(e, table._id)}
          >
            <span className="mgt-table-number">{table.table_number}</span>
            <span className="mgt-table-capacity">{table.seats}</span>
          </div>
        );
        break;
      case 'rectangle':
        tableElement = (
          <div 
            className={`mgt-table mgt-table-rectangle ${statusClass} ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
            style={style}
            onClick={() => handleTableClick(table)}
            draggable={editMode}
            onDragStart={(e) => handleDragStart(e, table._id)}
          >
            <span className="mgt-table-number">{table.table_number}</span>
            <span className="mgt-table-capacity">{table.seats}</span>
          </div>
        );
        break;
      default: // square
        tableElement = (
          <div 
            className={`mgt-table mgt-table-square ${statusClass} ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
            style={style}
            onClick={() => handleTableClick(table)}
            draggable={editMode}
            onDragStart={(e) => handleDragStart(e, table._id)}
          >
            <span className="mgt-table-number">{table.table_number}</span>
            <span className="mgt-table-capacity">{table.seats}</span>
          </div>
        );
    }
    
    return tableElement;
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
  
  // Filter tables by active section
  const filteredTables = tables.filter(table => table.section === activeSection);
  
  return (
    <div className="mgt-container">
      <div className="mgt-header">
        <h1>Table Management</h1>
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
      
      <div 
        className="mgt-floor-plan"
        ref={floorPlanRef}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {filteredTables.map(table => renderTable(table))}
        
        {editMode && (
          <div className="mgt-edit-instructions">
            {draggedTable ? 'Drop table to place it' : 'Drag tables to reposition them'}
          </div>
        )}
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
              
              {selectedTable.current_reservation && (
                <div className="mgt-reservation-details">
                  <h3>Current Reservation</h3>
                  
                  <div className="mgt-detail-row">
                    <div className="mgt-detail-label">Customer:</div>
                    <div className="mgt-detail-value">
                      {selectedTable.current_reservation.client_id ? 
                        `${selectedTable.current_reservation.client_id.first_name} ${selectedTable.current_reservation.client_id.last_name}` :
                        'Not available'}
                    </div>
                  </div>
                  
                  <div className="mgt-detail-row">
                    <div className="mgt-detail-label">Start Time:</div>
                    <div className="mgt-detail-value">
                      {selectedTable.current_reservation.start_time ? 
                        new Date(selectedTable.current_reservation.start_time).toLocaleString() :
                        'Not available'}
                    </div>
                  </div>
                  
                  <div className="mgt-detail-row">
                    <div className="mgt-detail-label">End Time:</div>
                    <div className="mgt-detail-value">
                      {selectedTable.current_reservation.end_time ? 
                        new Date(selectedTable.current_reservation.end_time).toLocaleString() :
                        'Not available'}
                    </div>
                  </div>
                  
                  <div className="mgt-detail-row">
                    <div className="mgt-detail-label">Guests:</div>
                    <div className="mgt-detail-value">
                      {selectedTable.current_reservation.guests || 'Not specified'}
                    </div>
                  </div>
                  
                  <div className="mgt-detail-row">
                    <div className="mgt-detail-label">Status:</div>
                    <div className="mgt-detail-value">
                      <span className={`mgt-reservation-status mgt-reservation-${selectedTable.current_reservation.status?.toLowerCase() || 'planning'}`}>
                        {selectedTable.current_reservation.status || 'Planning'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {editMode && (
                <div className="mgt-table-actions">
                  <button 
                    className="mgt-btn mgt-btn-edit"
                    onClick={() => {
                      const seats = prompt('Enter new seats capacity:', selectedTable.seats);
                      if (seats && !isNaN(parseInt(seats, 10))) {
                        handleUpdateTable(selectedTable._id, { seats: parseInt(seats, 10) });
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
                        handleUpdateTable(selectedTable._id, { section });
                        
                        // Add new section if it doesn't exist
                        if (!sections.includes(section)) {
                          setSections([...sections, section]);
                        }
                      }
                    }}
                  >
                    Change Section
                  </button>
                  
                  {!selectedTable.current_reservation && (
                    <button 
                      className="mgt-btn mgt-btn-edit"
                      onClick={() => {
                        const statusOptions = ['available', 'maintenance', 'inactive'];
                        const status = prompt(`Enter new status (${statusOptions.join('/')}):`, selectedTable.status);
                        if (status && statusOptions.includes(status)) {
                          handleUpdateTable(selectedTable._id, { status });
                        }
                      }}
                    >
                      Change Status
                    </button>
                  )}
                  
                  <button 
                    className="mgt-btn mgt-btn-delete"
                    onClick={() => handleDeleteTable(selectedTable._id)}
                  >
                    Delete Table
                  </button>
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