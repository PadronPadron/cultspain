ALTER TABLE entries ADD COLUMN category TEXT NOT NULL DEFAULT '' CHECK(category IN ('','materials','rent','taxes','utilities','other'));
UPDATE entries SET category='other' WHERE kind='expense';
