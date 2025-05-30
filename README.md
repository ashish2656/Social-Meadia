# Social Media Platform

A full-stack social media application similar to Instagram, built with vanilla JavaScript, Express.js, and MongoDB.

## Features

- User authentication (login/register)
- Create, like, and comment on posts
- User profiles
- Follow/unfollow users
- Image upload
- Responsive design
- Real-time feed updates

## Tech Stack

### Frontend
- HTML5
- CSS3
- Vanilla JavaScript
- Font Awesome for icons

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- Multer for file uploads

## Setup

1. Clone the repository:
```bash
git clone https://github.com/YourUsername/Social-Meadia.git
cd Social-Meadia
```

2. Install dependencies:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies (if any)
cd ../frontend
```

3. Create a `.env` file in the backend directory:
```
MONGODB_URI=your_mongodb_uri
PORT=8000
JWT_SECRET=your_jwt_secret
NODE_ENV=development
```

4. Start the servers:
```bash
# Start backend server (from backend directory)
npm run dev

# Serve frontend (from frontend directory)
# Use any static file server like live-server, http-server, etc.
```

5. Open your browser and navigate to `http://localhost:8080`

## Project Structure

```
├── backend/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── uploads/
│   └── server.js
└── frontend/
    ├── js/
    ├── styles/
    ├── images/
    └── index.html
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License. 