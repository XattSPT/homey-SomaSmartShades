"use strict";

const Homey = require('homey');
const MQTT = require("async-mqtt");

let mqttclient = ""

async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}

class SomaShadeDriver extends Homey.Driver {

    /**
     * init the driver
     */
    onInit() {
        this._synchroniseSensorData();
    }
    

    async firstupdate() {
        try{
            if(this.getDevices().length == 1){
                this._setNewTimeout(10000);
            }
        } catch (error) {
            console.log(error);
        }
    }

    async mqttennabled(){
        try{
            if(!mqttclient){
                let mqtthost = Homey.ManagerSettings.get('mqtthost');
                let mqttport = Homey.ManagerSettings.get('mqttport');
                let mqttreceive = Homey.ManagerSettings.get('mqttreceive');
                let client = 'tcp://' + mqtthost + ':' + mqttport;
                let subsTopic = 'SomaShade/+/'+mqttreceive
                mqttclient = MQTT.connect(client);
                mqttclient.subscribe("SomaShades/#");
                let devices = this.getDevices();
                mqttclient.on('message', function(topic,message, packet) {
                    Homey.app.onmqttreceived(topic,message, devices);
                })
            }        

        } catch (error) {
            console.log(error);
        }
    }   

    async mqttpublish(topic,message){
        try{
            await mqttclient.publish(topic, message);
        } catch (error) {
            console.log(error);
        }
    }

    async fastupdate() {
        try{
            this._setNewTimeout(20000);
        } catch (error) {
            console.log(error);
        }
    }



    /**
     * @private
     *
     * start the synchronisation
     */
    async _synchroniseSensorData() {
        try{
            let devices = this.getDevices(); 
            let updateDevicesTime = new Date();
            if(devices.length > 0){
                await Homey.app.updateDevices(devices)
                    .then(() => {
                        let updateInterval = Homey.ManagerSettings.get('updateInterval');
                        if (!updateInterval) {
                            updateInterval = 15;
                            Homey.ManagerSettings.set('updateInterval', updateInterval)
                        }
                        let interval = 1000 * 60 * updateInterval;
                        this._setNewTimeout(interval);
                    })
                    .catch(error => {
                        throw new Error(error);
                    });
            }
        } catch (error) {
            this._setNewTimeout();
            console.log(error);
        }
    }
    
    /**
     * set a new timeout for synchronisation
     */
    _setNewTimeout(data) {
        let interval = data
        this._syncTimeout = setTimeout(this._synchroniseSensorData.bind(this), interval);
    }

    /**
     * render a list of devices for pairing to homey
     */
    onPairListDevices(data, callback) {
        Homey.app.discoverDevices(this)
            .then(devices => {
                callback(null, devices);
            })
            .catch(error => {
                callback(new Error('Cannot get devices:' + error));
            });
            
    }
}

module.exports = SomaShadeDriver;