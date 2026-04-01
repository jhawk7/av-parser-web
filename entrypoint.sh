#!/bin/sh

# Replace placeholders in built JS files
# The app is built into /usr/share/nginx/html/
# We look for main-*.js files where Angular bakes our config

FILES=$(find /usr/share/nginx/html -name "main-*.js")

echo "Starting configuration injection..."

for file in $FILES
do
  echo "Processing $file"
  
  # Replace placeholders with environment variables
  # Using | as a delimiter in sed because URLs contain slashes
  sed -i "s|PLACEHOLDER_MQTT_URL|${MQTT_URL}|g" $file
  sed -i "s|PLACEHOLDER_MQTT_CLIENT_ID|${MQTT_CLIENT_ID}|g" $file
  sed -i "s|PLACEHOLDER_MQTT_USER|${MQTT_USER}|g" $file
  sed -i "s|PLACEHOLDER_MQTT_PASSWORD|${MQTT_PASSWORD}|g" $file
  sed -i "s|PLACEHOLDER_MQTT_TOPIC|${MQTT_TOPIC}|g" $file
  sed -i "s|PLACEHOLDER_API_URL|${API_URL}|g" $file
done

echo "Configuration injection complete."

# Start Nginx
exec nginx -g 'daemon off;'
