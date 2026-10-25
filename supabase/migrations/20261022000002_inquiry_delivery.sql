ALTER TABLE public.inquiries DROP CONSTRAINT IF EXISTS inquiries_channel_check;
ALTER TABLE public.inquiries
  ADD CONSTRAINT inquiries_channel_check
  CHECK (channel IN ('whatsapp', 'callback', 'delivery'));
