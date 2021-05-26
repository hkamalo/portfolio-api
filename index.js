/* eslint-disable global-require */
/* eslint-disable import/order */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
/* eslint-disable no-shadow */
/* eslint-disable no-unused-vars */
const express = require('express');
const Joi = require('joi');
const cors = require('cors');
const nodemailer = require('nodemailer');
const connection = require('./db-config');
require('dotenv').config();
const {
  PORT,
  CORS_ALLOWED_ORIGINS,
  inTestEnv,
  MY_EMAIL_ADDRESS,
  EMAIL_API_V3_KEY,
} = require('./env');

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

// ----------------Create a campaign\
// const SibApiV3Sdk = require('sib-api-v3-sdk');

// const defaultClient = SibApiV3Sdk.ApiClient.instance;

// // -----Instantiate the client---//
// const apiKey = defaultClient.authentications['api-key'];
// apiKey.apiKey = EMAIL_API_V3_KEY;
// const apiInstance = new SibApiV3Sdk.EmailCampaignsApi();

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

  // ------Check data are good-------- //
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

  // ------Check if the data are already in the DB beforre insert-------- //

  if (error) {
    res.status(422).json({ validationErrors: error.details });
  } else {
    const SibApiV3Sdk = require('sib-api-v3-sdk');
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apikey = EMAIL_API_V3_KEY;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = apikey;

    const apiInstance = new SibApiV3Sdk.ContactsApi();

    const createContact = new SibApiV3Sdk.CreateContact();
    createContact.email = email;
    createContact.listId = [2];

    apiInstance.createContact(createContact).then(
      (data) => {
        res.status(200);
        res.send('ok');
      },
      (error) => {
        res.status(500);
        res.send('fail');
      }
    );
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
          connection.query(
            'INSERT INTO contact (company, firstname, lastname, email, message) VALUES (?, ?, ?, ?, ?)',
            [company, firstname, lastname, email, message]
          );
        }
      }
    );
    // // ---Make the call to the client\
    // const emailCampaigns = new SibApiV3Sdk.CreateEmailCampaign({
    //   name: 'Campaign sent via the API',
    //   subject: 'My subject',
    //   sender: { "name": 'De H. Kamalo', "email": "heranca.kamalo@gmail.com" },
    //   type: 'classic',

    //   // -----Content that will be sent\
    //   htmlContent: `Bonjour ${firstname}
    // Merci pour votre message, je reviendrais vers vous au plus vite.
    // Bien cordialement,
    // H. Kamalo
    // ---------------------------
    // Réponse à : ${firstname} ${lastname}
    // ${email}
    // Message :
    // ${message}
    // ---------------------------`,

    //   // -----Select the recipients\
    //   recipients: {
    //     listIds: [2, 7],
    //   },
    // });

    // apiInstance.createEmailCampaign(emailCampaigns).then(
    //   (data) => {
    //     console.log(`API called successfully. Returned data: ${data}`);
    //   },
    //   (error) => {
    //     console.error(error);
    //   }
    // );

    // ------------Create a SMTP transporter object----------------------//

    // const emailer = nodemailer.createTransport({
    //   host: process.env.SMTP_HOST,
    //   port: process.env.SMTP_PORT,
    //   secure: true,
    //   auth: {
    //     user: process.env.SMTP_USER,
    //     pass: process.env.SMTP_PASSWORD,
    //   },
    //   tls: {
    //     ciphers: 'SSLv3',
    //   },
    // });

    // const replyMessage = {
    //   from: `${MY_EMAIL_ADDRESS}`,
    //   to: `${email}, ${MY_EMAIL_ADDRESS}`,
    //   subject: 'Confirmation de réception',
    //   text: `Bonjour ${firstname}
    //             Merci pour votre message, je reviendrais vers vous au plus vite.
    //             Bien cordialement,
    //             H. Kamalo
    //             ---------------------------
    //             Réponse à : ${firstname} ${lastname}
    //             ${email}
    //             Message :
    //             ${message}
    //             ---------------------------`,
    //   html: `${htmlOutput}`,
    // };

    // emailer.sendMail({ replyMessage }, (err, info) => {
    //   if (err) console.error(err);
    //   else console.log(info);
    // });
  }
});
