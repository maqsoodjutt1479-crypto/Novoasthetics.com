import { createClient } from '@supabase/supabase-js';

type BookingPayload = {
  name?: string;
  phone?: string;
  email?: string;
  service?: string;
  doctor?: string;
  preferredDateTime?: string;
  notes?: string;
};

const createSupabaseServerClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    '';

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey);
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

  const payload: BookingPayload = (() => {
    try {
      return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    } catch {
      return {};
    }
  })();

  const name = payload.name?.trim() || '';
  const phone = payload.phone?.trim() || '';
  const service = payload.service?.trim() || '';
  const doctor = payload.doctor?.trim() || '';
  const preferredDateTime = payload.preferredDateTime?.trim() || '';
  const notes = payload.notes?.trim() || '-';

  if (!name || !phone || !service || !doctor || !preferredDateTime) {
    res.status(400).json({ ok: false, error: 'Missing required fields' });
    return;
  }

  const id = `PB-${Date.now()}`;

  try {
    const supabase = createSupabaseServerClient();
    const { error: insertError } = await supabase.from('appointments').insert({
      id,
      patient_id: id,
      patient: name,
      phone,
      doctor,
      datetime: preferredDateTime,
      service,
      appt_type: 'Public Booking',
      centre: 'WEB',
      status: 'Pending',
      amount: 0,
      discount: '0%',
      notes,
      payment_status: 'Unpaid',
      payment_method: 'OTHER',
    });

    if (insertError) {
      throw new Error(`Supabase insert failed: ${insertError.message}`);
    }

    const smsErrors: string[] = [];

    try {
      await sendSms(phone, buildMessage(payload));
    } catch (err) {
      console.error(err);
      smsErrors.push('patient');
    }

    const adminTo = process.env.TWILIO_ADMIN_TO || '';
    if (adminTo.trim()) {
      try {
        await sendSms(adminTo.trim(), buildAdminMessage(payload, id));
      } catch (err) {
        console.error(err);
        smsErrors.push('admin');
      }
    }

    res.status(200).json({
      ok: true,
      id,
      smsWarning: smsErrors.length ? `SMS failed for: ${smsErrors.join(', ')}` : undefined,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Failed to save booking' });
  }
}
