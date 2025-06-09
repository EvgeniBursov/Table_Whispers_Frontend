import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import './ManagementTables.css';
import BillModal from '../components/Bills/Bills';
const API_URL = import.meta.env.VITE_BACKEND_API || 'http://localhost:5000';
import ManagementNewReservationForm from '../ManagementDashboardComponents/ManagementNewReservationForm'

const ManagementTables = ({ restaurantId }) => {
  const formatDateForApiWithoutTimezone = (date) => {
    if (!date) return '';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    const year = dateObj.getUTCFullYear();
    const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const formatTimeWithoutTimezone = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
  };
  
  const formatDurationWithoutTimezone = (startTime, endTime) => {
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
  };

  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedBill, setSelectedBill] = useState(null);

  const [timeFilter, setTimeFilter] = useState({
    enabled: false,
    startTime: '00:00',
    endTime: '23:59'
  });
  const [sections, setSections] = useState(['main']);
  const [activeSection, setActiveSection] = useState('main');
  const [floorPlanSize, setFloorPlanSize] = useState({ width: '100%', height: 600 });
  const [zoomLevel, setZoomLevel] = useState(100);
  const [statusFilter, setStatusFilter] = useState('');
  
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
    date: formatDateForApiWithoutTimezone(new Date())
  });
  
  const [draggedTable, setDraggedTable] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  
  const floorPlanRef = useRef(null);
  const socketRef = useRef(null);

  const handleViewBill = (reservationId) => {
    setSelectedBill(reservationId);
  };

  const handleCloseBill = () => {
    setSelectedBill(null);
  };
  
  const isWithinTimeFilter = (reservation) => {
    if (!timeFilter.enabled) return true;
    
    const reservationStart = formatTimeWithoutTimezone(reservation.start_time);
    const reservationEnd = formatTimeWithoutTimezone(reservation.end_time);
    
    return (reservationStart >= timeFilter.startTime && reservationStart <= timeFilter.endTime) ||
           (reservationEnd >= timeFilter.startTime && reservationEnd <= timeFilter.endTime) ||
           (reservationStart <= timeFilter.startTime && reservationEnd >= timeFilter.endTime);
  };

  const getTableStatus = (table) => {
    if (!table.schedule || table.schedule.length === 0) {
      return 'available';
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    for (const reservation of table.schedule) {
      if (reservation.status && 
          (reservation.status.toLowerCase() === 'cancelled' || 
           reservation.status.toLowerCase() === 'cancel' ||
           reservation.status.toLowerCase() === 'done')) {
        continue;
      }

      const startTime = new Date(reservation.start_time);
      const endTime = new Date(reservation.end_time);
      const resStartMinutes = startTime.getHours() * 60 + startTime.getMinutes();
      const resEndMinutes = endTime.getHours() * 60 + endTime.getMinutes();
      
      if (currentTime >= resStartMinutes && currentTime <= resEndMinutes) {
        if (reservation.status?.toLowerCase() === 'seated') {
          return 'occupied';
        }
        return 'reserved';
      }
      
      if (currentTime < resStartMinutes) {
        return 'reserved';
      }
    }
    
    return 'available';
  };
  
  const getFilteredTables = useCallback(() => {
    console.log(`[FILTER] Filtering tables - Section: ${activeSection}, Status: ${statusFilter || 'All'}, Time filter: ${timeFilter.enabled ? 'Enabled' : 'Disabled'}`);
    
    let filtered = tables.filter(table => table.section === activeSection);
    
    filtered = filtered.map(table => {
      const filteredTable = {...table};
      
      if (filteredTable.schedule && filteredTable.schedule.length > 0) {
        const originalSchedule = [...filteredTable.schedule];
        
        filteredTable.schedule = filteredTable.schedule.filter(res => {
          const statusMatch = !statusFilter || 
                             (res.status && res.status.toLowerCase() === statusFilter.toLowerCase());
          
          const timeMatch = timeFilter.enabled ? isWithinTimeFilter(res) : true;
          
          const isDoneStatus = res.status && 
                              (res.status.toLowerCase() === 'done' || 
                               res.status && res.status.toLowerCase() === 'done');

          const isCancelledStatus = res.status && 
                                  (res.status.toLowerCase() === 'cancelled' || 
                                   res.status.toLowerCase() === 'cancel' ||
                                   res.status && (res.status.toLowerCase() === 'cancelled' || res.status.toLowerCase() === 'cancel'));
          
          return statusMatch && timeMatch && !isDoneStatus && !isCancelledStatus;
        });
        
        if (originalSchedule.length > 0 && filteredTable.schedule.length === 0) {
          console.log(`[TABLE ${table.table_number}] All reservations filtered out. Original statuses: ${originalSchedule.map(r => r.status).join(', ')}`);
        }
      }
      
      return filteredTable;
    });
    
    const tablesWithReservations = filtered.filter(table => 
      table.schedule && table.schedule.length > 0
    ).length;
    
    console.log(`[FILTER] After filtering: ${filtered.length} total tables, ${tablesWithReservations} with reservations`);
    
    return filtered;
  }, [tables, activeSection, statusFilter, timeFilter]);
  
  useEffect(() => {
    const socket = io(API_URL);
    socketRef.current = socket;
    
    socket.on('connect', () => {
      setSocketConnected(true);
      
      if (restaurantId) {
        socket.emit('joinRestaurant', restaurantId);
        socket.emit('joinRestaurantRoom', { restaurantId });
      }
    });
    
    socket.on('disconnect', () => {
      setSocketConnected(false);
    });
    
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
          
          if (selectedTable && (selectedTable.id === data.tableId || selectedTable._id === data.tableId)) {
            setSelectedTable(null);
          }
        }
      },
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
    
    Object.entries(socketEvents).forEach(([event, handler]) => {
      socket.on(event, handler);
    });
    
    return () => {
      if (socketRef.current) {
        if (restaurantId) {
          socketRef.current.emit('leaveRestaurantRoom', { restaurantId });
        }
        
        Object.keys(socketEvents).forEach(event => {
          socket.off(event);
        });
        
        socketRef.current.disconnect();
      }
    };
  }, [restaurantId, API_URL]);
  
  const updateTableInState = (tableId, updates) => {
    setTables(prevTables => 
      prevTables.map(table => {
        if (table.id === tableId || table._id === tableId) {
          return { ...table, ...updates };
        }
        return table;
      })
    );
    
    if (selectedTable && (selectedTable.id === tableId || selectedTable._id === tableId)) {
      setSelectedTable(prev => ({ ...prev, ...updates }));
    }
  };
  
  const fetchTables = useCallback(async () => {
    if (!restaurantId) return;
    
    try {
      setLoading(true);
      
      const formattedDate = formatDateForApiWithoutTimezone(selectedDate);
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
      
      const processedTables = (data.layout || []);
      console.log('[API] Received tables:', processedTables.length);
      setTables(processedTables);
      
      if (processedTables.length > 0) {
        const uniqueSections = [...new Set(processedTables.map(table => table.section || 'main'))];
        setSections(uniqueSections);
        
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
  
  useEffect(() => {
    fetchTables();
  }, [fetchTables, selectedDate]);
  
  const handleZoomChange = (change) => {
    setZoomLevel(prevZoom => {
      const newZoom = prevZoom + change;
      return Math.min(Math.max(50, newZoom), 200);
    });
  };
  
  const handleDragStart = (e, tableId) => {
    if (!editMode) return;
    
    setDraggedTable(tableId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tableId);
  };
  
  const handleDragOver = (e) => {
    if (!editMode || !draggedTable) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  const handleDrop = (e) => {
    if (!editMode || !draggedTable) return;
    
    e.preventDefault();
    
    const floorPlan = floorPlanRef.current;
    if (!floorPlan) return;
    
    const floorPlanRect = floorPlan.getBoundingClientRect();
    
    const x = e.clientX - floorPlanRect.left;
    const y = e.clientY - floorPlanRect.top;
    
    updateTablePosition(draggedTable, x, y);
    
    setDraggedTable(null);
  };
  
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
      
    } catch (error) {
      console.error('Error updating table position:', error);
      setError('Failed to update table position. Please try again.');
    }
  };
  
  const handleTableClick = (table) => {
    if (editMode) {
      setSelectedTable(table);
    } else {
      fetchTableDetails(table.id || table._id);
    }
  };
  
  const fetchTableDetails = async (tableId) => {
    try {
      const formattedDate = formatDateForApiWithoutTimezone(selectedDate);
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
      
      const tableInfo = tables.find(t => t.id === tableId || t._id === tableId);
      
      if (!tableInfo) {
        console.log(`[API] Table with ID ${tableId} not found in local state`);
        return;
      }
      
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
  
  const handleCloseDetails = () => {
    setSelectedTable(null);
  };
  
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
  
  const handleNewReservationInputChange = (e) => {
    const { name, value } = e.target;
    setNewReservationData({
      ...newReservationData,
      [name]: name === 'guests' ? parseInt(value, 10) : value
    });
  };
  
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
  
  const handleAddReservation = async (e) => {
    e.preventDefault();
    
    if (!selectedTable) {
      setError('No table selected for reservation');
      return;
    }
    
    try {
      const [hours, minutes] = newReservationData.start_time.split(':').map(Number);
      const dateStr = newReservationData.date;
      const [year, month, day] = dateStr.split('-').map(Number);
      
      const startDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
      const formattedStartTime = startDate.toISOString();
      
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
      
      setNewReservationData({
        client_email: '',
        client_name: '',
        guests: 2,
        start_time: '',
        tableId: null,
        date: formatDateForApiWithoutTimezone(new Date())
      });
      setShowReservationForm(false);
      
      fetchTables();
      
    } catch (error) {
      console.error('[API] Error creating reservation:', error);
      setError('Failed to create reservation: ' + error.message);
    }
  };
  
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
      
      setSelectedTable(null);
      
    } catch (error) {
      console.error('[API] Error updating table:', error);
      setError('Failed to update table. Please try again.');
    }
  };
  
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
      
    } catch (error) {
      console.error('[API] Error deleting table:', error);
      setError('Failed to delete table. Please try again.');
    }
  };
  
  const handleAddSection = () => {
    const sectionName = prompt('Enter new section name:');
    if (sectionName && !sections.includes(sectionName)) {
      setSections([...sections, sectionName]);
      setActiveSection(sectionName);
    }
  };
  
  const handleFloorPlanResize = (dimension, value) => {
    setFloorPlanSize(prev => ({
      ...prev,
      [dimension]: value
    }));
  };
  
  const handleMakeReservation = (table) => {
    setSelectedTable(table);
    setShowReservationForm(true);
  };

  const updateTableStatus = async (tableId, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/tables/${tableId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('token') || ''
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to update table status');
      }
      
      updateTableInState(tableId, { table_status: newStatus });
      
    } catch (error) {
      console.error('Error updating table status:', error);
      setError('Failed to update table status. Please try again.');
    }
  };
  
  const renderTable = (table) => {
    const isSelected = selectedTable && (selectedTable.id === table.id || selectedTable._id === table._id);
    const isDragging = draggedTable === table.id || draggedTable === table._id;
    
    const tableStatus = getTableStatus(table);
    
    let width, height;
    if (table.shape === 'round') {
      width = height = table.size || 100;
    } else {
      width = table.width || 100;
      height = table.height || 100;
    }
    
    const zoomFactor = zoomLevel / 100;
    
    const style = {
      left: `${table.x_position * zoomFactor}px`,
      top: `${table.y_position * zoomFactor}px`,
      width: `${width * zoomFactor}px`,
      height: `${height * zoomFactor}px`,
      transform: `scale(${zoomFactor})`,
      transformOrigin: 'top left'
    };
    
    const filteredSchedule = table.schedule && table.schedule.length > 0
      ? table.schedule.filter(res => 
          !res.status || 
          (res.status.toLowerCase() !== 'done' && 
           res.status.toLowerCase() !== 'cancelled' &&
           res.status.toLowerCase() !== 'cancel'))
      : [];
    
    const hasSchedule = filteredSchedule.length > 0;
    
    return (
      <div 
        className={`mgt-table mgt-table-${tableStatus} ${table.shape === 'round' ? 'mgt-table-round' : ''} ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
        style={style}
        onClick={() => handleTableClick(table)}
        draggable={editMode}
        onDragStart={(e) => handleDragStart(e, table.id || table._id)}
      >
        <div className="mgt-table-header">
          <span className="mgt-table-number">{table.table_number}</span>
          <span className="mgt-table-seats">{table.seats}</span>
        </div>
        
        <div className="mgt-table-status-indicator">
          <span className={`mgt-status-badge mgt-status-${tableStatus}`}>
            {tableStatus.charAt(0).toUpperCase() + tableStatus.slice(1)}
          </span>
        </div>
        
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
                {formatTimeWithoutTimezone(reservation.start_time)} - {formatTimeWithoutTimezone(reservation.end_time)}
              </div>
              <div className="mgt-reservation-duration">
                {formatDurationWithoutTimezone(reservation.start_time, reservation.end_time)}
              </div>
              <div className="mgt-guest-count">
                {reservation.guests} guests
              </div>
            </div>
          ))}
          
          {!hasSchedule && (
            <div className="mgt-empty-table">
              No reservations
            </div>
          )}
        </div>
      </div>
    );
  };
  
  if (loading && tables.length === 0) {
    return <div className="mgt-container"><div className="mgt-loading">Loading tables data...</div></div>;
  }
  
  if (error && tables.length === 0) {
    return <div className="mgt-container"><div className="mgt-error">{error}</div></div>;
  }
  
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
                value={formatDateForApiWithoutTimezone(selectedDate)}
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
            <div className="mgt-legend-color mgt-legend-available"></div>
            <span>Available</span>
          </div>
          <div className="mgt-legend-item">
            <div className="mgt-legend-color mgt-legend-reserved"></div>
            <span>Reserved</span>
          </div>
          <div className="mgt-legend-item">
            <div className="mgt-legend-color mgt-legend-occupied"></div>
            <span>Occupied</span>
          </div>
        </div>
        
        <div className="mgt-status-info">
          <div className="mgt-info-message">
            Showing reservations with status: <strong>{statusFilter || 'All'}</strong> (excluding cancelled)
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

                <div className="mgt-detail-row">
                  <div className="mgt-detail-label">Status:</div>
                  <div className="mgt-detail-value">
                    {editMode ? (
                      <select 
                        value={getTableStatus(selectedTable)}
                        onChange={(e) => updateTableStatus(selectedTable.id || selectedTable._id, e.target.value)}
                      >
                        <option value="available">Available</option>
                        <option value="reserved">Reserved</option>
                        <option value="occupied">Occupied</option>
                        <option value="maintenance">Maintenance</option>
                      </select>
                    ) : (
                      <span className={`mgt-status-badge mgt-status-${getTableStatus(selectedTable)}`}>
                        {getTableStatus(selectedTable).charAt(0).toUpperCase() + getTableStatus(selectedTable).slice(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {selectedTable.reservations && selectedTable.reservations.length > 0 && (
                <div className="mgt-reservation-details">
                  <h3>Today's Reservations</h3>
                 
                  {(statusFilter 
                     ? selectedTable.reservations.filter(res => 
                         res.status && 
                         res.status.toLowerCase() === statusFilter.toLowerCase() &&
                         res.status.toLowerCase() !== 'done' &&
                         res.status.toLowerCase() !== 'cancelled' &&
                         res.status.toLowerCase() !== 'cancel')
                     : selectedTable.reservations.filter(res => 
                         !res.status || 
                         (res.status.toLowerCase() !== 'done' &&
                          res.status.toLowerCase() !== 'cancelled' &&
                          res.status.toLowerCase() !== 'cancel'))
                   ).map((reservation, index) => (
                    <div key={reservation.id || index} className="mgt-reservation-item">
                      <div className="mgt-detail-row">
                        <div className="mgt-detail-label">Status:</div>
                        <div className="mgt-detail-value">
                          <span className={`mgt-reservation-status mgt-reservation-${reservation.status?.toLowerCase() || 'planning'}`}>
                            {reservation.status || 'Planning'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mgt-detail-row">
                        <div className="mgt-detail-label">Time:</div>
                        <div className="mgt-detail-value">
                          {formatTimeWithoutTimezone(reservation.start_time)} - {formatTimeWithoutTimezone(reservation.end_time)}
                          {" "}{formatDurationWithoutTimezone(reservation.start_time, reservation.end_time)}
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

                      {(['seated', 'done'].includes(reservation.status?.toLowerCase())) && (
                        <div className="mgt-detail-row">
                          <div className="mgt-detail-label">Bill:</div>
                          <div className="mgt-detail-value">
                            <button 
                              className="mgt-btn mgt-btn-bill"
                              onClick={() => handleViewBill(reservation.id)}
                            >
                              <span className="bill-icon">🧾</span> View Bill
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {index < (statusFilter 
                          ? selectedTable.reservations.filter(res => 
                              res.status && 
                              res.status.toLowerCase() === statusFilter.toLowerCase() &&
                              res.status.toLowerCase() !== 'done' &&
                              res.status.toLowerCase() !== 'cancelled' &&
                              res.status.toLowerCase() !== 'cancel')
                          : selectedTable.reservations.filter(res => 
                              !res.status || 
                              (res.status.toLowerCase() !== 'done' &&
                               res.status.toLowerCase() !== 'cancelled' &&
                               res.status.toLowerCase() !== 'cancel'))
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
      {selectedBill && (
        <BillModal 
          orderId={selectedBill} 
          onClose={handleCloseBill} 
          token={localStorage.getItem('token')}
        />
      )}
    </div>
  );
};

export default ManagementTables;