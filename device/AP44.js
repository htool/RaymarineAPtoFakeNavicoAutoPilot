const debug = require('debug')('device')
debug('Emulate: Simrad Autopilot controller')

// Device address (suggested)
deviceAddress = 20

// AddressClaim PGN
addressClaim = {
  pgn: 60928,
  dst: 255,
  "Unique Number": 20010,
  "Manufacturer Code": 1857,
  "Device Function": 140,
  "Device Class": 40,
  "Device Instance Lower": 0,
  "Device Instance Upper": 0,
  "System Instance": 0,
  "Industry Group": 4,          // Marine
  "Reserved1": 1,
  "Reserved2": 2
}

// Product info PGN
productInfo = {
  pgn: 126996,
  dst: 255,
  "NMEA 2000 Version": 2100,
  "Product Code": 20010,   // Just made up..
  "Model ID": "AP44 Autopilot Controller",
  "Software Version Code": "1.0.54.3.10",
  "Model Version": "",
  "Model Serial Code": "011881",
  "Certification Level": 2,
  "Load Equivalency": 4
}

const defaultTransmitPGNs = [
  60928,
  59904,
  59392,
  59904,
  123123
]

module.exports.defaultTransmitPGNs = defaultTransmitPGNs
