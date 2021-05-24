const express = require('express');
const connection = require('./db-config');
require('dotenv').config();

const app = express();
const port = process.env.PORT;
app.use(express.json());

connection.connect((err) => {
  if (err) {
    console.error('error connecting: ' + err.stack);
  } else {
    console.log(
      'connected to database with threadId :  ' + connection.threadId
    );
  }
});

app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});

app.get('/contact', (req, res) => {
  connection.query('SELECT * FROM contact', (err, result) => {
    if (err) {
      res.status(500).send('Error retrieving data from database');
    } else {
      res.status(200).json(result);
    }
  });
});

app.post('/contact', (req, res) => {
  const { company, firstname, lastname, email, message } = req.body;

  connection.query(
    'INSERT INTO contact(company, firstname, lastname, email, message) VALUES (?, ?, ?, ?, ?)',
    [company, firstname, lastname, email, message],
    (err, result) => {
      if (err) {
        res.status(500).send('Error saving the contact');
      } else {
        res.status(201).send('contact successfully saved');
      }
    }
  );
});
