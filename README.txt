SOMA Smart Shade for Homey

This app integrate the `SOMA Smart Shade` into Homey.

Notes: 

Soma Smart Tilt is not adapted. Hope to adapt soon.

You can configure the timeout between polls in the app's settings.

Also is possible to connect to MQTT-Broker if you enable on settings.
It publish following messages for a SomaShade (RISEXXX):

    - SomaShades/RISEXXX/position/value (where value is between 0.00 and 1.00)
    
    - SomaShades/RISEXXX/battery/value (where value is between 0 and 100)
    
    - SomaSahdes/RISEXXX/state/value  (where value is up/idle/down)

You can also Subscribe to a Topic and move SomaShades to a value.

    - SomaShades/+/REVECIVE/value (where RECEIVE can be configured on settings)

