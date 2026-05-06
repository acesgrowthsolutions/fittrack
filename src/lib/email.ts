import { Resend } from "resend";

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Sends transactional email via Resend if RESEND_API_KEY is set; otherwise
 * logs the contents to the terminal so local dev remains functional without
 * a real email provider.
 *
 * Returns the provider message id on send, or null when falling back to
 * console output. Never throws on send failure — logs the error and returns
 * null so the caller (typically Better Auth's reset/verification flow) can
 * still complete its happy path.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: SendEmailParams): Promise<string | null> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "RESEND_API_KEY is not set in production — auth emails (password reset, verification) will NOT be delivered. Set RESEND_API_KEY and EMAIL_FROM in your Vercel environment."
      );
    }
    const link = extractFirstUrl(text);
    // eslint-disable-next-line no-console
    console.log(
      `\n${"=".repeat(72)}\n📧 EMAIL (no RESEND_API_KEY — printing to terminal)\n${"-".repeat(72)}\nTo:      ${to}\nFrom:    ${from}\nSubject: ${subject}\n${link ? `\n🔗 Link:  ${link}\n` : ""}${"-".repeat(72)}\n${text}\n${"=".repeat(72)}\n`
    );
    return null;
  }

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text,
    });
    if (result.error) {
      console.error("Resend rejected email:", result.error);
      return null;
    }
    return result.data?.id ?? null;
  } catch (err) {
    console.error("Failed to send email via Resend:", err);
    return null;
  }
}

/** Minimal-style password reset email body. */
export function passwordResetTemplate(
  email: string,
  resetUrl: string
): { html: string; text: string } {
  const safeUrl = resetUrl;
  return {
    text:
      `Hi,\n\n` +
      `We received a request to reset the password for ${email}.\n\n` +
      `Reset your password: ${safeUrl}\n\n` +
      `If you didn't request this, you can safely ignore this email — your password will not change.\n\n` +
      `This link will expire in 1 hour.`,
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111;">
        <h1 style="font-size:20px;margin:0 0 16px;">Reset your password</h1>
        <p style="margin:0 0 12px;line-height:1.5;">
          We received a request to reset the password for <strong>${escapeHtml(email)}</strong>.
        </p>
        <p style="margin:24px 0;">
          <a href="${safeUrl}"
             style="display:inline-block;padding:12px 20px;background:#111;color:#fff;text-decoration:none;border-radius:6px;font-weight:500;">
            Reset password
          </a>
        </p>
        <p style="margin:0 0 12px;color:#555;font-size:14px;line-height:1.5;">
          Or paste this link into your browser:<br/>
          <span style="word-break:break-all;">${safeUrl}</span>
        </p>
        <p style="margin:24px 0 0;color:#888;font-size:13px;line-height:1.5;">
          If you didn't request this, you can safely ignore this email — your password will not change.
          This link expires in 1 hour.
        </p>
      </div>
    `,
  };
}

/** Minimal-style verification email body. */
export function verificationTemplate(
  email: string,
  verifyUrl: string
): { html: string; text: string } {
  return {
    text:
      `Hi,\n\n` +
      `Confirm ${email} for FitTrack: ${verifyUrl}\n\n` +
      `If you didn't sign up, you can ignore this email.`,
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111;">
        <h1 style="font-size:20px;margin:0 0 16px;">Confirm your email</h1>
        <p style="margin:0 0 12px;line-height:1.5;">
          Tap the button below to confirm <strong>${escapeHtml(email)}</strong> for FitTrack.
        </p>
        <p style="margin:24px 0;">
          <a href="${verifyUrl}"
             style="display:inline-block;padding:12px 20px;background:#111;color:#fff;text-decoration:none;border-radius:6px;font-weight:500;">
            Confirm email
          </a>
        </p>
        <p style="margin:0 0 12px;color:#555;font-size:14px;line-height:1.5;">
          Or paste this link into your browser:<br/>
          <span style="word-break:break-all;">${verifyUrl}</span>
        </p>
        <p style="margin:24px 0 0;color:#888;font-size:13px;line-height:1.5;">
          If you didn't sign up, you can safely ignore this email.
        </p>
      </div>
    `,
  };
}

function extractFirstUrl(s: string): string | null {
  const match = s.match(/https?:\/\/\S+/);
  return match ? match[0] : null;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
