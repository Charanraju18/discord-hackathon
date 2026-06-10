# ANTIGRAVITY_SKILLS.md

## Project Overview

This project is a Discord-inspired real-time communication platform being built during a 3-hour AI-focused hackathon.

The primary objective is to deliver a polished, demo-ready MVP that demonstrates real-time collaboration, modern UI, and AI-assisted software development.

The project prioritizes speed, reliability, and demo quality over production-scale complexity.

---

# Core Principle

Always prefer:

* Working implementation
* Clean UX
* Fast development
* Simple architecture
* Reusable components

Over:

* Enterprise-level complexity
* Premature optimization
* Unnecessary abstractions
* Features that increase debugging risk

---

# Technology Stack

## Frontend

* React
* Vite
* TypeScript
* Tailwind CSS
* ShadCN UI
* React Router
* Socket.IO Client

## Backend

* Node.js
* Express
* MongoDB
* Mongoose
* Socket.IO
* JWT Authentication

---

# Architecture Preferences

Use feature-based architecture.

Frontend:
```
src/
├── features/
├── components/
├── pages/
├── layouts/
├── hooks/
├── services/
├── lib/
├── types/
```
Backend:
```
src/
├── controllers/
├── services/
├── routes/
├── middleware/
├── models/
├── sockets/
├── config/
├── utils/
```
Avoid deeply nested folder structures.

---

# Design Guidelines

Create a modern Discord-inspired experience.

Requirements:

* Dark theme by default
* Modern typography
* Consistent spacing
* Responsive layout
* Professional visual hierarchy
* Smooth interactions

Layout Structure:

Servers Sidebar
Channels Sidebar
Main Chat Area

Use ShadCN components whenever possible.

---

# Authentication Standards

Implement:

* Register
* Login
* Logout
* JWT Authentication
* Protected Routes

Do NOT implement:

* Email verification
* OAuth
* Password reset
* Two-factor authentication

Keep authentication simple.

---

# Database Models

User

* id
* username
* email
* password

Server

* id
* name

Channel

* id
* name
* serverId

Message

* id
* content
* senderId
* channelId
* createdAt

Avoid adding unnecessary models.

---

# Real-Time Communication Standards

Use Socket.IO.

Required Events:

* join-channel
* send-message
* receive-message
* typing
* stop-typing
* user-online
* user-offline

Messages must:

* Persist in MongoDB
* Broadcast instantly
* Support multiple connected users

---

# UI Expectations

Prioritize:

* Fast rendering
* Responsive layouts
* Skeleton loaders
* Empty states
* Loading states
* Toast notifications

Chat messages should:

* Display sender
* Display timestamp
* Auto-scroll to newest message

---

# Code Generation Standards

Generate complete implementations.

Never generate:

* TODO comments
* Placeholder logic
* Mock implementations

Always provide:

* Full file contents
* Imports
* Exports
* TypeScript types
* Error handling

---

# TypeScript Standards

Always use strict typing.

Avoid:

* any
* unknown when unnecessary

Create reusable interfaces.

Prefer:

interface User {}

over:

type User = {}

unless union types are required.

---

# API Standards

Use REST APIs.

Examples:

POST /api/auth/register

POST /api/auth/login

GET /api/servers

GET /api/channels/:serverId

GET /api/messages/:channelId

POST /api/messages

Use consistent JSON responses.

Success:

{
"success": true,
"data": {}
}

Error:

{
"success": false,
"message": "Error description"
}

---

# Performance Requirements

Optimize for:

* Demo reliability
* Quick startup
* Low complexity

Do not introduce:

* Redis
* Microservices
* Event buses
* CQRS
* GraphQL

---

# Hackathon Priorities

Priority 1:
Authentication

Priority 2:
Real-time messaging

Priority 3:
Discord-style UI

Priority 4:
Online presence

Priority 5:
Typing indicators

Priority 6:
UI polish

---

# Features Explicitly Out of Scope

Do not build:

* Voice channels
* Video calls
* Screen sharing
* Roles
* Permissions
* Threads
* Reactions
* DMs
* File uploads
* Search
* Friend system
* Advanced notifications

If a feature is not required for the MVP, avoid implementing it.

---

# Expected Outcome

At the end of development the application should support:

1. User Registration
2. User Login
3. Server Navigation
4. Channel Navigation
5. Real-Time Messaging
6. Message Persistence
7. Online Presence
8. Typing Indicators
9. Responsive Discord-Like UI

All generated code should maximize hackathon success and demo readiness.
