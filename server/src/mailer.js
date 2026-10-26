import nodemailer from 'nodemailer';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Returns true if the email was sent. A failure never blocks the booking itself.
export async function sendBookingEmail(to, b) {
  const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.log(`Email skipped (GMAIL_USER / GMAIL_APP_PASSWORD not set). Reference ${b.ref} for ${to}`);
    return false;
  }
  try {
    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD } });
    const when = new Date(b.depart).toUTCString();
    await transporter.sendMail({
      from: `SkySS <${GMAIL_USER}>`,
      to,
      subject: `Your SkySS booking ${b.ref}`,
      text: `Hello ${b.passenger},\n\nYour booking is confirmed.\nReference: ${b.ref}\nFlight: ${b.number} ${b.origin} to ${b.dest}\nDeparture: ${when}\nSeat: ${b.seat}\n\nUse your reference or email on the Manage booking page to view or cancel it.\n\nSkySS`,
      html: `<div style="font-family:Segoe UI,Arial,sans-serif;color:#0b2a5b"><h2>Booking confirmed</h2>
        <p>Hello ${esc(b.passenger)}, your seat is booked.</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:2px;background:#dcebfb;display:inline-block;padding:8px 16px;border-radius:8px">${esc(b.ref)}</p>
        <p><strong>${esc(b.number)}</strong> ${esc(b.origin)} to ${esc(b.dest)}<br>Departure: ${esc(when)}<br>Seat: ${esc(b.seat)}</p>
        <p>Use your reference or email on the Manage booking page to view or cancel it.</p><p>SkySS</p></div>`,
    });
    return true;
  } catch (e) {
    console.error('Email failed:', e.message);
    return false;
  }
}
