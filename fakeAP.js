const debug = require('debug')('fakeAP')
require('./canboatjs')
require('./canboatjs/lib/canbus')
const canDevice = require('./canboatjs/lib/canbus').canDevice
const device = require('./canboatjs/lib/candevice').device
const canbus = new (require('./canboatjs').canbus)({})


productInfoBla = {
    pgn: 126996,
    dst: 255,
    "NMEA 2000 Version": 1300,
    "Product Code": 151216,   // Just made up..
    "Model ID": "Triton2 Pilot Keypad",
    "Software Version Code": "1.0",
    "Model Version": "1",
    "Model Serial Code": "123456",
    "Certification Level": 1,
    "Load Equivalency": 4
  }

debug('Going into while loop with canbus.candevice.address %i', canbus.candevice.address)

function mainLoop () {
	if (canbus.candevice.cansend) {
		while (canbus.readableLength > 0) {
			//debug('canbus.readableLength: %i', canbus.readableLength)
			msg = canbus.read()
			// debug('Received packet: %j', msg)
			// debug('msg.pgn.src %i != canbus.candevice.address %i?', msg.pgn.src, canbus.candevice.address)
			if (msg.pgn.pgn == 59904) {
	    	if (msg.pgn.src != canbus.candevice.address) {
					// debug('Received ISO request pgn 126996 (productInfo)')
					debug('msg: %j', msg)
					if (msg.pgn.dst == 255) {
						canbus.sendPGN(productInfoBla, 255)
					}//  else {
						//canbus.sendPGN(productInfoBla, msg.pgn.src)
					//}
				}
			}
		}
		// process.exit()
	}
  setTimeout(mainLoop, 1);//wait 50 millisecnds then recheck
}

mainLoop()


