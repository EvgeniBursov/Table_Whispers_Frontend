import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import './ChatManagement.css';

const API_URL = import.meta.env.VITE_BACKEND_API || 'http://localhost:5000';

const ChatManagement = ({ restaurantId }) => {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);
  const processedMessagesRef = useRef(new Set());

  // Helper function to update customers list
  const updateCustomersList = useCallback((message) => {
    setCustomers(prev => {
      const customerIndex = prev.findIndex(c => 
        (message.order_id === c.order_id) && 
        ((message.sender_type === 'customer' && c.customerEmail === message.user_sender_email) ||
         (message.recipient_type === 'customer' && c.customerEmail === message.user_recipient_email))
      );
      
      if (customerIndex !== -1) {
        const updatedCustomers = [...prev];
        const updatedCustomer = {
          ...updatedCustomers[customerIndex],
          lastMessage: {
            id: message._id,
            content: message.content,
            timestamp: message.timestamp,
            sender_type: message.sender_type
          }
        };
        
        // Increment unread count for customer messages when not viewing this chat
        if (message.sender_type === 'customer' && 
            (!selectedCustomer || 
             selectedCustomer.order_id !== message.order_id || 
             selectedCustomer.customerEmail !== message.user_sender_email)) {
          updatedCustomer.unreadCount = (updatedCustomer.unreadCount || 0) + 1;
        }
        
        updatedCustomers.splice(customerIndex, 1);
        return [updatedCustomer, ...updatedCustomers];
      }
      
      return prev;
    });
  }, [selectedCustomer]);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(API_URL);
    setSocket(newSocket);
    
    newSocket.on('connect', () => {
      console.log('Socket connected');
      newSocket.emit('joinRestaurantRoom', { restaurantId });
    });
    
    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    return () => {
      if (newSocket) {
        newSocket.emit('leaveRestaurantRoom', { restaurantId });
        newSocket.disconnect();
      }
    };
  }, [restaurantId]);

  // Join order room when customer is selected
  useEffect(() => {
    if (!socket || !selectedCustomer?.order_id) return;
    
    const orderId = selectedCustomer.order_id;
    socket.emit('joinOrderRoom', { orderId });
    console.log(`Joined order room: ${orderId}`);
    
    return () => {
      socket.emit('leaveOrderRoom', { orderId });
    };
  }, [socket, selectedCustomer]);
  
  // Socket event listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      console.log('Received new message:', message);
      
      // Prevent duplicate processing
      if (processedMessagesRef.current.has(message._id)) return;
      processedMessagesRef.current.add(message._id);
      
      // Only handle messages FROM customer TO restaurant (not our own messages)
      if (message.sender_type === 'customer' && message.recipient_type === 'restaurant') {
        // Update messages if viewing this customer's chat
        if (selectedCustomer && message.order_id === selectedCustomer.order_id) {
          setMessages(prev => [...prev, message]);
          
          // Mark customer messages as read
          socket.emit('markMessageRead', { messageId: message._id });
        }
        
        // Update sidebar
        updateCustomersList(message);
      }
    };
    
    const handleMessageSent = (message) => {
      console.log('Message sent confirmation:', message);
      
      if (processedMessagesRef.current.has(message._id)) return;
      processedMessagesRef.current.add(message._id);
      
      // Only handle OUR OWN sent messages (restaurant -> customer)
      if (message.sender_type === 'restaurant' && 
          message.restaurant_sender_id === restaurantId) {
        if (selectedCustomer && message.order_id === selectedCustomer.order_id) {
          setMessages(prev => [...prev, message]);
        }
        
        updateCustomersList(message);
      }
    };
    
    const handleMessageRead = (data) => {
      console.log('Message read:', data);
      setMessages(prev => 
        prev.map(msg => 
          msg._id === data.messageId ? { ...msg, read: true } : msg
        )
      );
    };
    
    // Register event handlers
    socket.on('newMessage', handleNewMessage);
    socket.on('messageSent', handleMessageSent);
    socket.on('messageRead', handleMessageRead);
    
    // Cleanup
    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('messageSent', handleMessageSent);
      socket.off('messageRead', handleMessageRead);
    };
  }, [socket, selectedCustomer, updateCustomersList, restaurantId]);
  
  // Load customer chats
  useEffect(() => {
    const fetchCustomerChats = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/restaurant_chats/${restaurantId}`);
        
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
    
    if (restaurantId) {
      fetchCustomerChats();
      
      // Set up periodic refresh
      const refreshInterval = setInterval(fetchCustomerChats, 60000);
      return () => clearInterval(refreshInterval);
    }
  }, [restaurantId]);
  
  // Load chat history when customer is selected
  useEffect(() => {
    const fetchChatHistory = async () => {
      if (!selectedCustomer || !socket) return;
      
      try {
        setLoading(true);
        const response = await fetch(
          `${API_URL}/chat_history/${selectedCustomer.order_id}/${selectedCustomer.customerEmail}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch chat history');
        }
        
        const data = await response.json();
        
        if (data.success && data.messages) {
          setMessages(data.messages);
          
          // Reset unread count for this customer
          setCustomers(prev => prev.map(c => {
            if (c.order_id === selectedCustomer.order_id && 
                c.customerEmail === selectedCustomer.customerEmail) {
              return { ...c, unreadCount: 0 };
            }
            return c;
          }));
          
          // Mark unread messages as read
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
    
    fetchChatHistory();
  }, [selectedCustomer, socket]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim() || !selectedCustomer || !socket) return;
    
    const messageData = {
      order_id: selectedCustomer.order_id,
      sender_type: 'restaurant',
      restaurant_sender_id: restaurantId,
      sender_name: 'Restaurant Staff',
      recipient_type: 'customer',
      user_recipient_email: selectedCustomer.customerEmail,
      content: newMessage
    };
    
    console.log('Sending message:', messageData);
    socket.emit('sendMessage', messageData);
    setNewMessage('');
  }, [newMessage, selectedCustomer, socket, restaurantId]);
  
  const handleSelectCustomer = useCallback((customer) => {
    setSelectedCustomer(customer);
    // Clear processed messages when switching customers
    processedMessagesRef.current.clear();
  }, []);
  
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
                className={`mng-chat-customer ${
                  selectedCustomer?.order_id === customer.order_id && 
                  selectedCustomer?.customerEmail === customer.customerEmail ? 'active' : ''
                }`}
                onClick={() => handleSelectCustomer(customer)}
              >
                <div className="mng-chat-customer-avatar">
                  {customer.customerInfo?.profileImage ? (
                    <img 
                      src={`${API_URL}${customer.customerInfo.profileImage}`} 
                      alt={customer.customerInfo?.firstName || 'Customer'} 
                    />
                  ) : (
                    <div className="mng-chat-avatar-placeholder">
                      {customer.customerInfo?.firstName?.[0] || 'C'}
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
                    src={`${API_URL}${selectedCustomer.customerInfo.profileImage}`} 
                    alt={selectedCustomer.customerInfo?.firstName || 'Customer'} 
                    className="mng-chat-header-avatar"
                  />
                ) : (
                  <div className="mng-chat-header-avatar-placeholder">
                    {selectedCustomer.customerInfo?.firstName?.[0] || 'C'}
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