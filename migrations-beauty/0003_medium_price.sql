-- Fill the previously unspecified price without overwriting an entered price.
UPDATE settings SET value=json_set(value,'$.prices."manicura-media"',2700)
WHERE key='schedule' AND (json_type(value,'$.prices."manicura-media"') IS NULL OR json_type(value,'$.prices."manicura-media"')='null');
