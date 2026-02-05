insert into public.clinical_services (id, category, name, code, duration, color, price, status)
values
  ('svc-4', 'Body Contouring', 'CoolSculpt - Double Chin', 'CS-DC', 45, '#0ea5e9', 19995, 'Active'),
  ('svc-5', 'Body Contouring', 'CoolSculpt - Large', 'CS-L', 45, '#0ea5e9', 24995, 'Active'),
  ('svc-6', 'Body Contouring', 'CoolSculpt - Medium', 'CS-M', 45, '#0ea5e9', 24995, 'Active'),
  ('svc-7', 'Body Contouring', 'CoolSculpt Duo', 'CS-DUO', 45, '#0ea5e9', 29995, 'Active'),
  ('svc-8', 'Body Contouring', 'CoolSculpt Duo - Bingowings', 'CS-DUO-BW', 45, '#0ea5e9', 29995, 'Active'),
  ('svc-9', 'Body Contouring', 'EMSCulpt Session', 'EMS-SESSION', 45, '#0ea5e9', 11995, 'Active'),
  ('svc-10', 'Body Contouring', 'Radiofrequency - Double Chin', 'RF-DC', 45, '#0ea5e9', 6995, 'Active'),
  ('svc-11', 'Body Contouring', 'ULTIMATE - RF (Body area)', 'RF-BODY', 45, '#0ea5e9', 7000, 'Active'),
  ('svc-12', 'Body Contouring', 'Ultrashape - Abdomen', 'US-ABD', 45, '#0ea5e9', 15995, 'Active')
on conflict (id) do update
set
  category = excluded.category,
  name = excluded.name,
  code = excluded.code,
  duration = excluded.duration,
  color = excluded.color,
  price = excluded.price,
  status = excluded.status;
