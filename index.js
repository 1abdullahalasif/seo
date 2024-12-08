const express = require('express');
const dotenv = require('dotenv');
const connectDatabase = require('./config/database'); // Ensure this path is correct
const apiRoutes = require('./routes/api');

dotenv.config(); // Load environment variables from .env file

const app = express();
app.use(express.json());
app.use('/api', apiRoutes);

const PORT = process.env.PORT || 3001;

const startServer = async () => {
    try {
        await connectDatabase(); // Connect to MongoDB
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Error starting server:', error.message);
    }
};

startServer();
