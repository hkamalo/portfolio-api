/* eslint-disable no-console */
/* eslint-disable no-shadow */
/* eslint-disable no-unused-vars */
const express = require('express');
const Joi = require('joi');
const cors = require('cors');
const nodemailer = require('nodemailer');
const connection = require('./db-config');
require('dotenv').config();
const { PORT, CORS_ALLOWED_ORIGINS, inTestEnv } = require('./env');

const app = express();
app.use(express.json());

// ------Handle DB connection error--------- //

connection.connect((err) => {
  if (err) {
    console.error(`error connecting: ${err.stack}`);
  } else {
    console.log(
      `connected to database with threadId :  ${connection.threadId}`
    );
  }
});

// app settings
app.set('x-powered-by', false); // for security

const allowedOrigins = CORS_ALLOWED_ORIGINS.split(',');
const corsOptions = {
  origin: (origin, callback) => {
    if (origin === undefined || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));

// ------Server setup--------- //
app.listen(PORT, () => {
  if (!inTestEnv) {
    console.log(`Server running on port ${PORT}`);
  }
});

// ------process setup : improves error reporting-------- //

process.on('unhandledRejection', (error) => {
  console.error('unhandledRejection', JSON.stringify(error), error.stack);
  process.exit(1);
});
process.on('uncaughtException', (error) => {
  console.error('uncaughtException', JSON.stringify(error), error.stack);
  process.exit(1);
});
process.on('beforeExit', () => {
  app.close((error) => {
    if (error) console.error(JSON.stringify(error), error.stack);
  });
});

// ------Handle contact form-------- //

app.post('/contact', (req, res) => {
  const { company, firstname, lastname, email, message } = req.body;

  // ------Check if the contact is already create-------- //
  connection.query(
    'SELECT * FROM contact WHERE email = ? AND company = ?',
    [email, company],
    (err, result) => {
      if (result[0]) {
        console.error(err);
        res.status(409).json({
          messageErr:
            'Vous avez déjà pris contact, je reviendrais vers vous au plus vite',
        });
      } else {
        const { error } = Joi.object({
          company: Joi.string().min(2).max(255).required(),
          firstname: Joi.string().min(2).max(100).required(),
          lastname: Joi.string().min(2).max(100).required(),
          message: Joi.string().min(2).required(),
          email: Joi.string().email().min(2).max(255).required(),
        }).validate(
          { company, firstname, lastname, email, message },
          { abortEarly: false }
        );

        // ------Set the contact in the DB-------- //

        if (error) {
          res.status(422).json({ validationErrors: error.details });
        } else {
          connection.query(
            'INSERT INTO contact (company, firstname, lastname, email, message) VALUES (?, ?, ?, ?, ?)',
            [company, firstname, lastname, email, message],
            (err, result) => {
              if (err) {
                console.error(err);
                res.status(500).send('Error saving the contact');
              } else {
                const id = result.insertId;
                const createdContact = {
                  id,
                  company,
                  firstname,
                  lastname,
                  email,
                  message,
                };
                const htmlOutput = `
                <p>Bonjour ${createdContact.firstname}</p>
                <p>Merci pour votre message, je reviendrais vers vous au plus vite.</p>
                <p>Bien cordialement,</p> 
                <h4>H. Kamalo</h4>
                ---------------------------   
                <h4>Réponse à : ${createdContact.firstname} ${createdContact.lastname}</h4>
                <p>${createdContact.email}</p>
                <h3>Message :</h3>
                <p>${createdContact.message}<p></p>
                ---------------------------`;

                // ------------Create a SMTP transporter object----------------------//

                const transporter = nodemailer.createTransport({
                  host: process.env.SMTP_HOST,
                  port: process.env.SMTP_PORT,
                  secure: true,
                  auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASSWORD,
                  },
                });

                const replyMessage = {
                  from: `kamalo.pro@gmail.com`,
                  bcc: `${createdContact.email}, kamalo.pro@gmail.com`,
                  subject: 'Confirmation de réception',
                  text: `Bonjour ${createdContact.firstname}
                Merci pour votre message, je reviendrais vers vous au plus vite.
                Bien cordialement,
                H. Kamalo
                ---------------------------   
                Réponse à : ${createdContact.firstname} ${createdContact.lastname}
                ${createdContact.email}
                Message :
                ${createdContact.message}
                ---------------------------`,
                  html: htmlOutput,
                };

                transporter.sendMail(replyMessage, (err, info) => {
                  if (err) {
                    console.log(`Error occurred. ${err.replyMessage}`);
                    res.sendStatus(500);
                  } else {
                    console.log('Message sent: %s', info.replyMessageId);
                    res.sendStatus(200);
                  }
                });
                res.status(201).json(createdContact);
              }
            }
          );
        }
      }
    }
  );
});
