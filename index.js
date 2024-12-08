const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(express.json());

// **Set trust proxy for Render**
app.set('trust proxy', 1);

// Import routes
const apiRoutes = require('./src/routes/api');

// Use routes
app.use('/api', apiRoutes);

// MongoDB Connection
const DB_URL = process.env.DB_URL || 'mongodb://localhost:27017/yourDatabase';
mongoose
  .connect(DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
