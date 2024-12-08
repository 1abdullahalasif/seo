const express = require('express');
const connectDatabase = require('./config/database'); // Ensure the path is correct
const apiRoutes = require('./routes/api');

const app = express();

app.use(express.json());
app.use('/api', apiRoutes);

const PORT = process.env.PORT || 3001;

const startServer = async () => {
    await connectDatabase(); // Connect to MongoDB
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
};

startServer();
