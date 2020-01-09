"use strict";

let SerialPort = require('serialport');
let Buttplug = require('buttplug');
let util = require('util');
let WebSocket = require('ws');
let Events = require('events');

class ButtplugWSClient extends Events.EventEmitter {

  constructor(aUrl) {
    super();
    this._url = aUrl;
    this._ws = null;
  }

  Connect() {
    let ws = new WebSocket(this._url);
    let res;
    let rej;
    const p = new Promise((resolve, reject) => { res = resolve; rej = reject; });
    // In websockets, our error rarely tells us much, as for security reasons
    // browsers usually only throw Error Code 1006. It's up to those using this
    // library to state what the problem might be.
    const conErrorCallback = (ev) => rej();
    ws.on("open", async (ev) => {
      this._ws = ws;
      this._ws.on("message", (aMsg) => { console.log(aMsg); this.emit("message", Buttplug.FromJSON(aMsg)); });
      this._ws.on("close", this.Disconnect);
      console.log("resolving");
      res();
    });
    ws.on("close", conErrorCallback);
    return p;
  }
  Disconnect() {
  }
  Send(aMsg) {
    this._ws.send("[" + aMsg.toJSON() + "]");
  }
  IsConnected() {
    return this._ws !== null;
  }
}

async function main() {
  console.log("hello?");
  let devices = [];
  let lastSendTime = 0;
  let client = new Buttplug.ButtplugClient("Nogasm Client");
  // try {
  console.log("Connecting");
  await client.Connect(new ButtplugWSClient("ws://localhost:12345/buttplug")).then(() => { console.log("HELLO?!"); }, () => { console.log("Error?!"); } );
    console.log("What?!");
  // } catch (e) {
  //   console.log("Exception!");
  //   console.log(e.stack);
  //   return;
  // }

  console.log("Scanning?");
  await client.StartScanning();

  client.on("deviceadded", (device) => {
    console.log("Got new device");
    devices.push(device);
  });

  let port = new SerialPort('COM4', {
    baudRate: 115200
  });

  port.on('readable', function() {
    let data = port.read().toString('utf8');
    console.log('data: ', data);
    let vals = data.split(",");
    if (vals.length !== 3) {
      return;
    }
    let speed = parseFloat(vals[0]);
    if (speed < 0) {
      speed = 0;
    }
    let currentTime = new Date().getTime();
    if (currentTime - lastSendTime > 150) {
      lastSendTime = currentTime;
      for (let device of devices) {
        if (device.AllowedMessages.indexOf("SingleMotorVibrateCmd") !== -1) {
          client.SendDeviceMessage(device, new Buttplug.SingleMotorVibrateCmd(speed / 179.0));
        }
      }
    }
  });
}


main().then(() => console.log("exiting"));
