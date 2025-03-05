import React from 'react';
import './ManagementDashboardCSS/MngEmptyState.css';

const ManagementEmptyState = ({ icon, title, message, actionText, onAction }) => {
  return (
    <div className="mng-empty-state">
      {icon && <div className="mng-empty-state-icon">{icon}</div>}
      
      <h3 className="mng-empty-state-title">{title}</h3>
      
      {message && <p className="mng-empty-state-message">{message}</p>}
      
      {actionText && onAction && (
        <button 
          className="mng-empty-state-action" 
          onClick={onAction}
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

export default ManagementEmptyState;