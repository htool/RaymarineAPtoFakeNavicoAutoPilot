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




![Vulcan screenshot](/doc/vulcan.jpg)

## Usage

To test start it in screen on the Raspberry Pi like this:
```
$ node ./emulate.js <device to emulate> <device address>
```
so I use
```
$ node ./emulate.js AC12 1
```

Sample output:
```
pi@boatnet:~/src/RaymarineAPtoFakeNavicoAutoPilot $ DEBUG=canboatjs:candevice,emulate,canbus node emulate.js AC12 1
  emulate Loading ./device/AC12.js +0ms
  emulate deviceAddress: "1" +36ms
  canboatjs:candevice Candevice loaded PGNs (defaultTransmitPGNs): [60928,59904,59392,59904,126996,127237,127245,127258,127250] +0ms
  canboatjs:candevice Sending iso request for 60928 to 255 +1s
  canboatjs:candevice Sending PGN {"pgn":59904,"dst":255,"PGN":60928,"src":254} +1ms
  emulate Using device id: 1 +4s
  emulate Emulate: Simrad AC12 Autopilot +1ms
  canboatjs:candevice Sending address claim 1 +1s
  canboatjs:candevice Sending PGN {"pgn":60928,"dst":255,"Unique Number":1751521,"Manufacturer Code":1857,"Device Function":150,"Device Class":40,"Device Instance Lower":0,"Device Instance Upper":0,"System Instance":0,"Industry Group":4,"Reserved1":1,"Reserved2":2,"src":"1"} +1ms
  canboatjs:candevice no address conflics, enabling send +253ms
  canboatjs:candevice Sending iso request for 126996 to 255 +1ms
  canboatjs:candevice Sending PGN {"pgn":59904,"dst":255,"PGN":126996,"src":"1"} +2ms
  emulate ISO request: {"pgn":{"canId":417988864,"prio":6,"src":0,"dst":1,"pgn":59904,"timestamp":"2020-04-29T07:10:23.370Z","fields":{}},"length":3,"data":{"type":"Buffer","data":[0,238,0]}} +2s
  emulate ISO request from 0 to 1 Data PGN: 60928 +3ms
  canboatjs:candevice handleISORequest {"canId":417988864,"prio":6,"src":0,"dst":1,"pgn":59904,"timestamp":"2020-04-29T07:10:23.370Z","fields":{"PGN":60928}} +309ms
  canboatjs:candevice Sending PGN {"pgn":60928,"dst":0,"Unique Number":1751521,"Manufacturer Code":1857,"Device Function":150,"Device Class":40,"Device Instance Lower":0,"Device Instance Upper":0,"System Instance":0,"Industry Group":4,"Reserved1":1,"Reserved2":2,"src":"1"} +2ms
  emulate ISO request: {"pgn":{"canId":417988870,"prio":6,"src":6,"dst":1,"pgn":59904,"timestamp":"2020-04-29T07:10:23.379Z","fields":{}},"length":3,"data":{"type":"Buffer","data":[0,238,0]}} +10ms
  emulate ISO request from 6 to 1 Data PGN: 60928 +1ms
  canboatjs:candevice handleISORequest {"canId":417988870,"prio":6,"src":6,"dst":1,"pgn":59904,"timestamp":"2020-04-29T07:10:23.379Z","fields":{"PGN":60928}} +8ms
  canboatjs:candevice Sending PGN {"pgn":60928,"dst":6,"Unique Number":1751521,"Manufacturer Code":1857,"Device Function":150,"Device Class":40,"Device Instance Lower":0,"Device Instance Upper":0,"System Instance":0,"Industry Group":4,"Reserved1":1,"Reserved2":2,"src":"1"} +1ms
  emulate ISO request: {"pgn":{"canId":417988864,"prio":6,"src":0,"dst":1,"pgn":59904,"timestamp":"2020-04-29T07:10:23.671Z","fields":{}},"length":3,"data":{"type":"Buffer","data":[0,238,0]}} +67ms
  emulate ISO request from 0 to 1 Data PGN: 60928 +0ms
  canboatjs:candevice handleISORequest {"canId":417988864,"prio":6,"src":0,"dst":1,"pgn":59904,"timestamp":"2020-04-29T07:10:23.671Z","fields":{"PGN":60928}} +66ms
  canboatjs:candevice Sending PGN {"pgn":60928,"dst":0,"Unique Number":1751521,"Manufacturer Code":1857,"Device Function":150,"Device Class":40,"Device Instance Lower":0,"Device Instance Upper":0,"System Instance":0,"Industry Group":4,"Reserved1":1,"Reserved2":2,"src":"1"} +1ms
  emulate ISO request: {"pgn":{"canId":417988870,"prio":6,"src":6,"dst":1,"pgn":59904,"timestamp":"2020-04-29T07:10:23.671Z","fields":{}},"length":3,"data":{"type":"Buffer","data":[0,238,0]}} +5ms
  emulate ISO request from 6 to 1 Data PGN: 60928 +1ms
  canboatjs:candevice handleISORequest {"canId":417988870,"prio":6,"src":6,"dst":1,"pgn":59904,"timestamp":"2020-04-29T07:10:23.671Z","fields":{"PGN":60928}} +4ms
  canboatjs:candevice Sending PGN {"pgn":60928,"dst":6,"Unique Number":1751521,"Manufacturer Code":1857,"Device Function":150,"Device Class":40,"Device Instance Lower":0,"Device Instance Upper":0,"System Instance":0,"Industry Group":4,"Reserved1":1,"Reserved2":2,"src":"1"} +1ms
```


### As pipedProvider in SignalK

You can add it to SignalK as pipedProvier in the ~/.signalk/settings.json like:

```
    {
      "id": "Emulate AP12",
      "pipeElements": [
        {
          "type": "providers/execute",
          "options": {
            "command_old": "tail -f /dev/null",
            "command_old2": "DEBUG=canboatjs:emulate node /home/pi/src/RaymarineAPtoFakeNavicoAutoPilot/emulate.js AC12 0",
            "command": "node /home/pi/src/RaymarineAPtoFakeNavicoAutoPilot/emulate.js AC12 0",
            "providerId": "Emulate AP12"
          }
        },
        {
          "type": "providers/liner"
        },
        {
          "type": "providers/from_json"
        }
      ]
    },
```
