#ifndef CONFIG_H
#define CONFIG_H

// WiFi Configuration
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// MQTT Configuration
#define MQTT_SERVER "your-mqtt-broker.com"
#define MQTT_PORT 1883
#define MQTT_USER "botcareu_device"
#define MQTT_PASSWORD "your_mqtt_password"

// API Configuration
#define API_SERVER "your-api-server.com"
#define API_PORT 443
#define API_ENDPOINT "/api/v1/temperature/readings"

// Device Configuration
#define DEVICE_NAME "BotCareU_Monitor"
#define FIRMWARE_VERSION "1.0.0-alpha"
#define HARDWARE_VERSION "1.0"

// Sensor Configuration
#define TEMPERATURE_PRECISION 12
#define MEASUREMENT_SAMPLES 3
#define CALIBRATION_OFFSET_IR 0.0
#define CALIBRATION_OFFSET_CONTACT 0.0

// Display Configuration
#define DISPLAY_TIMEOUT 30000  // 30 seconds
#define DISPLAY_BRIGHTNESS 128
#define SCREEN_SAVER_ENABLED true

// Power Management
#define BATTERY_LOW_THRESHOLD 3.3
#define BATTERY_CRITICAL_THRESHOLD 3.0
#define SLEEP_MODE_ENABLED true
#define SLEEP_TIMEOUT 300000  // 5 minutes

// Security Configuration
#define ENCRYPTION_ENABLED true
#define DEVICE_AUTH_TOKEN "your_device_token"

// Debugging
#define DEBUG_MODE true
#define SERIAL_DEBUG true
#define LOG_LEVEL 2  // 0=ERROR, 1=WARN, 2=INFO, 3=DEBUG

#endif // CONFIG_H
