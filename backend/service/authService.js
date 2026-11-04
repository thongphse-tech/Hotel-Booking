import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { pool } from "../config/database.js";
import { userRepo } from "../repo/userRepo.js";
import { HttpError } from "./httpError.js";
import { normalizeEmail, validatePassword, validatePhone } from "../model/userModel.js";
import { sendNotification, sendVerificationCode } from "./notificationService.js";

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_MINUTES = 15;
const OTP_LIFETIME_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;
const PASSWORD_RESET_TOKEN_MINUTES = 10;

function requireOtpConfiguration() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    throw new HttpError(503, "Máy chủ chưa cấu hình dịch vụ gửi email.");
  }
  if (!process.env.OTP_SECRET) {
    throw new HttpError(503, "Máy chủ chưa cấu hình OTP_SECRET. Hãy thêm vào backend/.env rồi khởi động lại backend.");
  }
}

function hashOtp(email, otp) {
  const secret = process.env.OTP_SECRET;
  if (!secret) {
    throw new HttpError(
      503,
      "Máy chủ chưa cấu hình OTP_SECRET. Hãy thêm OTP_SECRET vào backend/.env rồi khởi động lại backend."
    );
  }
  return createHmac("sha256", secret)
    .update(`${email}:${otp}`)
    .digest("hex");
}

function createOtp() {
  return String(randomInt(100000, 1000000));
}

async function deliverOtp(email, otp, cleanupQuery) {
  try {
    await sendVerificationCode({ to: email, code: otp });
  } catch (error) {
    await cleanupQuery();
    if (error.code === "SMTP_NOT_CONFIGURED") {
      throw new HttpError(503, "Dịch vụ gửi email chưa được cấu hình. Vui lòng liên hệ quản trị viên.");
    }
    process.stderr.write(`OTP email delivery failed: ${error.message}\n`);
    throw new HttpError(503, "Không thể gửi mã OTP đến email này. Vui lòng thử lại sau.");
  }
}

const publicUser = (user) => ({
  id: user.accountid,
  accountId: user.accountid,
  customerId: user.customerid || null,
  fullName: user.fullname || user.username,
  username: user.username,
  email: user.email || user.username,
  phone: user.phone || null,
  address: user.address || null,
  role: user.role
});

function createToken(user) {
  return jwt.sign(
    {
      sub: user.accountid,
      accountId: user.accountid,
      role: user.role,
      customerId: user.customerid || null,
      version: user.tokenversion || 0
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "30m" }
  );
}

export const authService = {
  register: async (data) => {
    const fullName = String(data.fullName || "").trim();
    const email = normalizeEmail(data.email);
    const phone = String(data.phone || "").trim();
    const password = String(data.password || "");
    const confirmPassword = String(data.confirmPassword || "");

    // EX-01: Missing or Invalid Form Data
    if (!fullName) throw new HttpError(400, "Vui lòng nhập họ và tên.");
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, "Email không đúng định dạng.");
    if (!phone) throw new HttpError(400, "Vui lòng nhập số điện thoại.");
    if (!validatePhone(phone)) throw new HttpError(400, "Số điện thoại không hợp lệ.");
    if (!password) throw new HttpError(400, "Vui lòng nhập mật khẩu.");
    // BR-05: Password Complexity (min 8 chars, uppercase, number, special char)
    if (!validatePassword(password)) {
      throw new HttpError(400, "Mật khẩu phải có tối thiểu 8 ký tự, bao gồm ít nhất 1 chữ hoa, 1 số và 1 ký tự đặc biệt.");
    }
    if (password !== confirmPassword) throw new HttpError(400, "Mật khẩu xác nhận không khớp.");
    requireOtpConfiguration();

    const otp = createOtp();
    const otpHash = hashOtp(email, otp);
    const passwordHash = await bcrypt.hash(password, 12);
    const client = await pool.connect();
    let existingPending = false;
    try {
      await client.query("BEGIN");
      // EX-02: Duplicate Email Address
      const existing = await client.query(
        "SELECT 1 FROM customer WHERE lower(email) = $1 UNION SELECT 1 FROM useraccount WHERE lower(username) = $1 LIMIT 1",
        [email]
      );
      if (existing.rowCount) throw new HttpError(400, "Email is already registered.");

      await client.query("DELETE FROM PendingCustomerRegistration WHERE expiresat <= NOW()");
      const pending = (await client.query(
        "SELECT email FROM PendingCustomerRegistration WHERE lower(email) = $1 FOR UPDATE",
        [email]
      )).rows[0];
      if (pending) {
        existingPending = true;
      } else {
        await client.query(
          `INSERT INTO PendingCustomerRegistration
             (email, fullname, phone, passwordhash, otphash, expiresat, attempts, lastsentat)
           VALUES ($1, $2, $3, $4, $5, NOW() + ($6 * INTERVAL '1 minute'), 0, NOW())`,
          [email, fullName, phone || null, passwordHash, otpHash, OTP_LIFETIME_MINUTES]
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      if (error.code === "23505") throw new HttpError(400, "Email is already registered.");
      throw error;
    } finally {
      client.release();
    }

    if (!existingPending) {
      await deliverOtp(email, otp, () => pool.query(
        "DELETE FROM PendingCustomerRegistration WHERE email = $1 AND otphash = $2",
        [email, otpHash]
      ));
    }

    return {
      message: existingPending
        ? "Mã OTP đã được gửi trước đó. Hãy nhập mã hoặc yêu cầu gửi lại."
        : "Mã OTP đã được gửi đến email của bạn.",
      otpSent: true,
      existingPending
    };
  },
  resendRegistrationOtp: async (data = {}) => {
    const email = normalizeEmail(data.email);
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, "Email không đúng định dạng.");
    requireOtpConfiguration();

    const otp = createOtp();
    const otpHash = hashOtp(email, otp);
    const client = await pool.connect();
    let previous;
    let transactionFinished = false;
    try {
      await client.query("BEGIN");
      previous = (await client.query(
        "SELECT * FROM PendingCustomerRegistration WHERE lower(email) = $1 FOR UPDATE",
        [email]
      )).rows[0];
      if (!previous) {
        await client.query("COMMIT");
        transactionFinished = true;
        throw new HttpError(400, "Không tìm thấy đăng ký đang chờ xác minh. Vui lòng đăng ký lại.");
      }
      if (new Date(previous.expiresat) <= new Date()) {
        await client.query("DELETE FROM PendingCustomerRegistration WHERE email = $1", [previous.email]);
        await client.query("COMMIT");
        transactionFinished = true;
        throw new HttpError(400, "Mã OTP đã hết hạn. Vui lòng đăng ký lại.");
      }
      if (Date.now() - new Date(previous.lastsentat).getTime() < OTP_RESEND_COOLDOWN_SECONDS * 1000) {
        await client.query("COMMIT");
        transactionFinished = true;
        throw new HttpError(429, "Vui lòng đợi 60 giây trước khi yêu cầu gửi mã mới.");
      }

      await client.query(
        `UPDATE PendingCustomerRegistration
         SET otphash = $2, expiresat = NOW() + ($3 * INTERVAL '1 minute'),
             attempts = 0, lastsentat = NOW()
         WHERE email = $1`,
        [previous.email, otpHash, OTP_LIFETIME_MINUTES]
      );
      await client.query("COMMIT");
      transactionFinished = true;
    } catch (error) {
      if (!transactionFinished) await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    await deliverOtp(email, otp, () => pool.query(
      `UPDATE PendingCustomerRegistration
       SET otphash = $2, expiresat = $3, attempts = $4, lastsentat = $5
       WHERE email = $1 AND otphash = $6`,
      [previous.email, previous.otphash, previous.expiresat, previous.attempts, previous.lastsentat, otpHash]
    ));
    return { message: "Mã OTP mới đã được gửi đến email của bạn.", otpSent: true };
  },
  verifyRegistrationOtp: async (data = {}) => {
    const email = normalizeEmail(data.email);
    const otp = String(data.otp || "").trim();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, "Email không đúng định dạng.");
    if (!/^\d{6}$/.test(otp)) throw new HttpError(400, "Mã OTP phải gồm 6 chữ số.");

    const client = await pool.connect();
    let result;
    let failure;
    try {
      await client.query("BEGIN");
      const pending = (await client.query(
        "SELECT * FROM PendingCustomerRegistration WHERE lower(email) = $1 FOR UPDATE",
        [email]
      )).rows[0];

      if (!pending) {
        failure = new HttpError(400, "Không tìm thấy đăng ký đang chờ xác minh. Vui lòng đăng ký lại.");
      } else if (new Date(pending.expiresat) <= new Date()) {
        await client.query("DELETE FROM PendingCustomerRegistration WHERE email = $1", [pending.email]);
        failure = new HttpError(400, "Mã OTP đã hết hạn. Vui lòng đăng ký lại.");
      } else if (Number(pending.attempts) >= OTP_MAX_ATTEMPTS) {
        failure = new HttpError(429, "Bạn đã nhập sai OTP quá số lần cho phép. Hãy yêu cầu mã mới.");
      } else {
        const providedHash = Buffer.from(hashOtp(email, otp), "hex");
        const expectedHash = Buffer.from(pending.otphash, "hex");
        const valid = providedHash.length === expectedHash.length && timingSafeEqual(providedHash, expectedHash);
        if (!valid) {
          await client.query(
            "UPDATE PendingCustomerRegistration SET attempts = attempts + 1 WHERE email = $1",
            [pending.email]
          );
          failure = new HttpError(400, "Mã OTP không chính xác.");
        } else {
          const existing = await client.query(
            "SELECT 1 FROM customer WHERE lower(email) = $1 UNION SELECT 1 FROM useraccount WHERE lower(username) = $1 LIMIT 1",
            [email]
          );
          if (existing.rowCount) {
            await client.query("DELETE FROM PendingCustomerRegistration WHERE email = $1", [pending.email]);
            failure = new HttpError(400, "Email is already registered.");
          } else {
            const user = await userRepo.create(client, {
              username: email,
              passwordHash: pending.passwordhash,
              fullName: pending.fullname,
              email,
              phone: pending.phone,
              address: null
            });
            await client.query("DELETE FROM PendingCustomerRegistration WHERE email = $1", [pending.email]);
            result = { message: "Email đã được xác minh. Bạn có thể đăng nhập.", user: publicUser(user) };
          }
        }
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      if (error.code === "23505") throw new HttpError(400, "Email is already registered.");
      throw error;
    } finally {
      client.release();
    }

    if (failure) throw failure;
    await sendNotification({
      to: email,
      subject: "Chào mừng đến với STAYORA",
      text: `Xin chào ${result.user.fullName}, email của bạn đã được xác minh và tài khoản STAYORA đã sẵn sàng.`
    });
    return { message: result.message };
  },
  requestPasswordResetOtp: async (data = {}) => {
    const email = normalizeEmail(data.email);
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, "Email không đúng định dạng.");
    requireOtpConfiguration();

    const user = await userRepo.findByEmail(email);
    if (!user || user.isactive === false) {
      return { message: "Nếu email thuộc tài khoản đang hoạt động, mã OTP sẽ được gửi đến email đó.", otpSent: true };
    }

    const accountEmail = normalizeEmail(user.email || user.username);
    if (!/^\S+@\S+\.\S+$/.test(accountEmail)) {
      return { message: "Nếu email thuộc tài khoản đang hoạt động, mã OTP sẽ được gửi đến email đó.", otpSent: true };
    }

    const otp = createOtp();
    const otpHash = hashOtp(accountEmail, otp);
    const client = await pool.connect();
    let inserted = false;
    let requestAgainAfterCooldown = false;
    try {
      await client.query("BEGIN");
      const current = (await client.query(
        "SELECT lastsentat FROM PasswordResetOtp WHERE accountid = $1 FOR UPDATE",
        [user.accountid]
      )).rows[0];
      if (current && Date.now() - new Date(current.lastsentat).getTime() < OTP_RESEND_COOLDOWN_SECONDS * 1000) {
        requestAgainAfterCooldown = true;
      } else {
        await client.query(
          `INSERT INTO PasswordResetOtp (accountid, email, otphash, expiresat, attempts, lastsentat, verifiedat, resettokenid)
           VALUES ($1, $2, $3, NOW() + ($4 * INTERVAL '1 minute'), 0, NOW(), NULL, NULL)
           ON CONFLICT (accountid) DO UPDATE
           SET email = EXCLUDED.email, otphash = EXCLUDED.otphash, expiresat = EXCLUDED.expiresat,
               attempts = 0, lastsentat = NOW(), verifiedat = NULL, resettokenid = NULL`,
          [user.accountid, accountEmail, otpHash, OTP_LIFETIME_MINUTES]
        );
        inserted = true;
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    if (inserted) {
      try {
        await sendVerificationCode({ to: accountEmail, code: otp, purpose: "password_reset" });
      } catch (error) {
        await pool.query("DELETE FROM PasswordResetOtp WHERE accountid = $1 AND otphash = $2", [user.accountid, otpHash]);
        process.stderr.write(`Password reset OTP email delivery failed: ${error.message}\n`);
        throw new HttpError(503, "Không thể gửi OTP. Vui lòng kiểm tra cấu hình email hoặc thử lại sau.");
      }
    }
    return {
      message: requestAgainAfterCooldown
        ? "Nếu email thuộc tài khoản đang hoạt động, mã OTP sẽ được gửi đến email đó. Vui lòng kiểm tra hộp thư hoặc đợi trước khi yêu cầu mã mới."
        : "Nếu email thuộc tài khoản đang hoạt động, mã OTP sẽ được gửi đến email đó.",
      otpSent: true
    };
  },
  verifyPasswordResetOtp: async (data = {}) => {
    const email = normalizeEmail(data.email);
    const otp = String(data.otp || "").trim();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, "Email không đúng định dạng.");
    if (!/^\d{6}$/.test(otp)) throw new HttpError(400, "Mã OTP phải gồm 6 chữ số.");

    const user = await userRepo.findByEmail(email);
    if (!user || user.isactive === false) throw new HttpError(400, "Mã OTP không hợp lệ hoặc đã hết hạn.");
    const tokenId = randomUUID();
    const client = await pool.connect();
    let verified = false;
    try {
      await client.query("BEGIN");
      const reset = (await client.query(
        "SELECT * FROM PasswordResetOtp WHERE accountid = $1 FOR UPDATE",
        [user.accountid]
      )).rows[0];
      if (reset && reset.email === email && new Date(reset.expiresat) > new Date()
          && !reset.verifiedat && Number(reset.attempts) < OTP_MAX_ATTEMPTS) {
        const given = Buffer.from(hashOtp(email, otp), "hex");
        const expected = Buffer.from(reset.otphash, "hex");
        if (given.length === expected.length && timingSafeEqual(given, expected)) {
          await client.query(
            "UPDATE PasswordResetOtp SET verifiedat = NOW(), resettokenid = $2 WHERE accountid = $1",
            [user.accountid, tokenId]
          );
          verified = true;
        } else {
          await client.query("UPDATE PasswordResetOtp SET attempts = attempts + 1 WHERE accountid = $1", [user.accountid]);
        }
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    if (!verified) throw new HttpError(400, "Mã OTP không hợp lệ hoặc đã hết hạn.");
    const resetToken = jwt.sign(
      { sub: user.accountid, email, purpose: "password_reset", jti: tokenId },
      process.env.JWT_SECRET,
      { expiresIn: `${PASSWORD_RESET_TOKEN_MINUTES}m` }
    );
    return { message: "OTP hợp lệ.", resetToken };
  },
  resetPasswordWithOtp: async (data = {}) => {
    const resetToken = String(data.resetToken || "");
    const password = String(data.password || "");
    const confirmPassword = String(data.confirmPassword || "");
    if (!resetToken) throw new HttpError(400, "Phiên đặt lại mật khẩu không hợp lệ. Vui lòng xác minh OTP lại.");
    if (!validatePassword(password)) {
      throw new HttpError(400, "Mật khẩu phải có tối thiểu 8 ký tự, bao gồm ít nhất 1 chữ hoa, 1 số và 1 ký tự đặc biệt.");
    }
    if (password !== confirmPassword) throw new HttpError(400, "Mật khẩu xác nhận không khớp.");

    let claims;
    try {
      claims = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch {
      throw new HttpError(400, "Phiên đặt lại mật khẩu đã hết hạn. Vui lòng xác minh OTP lại.");
    }
    if (claims.purpose !== "password_reset" || !claims.sub || !claims.jti || !claims.email) {
      throw new HttpError(400, "Phiên đặt lại mật khẩu không hợp lệ.");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const client = await pool.connect();
    let updated = false;
    try {
      await client.query("BEGIN");
      const reset = (await client.query(
        "SELECT accountid FROM PasswordResetOtp WHERE accountid = $1 AND email = $2 AND resettokenid = $3 AND verifiedat IS NOT NULL AND expiresat > NOW() FOR UPDATE",
        [claims.sub, claims.email, claims.jti]
      )).rows[0];
      if (reset) {
        await client.query(
          "UPDATE useraccount SET passwordhash = $2, tokenversion = tokenversion + 1, failedloginattempts = 0, lockeduntil = NULL WHERE accountid = $1",
          [reset.accountid, passwordHash]
        );
        await client.query("DELETE FROM PasswordResetOtp WHERE accountid = $1", [reset.accountid]);
        updated = true;
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    if (!updated) throw new HttpError(400, "Phiên đặt lại mật khẩu đã hết hạn hoặc đã được sử dụng.");
    return { message: "Mật khẩu đã được cập nhật. Vui lòng đăng nhập." };
  },
  login: async (data = {}) => {
    const identifier = normalizeEmail(data.email || data.username || data.identifier);
    const password = String(data.password ?? "");
    if (!identifier || !password) throw new HttpError(400, "Email/username and password are required.");

    const user = await userRepo.findByEmail(identifier);
    // EX-01: do not reveal whether the account exists.
    if (!user) throw new HttpError(401, "Invalid email or password.");

    // EX-02: deactivated accounts cannot sign in.
    if (user.isactive === false) {
      throw new HttpError(403, "Your account is currently disabled. Please contact the administrator.");
    }

    // BR-06: temporary lockout after consecutive failed attempts.
    if (user.lockeduntil && new Date(user.lockeduntil) > new Date()) {
      throw new HttpError(423, "Account temporarily locked. Try again later.");
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordhash);
    if (!passwordMatches) {
      const attempts = Number(user.failedloginattempts || 0) + 1;
      const shouldLock = attempts >= LOCKOUT_THRESHOLD;
      await userRepo.recordLoginFailure(
        user.accountid,
        shouldLock ? 0 : attempts,
        shouldLock ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null
      );
      if (shouldLock) {
        throw new HttpError(423, `Account temporarily locked after ${LOCKOUT_THRESHOLD} failed login attempts. Try again in ${LOCKOUT_MINUTES} minutes.`);
      }
      throw new HttpError(401, "Invalid email or password.");
    }

    await userRepo.resetLoginFailures(user.accountid);
    return {
      message: "Login successful.",
      user: publicUser(user),
      token: createToken(user)
    };
  },
  profile: async (userId) => {
    const user = await userRepo.findById(userId);
    if (!user) throw new HttpError(404, "Account not found.");
    return publicUser(user);
  },
  logout: async (userId) => {
    await userRepo.revokeSessions(userId);
    return { message: "Signed out successfully." };
  },
  updateProfile: async (userId, data) => {
    const fullName = data.fullName === undefined ? undefined : String(data.fullName).trim();
    if (fullName !== undefined && !fullName) throw new HttpError(400, "Full name is required.");
    if (!validatePhone(data.phone)) throw new HttpError(400, "Enter a valid phone number.");
    const profile = await userRepo.updateProfile(userId, { ...data, fullName });
    if (!profile) throw new HttpError(404, "Customer profile not found.");
    return profile;
  },
  changePassword: async (userId, { currentPassword, newPassword, confirmPassword }) => {
    const account = (await pool.query("SELECT passwordhash FROM useraccount WHERE accountid = $1", [userId])).rows[0];
    if (!account || !(await bcrypt.compare(currentPassword || "", account.passwordhash))) throw new HttpError(400, "Current password is incorrect.");
    if (!validatePassword(newPassword)) throw new HttpError(400, "Password must be at least 8 characters and include an uppercase letter, a number, and a special character.");
    if (newPassword !== confirmPassword) throw new HttpError(400, "Password confirmation does not match.");
    await userRepo.updatePassword(userId, await bcrypt.hash(newPassword, 12));
    return { message: "Password updated successfully." };
  }
};
