import React, { useState } from 'react';
import './TableSelectionModel.css';

const TableSelection = ({ availableTables, onTableSelect, selectedTableId }) => {
  return (
    <div className="table-selection-container">
      <h3 className="table-selection-title">Select a Table</h3>
      
      <div className="table-grid">
        {availableTables.map(table => (
          <div 
            key={table.id || table._id}
            className={`table-card ${selectedTableId === (table.id || table._id) ? 'selected' : ''}`}
            onClick={() => onTableSelect(table)}
          >
            <div className="table-card-header">
              Table {table.table_number}
            </div>
            <div className="table-card-details">
              <span className="table-shape">{table.shape}</span>
              <span className="table-seats">{table.seats} seats</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TableSelection;