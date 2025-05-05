import React, { useState } from 'react';
import './TableMap.css';

const TableMap = ({ tables, selectedTime, onTableSelect }) => {
  const [selectedTable, setSelectedTable] = useState(null);

  const handleTableClick = (table) => {
    if (!table.isAvailable) return;
    setSelectedTable(table.id);
    onTableSelect(table);
  };

  return (
    <div className="table-map">
      <h3>Select your table</h3>
      <div className="map-legend">
        <div className="legend-item">
          <span className="legend-color available"></span>
          <span>Available</span>
        </div>
        <div className="legend-item">
          <span className="legend-color occupied"></span>
          <span>Occupied</span>
        </div>
        <div className="legend-item">
          <span className="legend-color selected"></span>
          <span>Selected</span>
        </div>
      </div>

      <div className="map-container">
        <svg viewBox="0 0 800 600" className="restaurant-map">
          {/* מסגרת המסעדה */}
          <rect x="0" y="0" width="800" height="600" fill="none" stroke="#333" strokeWidth="2"/>
          
          {/* אזור הבר */}
          <rect x="50" y="50" width="200" height="50" fill="#8b4513" />
          <text x="125" y="80" fill="white" textAnchor="middle">Bar</text>

          {/* שולחנות */}
          {tables.map((table) => {
            const isSelected = selectedTable === table.id;
            let fillColor = table.isAvailable ? '#4CAF50' : '#ff5252';
            if (isSelected) fillColor = '#2196F3';

            return (
              <g 
                key={table.id}
                onClick={() => handleTableClick(table)}
                className={`table ${table.isAvailable ? 'available' : 'occupied'} ${isSelected ? 'selected' : ''}`}
              >
                {/* שולחן עגול */}
                {table.shape === 'round' && (
                  <>
                    <circle 
                      cx={table.x} 
                      cy={table.y} 
                      r={table.size} 
                      fill={fillColor}
                    />
                    <text 
                      x={table.x} 
                      y={table.y} 
                      textAnchor="middle" 
                      dy=".3em" 
                      fill="white"
                    >
                      {table.number}
                    </text>
                  </>
                )}

                {/* שולחן מלבני */}
                {table.shape === 'rectangle' && (
                  <>
                    <rect 
                      x={table.x - table.width/2} 
                      y={table.y - table.height/2}
                      width={table.width}
                      height={table.height}
                      fill={fillColor}
                    />
                    <text 
                      x={table.x} 
                      y={table.y} 
                      textAnchor="middle" 
                      dy=".3em" 
                      fill="white"
                    >
                      {table.number}
                    </text>
                  </>
                )}

                {/* סימון מספר המקומות */}
                <text 
                  x={table.x} 
                  y={table.y + (table.shape === 'round' ? table.size + 15 : table.height/2 + 15)} 
                  textAnchor="middle" 
                  fill="#666"
                  fontSize="12"
                >
                  {table.seats} seats
                </text>
              </g>
            );
          })}

          {/* קירות ומחיצות */}
          <line x1="400" y1="0" x2="400" y2="600" stroke="#ccc" strokeWidth="2" strokeDasharray="5,5"/>
          <text x="200" y="30" textAnchor="middle">Indoor Seating</text>
          <text x="600" y="30" textAnchor="middle">Outdoor Seating</text>
        </svg>
      </div>

      <div className="table-info">
        {selectedTable && (
          <div className="selected-table-info">
            <h4>Selected Table</h4>
            <p>Table {selectedTable}</p>
            <p>{tables.find(t => t.id === selectedTable)?.seats} seats</p>
            <p>{tables.find(t => t.id === selectedTable)?.location}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TableMap;