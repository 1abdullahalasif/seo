const mongoose = require('mongoose');

const connectDatabase = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI; // Ensure this is set in your .env file
        if (!mongoURI) {
            throw new Error("MONGODB_URI is not defined in the environment variables.");
        }

        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('MongoDB connected successfully!');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
        process.exit(1); // Exit the application if the database connection fails
    }
};

module.exports = connectDatabase;
