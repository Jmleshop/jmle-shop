-- site_settings: garantierte id-Spalte mit Default.
-- Behebt: null value in column "id" of relation "site_settings" violates not-null constraint
-- Idempotent für Schemas mit/ohne vorhandener id.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  id_type text;
BEGIN
  SELECT data_type INTO id_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'site_settings'
    AND column_name = 'id';

  IF id_type IS NULL THEN
    -- Neu: UUID-Spalte mit Default (key bleibt Primary Key)
    ALTER TABLE public.site_settings
      ADD COLUMN id UUID NOT NULL DEFAULT gen_random_uuid();
    CREATE UNIQUE INDEX IF NOT EXISTS site_settings_id_uidx
      ON public.site_settings (id);
  ELSIF id_type = 'uuid' THEN
    ALTER TABLE public.site_settings
      ALTER COLUMN id SET DEFAULT gen_random_uuid();
    UPDATE public.site_settings
      SET id = gen_random_uuid()
      WHERE id IS NULL;
    ALTER TABLE public.site_settings
      ALTER COLUMN id SET NOT NULL;
  ELSE
    -- text/varchar id
    BEGIN
      ALTER TABLE public.site_settings
        ALTER COLUMN id SET DEFAULT encode(gen_random_bytes(16), 'hex');
    EXCEPTION WHEN others THEN
      NULL;
    END;
    UPDATE public.site_settings
      SET id = COALESCE(NULLIF(id::text, ''), key, encode(gen_random_bytes(16), 'hex'))
      WHERE id IS NULL OR id::text = '';
    BEGIN
      ALTER TABLE public.site_settings
        ALTER COLUMN id SET NOT NULL;
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END IF;
END $$;

-- Stabile IDs für bekannte Keys (hilfreich für Upserts)
UPDATE public.site_settings
SET id = CASE key
  WHEN 'site' THEN '00000000-0000-4000-8000-000000000001'::uuid
  WHEN 'site_logo' THEN '00000000-0000-4000-8000-000000000002'::uuid
  ELSE id
END
WHERE key IN ('site', 'site_logo')
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'site_settings'
      AND column_name = 'id'
      AND data_type = 'uuid'
  );
