// Stub email untuk test: mencatat email tanpa mengirim
export const sentEmails: { to: string; subject: string; highlight?: { label: string; value: string } | null }[] = [];
export async function sendNotificationEmail(opts: { to: string; subject: string; highlight?: { label: string; value: string } | null }) {
  sentEmails.push({ to: opts.to, subject: opts.subject, highlight: opts.highlight });
  return { sent: true };
}
export async function sendOtpEmail() { return { success: true, isDev: true }; }
