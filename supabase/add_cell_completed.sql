-- Run in Supabase Dashboard → SQL Editor
ALTER TABLE mandalart_cells
ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false;
