import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

let transporter: nodemailer.Transporter | null = null;

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) return transporter;

  if (config.smtp.user && config.smtp.pass) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  } else {
    // In dev / test or when no SMTP credentials are provided, use JSON transport / console fallback
    // Or generate ethereal test account
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log(`[Mailer] Ethereal test account created: ${testAccount.user}`);
    } catch {
      // Fallback to json transport
      transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      console.log('[Mailer] Falling back to JSON/Console mailer transport');
    }
  }

  return transporter;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(options: SendMailOptions): Promise<{ messageId?: string; previewUrl?: string | false }> {
  try {
    const transport = await getTransporter();
    const info = await transport.sendMail({
      from: config.smtp.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`[Mailer] Email sent to ${options.to}. Subject: "${options.subject}"`);
    if (previewUrl) {
      console.log(`[Mailer] Preview URL: ${previewUrl}`);
    }

    return { messageId: info.messageId, previewUrl };
  } catch (err) {
    console.error(`[Mailer] Failed to send email to ${options.to}:`, err);
    // Don't throw - allow silent logging in development so auth flow still returns generic success
    return { previewUrl: false };
  }
}

export async function sendPasswordResetEmail(email: string, rawToken: string): Promise<void> {
  const resetLink = `${config.frontendUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #4f46e5; margin-bottom: 16px;">Brightloop Software - Password Reset</h2>
      <p style="color: #334155; font-size: 15px; line-height: 1.5;">
        You requested a password reset for your Brightloop account. Click the button below to set a new password:
      </p>
      <div style="margin: 24px 0;">
        <a href="${resetLink}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          Reset Password
        </a>
      </div>
      <p style="color: #64748b; font-size: 13px;">
        Or copy and paste this link into your browser:<br />
        <a href="${resetLink}" style="color: #4f46e5;">${resetLink}</a>
      </p>
      <p style="color: #94a3b8; font-size: 12px; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
        This link is valid for 1 hour. If you did not request this reset, you can safely ignore this email.
      </p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: 'Brightloop Software - Password Reset Request',
    text: `Reset your password by following this link: ${resetLink}. This link expires in 1 hour.`,
    html,
  });
}

