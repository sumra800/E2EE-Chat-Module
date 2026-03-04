import React, { useState, useEffect, useCallback } from 'react';
import './Chat.css';
import ContactList from './ContactList';
import ChatWindow from './ChatWindow';
import socketService from '../services/socketService';
import cryptoUtils from '../crypto/cryptoUtils';
import { keysAPI, chatAPI } from '../services/api';

function Chat({ user, onLogout, keysGenerated }) {
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState({});
  const [loading, setLoading] = useState(true);
  const [recipientPublicKey, setRecipientPublicKey] = useState(null);

  const handleReceiveMessage = useCallback(async (data) => {
    try {
      // Decrypt message
      const plaintext = await cryptoUtils.decryptMessage(
        data.ciphertext,
        data.encryptedKey,
        data.iv,
        data.authTag
      );

      const message = {
        id: data.messageId,
        senderId: data.senderId,
        receiverId: user.id,
        plaintext,
        timestamp: new Date(data.timestamp),
        sent: false,
      };

      setMessages(prev => ({
        ...prev,
        [data.senderId]: [...(prev[data.senderId] || []), message],
      }));
    } catch (error) {
      console.error('Failed to decrypt message:', error);
      alert('Failed to decrypt received message.');
    }
  }, [user.id]);

  const handlePendingMessages = useCallback(async (pendingMessages) => {
    for (const msg of pendingMessages) {
      await handleReceiveMessage(msg);
    }
  }, [handleReceiveMessage]);

  const handleMessageSent = useCallback((data) => {
    console.log('Message sent confirmation:', data);
    // Update message status if needed
  }, []);

  useEffect(() => {
    if (!keysGenerated) {
      setLoading(false);
      return;
    }

    // Connect to socket
    const token = localStorage.getItem('token');
    if (token) {
      socketService.connect(token);

      // Set up message handlers
      socketService.onReceiveMessage(handleReceiveMessage);
      socketService.onPendingMessages(handlePendingMessages);
      socketService.onMessageSent(handleMessageSent);

      // Load contacts
      const loadContacts = async () => {
        try {
          const response = await keysAPI.getAllUsers();
          setContacts(response.data);
          setLoading(false);
        } catch (error) {
          console.error('Failed to load contacts:', error);
          setLoading(false);
        }
      };

      loadContacts();
    }

    return () => {
      socketService.disconnect();
      socketService.removeListener('receive_message', handleReceiveMessage);
      socketService.removeListener('pending_messages', handlePendingMessages);
      socketService.removeListener('message_sent', handleMessageSent);
    };
  }, [keysGenerated, handleReceiveMessage, handlePendingMessages, handleMessageSent]);



  const extractId = (value) => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      return value._id || value.id || null;
    }
    return null;
  };

  const loadMessageHistory = async (contactId) => {
    try {
      const response = await chatAPI.getMessageHistory(contactId);
      const decryptedHistory = [];

      for (const msg of response.data) {
        try {
          const plaintext = await cryptoUtils.decryptMessage(
            msg.ciphertext,
            msg.encryptedKey,
            msg.iv,
            msg.authTag
          );

          const senderId = extractId(msg.senderId);
          const receiverId = extractId(msg.receiverId);

          decryptedHistory.push({
            id: msg._id || msg.id || `${msg.sequenceNumber}-${msg.timestamp}`,
            senderId,
            receiverId,
            plaintext,
            timestamp: new Date(msg.timestamp),
            sent: senderId === user.id,
          });
        } catch (error) {
          console.error('Failed to decrypt historical message:', error);
        }
      }

      setMessages(prev => ({
        ...prev,
        [contactId]: decryptedHistory,
      }));
    } catch (error) {
      console.error('Failed to load message history:', error);
    }
  };

  const handleSelectContact = async (contact) => {
    setSelectedContact(contact);
    setMessages(prev => ({
      ...prev,
      [contact.id]: prev[contact.id] || [],
    }));

    try {
      // Load recipient's public key
      const response = await keysAPI.getPublicKey(contact.id);
      const publicKeyPem = response.data.publicKey;
      const importedKey = await cryptoUtils.importPublicKey(publicKeyPem);
      setRecipientPublicKey(importedKey);

      await loadMessageHistory(contact.id);
    } catch (error) {
      console.error('Failed to load contact public key:', error);
      alert('Failed to load contact. Please try again.');
    }
  };

  const handleSendMessage = async (plaintext) => {
    if (!selectedContact || !recipientPublicKey) {
      alert('Please select a contact first');
      return;
    }

    try {
      // Encrypt message
      const encryptedData = await cryptoUtils.encryptMessage(plaintext, recipientPublicKey);

      // Send via socket
      socketService.sendMessage(selectedContact.id, encryptedData);

      // Add to local messages (optimistic update)
      const message = {
        id: Date.now(),
        senderId: user.id,
        receiverId: selectedContact.id,
        plaintext,
        timestamp: new Date(),
        sent: true,
      };

      setMessages(prev => ({
        ...prev,
        [selectedContact.id]: [...(prev[selectedContact.id] || []), message],
      }));
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    }
  };



  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>Study Buddy E2EE Chat</h2>
        <div className="user-info">
          <span>Welcome, {user.username}</span>
          <button onClick={onLogout} className="logout-btn">Logout</button>
        </div>
      </div>

      {!keysGenerated ? (
        <div className="loading-keys">
          <p>Generating encryption keys... Please wait.</p>
        </div>
      ) : (
        <div className="chat-content">
          <ContactList
            contacts={contacts}
            selectedContact={selectedContact}
            onSelectContact={handleSelectContact}
            loading={loading}
          />
          <ChatWindow
            contact={selectedContact}
            messages={messages[selectedContact?.id] || []}
            currentUserId={user.id}
            onSendMessage={handleSendMessage}
          />
        </div>
      )}
    </div>
  );
}

export default Chat;

