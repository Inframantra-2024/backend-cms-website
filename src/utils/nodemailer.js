

import nodemailer from 'nodemailer';

let transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT),
  secure: JSON.parse(process.env.MAIL_SECURE_CONNECTION),
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  }
});

export async function sendMail(to, subject, body, cc = [], from = null, attachments = []) {
  const mailOptions = {
    from: from || process.env.MAIL_FROM,
    to: to,
    subject: subject,
    html: body
  };

  if (cc && cc.length) mailOptions.cc = cc;
  if (attachments && attachments.length) mailOptions.attachments = attachments;

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) return reject({ error });
      resolve({ success: info });
      console.log("Mail Sent SuccessFully");
    });
  });
}
