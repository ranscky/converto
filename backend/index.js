require('dotenv').config();

const express = require('express');
const app = express();
const port = 3001;
const cors = require('cors');
const { MongoClient } = require('mongodb')

app.use(cors());
const uri = process.env.MONGODB_URI
const client = new MongoClient(uri);

app.get('/api/test', async(req, res) => {
    try {
        await client.connect();
        const database = client.db('converto');
        await database.collection('test').insertOne({ message: 'Hello from Converto!', timestamp: new Date() });
        res.json({ message: `MongoDB connected! Data inserted at ${new Date()}` });
    } catch (error) {
        res.json({ message: 'Error connecting to database' + error});
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});