import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './components/Login';
import Chat from './components/Chat';
import { authAPI, keysAPI } from './services/api';
import cryptoUtils from './crypto/cryptoUtils';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [keysGenerated, setKeysGenerated] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
      authAPI.getCurrentUser()
        .then(response => {
          setUser(response.data);
          cryptoUtils.setActiveUser(response.data.id);
          initializeKeys(response.data);
        })
        .catch(() => {
          localStorage.removeItem('token');
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [initializeKeys]);

  const initializeKeys = React.useCallback(async (userData) => {
    try {
      if (!userData?.id) {
        throw new Error('Missing user information for key initialization');
      }
      cryptoUtils.setActiveUser(userData.id);
      // Try to load keys from storage
      const keysLoaded = await cryptoUtils.loadKeysFromStorage(userData.id);

      if (!keysLoaded) {
        // Generate new keys if not found
        if (!userData.hasPublicKey) {
          await generateAndUploadKeys(userData.id);
        } else {
          // User has keys on server but not locally - need to regenerate
          // (In production, you might want to sync from server)
          console.warn('Keys exist on server but not locally. Regenerating...');
          await generateAndUploadKeys(userData.id);
        }
      } else {
        setKeysGenerated(true);
      }
      setLoading(false);
    } catch (error) {
      console.error('Key initialization error:', error);
      setLoading(false);
    }
  }, []);

  const generateAndUploadKeys = async (userId) => {
    try {
      if (!userId) {
        throw new Error('Missing user id for key generation');
      }
      cryptoUtils.setActiveUser(userId);
      // Generate key pair
      await cryptoUtils.generateKeyPair();

      // Export and upload public key
      const publicKeyPem = await cryptoUtils.exportPublicKey();
      await keysAPI.uploadPublicKey(publicKeyPem);

      // Save keys to IndexedDB
      await cryptoUtils.saveKeysToStorage(userId);

      setKeysGenerated(true);
      console.log('Keys generated and uploaded successfully');
    } catch (error) {
      console.error('Key generation error:', error);
      alert('Failed to generate encryption keys. Please refresh the page.');
    }
  };

  const handleLogin = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      const token = response.data.token;
      localStorage.setItem('token', token);

      const userData = response.data.user;
      setUser(userData);
      cryptoUtils.setActiveUser(userData.id);
      await initializeKeys(userData);
    } catch (error) {
      throw error;
    }
  };

  const handleRegister = async (username, email, password) => {
    try {
      const response = await authAPI.register(username, email, password);
      const token = response.data.token;
      localStorage.setItem('token', token);

      const userData = response.data.user;
      setUser(userData);
      cryptoUtils.setActiveUser(userData.id);
      await initializeKeys(userData);
    } catch (error) {
      throw error;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setKeysGenerated(false);
    cryptoUtils.clearKeysFromMemory();
    cryptoUtils.setActiveUser(null);
  };

  if (loading) {
    return (
      <div className="App">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} onRegister={handleRegister} />;
  }

  return (
    <div className="App">
      <Chat user={user} onLogout={handleLogout} keysGenerated={keysGenerated} />
    </div>
  );
}

export default App;

