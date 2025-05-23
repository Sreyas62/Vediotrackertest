# Video Progress Tracking System

A sophisticated video progress tracking system designed for educational content. Accurately tracks and visualizes video viewing progress with precise interval tracking and continuous position monitoring.

## Features

- **Precise Progress Tracking**: Records exact segments watched with interval-based tracking
- **Smart Progress Calculation**: Only counts unique viewing time, preventing inflation from rewatching
- **Interactive Timeline**: Visual representation of watched segments with seek functionality
- **Continuous Position Tracking**: Maintains viewing integrity by tracking last continuous position
- **Real-time Progress Updates**: Automatic progress saving with optimistic updates
- **Secure Authentication**: JWT-based user authentication system
- **Persistent Progress**: MongoDB-backed progress storage with efficient querying

## Setup and Installation

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd video-progress-tracker
   npm install
   ```

2. **Environment Setup**
   Create `.env` file:
   ```
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Access Application**
   Open http://localhost:5000 in your browser

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