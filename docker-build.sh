package_version=$(jq -r .version package.json)

docker build --platform linux/amd64 \
  -t dialectlab/saber-monitoring-service:"$package_version" \
  -t dialectlab/saber-monitoring-service:latest .