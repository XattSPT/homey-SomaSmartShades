# SOMA Smart Shade for Homey

## Introduction
This app integrate the `SOMA Smart Shade` into Homey.

## Q&amp;A

> **Q1**  Why can’t Soma Smart Shade be found by Homey?

* _Check if the SOMA Smart Shade is not connected to another bluetooth device. The  `SomaSmartShade`  app for example_

> **Q2**  Is the app compatibel with v2.0.0?

* The app is only compatible from v2.1.2 and up due to change to the BLE core.

## Usage ##
1. Install app
2. Add device(s) to Homey.
3. Make a flow with one of the cards.

You can configure the timeout between polls in the app's settings.

Also is possible to connect to MQTT-Broker if you enable on settings.
It publish following messages for a SomaShade (RISEXXX):

    - SomaShades/RISEXXX/position/value (where value is between 0.00 and 1.00)
    
    - SomaShades/RISEXXX/battery/value (where value is between 0 and 100)
    
    - SomaSahdes/RISEXXX/state/value  (where value is up/idle/down)

You can also Subscribe to a Topic and move SomaShades to a value.

    - SomaShades/+/REVECIVE/value (where RECEIVE can be configured on settings)

## Many Many Thanks to ##

Many thanks to kokotaildotcom for his homey-mi-app. You can check it at: https://github.com/koktaildotcom/homey-mi-flora

I've get from his app much inspiration, BLE learning and (why not) some functions! ;-) 
  
## Final note ##
The repository is available at: https://github.com/XattSPT/homey-SomaSmartShades

Please, be kind on me, this my first App done as a Hooby! I'll do my best to resolve any bugs or malfunction.


## Change Log:

### v 0.9.3
Changed Class to "curtain" for better integration with Homeykit.
Added OnOff Cabalility. "On Position" and "Off Position" on Homey App could be configured on device advanced settings (default 0 & 100)

NOTE: It's necessary to delete and re-add devices for proper re-asignation on Homeykit and On Off capability if you have previos versions.

### v 0.9.2
Added compatibility with 2nd Generation Soma's

### v 0.9.1
Complete node_modules upload to proper install on Homey

### v 0.9.0
First public release
