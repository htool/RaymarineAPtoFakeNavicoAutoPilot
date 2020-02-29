const { invert, propertyOf } = require('lodash/fp')
const manufacturerNames = require('./codesMfgs.json')

const industryCodes = {
  0: 'Global',
  1: 'Highway',
  2: 'Agriculture',
  3: 'Construction',
  4: 'Marine Industry',
  5: 'Industrial'
}

const deviceClassCodes = {
  0: 'Reserved for 2000 Use',
  10: 'System tools',
  20: 'Safety systems',
  25: 'Internetwork device',
  30: 'Electrical Distribution',
  35: 'Electrical Generation',
  40: 'Steering and Control surfaces',
  50: 'Propulsion',
  60: 'Navigation',
  70: 'Communication',
  75: 'Sensor Communication Interface',
  80: 'Instrumentation/general systems',
  85: 'External Environment',
  90: 'Internal Environment',
  100: 'Deck + cargo + fishing equipment systems',
  120: 'Display',
  125: 'Entertainment'
}

const deviceClassNames = invert(deviceClassCodes)
const industryNames = invert(industryCodes)
industryNames['Marine'] = 4


const manufacturerCodes = invert(manufacturerNames)
module.exports.manufacturerCodes = manufacturerCodes
module.exports.getIndustryName = propertyOf(industryCodes)
module.exports.getManufacturerName = propertyOf(manufacturerCodes)
module.exports.getIndustryCode = propertyOf(industryNames)
module.exports.getManufacturerCode = propertyOf(manufacturerNames)
module.exports.getDeviceClassCode = propertyOf(deviceClassNames)
module.exports.getDeviceClassName = propertyOf(deviceClassCodes)
