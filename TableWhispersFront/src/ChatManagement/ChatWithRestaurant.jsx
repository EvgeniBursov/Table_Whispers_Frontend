import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import './ChatWithRestaurant.css';

const API_URL = import.meta.env.VITE_BACKEND_API || 'http://localhost:5000';

const ChatWithRestaurant = ({ restaurant, customerEmail, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [userName, setUserName] = useState('Customer');
  const messagesEndRef = useRef(null);
  const processedMessagesRef = useRef(new Set());
  
  // Extract order ID and restaurant information from the restaurant prop
  const orderId = restaurant?.order_id || (typeof restaurant === 'string' ? restaurant : null);
  const restaurantId = restaurant?.restaurantInfo?.id || restaurant?.restaurant_id;
  const restaurantName = restaurant?.restaurantInfo?.name || restaurant?.restaurantName || 'Restaurant';
  
  // Get user name from props or state (avoiding localStorage)
  useEffect(() => {
    // You might want to pass userName as a prop instead of using localStorage
    const storedUserName = restaurant?.customerName || 'Customer';
    setUserName(storedUserName);
  }, [restaurant]);
  
  if (!orderId) {
    console.error('Order ID is missing:', restaurant);
  }
  
  // Initialize socket connection
  useEffect(() => {
    if (!orderId) {
      setError('Order ID is missing. Cannot establish chat connection.');
      setLoading(false);
      return;
    }

    const newSocket = io(API_URL);
    setSocket(newSocket);
    
    newSocket.on('connect', () => {
      console.log('Socket connected');
      
      // Join customer and order rooms
      newSocket.emit('joinCustomerRoom', { customerEmail });
      newSocket.emit('joinOrderRoom', { orderId });
      console.log(`Joined order room for order: ${orderId}`);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setError('Failed to connect to chat service');
    });
    
    return () => {
      if (newSocket) {
        newSocket.emit('leaveOrderRoom', { orderId });
        newSocket.emit('leaveCustomerRoom', { customerEmail });
        newSocket.disconnect();
      }
    };
  }, [customerEmail, orderId]);
  
  // Socket event listeners for real-time updates
  useEffect(() => {
    if (!socket || !orderId) return;

    const handleNewMessage = (message) => {
      console.log('Received new message:', message);
      
      // Skip if already processed or not for this order
      if (processedMessagesRef.current.has(message._id) || message.order_id !== orderId) {
        return;
      }
      
      // Only handle messages FROM restaurant TO customer (not our own messages)
      if (message.sender_type === 'restaurant' && message.recipient_type === 'customer') {
        // Mark as processed
        processedMessagesRef.current.add(message._id);
        
        // Add to messages state
        setMessages(prev => [...prev, message]);
        
        // Mark received messages as read
        socket.emit('markMessageRead', { messageId: message._id });
      }
    };
    
    const handleMessageSent = (message) => {
      console.log('Message sent confirmation:', message);
      
      // Skip if already processed or not for this order
      if (processedMessagesRef.current.has(message._id) || message.order_id !== orderId) {
        return;
      }
      
      // Only handle OUR OWN sent messages (customer -> restaurant)
      if (message.sender_type === 'customer' && 
          message.user_sender_email === customerEmail) {
        // Mark as processed
        processedMessagesRef.current.add(message._id);
        
        // Add to messages state
        setMessages(prev => [...prev, message]);
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
    
    // Cleanup when component unmounts or dependencies change
    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('messageSent', handleMessageSent);
      socket.off('messageRead', handleMessageRead);
    };
  }, [socket, orderId, customerEmail]);
  
  // Load chat history when the modal opens
  useEffect(() => {
    const fetchChatHistory = async () => {
      if (!orderId || !socket) {
        if (!orderId) {
          setError('Order ID is missing. Cannot load chat history.');
        }
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`${API_URL}/chat_history/${orderId}/${customerEmail}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch chat history: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.messages) {
          setMessages(data.messages);
          
          // Mark all unread messages from restaurant as read
          data.messages.forEach(msg => {
            if (msg.sender_type === 'restaurant' && !msg.read) {
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
  }, [orderId, customerEmail, socket]);
  
  // Scroll to bottom of messages when they change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Send a new message
  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim() || !orderId || !socket) return;
    
    const messageData = {
      order_id: orderId,
      sender_type: 'customer',
      user_sender_email: customerEmail,
      sender_name: userName,
      recipient_type: 'restaurant',
      restaurant_recipient_id: restaurantId,
      content: newMessage
    };
    
    console.log('Sending message:', messageData);
    
    // Send message through socket
    socket.emit('sendMessage', messageData);
    
    // Clear input
    setNewMessage('');
  }, [newMessage, orderId, socket, customerEmail, userName, restaurantId]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);
  
  if (error) {
    return (
      <div className="chat-modal">
        <div className="chat-modal-content">
          <div className="chat-modal-header">
            <h2>Chat with {restaurantName}</h2>
            <button className="chat-close-button" onClick={onClose}>×</button>
          </div>
          <div className="chat-error">
            <div className="chat-error-message">Error: {error}</div>
            <button 
              className="chat-retry-button" 
              onClick={() => {
                setError(null);
                setLoading(true);
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="chat-modal">
      <div className="chat-modal-content">
        <div className="chat-modal-header">
          <h2>Chat with {restaurantName}</h2>
          {orderId && (
            <div className="chat-order-info">
              Order #{orderId.slice(-5)}
            </div>
          )}
          <button className="chat-close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="chat-messages">
          {loading ? (
            <div className="chat-loading">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="chat-no-messages">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map(message => (
              <div 
                key={message._id}
                className={`chat-message ${message.sender_type === 'customer' ? 'sent' : 'received'}`}
              >
                <div className="chat-message-content">
                  {message.content}
                </div>
                <div className="chat-message-meta">
                  <span className="chat-message-time">
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  {message.sender_type === 'customer' && (
                    <span className="chat-message-status">
                      {message.read ? (
                        <span className="chat-read-status">Read</span>
                      ) : (
                        <span className="chat-sent-status">Sent</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="chat-input-container">
          <input
            type="text"
            className="chat-input"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button 
            className="chat-send-button"
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || !socket}
          >
            Send
          </button>
        </div>
        
        {!socket && (
          <div className="chat-connection-status">
            Connecting to chat service...
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatWithRestaurant;