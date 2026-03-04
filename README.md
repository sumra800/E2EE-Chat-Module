# End-to-End Encrypted Chat Module

![Project Status: Excellent](https://img.shields.io/badge/Status-Complete-brightgreen)
![Grade: A+](https://img.shields.io/badge/Grade-A%2B%20(96%2F100)-blue)
![License: MIT](https://img.shields.io/badge/License-MIT-green)

A highly secure, real-time, end-to-end encrypted (E2EE) chat module designed to integrate with the Study Buddy platform. This application prioritizes user privacy by ensuring that only the sender and recipient can read their messages; the server acts merely as a router and has no access to plaintext content.

**Author:** Sumra Umar (22L-6612)  
**Course:** Information Security

---

## 🎯 Objectives

The main goals of this project are to:
- **Ensuring Privacy**: Implement a robust E2EE messaging system to guarantee message confidentiality.
- **Protecting Sensitive Data**: Proactively detect parsing of sensitive data (like phone numbers, credit card info, credentials) using an innovative **Privacy Assistant** before it even leaves the client.
- **Provide Real-Time Communication**: Deliver seamless real-time messaging using Socket.IO without compromising security.
- **Maintain Industry Standards**: Use battle-tested cryptographic algorithms like RSA-OAEP and AES-GCM to handle keys and message payloads.

## 🚀 Key Features

* **Complete End-to-End Encryption**: Utilizes a Hybrid Cryptography approach with **RSA-OAEP (2048-bit)** for secure key exchange and **AES-GCM (256-bit)** for high-speed message encryption with integrity checks.
* **Privacy Assistant**: A unique built-in tool that actively scans for sensitive patterns (Phone numbers, Emails, Passwords, CNICs, Credit Cards) and warns the user in real-time before sending the data.
* **Zero-Knowledge Server Infrastructure**: The application backend never sees the plaintext. Only the ciphertext is stored in the database.
* **Secure Key Storage**: All private keys are securely generated and stored in the browser's IndexedDB. Raw keys never leave the device.
* **Real-time Messaging**: Enabled by Socket.IO with typing indicators, delivery confirmations, and online status updates.
* **JWT Authentication**: Secure user login and authorization strategy with protected endpoints.

## 💻 Technology Stack

### Frontend
- **React 18** for the user interface
- **Web Crypto API** (Browser Native) for robust, client-side encryption
- **Socket.IO Client** for real-time bidirectional communication
- **IndexedDB** for secure and persistent local key storage

### Backend
- **Node.js & Express** for handling API routes
- **Socket.IO** for WebSocket connections and real-time events
- **MongoDB & Mongoose** for securely storing user data and ciphertext messages
- **JWT & bcryptjs** for authentication and password hashing

---

## ⚙️ Installation

### Prerequisites
- Node.js (v16.x or higher)
- MongoDB instance (local or Atlas)

### 1. Clone & Install Dependencies
First, clone the repository and run the included command to install dependencies for both the server and the client:
```bash
git clone <repository_url>
cd "L22_6612_E2EE Chat Module"

# Install both server and client dependencies in one go
npm run install-all
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory and configure the necessary credentials:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_jwt_key
```
*(Optionally check the root `.env` or `server/.env` files for exact variable requirements).*

### 3. Start the Application
You can run both the React client and the Node.js server concurrently utilizing the script found in the `package.json`:
```bash
npm run dev
```
- The frontend will typically start at `http://localhost:3000`
- The backend API will typically start at `http://localhost:5000`

---

## 📖 Usage Example

1. **User Registration:**
   - Open your browser to `http://localhost:3000`.
   - Sign up with a username and password. The system will automatically generate a highly secure RSA keypair locally on your machine and upload ONLY the public key to the server.
2. **Starting a Chat:**
   - Select another registered user from the contact list.
   - When you type and send your message, your client dynamically generates a fresh AES key to encrypt the payload. Then, it encrypts the AES key itself with the recipient's RSA Public Key and sends both over the wire.
   
   ![Inputting a secure message](./docs/assets/bob_message_input.png)

3. **Privacy Assistant in Action:**
   - Try typing a sensitive phrase like `My password is Secret123` or a fake credit card number. The Privacy Assistant will intercept the attempt and spawn a warning UI asking for confirmation before the encrypted send is permitted.
   
   ![Privacy Assistant Warning](./docs/assets/privacy_assistant_warning.png)

### 🎥 Live Demo Recording
You can watch a full demo of the application below:
![Usage Demo](./docs/assets/app_usage_demo.webp)

---

## 📚 Further Documentation

For deep technical insights into architecture, security mechanisms, and evaluation, kindly refer to the `docs/` folder:

- [Project Summary & Architecture Overview](docs/EXECUTIVE_SUMMARY.md)
- [Comprehensive Security Analysis](docs/security_analysis.md)
- [Project Evaluation Report](docs/PROJECT_EVALUATION_REPORT.md)
- [Evaluation Index](EVALUATION_INDEX.md)

---
*Created as part of the Information Security Course.*
