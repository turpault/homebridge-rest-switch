# homebridge-rest-switch

A Homebridge plugin to control devices via HTTP requests. This plugin allows you to create HomeKit switches that trigger HTTP/HTTPS requests to control any device with a REST API.

## Features

- Control devices using HTTP/HTTPS requests
- Configurable ON/OFF routes with custom methods and bodies
- Status checking via GET requests with JSON payload validation
- Support for nested JSON path navigation
- No external dependencies (uses Node.js built-in modules only)
- Support for both HTTP and HTTPS

## Installation

```bash
npm install -g homebridge-rest-switch
```

Or install via Homebridge Config UI X by searching for "homebridge-rest-switch".

## Configuration

Add the accessory to your Homebridge `config.json`:

```json
{
  "accessories": [
    {
      "accessory": "HttpSwitch",
      "name": "My Device",
      "on_url": "http://192.168.1.100/api/power",
      "on_method": "POST",
      "on_body": {"state": "on"},
      "off_url": "http://192.168.1.100/api/power",
      "off_method": "POST",
      "off_body": {"state": "off"},
      "state_url": "http://192.168.1.100/api/status",
      "state_method": "GET",
      "state_json_path": "power.state",
      "state_on_value": "on"
    }
  ]
}
```

### Configuration Options

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `accessory` | Yes | - | Must be `"HttpSwitch"` |
| `name` | Yes | - | Name of the switch in HomeKit |
| `on_url` | Yes | - | URL to call when turning the switch ON |
| `on_method` | No | `"POST"` | HTTP method for ON command (GET, POST, PUT, etc.) |
| `on_body` | No | `""` | Request body for ON command (string or JSON object) |
| `off_url` | Yes | - | URL to call when turning the switch OFF |
| `off_method` | No | `"POST"` | HTTP method for OFF command |
| `off_body` | No | `""` | Request body for OFF command (string or JSON object) |
| `state_url` | No | - | URL to check device status |
| `state_method` | No | `"GET"` | HTTP method for status check |
| `state_json_path` | No | - | Path to navigate nested JSON response (e.g., `"power.status"`) |
| `state_on_value` | No | `true` | Value that indicates the device is ON |
| `unique_serial` | No | `"HttpSwitch Serial Number"` | Unique serial number for the accessory |

## Examples

### Example 1: Simple REST API

Control a device with a simple REST API:

```json
{
  "accessory": "HttpSwitch",
  "name": "Living Room Light",
  "on_url": "http://192.168.1.50/api/light/on",
  "off_url": "http://192.168.1.50/api/light/off",
  "state_url": "http://192.168.1.50/api/light/status",
  "state_json_path": "status",
  "state_on_value": "on"
}
```

Expected status response:
```json
{
  "status": "on"
}
```

### Example 2: Single Endpoint with Body

Use the same endpoint for ON/OFF with different bodies:

```json
{
  "accessory": "HttpSwitch",
  "name": "Smart Plug",
  "on_url": "https://api.example.com/device/123/control",
  "on_method": "POST",
  "on_body": {"power": true},
  "off_url": "https://api.example.com/device/123/control",
  "off_method": "POST",
  "off_body": {"power": false},
  "state_url": "https://api.example.com/device/123/status",
  "state_json_path": "device.power",
  "state_on_value": true
}
```

Expected status response:
```json
{
  "device": {
    "id": 123,
    "power": true,
    "temperature": 22
  }
}
```

### Example 3: PUT Method with String Body

```json
{
  "accessory": "HttpSwitch",
  "name": "Garage Door",
  "on_url": "http://192.168.1.20/control",
  "on_method": "PUT",
  "on_body": "OPEN",
  "off_url": "http://192.168.1.20/control",
  "off_method": "PUT",
  "off_body": "CLOSE",
  "state_url": "http://192.168.1.20/status",
  "state_on_value": "OPEN"
}
```

Expected status response (plain text):
```
OPEN
```

### Example 4: Deeply Nested JSON Response

```json
{
  "accessory": "HttpSwitch",
  "name": "Thermostat",
  "on_url": "http://192.168.1.30/api/set",
  "on_body": {"hvac": {"mode": "heat"}},
  "off_url": "http://192.168.1.30/api/set",
  "off_body": {"hvac": {"mode": "off"}},
  "state_url": "http://192.168.1.30/api/get",
  "state_json_path": "system.hvac.mode",
  "state_on_value": "heat"
}
```

Expected status response:
```json
{
  "system": {
    "hvac": {
      "mode": "heat",
      "temperature": 72
    }
  }
}
```

### Example 5: Without Status Checking

If your device doesn't support status checking, omit `state_url`:

```json
{
  "accessory": "HttpSwitch",
  "name": "IR Blaster",
  "on_url": "http://192.168.1.40/send/power_on",
  "off_url": "http://192.168.1.40/send/power_off"
}
```

## Debugging

Enable debug logging in Homebridge to see HTTP requests and responses:

```bash
homebridge -D
```

You'll see debug output like:
```
[Living Room Light] POST http://192.168.1.50/api/light/on
[Living Room Light] Body: {"state":"on"}
[Living Room Light] Set Living Room Light to ON
[Living Room Light] GET http://192.168.1.50/api/light/status
[Living Room Light] State value: "on"
[Living Room Light] State of Living Room Light is: ON
```

## Troubleshooting

### Switch doesn't update status

- Make sure `state_url` is configured correctly
- Check that `state_json_path` matches your JSON response structure
- Verify `state_on_value` matches the actual value in your API response
- Enable debug mode to see the actual response from your device

### HTTP request fails

- Verify the URL is accessible from your Homebridge server
- Check firewall settings
- Ensure the device API is responding correctly (test with curl)
- Look for error messages in the Homebridge log

### Body not sent correctly

- For JSON bodies, use object notation: `"on_body": {"key": "value"}`
- For plain text bodies, use string notation: `"on_body": "COMMAND"`
- Objects are automatically serialized to JSON with appropriate Content-Type header

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
