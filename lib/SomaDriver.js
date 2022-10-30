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
    
// APP
 /**
     * find advertisements
     */
  async find(device) {
    try{
        return await this.homey.ble.find(device.getAddress()).then(function (advertisement) {
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
        //console.log(characteristics)
        // get position
        const position = await characteristics.find(characteristic => characteristic.uuid === POSITION_CHARACTERISTIC_UUID);
        if(!position) {
            throw new Error('Missing position characteristic');
        }
        /*const data = await position.subscribeToNotifications(data => {
            console.log('Received notification Position: ', device.getName(), ' ', data);
            const datapro = JSON.parse(data.toString()) 
            console.log(datapro.type)
            console.log("value"+ device.getName()+ " " + datapro.data)
          });
        */
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


        const OTHER_SERVICE_UUID = '00001890b87f490c92cb11ba5ea5167c';
        const dataService3 = await services.find(service => service.uuid === OTHER_SERVICE_UUID);
        const characteristics3 = await dataService3.discoverCharacteristics();
        //console.log(characteristics3)
        const UNKNOWN_SERVICE_UUID = '00001554b87f490c92cb11ba5ea5167c';
        const dataService4 = await services.find(service => service.uuid === UNKNOWN_SERVICE_UUID);
        const characteristics4 = await dataService4.discoverCharacteristics();
        //console.log(characteristics4)
        if (device.getName() == "Cortina") {
            console.log("-------" + device.getName())
            const dubte10 = await characteristics.find(characteristic => characteristic.uuid === "00001525b87f490c92cb11ba5ea5167c");
            await dubte10.read()
            console.log("1525:" + dubte10.value[0])
            console.log("1525:" + dubte10.value[1])
            console.log("1525:" + dubte10.value[3])
            console.log("1525:" + dubte10.value[4])
            console.log("1525:" + dubte10.value[7])
            console.log("1525:" + dubte10.value[8])
            console.log("BUSCANT MOTOR")
            //const dubte17v = await characteristics.find(characteristic => characteristic.uuid === "00001534b87f490c92cb11ba5ea5167c");
            //const dubte17v = await characteristics.find(characteristic => characteristic.uuid === "00001892b87f490c92cb11ba5ea5167c");
            //await dubte17v.read()
            //console.log("1534:" + dubte17v)
            //console.log("*****FI********")
            /*
            //console.log("-------" + device.getName())
            const dubte10 = await characteristics.find(characteristic => characteristic.uuid === "00001525b87f490c92cb11ba5ea5167c");
            await dubte10.read()
            //console.log("1525:" + dubte10.value[0])
            const dubte11 = await characteristics.find(characteristic => characteristic.uuid === "00001526b87f490c92cb11ba5ea5167c");
            await dubte11.read()
            console.log("1526:" + dubte11.value[0])
            const dubte12 = await characteristics.find(characteristic => characteristic.uuid === "00001527b87f490c92cb11ba5ea5167c");
            await dubte12.read()
            //console.log("1527:" + dubte12.value[0])
            const dubte13 = await characteristics.find(characteristic => characteristic.uuid === "00001528b87f490c92cb11ba5ea5167c");
            await dubte13.read()
            //console.log("1528:" + dubte13.value[0])
            const dubte14 = await characteristics.find(characteristic => characteristic.uuid === "00001529b87f490c92cb11ba5ea5167c");
            await dubte14.read()
            //console.log("1529:" + dubte14.value[0])
            const dubte15 = await characteristics.find(characteristic => characteristic.uuid === "00001530b87f490c92cb11ba5ea5167c");
            await dubte15.read()
            console.log("1530:" + dubte15.value[0])
            const dubte16 = await characteristics.find(characteristic => characteristic.uuid === "00001531b87f490c92cb11ba5ea5167c");
            await dubte16.read()
            //console.log("1531:" + dubte16.value[0])
            const dubte17 = await characteristics.find(characteristic => characteristic.uuid === "00001533b87f490c92cb11ba5ea5167c");
            await dubte17.read()
            //console.log("1533:" + dubte17)
            const dubte17v = await characteristics.find(characteristic => characteristic.uuid === "00001534b87f490c92cb11ba5ea5167c");
            await dubte17v.read()
            console.log("1534:" + dubte17v)
            const dubte18 = await characteristics.find(characteristic => characteristic.uuid === "0000ba71b87f490c92cb11ba5ea5167c");
            await dubte18.read()
            //console.log("ba71:" + dubte18.value[0])
            const dubte19 = await characteristics.find(characteristic => characteristic.uuid === "0000ba72b87f490c92cb11ba5ea5167c");
            await dubte19.read()
            //console.log("ba72:" + dubte19.value[0])
            
            const dubte20 = await characteristics2.find(characteristic => characteristic.uuid === "2a19");
            await dubte20.read()
            //console.log("2a19:" + dubte20.value[0])

            const dubte21 = await characteristics4.find(characteristic => characteristic.uuid === "00001555b87f490c92cb11ba5ea5167c");
            await dubte21.read()
            //console.log(device.getName() + "1555:" + dubte21.value[0])

            this._syncTimeout = setTimeout(() => this.handleUpdateSequence(device), 15000);           
            const dubte1 = await characteristics3.find(characteristic => characteristic.uuid === "00001891b87f490c92cb11ba5ea5167c");
            await dubte1.read()
            //console.log("1891:" + dubte1.value[0])
            
            const dubte2 = await characteristics3.find(characteristic => characteristic.uuid === "00001892b87f490c92cb11ba5ea5167c");
            await dubte2.read()
            //console.log("1892:" + dubte2.value[0])

            const dubte3 = await characteristics3.find(characteristic => characteristic.uuid === "00001893b87f490c92cb11ba5ea5167c");
            await dubte3.read()
            //console.log("1893:" + dubte3.value[0])

            const dubte4 = await characteristics3.find(characteristic => characteristic.uuid === "00001894b87f490c92cb11ba5ea5167c");
            await dubte4.read()
            //console.log("1894:" + dubte4.value[0])

            
            const dubte5 = await characteristics3.find(characteristic => characteristic.uuid === "00001895b87f490c92cb11ba5ea5167c");
            await dubte5.read()
            //console.log("1895:" + dubte5.value[0])

            const dubte6 = await characteristics3.find(characteristic => characteristic.uuid === "00001896b87f490c92cb11ba5ea5167c");
            await dubte6.read()
            //console.log("1896:" + dubte6.value[0])

            //console.log("-------")
            //this.device.updatespeed() 
            */
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
    //await disconnectPeripheral();
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
            this.updateDevice(device);
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
    console.log("updatedevice" + device.getName())
    return await this.handleUpdateSequence(device)
    .then(() => {
        device.retry = 0;
        return device;
    })
    .catch(error => {
        device.retry++;
        console.log('timeout, retry again ' + device.retry + ' device: ' + device.getName());
        //console.log(error);

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
    throw new Error(err);
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

        this.Homey.ble.discover().then(function (advertisements) {
            
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
                            "version": "v" + this.Homey.manifest.version,
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
                            "version": "v" + this.Homey.manifest.version,
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


// DRIVER //

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

    /**
     * render a list of devices for pairing to homey
     */
    onPairListDevices(data, callback) {
        this.homey.discoverDevices(this)
            .then(devices => {
                callback(null, devices);
            })
            .catch(error => {
                callback(new Error('Cannot get devices:' + error));
            });
            
    }
}

module.exports = SomaShadeDriver;