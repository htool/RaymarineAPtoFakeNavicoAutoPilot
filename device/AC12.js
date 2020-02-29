const debug = require('debug')('device');
debug('Emulate: Simrad AC12-1 autopilot');



// Device address (suggested)
deviceAddress = 16;

// Track/heading


// AddressClaim PGN
addressClaim = {
  pgn: 60928,
  dst: 255,
  "Unique Number": 4226,
  "Manufacturer Code": 1857,
  "Device Function": 150,
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
  "Product Code": 18846,
  "Model ID": "AC12_Autopilot",
  "Software Version Code": "1.3.03.00",
  "Model Version": "",
  "Model Serial Code": "014817",
  "Certification Level": 1,
  "Load Equivalency": 1
}

const defaultTransmitPGNs = [
  60928,
  59904,
  59392,
  59904
]

module.exports.defaultTransmitPGNs = defaultTransmitPGNs
