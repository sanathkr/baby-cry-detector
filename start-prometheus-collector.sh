./prometheus/prometheus --config.file=./prometheus.yml \
  --storage.tsdb.path ./prometheus-data-prod \
  --storage.tsdb.retention.time 90d