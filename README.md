# SOMA Smart Shade for Homey

## Introduction
This app integrate the `SOMA Smart Shade` into Homey.

Do you like the app? You can make me happy by buying me a beer! [![](https://img.shields.io/badge/paypal-donate-green.svg)](https://www.paypal.me/XattSPT)

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
    - SomaShade/RISEXXX/position/value (where value is between 0.00 and 1.00)
    - SomaShade/RISEXXX/battery/value (where value is between 0 and 100)
    - SomaSahde/RISEXXX/state/value  (where value is up/idle/down)

You can also Subscribe to a Topic and move SomaShades to a value.

    - SomaShade/+/REVECIVE/value (where RECEIVE can be configured on settings)

## Many Many Thanks to ##

Many thanks to kokotaildotcom for his homey-mi-app. You can check it at: https://github.com/koktaildotcom/homey-mi-flora

I've get from his app much inspiration, BLE learning and (why not) some functions! ;-) 
  
## Final note ##
The repository is available at: https://github.com/XattSPT/homey-somashades

Please, be kind on me, this my first App done as a Hooby! I'll do my best to resolve any bugs or malfunction.
