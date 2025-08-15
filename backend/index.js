const express = require('express');
const app = express();
const port = 3001;
const cors = require('cors');

app.use(cors());
app.get('/api/test', (req, res) => {
    res.json({ message: 'Welcome to the Converto backend!' });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});