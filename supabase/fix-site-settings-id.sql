-- site_settings: falls eine id-Spalte existiert/ohne Default angelegt wurde,
-- Default + Backfill setzen — verhindert
-- "null value in column id of relation site_settings violates not-null constraint".
-- Idempotent; no-op wenn keine id-Spalte vorhanden (key bleibt PK).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'site_settings'
      AND column_name = 'id'
  ) THEN
    -- Default für neue Zeilen
    BEGIN
      ALTER TABLE public.site_settings
        ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
    EXCEPTION
      WHEN others THEN
        -- UUID-Spalte statt text
        BEGIN
          ALTER TABLE public.site_settings
            ALTER COLUMN id SET DEFAULT gen_random_uuid();
        EXCEPTION
          WHEN others THEN
            NULL;
        END;
    END;

    -- Backfill fehlender IDs
    BEGIN
      UPDATE public.site_settings
      SET id = COALESCE(NULLIF(id::text, ''), key, gen_random_uuid()::text)
      WHERE id IS NULL;
    EXCEPTION
      WHEN others THEN
        UPDATE public.site_settings
        SET id = gen_random_uuid()
        WHERE id IS NULL;
    END;
  END IF;
END $$;
