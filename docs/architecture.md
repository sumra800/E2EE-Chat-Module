# Architecture Documentation

## System Architecture

### Overview

The E2EE Chat Module follows a client-server architecture with end-to-end encryption. The server acts as a message router and key directory, but never has access to plaintext messages.

### High-Level Architecture

```
┌─────────────┐         ┌─────────────┐
│   Client A  │         │   Client B  │
│  (Browser)  │         │  (Browser)  │
└──────┬──────┘         └──────┬──────┘
       │                       │
       │ 1. Generate Keys      │
       │ 2. Upload Public Key  │
       │                       │
       │ 3. Get B's Public Key │
       │                       │
       │ 4. Encrypt Message    │
       │    (RSA + AES-GCM)    │
       │                       │
       └───────┬───────────────┘
               │
               │ Ciphertext Only
               │
       ┌───────▼───────┐
       │    Server     │
       │  (Node.js)    │
       │               │
       │  - Key Dir    │
       │  - Routing    │
       │  - Socket.IO  │
       └───────────────┘
```

## Component Architecture

### Client-Side Components

#### 1. Crypto Utilities (`cryptoUtils.js`)
- **Key Generation**: RSA-OAEP 2048-bit key pairs
- **Key Storage**: IndexedDB for secure local storage
- **Encryption**: Hybrid RSA/AES-GCM scheme
- **Key Exchange**: Public key import/export in PEM format

#### 2. React Components
- **App.js**: Main application component, handles authentication and key initialization
- **Login.js**: Authentication UI
- **Chat.js**: Main chat container, manages contacts and messages
- **ContactList.js**: Displays available contacts
- **ChatWindow.js**: Message display and input with privacy warnings

#### 3. Services
- **api.js**: REST API client for authentication and key management
- **socketService.js**: Socket.IO client for real-time messaging

#### 4. Privacy Assistant
- **privacyAssistant.js**: Pattern-based detection of sensitive data (phone, email, CNIC, etc.)

### Server-Side Components

#### 1. Models (MongoDB)
- **User**: Stores user credentials and public keys
- **Message**: Stores encrypted messages (ciphertext only)

#### 2. Routes
- **auth.js**: User registration and login
- **keys.js**: Public key upload and retrieval
- **chat.js**: Message history retrieval

#### 3. Socket Handler
- **socketHandler.js**: Real-time message routing via Socket.IO
- Handles encrypted message delivery
- Manages online/offline status

## Encryption Flow

### Key Generation
1. Client generates RSA key pair using Web Crypto API
2. Public key is exported to PEM format
3. Public key is uploaded to server
4. Private key is stored locally in IndexedDB

### Message Encryption
1. Generate fresh AES-256-GCM key for each message
2. Encrypt message plaintext with AES-GCM
3. Encrypt AES key with recipient's RSA public key (RSA-OAEP)
4. Send ciphertext, encrypted key, IV, and auth tag to server

### Message Decryption
1. Receive encrypted message components
2. Decrypt AES key using RSA private key
3. Decrypt message using AES-GCM
4. Verify integrity using auth tag

## Data Flow

### Sending a Message
```
User Input → Privacy Check → Encrypt (AES + RSA) → Socket.IO → Server → Socket.IO → Recipient → Decrypt → Display
```

### Receiving a Message
```
Socket.IO → Receive Ciphertext → Decrypt (RSA + AES) → Display → Update UI
```

## Security Features

### Encryption
- **Algorithm**: Hybrid RSA-OAEP (2048-bit) + AES-GCM (256-bit)
- **Key Exchange**: RSA-OAEP for AES key encryption
- **Message Encryption**: AES-GCM for authenticated encryption
- **Integrity**: Built-in with AES-GCM authentication tag

### Key Management
- Private keys never leave the client
- Public keys stored on server with fingerprint verification
- Keys stored in IndexedDB (browser's secure storage)

### Transport Security
- HTTPS/WSS for all communications
- JWT authentication for API and Socket.IO
- Server-signed public key bindings

### Privacy Protection
- Server never sees plaintext
- Message metadata only (sender, receiver, timestamp)
- AI privacy assistant warns about sensitive data

## Database Schema

### User Collection
```javascript
{
  _id: ObjectId,
  username: String,
  email: String,
  password: String (hashed),
  publicKey: String (PEM format),
  publicKeyFingerprint: String,
  keyGeneratedAt: Date,
  createdAt: Date
}
```

### Message Collection
```javascript
{
  _id: ObjectId,
  senderId: ObjectId,
  receiverId: ObjectId,
  ciphertext: String (base64),
  encryptedKey: String (base64),
  iv: String (base64),
  authTag: String (base64),
  sequenceNumber: Number,
  timestamp: Date,
  delivered: Boolean,
  read: Boolean
}
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Keys
- `POST /api/keys/upload` - Upload public key
- `GET /api/keys/:userId` - Get user's public key
- `GET /api/keys` - Get all users with keys

### Chat
- `GET /api/chat/history/:otherUserId` - Get message history
- `PUT /api/chat/read/:otherUserId` - Mark messages as read

## Socket.IO Events

### Client → Server
- `send_message` - Send encrypted message
- `typing` - Typing indicator
- `user_online` - Notify user is online

### Server → Client
- `receive_message` - Receive encrypted message
- `message_sent` - Message sent confirmation
- `pending_messages` - Undelivered messages on reconnect
- `typing` - Typing indicator from other user
- `connected` - Connection confirmation

## Deployment Considerations

### Environment Variables
- `PORT`: Server port (default: 5000)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret for JWT signing
- `CLIENT_URL`: Frontend URL for CORS

### Production Checklist
- [ ] Use strong JWT secret
- [ ] Enable HTTPS/WSS
- [ ] Use MongoDB Atlas or secure MongoDB instance
- [ ] Set up proper CORS configuration
- [ ] Enable rate limiting
- [ ] Set up logging and monitoring
- [ ] Regular security audits

## Limitations

1. **Key Recovery**: If private key is lost, messages cannot be decrypted
2. **Forward Secrecy**: Not implemented (each message uses new AES key but RSA key is static)
3. **Group Chat**: Currently supports only 1-on-1 messaging
4. **File Transfer**: Not implemented
5. **Key Verification**: Manual fingerprint verification not implemented in UI

## Future Enhancements

1. Implement Perfect Forward Secrecy (PFS) using ephemeral keys
2. Add group chat support with group key management
3. Implement key rotation mechanism
4. Add file/media encryption
5. Implement key verification UI with QR codes
6. Add message deletion/expiration
7. Implement read receipts

