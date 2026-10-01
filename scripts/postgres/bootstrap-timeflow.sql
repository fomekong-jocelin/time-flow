\set ON_ERROR_STOP on

\echo '==> Bootstrap PostgreSQL TimeFlow'

-- This script must be executed as a PostgreSQL administrator (for example postgres)
-- from a maintenance database such as postgres.
-- Required psql variable: timeflow_password

SELECT format(
    'CREATE ROLE timeflow LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION',
    :'timeflow_password'
)
WHERE NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'timeflow'
)
\gexec

-- Make reruns deterministic: update the password and keep the role least-privileged.
SELECT format(
    'ALTER ROLE timeflow WITH LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION',
    :'timeflow_password'
)
\gexec

SELECT 'CREATE DATABASE timeflow OWNER timeflow ENCODING ''UTF8'' TEMPLATE template0'
WHERE NOT EXISTS (
    SELECT 1 FROM pg_database WHERE datname = 'timeflow'
)
\gexec

ALTER DATABASE timeflow OWNER TO timeflow;
REVOKE ALL ON DATABASE timeflow FROM PUBLIC;
GRANT CONNECT ON DATABASE timeflow TO timeflow;

\connect timeflow

-- Prevent arbitrary users from creating objects in the public schema.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
ALTER SCHEMA public OWNER TO timeflow;
GRANT USAGE, CREATE ON SCHEMA public TO timeflow;

-- Useful when the script is rerun after Flyway has already created objects.
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO timeflow;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO timeflow;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO timeflow;

\echo '==> TimeFlow database and role are ready.'
