USE pet_blaster;
ALTER TABLE game_progress ADD COLUMN last_claim INT UNSIGNED NOT NULL DEFAULT 0;
UPDATE game_progress SET last_claim = UNIX_TIMESTAMP();
