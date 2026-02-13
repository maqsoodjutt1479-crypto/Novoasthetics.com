import React, { useMemo, useState } from 'react';
import { StatusBadge } from '../components/StatusBadge';

type FormState = {
  name: string;
  phone: string;
  email: string;
  service: string;
  doctor: string;
  datetime: string;
  notes: string;
};

type Slot = {
  time: string;
  status: 'free' | 'held' | 'booked';
};

const services = [
  'Hair Transplant Consultation',
  'PRP Session',
  'Laser Face',
  'Skin Treatment',
  'Membership Follow-up',
];

const doctors = ['Dr. Khan', 'Dr. Fatima', 'Dr. Ali'];

const formatDate = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const dateOptions = Array.from({ length: 5 }).map((_, idx) => {
  const d = new Date();
  d.setDate(d.getDate() + idx);
  return {
    value: formatDate(d),
    label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
  };
});

export const PublicBookingPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(dateOptions[0]?.value || formatDate(new Date()));
  const [messages, setMessages] = useState<{ from: 'user' | 'bot'; text: string }[]>([
    {
      from: 'bot',
      text: "Hi, I'm your booking assistant. I can check free slots, share charges guidance, and help you book.",
    },
  ]);
  const [form, setForm] = useState<FormState>({
    name: '',
    phone: '',
    email: '',
    service: services[0],
    doctor: doctors[0],
    datetime: '',
    notes: '',
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [serverMessage, setServerMessage] = useState<string>('');
  const [chatDraft, setChatDraft] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [typing, setTyping] = useState(false);

  const availability = useMemo<Record<string, Record<string, Slot[]>>>(() => {
    const build = (freeTimes: string[], bookedTimes: string[] = [], heldTimes: string[] = []): Slot[] =>
      freeTimes.map((t) => ({
        time: t,
        status: bookedTimes.includes(t) ? 'booked' : heldTimes.includes(t) ? 'held' : 'free',
      }));

    const d0 = dateOptions[0]?.value;
    const d1 = dateOptions[1]?.value;
    const d2 = dateOptions[2]?.value;
    const d3 = dateOptions[3]?.value;
    const d4 = dateOptions[4]?.value;

    return {
      'Dr. Khan': {
        [d0]: build(['09:30', '11:00', '15:30'], ['11:00']),
        [d1]: build(['10:00', '12:30', '16:00'], [], ['12:30']),
        [d2]: build(['09:00', '14:00', '17:30'], ['14:00']),
        [d3]: build(['10:30', '13:30']),
        [d4]: build(['11:30', '15:00'], ['11:30']),
      },
      'Dr. Fatima': {
        [d0]: build(['10:15', '12:45', '16:15']),
        [d1]: build(['09:45', '13:15', '17:00'], ['13:15']),
        [d2]: build(['10:00', '12:00', '15:45']),
        [d3]: build(['09:30', '11:30', '14:30'], [], ['14:30']),
        [d4]: build(['10:30', '13:30', '16:30']),
      },
      'Dr. Ali': {
        [d0]: build(['11:15', '14:00']),
        [d1]: build(['09:30', '12:00', '15:30']),
        [d2]: build(['10:45', '13:15'], ['10:45']),
        [d3]: build(['09:15', '11:15', '16:15']),
        [d4]: build(['10:00', '12:30', '15:00'], [], ['12:30']),
      },
    };
  }, []);

  const slotsForSelection = useMemo<Slot[]>(() => {
    const byDoctor = availability[form.doctor] || {};
    return byDoctor[selectedDate] || [];
  }, [availability, form.doctor, selectedDate]);

  const isValid = useMemo(
    () => Boolean(form.name.trim() && form.phone.trim() && form.service && form.doctor && form.datetime),
    [form]
  );

  const handleChange = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || status === 'submitting') return;
    setStatus('submitting');
    setServerMessage('');
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      service: form.service,
      doctor: form.doctor,
      preferredDateTime: form.datetime,
      notes: form.notes.trim() || undefined,
    };

    try {
      const res = await fetch('/api/public-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Server rejected request');
      }

      const data = await res.json().catch(() => ({}));
      setStatus('success');
      setServerMessage(data?.id ? `Booking ID: ${data.id}` : 'We will call/text to confirm.');
      setForm({
        name: '',
        phone: '',
        email: '',
        service: services[0],
        doctor: doctors[0],
        datetime: '',
        notes: '',
      });
    } catch (err) {
      console.error(err);
      try {
        if (typeof window !== 'undefined') {
          const existing = window.localStorage.getItem('clinic-public-bookings');
          const list = existing ? JSON.parse(existing) : [];
          const localId = `PB-${Date.now()}`;
          const record = { ...payload, id: localId, createdAt: new Date().toISOString() };
          window.localStorage.setItem('clinic-public-bookings', JSON.stringify([record, ...list]));
          setStatus('success');
          setServerMessage(`Saved offline as ${localId}. We will confirm soon.`);
          setForm({
            name: '',
            phone: '',
            email: '',
            service: services[0],
            doctor: doctors[0],
            datetime: '',
            notes: '',
          });
          return;
        }
      } catch (storageErr) {
        console.error(storageErr);
      }
      setStatus('error');
      setServerMessage('Unable to submit right now. Please try again or call the clinic.');
    }
  };

  const handleSend = (text?: string) => {
    const message = (text ?? chatDraft).trim();
    if (!message) return;
    setChatDraft('');
    setMessages((prev) => [...prev, { from: 'user', text: message }]);

    const reply = getBotReply(message, slotsForSelection, selectedDate, form.doctor, Boolean(form.datetime));
    setTyping(true);
    setTimeout(() => {
      setMessages((prev) => [...prev, { from: 'bot', text: reply }]);
      setTyping(false);
    }, 260);
  };

  return (
    <div className="public-landing">
      <div className="public-hero">
        <div>
          <div className="pill pill--ghost">Clinic OS - Public Booking</div>
          <h1>Book your appointment in one minute</h1>
          <p>Submit preferred date/time for PRP, Laser, Hair Transplant consults, and memberships.</p>
          <div className="hero-highlights">
            <div className="highlight">
              <div className="strong">Status: Pending</div>
              <div className="muted small">All public requests start as Pending and are confirmed by staff.</div>
            </div>
            <div className="highlight">
              <div className="strong">No payment collected</div>
              <div className="muted small">Price and discounts are handled internally after review.</div>
            </div>
            <div className="highlight">
              <div className="strong">Secure & separate</div>
              <div className="muted small">Public form is read-only; admin dashboard controls confirmations.</div>
            </div>
          </div>
        </div>
        <div className="public-card">
          <div className="muted small">Questions? Call +92-300-0000000</div>
          <div className="status-row">
            <StatusBadge status="Pending" />
            <span className="muted small">Applied automatically for public requests</span>
          </div>
        </div>
      </div>

      <div className="public-grid">
        <section className="public-card">
          <div className="section__header">
            <div>
              <div className="section__title">Public Booking Form</div>
              <div className="muted">Fill your details; our team will confirm via call/SMS/WhatsApp.</div>
            </div>
            <div className="pill">No login needed</div>
          </div>
          <form className="public-form" onSubmit={handleSubmit}>
            <label className="public-field">
              <span>Full Name *</span>
              <input className="input" required value={form.name} onChange={handleChange('name')} />
            </label>
            <label className="public-field">
              <span>Phone Number *</span>
              <input className="input" required value={form.phone} onChange={handleChange('phone')} />
            </label>
            <label className="public-field">
              <span>Email (optional)</span>
              <input className="input" type="email" value={form.email} onChange={handleChange('email')} />
            </label>
            <label className="public-field">
              <span>Service Type *</span>
              <select className="input" value={form.service} onChange={handleChange('service')}>
                {services.map((svc) => (
                  <option key={svc} value={svc}>
                    {svc}
                  </option>
                ))}
              </select>
            </label>
            <label className="public-field">
              <span>Preferred Doctor *</span>
              <select className="input" value={form.doctor} onChange={handleChange('doctor')}>
                {doctors.map((doc) => (
                  <option key={doc} value={doc}>
                    {doc}
                  </option>
                ))}
              </select>
            </label>
            <label className="public-field">
              <span>Preferred Date & Time *</span>
              <input
                className="input"
                type="datetime-local"
                value={form.datetime}
                onChange={handleChange('datetime')}
                required
              />
            </label>
            <label className="public-field">
              <span>Notes (optional)</span>
              <textarea
                className="input"
                rows={3}
                placeholder="Allergies, previous treatments, best time to call"
                value={form.notes}
                onChange={handleChange('notes')}
              />
            </label>
            <button className="pill" type="submit" disabled={!isValid || status === 'submitting'}>
              {status === 'submitting' ? 'Submitting...' : 'Submit Request'}
            </button>
            {status !== 'idle' && (
              <div className={status === 'success' ? 'success-text' : 'warning-text'}>{serverMessage}</div>
            )}
          </form>
        </section>

        <section className="public-card">
          <div className="section__header">
            <div>
              <div className="section__title">What happens next?</div>
              <div className="muted">Your request enters the admin dashboard as Pending.</div>
            </div>
          </div>
          <ul className="public-steps">
            <li>
              <span className="step-circle">1</span>
              <div>
                <div className="strong">Submit the form</div>
                <div className="muted small">You get a reference ID if the API returns one.</div>
              </div>
            </li>
            <li>
              <span className="step-circle">2</span>
              <div>
                <div className="strong">Team reviews & schedules</div>
                <div className="muted small">They confirm, reschedule, or cancel inside the secure dashboard.</div>
              </div>
            </li>
            <li>
              <span className="step-circle">3</span>
              <div>
                <div className="strong">Get notified</div>
                <div className="muted small">Expect a call/text/WhatsApp once confirmed.</div>
              </div>
            </li>
          </ul>
          <div className="muted small">Admin-only: pricing, discounts, and internal notes stay hidden from this form.</div>
        </section>
      </div>

      <div className="public-grid">
        <section className="public-card">
          <div className="section__header">
            <div>
              <div className="section__title">Custom Calendar</div>
              <div className="muted">Tap a free slot to auto-fill date & time.</div>
            </div>
          </div>
          <div className="date-choices">
            {dateOptions.map((d) => (
              <button
                key={d.value}
                type="button"
                className={`pill ${selectedDate === d.value ? '' : 'pill--ghost'}`}
                onClick={() => {
                  setSelectedDate(d.value);
                  setForm((prev) => ({ ...prev, datetime: '' }));
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
          <div className="slot-grid">
            {slotsForSelection.length === 0 && <div className="muted small">No slots defined for this day.</div>}
            {slotsForSelection.map((slot) => (
              <button
                key={slot.time}
                type="button"
                className={`slot ${slot.status !== 'free' ? 'slot--busy' : ''}`}
                disabled={slot.status !== 'free'}
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    datetime: `${selectedDate}T${slot.time}`,
                  }))
                }
              >
                <div className="strong">{slot.time}</div>
                <div className="muted small">
                  {slot.status === 'free' ? 'Free' : slot.status === 'booked' ? 'Booked' : 'Hold'}
                </div>
              </button>
            ))}
          </div>
          {form.datetime && (
            <div className="success-text" style={{ marginTop: 10 }}>
              Selected: {form.datetime.replace('T', ' @ ')}
            </div>
          )}
        </section>
      </div>

      <button className="chat-fab" type="button" onClick={() => setChatOpen((v) => !v)}>
        {chatOpen ? 'Close Agent' : 'Chat with Agent'}
      </button>
      {chatOpen && (
        <div className="chat-popover panel">
          <div className="section__header">
            <div>
              <div className="section__title">Assistant Chat</div>
              <div className="muted small">Ask for free slots, charges, or say "book".</div>
            </div>
            <button className="pill pill--ghost" type="button" onClick={() => setChatOpen(false)}>
              Close
            </button>
          </div>
          <div className="chat-box">
            <div className="chat-log">
              {messages.map((m, idx) => (
                <div key={idx} className={`chat-msg ${m.from === 'bot' ? 'chat-msg--bot' : 'chat-msg--user'}`}>
                  {m.text}
                </div>
              ))}
              {typing && <div className="chat-msg chat-msg--bot">Typing...</div>}
            </div>
            <div className="chat-input-row">
              <input
                className="input"
                placeholder="Ask: any free slots tomorrow?"
                value={chatDraft}
                onChange={(e) => setChatDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button className="pill" type="button" onClick={() => handleSend()}>
                Send
              </button>
            </div>
            <div className="chips" style={{ marginTop: 10 }}>
              <button className="pill pill--ghost" type="button" onClick={() => handleSend('What are charges?')}>
                Charges?
              </button>
              <button className="pill pill--ghost" type="button" onClick={() => handleSend('Any free slot today?')}>
                Free slots
              </button>
              <button className="pill pill--ghost" type="button" onClick={() => handleSend('Book this slot')}>
                Book it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const normalize = (text: string) => text.toLowerCase();

const getBotReply = (
  message: string,
  slots: Slot[],
  selectedDate: string,
  currentDoctor: string,
  formHasDate: boolean
) => {
  const text = normalize(message);

  if (text.includes('charge') || text.includes('price') || text.includes('cost')) {
    return "I won't take payment here. Charges depend on the service; the admin team confirms exact pricing after reviewing your request.";
  }

  if (text.includes('slot') || text.includes('free') || text.includes('available')) {
    const free = slots.filter((s) => s.status === 'free');
    if (free.length === 0) {
      return "I don't see a free slot on that day. Try another date or pick a different doctor and I'll check again.";
    }
    const next = free[0];
    return `I found a free slot with ${currentDoctor} on ${selectedDate} at ${next.time}. Tap it in the calendar to lock it in.`;
  }

  if (text.includes('book')) {
    if (!formHasDate) {
      return "Pick a free slot first, then hit Submit Request. I'll mark it Pending for the admin to confirm.";
    }
    return "Great choice. Fill your details and hit Submit Request - I'll send it as Pending for the admin team to confirm.";
  }

  if (text.includes('hi') || text.includes('hello')) {
    return 'Hello! I can check free slots, explain charges, and guide booking. Ask me about availability or say "book".';
  }

  return 'I can help with free slots, charges, and booking guidance. Ask about availability or say "book" after choosing a slot.';
};
