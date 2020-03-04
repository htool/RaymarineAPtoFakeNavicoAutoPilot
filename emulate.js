const debug = require('debug')('emulate')

var myArgs = process.argv.slice(2);
const emulate = myArgs[0] || 'AC12'
const emulate_init = './device/' + emulate + '.js'

// Load device specific init info
debug('Loading %s', emulate_init)
require(emulate_init)
const defaultTransmitPGNs = require(emulate_init).defaultTransmitPGNs
module.exports.defaultTransmitPGNs = defaultTransmitPGNs
const deviceAddress = require(emulate_init).deviceAddress

require('./canboatjs')
require('./canboatjs/lib/canbus')
const canDevice = require('./canboatjs/lib/canbus').canDevice
// const device = require('./canboatjs/lib/candevice').device
const canbus = new (require('./canboatjs').canbus)({})
const util = require('util')

var reply130851 = [];
var pilot_state = 'standby';
var heading = 199;

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

function AC12_PGN127237 () {
  const heading_track_pgn = {
      "auto":    "%s,2,127237,%s,%s,21,ff,7f,ff,ff,7f,%s,%s,00,00,ff,ff,ff,ff,ff,7f,ff,ff,ff,ff,ff,ff",
      "NFU":     "%s,2,127237,%s,%s,21,ff,7f,ff,ff,7f,%s,%s,00,00,ff,ff,ff,ff,ff,7f,ff,ff,ff,ff,ff,ff",
      "wind":    "",
      "route":   "",
      "standby": "%s,2,127237,%s,%s,21,ff,7f,ff,ff,7f,ff,ff,00,00,ff,ff,ff,ff,ff,7f,ff,ff,ff,ff,ff,ff" // Magnetic
      // True    "%s,2,127237,%s,%s,21,ff,3f,ff,ff,7f,ff,ff,00,00,ff,ff,ff,ff,ff,7f,ff,ff,ff,ff,ff,ff"
  }

  switch (pilot_state) {
    case 'auto':
    case 'NFU':
      var new_value = Math.trunc(degsToRad(heading) * 10000)
      var msg = util.format(heading_track_pgn[pilot_state], (new Date()).toISOString(), canbus.candevice.address,
                            255, padd((new_value & 0xff).toString(16), 2), padd(((new_value >> 8) & 0xff).toString(16), 2))
      // debug('127237 (auto): %j', msg);
      canbus.sendPGN(msg);
      break;
    case 'standby':
      var msg = util.format(heading_track_pgn[pilot_state], (new Date()).toISOString(), canbus.candevice.address, 255)
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

async function AC12_pilotmode () {
  const messages = [
    "%s,7,65305,%s,255,8,41,9f,00,02,10,00,00,00",
    "%s,7,65305,%s,255,8,41,9f,00,0a,14,00,80,00",
    "%s,3,65340,%s,255,8,41,9f,10,01,fe,fa,00,80",
    "%s,7,65302,%s,255,8,41,9f,0a,69,00,00,28,ff",
    "%s,3,65340,%s,255,8,41,9f,10,01,fe,fa,00,80",
    "%s,6,65341,%s,255,8,41,9f,ff,ff,0d,ff,ff,7f",
    "%s,6,65341,%s,255,8,41,9f,ff,ff,0c,ff,ff,ff",
    "%s,6,65341,%s,255,8,41,9f,ff,ff,03,ff,ff,ff" ]

  for (var nr in messages) {
    msg = util.format(messages[nr], (new Date()).toISOString(), canbus.candevice.address)
    canbus.sendPGN(msg)
    await sleep(25)
  }
}

function AC12_pilotmode_02 () {
  const pgn65341_02 = {
      "auto":    "%s,6,65341,%s,255,8,41,9f,ff,ff,02,ff,15,9a",
      "NFU":     "%s,6,65341,%s,255,8,41,9f,ff,ff,02,ff,00,00",
      "route":   "",
      "standby": "%s,6,65341,%s,255,8,41,9f,ff,ff,02,ff,ff,ff"
  }
  msg = util.format(pgn65341_02[pilot_state], (new Date()).toISOString(), canbus.candevice.address)
  canbus.sendPGN(msg)
}

function AC12_pilotmode_0b () {
  const message = "%s,6,65341,%s,255,8,41,9f,ff,ff,0b,ff,00,00"
  msg = util.format(message, (new Date()).toISOString(), canbus.candevice.address)
  canbus.sendPGN(msg)
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
	    debug('Emulate: Simrad AC12-1 Autopilot')
      // setTimeout(AC12_bootconfig, 5000) // Once at startup
      setInterval(PGN130822, 300000) // Every 5 minutes
      setInterval(AC12_pilotmode, 1000) // Every second
      setInterval(AC12_pilotmode_0b, 5000) // Every 5 second
      setInterval(AC12_pilotmode_02, 5000) // Every 5 second
      setInterval(AC12_PGN130860, 1000) // Every second
      setInterval(heartbeat, 60000) // Heart beat PGN
      // setInterval(AC12_PGN127237, 1000) // Heading/track PGN
 	    break;
}

function mainLoop () {
	while (canbus.readableLength > 0) {
	//debug('canbus.readableLength: %i', canbus.readableLength)
    msg = canbus.read()
		// debug('Received packet msg: %j', msg)
	  // debug('msg.pgn.src %i != canbus.candevice.address %i?', msg.pgn.src, canbus.candevice.address)
    if ( msg.pgn.dst == canbus.candevice.address || msg.pgn.dst == 255) {
      msg.pgn.fields = {}
      if (msg.pgn.pgn == 59904) {
        PGN1 = msg.data[1]
        PGN2 = msg.data[0]
        debug('ISO request from %d to %d Data: %j', msg)
        debug('ISO request from %d to %d Data PGN1: %i  PGN2: %i', msg.pgn.src, msg.pgn.dst, PGN1, PGN2)
        switch (PGN1) {
          case 238: // ISO Address claim
            msg.pgn.fields.PGN = 60928
            canbus.candevice.n2kMessage(msg.pgn)
            break;
          case 240: // Product info / ISO Group
            if (PGN2 == 20) { msg.pgn.fields.PGN = 126996 }
            if (PGN2 == 22) { msg.pgn.fields.PGN = 126998 }
            canbus.candevice.n2kMessage(msg.pgn)
            break;
          case 255: // PGN1: 255  PGN2: 24
            if (PGN2 == 24) { msg.pgn.fields.PGN = 65304}
            canbus.candevice.n2kMessage(msg.pgn)
            break;
        }
      }
		}
    switch (emulate) {
      case 'AC12':
        if (msg.pgn.pgn == 130850) { // Simnet Event, requires reply
          // Using 130850 and turning it into 130851
          debug ('Event AP command: %j %j', msg.pgn, msg.data);
          if (reply130851.length == 0) {
            reply130851 = reply130851.concat(buf2hex(msg.data).slice(2)); // Skip multipart byte and length byte
          } else {
            reply130851 = reply130851.concat(buf2hex(msg.data).slice(1,6)); // Skip multipart byte and 1 stuffing byte
          }
          debug('reply130851 %j', reply130851);
          if (reply130851.join(',') == '41,9f,01,ff,ff,0a,09,00,ff,ff,ff') {
            debug('Going into auto mode');
            pilot_state = 'auto';
            AC12_pilotmode_02();
          } else if (reply130851.join(',') == '41,9f,01,ff,ff,0a,06,00,ff,ff,ff') {
            debug('Going into standby mode');
            pilot_state = 'standby';
            AC12_pilotmode_02();
          } else if (reply130851.join(',') == '41,9f,01,ff,ff,02,0e,00,ff,ff,ff') {
            debug('Going into NFU mode');
            pilot_state = 'NFU';
            AC12_pilotmode_02();
          }
          if (reply130851.length > 8) { // We have 2 parts now
              msg = "%s,7,130851,%s,255,12," + reply130851.join(',');
              debug('Sending %j', msg);
              msg = util.format(msg, (new Date()).toISOString(), canbus.candevice.address)
              canbus.sendPGN(msg)
              reply130851=[];
          }
        }
        break;
      default:

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
