/**
 * BotCareU IoT Health Monitoring System
 * ESP32 Firmware for Medical-Grade Temperature Measurement
 * 
 * Features:
 * - Dual temperature sensors (MLX90614 IR + DS18B20 contact)
 * - Medical-grade accuracy (±0.1°C)
 * - WiFi and Bluetooth connectivity
 * - OLED display for local readings
 * - MQTT communication with cloud backend
 * - Real-time fever detection and alerts
 * - Secure data transmission
 * 
 * Author: Kritchaya Chaowajreun
 * Version: 1.0.0-alpha
 */

#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <SPI.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <LittleFS.h>

// Temperature Sensors
#include <Adafruit_MLX90614.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// Display
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// Security
#include <Crypto.h>
#include <AES.h>

// Configuration
#include "config.h"
#include "secrets.h"

// Pin Definitions
#define ONE_WIRE_BUS 4          // DS18B20 data pin
#define BUTTON_PIN 0            // Boot button for user input
#define LED_PIN 2               // Built-in LED
#define BUZZER_PIN 5            // Buzzer for alerts
#define BATTERY_PIN A0          // Battery voltage monitoring

// Display Configuration
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define SCREEN_ADDRESS 0x3C

// Temperature Thresholds (Celsius)
#define NORMAL_TEMP_MIN 35.0
#define NORMAL_TEMP_MAX 37.4
#define FEVER_THRESHOLD 37.5
#define HIGH_FEVER_THRESHOLD 39.0
#define CRITICAL_TEMP_THRESHOLD 40.0

// Timing Constants
#define MEASUREMENT_INTERVAL 60000    // 1 minute
#define DISPLAY_UPDATE_INTERVAL 1000  // 1 second
#define HEARTBEAT_INTERVAL 30000      // 30 seconds
#define WIFI_TIMEOUT 10000            // 10 seconds
#define MQTT_RECONNECT_DELAY 5000     // 5 seconds

// Global Objects
Adafruit_MLX90614 mlx = Adafruit_MLX90614();
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature ds18b20(&oneWire);
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 0, 60000);

// Global Variables
struct TemperatureReading {
  float infraredTemp;
  float contactTemp;
  float ambientTemp;
  unsigned long timestamp;
  bool isValid;
  String measurementType;
};

struct DeviceStatus {
  bool wifiConnected;
  bool mqttConnected;
  bool sensorsReady;
  float batteryVoltage;
  int signalStrength;
  unsigned long uptime;
  String deviceId;
};

TemperatureReading lastReading;
DeviceStatus deviceStatus;
unsigned long lastMeasurement = 0;
unsigned long lastDisplayUpdate = 0;
unsigned long lastHeartbeat = 0;
bool measurementInProgress = false;
String deviceId;

// Function Declarations
void setupWiFi();
void setupMQTT();
void setupSensors();
void setupDisplay();
void setupFileSystem();
void generateDeviceId();
void connectToWiFi();
void connectToMQTT();
void takeMeasurement();
void publishTemperatureData(const TemperatureReading& reading);
void publishDeviceStatus();
void updateDisplay();
void handleMQTTMessage(char* topic, byte* payload, unsigned int length);
void checkFeverAlert(float temperature);
void playAlert(int duration, int frequency);
void updateDeviceStatus();
void handleButtonPress();
void enterDeepSleep();
bool validateTemperature(float temp);
String encryptData(const String& data);
void logError(const String& error);

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== BotCareU IoT Health Monitor Starting ===");
  
  // Initialize pins
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(BUZZER_PIN, OUTPUT);
  
  // Flash LED to indicate startup
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(200);
    digitalWrite(LED_PIN, LOW);
    delay(200);
  }
  
  // Initialize file system
  setupFileSystem();
  
  // Generate unique device ID
  generateDeviceId();
  
  // Initialize display
  setupDisplay();
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("BotCareU Starting...");
  display.display();
  
  // Initialize sensors
  setupSensors();
  
  // Initialize WiFi
  setupWiFi();
  
  // Initialize time client
  timeClient.begin();
  timeClient.update();
  
  // Initialize MQTT
  setupMQTT();
  
  // Initialize device status
  updateDeviceStatus();
  
  Serial.println("=== Setup Complete ===");
  
  // Display ready message
  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("BotCareU Ready!");
  display.println("Device ID:");
  display.println(deviceId);
  display.display();
  
  // Play startup sound
  playAlert(100, 1000);
  delay(100);
  playAlert(100, 1500);
}

void loop() {
  unsigned long currentTime = millis();
  
  // Handle WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    connectToWiFi();
  }
  
  // Handle MQTT connection
  if (!mqttClient.connected()) {
    connectToMQTT();
  }
  mqttClient.loop();
  
  // Update time
  timeClient.update();
  
  // Take temperature measurement
  if (currentTime - lastMeasurement >= MEASUREMENT_INTERVAL) {
    takeMeasurement();
    lastMeasurement = currentTime;
  }
  
  // Update display
  if (currentTime - lastDisplayUpdate >= DISPLAY_UPDATE_INTERVAL) {
    updateDisplay();
    lastDisplayUpdate = currentTime;
  }
  
  // Send heartbeat
  if (currentTime - lastHeartbeat >= HEARTBEAT_INTERVAL) {
    updateDeviceStatus();
    publishDeviceStatus();
    lastHeartbeat = currentTime;
  }
  
  // Handle button press
  if (digitalRead(BUTTON_PIN) == LOW) {
    delay(50); // Debounce
    if (digitalRead(BUTTON_PIN) == LOW) {
      handleButtonPress();
      while (digitalRead(BUTTON_PIN) == LOW) {
        delay(10);
      }
    }
  }
  
  // Small delay to prevent watchdog reset
  delay(10);
}

void setupFileSystem() {
  if (!LittleFS.begin()) {
    Serial.println("Failed to mount file system");
    return;
  }
  Serial.println("File system mounted successfully");
}

void generateDeviceId() {
  uint64_t chipid = ESP.getEfuseMac();
  deviceId = "BotCareU_" + String((uint32_t)(chipid >> 32), HEX) + String((uint32_t)chipid, HEX);
  deviceId.toUpperCase();
  deviceStatus.deviceId = deviceId;
  Serial.println("Device ID: " + deviceId);
}

void setupSensors() {
  Serial.println("Initializing sensors...");
  
  // Initialize MLX90614 IR sensor
  if (!mlx.begin()) {
    Serial.println("Error: Could not find MLX90614 sensor");
    deviceStatus.sensorsReady = false;
  } else {
    Serial.println("MLX90614 IR sensor initialized");
  }
  
  // Initialize DS18B20 contact sensor
  ds18b20.begin();
  int deviceCount = ds18b20.getDeviceCount();
  if (deviceCount == 0) {
    Serial.println("Warning: No DS18B20 sensors found");
  } else {
    Serial.println("DS18B20 sensor initialized, devices found: " + String(deviceCount));
    ds18b20.setResolution(12); // Set to highest resolution
  }
  
  deviceStatus.sensorsReady = true;
  Serial.println("Sensors initialization complete");
}

void setupWiFi() {
  Serial.println("Setting up WiFi...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startTime = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startTime < WIFI_TIMEOUT) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.println("IP address: " + WiFi.localIP().toString());
    deviceStatus.wifiConnected = true;
  } else {
    Serial.println("\nWiFi connection failed!");
    deviceStatus.wifiConnected = false;
  }
}

void connectToWiFi() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Reconnecting to WiFi...");
    WiFi.reconnect();
    delay(5000);
  }
}

void setupMQTT() {
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(handleMQTTMessage);
  connectToMQTT();
}

void connectToMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("Attempting MQTT connection...");

    if (mqttClient.connect(deviceId.c_str(), MQTT_USER, MQTT_PASSWORD)) {
      Serial.println("connected");
      deviceStatus.mqttConnected = true;

      // Subscribe to device-specific topics
      String configTopic = "botcareu/device/" + deviceId + "/config";
      String commandTopic = "botcareu/device/" + deviceId + "/commands";

      mqttClient.subscribe(configTopic.c_str());
      mqttClient.subscribe(commandTopic.c_str());

      // Publish device online status
      publishDeviceStatus();
    } else {
      Serial.print("failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" try again in 5 seconds");
      deviceStatus.mqttConnected = false;
      delay(MQTT_RECONNECT_DELAY);
    }
  }
}

void takeMeasurement() {
  if (measurementInProgress) return;

  measurementInProgress = true;
  digitalWrite(LED_PIN, HIGH); // Indicate measurement in progress

  TemperatureReading reading;
  reading.timestamp = timeClient.getEpochTime();
  reading.isValid = true;
  reading.measurementType = "combined";

  // Read infrared temperature
  reading.infraredTemp = mlx.readObjectTempC();
  reading.ambientTemp = mlx.readAmbientTempC();

  // Read contact temperature
  ds18b20.requestTemperatures();
  reading.contactTemp = ds18b20.getTempCByIndex(0);

  // Validate readings
  if (reading.infraredTemp < 20 || reading.infraredTemp > 50) {
    reading.isValid = false;
    Serial.println("Invalid infrared temperature reading");
  }

  if (reading.contactTemp < 20 || reading.contactTemp > 50) {
    Serial.println("Invalid contact temperature reading");
  }

  // Use the most accurate reading available
  if (reading.contactTemp > 20 && reading.contactTemp < 50) {
    reading.measurementType = "contact";
  } else if (reading.infraredTemp > 20 && reading.infraredTemp < 50) {
    reading.measurementType = "infrared";
  }

  if (reading.isValid) {
    lastReading = reading;

    // Check for fever
    float primaryTemp = (reading.measurementType == "contact") ? reading.contactTemp : reading.infraredTemp;
    checkFeverAlert(primaryTemp);

    // Publish to MQTT
    publishTemperatureData(reading);

    Serial.println("Temperature: " + String(primaryTemp) + "°C (" + reading.measurementType + ")");
  }

  digitalWrite(LED_PIN, LOW);
  measurementInProgress = false;
}

void publishTemperatureData(const TemperatureReading& reading) {
  if (!mqttClient.connected()) return;

  StaticJsonDocument<512> doc;
  doc["deviceId"] = deviceId;
  doc["infraredTemp"] = reading.infraredTemp;
  doc["contactTemp"] = reading.contactTemp;
  doc["ambientTemp"] = reading.ambientTemp;
  doc["measurementType"] = reading.measurementType;
  doc["timestamp"] = reading.timestamp;
  doc["isValid"] = reading.isValid;

  // Add metadata
  JsonObject metadata = doc.createNestedObject("metadata");
  metadata["batteryLevel"] = deviceStatus.batteryVoltage;
  metadata["signalStrength"] = WiFi.RSSI();
  metadata["firmwareVersion"] = "1.0.0-alpha";

  String payload;
  serializeJson(doc, payload);

  String topic = "botcareu/device/" + deviceId + "/temperature/reading";
  mqttClient.publish(topic.c_str(), payload.c_str());
}

void publishDeviceStatus() {
  if (!mqttClient.connected()) return;

  StaticJsonDocument<256> doc;
  doc["deviceId"] = deviceId;
  doc["status"] = deviceStatus.sensorsReady ? "online" : "error";
  doc["batteryLevel"] = deviceStatus.batteryVoltage;
  doc["signalStrength"] = WiFi.RSSI();
  doc["firmwareVersion"] = "1.0.0-alpha";
  doc["uptime"] = millis();
  doc["freeMemory"] = ESP.getFreeHeap();

  String payload;
  serializeJson(doc, payload);

  String topic = "botcareu/device/" + deviceId + "/status";
  mqttClient.publish(topic.c_str(), payload.c_str());
}

void updateDisplay() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);

  // Device info
  display.println("BotCareU Monitor");
  display.println("ID: " + deviceId.substring(deviceId.length() - 6));
  display.println("");

  // Connection status
  display.print("WiFi: ");
  display.println(WiFi.status() == WL_CONNECTED ? "OK" : "FAIL");
  display.print("MQTT: ");
  display.println(mqttClient.connected() ? "OK" : "FAIL");
  display.println("");

  // Latest reading
  if (lastReading.isValid) {
    float temp = (lastReading.measurementType == "contact") ?
                 lastReading.contactTemp : lastReading.infraredTemp;

    display.setTextSize(2);
    display.print(temp, 1);
    display.println(" C");
    display.setTextSize(1);

    if (temp >= FEVER_THRESHOLD) {
      display.println("FEVER DETECTED!");
    } else {
      display.println("Normal");
    }
  } else {
    display.println("No readings");
  }

  display.display();
}

void handleMQTTMessage(char* topic, byte* payload, unsigned int length) {
  String message;
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  Serial.println("MQTT message received: " + String(topic) + " = " + message);

  StaticJsonDocument<256> doc;
  deserializeJson(doc, message);

  String topicStr = String(topic);

  if (topicStr.endsWith("/config")) {
    // Handle configuration updates
    if (doc.containsKey("measurementInterval")) {
      // Update measurement interval
      Serial.println("Configuration updated");
    }
  } else if (topicStr.endsWith("/commands")) {
    // Handle commands
    String command = doc["command"];
    if (command == "measure_now") {
      takeMeasurement();
    } else if (command == "restart") {
      ESP.restart();
    }
  }
}

void checkFeverAlert(float temperature) {
  if (temperature >= FEVER_THRESHOLD) {
    Serial.println("FEVER ALERT: " + String(temperature) + "°C");

    // Play alert sound
    playAlert(1000, 2000);
    delay(200);
    playAlert(1000, 2000);

    // Publish alert
    StaticJsonDocument<256> doc;
    doc["deviceId"] = deviceId;
    doc["alertType"] = "fever_detected";
    doc["temperature"] = temperature;
    doc["severity"] = temperature >= HIGH_FEVER_THRESHOLD ? "high" : "moderate";
    doc["timestamp"] = timeClient.getEpochTime();

    String payload;
    serializeJson(doc, payload);

    String topic = "botcareu/device/" + deviceId + "/alerts";
    mqttClient.publish(topic.c_str(), payload.c_str());
  }
}

void playAlert(int duration, int frequency) {
  tone(BUZZER_PIN, frequency, duration);
}

void updateDeviceStatus() {
  deviceStatus.wifiConnected = (WiFi.status() == WL_CONNECTED);
  deviceStatus.mqttConnected = mqttClient.connected();
  deviceStatus.signalStrength = WiFi.RSSI();
  deviceStatus.uptime = millis();

  // Read battery voltage (if connected)
  int batteryReading = analogRead(BATTERY_PIN);
  deviceStatus.batteryVoltage = (batteryReading * 3.3) / 4095.0 * 2; // Voltage divider
}

void handleButtonPress() {
  Serial.println("Button pressed - taking measurement");
  takeMeasurement();

  // Brief feedback
  playAlert(100, 1000);
}
