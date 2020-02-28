const debug = require('debug')('emulate')

var myArgs = process.argv.slice(2);
emulate = myArgs[0] || 'AC12'
emulate_init = './device/' + emulate + '.js'

// Load device specific init info
debug('Loading %s', emulate_init)
require(emulate_init)

require('./canboatjs')
require('./canboatjs/lib/canbus')
const canDevice = require('./canboatjs/lib/canbus').canDevice
const device = require('./canboatjs/lib/candevice').device
const canbus = new (require('./canboatjs').canbus)({})
const util = require('util')

debug('Using device id: %i', canbus.candevice.address)

// Generic functions

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

async function AC12_pilotmode () {
  const messages = [
    "%s,7,65305,%s,255,8,41,9f,00,02,10,00,00,00",
    "%s,7,65305,%s,255,8,41,9f,00,0a,14,00,80,00",
    "%s,3,65340,%s,255,8,41,9f,10,01,fe,fa,00,80",
    "%s,7,65302,%s,255,8,41,9f,0a,69,00,00,28,ff",
    "%s,3,65340,%s,255,8,41,9f,10,01,fe,fa,00,80",
    "%s,6,65341,%s,255,8,41,9f,ff,ff,0d,ff,ff,7f",
    "%s,6,65341,%s,255,8,41,9f,ff,ff,0c,ff,ff,ff",
    "%s,6,65341,%s,255,8,41,9f,ff,ff,03,ff,ff,ff",
    "%s,6,65341,%s,255,8,41,9f,ff,ff,02,ff,ff,ff" ]

  for (var nr in messages) {
    msg = util.format(messages[nr], (new Date()).toISOString(), canbus.candevice.address)
    canbus.sendPGN(msg)
    await sleep(25)
  }
}

function AC12_pilotmode_0b () {
  const message = "%s,6,65341,%s,255,8,41,9f,ff,ff,0b,ff,00,00"
  msg = util.format(message, (new Date()).toISOString(), canbus.candevice.address)
  canbus.sendPGN(msg)
}

switch (emulate) {
  case 'keypad':
      debug('Emulate: B&G Triton2 Keypad')
      setTimeout(PGN130822, 5000) // Once at startup
      setInterval(PGN130822, 300000) // Every 5 minutes
      setInterval(heartbeat, 60000) // Heart beat PGN
      break;
	case 'AP44':
	    debug('Emulate: Simrad AP44 Autopilot controller')
      setTimeout(PGN130822, 5000) // Once at startup
      setInterval(PGN130822, 300000) // Every 5 minutes
      setInterval(AP44_PGN65305, 1000) // Every 1 minute
      setInterval(heartbeat, 60000) // Heart beat PGN
	    break;
	case 'AC12':
	    debug('Emulate: Simrad AC12-1 Autopilot')
      setTimeout(PGN130822, 5000) // Once at startup
      setInterval(PGN130822, 300000) // Every 5 minutes
      setInterval(AC12_pilotmode, 1000) // Every second
      setInterval(AC12_pilotmode_0b, 5000) // Every second
      setInterval(AC12_PGN130860, 1000) // Every second
      setInterval(heartbeat, 60000) // Heart beat PGN
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
        debug('ISO request. Data PGN1: %i  PGN2: %i', PGN1, PGN2)
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
          debug ('Reply AP command: %j', msg.pgn)
          // msg = util.format(messages[nr], (new Date()).toISOString(), canbus.candevice.address)
          canbus.sendPGN(reply)
          // sendPGN(msg.pgn);
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
