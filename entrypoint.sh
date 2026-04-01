#!/bin/sh

# Find all JS files in the serving directory
# Modern Angular builds might place them in subdirectories or use different naming
FILES=$(find /usr/share/nginx/html -name "*.js")

echo "Searching for files in /usr/share/nginx/html..."

if [ -z "$FILES" ]; then
  echo "No JS files found! Please check the build output directory."
  exit 1
fi

echo "Starting configuration injection..."

for file in $FILES
do
  echo "Checking $file for placeholders..."
  
  # Check if file contains any of our placeholders before attempting sed
  if grep -q "PLACEHOLDER_" "$file"; then
    echo "Processing $file..."
    
    # Replace placeholders with environment variables
    # We use | as a delimiter in sed because URLs contain slashes
    sed -i "s|PLACEHOLDER_MQTT_URL|${MQTT_URL}|g" "$file"
    sed -i "s|PLACEHOLDER_MQTT_CLIENT_ID|${MQTT_CLIENT_ID}|g" "$file"
    sed -i "s|PLACEHOLDER_MQTT_USER|${MQTT_USER}|g" "$file"
    sed -i "s|PLACEHOLDER_MQTT_PASSWORD|${MQTT_PASSWORD}|g" "$file"
    sed -i "s|PLACEHOLDER_MQTT_TOPIC|${MQTT_TOPIC}|g" "$file"
    sed -i "s|PLACEHOLDER_API_URL|${API_URL}|g" "$file"
    
    echo "Injected config into $file"
  fi
done

echo "Configuration injection complete."

# Start Nginx
exec nginx -g 'daemon off;'
