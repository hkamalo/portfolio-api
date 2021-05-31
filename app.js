/* eslint-disable global-require */
/* eslint-disable import/order */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
/* eslint-disable no-shadow */
/* eslint-disable no-unused-vars */
const cors = require('cors');

const express = require('express');
const Joi = require('joi');

const nodemailer = require('nodemailer');
// const connection = require('./db-config');
const helmet = require('helmet');
require('dotenv').config();

const mailchimpClient = require('@mailchimp/mailchimp_transactional')(
  process.env.MAIL_CHIMP_API_KEY
);

const emailPerso = process.env.MY_EMAIL_ADDRESS;
const app = express();
app.use(express.json());
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
    },
  })
);

// ------Handle DB connection error--------- //

// connection.connect((err) => {
//   if (err) {
//     console.error(`error connecting: ${err.stack}`);
//   } else {
//     console.log(
//       `connected to database with threadId :  ${connection.threadId}`
//     );
//   }
// });

// app settings
// app.set('x-powered-by', false); // for security

// const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS.split(',');
// const corsOptions = {
//   origin: (origin, callback) => {
//     if (origin === undefined || allowedOrigins.indexOf(origin) !== -1) {
//       callback(null, true);
//     } else {
//       callback(new Error('Not allowed by CORS'));
//     }
//   },
//   credentials: true,
// };

app.use(cors());

// ------Server setup--------- //
const port = process.env.PORT || 5001;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

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

  console.log(company, firstname, lastname, email, message);
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
    // const run = async () => {
    //   const response = await mailchimpClient.messages.sendTemplate({
    //     template_name: 'confirmation',
    //     template_content: [
    //       {
    //         name: 'name',
    //         content: `${firstname}`,
    //       },
    //     ],
    //     message: {
    //       subject: 'Confirmation de reception',
    //       from_email: 'contact.pro@hkamalo.com',
    //       to: [
    //         {
    //           email: `${email}`,
    //           type: 'to',
    //         },
    //       ],
    //       global_merge_vars: [
    //         {
    //           name: 'fname',
    //           content: `${firstname}`,
    //         },
    //       ],

    //       signing_domain: 'www.hkamalo.com',
    //     },
    //   });
    //   console.log(response);
    // };

    // run();

    // ------------Create a SMTP transporter object----------------------//

    const portfolioContactCopy = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const contactMessage = {
      "from": `${process.env.MY_EMAIL_ADDRESS}`,
      "to": `${process.env.MY_EMAIL_ADDRESS}`,
      "subject": "Message portfolio",
      "text": `Message laissé par : ${firstname} ${lastname}, de l'entreprise : ${company}, email: ${email}, ${message}`,
      "html": `
      <div>
      <p><strong>Entreprise: </strong>${company}</p>
      <p><strong>Prénom: </strong>${firstname}</p>
      <p><strong>Nom: </strong>${lastname}</p>
      <p><strong>Email: </strong>${email}</p>
      </div>
      <div>
      <p><strong>Message: </strong>${message}</p>
      </div>
      `,
    };

    portfolioContactCopy.sendMail(contactMessage, (err, info) => {
      if (err) {
        console.log(`Error occurred. ${err.contactMessage}`);
        res.sendStatus(500);
      } else {
        console.log('Message sent: %s', info.contactMessageId);
        res.sendStatus(200);
      }
    });
  };
});
