'use strict';

const DATAINFORMATION_SERVICE_UUID = '00001861b87f490c92cb11ba5ea5167c';
const MOTOR_CHARACTERISTIC_UUID = '00001530b87f490c92cb11ba5ea5167c';
const MOVEPERCENT_CHARACTERISTIC_UUID = '00001526b87f490c92cb11ba5ea5167c';
const POSITION_CHARACTERISTIC_UUID = '00001525b87f490c92cb11ba5ea5167c';
const Homey = require('homey');

class SomaShadeDevice extends Homey.Device {

    async onAdded(){
        try{
            this.driver._synchroniseSensorData();   
        } catch (error) {
            console.log(error);
        }
    }

    async updateCapabilityValue(capability, value) {
        try {
            let currentValue = this.getCapabilityValue(capability);
            if (currentValue !== value) {
                await this.setCapabilityValue(capability, value);
            }
        } catch (error){
            console.log(error);
        }
    };

    getAddress() {
        let data = this.getData();
        if (data.uuid) {
            return data.uuid;
        }
        if (data.address) {
            return data.address;
        }
    }

    getLocalName() {
        let data = this.getData();
        if (data.LocalName) {
            return data.LocalName;
        } else{
            return "unnamed"
        }

    }

    async onInit() {
        try {
        if (!this.hasCapability('measure_battery')) {
            this.setUnavailable("No battery capability, please repair device.");
        }
        const capabilities = this.getCapabilities();
        if (this.hasCapability('windowcoverings_state')) {
            console.log("PLEASE DELETE AND ADD DEVICE " + this.getName())
            await this.setWarning('Remove and re-add your device to update to SDK3!');
        }
        this.registerCapabilityListener('windowcoverings_set', this.onCapabilitySet.bind(this));
        this.registerCapabilityListener('onoff', this.onCapabilityOnOff.bind(this));
        } catch (err) {
            throw new Error(err);
        }
    }

    async onCapabilitySet (value, opts){
        //console.log(this.getName() + " Setting Position at: " + value)
        const settings = this.getSettings();
        try{
            if (value > settings.Offpos){
                this.updateCapabilityValue("onoff", true)
            }else{
                this.updateCapabilityValue("onoff", false)
            }
            let dades = this.getData();
            this.updateposition(value, opts, dades);
        } catch (err) {
            throw new Error(err);
        }
    }

    async onCapabilityOnOff (value, opts){
        try{
            const settings = this.getSettings();
            if (value === true){
                this.onCapabilitySet(settings.Onpos/100, opts);
            }else if (value === false){
                this.onCapabilitySet(settings.Offpos/100, opts);
            }
        }catch (err) {
            throw new Error(err);
        }
    } 

    async updateposition (value, opts, dades) {
        const settings = this.getSettings();
        console.log(this.getName() + " is changing position to: " + value + " refresh poll on " + settings.Refreshtime + "s")
        let disconnectPeripheral = async () => {
        };

        try {
            const advertisement = await this.driver.find(this)
            if (!advertisement) {
                throw new Error('Missing advertisement');
            }
            const peripheral = await advertisement.connect()
            if (!peripheral) {
                throw new Error('Missing peripheral');
            }
            disconnectPeripheral = async () => {
                try {
                    if (peripheral.isConnected) {
                        return await peripheral.disconnect()
                    }
                } catch (err) {
                    throw new Error(err)
                }
            }
            
            const services = await peripheral.discoverServices();
            if (!services) {
                throw new Error('Missing services');
            }
            const dataService = await services.find(service => service.uuid === DATAINFORMATION_SERVICE_UUID);
            if (!dataService) {
                throw new Error('Missing data service');
            }

            const characteristics = await dataService.discoverCharacteristics();
            if (!characteristics) {
                throw new Error('Missing characteristics');
            }
            // set position
            const moveposition = await characteristics.find(characteristic => characteristic.uuid === MOVEPERCENT_CHARACTERISTIC_UUID);
            if(!moveposition) {
                throw new Error('Missing position characteristic');
            }

            // set move position
            const position = await characteristics.find(characteristic => characteristic.uuid === POSITION_CHARACTERISTIC_UUID);
            if(!position) {
                throw new Error('Missing position characteristic');
            }

            let realposition = await position.read();
            let newposition = ((1- value)*100).toFixed(0);

            if (value == 'updateposition'){
                newposition = position.value[0];
            }
            let realposition2 = await moveposition.write(Buffer.from([newposition.toString()]));
            await disconnectPeripheral()
            this._syncTimeout = setTimeout(() => this.driver.updateDevice(this), settings.Refreshtime*1000)
            return 
        }
        catch (error) {
            await disconnectPeripheral()
            //throw new Error('Can not update ' + this.getName())
            console.log('Can not update ' + this.getName())
        }
    }
}

module.exports = SomaShadeDevice;
