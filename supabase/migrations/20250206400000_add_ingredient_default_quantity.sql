-- Vorauswahl bei Mehrfachauswahl: Standardmenge pro Zutat (0 = nicht vorausgewählt)
ALTER TABLE ingredients
ADD COLUMN IF NOT EXISTS default_quantity integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN ingredients.default_quantity IS 'Bei Mehrfachauswahl: wie oft diese Zutat standardmäßig vorausgewählt ist (0 = nicht vorausgewählt).';
