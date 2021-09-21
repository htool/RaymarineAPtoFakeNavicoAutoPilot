const debug = require('debug')('device')
debug('Emulate: B&G Triton Keypad')

// Device address (suggested)
deviceAddress = 9

// AddressClaim PGN
addressClaim = {
  pgn: 60928,
  dst: 255,
  "Unique Number": 1477041,
  "Manufacturer Code": 381, // B&G
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
  "NMEA 2000 Version": "1300",
  "Product Code": 24547,
  "Model ID": "Triton Pilot Keypad",
  "Software Version Code": "1100140600",
  "Model Version": "",
  "Model Serial Code": "002481#",
  "Certification Level": 1,
  "Load Equivalency": 3
}

const defaultTransmitPGNs = [
  60928,
  59904,
  59392,
  59904,
  130130
]

module.exports.defaultTransmitPGNs = defaultTransmitPGNs
