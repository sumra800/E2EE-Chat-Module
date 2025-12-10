import React from 'react';
import './ContactList.css';

function ContactList({ contacts, selectedContact, onSelectContact, loading }) {
  if (loading) {
    return (
      <div className="contact-list">
        <div className="loading">Loading contacts...</div>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="contact-list">
        <div className="empty-state">No contacts available</div>
      </div>
    );
  }

  return (
    <div className="contact-list">
      <div className="contact-list-header">
        <h3>Contacts</h3>
        <span className="contact-count">{contacts.length}</span>
      </div>
      <div className="contact-items">
        {contacts.map(contact => (
          <div
            key={contact.id}
            className={`contact-item ${selectedContact?.id === contact.id ? 'selected' : ''}`}
            onClick={() => onSelectContact(contact)}
          >
            <div className="contact-avatar">
              {contact.username.charAt(0).toUpperCase()}
            </div>
            <div className="contact-info">
              <div className="contact-name">{contact.username}</div>
              {contact.fingerprint && (
                <div className="contact-fingerprint">
                  🔐 {contact.fingerprint}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ContactList;

