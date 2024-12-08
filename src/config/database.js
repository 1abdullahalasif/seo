const mongoose = require('mongoose');

const connectDatabase = async () => {
    try {
        const dbUri = process.env.MONGODB_URI; // Ensure .env contains MONGODB_URI
        if (!dbUri) {
            throw new Error('MONGODB_URI is not defined in environment variables.');
        }
        await mongoose.connect(dbUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connection established successfully');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
        process.exit(1);
    }
};

module.exports = connectDatabase;
