# Video Progress Tracker - Architecture Documentation

## Overview

This document outlines the architecture of a video progress tracker system. It ensures accurate tracking of unique video segments watched by users. The system also supports authentication, persistent progress storage, and seamless resume functionality.

## Tech Stack

### Frontend

* **Framework**: React.js (Vite)
* **State Management**: React Hooks, Context API
* **Video Player**: `react-player`
* **Styling**: Tailwind CSS
* **Routing**: React Router DOM
* **Authentication**: JWT stored in `localStorage`
* **Deployment**: Vercel

### Backend

* **Framework**: Node.js with Express.js
* **Database**: MongoDB Atlas
* **Authentication**: JWT with email & password
* **Deployment**: Render or Railway

## Database Connection

```
mongodb+srv://admin:admin@progresstracker.aogwpwa.mongodb.net/?retryWrites=true&w=majority&appName=ProgressTracker
```

---

## Folder Structure

### Frontend (`client/`)

```
client/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── Auth/
│   │   │   ├── Login.js
│   │   │   └── Register.js
│   │   ├── VideoPlayer.js
│   │   └── ProgressBar.js
│   ├── context/
│   │   └── AuthContext.js
│   ├── pages/
│   │   ├── Home.js
│   │   └── Lecture.js
│   ├── services/
│   │   └── api.js
│   ├── utils/
│   │   └── intervalUtils.js
│   ├── App.js
│   └── main.jsx
├── .env
└── package.json
```

### Backend (`server/`)

```
server/
├── controllers/
│   ├── authController.js
│   └── progressController.js
├── middlewares/
│   └── authMiddleware.js
├── models/
│   ├── User.js
│   └── Progress.js
├── routes/
│   ├── authRoutes.js
│   └── progressRoutes.js
├── utils/
│   └── mergeIntervals.js
├── config/
│   └── db.js
├── server.js
├── .env
└── package.json
```

---

## What Each Part Does

### Frontend

* **VideoPlayer.js**: Renders and controls the video, tracks playback.
* **ProgressBar.js**: Displays percentage watched.
* **AuthContext.js**: Manages login state, JWT, and user info globally.
* **api.js**: Centralized Axios-based service for API calls.
* **intervalUtils.js**: Handles merging of intervals client-side.
* **Home.js**: Entry point with login/register options.
* **Lecture.js**: Core UI for watching and tracking a lecture video.

### Backend

* **authController.js**: Handles user registration, login, and JWT token generation.
* **progressController.js**: Manages saving, retrieving, and merging video intervals.
* **authMiddleware.js**: Validates JWT for protected routes.
* **User.js**: User schema (email, password hash).
* **Progress.js**: Stores userId, videoId, watchedIntervals, lastPosition, totalProgress.
* **mergeIntervals.js**: Utility function to merge overlapping watched segments.
* **db.js**: Connects to MongoDB Atlas.

---

## State Management and Data Flow

### State Lives:

* **Frontend**: Auth state in `AuthContext`, video state in `VideoPlayer.js`
* **Backend**: Persistent state stored in MongoDB

### Services & Connections:

* Frontend communicates with backend via REST API (Axios)
* Authenticated routes require JWT token
* Backend persists progress and user data in MongoDB

### Example Flow:

1. User logs in → JWT issued → stored in `localStorage`
2. Video is played → intervals are recorded client-side
3. On pause or interval, POST `/api/progress` with intervals and position
4. Server merges intervals, calculates progress, updates DB
5. On next login, GET `/api/progress` returns current progress and resume point

---

## APIs

### Auth APIs

* `POST /api/auth/register`
* `POST /api/auth/login`

### Progress APIs

* `GET /api/progress?userId&videoId`
* `POST /api/progress` (requires JWT)

---

## Deployment

* **Frontend**: Vercel (`npm run build` → deploy)
* **Backend**: Render (connect GitHub repo → auto-deploy)
* **Environment Variables**:

  * `JWT_SECRET`
  * `MONGO_URI`

---

## Notes

* Handle video duration via `react-player` or native metadata
* Save progress on `pause`, `seek`, or `interval`
* Ensure token refresh or re-login flow for expired JWTs

---

## Final Deliverables

* GitHub Repo with `/client` and `/server`
* README with setup instructions
* Live Link (Vercel + Render)
