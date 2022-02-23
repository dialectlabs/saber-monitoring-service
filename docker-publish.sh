package_version=$(jq -r .version package.json)

docker push dialectlab/saber-monitoring-service:"$package_version"
docker push dialectlab/saber-monitoring-service:latest