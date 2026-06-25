# Campus Notification Platform

A React + Vite frontend demonstrating notification listing, type filtering, and priority inbox behavior.

## Setup

1. Open a terminal in `notification-app-fe`
2. Run `npm install`
3. Run `npm run dev`
4. Open the local dev URL shown by Vite (usually `http://localhost:5173`)

## Configuration

If the remote notification API requires authorization, create a `.env` file based on `.env.example`:

```env
VITE_API_TOKEN="Bearer <your-token>"
```

## Notes

- The app fetches from `http://4.224.186.213/evaluation-service/notifications`
- If the remote API is unavailable, a fallback sample dataset is displayed
- The `Priority Inbox` tab uses a top-10 ranking algorithm based on type and recency
- The `Logs` tab displays events captured by the custom logging middleware
