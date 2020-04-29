# RaymarineAPtoFakeNavicoAutoPilot
Emulate a Simrad AC12 autopilot to be recognized by a B&G MFD and translate bi-directional with a Raymarine S1 Seatalk1 autopilot behind a Seatalk->SeatalkNG converter.

So far the following works for me with a B&G Vulcan:
- Show pilot heading from S1 on Vulcan
- Show pilot state (standby/auto) from S1 on Vulcan
- Use Vulcan buttons for auto/engage, standby, -1/+1/-10/+10

Still to be done:
- Commissioning AP to a level it shows Wind Mode
- Wind mode
- Tack buttons
- Check if navigation PGNs translate well to Seatalk1 allow usage of Track mode on S1


## Usage

For now I start it in screen on the Raspberry Pi like this:
$ node ./emulate.js <device to emulate> <device address>
so I use
$ node ./emulate.js AC12 1
