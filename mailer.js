/* eslint-disable no-undef */
/* eslint-disable no-console */
require('dotenv').config();
const nodemailer = require('nodemailer');

const mailer = (createdContact) => {
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
};

module.exports = mailer;
