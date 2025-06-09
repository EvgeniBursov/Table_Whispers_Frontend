import React from 'react';
import './TableReservation.css';

// Component to display available tables filtered by guest count
const TableSelection = ({ availableTables, onTableSelect, selectedTableId, guestCount }) => {
  
  // Filter tables based on guest count
  const filteredTables = availableTables.filter(table => {
    const tableSeats = table.seats || 0;
    const guests = parseInt(guestCount) || 2;
    
    // Show tables that can accommodate the guests
    // Allow up to 2 extra seats to provide some flexibility
    return tableSeats >= guests && tableSeats <= guests + 2;
  });

  if (!availableTables || availableTables.length === 0) {
    return (
      <div className="no-tables-available">
        <p>No tables available for the selected time and party size.</p>
      </div>
    );
  }

  if (filteredTables.length === 0) {
    return (
      <div className="no-suitable-tables">
        <p>No tables suitable for {guestCount} {guestCount === 1 ? 'guest' : 'guests'} are available at this time.</p>
        <p>Please try a different time or contact the restaurant for assistance.</p>
      </div>
    );
  }

  return (
    <div className="table-selection-container">
      <h3>Select a Table for {guestCount} {guestCount === 1 ? 'Guest' : 'Guests'}</h3>
      <div className="table-simple-grid">
        {filteredTables.map((table) => (
          <div
            key={table._id || table.id}
            className={`table-simple-card ${
              selectedTableId === (table._id || table.id) ? 'selected' : ''
            } ${table.seats === parseInt(guestCount) ? 'perfect-match' : ''}`}
            onClick={() => onTableSelect(table)}
          >
            <div className="table-number">Table {table.table_number}</div>
            <div className="table-info">
              <div className="table-section-label">
                {table.section || 'Main'} Section
              </div>
              <div className="table-shape-label">
                {table.shape || 'Standard'}
              </div>
              <div className="table-seats-label">
                {table.seats} {table.seats === 1 ? 'seat' : 'seats'}
                {table.seats === parseInt(guestCount) && (
                  <span className="perfect-fit"> - Perfect Fit!</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {filteredTables.length < availableTables.length && (
        <div className="filtered-notice">
          Showing {filteredTables.length} of {availableTables.length} tables suitable for your party size.
        </div>
      )}
    </div>
  );
};

export default TableSelection;