# VedioTracker: Advanced Video Progress Tracking System

A sophisticated system for tracking and visualizing viewing progress in educational videos. It accurately records watched segments, handles native player seeks, and ensures data persistence for a seamless user experience.

## Live Demo

You can access the live application here:

-   **Frontend (Vercel):** [https://vediotrackertest.vercel.app](https://vediotrackertest.vercel.app)
-   **Backend API Base (Render):** [https://vediotrackertest.onrender.com](https://vediotrackertest.onrender.com)
    *(Note: This is the base URL. API endpoints are typically prefixed with `/api`)*

## Features

- **Accurate Segment Tracking**: Precisely records watched video intervals.
- **Unique View Time Calculation**: Progress is based on uniquely watched portions, ignoring rewatches.
- **Robust Seek Handling**: Correctly tracks progress even when users jump to different parts of the video using the native player controls.
- **Debounced Real-time Saving**: Efficiently saves progress to the backend with debouncing to minimize network requests, using `useRef` to ensure the latest data is saved.
- **Persistent Storage**: Leverages MongoDB to store user progress, allowing resumption across sessions.
- **Interactive Progress Bar**: Visually displays watched segments and live viewing progress.
- **JWT Authentication**: Secures user data and progress.
- **Responsive UI**: Built with React, Vite, TailwindCSS, and Shadcn/UI for a modern user experience.

## Setup and Installation

This project is a monorepo with a `frontend` and a `backend` directory.

1.  **Clone the Repository**
    ```bash
    git clone <repository-url> # Replace <repository-url> with the actual URL
    cd Vediotrackertest
    ```

2.  **Backend Setup**
    Navigate to the backend directory:
    ```bash
    cd backend
    ```
    Install dependencies:
    ```bash
    npm install
    ```
    Create a `.env` file in the `backend` directory (`backend/.env`) with the following content, replacing placeholder values:
    ```env
    MONGODB_URI=your_mongodb_connection_string_here
    JWT_SECRET=your_strong_jwt_secret_here
    PORT=5000 # Or any port you prefer for the backend
    ```

3.  **Frontend Setup**
    Navigate to the frontend directory (from the project root):
    ```bash
    cd frontend
    ```
    Or, if you are in the `backend` directory:
    ```bash
    cd ../frontend
    ```
    Install dependencies:
    ```bash
    npm install
    ```
    Create a `.env` file in the `frontend` directory (`frontend/.env`) with the following content:
    ```env
    VITE_API_BASE_URL=http://localhost:5000/api # Adjust port if your backend runs on a different port
    ```

## Running the Application

1.  **Start the Backend Server**
    In a terminal, navigate to the `backend` directory and run:
    ```bash
    npm run dev
    ```
    The backend server should typically start on `http://localhost:5000` (or the `PORT` configured in `backend/.env`).

2.  **Start the Frontend Development Server**
    In another terminal, navigate to the `frontend` directory and run:
    ```bash
    npm run dev
    ```
    The frontend application will usually be available at `http://localhost:5173` (Vite's default). Open this URL in your browser.

## Design Decisions

### Progress Tracking

- Uses interval-based tracking system to record exact watched segments
- Merges overlapping intervals to prevent double-counting
- Maintains continuous position tracking for learning integrity
- Saves progress automatically every 10 seconds and on key events

### Progress Visualization

- Interactive timeline showing watched segments
- Clear visual feedback of overall progress
- Segment-based seeking with position validation
- Detailed hover information for each watched segment

For detailed technical implementation and architecture details, see [TECHNICAL.md](./TECHNICAL.md).

## Technologies Used

- **Frontend**: React, TypeScript, TailwindCSS, shadcn/ui
- **Video Player**: ReactPlayer with custom progress tracking
- **Backend**: Express, Node.js
- **Database**: MongoDB with optimized querying
- **Authentication**: JWT with secure token management

## API Documentation

### Progress Endpoints

- `GET /api/progress?videoId={id}`: Get current progress
- `POST /api/progress`: Update progress with new intervals

### Authentication Endpoints

- `POST /api/auth/register`: Create new user account
- `POST /api/auth/login`: Authenticate and receive JWT

## License

MIT License - See LICENSE file for details