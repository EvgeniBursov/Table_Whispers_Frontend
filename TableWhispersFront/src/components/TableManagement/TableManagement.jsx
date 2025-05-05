// TableManagement.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, RefreshCw, Coffee, Users } from 'lucide-react';
import '../styles/restaurant-styles.css';

const TableManagement = () => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  
  // New table form state
  const [newTable, setNewTable] = useState({
    table_number: '',
    seats: 2,
    status: 'Available'
  });

  // Fetch tables from API
  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    setLoading(true);
    try {
      // This would be your API endpoint
      const response = await axios.get('/api/tables');
      setTables(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching tables:', err);
      setError('Failed to load tables. Please try again.');
      
      // For demo purposes, generate some sample tables
      generateSampleTables();
    } finally {
      setLoading(false);
    }
  };
  
  // Demo function to generate sample tables for preview
  const generateSampleTables = () => {
    const sampleTables = [];
    const statuses = ['Available', 'Reserved', 'Occupied', 'Maintenance'];
    
    for (let i = 1; i <= 16; i++) {
      sampleTables.push({
        _id: `table-${i}`,
        table_number: i.toString(),
        seats: Math.floor(Math.random() * 5) + 2, // Random 2-6 seats
        status: statuses[Math.floor(Math.random() * statuses.length)],
        reservation: i % 3 === 0 ? {
          client_name: 'John Smith',
          time: '19:00 - 21:00',
          phone: '050-1234567',
          guests: Math.floor(Math.random() * 3) + 2
        } : null
      });
    }
    
    setTables(sampleTables);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTable({
      ...newTable,
      [name]: value
    });
  };

  const handleAddTable = async (e) => {
    e.preventDefault();
    
    try {
      // This would be your API call to add a table
      // const response = await axios.post('/api/tables', newTable);
      // setTables([...tables, response.data]);
      
      // For demo purposes:
      const newTableWithId = {
        ...newTable,
        _id: `table-${tables.length + 1}`,
        status: 'Available'
      };
      
      setTables([...tables, newTableWithId]);
      
      // Reset form
      setNewTable({
        table_number: '',
        seats: 2,
        status: 'Available'
      });
      
      setShowAddForm(false);
    } catch (err) {
      console.error('Error adding table:', err);
      setError('Failed to add table. Please try again.');
    }
  };

  const handleUpdateTableStatus = async (tableId, newStatus) => {
    try {
      // This would be your API call to update a table
      // await axios.patch(`/api/tables/${tableId}`, { status: newStatus });
      
      // Update local state
      setTables(tables.map(table => 
        table._id === tableId ? { ...table, status: newStatus } : table
      ));
    } catch (err) {
      console.error('Error updating table status:', err);
      setError('Failed to update table status. Please try again.');
    }
  };

  const handleDeleteTable = async (tableId) => {
    if (window.confirm('Are you sure you want to delete this table?')) {
      try {
        // This would be your API call to delete a table
        // await axios.delete(`/api/tables/${tableId}`);
        
        // Update local state
        setTables(tables.filter(table => table._id !== tableId));
      } catch (err) {
        console.error('Error deleting table:', err);
        setError('Failed to delete table. Please try again.');
      }
    }
  };

  const filteredTables = filterStatus === 'all' 
    ? tables 
    : tables.filter(table => table.status === filterStatus);

  if (loading) {
    return <div className="loading">Loading tables...</div>;
  }

  return (
    <div className="table-management-container">
      <div className="header-actions">
        <h1>Table Management</h1>
        
        <div className="actions-container">
          <div className="filter-container">
            <label htmlFor="status-filter">Filter by status:</label>
            <select 
              id="status-filter" 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="status-filter"
            >
              <option value="all">All Tables</option>
              <option value="Available">Available</option>
              <option value="Reserved">Reserved</option>
              <option value="Occupied">Occupied</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>
          
          <button 
            className="btn btn-primary"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? 'Cancel' : 'Add Table'} {!showAddForm && <Plus size={16} />}
          </button>
          
          <button 
            className="btn btn-outline"
            onClick={fetchTables}
            title="Refresh tables"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      {showAddForm && (
        <div className="add-table-form">
          <h2>Add New Table</h2>
          <form onSubmit={handleAddTable}>
            <div className="form-group">
              <label htmlFor="table_number">Table Number:</label>
              <input
                type="text"
                id="table_number"
                name="table_number"
                value={newTable.table_number}
                onChange={handleInputChange}
                required
                className="form-control"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="seats">Number of Seats:</label>
              <input
                type="number"
                id="seats"
                name="seats"
                min="1"
                max="20"
                value={newTable.seats}
                onChange={handleInputChange}
                required
                className="form-control"
              />
            </div>
            
            <div className="form-actions">
              <button type="submit" className="btn btn-success">
                Add Table
              </button>
              <button 
                type="button" 
                className="btn btn-outline"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      
      <div className="tables-grid">
        {filteredTables.length === 0 ? (
          <div className="no-tables-message">
            {filterStatus === 'all' 
              ? 'No tables found. Add a table to get started.' 
              : `No tables with "${filterStatus}" status found.`}
          </div>
        ) : (
          filteredTables.map(table => (
            <div key={table._id} className={`table-card status-${table.status.toLowerCase()}`}>
              <div className="table-card-header">
                <h3>Table {table.table_number}</h3>
                <span className={`status-badge status-${table.status.toLowerCase()}`}>
                  {table.status}
                </span>
              </div>
              
              <div className="table-card-body">
                <div className="table-info">
                  <p><Users size={16} /> {table.seats} seats</p>
                  
                  {table.status === 'Reserved' && table.reservation && (
                    <div className="reservation-info">
                      <h4>Reservation</h4>
                      <p>{table.reservation.client_name}</p>
                      <p>{table.reservation.time}</p>
                      <p>{table.reservation.phone}</p>
                      <p>{table.reservation.guests} guests</p>
                    </div>
                  )}
                  
                  {table.status === 'Occupied' && table.reservation && (
                    <div className="reservation-info">
                      <h4>Current Guests</h4>
                      <p>{table.reservation.client_name}</p>
                      <p>Since: {table.reservation.time.split(' - ')[0]}</p>
                      <p>{table.reservation.guests} guests</p>
                    </div>
                  )}
                </div>
                
                <div className="table-actions">
                  {table.status === 'Available' && (
                    <button 
                      className="btn btn-sm btn-outline-success"
                      onClick={() => handleUpdateTableStatus(table._id, 'Occupied')}
                    >
                      Seat Guests
                    </button>
                  )}
                  
                  {table.status === 'Occupied' && (
                    <button 
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => handleUpdateTableStatus(table._id, 'Available')}
                    >
                      Clear Table
                    </button>
                  )}
                  
                  <div className="dropdown">
                    <button className="btn btn-sm btn-outline dropdown-toggle">
                      Status
                    </button>
                    <div className="dropdown-menu">
                      <button 
                        className="dropdown-item"
                        onClick={() => handleUpdateTableStatus(table._id, 'Available')}
                      >
                        Available
                      </button>
                      <button 
                        className="dropdown-item"
                        onClick={() => handleUpdateTableStatus(table._id, 'Reserved')}
                      >
                        Reserved
                      </button>
                      <button 
                        className="dropdown-item"
                        onClick={() => handleUpdateTableStatus(table._id, 'Occupied')}
                      >
                        Occupied
                      </button>
                      <button 
                        className="dropdown-item"
                        onClick={() => handleUpdateTableStatus(table._id, 'Maintenance')}
                      >
                        Maintenance
                      </button>
                    </div>
                  </div>
                  
                  <button 
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => handleDeleteTable(table._id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TableManagement;