'use strict';

const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.from = null;
    this._init();
  }

  _init() {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASS) {
      console.warn('[EmailService] GMAIL_USER or GMAIL_APP_PASS not set — magic links disabled');
      return;
    }
    this.from = `"StadiumPulse" <${process.env.GMAIL_USER}>`;
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASS
      }
    });
  }

  isAvailable() {
    return !!this.transporter;
  }

  async sendMagicLink(toEmail, magicLink, userName) {
    if (!this.transporter) {
      throw new Error('Email service not configured');
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width"/>
      </head>
      <body style="margin:0;padding:0;background:#f5f5f5;
        font-family:Arial,sans-serif">
        <div style="max-width:480px;margin:40px auto;
          background:#ffffff;border-radius:16px;
          overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1)">
          
          <div style="background:#0a0e1a;padding:28px 32px;
            text-align:center">
            <div style="font-size:24px;font-weight:700;color:#00d4ff;
              letter-spacing:1px">STADIUM●PULSE</div>
            <div style="font-size:12px;color:#6b8bb0;margin-top:4px">
              Smart Stadium Experience
            </div>
          </div>

          <div style="padding:32px">
            <h2 style="margin:0 0 8px;color:#1a1a2e;font-size:22px">
              Hey ${userName || 'there'} 👋
            </h2>
            <p style="color:#555;font-size:15px;line-height:1.6;
              margin:0 0 28px">
              Click the button below to sign in to StadiumPulse.
              This link is valid for <strong>15 minutes</strong>
              and can only be used once.
            </p>

            <a href="${magicLink}"
              style="display:block;text-align:center;padding:16px;
                background:#00d4ff;color:#000000;border-radius:10px;
                font-size:16px;font-weight:700;text-decoration:none;
                letter-spacing:0.3px">
              Sign in to StadiumPulse
            </a>

            <p style="color:#999;font-size:12px;margin:24px 0 0;
              text-align:center;line-height:1.6">
              If you didn't request this login link, you can safely 
              ignore this email. Someone may have typed your email 
              address by mistake.
            </p>
          </div>

          <div style="background:#f9f9f9;padding:16px 32px;
            text-align:center;border-top:1px solid #eee">
            <p style="color:#bbb;font-size:11px;margin:0">
              StadiumPulse — Smart Venue Experience System<br/>
              This is an automated message. Do not reply.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.transporter.sendMail({
      from:    this.from,
      to:      toEmail,
      subject: 'Your StadiumPulse login link',
      html
    });
  }

  async verifyConnection() {
    if (!this.transporter) return false;
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = new EmailService();
