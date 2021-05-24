const express = require('express');
require('dotenv').config();

const app = express();
const port = process.env.PORT;

app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});

app.get('/', (request, response) => {
  response.send('Welcome to Express');
});

app.post('/contact', (req, res) => {
  res.send('Post route is working 🎉');
});
