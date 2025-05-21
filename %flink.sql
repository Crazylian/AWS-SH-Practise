%flink.ssql(type=update)
INSERT INTO total_distance
SELECT 
  'leaderboard:total_distance' AS zset_key, -- Hardcoded key for the Redis sorted set
  SUM(distance) AS total_distance, -- Total distance traveled by the player in the window
  player_id -- Unique player identifier
FROM TABLE(
  TUMBLE(TABLE player_data, DESCRIPTOR(event_time), INTERVAL '30' SECOND) -- Tumbling window of 30 seconds
)
GROUP BY 
  player_id, -- Group by player ID
  window_start, -- Start time of the tumbling window
  window_end; -- End time of the tumbling window