import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './ChatManagement.css';

const ChatManagement = ({ restaurantId }) => {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    const socketUrl = 'http://localhost:5000';
    const newSocket = io(socketUrl);
    
    setSocket(newSocket);
    
    newSocket.on('connect', () => {
      console.log('Socket connected');
      
      // Join restaurant room
      newSocket.emit('joinRestaurantRoom', { restaurantId });
    });
    
    // Clean up on component unmount
    return () => {
      if (newSocket) {
        newSocket.emit('leaveRestaurantRoom', { restaurantId });
        newSocket.disconnect();
      }
    };
  }, [restaurantId]);

  useEffect(() => {
    if (!socket || !selectedCustomer || !selectedCustomer.order_id) return;
    
    // Join order-specific room
    const orderId = selectedCustomer.order_id;
    socket.emit('joinOrderRoom', { orderId });
    console.log(`Joined order room: ${orderId}`);
    
    // Cleanup when selected customer changes or component unmounts
    return () => {
      socket.emit('leaveOrderRoom', { orderId });
    };
  }, [socket, selectedCustomer]);
  
  // Socket event listeners for real-time updates
  useEffect(() => {
    if (!socket) return;
    const processedMessages = new Set();

    const handleNewMessage = (message) => {
      console.log('Received new message:', message);
      
      // Skip if already processed
      if (processedMessages.has(message._id)) return;
      
      // Mark as processed
      processedMessages.add(message._id);
      
      // If we're viewing this chat
      if (selectedCustomer && message.order_id === selectedCustomer.order_id) {
        setMessages(prev => [...prev, message]);
        
        // Mark customer messages as read
        if (message.sender_type === 'customer') {
          socket.emit('markMessageRead', { messageId: message._id });
        }
      }
      
      // Update sidebar list
      updateCustomersList(message);
    };
    
    // Handler for our own sent messages
    const handleMessageSent = (message) => {
      console.log('Message sent confirmation:', message);
      
      // Skip if already processed
      if (processedMessages.has(message._id)) return;
      
      // Mark as processed
      processedMessages.add(message._id);
      
      // If we're viewing this chat
      if (selectedCustomer && message.order_id === selectedCustomer.order_id) {
        setMessages(prev => [...prev, message]);
      }
      
      // Update sidebar list
      updateCustomersList(message);
    };
    
    // Register event handlers
    socket.on('newMessage', handleNewMessage);
    socket.on('messageSent', handleMessageSent);
    // Listen for new messages
    socket.on('newMessage', (message) => {
      console.log('Received new message:', message);
      
      // Update messages if currently viewing this customer's chat
      if (selectedCustomer && 
          message.order_id === selectedCustomer.order_id &&
          ((message.sender_type === 'customer' && message.user_sender_email === selectedCustomer.customerEmail) ||
           (message.recipient_type === 'customer' && message.user_recipient_email === selectedCustomer.customerEmail))) {
        
        setMessages(prev => [...prev, message]);
        
        // Mark received messages as read if they're from a customer
        if (message.sender_type === 'customer') {
          socket.emit('markMessageRead', { messageId: message._id });
        }
      }
      
      // Update customers list to show new message in the sidebar
      setCustomers(prev => {
        // First, check if this message is related to one of our customer chats
        const customerIndex = prev.findIndex(c => 
          (message.order_id === c.order_id) && 
          ((message.sender_type === 'customer' && c.customerEmail === message.user_sender_email) ||
           (message.recipient_type === 'customer' && c.customerEmail === message.user_recipient_email))
        );
        
        if (customerIndex !== -1) {
          // Create a copy of the customers array
          const updatedCustomers = [...prev];
          
          // Update the customer with new message info
          const updatedCustomer = {
            ...updatedCustomers[customerIndex],
            lastMessage: {
              id: message._id,
              content: message.content,
              timestamp: message.timestamp,
              sender_type: message.sender_type
            }
          };
          
          // If this is a new message from the customer and we're not viewing their chat,
          // increment the unread count
          if (message.sender_type === 'customer' && 
              (!selectedCustomer || 
               selectedCustomer.order_id !== message.order_id || 
               selectedCustomer.customerEmail !== message.user_sender_email)) {
            updatedCustomer.unreadCount = (updatedCustomer.unreadCount || 0) + 1;
          }
          
          // Remove from current position
          updatedCustomers.splice(customerIndex, 1);
          
          // Add to top of list (most recent message first)
          return [updatedCustomer, ...updatedCustomers];
        }
        
        // If this is a message for a new customer we don't have in our list yet,
        // we'll get it next time we refresh the customer list
        return prev;
      });
    });
    
    // Listen for read receipts
    socket.on('messageRead', (data) => {
      console.log('Message read:', data);
      
      setMessages(prev => 
        prev.map(msg => 
          msg._id === data.messageId ? { ...msg, read: true } : msg
        )
      );
    });
    
    // Clean up event listeners on unmount or when dependencies change
    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('messageSent', handleMessageSent);
      socket.off('messageRead');
    };
  }, [socket, selectedCustomer]);
  
  // Load customer chats when component mounts
  useEffect(() => {
    const fetchCustomerChats = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:5000/restaurant_chats/${restaurantId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch customer chats');
        }
        
        const data = await response.json();
        
        if (data.success && data.chats) {
          setCustomers(data.chats);
        } else {
          throw new Error(data.message || 'Failed to load chats');
        }
      } catch (error) {
        console.error('Error loading customer chats:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCustomerChats();
    
    // Set up periodic refresh
    const refreshInterval = setInterval(fetchCustomerChats, 60000); // Refresh every minute
    
    return () => clearInterval(refreshInterval);
  }, [restaurantId]);
  
  // Load chat history when a customer is selected
  useEffect(() => {
    const fetchChatHistory = async () => {
      if (!selectedCustomer) return;
      
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:5000/chat_history/${selectedCustomer.order_id}/${selectedCustomer.customerEmail}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch chat history');
        }
        
        const data = await response.json();
        
        if (data.success && data.messages) {
          setMessages(data.messages);
          
          // Reset unread count for this customer
          setCustomers(prev => {
            return prev.map(c => {
              if (c.order_id === selectedCustomer.order_id && 
                  c.customerEmail === selectedCustomer.customerEmail) {
                return { ...c, unreadCount: 0 };
              }
              return c;
            });
          });
          
          // Mark all unread messages from this customer as read
          data.messages.forEach(msg => {
            if (msg.sender_type === 'customer' && !msg.read) {
              socket.emit('markMessageRead', { messageId: msg._id });
            }
          });
        } else {
          throw new Error(data.message || 'Failed to load chat history');
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (socket && selectedCustomer) {
      fetchChatHistory();
    }
  }, [selectedCustomer, socket]);
  
  // Scroll to bottom of messages when they change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Send a new message
  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedCustomer || !socket) return;
    
    const messageData = {
      order_id: selectedCustomer.order_id,
      sender_type: 'restaurant',
      restaurant_sender_id: restaurantId,
      sender_name: 'Restaurant Staff', // This could be the actual staff member's name
      recipient_type: 'customer',
      user_recipient_email: selectedCustomer.customerEmail,
      content: newMessage
    };
    
    console.log('Sending message:', messageData);
    
    // Send message through socket
    socket.emit('sendMessage', messageData);
    
    // Clear input
    setNewMessage('');
  };
  
  // Handler for selecting a customer
  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
  };
  
  if (error) {
    return <div className="mng-chat-error">Error: {error}</div>;
  }
  
  return (
    <div className="mng-chat-container">
      <div className="mng-chat-sidebar">
        <div className="mng-chat-sidebar-header">
          <h2>Customer Chats</h2>
        </div>
        <div className="mng-chat-customers">
          {loading && customers.length === 0 ? (
            <div className="mng-chat-loading">Loading...</div>
          ) : customers.length === 0 ? (
            <div className="mng-chat-no-customers">No customer chats found</div>
          ) : (
            customers.map(customer => (
              <div 
                key={`${customer.order_id}-${customer.customerEmail}`}
                className={`mng-chat-customer ${selectedCustomer?.order_id === customer.order_id && 
                                               selectedCustomer?.customerEmail === customer.customerEmail ? 'active' : ''}`}
                onClick={() => handleSelectCustomer(customer)}
              >
                <div className="mng-chat-customer-avatar">
                  {customer.customerInfo?.profileImage ? (
                    <img 
                      src={`http://localhost:5000${customer.customerInfo.profileImage}`} 
                      alt={`${customer.customerInfo?.firstName || 'Customer'}`} 
                    />
                  ) : (
                    <div className="mng-chat-avatar-placeholder">
                      {(customer.customerInfo?.firstName?.[0] || 'C')}
                    </div>
                  )}
                </div>
                <div className="mng-chat-customer-info">
                  <div className="mng-chat-customer-name">
                    {customer.customerInfo ? 
                      `${customer.customerInfo.firstName} ${customer.customerInfo.lastName}` : 
                      customer.customerEmail}
                    {customer.unreadCount > 0 && (
                      <span className="mng-chat-unread-count">{customer.unreadCount}</span>
                    )}
                  </div>
                  <div className="mng-chat-order-info">
                    Order #{customer.order_id.slice(-5)}
                    {customer.orderInfo && (
                      <span className="mng-chat-order-status">
                        • {customer.orderInfo.status}
                      </span>
                    )}
                  </div>
                  {customer.lastMessage && (
                    <div className="mng-chat-last-message">
                      <span className={customer.lastMessage.sender_type === 'restaurant' ? 'sent' : 'received'}>
                        {customer.lastMessage.sender_type === 'restaurant' ? 'You: ' : ''}
                      </span>
                      {customer.lastMessage.content.length > 20 
                        ? `${customer.lastMessage.content.substring(0, 20)}...` 
                        : customer.lastMessage.content}
                    </div>
                  )}
                </div>
                <div className="mng-chat-customer-time">
                  {customer.lastMessage ? (
                    new Date(customer.lastMessage.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  ) : ''}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="mng-chat-main">
        {selectedCustomer ? (
          <>
            <div className="mng-chat-header">
              <div className="mng-chat-header-info">
                {selectedCustomer.customerInfo?.profileImage ? (
                  <img 
                    src={`http://localhost:5000${selectedCustomer.customerInfo.profileImage}`} 
                    alt={`${selectedCustomer.customerInfo?.firstName || 'Customer'}`} 
                    className="mng-chat-header-avatar"
                  />
                ) : (
                  <div className="mng-chat-header-avatar-placeholder">
                    {(selectedCustomer.customerInfo?.firstName?.[0] || 'C')}
                  </div>
                )}
                <div className="mng-chat-header-details">
                  <h3>
                    {selectedCustomer.customerInfo ? 
                      `${selectedCustomer.customerInfo.firstName} ${selectedCustomer.customerInfo.lastName}` : 
                      selectedCustomer.customerEmail}
                  </h3>
                  <div className="mng-chat-header-order">
                    Order #{selectedCustomer.order_id.slice(-5)}
                    {selectedCustomer.orderInfo && (
                      <>
                        <span className="mng-chat-header-status">
                          • {selectedCustomer.orderInfo.status}
                        </span>
                        <span className="mng-chat-header-guests">
                          • {selectedCustomer.orderInfo.guests} {selectedCustomer.orderInfo.guests === 1 ? 'guest' : 'guests'}
                        </span>
                        {selectedCustomer.orderInfo.tableNumber && (
                          <span className="mng-chat-header-table">
                            • Table {selectedCustomer.orderInfo.tableNumber}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  {selectedCustomer.customerInfo?.phone && (
                    <p className="mng-chat-header-phone">{selectedCustomer.customerInfo.phone}</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mng-chat-messages">
              {loading ? (
                <div className="mng-chat-loading">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="mng-chat-no-messages">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map(message => (
                  <div 
                    key={message._id}
                    className={`mng-chat-message ${message.sender_type === 'restaurant' ? 'sent' : 'received'}`}
                  >
                    <div className="mng-chat-message-content">
                      {message.content}
                    </div>
                    <div className="mng-chat-message-meta">
                      <span className="mng-chat-message-time">
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {message.sender_type === 'restaurant' && (
                        <span className="mng-chat-message-status">
                          {message.read ? (
                            <span className="mng-chat-read-status">Read</span>
                          ) : (
                            <span className="mng-chat-sent-status">Sent</span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="mng-chat-input-container">
              <input
                type="text"
                className="mng-chat-input"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button 
                className="mng-chat-send-button"
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="mng-chat-select-prompt">
            <div className="mng-chat-prompt-content">
              <div className="mng-chat-prompt-icon">💬</div>
              <h3>Select a customer chat</h3>
              <p>Choose a customer from the sidebar to view conversation history and send messages.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatManagement;