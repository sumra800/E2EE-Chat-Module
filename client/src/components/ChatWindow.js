import React, { useState, useRef, useEffect } from 'react';
import './ChatWindow.css';
import privacyAssistant from '../utils/privacyAssistant';

function ChatWindow({ contact, messages, currentUserId, onSendMessage }) {
  const [messageText, setMessageText] = useState('');
  const [privacyWarning, setPrivacyWarning] = useState(null);
  const [showWarning, setShowWarning] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInputChange = (e) => {
    const text = e.target.value;
    setMessageText(text);

    // Check for sensitive data
    const warning = privacyAssistant.getWarningMessage(text);
    setPrivacyWarning(warning);
  };

  const handleSend = (e) => {
    e.preventDefault();
    
    if (!messageText.trim()) return;

    // Show warning if sensitive data detected
    if (privacyWarning && !showWarning) {
      setShowWarning(true);
      return;
    }

    // Send message
    onSendMessage(messageText.trim());
    setMessageText('');
    setPrivacyWarning(null);
    setShowWarning(false);
  };

  const handleDismissWarning = () => {
    setShowWarning(false);
    setPrivacyWarning(null);
  };

  if (!contact) {
    return (
      <div className="chat-window">
        <div className="no-contact-selected">
          <p>Select a contact to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="chat-header-bar">
        <div className="contact-header">
          <div className="contact-avatar-small">
            {contact.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="contact-name-header">{contact.username}</div>
            {contact.fingerprint && (
              <div className="contact-fingerprint-small">
                🔐 {contact.fingerprint}
              </div>
            )}
          </div>
        </div>
        <div className="encryption-badge">🔒 End-to-End Encrypted</div>
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-messages">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.senderId === currentUserId ? 'sent' : 'received'}`}
            >
              <div className="message-content">{message.plaintext}</div>
              <div className="message-time">
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {showWarning && privacyWarning && (
        <div className="privacy-warning-banner">
          <div className="warning-content">
            <span className="warning-icon">⚠️</span>
            <span className="warning-text">{privacyWarning}</span>
          </div>
          <div className="warning-actions">
            <button onClick={handleDismissWarning} className="warning-dismiss">
              Dismiss
            </button>
            <button
              onClick={() => {
                onSendMessage(messageText.trim());
                setMessageText('');
                setPrivacyWarning(null);
                setShowWarning(false);
              }}
              className="warning-send-anyway"
            >
              Send Anyway
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSend} className="message-input-form">
        <input
          type="text"
          value={messageText}
          onChange={handleInputChange}
          placeholder="Type a message..."
          className="message-input"
        />
        <button type="submit" className="send-button" disabled={!messageText.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}

export default ChatWindow;

