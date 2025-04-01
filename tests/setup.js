jest.mock('../config/db', () => {
    const pgMock = require('pgmock2');
    return {
      query: jest.fn((text, params) => pgMock.query(text, params))
    };
  });
  
  jest.mock('../config/email', () => {
    const nodemailerMock = require('nodemailer-mock');
    const transporter = nodemailerMock.createTransport({});
    return {
      sendMail: jest.fn((mailOptions, callback) => transporter.sendMail(mailOptions, callback))
    };
  });