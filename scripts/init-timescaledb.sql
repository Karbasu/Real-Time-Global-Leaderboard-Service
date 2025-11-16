-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create hypertable for events (optimized for time-series queries)
-- Note: This will be applied after TypeORM creates the base tables
-- You can run this manually or integrate into migration

-- Example of converting events table to hypertable (run after app starts):
-- SELECT create_hypertable('events', 'timestamp', if_not_exists => TRUE);

-- Enable compression for old data (run after hypertable creation):
-- ALTER TABLE events SET (
--   timescaledb.compress,
--   timescaledb.compress_segmentby = 'entity_instance_id'
-- );

-- Add compression policy (compress data older than 7 days):
-- SELECT add_compression_policy('events', INTERVAL '7 days');

-- Continuous aggregates for analytics (example):
-- CREATE MATERIALIZED VIEW events_hourly
-- WITH (timescaledb.continuous) AS
-- SELECT
--   time_bucket('1 hour', timestamp) AS bucket,
--   entity_type_name,
--   event_type,
--   COUNT(*) as event_count
-- FROM events
-- GROUP BY bucket, entity_type_name, event_type;

-- Add refresh policy for continuous aggregate:
-- SELECT add_continuous_aggregate_policy('events_hourly',
--   start_offset => INTERVAL '1 month',
--   end_offset => INTERVAL '1 hour',
--   schedule_interval => INTERVAL '1 hour');

-- Indexes for common queries (TypeORM will create basic indexes)
-- Additional performance indexes can be added here:
-- CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events (timestamp DESC);
-- CREATE INDEX IF NOT EXISTS idx_events_entity_type_time ON events (entity_type_name, timestamp DESC);
