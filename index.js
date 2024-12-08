const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/database');

// Load environment variables from `.env` file
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware for parsing JSON
app.use(express.json());

// Import your routes here
const auditRoutes = require('./routes/auditRoutes');

// Use your routes
app.use('/api/audit', auditRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
