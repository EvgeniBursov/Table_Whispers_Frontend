import React from 'react';
import './TableReservation.css';

// Component to display available tables
const TableSelection = ({ availableTables, onTableSelect, selectedTableId }) => {
  if (!availableTables || availableTables.length === 0) {
    return (
      <div className="no-tables-available">
        <p>No tables available for the selected time and party size.</p>
      </div>
    );
  }

  return (
    <div className="table-selection-container">
      <h3>Select a Table</h3>
      <div className="table-simple-grid">
        {availableTables.map((table) => (
          <div
            key={table._id || table.id}
            className={`table-simple-card ${
              selectedTableId === (table._id || table.id) ? 'selected' : ''
            }`}
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
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TableSelection;