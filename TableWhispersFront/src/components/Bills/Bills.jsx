import React, { useState, useEffect } from 'react';
import './Bills.css';
import { assets } from '../../assets/assets';
const API_URL = import.meta.env.VITE_BACKEND_API || 'http://localhost:5000';

const BillModal = ({ orderId, onClose, token }) => {
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBill = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`${API_URL}/get_all_bills_for_user/order/${orderId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({})
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to load bill');
        }

        if (data.bills && data.bills.length > 0) {
          setBill(data.bills[0]); // Use the first bill
        } else {
          setError('No bill found for this order');
        }
      } catch (err) {
        console.error('Error fetching bill:', err);
        setError(err.message || 'Failed to load bill');
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchBill();
    }
  }, [orderId, token]);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Get logo URL
  const getLogoUrl = (imagePath) => {
    if (!imagePath) return assets.logo || '';
    
    // If it's already a complete URL, return it
    if (imagePath.startsWith('http')) return imagePath;
    
    // Otherwise, prepend the server URL
    return `${API_URL}${imagePath}`;
  };

  // Handle printing the bill
  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="bill-modal">
        <div className="bill-modal-content bill-loading">
          <div className="bill-close" onClick={onClose}>&times;</div>
          <div className="bill-loading-spinner"></div>
          <p>Loading bill...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bill-modal">
        <div className="bill-modal-content bill-error">
          <div className="bill-close" onClick={onClose}>&times;</div>
          <div className="bill-error-icon">❌</div>
          <h3>Error Loading Bill</h3>
          <p>{error}</p>
          <button className="bill-try-again" onClick={() => window.location.reload()}>Try Again</button>
        </div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="bill-modal">
        <div className="bill-modal-content bill-not-found">
          <div className="bill-close" onClick={onClose}>&times;</div>
          <div className="bill-not-found-icon">🧾</div>
          <h3>No Bill Available</h3>
          <p>There is no bill available for this order yet.</p>
          <button className="bill-close-button" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bill-modal">
      <div className="bill-modal-content">
        <div className="bill-close" onClick={onClose}>&times;</div>
        
        <div className="bill-receipt">
          {/* Restaurant header */}
          <div className="bill-header">
            {bill.restaurant?.logo && (
              <div className="bill-restaurant-logo">
                <img src={getLogoUrl(bill.restaurant.logo)} alt={bill.restaurant.name} />
              </div>
            )}
            <h2 className="bill-restaurant-name">{bill.restaurant?.name || 'Restaurant'}</h2>
            <p className="bill-restaurant-details">{bill.restaurant?.address || ''}</p>
            {bill.restaurant?.phone && <p className="bill-restaurant-details">{bill.restaurant.phone}</p>}
            {bill.restaurant?.email && <p className="bill-restaurant-details">{bill.restaurant.email}</p>}
          </div>
          
          {/* Bill details */}
          <div className="bill-info">
            <div className="bill-info-row">
              <span>Order #:</span>
              <span>{bill.orderDetails?.orderNumber || orderId.substring(0, 8)}</span>
            </div>
            <div className="bill-info-row">
              <span>Date:</span>
              <span>{formatDate(bill.orderDetails?.orderDate || bill.financials?.date)}</span>
            </div>
            {bill.orderDetails?.tableNumber && (
              <div className="bill-info-row">
                <span>Table:</span>
                <span>{bill.orderDetails.tableNumber}</span>
              </div>
            )}
            <div className="bill-info-row">
              <span>Guests:</span>
              <span>{bill.orderDetails?.guests || 1}</span>
            </div>
          </div>
          
          {/* Divider */}
          <div className="bill-divider"></div>
          
          {/* Bill items */}
          <div className="bill-items">
            <table className="bill-items-table">
              <thead>
                <tr>
                  <th className="bill-item-name">Item</th>
                  <th className="bill-item-price">Price</th>
                  <th className="bill-item-qty">Qty</th>
                  <th className="bill-item-total">Total</th>
                </tr>
              </thead>
              <tbody>
                {bill.items && bill.items.map((item, index) => (
                  <tr key={index} className="bill-item-row">
                    <td className="bill-item-name">{item.name}</td>
                    <td className="bill-item-price">{formatCurrency(item.price)}</td>
                    <td className="bill-item-qty">{item.quantity}</td>
                    <td className="bill-item-total">{formatCurrency(item.total || (item.price * item.quantity))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Totals */}
          <div className="bill-totals">
            <div className="bill-total-row">
              <span>Subtotal:</span>
              <span>{formatCurrency(bill.financials?.subtotal || 0)}</span>
            </div>
            <div className="bill-total-row">
              <span>Tax (17%):</span>
              <span>{formatCurrency(bill.financials?.tax || 0)}</span>
            </div>
            <div className="bill-total-row bill-grand-total">
              <span>Total:</span>
              <span>{formatCurrency(bill.financials?.total || 0)}</span>
            </div>
          </div>
          
          {/* Thank you message */}
          <div className="bill-footer">
            <p>Thank you for dining with us!</p>
            <p className="bill-footer-timestamp">Receipt generated on {new Date().toLocaleString()}</p>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="bill-actions">
          <button className="bill-print-button" onClick={handlePrint}>
            <span className="bill-print-icon">🖨️</span> Print Receipt
          </button>
          <button className="bill-close-button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default BillModal;