const debug = require('debug')('emulate')

var myArgs = process.argv.slice(2);
const emulate = myArgs[0] || 'AC12'
const emulate_init = './device/' + emulate + '.js'

// Load device specific init info
debug('Loading %s', emulate_init)
require(emulate_init)
const defaultTransmitPGNs = require(emulate_init).defaultTransmitPGNs
module.exports.defaultTransmitPGNs = defaultTransmitPGNs

const deviceAddress = myArgs[1];
//  const deviceAddress = require(emulate_init).deviceAddress;
module.exports.deviceAddress = deviceAddress;

debug('deviceAddress: %j', deviceAddress)

require('./canboatjs')
require('./canboatjs/lib/canbus')
const canDevice = require('./canboatjs/lib/canbus').canDevice
// const device = require('./canboatjs/lib/candevice').device
const canbus = new (require('./canboatjs').canbus)({})
const util = require('util')

var pilot_state = 'standby';
var heading;
var heading_rad = 'ff,ff';
var locked_heading;
var locked_heading_rad = 'ff,ff';
var mag_variation;

// Variables for multipacket pgns
var pgn130850 = [];
var pilotmode126720 = [];
var pgn129284 = [];
var pgn130845 = [];

// Raymarine setup
key_command     = "%s,7,126720,%s,%s,16,3b,9f,f0,81,86,21,%s,07,01,02,00,00,00,00,00,00,00,00,00,00,00,ff,ff,ff,ff,ff" // ok
heading_command = "%s,3,126208,%s,%s,14,01,50,ff,00,f8,03,01,3b,07,03,04,06,%s,%s"
wind_command    = "%s,3,126720,%s,%s,16,3b,9f,f0,81,86,21,23,dc,00,00,00,00,00,00,ff,ff,ff,ff,ff",
route_command   = "%s,3,126720,%s,%s,16,3b,9f,f0,81,86,21,03,fc,3c,42,00,00,00,00,ff,ff,ff,ff,ff",
autopilot_dst = '115' // default converter device id

function changeHeading(app, deviceid, command_json)
{
  var ammount = command_json["value"]
  var state = pilot_state;
  var new_value
  var command_format
  var n2k_msgs

  debug("changeHeading: " + state + " " + ammount)
  if ( state == "auto" )
  {
    var current = heading_rad;
    new_value = radsToDeg(current) + ammount

    if ( new_value < 0 ) {
      new_value = 360 + new_value
    } else if ( new_value > 360 ) {
      new_value = new_value - 360
    }

    debug(`current heading: ${radsToDeg(current)} new value: ${new_value}`)

    command_format = heading_command
  }
  else if ( state == "wind" )
  {
    var current = app.getSelfPath(target_wind_path)
    new_value = radsToDeg(current) + ammount

    if ( new_value < 0 )
      new_value = 360 + new_value
    else if ( new_value > 360 )
      new_value = new_value - 360

    debug(`current wind angle: ${radsToDeg(current)} new value: ${new_value}`)
    command_format = wind_direction_command
  }
  else
  {
    //error
  }
  if ( new_value )
  {
    new_value = Math.trunc(degsToRad(new_value) * 10000)
    n2k_msgs = [util.format(command_format, (new Date()).toISOString(), default_src,
                            autopilot_dst, padd((new_value & 0xff).toString(16), 2), padd(((new_value >> 8) & 0xff).toString(16), 2))]
  }
  return n2k_msgs
}

debug('Using device id: %i', canbus.candevice.address)

// Generic functions
function buf2hex(buffer) { // buffer is an ArrayBuffer
  return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2));
}

function radsToDeg(radians) {
  return radians * 180 / Math.PI
}

function degsToRad(degrees) {
  return degrees * (Math.PI/180.0);
}

function padd(n, p, c)
{
  var pad_char = typeof c !== 'undefined' ? c : '0';
  var pad = new Array(1 + p).join(pad_char);
  return (pad + n).slice(-pad.length);
}

// Sleep
const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

// Heartbeat PGN 126993
const hexByte = require('./canboatjs/lib/utilities').hexByte
const heartbeat_msg = "%s,7,126993,%s,255,8,60,ea,%s,ff,ff,ff,ff,ff"
var heartbeatSequencenumber = 0

function heartbeat () {
  heartbeatSequencenumber++
  if (heartbeatSequencenumber > 600) {
    heartbeatSequencenumber = 1
  }
  msg = util.format(heartbeat_msg, (new Date()).toISOString(), canbus.candevice.address, hexByte(heartbeatSequencenumber))
  canbus.sendPGN(msg)
}

async function PGN130822 () {
  const messages = [
    "%s,3,130822,%s,255,0f,13,99,ff,01,00,0e,00,00,fc,13,25,00,00,74,be",
    "%s,3,130822,%s,255,0f,13,99,ff,01,00,0f,00,00,fc,13,60,04,00,a3,5c",
    "%s,3,130822,%s,255,0f,13,99,ff,01,00,09,00,00,fc,12,1c,00,00,dd,d1",
    "%s,3,130822,%s,255,0f,13,99,ff,01,00,0a,00,00,fc,13,b6,00,00,94,3a",
    "%s,3,130822,%s,255,0f,13,99,ff,01,00,0b,00,00,fc,13,b9,00,00,16,67",
    "%s,3,130822,%s,255,0f,13,99,ff,01,00,0c,00,00,fc,13,6f,00,00,03,bb",
    "%s,3,130822,%s,255,0f,13,99,ff,01,00,0d,00,00,fc,13,25,00,00,74,be",
    "%s,3,130822,%s,255,0f,13,99,ff,01,00,0e,00,00,fc,13,25,00,00,74,be" ]

  for (var nr in messages) {
    msg = util.format(messages[nr], (new Date()).toISOString(), canbus.candevice.address)
    canbus.sendPGN(msg)
    await sleep(1000)
  }
}

function AC12_PGN130860 () {
  const message = "%s,7,130860,%s,255,21,13,99,ff,ff,ff,ff,7f,ff,ff,ff,7f,ff,ff,ff,ff,ff,ff,ff,7f,ff,ff,ff,7f"
  msg = util.format(message, (new Date()).toISOString(), canbus.candevice.address)
  canbus.sendPGN(msg)
}

function AC12_PGN130850 () {
  const message = "%s,2,130850,%s,255,0c,41,9f,ff,ff,64,00,2b,00,ff,ff,ff,ff,ff"
  msg = util.format(message, (new Date()).toISOString(), canbus.candevice.address)
  canbus.sendPGN(msg)
}

function AC12_PGN127250 () {
  // 2020-04-19-18:45:46.934,3,127250,7,255,8,0,3b,8f,ff,7f,0e,01,fd
  // 2020-04-19-18:46:19.480 2 115 255 127250 Vessel Heading:  SID = 0; Heading = 210.1 deg; Deviation = Unknown; Variation = Unknown; Reference = Magnetic
  const message = "%s,3,127250,%s,255,8,00,%s,ff,7f,ff7f,fc"
  true_heading = Math.trunc(degsToRad(heading + mag_variation) * 10000)
  true_heading_hex = padd((true_heading & 0xff).toString(16), 2) + "," + padd(((true_heading >> 8) & 0xff).toString(16), 2)
  msg = util.format(message, (new Date()).toISOString(), canbus.candevice.address, true_heading_hex)
  canbus.sendPGN(msg)
}

function AC12_PGN127245 (rudder_pgn_data) {
  const message = "%s,2,127245,%s,255,8,%s"
  msg = util.format(message, (new Date()).toISOString(), canbus.candevice.address, rudder_pgn_data)
  canbus.sendPGN(msg)
}

function AC12_PGN128275 (log_pgn_data) {
  const message = "%s,2,128275,%s,255,8,%s"
  msg = util.format(message, (new Date()).toISOString(), canbus.candevice.address, log_pgn_data)
  canbus.sendPGN(msg)
}

function AC12_PGN127237 () {
  const heading_track_pgn = {
      //"auto":    "%s,2,127237,%s,%s,15,ff,7f,ff,ff,7f,%s,00,00,ff,ff,ff,ff,ff,7f,ff,ff,ff,ff,ff,ff",
      "auto":    "%s,2,127237,%s,%s,15,ff,7c,ff,ff,7f,%s,00,00,ff,ff,ff,ff,ff,7f,ff,ff,ff,ff,%s",
      "NFU":     "%s,2,127237,%s,%s,15,ff,7f,ff,ff,7f,%s,00,00,ff,ff,ff,ff,ff,7f,ff,ff,ff,ff,%s",
      "wind":    "",
      "route":   "",
      //"standby": "%s,2,127237,%s,%s,15,ff,78,ff,ff,7f,ff,ff,00,00,ff,ff,ff,ff,ff,7f,ff,ff,ff,ff,ff,ff" // Magnetic
      // "standby": "%s,2,127237,%s,%s,15,ff,7f,ff,ff,7f,ff,ff,00,00,ff,ff,ff,ff,ff,7f,ff,ff,ff,ff,ff,ff" // Magnetic
      "standby": "%s,2,127237,%s,%s,15,ff,3f,ff,ff,7f,ff,ff,00,00,ff,ff,ff,ff,ff,7f,ff,ff,ff,ff,%s" // True
  }

  switch (pilot_state) {
    case 'auto':
    case 'NFU':
      // var new_value = Math.trunc(degsToRad(heading) * 10000)
      // var msg = util.format(heading_track_pgn[pilot_state], (new Date()).toISOString(), canbus.candevice.address,
      //                      255, padd((new_value & 0xff).toString(16), 2), padd(((new_value >> 8) & 0xff).toString(16), 2))
      var msg = util.format(heading_track_pgn[pilot_state], (new Date()).toISOString(), canbus.candevice.address,
                            255, locked_heading_rad, locked_heading_rad)
      // debug('127237 (auto): %j', msg);
      canbus.sendPGN(msg);
      break;
    case 'standby':
      var msg = util.format(heading_track_pgn[pilot_state], (new Date()).toISOString(), canbus.candevice.address, 255, heading_rad)
      // debug('127237 (standby): %j', msg);
      canbus.sendPGN(msg);
  }
}

async function AP44_PGN65305 () {
  const messages = [
    "%s,7,65305,%s,255,8,41,9f,01,03,00,00,00,00",
    "%s,7,65305,%s,255,8,41,9f,01,0b,00,00,00,00" ]

  for (var nr in messages) {
    msg = util.format(messages[nr], (new Date()).toISOString(), canbus.candevice.address)
    canbus.sendPGN(msg)
    await sleep(500)
  }
}

async function AP44_bootconfig () {
  const messages = [
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,18,0a,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1a,0d,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,19,0d,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1a,0f,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,19,0f,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1a,0e,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,19,0e,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1a,10,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,19,10,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,18,02,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1a,11,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,19,11,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1c,11,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,18,06,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,14,06,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,14,01,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,14,1d,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1c,01,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1c,02,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1c,08,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,18,0b,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1c,09,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1b,0c,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,18,0c,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,14,09,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,18,09,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,21,19,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1f,1b,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1f,1a,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,22,0b,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,22,1a,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1e,1a,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,20,0b,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,20,1b,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,23,0d,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,23,0b,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,18,0a,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1a,0d,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,19,0d,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1a,0f,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,19,0f,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1a,0e,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,19,0e,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1a,10,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,19,10,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,18,02,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1a,11,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,19,11,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1c,11,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,18,06,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,14,06,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,14,01,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,14,1d,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1c,01,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1c,02,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1c,08,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,18,0b,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1c,09,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1b,0c,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,18,0c,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,14,09,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,18,09,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,21,19,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1f,1b,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1f,1a,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,22,0b,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,22,1a,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1e,1a,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,20,0b,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,20,1b,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,23,0d,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,23,0b,00,00,ff,ff,ff,ff" ]
  for (var nr in messages) {
    msg = util.format(messages[nr], (new Date()).toISOString(), canbus.candevice.address)
    canbus.sendPGN(msg)
    await sleep(25)
  }
}


async function AC12_bootconfig () {
  const messages = [
    "%s,3,130840,%s,%s,11,41,9f,ff,00,01,02,ff,09,3f,04,34,e8,00,a0,50,c0,ff",
    "%s,3,130840,%s,%s,11,41,9f,ff,05,01,fe,ff,03,ac,fb,e3,10,00,82,78,c0,ff",
    "%s,3,130840,%s,%s,11,41,9f,ff,02,01,7f,ff,03,d1,15,80,11,00,91,78,c0,ff",
    "%s,3,130840,%s,%s,11,41,9f,ff,03,01,0b,ff,04,15,11,77,22,00,be,a0,c0,ff",
    "%s,3,130840,%s,%s,11,41,9f,ff,08,01,23,ff,00,ac,fb,e3,10,00,82,78,c0,ff",
    "%s,3,130840,%s,%s,11,41,9f,ff,09,01,01,ff,00,e1,b9,3a,e8,00,96,50,c0,ff",
    "%s,3,130840,%s,%s,11,41,9f,ff,04,01,01,ff,03,e1,b9,3a,e8,00,96,50,c0,ff",
    "%s,3,130840,%s,%s,11,41,9f,ff,01,01,fe,ff,03,6c,1f,b8,2f,00,aa,78,c0,ff",
    "%s,3,130840,%s,%s,11,41,9f,ff,38,64,01,ff,32,e1,b9,3a,e8,00,96,50,c0,ff",
    "%s,3,130840,%s,%s,11,41,9f,ff,6a,64,fe,ff,ff,6c,5f,b3,2f,00,8c,50,c0,ff",
    "%s,3,130840,%s,%s,11,41,9f,ff,36,64,01,ff,32,e1,b9,3a,e8,00,96,50,c0,ff",
    "%s,3,130840,%s,%s,11,41,9f,ff,68,64,fe,ff,ff,6c,5f,b3,2f,00,8c,50,c0,ff",
    "%s,3,130840,%s,%s,11,41,9f,ff,36,64,01,ff,32,e1,b9,3a,e8,00,96,50,c0,ff",
    "%s,3,130840,%s,%s,11,41,9f,ff,36,64,01,ff,32,e1,b9,3a,e8,00,96,50,c0,ff",
    "%s,3,130840,%s,%s,11,41,9f,ff,68,64,fe,ff,ff,6c,5f,b3,2f,00,8c,50,c0,ff",
    "%s,3,130840,%s,%s,11,41,9f,ff,68,64,fe,ff,ff,6c,5f,b3,2f,00,8c,50,c0,ff",
    "%s,3,130840,%s,%s,11,41,9f,ff,38,64,01,ff,32,e1,b9,3a,e8,00,96,50,c0,ff",
    "%s,3,130840,%s,%s,11,41,9f,ff,38,64,01,ff,32,e1,b9,3a,e8,00,96,50,c0,ff",
    "%s,3,130840,%s,%s,11,41,9f,ff,6a,64,fe,ff,ff,6c,5f,b3,2f,00,8c,50,c0,ff",
    "%s,3,130840,%s,%s,11,41,9f,ff,6a,64,fe,ff,ff,6c,5f,b3,2f,00,8c,50,c0,ff" ]
  for (var nr in messages) {
    msg = util.format(messages[nr], (new Date()).toISOString(), canbus.candevice.address)
    canbus.sendPGN(msg)
    await sleep(25)
  }
}

async function AC12_PGN65340 () {
  const pgn65340 = {
      "auto":        "%s,3,65340,%s,255,8,41,9f,10,01,fe,fa,00,80",
      "NFU":         "%s,3,65340,%s,255,8,41,9f,10,02,fe,fa,00,80",
      "wind":        "%s,3,65340,%s,255,8,41,9f,10,03,fe,fa,00,80",
      "navigation":  "%s,3,65340,%s,255,8,41,9f,10,04,fe,fa,00,80",
      "standby":     "%s,3,65340,%s,255,8,41,9f,00,00,fe,f8,00,80"
  }
  const pgn65302 = {
      "standby":    "%s,7,65302,%s,255,8,41,9f,0a,6b,00,00,00,ff",
      "wind":       "%s,7,65302,%s,255,8,41,9f,0a,69,00,00,00,ff", // guessing
      "navigation": "%s,7,65302,%s,255,8,41,9f,0a,69,00,00,00,ff", // guessing
      "auto":       "%s,7,65302,%s,255,8,41,9f,0a,4b,00,00,00,ff",
      "NFU":        "%s,7,65302,%s,255,8,41,9f,0a,69,00,00,28,ff"
  }
  const messages = [
    pgn65340[pilot_state],
    pgn65302[pilot_state] ]

  for (var nr in messages) {
    msg = util.format(messages[nr], (new Date()).toISOString(), canbus.candevice.address)
    canbus.sendPGN(msg)
    await sleep(25)
  }
}

function AC12_PGN65341_1s () {
  const message = "%s,6,65341,%s,255,8,41,9f,ff,ff,0d,ff,ff,7f";
  msg = util.format(message, (new Date()).toISOString(), canbus.candevice.address)
  canbus.sendPGN(msg)
}

async function AC12_PGN65341_5s () {
  const messages = [
    "%s,6,65341,%s,255,8,41,9f,ff,ff,0b,ff,00,00",
    "%s,6,65341,%s,255,8,41,9f,ff,ff,0c,ff,ff,ff",
    "%s,6,65341,%s,255,8,41,9f,ff,ff,03,ff,ff,ff",
    "%s,6,65341,%s,255,8,41,9f,ff,ff,02,ff,ff,ff" ]
  for (var nr in messages) {
    msg = util.format(messages[nr], (new Date()).toISOString(), canbus.candevice.address)
    canbus.sendPGN(msg)
    await sleep(25)
  }
}

function AC12_PGN65341_02 () {
  const pgn65341_02 = {
      "auto":       "%s,6,65341,%s,255,8,41,9f,ff,ff,02,ff,15,9a",
      "NFU":        "%s,6,65341,%s,255,8,41,9f,ff,ff,02,ff,00,00",
      "wind":       "%s,6,65341,%s,255,8,41,9f,ff,ff,02,ff,00,00",
      "navigation": "",
      "standby":    "%s,6,65341,%s,255,8,41,9f,ff,ff,02,ff,ff,ff"
  }
  msg = util.format(pgn65341_02[pilot_state], (new Date()).toISOString(), canbus.candevice.address)
  canbus.sendPGN(msg)
}

async function AC12_PGN65305 () {
  switch (pilot_state) {
    case 'standby':
        messages = [
          "%s,7,65305,%s,255,8,41,9f,00,02,02,00,00,00",
          "%s,7,65305,%s,255,8,41,9f,00,0a,0a,00,80,00" ];
        break;
    case 'auto':
        messages = [
          "%s,7,65305,%s,255,8,41,9f,00,1d,01,00,00,00",
          "%s,7,65305,%s,255,8,41,9f,00,1d,81,00,00,00",
          "%s,7,65305,%s,255,8,41,9f,00,0a,14,00,80,00",
          "%s,7,65305,%s,255,8,41,9f,00,02,10,00,00,00" ];
        break;
    case 'navigation': // unknown
      messages = [
        "%s,7,65305,%s,255,8,41,9f,00,1d,80,00,00,00",
        "%s,7,65305,%s,255,8,41,9f,00,03,10,00,00,00",
        "%s,7,65305,%s,255,8,41,9f,00,0a,0c,00,80,00" ];
        break;
    case 'wind': // unknown
      messages = [
        "%s,7,65305,%s,255,8,41,9f,00,1d,80,00,00,00",
        "%s,7,65305,%s,255,8,41,9f,00,03,10,00,00,00",
        "%s,7,65305,%s,255,8,41,9f,00,0a,0c,00,80,00" ];
        break;
    case 'NFU':
        messages = [
          "%s,7,65305,%s,255,8,41,9f,00,1d,80,00,00,00",
          "%s,7,65305,%s,255,8,41,9f,00,02,10,00,00,00",
          "%s,7,65305,%s,255,8,41,9f,00,0a,0c,00,80,00" ];
        break;
  }
  for (var nr in messages) {
    msg = util.format(messages[nr], (new Date()).toISOString(), canbus.candevice.address)
    canbus.sendPGN(msg)
    await sleep(25)
  }
}



switch (emulate) {
  case 'default':
      setTimeout(PGN130822, 5000) // Once at startup
  case 'keypad':
      debug('Emulate: B&G Triton2 Keypad')
      setInterval(PGN130822, 300000) // Every 5 minutes
      setInterval(heartbeat, 60000) // Heart beat PGN
      break;
	case 'AP44':
	    debug('Emulate: Simrad AP44 Autopilot controller')
      setTimeout(AP44_bootconfig, 5000) // Once at startup
      setInterval(PGN130822, 300000) // Every 5 minutes
      setInterval(AP44_PGN65305, 1000) // Every 1 minute
      setInterval(heartbeat, 60000) // Heart beat PGN
	    break;
	case 'AC12':
	    debug('Emulate: Simrad AC12 Autopilot')
      // setTimeout(AC12_bootconfig, 5000) // Once at startup
      setInterval(PGN130822, 300000) // Every 5 minutes
      setInterval(AC12_PGN65340, 1000) // Every second
      setInterval(AC12_PGN65341_02, 5000) // Every 5 second
      setInterval(AC12_PGN65341_1s, 1000) // Every second
      setInterval(AC12_PGN65341_5s, 5000) // Every second
      setInterval(AC12_PGN65305, 1000)
      setInterval(AC12_PGN130860, 1000) // Every second
      setInterval(heartbeat, 60000) // Heart beat PGN
      setInterval(AC12_PGN127237, 1000) // Heading/track PGN
      setInterval(AC12_PGN127250, 1000) // True heading
      // setInterval(AC12_PGN130850, 5000) // Controlling device
 	    break;
}

function mainLoop () {
	while (canbus.readableLength > 0) {
	//debug('canbus.readableLength: %i', canbus.readableLength)
    msg = canbus.read()
		// debug('Received packet msg: %j', msg)
	  // debug('msg.pgn.src %i != canbus.candevice.address %i?', msg.pgn.src, canbus.candevice.address)
    if ( msg.pgn.dst == canbus.candevice.address || msg.pgn.dst == 255) {
      msg.pgn.fields = {};
      if (msg.pgn.pgn == 59904) {
        PGN = msg.data[2] * 256 * 256 + msg.data[1] * 256 + msg.data[0];
        debug('ISO request: %j', msg);
        debug('ISO request from %d to %d Data PGN: %i', msg.pgn.src, msg.pgn.dst, PGN);
        msg.pgn.fields.PGN = PGN;
        canbus.candevice.n2kMessage(msg.pgn);
      }
      switch (emulate) {
        case 'AC12':
          if (msg.pgn.pgn == 130850) { // Simnet Event, requires reply
            pgn130850 = pgn130850.concat(buf2hex(msg.data).slice(1)); // Skip multipart byte
            PGN130850 = pgn130850.join(',');
            if (!PGN130850.match(/^..,41,9f,01,ff,ff,/)) {
              pgn130850 = [];
            }

            if (pgn130850.length > 8) { // We have 2 parts now
              debug ('Event AP command: %j %s', msg.pgn, PGN130850);
              // if (PGN130850.match(/41,9f,01,ff,ff,0a,09,00,ff,ff,ff/)) {
              //   debug('Going into auto mode');
              //   pilot_state = 'auto';
              //   AC12_PGN65341_02();
              // } else if (PGN130850.match(/41,9f,01,ff,ff,0a,06,00,ff,ff,ff/)) {
              //   debug('Going into standby mode');
              //   pilot_state = 'standby';
              //   AC12_PGN65341_02();
              // } else if (PGN130850.match(/41,9f,01,ff,ff,02,0e,00,ff,ff,ff/)) {
              //   debug('Going into NFU mode');
              //   pilot_state = 'NFU';
              //   AC12_PGN65341_02();

              // B&G autopilot button matching
              if (PGN130850.match(/^0c,41,9f,01,ff,ff,..,1a,00,02,ae,00/)) { // -1
                pgn126720 = "%s,7,126720,%s,%s,16,3b,9f,f0,81,86,21,05,fa,07,01,02,00,00,00,00,00,00,00,00,00,00,00,ff,ff,ff,ff,ff";
                debug('B&G button press -1');
              } else if (PGN130850.match(/^0c,41,9f,01,ff,ff,..,1a,00,03,ae,00/)) { // +1
                pgn126720 = "%s,7,126720,%s,%s,16,3b,9f,f0,81,86,21,07,f8,07,01,02,00,00,00,00,00,00,00,00,00,00,00,ff,ff,ff,ff,ff";
                debug('B&G button press +1');
              } else if (PGN130850.match(/^0c,41,9f,01,ff,ff,..,1a,00,02,d1,06/)) { // -10
                pgn126720 = "%s,7,126720,%s,%s,16,3b,9f,f0,81,86,21,06,f9,07,01,02,00,00,00,00,00,00,00,00,00,00,00,ff,ff,ff,ff,ff";
                debug('B&G button press -10');
              } else if (PGN130850.match(/^0c,41,9f,01,ff,ff,..,1a,00,03,d1,06/)) { // +10
                pgn126720 = "%s,7,126720,%s,%s,16,3b,9f,f0,81,86,21,08,f7,07,01,02,00,00,00,00,00,00,00,00,00,00,00,ff,ff,ff,ff,ff";
                debug('B&G button press +10');
              } else if (PGN130850.match(/^0c,41,9f,01,ff,ff,..,06,00,ff,ff,ff/)) { // Standby
                pgn126720 = "%s,3,126720,%s,%s,16,3b,9f,f0,81,86,21,02,fd,00,00,00,00,00,00,ff,ff,ff,ff,ff"
                debug('Setting Seatalk1 pilot mode Standby');
              } else if (PGN130850.match(/^0c,41,9f,01,ff,ff,..,06,00,auto/)) { // Wind
                pgn126720 = "%s,3,126720,%s,%s,16,3b,9f,f0,81,86,21,23,dc,00,00,00,00,00,00,ff,ff,ff,ff,ff";
                debug('Setting Seatalk1 pilot mode Wind');
              } else if (PGN130850.match(/^0c,41,9f,01,ff,ff,..,06,00,auto/)) { // Route/navigation
                pgn126720 = "%s,3,126720,%s,%s,16,3b,9f,f0,81,86,21,03,fc,3c,42,00,00,00,00,ff,ff,ff,ff,ff";
                debug('Setting Seatalk1 pilot mode Route (navigation)');
              } else if (PGN130850.match(/^0c,41,9f,01,ff,ff,..,09,00,ff,ff,ff/)) { // Auto
                pgn126720 = "%s,3,126720,%s,%s,16,3b,9f,f0,81,86,21,01,fe,00,00,00,00,00,00,ff,ff,ff,ff,ff";
                debug('Setting Seatalk1 pilot mode Auto');

              // Clear 'No Autopilot' alarm?
              } else if (PGN130850.match(/41,9f,ff,ff,ff,1f,51,00,c4,49,29/)) {
                pgn130851.replace(',51,', ',52,');
              }

              // Send Seatalk Button
              if (typeof pgn126720 != 'undefined' && pgn126720) {
                  pgn126720 = util.format(pgn126720, (new Date()).toISOString(), canbus.candevice.address, autopilot_dst);
                  debug('Sending Seatalk pgn 126720 %j', pgn126720);
                  canbus.sendPGN(pgn126720)
              }

              // Send 130851 reply packet
              pgn130851_size = pgn130850[0];
              pgn130851_size_int = parseInt(pgn130850[0], 16);
              pgn130851 = "%s,7,130851,%s,255," + pgn130851_size + "," + (pgn130850.slice(1,pgn130851_size_int + 1)).join(',');
              pgn130851 = util.format(pgn130851, (new Date()).toISOString(), canbus.candevice.address)
              // debug('Sending reply 130851 %j', pgn130851);
              canbus.sendPGN(pgn130851)
              pgn130850 = [];
            }

          // Seatalk1 pilot mode
          } else if (msg.pgn.pgn == 126720) {
            // 16,3b,9f,f0,81
            pilotmode126720 = pilotmode126720.concat(buf2hex(msg.data).slice(1)); // Skip multipart byte
            Seatalkmode = pilotmode126720.join(',');
            if (!Seatalkmode.match(/^16,3b,9f,f0,81,84/)) {
              pilotmode126720 = [];
            }
            if (pilotmode126720.length > 24) { // We have 4 parts now
              if (Seatalkmode.match(/16,3b,9f,f0,81,84,..,..,..,42,/)) {
                if (pilot_state != 'auto') {
                  debug('Following Seatalk1 pilot mode auto: %s', Seatalkmode);
                  pilot_state = 'auto';
                  AC12_PGN65341_02();
                }
              } else if (Seatalkmode.match(/16,3b,9f,f0,81,84,..,..,..,46,/)) {
                if (pilot_state != 'wind') {
                  debug('Following Seatalk1 pilot mode wind: %s', Seatalkmode);
                  pilot_state = 'wind';
                  AC12_PGN65341_02();
                }
              } else if (Seatalkmode.match(/16,3b,9f,f0,81,84,..,..,..,40,/) || Seatalkmode.match(/16,3b,9f,f0,81,84,..,..,..,44,/) ) {
                if (pilot_state != 'standby') {
                  debug('Following Seatalk1 pilot mode standby: %s', Seatalkmode);
                  pilot_state = 'standby'
                  AC12_PGN65341_02();
                }
              } else if (Seatalkmode.match(/16,3b,9f,f0,81,86,21,03,fc,3c,42/) || Seatalkmode.match(/16,3b,9f,f0,81,84,..,..,..,44,/) ) {
                if (pilot_state != 'navigation') {
                  debug('Following Seatalk1 pilot mode route (navigation): %s', Seatalkmode);
                  pilot_state = 'navigation'
                  AC12_PGN65341_02();
                }
              }
              pilotmode126720=[];
            }

          } else if (msg.pgn.pgn == 65359) {
          // Get heading from Seatalk1 packet
            // debug ('Seatalk1 Pilot heading info: %j %j', msg.pgn, msg.data);
            var heading_true_rad = buf2hex(msg.data).slice(3,5);
            var heading_mag_rad = buf2hex(msg.data).slice(5,7);
            // debug ("heading_true_rad: %s heading_mag_rad: %s", heading_true_rad, heading_mag_rad);
            if (heading_true_rad[0] != 'ff') {
              heading_rad = heading_true_rad
            } else {
              heading_rad = heading_mag_rad
            }
            heading = radsToDeg(parseInt('0x' + heading_rad[1] + heading_rad[0]))/10000;
            // debug('heading: %s', heading)
          } else if (msg.pgn.pgn == 65360) {
          // Get locked heading from Seatalk1 packet
            // debug ('Seatalk1 Pilot locked heading info: %j %j', msg.pgn, msg.data);
            var locked_heading_true_rad = buf2hex(msg.data).slice(3,5);
            var locked_heading_mag_rad = buf2hex(msg.data).slice(5,7);
            // debug ("heading_true_rad: %s heading_mag_rad: %s", heading_true_rad, heading_mag_rad);
            if (locked_heading_true_rad[0] != 'ff') {
              locked_heading_rad = locked_heading_true_rad
            } else {
              locked_heading_rad = locked_heading_mag_rad
            }
            locked_heading = radsToDeg(parseInt('0x' + locked_heading_rad[1] + locked_heading_rad[0]))/10000;
            // debug('locked heading: %s', locked_heading)


          } else if (msg.pgn.pgn == 127245 && msg.pgn.src == 115) {
          // Get rudder angle info from Seatalk1 packet
            rudder_pgn_data = buf2hex(msg.data);
            AC12_PGN127245(rudder_pgn_data);
          } else if (msg.pgn.pgn == 128275 && msg.pgn.src == 115) {
          // Get distance log info from Seatalk1 packet
            AC12_PGN128275(buf2hex(msg.data));
          } else if (msg.pgn.pgn == 127258)  {
          // Get variation info to turn into true heading
            mag_variation = buf2hex(msg.data)
            mag_variation = parseInt('0x' + mag_variation[5] + mag_variation[4]);
            mag_variation = radsToDeg(mag_variation)/10000;
          } else if (msg.pgn.pgn == 129284) { // Navigation bearing info
            pgn129284 = pgn129284.concat(buf2hex(msg.data).slice(1)); // Skip multipart byte
            PGN129284 = pgn129284.join(',');
            if (!PGN129284.match(/^[02468ace]0,22,/)) {
              pgn129284 = [];
            }
            if (pgn129284.length > 8) { // We have 2 parts now
              // debug('PGN129284: %s', PGN129284)
            }
            else if (msg.pgn.pgn == 130845) { // Commission Simnet reply
              pgn130845 = pgn130845.concat(buf2hex(msg.data).slice(1)); // Skip multipart byte
              PGN130845 = pgn130845.join(',');
              if (!PGN130845.match(/^[02468ace]0,22,/)) {
                pgn130845 = [];
              }
              if (pgn130845.length > 16) { // We have 3 parts now
                // debug('PGN130845: %s', PGN130845)
                PGN130845 = "%s,3,130845,%s,255," + PGN130845;
                PGN130845 = util.format(PGN130845, (new Date()).toISOString(), canbus.candevice.address)
                canbus.sendPGN(PGN130845)
                pgn130845 = [];
              }
            }
          }
          break;
        default:
      }
    }
	}
  setTimeout(mainLoop, 50)
}

// Wait for cansend
function waitForSend () {
  if (canbus.candevice.cansend) {
    mainLoop()
    return
  }
  setTimeout (waitForSend, 500)
}

waitForSend()
