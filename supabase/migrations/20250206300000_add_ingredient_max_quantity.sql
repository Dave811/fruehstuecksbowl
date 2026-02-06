-- Maximale Anzahl pro Zutat bei Mehrfachauswahl (null = unbegrenzt)
ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS max_quantity integer;

COMMENT ON COLUMN ingredients.max_quantity IS 'Max. Anzahl bei Mehrfachauswahl (null = unbegrenzt)';
