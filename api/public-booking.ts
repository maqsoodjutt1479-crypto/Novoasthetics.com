type BookingPayload = {
  name?: string;
  phone?: string;
  email?: string;
  service?: string;
  doctor?: string;
  preferredDateTime?: string;
  notes?: string;
};

const buildMessage = (payload: BookingPayload) => {
  const name = payload.name?.trim() || 'there';
  const service = payload.service?.trim() || 'your service';
  const doctor = payload.doctor?.trim() || 'the doctor';
  const dateTime = payload.preferredDateTime?.trim() || 'your preferred time';
  return `Thanks ${name}! We received your booking request for ${service} with ${doctor} on ${dateTime}. We will confirm shortly.`;
};

const buildAdminMessage = (payload: BookingPayload, id: string) => {
  const name = payload.name?.trim() || 'Unknown';
  const phone = payload.phone?.trim() || 'N/A';
  const service = payload.service?.trim() || 'N/A';
  const doctor = payload.doctor?.trim() || 'N/A';
  const dateTime = payload.preferredDateTime?.trim() || 'N/A';
  return `New booking ${id}: ${name}, ${phone}, ${service} with ${doctor} on ${dateTime}.`;
};

const sendSms = async (to: string, body: string) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
  const authToken = process.env.TWILIO_AUTH_TOKEN || '';
  const from = process.env.TWILIO_FROM || '';

  if (!accountSid || !authToken || !from) {
    throw new Error('Missing Twilio environment variables');
  }

  const params = new URLSearchParams({ From: from, To: to, Body: body });
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Twilio error: ${resp.status} ${text}`);
  }
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const payload: BookingPayload =
    typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

  const id = `PB-${Date.now()}`;

  try {
    if (payload.phone?.trim()) {
      await sendSms(payload.phone.trim(), buildMessage(payload));
    }

    const adminTo = process.env.TWILIO_ADMIN_TO || '';
    if (adminTo.trim()) {
      await sendSms(adminTo.trim(), buildAdminMessage(payload, id));
    }

    res.status(200).json({ ok: true, id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Failed to send SMS' });
  }
}
