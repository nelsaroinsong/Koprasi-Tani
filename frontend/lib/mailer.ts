import nodemailer from 'nodemailer';

// Konfigurasi SMTP (Dapat menggunakan Gmail, Brevo, atau custom SMTP)
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_SECURE = process.env.SMTP_SECURE !== 'false'; // true untuk port 465, false untuk port 587
const SMTP_USER = process.env.SMTP_USER || process.env.EMAIL_USER;
const SMTP_PASS = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.EMAIL_APP_PASSWORD;

/**
 * Mengirimkan Email Kode Verifikasi (OTP) ke alamat email pembeli atau petani
 */
export async function sendOtpEmail(
  toEmail: string,
  otpCode: string,
  role: 'PETANI' | 'PEMBELI' = 'PEMBELI'
): Promise<{
  success: boolean;
  isDev?: boolean;
  message?: string;
}> {
  const roleTitle = role === 'PETANI' ? 'Petani Mitra' : 'Pembeli & Pelanggan';
  const roleDesc =
    role === 'PETANI'
      ? 'Alamat email ini didaftarkan sebagai akun <strong>Petani Mitra</strong> binaan pada sistem digital <strong>Koperasi Sinar Pagi Sejahtera</strong>.'
      : 'Alamat email ini didaftarkan sebagai akun pembeli komoditas agribisnis pada sistem digital <strong>Koperasi Sinar Pagi Sejahtera</strong>.';

  // Jika kredensial SMTP belum diatur di .env, aktifkan fallback Development Mode
  if (!SMTP_USER || !SMTP_PASS) {
    console.log('\n============================================================');
    console.log(` [KOPERASI EMAIL OTP - DEV MODE] Role: ${role}`);
    console.log(` Ke Email: ${toEmail}`);
    console.log(` Kode OTP : ${otpCode} (Berlaku 5 menit)`);
    console.log(' Catatan : Tambahkan SMTP_USER dan SMTP_PASS di .env untuk pengiriman asli.');
    console.log('============================================================\n');

    return {
      success: true,
      isDev: true,
      message: 'Kode OTP berhasil dibuat (Development Mode aktif).',
    };
  }

  try {
    const cleanUser = SMTP_USER.trim();
    const cleanPass = SMTP_PASS.trim();
    const isGmail = cleanUser.toLowerCase().includes('@gmail.com') || SMTP_HOST === 'smtp.gmail.com';

    const transporter = nodemailer.createTransport(
      isGmail
        ? {
            service: 'gmail',
            auth: {
              user: cleanUser,
              pass: cleanPass,
            },
          }
        : {
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: SMTP_SECURE,
            auth: {
              user: cleanUser,
              pass: cleanPass,
            },
            tls: {
              rejectUnauthorized: false,
            },
          }
    );

    const mailOptions = {
      from: `"Koperasi Sinar Pagi Sejahtera" <${cleanUser}>`,
      to: toEmail,
      subject: `Kode Verifikasi Pendaftaran ${roleTitle} Koperasi: ${otpCode}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
            .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .header { text-align: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 24px; }
            .logo-title { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0; }
            .logo-sub { font-size: 12px; color: #059669; font-weight: 600; margin-top: 4px; }
            .otp-box { background-color: #f0fdf4; border: 2px dashed #10b981; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
            .otp-code { font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #065f46; font-family: 'Courier New', monospace; margin: 0; }
            .footer { font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 28px; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="logo-title">Koperasi Sinar Pagi Sejahtera</h1>
              <div class="logo-sub">Verifikasi Pendaftaran Akun ${roleTitle}</div>
            </div>
            
            <p style="font-size: 14px; line-height: 1.6; margin: 0 0 16px;">Halo,</p>
            <p style="font-size: 14px; line-height: 1.6; margin: 0 0 20px; color: #475569;">
              ${roleDesc}
              Gunakan kode verifikasi (OTP) berikut untuk menyelesaikan pendaftaran akun Anda:
            </p>

            <div class="otp-box">
              <div style="font-size: 11px; font-weight: 700; color: #047857; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 1px;">KODE VERIFIKASI RESMI</div>
              <p class="otp-code">${otpCode}</p>
              <div style="font-size: 11px; color: #059669; margin-top: 8px; font-weight: 500;">Berlaku selama 5 menit</div>
            </div>

            <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
              Setelah terdaftar, Anda dapat langsung masuk (login) ke platform menggunakan <strong>Google Sign-In</strong> dengan email ini.
            </p>

            <div class="footer">
              Jika Anda tidak merasa mendaftar di Koperasi Sinar Pagi Sejahtera, abaikan email ini.<br>
              &copy; 2026 Koperasi Konsumen Sinar Pagi Sejahtera. Seluruh Hak Cipta Dilindungi.
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    return { success: true, isDev: false, message: 'Kode OTP berhasil dikirim ke email.' };
  } catch (error: any) {
    console.error('[Nodemailer Error] Gagal mengirim OTP email:', error);
    const msg = error?.message || '';
    if (msg.includes('535') || msg.includes('BadCredentials') || msg.includes('Username and Password not accepted')) {
      throw new Error('Autentikasi email pengirim koperasi gagal. Silakan periksa konfigurasi akun email di server.');
    }
    if (msg.includes('ETIMEDOUT') || msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) {
      throw new Error('Koneksi ke server email gagal. Periksa koneksi internet dan coba lagi.');
    }
    throw new Error('Gagal mengirim email verifikasi OTP. Silakan periksa kembali alamat email penerima.');
  }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | null = null;
function getTransporter() {
  if (!SMTP_USER || !SMTP_PASS) return null;
  if (cachedTransporter) return cachedTransporter;
  const cleanUser = SMTP_USER.trim();
  const cleanPass = SMTP_PASS.trim();
  const isGmail = cleanUser.toLowerCase().includes('@gmail.com') || SMTP_HOST === 'smtp.gmail.com';
  cachedTransporter = nodemailer.createTransport(
    isGmail
      ? { service: 'gmail', auth: { user: cleanUser, pass: cleanPass } }
      : { host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_SECURE, auth: { user: cleanUser, pass: cleanPass } }
  );
  return cachedTransporter;
}

/**
 * Email pemberitahuan status (pesanan, sewa, bagi hasil).
 * Tanpa SMTP di .env -> hanya dicatat di console (mode pengembangan), tidak melempar error.
 */
export async function sendNotificationEmail(opts: {
  to: string;
  name?: string | null;
  subject: string;
  title: string;
  message: string;
  /** Kotak sorotan, mis. kode ambil */
  highlight?: { label: string; value: string } | null;
  actionUrl?: string | null;
  actionLabel?: string;
}): Promise<{ sent: boolean }> {
  const transporter = getTransporter();
  if (!transporter) {
    console.log(`[KOPERASI EMAIL - DEV MODE] Ke ${opts.to}: ${opts.subject} — ${opts.message}`);
    return { sent: false };
  }

  const hl = opts.highlight
    ? `<div style="background:#f0fdf4;border:2px dashed #10b981;border-radius:12px;padding:16px;text-align:center;margin:20px 0;">
         <div style="font-size:11px;font-weight:700;color:#047857;text-transform:uppercase;letter-spacing:1px;">${escapeHtml(opts.highlight.label)}</div>
         <div style="font-size:30px;font-weight:900;letter-spacing:6px;color:#065f46;font-family:'Courier New',monospace;margin-top:6px;">${escapeHtml(opts.highlight.value)}</div>
       </div>`
    : '';
  const btn = opts.actionUrl
    ? `<p style="text-align:center;margin:24px 0 8px;"><a href="${escapeHtml(opts.actionUrl)}" style="display:inline-block;background:#233414;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 22px;border-radius:10px;">${escapeHtml(opts.actionLabel || 'Lihat Detail')}</a></p>`
    : '';

  try {
    await transporter.sendMail({
      from: `"Koperasi Sinar Pagi Sejahtera" <${SMTP_USER!.trim()}>`,
      to: opts.to,
      subject: opts.subject,
      text: `${opts.title}\n\n${opts.message}${opts.highlight ? `\n\n${opts.highlight.label}: ${opts.highlight.value}` : ''}${opts.actionUrl ? `\n\n${opts.actionUrl}` : ''}`,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
        <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f4f5f1;margin:0;padding:24px;color:#1a2610;">
          <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #dce1d6;padding:28px;">
            <div style="font-size:12px;font-weight:700;color:#344d15;text-transform:uppercase;letter-spacing:1px;">Koperasi Sinar Pagi Sejahtera</div>
            <h1 style="font-size:18px;margin:8px 0 14px;color:#1a2610;">${escapeHtml(opts.title)}</h1>
            <p style="font-size:14px;line-height:1.6;margin:0 0 6px;">Halo ${escapeHtml(opts.name || 'Anggota Koperasi')},</p>
            <p style="font-size:14px;line-height:1.6;color:#526046;margin:0;">${escapeHtml(opts.message)}</p>
            ${hl}${btn}
            <p style="font-size:11px;color:#8a957f;border-top:1px solid #eaede7;padding-top:16px;margin-top:24px;line-height:1.5;">
              Email ini dikirim otomatis karena ada perubahan pada transaksi Anda. Jangan bagikan kode ambil kepada siapa pun.
            </p>
          </div>
        </body></html>`,
    });
    return { sent: true };
  } catch (error) {
    console.error('[Nodemailer Error] Gagal mengirim email notifikasi:', error);
    return { sent: false };
  }
}
