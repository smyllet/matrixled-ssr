-- Dedicated database for the test suite, so that running the tests never
-- touches the development data. Selected through DB_DATABASE in .env.test.
-- See docs/adr/0010-postgresql-partout.md
CREATE DATABASE matrixled_test;
