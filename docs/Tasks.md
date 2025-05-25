# MVP Build Plan - Video Progress Tracker

## Backend Tasks (Node.js + MongoDB)

### Setup and Configuration

1. **Initialize Node.js project**

   * `npm init -y`
   * Verify: package.json is created

2. **Install core dependencies**

   * Install `express`, `mongoose`, `cors`, `dotenv`, `jsonwebtoken`, `bcryptjs`
   * Verify: node\_modules present and package.json updated

3. **Setup server.js with Express boilerplate**

   * Start a basic Express app with CORS + JSON parsing
   * Verify: `GET /` returns hello world

4. **Configure MongoDB connection**

   * Create `config/db.js` to connect using `mongoose.connect`
   * Verify: Connection logs success or failure

### Auth System

5. **Create User model (User.js)**

   * Fields: `email`, `password`
   * Verify: Can create document manually in Mongo

6. **Register route and controller**

   * `POST /api/auth/register`
   * Hash password with bcrypt and save
   * Verify: Creates user in DB, returns success

7. **Login route and controller**

   * `POST /api/auth/login`
   * Validate password and return JWT
   * Verify: Correct credentials return token

8. **Middleware to verify JWT**

   * Create `authMiddleware.js`
   * Protect routes by decoding token
   * Verify: Unauthorized users get 401

### Progress Tracking

9. **Create Progress model (Progress.js)**

   * Fields: `userId`, `videoId`, `watchedIntervals`, `lastPosition`, `progressPercent`
   * Verify: Can insert a sample manually

10. **POST /api/progress route**

* Accepts intervals, merges with existing, calculates progress
* Verify: Returns updated progress

11. **GET /api/progress route**

* Returns user’s progress for a video
* Verify: Returns stored intervals and position

12. **Implement mergeIntervals utility**

* Pure function to merge overlapping segments
* Verify: Input/output unit test for various cases

## Frontend Tasks (React + Tailwind)

### Setup and Configuration

13. **Bootstrap React project with Vite**

* `npm create vite@latest`
* Verify: App renders with Hello World

14. **Install TailwindCSS**

* Configure `tailwind.config.js` and `index.css`
* Verify: A styled heading appears

15. **Install React Router**

* Define routes for `/login`, `/register`, `/lecture`
* Verify: Navigation works between pages

### Authentication

16. **Create AuthContext with login state**

* Store JWT and user in localStorage
* Verify: Persist across reloads

17. **Build Register component**

* Form to create user
* Verify: Register API call works

18. **Build Login component**

* Form to login, store token
* Verify: AuthContext updates

19. **Create ProtectedRoute component**

* Redirects unauthenticated users
* Verify: Cannot access `/lecture` unless logged in

### Video Tracking UI

20. **Build Lecture page layout**

* Basic shell with header, video, progress bar
* Verify: Static layout renders

21. **Integrate ReactPlayer for video playback**

* Load test video, allow play/pause
* Verify: Video plays and fires onProgress

22. **Track watched intervals in state**

* Use `useRef` and `useEffect` to log intervals
* Verify: Console logs watched ranges accurately

23. **Call POST /api/progress on interval update**

* Send merged intervals + position
* Verify: DB gets updated on watch

24. **Call GET /api/progress on mount**

* Fetch resume point and intervals
* Verify: Player resumes from correct time

25. **Display dynamic progress bar**

* Show watched % based on response
* Verify: UI updates on new viewing

26. **Handle seek and rewatch correctly**

* Prevent double-counting
* Verify: Progress doesn’t change on rewatch

### Finalization

27. **Add logout and navbar**

* Show user email + logout
* Verify: Clears state and token

28. **Write README + setup docs**

* Describe how to run client/server
* Verify: Fresh setup succeeds

29. **Deploy backend to Render**

* Set ENV variables for Mongo and JWT
* Verify: Public endpoint works

30. **Deploy frontend to Vercel**

* Point to backend URL
* Verify: Full flow works online

---

Each task is modular, focused, and testable independently. You can now hand this list to an engineering LLM to execute and test each part one-by-one.
