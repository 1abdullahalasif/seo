const express = require('express'); // Import Express framework
const dotenv = require('dotenv'); // Import dotenv for environment variable management
const connectDatabase = require('./config/database'); // Import database connection logic
const apiRoutes = require('./routes/api'); // Import API routes

// Load environment variables from .env file
dotenv.config();

const app = express(); // Initialize Express application

// Middleware to parse JSON payloads
app.use(express.json());

// Register API routes under /api
app.use('/api', apiRoutes);

// Define the port for the application
const PORT = process.env.PORT || 3001;

// Function to start the server
const startServer = async () => {
    try {
        // Connect to MongoDB
        await connectDatabase();
        // Start the Express server
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        // Log any errors and stop the server from running
        console.error('Error starting server:', error.message);
        process.exit(1); // Exit process with failure code
    }
};

// Start the server
startServer();
