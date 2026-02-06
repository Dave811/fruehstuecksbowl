-- Add room and allergies to orders for bowl ordering (school context)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS room text,
  ADD COLUMN IF NOT EXISTS allergies text;

COMMENT ON COLUMN orders.room IS 'Raum / Klasse des Bestellers';
COMMENT ON COLUMN orders.allergies IS 'Allergien oder Unverträglichkeiten (optional)';
