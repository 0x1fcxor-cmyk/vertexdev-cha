import { Resend } from 'resend';

/**
 * Resend email service integration
 * Handles all email sending operations using Resend API
 */
class ResendEmailService {
  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('RESEND_API_KEY not set. Email features will be disabled.');
      this.resend = null;
    } else {
      this.resend = new Resend(apiKey);
    }
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@vertexdev.chat';
    this.fromName = process.env.RESEND_FROM_NAME || 'VertexDev Chat';
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(to, username) {
    try {
      const data = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [to],
        subject: 'Welcome to VertexDev Chat!',
        html: this.getWelcomeTemplate(username),
      });

      console.log('Welcome email sent:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send email verification email
   */
  async sendVerificationEmail(to, username, verificationUrl) {
    try {
      const data = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [to],
        subject: 'Verify your VertexDev Chat email',
        html: this.getVerificationTemplate(username, verificationUrl),
      });

      console.log('Verification email sent:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error sending verification email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(to, username, resetUrl) {
    try {
      const data = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [to],
        subject: 'Reset your VertexDev Chat password',
        html: this.getPasswordResetTemplate(username, resetUrl),
      });

      console.log('Password reset email sent:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send two-factor authentication email
   */
  async send2FAEmail(to, username, code) {
    try {
      const data = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [to],
        subject: 'Your VertexDev Chat verification code',
        html: this.get2FATemplate(username, code),
      });

      console.log('2FA email sent:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error sending 2FA email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification email
   */
  async sendNotificationEmail(to, username, subject, message) {
    try {
      const data = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [to],
        subject: `[VertexDev Chat] ${subject}`,
        html: this.getNotificationTemplate(username, message),
      });

      console.log('Notification email sent:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error sending notification email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send invitation email
   */
  async sendInvitationEmail(to, inviterName, inviteUrl, serverName) {
    try {
      const data = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [to],
        subject: `${inviterName} invited you to join ${serverName} on VertexDev Chat`,
        html: this.getInvitationTemplate(inviterName, inviteUrl, serverName),
      });

      console.log('Invitation email sent:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error sending invitation email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Welcome email template
   */
  getWelcomeTemplate(username) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to VertexDev Chat</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #22c55e; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to VertexDev Chat!</h1>
          </div>
          <div class="content">
            <p>Hi ${username},</p>
            <p>Welcome to VertexDev Chat! We're excited to have you join our community.</p>
            <p>VertexDev Chat is a modern, real-time messaging platform with:</p>
            <ul>
              <li>Instant messaging with real-time updates</li>
              <li>Dark theme with green accents</li>
              <li>Right-click context menus</li>
              <li>Smooth popups and modals</li>
              <li>And much more!</li>
            </ul>
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}" class="button">Get Started</a>
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p>Best regards,<br>The VertexDev Chat Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 VertexDev Chat. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Verification email template
   */
  getVerificationTemplate(username, verificationUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify your email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #22c55e; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify Your Email</h1>
          </div>
          <div class="content">
            <p>Hi ${username},</p>
            <p>Please verify your email address by clicking the button below:</p>
            <a href="${verificationUrl}" class="button">Verify Email</a>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create an account, you can safely ignore this email.</p>
            <p>Best regards,<br>The VertexDev Chat Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 VertexDev Chat. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Password reset template
   */
  getPasswordResetTemplate(username, resetUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset your password</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #22c55e; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Reset Your Password</h1>
          </div>
          <div class="content">
            <p>Hi ${username},</p>
            <p>We received a request to reset your password. Click the button below to reset it:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <div class="warning">
              <p><strong>Security Note:</strong> This link will expire in 1 hour. If you didn't request this, please ignore this email and your password will remain unchanged.</p>
            </div>
            <p>Best regards,<br>The VertexDev Chat Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 VertexDev Chat. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * 2FA template
   */
  get2FATemplate(username, code) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your verification code</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #22c55e; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px; }
          .code { font-size: 32px; font-weight: bold; letter-spacing: 5px; text-align: center; margin: 20px 0; color: #22c55e; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verification Code</h1>
          </div>
          <div class="content">
            <p>Hi ${username},</p>
            <p>Your verification code is:</p>
            <div class="code">${code}</div>
            <p>This code will expire in 5 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
            <p>Best regards,<br>The VertexDev Chat Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 VertexDev Chat. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Notification template
   */
  getNotificationTemplate(username, message) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Notification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #22c55e; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px; }
          .message { background: white; padding: 15px; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 Notification</h1>
          </div>
          <div class="content">
            <p>Hi ${username},</p>
            <div class="message">${message}</div>
            <p>Best regards,<br>The VertexDev Chat Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 VertexDev Chat. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Invitation template
   */
  getInvitationTemplate(inviterName, inviteUrl, serverName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>You're invited!</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #22c55e; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 You're Invited!</h1>
          </div>
          <div class="content">
            <p><strong>${inviterName}</strong> has invited you to join <strong>${serverName}</strong> on VertexDev Chat!</p>
            <p>VertexDev Chat is a modern, real-time messaging platform with amazing features.</p>
            <a href="${inviteUrl}" class="button">Accept Invitation</a>
            <p>This invitation will expire in 7 days.</p>
            <p>Best regards,<br>The VertexDev Chat Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 VertexDev Chat. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

export default new ResendEmailService();
