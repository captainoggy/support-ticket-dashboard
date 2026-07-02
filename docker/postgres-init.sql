-- Runs once on first database initialization.
-- Separate database for the automated test suite so tests never touch dev data.
CREATE DATABASE ticketdash_test;
