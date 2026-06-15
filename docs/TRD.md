# Technical Requirements Document (TRD)

## 1. Architecture Overview
Campus Knowledge Hub utilizes a modern **MERN Stack (MongoDB, Express.js, React.js, Node.js)** architecture. The application is logically separated into a backend REST API and a frontend Single Page Application (SPA).

- **Frontend**: React (Vite), React Router v7, Tailwind CSS (Design System concepts via standard CSS).
- **Backend**: Node.js, Express.js.
- **Database**: MongoDB (Mongoose ODM).
- **Caching**: In-memory caching middleware for high-traffic read operations.
- **Payments**: Razorpay API.

## 2. Infrastructure & Deployment
- **API Gateway/Routing**: Standard RESTful API paradigms with JSON payloads.
- **Authentication**: Stateless JWT (JSON Web Tokens) passed via HTTP-Only cookies or Authorization headers.
- **Storage**: GridFS or external bucket (e.g., AWS S3 / Cloudinary) for PDF, image, and media asset storage.
- **Environment Management**: Configured via `.env` files ensuring sensitive keys (Razorpay, JWT secrets, DB URIs) are isolated from source code.

## 3. Security & Compliance
- **Rate Limiting**: `express-rate-limit` implemented on authentication and high-frequency endpoints to prevent brute force and DDoS attacks.
- **Data Validation**: Strict schema validation using Mongoose and route-level validation arrays to prevent NoSQL injection and ensure data integrity.
- **Password Hashing**: `bcryptjs` utilizing salt rounds for secure password storage.
- **CORS**: Configured strictly to allow requests only from authorized frontend origins.
- **XSS Protection**: React’s native DOM escaping combined with backend sanitization (Helmet).

## 4. Performance Optimization
1. **Response Caching**: Custom `cacheMiddleware` caches identical `GET` requests (e.g., fetching subjects, colleges) with role/college-based scope isolation.
2. **Cache Invalidation**: `invalidateCacheMiddleware` aggressively purges stale data upon `POST/PUT/DELETE` mutations.
3. **Database Indexing**: Compound indexes on high-frequency query patterns (e.g., `collegeId` + `programId` + `branchId`).
4. **Lean Queries**: Utilization of `.lean()` in Mongoose for read-only operations to bypass heavy Document instantiation overhead.

## 5. Third-Party Integrations
- **Razorpay**: Used for processing INR payments. Handles checkout payload generation and webhook/signature verification natively in the backend.
- **Gemini / OpenAI (AI Studio)**: REST API integration for LLM-based student query resolution.

## 6. Real-Time Systems
- The Community Chat feature utilizes high-frequency optimized endpoints with lightweight payloads for rapid polling, ensuring near real-time message delivery without the overhead of maintaining thousands of persistent WebSocket connections in low-resource environments.

## 7. Quality Assurance
- Backend utilizes standard `node:test` framework.
- Core business logic (Caching, Rate Limiting, RBAC Scope resolution, Gateway formatting, and Auth Validation) has >90% test coverage.
