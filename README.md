# IP Geolocation API

Backend API for IP Geolocation assessment built with Node.js and Express.

## Features
- Session-based authentication
- IP geolocation using ipinfo.io API
- Search history tracking
- SQLite database

## Setup
1. Install dependencies: `npm install`
2. Setup database: `npm run setup`
3. Start server: `npm start`

## API Endpoints
- `POST /api/login` - User authentication
- `POST /api/logout` - User logout
- `GET /api/geo` - Get IP geolocation
- `GET /api/history` - Get search history
- `DELETE /api/history` - Delete history items

## Demo Credentials
- Email: test@example.com
- Password: password123