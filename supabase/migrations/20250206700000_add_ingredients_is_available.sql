-- Zutat kann deaktiviert werden (im Bestellformular ausgeblendet) ohne zu löschen
ALTER TABLE public.ingredients
  ADD COLUMN IF NOT EXISTS is_available boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.ingredients.is_available IS 'If false, ingredient is hidden from the order form (drag to "Nicht verfügbar" in admin).';
