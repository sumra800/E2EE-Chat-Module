/**
 * Cryptographic utilities for E2EE chat
 * Uses Web Crypto API for browser-based encryption
 */

class CryptoUtils {
  constructor() {
    this.privateKey = null;
    this.publicKey = null;
    this.keyPair = null;
    this.sequenceNumber = 0;
    this.activeUserId = null;
  }

  /**
   * Set the currently active user (used for per-user key storage)
   * @param {string} userId
   */
  setActiveUser(userId) {
    this.activeUserId = userId;
  }

  /**
   * Clear keys from memory (called on logout)
   */
  clearKeysFromMemory() {
    this.privateKey = null;
    this.publicKey = null;
    this.keyPair = null;
    this.sequenceNumber = 0;
  }

  /**
   * Build storage key for IndexedDB records
   * @param {string} userId
   * @returns {string}
   * @private
   */
  getStorageKey(userId = this.activeUserId) {
    if (!userId) {
      throw new Error('Active user not set for key operations');
    }
    return `keyPair:${userId}`;
  }

  /**
   * Generate RSA key pair for encryption
   * @returns {Promise<{publicKey: CryptoKey, privateKey: CryptoKey}>}
   */
  async generateKeyPair() {
    try {
      this.keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256',
        },
        true, // extractable
        ['encrypt', 'decrypt']
      );

      this.publicKey = this.keyPair.publicKey;
      this.privateKey = this.keyPair.privateKey;

      return {
        publicKey: this.publicKey,
        privateKey: this.privateKey
      };
    } catch (error) {
      console.error('Key generation error:', error);
      throw new Error('Failed to generate key pair');
    }
  }

  /**
   * Export public key to PEM format for storage/transmission
   * @param {CryptoKey} publicKey
   * @returns {Promise<string>}
   */
  async exportPublicKey(publicKey = this.publicKey) {
    try {
      const exported = await window.crypto.subtle.exportKey('spki', publicKey);
      const exportedAsBase64 = this.arrayBufferToBase64(exported);
      return `-----BEGIN PUBLIC KEY-----\n${exportedAsBase64}\n-----END PUBLIC KEY-----`;
    } catch (error) {
      console.error('Export public key error:', error);
      throw new Error('Failed to export public key');
    }
  }

  /**
   * Import public key from PEM format
   * @param {string} pemKey
   * @returns {Promise<CryptoKey>}
   */
  async importPublicKey(pemKey) {
    try {
      // Remove PEM headers and whitespace
      const pemHeader = '-----BEGIN PUBLIC KEY-----';
      const pemFooter = '-----END PUBLIC KEY-----';
      const pemContents = pemKey
        .replace(pemHeader, '')
        .replace(pemFooter, '')
        .replace(/\s/g, '');

      const binaryDer = this.base64ToArrayBuffer(pemContents);

      const publicKey = await window.crypto.subtle.importKey(
        'spki',
        binaryDer,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        true,
        ['encrypt']
      );

      return publicKey;
    } catch (error) {
      console.error('Import public key error:', error);
      throw new Error('Failed to import public key');
    }
  }

  /**
   * Export private key for secure storage (IndexedDB)
   * @returns {Promise<string>}
   */
  async exportPrivateKey() {
    try {
      if (!this.privateKey) {
        throw new Error('No private key available');
      }
      const exported = await window.crypto.subtle.exportKey('pkcs8', this.privateKey);
      const exportedAsBase64 = this.arrayBufferToBase64(exported);
      return `-----BEGIN PRIVATE KEY-----\n${exportedAsBase64}\n-----END PRIVATE KEY-----`;
    } catch (error) {
      console.error('Export private key error:', error);
      throw new Error('Failed to export private key');
    }
  }

  /**
   * Import private key from PEM format
   * @param {string} pemKey
   * @returns {Promise<CryptoKey>}
   */
  async importPrivateKey(pemKey) {
    try {
      const pemHeader = '-----BEGIN PRIVATE KEY-----';
      const pemFooter = '-----END PRIVATE KEY-----';
      const pemContents = pemKey
        .replace(pemHeader, '')
        .replace(pemFooter, '')
        .replace(/\s/g, '');

      const binaryDer = this.base64ToArrayBuffer(pemContents);

      const privateKey = await window.crypto.subtle.importKey(
        'pkcs8',
        binaryDer,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        true,
        ['decrypt']
      );

      this.privateKey = privateKey;
      return privateKey;
    } catch (error) {
      console.error('Import private key error:', error);
      throw new Error('Failed to import private key');
    }
  }

  /**
   * Encrypt message using hybrid encryption (RSA + AES-GCM)
   * @param {string} plaintext
   * @param {CryptoKey} recipientPublicKey
   * @returns {Promise<{ciphertext: string, encryptedKey: string, iv: string, authTag: string, sequenceNumber: number}>}
   */
  async encryptMessage(plaintext, recipientPublicKey) {
    try {
      // Generate a fresh AES-GCM key for this message
      const aesKey = await window.crypto.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256,
        },
        true,
        ['encrypt']
      );

      // Generate IV for AES-GCM
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      // Encrypt the message with AES-GCM
      const plaintextBuffer = new TextEncoder().encode(plaintext);
      const encryptedData = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv,
          tagLength: 128, // 128-bit authentication tag
        },
        aesKey,
        plaintextBuffer
      );

      // Extract ciphertext and auth tag
      const tagLength = 128 / 8; // 16 bytes
      const ciphertext = encryptedData.slice(0, -tagLength);
      const authTag = encryptedData.slice(-tagLength);

      // Export AES key and encrypt it with recipient's RSA public key
      const exportedAesKey = await window.crypto.subtle.exportKey('raw', aesKey);
      const encryptedKey = await window.crypto.subtle.encrypt(
        {
          name: 'RSA-OAEP',
        },
        recipientPublicKey,
        exportedAesKey
      );

      // Increment sequence number
      const seqNum = this.sequenceNumber++;
      const timestamp = Date.now();

      return {
        ciphertext: this.arrayBufferToBase64(ciphertext),
        encryptedKey: this.arrayBufferToBase64(encryptedKey),
        iv: this.arrayBufferToBase64(iv),
        authTag: this.arrayBufferToBase64(authTag),
        sequenceNumber: seqNum,
        timestamp
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt message');
    }
  }

  /**
   * Decrypt message using hybrid decryption
   * @param {string} ciphertextBase64
   * @param {string} encryptedKeyBase64
   * @param {string} ivBase64
   * @param {string} authTagBase64
   * @returns {Promise<string>}
   */
  async decryptMessage(ciphertextBase64, encryptedKeyBase64, ivBase64, authTagBase64) {
    try {
      if (!this.privateKey) {
        throw new Error('Private key not available for decryption');
      }

      // Decrypt the AES key using RSA private key
      const encryptedKeyBuffer = this.base64ToArrayBuffer(encryptedKeyBase64);
      const decryptedAesKeyBuffer = await window.crypto.subtle.decrypt(
        {
          name: 'RSA-OAEP',
        },
        this.privateKey,
        encryptedKeyBuffer
      );

      // Import the decrypted AES key
      const aesKey = await window.crypto.subtle.importKey(
        'raw',
        decryptedAesKeyBuffer,
        {
          name: 'AES-GCM',
          length: 256,
        },
        false,
        ['decrypt']
      );

      // Combine ciphertext and auth tag
      const ciphertextBuffer = this.base64ToArrayBuffer(ciphertextBase64);
      const authTagBuffer = this.base64ToArrayBuffer(authTagBase64);
      const encryptedData = new Uint8Array(ciphertextBuffer.byteLength + authTagBuffer.byteLength);
      encryptedData.set(new Uint8Array(ciphertextBuffer), 0);
      encryptedData.set(new Uint8Array(authTagBuffer), ciphertextBuffer.byteLength);

      // Decrypt the message
      const iv = this.base64ToArrayBuffer(ivBase64);
      const decryptedData = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
          tagLength: 128,
        },
        aesKey,
        encryptedData
      );

      // Convert to plaintext
      const plaintext = new TextDecoder().decode(decryptedData);
      return plaintext;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt message');
    }
  }

  /**
   * Generate fingerprint for public key verification
   * @param {string} publicKeyPem
   * @returns {string}
   */
  generateFingerprint(publicKeyPem) {
    const encoder = new TextEncoder();
    const data = encoder.encode(publicKeyPem);
    
    return window.crypto.subtle.digest('SHA-256', data)
      .then(hashBuffer => {
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex.substring(0, 16).toUpperCase().match(/.{1,4}/g).join('-');
      });
  }

  // Helper methods
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Load keys from IndexedDB
   */
  async loadKeysFromStorage(userId = this.activeUserId) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('E2EEChatDB', 1);

      request.onerror = () => reject(new Error('Failed to open IndexedDB'));
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['keys'], 'readonly');
        const store = transaction.objectStore('keys');
        const storageKey = this.getStorageKey(userId);
        const getRequest = store.get(storageKey);

        getRequest.onsuccess = async () => {
          if (getRequest.result) {
            try {
              await this.importPrivateKey(getRequest.result.privateKey);
              this.publicKey = await this.importPublicKey(getRequest.result.publicKey);
              resolve(true);
            } catch (error) {
              reject(error);
            }
          } else {
            resolve(false);
          }
        };

        getRequest.onerror = () => reject(new Error('Failed to read from IndexedDB'));
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('keys')) {
          db.createObjectStore('keys');
        }
      };
    });
  }

  /**
   * Save keys to IndexedDB
   */
  async saveKeysToStorage(userId = this.activeUserId) {
    if (!this.privateKey || !this.publicKey) {
      throw new Error('No keys to save');
    }

    const privateKeyPem = await this.exportPrivateKey();
    const publicKeyPem = await this.exportPublicKey();
    const storageKey = this.getStorageKey(userId);

    return new Promise((resolve, reject) => {
      const request = indexedDB.open('E2EEChatDB', 1);

      request.onerror = () => reject(new Error('Failed to open IndexedDB'));
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['keys'], 'readwrite');
        const store = transaction.objectStore('keys');
        const putRequest = store.put(
          { privateKey: privateKeyPem, publicKey: publicKeyPem },
          storageKey
        );

        putRequest.onsuccess = () => resolve(true);
        putRequest.onerror = () => reject(new Error('Failed to save to IndexedDB'));
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('keys')) {
          db.createObjectStore('keys');
        }
      };
    });
  }
}

export default new CryptoUtils();

