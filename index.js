let Service;
let Characteristic;

const http = require("http");
const https = require("https");
const url = require("url");

module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory(
    "homebridge-rest-switch",
    "HttpSwitch",
    HttpSwitchAccessory
  );
};

function HttpSwitchAccessory(log, config) {
  this.log = log;
  this.service = "Switch";

  this.name = config["name"];

  // On configuration
  this.onUrl = config["on_url"];
  this.onMethod = config["on_method"] || "POST";
  this.onBody = config["on_body"] || "";

  // Off configuration
  this.offUrl = config["off_url"];
  this.offMethod = config["off_method"] || "POST";
  this.offBody = config["off_body"] || "";

  // State configuration
  this.stateUrl = config["state_url"] || null;
  this.stateMethod = config["state_method"] || "GET";
  this.stateJsonPath = config["state_json_path"] || null; // e.g., "power.status"
  this.stateOnValue = config["state_on_value"] || true;

  this.uniqueSerial = config["unique_serial"] || "HttpSwitch Serial Number";
  this.currentState = false;

  // Helper function to make HTTP requests
  this.makeRequest = function (urlString, method, body, callback) {
    const parsedUrl = url.parse(urlString);
    const client = parsedUrl.protocol === "https:" ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.path,
      method: method,
      headers: {}
    };

    if (body) {
      if (typeof body === "object") {
        body = JSON.stringify(body);
        options.headers["Content-Type"] = "application/json";
      }
      options.headers["Content-Length"] = Buffer.byteLength(body);
    }

    const req = client.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const jsonData = data ? JSON.parse(data) : {};
            callback(null, jsonData);
          } catch (err) {
            this.log.debug(`Response is not JSON: ${data}`);
            callback(null, data);
          }
        } else {
          callback(new Error(`HTTP ${res.statusCode}: ${data}`), null);
        }
      });
    });

    req.on("error", (err) => {
      callback(err, null);
    });

    if (body) {
      req.write(body);
    }

    req.end();
  }.bind(this);

  // Helper function to get nested JSON value by path
  this.getNestedValue = function (obj, path) {
    if (!path) return obj;
    return path.split(".").reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  };

  this.setStateHandler = function (powerOn, callback) {
    const urlToUse = powerOn ? this.onUrl : this.offUrl;
    const methodToUse = powerOn ? this.onMethod : this.offMethod;
    const bodyToUse = powerOn ? this.onBody : this.offBody;

    if (!urlToUse) {
      const errMessage = `No URL configured for ${powerOn ? "ON" : "OFF"} command`;
      this.log.error(errMessage);
      callback(new Error(errMessage), null);
      return;
    }

    this.log.debug(`${methodToUse} ${urlToUse}`);
    if (bodyToUse) {
      this.log.debug(`Body: ${typeof bodyToUse === "object" ? JSON.stringify(bodyToUse) : bodyToUse}`);
    }

    this.makeRequest(urlToUse, methodToUse, bodyToUse, (error, response) => {
      if (error) {
        this.log.error(`Set State returned an error: ${error.message}`);
        callback(error, null);
        return;
      }

      this.currentState = powerOn;
      this.log.info(`Set ${this.name} to ${powerOn ? "ON" : "OFF"}`);
      callback(null, powerOn);
    });
  };

  this.getStateHandler = function (callback) {
    if (!this.stateUrl) {
      this.log.error("No state_url configured");
      callback(new Error("No state_url configured"), null);
      return;
    }

    this.log.debug(`${this.stateMethod} ${this.stateUrl}`);

    this.makeRequest(this.stateUrl, this.stateMethod, null, (error, response) => {
      if (error) {
        this.log.error(`Get State returned an error: ${error.message}`);
        callback(error, null);
        return;
      }

      let actualValue;
      if (typeof response === "object") {
        actualValue = this.getNestedValue(response, this.stateJsonPath);
      } else {
        actualValue = response;
      }

      this.log.debug(`State value: ${JSON.stringify(actualValue)}`);

      const poweredOn = actualValue === this.stateOnValue ||
                        actualValue?.toString() === this.stateOnValue?.toString();

      this.log.info(`State of ${this.name} is: ${poweredOn ? "ON" : "OFF"}`);
      callback(null, poweredOn);
    });
  };
}

HttpSwitchAccessory.prototype.setState = function (powerOn, callback) {
  this.log.info(`Setting ${this.name} to ${powerOn ? "ON" : "OFF"}...`);
  this.setStateHandler(powerOn, callback);
};

HttpSwitchAccessory.prototype.getState = function (callback) {
  this.log.info(`Getting ${this.name} state...`);
  if (this.stateUrl) {
    this.getStateHandler(callback);
  } else {
    this.log.debug("No state_url configured, using cached state");
    callback(null, this.currentState);
  }
};

HttpSwitchAccessory.prototype.getServices = function () {
  const informationService = new Service.AccessoryInformation();
  const switchService = new Service.Switch(this.name);
  const theSerial = this.uniqueSerial.toString();

  informationService
    .setCharacteristic(Characteristic.Manufacturer, "HttpSwitch Manufacturer")
    .setCharacteristic(Characteristic.Model, "HttpSwitch Model")
    .setCharacteristic(Characteristic.SerialNumber, theSerial);

  const characteristic = switchService
    .getCharacteristic(Characteristic.On)
    .on("set", this.setState.bind(this));

  if (this.stateUrl) {
    characteristic.on("get", this.getState.bind(this));
  }

  return [informationService, switchService];
};
