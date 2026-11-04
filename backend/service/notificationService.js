import nodemailer from "nodemailer";

let transporter;

function getTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) return null;
  if (!transporter) transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
  });
  return transporter;
}

export async function sendNotification({ to, subject, text }) {
  const mailer = getTransporter();
  if (!mailer || !to) return false;
  try {
    await mailer.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, text });
    return true;
  } catch (error) {
    process.stderr.write(`Notification delivery failed: ${error.message}\n`);
    return false;
  }
}

export async function sendVerificationCode({ to, code, purpose = "registration" }) {
  const mailer = getTransporter();
  if (!mailer) {
    const error = new Error("SMTP_NOT_CONFIGURED");
    error.code = "SMTP_NOT_CONFIGURED";
    throw error;
  }

  await mailer.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: purpose === "password_reset" ? "Mã OTP đặt lại mật khẩu STAYORA" : "Mã xác minh email STAYORA",
    text: purpose === "password_reset"
      ? `Mã OTP đặt lại mật khẩu STAYORA của bạn là: ${code}\nMã có hiệu lực trong 10 phút. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này. Không chia sẻ mã với bất kỳ ai.`
      : `Mã OTP đăng ký STAYORA của bạn là: ${code}\nMã có hiệu lực trong 10 phút. Không chia sẻ mã này với bất kỳ ai.`
  });
}
