const debug = require('debug')('device');
debug('Emulate: Simrad AC12 autopilot');



// Device address (suggested)
var deviceAddress = 3;

// Track/heading


// AddressClaim PGN
// ISO Address Claim:  Unique Number = 0x1ab9e1; Manufacturer Code = Simrad; Device Instance Lower = 0; Device Instance Upper = 0; Device Function = 150; Device Class = Steering and Control surfaces; System Instance = 0; Industry Group = Marine
addressClaim = {
  pgn: 60928,
  dst: 255,
  "Unique Number": 1751521,
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
// 2019-09-11-05:15:35.641 6   1 255 126996 Product Information:  NMEA 2000 Version = 1200; Product Code = 18846; Model ID = AC12    _Autopilot; Software Version Code = 1100    130200; Model Version = ; Model Serial Code = 014817#; Certification Level = 1; Load Equivalency = 1
productInfo = {
  pgn: 126996,
  dst: 255,
  "NMEA 2000 Version": 1200,
  "Product Code": 18846,
  "Model ID": "AC12 Autopilot",
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
  59904,
  126996,
  127237,
  127245,
  127258,
  127250 ]

module.exports.defaultTransmitPGNs = defaultTransmitPGNs
