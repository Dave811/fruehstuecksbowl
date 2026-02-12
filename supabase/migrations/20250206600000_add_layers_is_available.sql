-- Layer can be disabled (not shown in order form) without deleting
ALTER TABLE public.layers
  ADD COLUMN IF NOT EXISTS is_available boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.layers.is_available IS 'If false, layer is hidden from the order form (drag to "Nicht verfügbar" in admin).';
