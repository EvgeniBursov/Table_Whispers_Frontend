import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import './ManagementTables.css';
const API_URL = import.meta.env.VITE_BACKEND_API || 'http://localhost:5000';
import ManagementNewReservationForm from '../ManagementDashboardComponents/ManagementNewReservationForm'


/**
 * ManagementTables Component - Improved Version
 * Displays and manages restaurant tables and their reservations
 * Features:
 * - Working date filter
 * - Simplified visualization focusing on reservations
 * - Fixed status filtering
 * - Optimized code structure and improved readability
 */
const ManagementTables = ({ restaurantId }) => {
  // Main state
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Filter and view state
  const [timeFilter, setTimeFilter] = useState({
    enabled: false,
    startTime: '00:00',
    endTime: '23:59'
  });
  const [sections, setSections] = useState(['main']);
  const [activeSection, setActiveSection] = useState('main');
  const [floorPlanSize, setFloorPlanSize] = useState({ width: '100%', height: 600 });
  const [zoomLevel, setZoomLevel] = useState(100);
  const [statusFilter, setStatusFilter] = useState(''); // Empty to start - show all reservations
  
  // Form data
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
  const [newReservationData, setNewReservationData] = useState({
    client_email: '',
    client_name: '',
    guests: 2,
    start_time: '',
    tableId: null,
    tableNumber: null,
    date: formatDateForApi(new Date())
  });
  
  // UI state
  const [draggedTable, setDraggedTable] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  
  // Refs
  const floorPlanRef = useRef(null);
  const socketRef = useRef(null);
  
  // API base URL
  //const API_URL = 'http://localhost:5000';
  
  /**
   * Format date for API requests (YYYY-MM-DD)
   */
  function formatDateForApi(date) {
    if (!date) return '';
    
    // Handle string dates
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  /**
   * Format time for display (HH:MM format)
   */
  function formatTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
  
  /**
   * Format duration for display (H:MM format)
   */
  function formatDuration(startTime, endTime) {
    if (!startTime || !endTime) return '';
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMinutes = Math.round((end - start) / (1000 * 60));
    
    if (durationMinutes > 59) {
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      return `(${hours}:${String(minutes).padStart(2, '0')})`;
    }
    
    return `(${String(durationMinutes).padStart(2, '0')} min)`;
  }
  
  /**
   * Check if a reservation falls within the current time filter
   */
  const isWithinTimeFilter = (reservation) => {
    if (!timeFilter.enabled) return true;
    
    const reservationStart = formatTime(reservation.start_time);
    const reservationEnd = formatTime(reservation.end_time);
    
    // If reservation period overlaps with filter period, show it
    return (reservationStart >= timeFilter.startTime && reservationStart <= timeFilter.endTime) ||
           (reservationEnd >= timeFilter.startTime && reservationEnd <= timeFilter.endTime) ||
           (reservationStart <= timeFilter.startTime && reservationEnd >= timeFilter.endTime);
  };
  
  
  /**
   * Filter tables based on section, time, and reservation status
   */
  const getFilteredTables = useCallback(() => {
    console.log(`[FILTER] Filtering tables - Section: ${activeSection}, Status: ${statusFilter || 'All'}, Time filter: ${timeFilter.enabled ? 'Enabled' : 'Disabled'}`);
    
    // First filter by section
    let filtered = tables.filter(table => table.section === activeSection);
    
    // Apply time and status filters to reservations
    filtered = filtered.map(table => {
      // Create a new table object with filtered schedule
      const filteredTable = {...table};
      
      // If the table has a schedule, filter it by time and status
      if (filteredTable.schedule && filteredTable.schedule.length > 0) {
        const originalSchedule = [...filteredTable.schedule];
        
        filteredTable.schedule = filteredTable.schedule.filter(res => {
          // First check if we have a status to filter by
          const statusMatch = !statusFilter || 
                             (res.client_status && res.client_status.toLowerCase() === statusFilter.toLowerCase());
          
          // Then check time filter if enabled
          const timeMatch = timeFilter.enabled ? isWithinTimeFilter(res) : true;
          
          // Filter out DONE status reservations - only show PLANNING and SEATED
          const isDoneStatus = res.client_status && 
                              (res.client_status.toLowerCase() === 'done' || 
                               res.status && res.status.toLowerCase() === 'done');
          
          return statusMatch && timeMatch && !isDoneStatus;
        });
        
        if (originalSchedule.length > 0 && filteredTable.schedule.length === 0) {
          console.log(`[TABLE ${table.table_number}] All reservations filtered out. Original statuses: ${originalSchedule.map(r => r.client_status).join(', ')}`);
        }
      }
      
      return filteredTable;
    });
    
    // Count tables with reservations after filtering
    const tablesWithReservations = filtered.filter(table => 
      table.schedule && table.schedule.length > 0
    ).length;
    
    console.log(`[FILTER] After filtering: ${filtered.length} total tables, ${tablesWithReservations} with reservations`);
    
    return filtered;
  }, [tables, activeSection, statusFilter, timeFilter]);
  
  /**
   * Connect to Socket.IO server and set up event handlers
   */
  useEffect(() => {
    const socket = io(API_URL);
    socketRef.current = socket;
    
    socket.on('connect', () => {
      setSocketConnected(true);
      
      // Join room for real-time updates specific to this restaurant
      if (restaurantId) {
        socket.emit('joinRestaurant', restaurantId);
        socket.emit('joinRestaurantRoom', { restaurantId });
      }
    });
    
    socket.on('disconnect', () => {
      setSocketConnected(false);
    });
    
    // Setup event handlers for socket events
    const socketEvents = {
      'floorLayoutUpdated': (data) => {
        if (data.restaurantId === restaurantId) {
          console.log('[SOCKET] Floor layout updated:', data);
          fetchTables();
        }
      },
      'tableAdded': (data) => {
        if (data.restaurantId === restaurantId) {
          console.log('[SOCKET] Table added:', data.table);
          setTables(prevTables => [...prevTables, data.table]);
        }
      },
      'tablePositionUpdated': (data) => {
        if (data.restaurantId === restaurantId) {
          updateTableInState(data.tableId, {
            x_position: data.x_position,
            y_position: data.y_position
          });
        }
      },
      'tableDetailsUpdated': (data) => {
        if (data.restaurantId === restaurantId) {
          console.log('[SOCKET] Table details updated:', data.table);
          updateTableInState(data.table._id, data.table);
        }
      },
      'tableDeleted': (data) => {
        if (data.restaurantId === restaurantId) {
          console.log('[SOCKET] Table deleted:', data.tableId);
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
      },
      // Events that trigger a full table refresh
      'reservationAssigned': (data) => {
        if (data.restaurantId === restaurantId) {
          console.log('[SOCKET] Reservation assigned:', data);
          fetchTables();
        }
      },
      'reservationCreated': (data) => {
        if (data.restaurantId === restaurantId) {
          console.log('[SOCKET] Reservation created:', data.newReservation);
          fetchTables();
        }
      },
      'reservationStatusChanged': (data) => {
        if (data.restaurantId === restaurantId) {
          console.log('[SOCKET] Reservation status changed:', data.newStatus);
          fetchTables();
        }
      },
      'reservationUpdated': (data) => {
        if (data.restaurantId === restaurantId) {
          console.log('[SOCKET] Reservation updated');
          fetchTables();
        }
      },
      'clientCancelledReservation': (data) => {
        if (data.restaurantId === restaurantId) {
          console.log('[SOCKET] Reservation cancelled');
          fetchTables();
        }
      },
      'reservationDetailsChanged': (data) => {
        if (data.restaurantId === restaurantId) {
          console.log('[SOCKET] Reservation details changed:', data.updates);
          fetchTables();
        }
      },
      'tableStatusUpdated': (data) => {
        if (data.restaurantId === restaurantId) {
          console.log('[SOCKET] Table status updated:', data.status);
          updateTableInState(data.tableId, { status: data.status });
        }
      }
    };
    
    // Register all event handlers
    Object.entries(socketEvents).forEach(([event, handler]) => {
      socket.on(event, handler);
    });
    
    // Clean up on unmount
    return () => {
      if (socketRef.current) {
        if (restaurantId) {
          socketRef.current.emit('leaveRestaurantRoom', { restaurantId });
        }
        
        // Remove all event listeners
        Object.keys(socketEvents).forEach(event => {
          socket.off(event);
        });
        
        socketRef.current.disconnect();
      }
    };
  }, [restaurantId, API_URL]);
  
  /**
   * Helper to update a table in state
   */
  const updateTableInState = (tableId, updates) => {
    setTables(prevTables => 
      prevTables.map(table => {
        if (table.id === tableId || table._id === tableId) {
          return { ...table, ...updates };
        }
        return table;
      })
    );
    
    // Also update selected table if it's the one being updated
    if (selectedTable && (selectedTable.id === tableId || selectedTable._id === tableId)) {
      setSelectedTable(prev => ({ ...prev, ...updates }));
    }
  };
  
  /**
   * Fetch tables data from API
   */
  const fetchTables = useCallback(async () => {
    if (!restaurantId) return;
    
    try {
      setLoading(true);
      
      const formattedDate = formatDateForApi(selectedDate);
      console.log('[API] Fetching tables for date:', formattedDate);
      
      const response = await fetch(`${API_URL}/restaurant/${restaurantId}/floor-layout?date=${formattedDate}`, {
        headers: {
          'Authorization': localStorage.getItem('token') || ''
        }
      });
      
      const data = await response.json();
      console.log('[API] Tables response:', data);
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch tables');
      }
      
      // Process the tables data from the API
      const processedTables = (data.layout || []);
      console.log('[API] Received tables:', processedTables.length);
      setTables(processedTables);
      
      // Extract unique sections from tables
      if (processedTables.length > 0) {
        const uniqueSections = [...new Set(processedTables.map(table => table.section || 'main'))];
        setSections(uniqueSections);
        
        // Only set active section if current one doesn't exist in new sections
        if (!uniqueSections.includes(activeSection)) {
          setActiveSection(uniqueSections[0]);
        }
      }
      
      setError(null);
    } catch (err) {
      console.error('[API] Error fetching tables:', err);
      setError('Failed to load tables. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [restaurantId, selectedDate, activeSection, API_URL]);
  
  /**
   * Fetch tables when component mounts or date changes
   */
  useEffect(() => {
    fetchTables();
  }, [fetchTables, selectedDate]);
  
  /**
   * Handle zoom in/out of floor plan
   */
  const handleZoomChange = (change) => {
    setZoomLevel(prevZoom => {
      const newZoom = prevZoom + change;
      return Math.min(Math.max(50, newZoom), 200); // Limit between 50% and 200%
    });
  };
  
  /**
   * Start dragging a table (in edit mode)
   */
  const handleDragStart = (e, tableId) => {
    if (!editMode) return;
    
    setDraggedTable(tableId);
    e.dataTransfer.effectAllowed = 'move';
    // Required for Firefox
    e.dataTransfer.setData('text/plain', tableId);
  };
  
  /**
   * Allow dropping tables during drag
   */
  const handleDragOver = (e) => {
    if (!editMode || !draggedTable) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  /**
   * Handle dropping a table to reposition it
   */
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
  
  /**
   * API call to update table position
   */
  const updateTablePosition = async (tableId, x, y) => {
    try {
      const response = await fetch(`${API_URL}/tables/${tableId}/position`, {
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
  
  /**
   * Handle clicking on a table to view or edit
   */
  const handleTableClick = (table) => {
    if (editMode) {
      setSelectedTable(table);
    } else {
      fetchTableDetails(table.id || table._id);
    }
  };
  
  /**
   * Fetch detailed table information including reservations
   */
  const fetchTableDetails = async (tableId) => {
    try {
      const formattedDate = formatDateForApi(selectedDate);
      console.log(`[API] Fetching details for table ${tableId} on date ${formattedDate}`);
      
      const response = await fetch(`${API_URL}/tables/${tableId}/reservations?date=${formattedDate}`, {
        headers: {
          'Authorization': localStorage.getItem('token') || ''
        }
      });
      
      const data = await response.json();
      console.log('[API] Table details response:', data);
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch table details');
      }
      
      // Find the table in our current state
      const tableInfo = tables.find(t => t.id === tableId || t._id === tableId);
      
      if (!tableInfo) {
        console.log(`[API] Table with ID ${tableId} not found in local state`);
        return;
      }
      
      // Get reservations with status filtering if needed
      let reservations = data.reservations || [];
      console.log(`[API] Table has ${reservations.length} reservations`);
      
      if (reservations.length > 0) {
        console.log('[API] First reservation:', reservations[0]);
      }
      
      setSelectedTable({
        ...tableInfo,
        reservations: reservations
      });
    } catch (error) {
      console.error('[API] Error fetching table details:', error);
      setError('Failed to load table details. Please try again.');
    }
  };
  
  /**
   * Close table details modal
   */
  const handleCloseDetails = () => {
    setSelectedTable(null);
  };
  
  /**
   * Handle form input changes for new table
   */
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
  
  /**
   * Handle form input changes for new reservation
   */
  const handleNewReservationInputChange = (e) => {
    const { name, value } = e.target;
    setNewReservationData({
      ...newReservationData,
      [name]: name === 'guests' ? parseInt(value, 10) : value
    });
  };
  
  /**
   * Submit new table form
   */
  const handleAddTable = async (e) => {
    e.preventDefault();
    
    try {
      console.log('[API] Creating new table:', newTableData);
      
      const response = await fetch(`${API_URL}/tables`, {
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
      console.log('[API] Create table response:', data);
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to add table');
      }
      
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
      console.error('[API] Error adding table:', error);
      setError('Failed to add table. Please try again.');
    }
  };
  
  /**
   * Submit new reservation form
   */
  const handleAddReservation = async (e) => {
    e.preventDefault();
    
    if (!selectedTable) {
      setError('No table selected for reservation');
      return;
    }
    
    try {
      // Combine date and time for start time
      const dateObj = new Date(newReservationData.date);
      const [hours, minutes] = newReservationData.start_time.split(':').map(Number);
      dateObj.setHours(hours, minutes, 0, 0);
      
      const formattedStartTime = dateObj.toISOString();
      
      const requestData = {
        tableId: selectedTable.id || selectedTable._id,
        client_email: newReservationData.client_email,
        client_name: newReservationData.client_name,
        guests: newReservationData.guests,
        start_time: formattedStartTime,
        restaurant_id: restaurantId
      };
      
      console.log('[API] Creating new reservation:', requestData);
      
      const response = await fetch(`${API_URL}/tables/${selectedTable.id || selectedTable._id}/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('token') || ''
        },
        body: JSON.stringify(requestData),
      });
      
      const data = await response.json();
      console.log('[API] Create reservation response:', data);
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to create reservation');
      }
      
      // Reset form and hide it
      setNewReservationData({
        client_email: '',
        client_name: '',
        guests: 2,
        start_time: '',
        tableId: null,
        date: formatDateForApi(new Date())
      });
      setShowReservationForm(false);
      
      // Refresh tables to show the new reservation
      fetchTables();
      
    } catch (error) {
      console.error('[API] Error creating reservation:', error);
      setError('Failed to create reservation: ' + error.message);
    }
  };
  
  /**
   * Update existing table
   */
  const handleUpdateTable = async (tableId, updateData) => {
    try {
      console.log(`[API] Updating table ${tableId}:`, updateData);
      
      const response = await fetch(`${API_URL}/tables/${tableId}/details`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('token') || ''
        },
        body: JSON.stringify(updateData),
      });
      
      const data = await response.json();
      console.log('[API] Update table response:', data);
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to update table');
      }
      
      // Close details modal
      setSelectedTable(null);
      
    } catch (error) {
      console.error('[API] Error updating table:', error);
      setError('Failed to update table. Please try again.');
    }
  };
  
  /**
   * Delete a table
   */
  const handleDeleteTable = async (tableId) => {
    if (!window.confirm('Are you sure you want to delete this table?')) {
      return;
    }
    
    try {
      console.log(`[API] Deleting table ${tableId}`);
      
      const response = await fetch(`${API_URL}/tables/${tableId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': localStorage.getItem('token') || ''
        }
      });
      
      const data = await response.json();
      console.log('[API] Delete table response:', data);
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to delete table');
      }
      
      // Table will be removed via Socket.IO event
      
    } catch (error) {
      console.error('[API] Error deleting table:', error);
      setError('Failed to delete table. Please try again.');
    }
  };
  
  /**
   * Add a new section
   */
  const handleAddSection = () => {
    const sectionName = prompt('Enter new section name:');
    if (sectionName && !sections.includes(sectionName)) {
      setSections([...sections, sectionName]);
      setActiveSection(sectionName);
    }
  };
  
  /**
   * Handle resizing the floor plan
   */
  const handleFloorPlanResize = (dimension, value) => {
    setFloorPlanSize(prev => ({
      ...prev,
      [dimension]: value
    }));
  };
  
  /**
   * Open the reservation form for a specific table
   */
  const handleMakeReservation = (table) => {
    setSelectedTable(table);
    setShowReservationForm(true);
    
  };
  
  /**
   * Render a table with its shape and reservations
   */
  const renderTable = (table) => {
    const isSelected = selectedTable && (selectedTable.id === table.id || selectedTable._id === table._id);
    const isDragging = draggedTable === table.id || draggedTable === table._id;
    
    // Determine status class for styling
    let statusClass = '';
    // Use table_status if available, fall back to status for compatibility
    const tableStatus = (table.table_status || table.status || 'available').toLowerCase();
    
    switch(tableStatus) {
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
    
    // Filter schedule to only show active reservations (not DONE or CANCELLED)
    const filteredSchedule = table.schedule && table.schedule.length > 0
      ? table.schedule.filter(res => 
          !res.client_status || 
          (res.client_status.toLowerCase() !== 'done' && 
           res.client_status.toLowerCase() !== 'cancelled'))
      : [];
    
    const hasSchedule = filteredSchedule.length > 0;
    
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
          {hasSchedule && filteredSchedule.map((reservation, index) => (
            <div 
              key={reservation.id || index} 
              className={`mgt-reservation ${reservation.is_current ? 'current-reservation' : ''}`}
            >
              <div className="mgt-client-name">
                {reservation.client_name || 
                 `${reservation.first_name || ''} ${reservation.last_name || 'Guest'}`}
              </div>
              <div className="mgt-reservation-time">
                {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
              </div>
              <div className="mgt-reservation-duration">
                {formatDuration(reservation.start_time, reservation.end_time)}
              </div>
              <div className="mgt-guest-count">
                {reservation.guests}
              </div>
            </div>
          ))}
          
          {!hasSchedule && (
            <div className="mgt-empty-table">
              {table.table_status === 'available' ? 'Available' : table.table_status}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Loading state
  if (loading && tables.length === 0) {
    return <div className="mgt-container"><div className="mgt-loading">Loading tables data...</div></div>;
  }
  
  // Error state
  if (error && tables.length === 0) {
    return <div className="mgt-container"><div className="mgt-error">{error}</div></div>;
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
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  setSelectedDate(newDate);
                }}
              />
            </div>
            
            <div className="mgt-time-filter">
              <div className="mgt-time-filter-header">
                <label>
                  <input 
                    type="checkbox" 
                    checked={timeFilter.enabled}
                    onChange={() => {
                      setTimeFilter(prev => ({...prev, enabled: !prev.enabled}));
                    }}
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
            
            <div className="mgt-status-filter">
              <label>Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                }}
              >
                <option value="">All Statuses</option>
                <option value="planning">Planning</option>
                <option value="confirmed">Confirmed</option>
                <option value="seated">Seated</option>
              </select>
            </div>
          </div>
          
          <div className="mgt-actions">
            <button 
              className={`mgt-btn ${editMode ? 'mgt-btn-active' : ''}`}
              onClick={() => {
                setEditMode(!editMode);
              }}
            >
              {editMode ? 'Exit Edit Mode' : 'Edit Layout'}
            </button>
            
            {editMode && (
              <button 
                className="mgt-btn mgt-btn-add"
                onClick={() => {
                  setShowAddForm(true);
                }}
              >
                Add New Table
              </button>
            )}
            
            <button 
              className="mgt-btn mgt-btn-refresh"
              onClick={() => fetchTables()}
              title="Refresh Tables"
            >
              Refresh
            </button>
            
            <div className="mgt-socket-status">
              <span className={`mgt-socket-indicator ${socketConnected ? 'connected' : 'disconnected'}`}></span>
              {socketConnected ? 'Real-time updates active' : 'Real-time updates inactive'}
            </div>
          </div>
        </div>
        
        {error && <div className="mgt-error-message">{error}</div>}
        
        <div className="mgt-controls-row">
          <div className="mgt-sections">
            {sections.map((section) => (
              <button 
                key={section}
                className={`mgt-section-btn ${activeSection === section ? 'active' : ''}`}
                onClick={() => {
                  setActiveSection(section);
                }}
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
        
        <div className="mgt-status-info">
          <div className="mgt-info-message">
            Showing reservations with status: <strong>{statusFilter || 'All'}</strong>
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
          
          {filteredTables.length === 0 && (
            <div className="mgt-no-tables-message">
              {tables.length === 0 
                ? 'No tables found. Add tables to get started.' 
                : 'No tables match the current filter criteria.'}
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
      
      {showReservationForm && selectedTable && (
        <div className="mgt-modal-overlay">
          <div className="mgt-modal">
            <ManagementNewReservationForm
              restaurantId={restaurantId}
              restaurantData={{
                res_name: "Your Restaurant" 
              }}
              tableNumber={selectedTable}  
              tableId={selectedTable.id || selectedTable._id}
              isManagementReservation={true} 
              isManagementReservationList={false}
              onSave={(newReservation) => {
                console.log("New reservation created:", newReservation);
                setShowReservationForm(false);
                setSelectedTable(null);
                fetchTables();
              }}
              onCancel={() => {
                setShowReservationForm(false);
                setSelectedTable(null);
              }}
            />
          </div>
        </div>
      )}
      {/* Table Details Modal */}
      {selectedTable && !showReservationForm && !showAddForm && (
        <div className="mgt-modal-overlay">
          <div className="mgt-modal">
            <div className="mgt-modal-header">
              <h2>Table {selectedTable.table_number} Details</h2>
              <button className="mgt-modal-close" onClick={handleCloseDetails}>×</button>
            </div>
            
            <div className="mgt-modal-content">
              <div className="mgt-table-details">
                <div className="mgt-detail-row">
                  <div className="mgt-detail-label">Seats:</div>
                  <div className="mgt-detail-value">{selectedTable.seats} people</div>
                </div>
                
                <div className="mgt-detail-row">
                  <div className="mgt-detail-label">Section:</div>
                  <div className="mgt-detail-value">{selectedTable.section}</div>
                </div>
              </div>
              
              {/* All reservations for today */}
              {selectedTable.reservations && selectedTable.reservations.length > 0 && (
          <div className="mgt-reservation-details">
            <h3>Today's Reservations</h3>
           
            {/* Apply status filter here and exclude DONE status */}
            {(statusFilter 
               ? selectedTable.reservations.filter(res => 
                   res.client_status && 
                   res.client_status.toLowerCase() === statusFilter.toLowerCase() &&
                   res.client_status.toLowerCase() !== 'done')
               : selectedTable.reservations.filter(res => 
                   !res.client_status || 
                   res.client_status.toLowerCase() !== 'done')
             ).map((reservation, index) => (
              <div key={reservation.id || index} className="mgt-reservation-item">
                <div className="mgt-detail-row">
                  <div className="mgt-detail-label">Status:</div>
                  <div className="mgt-detail-value">
                    <span className={`mgt-reservation-status mgt-reservation-${reservation.client_status?.toLowerCase() || 'planning'}`}>
                      {reservation.client_status || 'Planning'}
                    </span>
                  </div>
                </div>
                
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
                     `${reservation.first_name || ''} ${reservation.last_name || 'Guest'}`}
                  </div>
                </div>
                
                <div className="mgt-detail-row">
                  <div className="mgt-detail-label">Guests:</div>
                  <div className="mgt-detail-value">{reservation.guests}</div>
                </div>
                
                {index < (statusFilter 
                    ? selectedTable.reservations.filter(res => 
                        res.client_status && 
                        res.client_status.toLowerCase() === statusFilter.toLowerCase() &&
                        res.client_status.toLowerCase() !== 'done')
                    : selectedTable.reservations.filter(res => 
                        !res.client_status || 
                        res.client_status.toLowerCase() !== 'done')
                  ).length - 1 && (
                  <hr className="mgt-reservation-divider" />
                )}
              </div>
            ))}
          </div>
        )}
        
        {selectedTable.reservations && selectedTable.reservations.length === 0 && (
          <div className="mgt-empty-reservations">
            <p>No reservations found for this table on the selected date.</p>
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
            
            <button 
              className="mgt-btn mgt-btn-delete"
              onClick={() => handleDeleteTable(selectedTable.id || selectedTable._id)}
            >
              Delete Table
            </button>
          </div>
        ) : (
          <div className="mgt-table-actions">
            <button 
              className="mgt-btn mgt-btn-reserve"
              onClick={() => handleMakeReservation(selectedTable)}
            >
              Make Reservation
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