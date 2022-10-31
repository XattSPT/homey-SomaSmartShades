"use strict";

const Homey = require('homey');

const DATAINFORMATION_SERVICE_UUID = '00001861b87f490c92cb11ba5ea5167c';
const MOTOR_CHARACTERISTIC_UUID = '00001530b87f490c92cb11ba5ea5167c';
const MOVEPERCENT_CHARACTERISTIC_UUID = '00001526b87f490c92cb11ba5ea5167c';
const POSITION_CHARACTERISTIC_UUID = '00001525b87f490c92cb11ba5ea5167c';
const MOVING_CHARACTERISTIC_UUID = '0000ba71b87f490c92cb11ba5ea5167c';
const BATTERY_SERVICE_UUID = '180f'
const BATTERY_CHARACTERISTIC_UUID = '2a19'

const MAX_RETRIES = 3;

async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}

class SomaShadeDriver extends Homey.Driver {

    onInit() {
        this._synchroniseSensorData();
    }

async find(device) {
    try{
        return await this.homey.ble.find(device.getAddress()).then(function (advertisement) {
            return advertisement;
        });
    } catch (err) {
        throw new Error(err);
    }
}

async handleUpdateSequence(device) {
    let disconnectPeripheral = async () => {
    };

    try {
        let updateDeviceTime = new Date();
        const advertisement = await this.find(device);
        const peripheral = await advertisement.connect();
        const services = await peripheral.discoverServices();
        const dataService = await services.find(service => service.uuid === DATAINFORMATION_SERVICE_UUID);
        let disconnectPeripheral = async () => {
            try {
                if (peripheral.isConnected) {
                    return await peripheral.disconnect()
                } else {
                    console.log('disconnectPeripheral not registered yet')
                }
            } catch (err) {
                throw new Error(err);
            }
        };             
        if (!dataService) {
            throw new Error('Missing data service');
        }
        const characteristics = await dataService.discoverCharacteristics();

        // get position
        const position = await characteristics.find(characteristic => characteristic.uuid === POSITION_CHARACTERISTIC_UUID);
        if(!position) {
            throw new Error('Missing position characteristic');
        }
        /*
        await position.subscribeToNotifications(data => {
            console.log('Received notification Position: ', device.getName(), ' ', data);
            let datapro = JSON.parse(JSON.stringify(data))
            let pos = (100- datapro.data[0]) 
            console.log("Device "+ device.getName()+ " confirm position: " + pos)
          });*/
        
        let realposition = await position.read();
        const closeposition = position.value[0];
        let trueposition = (100 - closeposition) / 100

        // get movepercent
        const movepercent = await characteristics.find(characteristic => characteristic.uuid === MOVEPERCENT_CHARACTERISTIC_UUID);
        if(!movepercent) {
            throw new Error('Missing movepercent characteristic');
        }
        let realmovepercent = await movepercent.read();
        const move = (movepercent.value[0]);

        // get movepercent
        const moving = await characteristics.find(characteristic => characteristic.uuid === MOVING_CHARACTERISTIC_UUID);
        if(!moving) {
            throw new Error('Missing moving characteristic');
        }
        let realmoving = await moving.read();
        const moving2 = (moving.value[0]);

        // get battery
        const dataService2 = await services.find(service => service.uuid === BATTERY_SERVICE_UUID);
        if (!dataService2) {
            throw new Error('Missing battery service');
        }
        const characteristics2 = await dataService2.discoverCharacteristics();
        //console.log(characteristics2)
        const battery = await characteristics2.find(characteristic => characteristic.uuid === BATTERY_CHARACTERISTIC_UUID);
        if(!battery) {
            throw new Error('Missing battery characteristic');
        }
        let batt = await battery.read()
        const batteryValue = Number(Math.min(100, parseInt(battery.value.toString('hex'),16) / 75 * 100).toFixed(0));
        const batteryValues = {
            'measure_battery': batteryValue
        };
        await device.setSettings({
            last_updated: new Date().toISOString(),
            uuid: device.getData().uuid
        });

        let onoffposition
        const settings = device.getSettings();
        if (trueposition > settings.Offpos){
            onoffposition = true
        }else{
            onoffposition = false
        }
        let sensorValues = {
        
            'windowcoverings_set': trueposition,
            'measure_battery': batteryValue,
            'onoff': onoffposition,
        }
        console.log("Device: " + device.getName())
        console.log("Position:" + trueposition + " Battery:"+ batteryValue + " onoff:"+ onoffposition)

        await asyncForEach(device.getCapabilities(), async (characteristic) => {
            try {
            if (sensorValues.hasOwnProperty(characteristic)) {
                device.updateCapabilityValue(characteristic, sensorValues[characteristic]);
            } 
        } catch (err) {
                throw new Error(err);
        }
        });
    await disconnectPeripheral();
    return device;
    }
    catch (error) {
        await disconnectPeripheral();
        throw error;
    }
}

async updateDevices(devices) {
    try{
        await devices.forEach(device => {
            this.updateDevice(device);
        });
    } catch (err) {
        throw new Error(err);
    }
}

async updateDevice(device) {
    try{

    if (device.retry === undefined) {
       device.retry = 0;
    }
    console.log("Trying to Update Device: " + device.getName())
    return await this.handleUpdateSequence(device)
    .then(() => {
        device.retry = 0;
        return device;
    })
    .catch(error => {
        device.retry++;
        console.log('timeout, retry again ' + device.retry + ' device: ' + device.getName());
        console.log(error);

        if (device.retry < MAX_RETRIES) {
            return this.updateDevice(device)
            .catch((error) => {
                throw new Error(error);
            });
        }

        device.retry = 0;
        console.log('Max retries exceeded, no success - Device: '+device.getName());
    });
    } catch (err) {
    //throw new Error(err);
    console.log('timeout, on device: ' + device.getName() + 'no more tries');
    }
}

async discoverDevices(driver) {
    try{
            let devices = [];
            let index = 0;
            console.log("HOLA1: ")
            const { version } = this.homey.manifest
            let currentUuids = [];
            this.getDevices().forEach(device => {
                let data = device.getData();
                currentUuids.push(data.uuid);
            });
            console.log("HOLA uuids: " + currentUuids)
            let busca = await this.homey.ble.discover().then(function (advertisements) {
                advertisements = advertisements.filter(function (advertisement) {
                    return (currentUuids.indexOf(advertisement.uuid) === -1);
                });
                console.log(advertisements)
                advertisements.forEach(function (advertisement) {
                    console.log("HOLA: adv " + advertisement.localName )
                    if(advertisement.localName != undefined){
                    if (advertisement.localName == 'S') {
                        ++index;
                        devices.push({
                            "name": driver.getSomaShadeBleName() + " " + advertisement.uuid,
                            "data": {
                                "id": advertisement.id,
                                "uuid": advertisement.uuid, 
                               "address": advertisement.uuid,
                                "name": advertisement.uuid,
                                "type": advertisement.addressType,
                                "version": 'v' +{version},
                            },
                            "capabilities": driver.getSupportedCapabilities(),
                        });        
                    } else if (advertisement.localName.startsWith('RISE')) {
                        ++index;
                        devices.push({
                            "name": driver.getSomaShadeBleName() + " " + advertisement.localName,
                            "data": {
                                "id": advertisement.id,
                                "uuid": advertisement.uuid,
                                "address": advertisement.uuid,
                                "name": advertisement.localName,
                                "type": advertisement.addressType,
                                "version": "v" + {version},
                            },
                            "capabilities": driver.getSupportedCapabilities(),
                        });
                        
                    }
                    }});
            })
          return devices; 
        } catch (err) {
            throw new Error(err);
         }   
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

    
    async fastupdate() {
        try{
            this._setNewTimeout(20000);
        } catch (error) {
            console.log(error);
        }
    }

    async _synchroniseSensorData() {
        try{
            let devices = this.getDevices(); 
            let updateDevicesTime = new Date();
            if(devices.length > 0){
                await this.updateDevices(devices)
                    .then(() => {
                        let updateInterval = this.homey.settings.get('updateInterval');
                        if (!updateInterval) {
                            updateInterval = 15;
                            this.homey.settings.set('updateInterval', updateInterval)
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

    async onPair(session) {
        session.setHandler('list_devices', async () => {
            console.log("onpair")
            return this.discoverDevices(this);
        });
    }           
}
module.exports = SomaShadeDriver;