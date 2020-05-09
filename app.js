'use strict';

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

class HomeySomaShade extends Homey.App {

    /**
     * init the app
     */
    onInit() {
        console.log('Successfully init Soma version: %s', Homey.app.manifest.version);
    };

    /**
     * find advertisements
     */
    async find(device) {
        try{
            return await Homey.ManagerBLE.find(device.getAddress()).then(function (advertisement) {
                return advertisement;
            });
        } catch (err) {
            throw new Error(err);
        }
    }

    /**
     * connect to the sensor, update data and disconnect
     */
    async handleUpdateSequence(device) {
        try {
            let updateDeviceTime = new Date();
            const advertisement = await Homey.app.find(device);
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

            // get motor
            const motor = await characteristics.find(characteristic => characteristic.uuid === MOTOR_CHARACTERISTIC_UUID);
            if(!motor) {
                throw new Error('Missing motor characteristic');
            }
            let realmotor = await motor.read();
            let truemotor = 'idle'
            if (motor.value[0] == 105){     
                truemotor = 'up';
            }else if (motor.value[0] == 150){
                truemotor = 'down';
            }else{
                truemotor = 'idle';
            }

            // get battery
            const dataService2 = await services.find(service => service.uuid === BATTERY_SERVICE_UUID);
            if (!dataService2) {
                throw new Error('Missing battery service');
            }
            const characteristics2 = await dataService2.discoverCharacteristics();
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

            let oldposition = 100- (device.getCapabilityValue('windowcoverings_set')*100);
            let oldmotor = device.getCapabilityValue('windowcoverings_state');
            if (Math.abs(closeposition - oldposition) < 2 && motor.value[0]==0) {
                device.setCapabilityValue('windowcoverings_state', 'idle')
                motor.value[0] = 0
            }
            if (motor.value[0] !== '105' && motor.value[0] !== '150' && Math.abs(closeposition - oldposition) > 3){
                trueposition = (100 - move) / 100
                this._syncTimeout = setTimeout(() => this.handleUpdateSequence(device), 15000);
            } else if (motor.value[0] == '150' || motor.value[0] == '105'){
                this._syncTimeout = setTimeout(() => this.handleUpdateSequence(device), 15000);
            }

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
                'windowcoverings_state': truemotor,
                'onoff': onoffposition,
            }
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
            //await disconnectPeripheral();
            throw error;
        }
    }

     /**
     * update the devices one by one
     */
    async updateDevices(devices) {
        try{
            await devices.forEach(device => {
                Homey.app.updateDevice(device);
            });
        } catch (err) {
            throw new Error(err);
        }
    }

    /**
     * update the one device
     */
    async updateDevice(device) {
        try{

        if (device.retry === undefined) {
           device.retry = 0;
        }
        console.log("updatedevice")
        return await Homey.app.handleUpdateSequence(device)
        .then(() => {
            device.retry = 0;
            return device;
        })
        .catch(error => {
            device.retry++;
            console.log('timeout, retry again ' + device.retry + ' device: ' + device.getName());
            //console.log(error);

            if (device.retry < MAX_RETRIES) {
                return Homey.app.updateDevice(device)
                .catch((error) => {
                    throw new Error(error);
                });
            }

            device.retry = 0;
            console.log('Max retries exceeded, no success - Device: '+device.getName());
        });
        } catch (err) {
        throw new Error(err);
        }
    }

    async onmqttreceived(topic, message, devices) {
        try{
            
            let data = topic.split("/")
            let desireddevice = ""
            devices.forEach(device => {
                let dataname = device.getData();
                if (dataname.name == data[1]){
                    desireddevice = device
                }
            });     

            let value = (Math.min(1,Math.max(0,message.toString())/100)).toFixed(2).toString()
            value = value.toString()
            if (data[2] == 'move'){
                await desireddevice.onCapabilitySet(value)
            }
        } catch (error) {
            console.log(error);
        }
    }
  
    /*
     * Discover Devices
     */
    discoverDevices(driver) {
        return new Promise((resolve, reject) => {
            let devices = [];
            let index = 0;

            let currentUuids = [];
            driver.getDevices().forEach(device => {
                let data = device.getData();
                currentUuids.push(data.uuid);
            });

            Homey.ManagerBLE.discover().then(function (advertisements) {
                
                advertisements = advertisements.filter(function (advertisement) {
                    return (currentUuids.indexOf(advertisement.uuid) === -1);
                });
                advertisements.forEach(function (advertisement) {
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
                                "version": "v" + Homey.manifest.version,
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
                                "version": "v" + Homey.manifest.version,
                            },
                            "capabilities": driver.getSupportedCapabilities(),
                        });
                        
                    }
                    }});
                
                resolve(devices);
            })
            .catch(function (error) {
                reject('Cannot discover BLE devices from the homey manager. ' + error);
            });
        })
    }
}

module.exports = HomeySomaShade;
