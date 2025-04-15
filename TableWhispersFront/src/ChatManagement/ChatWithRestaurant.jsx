import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './ChatWithRestaurant.css';

const ChatWithRestaurant = ({ restaurant, customerEmail, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);
  
  // Extract order ID and restaurant information from the restaurant prop
  const orderId = restaurant?.order_id || (typeof restaurant === 'string' ? restaurant : null);
  const restaurantId = restaurant?.restaurantInfo?.id || restaurant?.restaurant_id;
  const restaurantName = restaurant?.restaurantInfo?.name || restaurant?.restaurantName || 'Restaurant';
  
  if (!orderId) {
    console.error('Order ID is missing:', restaurant);
  }
  
  // Initialize socket connection
  useEffect(() => {
    const socketUrl = 'http://localhost:5000';
    const newSocket = io(socketUrl);
    
    setSocket(newSocket);
    
    newSocket.on('connect', () => {
      console.log('Socket connected');
      
      // Join customer room
      newSocket.emit('joinCustomerRoom', { customerEmail });

      if (orderId) {
        newSocket.emit('joinOrderRoom', { orderId });
        console.log(`Joined order room for order: ${orderId}`);
      }
    });
    
    return () => {
      if (newSocket) {
        // Leave rooms before disconnecting
        if (orderId) {
          newSocket.emit('leaveOrderRoom', { orderId });
        }
        newSocket.emit('leaveCustomerRoom', { customerEmail });
        newSocket.disconnect();
      }
    };
  }, [customerEmail,orderId]);
  
  // Socket event listeners for real-time updates
  useEffect(() => {
    if (!socket || !orderId) return;
    const processedMessages = new Set();

    const handleNewMessage = (message) => {
      console.log('Received new message:', message);
      
      // Skip if already processed or not for this order
      if (processedMessages.has(message._id) || message.order_id !== orderId) return;
      
      // Mark as processed
      processedMessages.add(message._id);
      
      // Add to messages state
      setMessages(prev => [...prev, message]);
      
      // Mark received messages as read if they're from the restaurant
      if (message.sender_type === 'restaurant') {
        socket.emit('markMessageRead', { messageId: message._id });
      }
    };
    
    // Handler for our own sent messages
    const handleMessageSent = (message) => {
      console.log('Message sent confirmation:', message);
      
      // Skip if already processed or not for this order
      if (processedMessages.has(message._id) || message.order_id !== orderId) return;
      
      // Mark as processed
      processedMessages.add(message._id);
      
      // Add to messages state
      setMessages(prev => [...prev, message]);
    };
    
    // Listen for socket events
    socket.on('newMessage', handleNewMessage);
    socket.on('messageSent', handleMessageSent);
    
    // Listen for new messages
    socket.on('newMessage', (message) => {
      console.log('Received new message:', message);
      
      // Only add message if it's related to current order
      if (message.order_id === orderId) {
        console.log('Adding message to state:', message);
        setMessages(prev => [...prev, message]);
        
        // Mark received messages from restaurant as read
        if (message.sender_type === 'restaurant') {
          socket.emit('markMessageRead', { messageId: message._id });
        }
      }
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
    
    // Cleanup when component unmounts or dependencies change
    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('messageSent', handleMessageSent);
      socket.off('messageRead');
    };
  }, [socket, orderId, customerEmail]);
  
  // Load chat history when the modal opens
  useEffect(() => {
    const fetchChatHistory = async () => {
      if (!orderId) {
        setError('Order ID is missing. Cannot load chat history.');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:5000/chat_history/${orderId}/${customerEmail}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch chat history');
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
    
    if (socket) {
      fetchChatHistory();
    }
  }, [orderId, customerEmail, socket]);
  
  // Scroll to bottom of messages when they change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Send a new message
  const handleSendMessage = () => {
    if (!newMessage.trim() || !orderId || !socket) return;
    
    const messageData = {
      order_id: orderId,
      sender_type: 'customer',
      user_sender_email: customerEmail,
      sender_name: localStorage.getItem('userName') || 'Customer',
      recipient_type: 'restaurant',
      restaurant_recipient_id: restaurantId,
      content: newMessage
    };
    
    console.log('Sending message:', messageData);
    
    // Send message through socket
    socket.emit('sendMessage', messageData);
    
    // Clear input
    setNewMessage('');
  };
  
  if (error) {
    return (
      <div className="chat-modal">
        <div className="chat-modal-content">
          <div className="chat-modal-header">
            <h2>Chat with {restaurantName}</h2>
            <button className="chat-close-button" onClick={onClose}>×</button>
          </div>
          <div className="chat-error">Error: {error}</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="chat-modal">
      <div className="chat-modal-content">
        <div className="chat-modal-header">
          <h2>Chat with {restaurantName}</h2>
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
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button 
            className="chat-send-button"
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWithRestaurant;