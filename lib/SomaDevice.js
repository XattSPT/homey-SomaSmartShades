'use strict';

const DATAINFORMATION_SERVICE_UUID = '00001861b87f490c92cb11ba5ea5167c';
const MOTOR_CHARACTERISTIC_UUID = '00001530b87f490c92cb11ba5ea5167c';
const MOVEPERCENT_CHARACTERISTIC_UUID = '00001526b87f490c92cb11ba5ea5167c';
const POSITION_CHARACTERISTIC_UUID = '00001525b87f490c92cb11ba5ea5167c';
const Homey = require('homey');

class SomaShadeDevice extends Homey.Device {

    async onAdded(){
        try{
            await this.getDriver().firstupdate();    
        } catch (error) {
            console.log(error);
        }
    }

    
    /**
     * update Capability values
     */
    async updateCapabilityValue(capability, value) {
        try {
            let currentValue = this.getCapabilityValue(capability);
            if (currentValue !== value) {
                await this.setCapabilityValue(capability, value);
                let emitmqtt = Homey.ManagerSettings.get('mqttenabled');
                if (emitmqtt == "true"){
                    this.getDriver().mqttennabled()
                    this.MqttCapabilityValue(capability, value);
                } 
            }
        } catch (error){
            console.log(error);
        }
    };

    async MqttCapabilityValue(capability, value){
        
        try {
            let mqttcapability
            if (capability == 'measure_battery'){
                mqttcapability = 'battery'
            } else if (capability == 'windowcoverings_set'){
                mqttcapability = 'position';
                if (value !== 0 && value !==100) {
                    value =(((value+0.01) *100)).toFixed(0);
                } else{
                    value =(((value) *100)).toFixed(0);
                }
                value =(Math.min(100,Math.max(0,value)))
                console.log("value mqtt: ",value)
            } else if (capability == 'windowcoverings_state'){
                mqttcapability = 'state'
            } else if (capability == 'onoff'){
                mqttcapability = 'nomqtt'
            } else{
                console.log("mqtt not defined capability: ",capability)
                mqttcapability = "nomqtt"
            }
            if (mqttcapability !== "nomqtt"){
                let shade = this.getData().name
                let topic = "SomaShades/"+ shade + "/" + mqttcapability
                let message = (value).toString();
                this.getDriver().mqttpublish(topic,message);
            }
        } catch (error){
            console.log(error);
        }

    }



    /**
     * wrapper for make the app backwards compatible
     */
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

    /**
     * on init the device
     */
    onInit() {
        if (!this.hasCapability('measure_battery')) {
            this.setUnavailable("No battery capability, please repair device.");
        }
        const capabilities = this.getCapabilities();
        this.registerCapabilityListener('windowcoverings_state', this.onCapabilityState.bind(this));
        this.registerCapabilityListener('windowcoverings_set', this.onCapabilitySet.bind(this));
        this.registerCapabilityListener('onoff', this.onCapabilityOnOff.bind(this));
    }

    async onCapabilityState (value, opts){
        try{
            let dades = this.getData()
            this.updatestate(value, opts, dades);
        } catch (err) {
            throw new Error(err);
        }
    }

    async onCapabilitySet (value, opts){
        console.log("value Set: ",value)
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

    /**
     * update state to Soma
     */
    async updatestate (value, opts, dades) {
        let newstate = value;
        let update = ""
        let disconnectPeripheral = async () => {
        };

        try {
            const advertisement = await Homey.app.find(this)
            const peripheral = await advertisement.connect()
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
            const dataService = await services.find(service => service.uuid === DATAINFORMATION_SERVICE_UUID);
            if (!dataService) {
                throw new Error('Missing data service');
            }
            const characteristics = await dataService.discoverCharacteristics();

            // get actual position
            const position = await characteristics.find(characteristic => characteristic.uuid === POSITION_CHARACTERISTIC_UUID);
            if(!position) {
                throw new Error('Missing position characteristic');
            }
            let realposition = await position.read();
            let closeposition = position.value[0];
            
            // set State
            const state = await characteristics.find(characteristic => characteristic.uuid === MOTOR_CHARACTERISTIC_UUID);
            if(!state) {
                throw new Error('Missing Motor characteristic');
            }
            if(newstate == "down"){
                let updatestate = await state.write(Buffer.from([0x96]));
            } else if (newstate == "up"){
                let updatestate = await state.write(Buffer.from([0x69]));
            } else{
                let updatestate = await state.write(Buffer.from([0]))
                if (newstate !== "idle_position"){
                    await setTimeout(() => this.updateposition('updateposition'), 15000);
                    update = 1
                }
            }
            await disconnectPeripheral()
            const settings = this.getSettings();
            console.log("Time:" + settings)
            if (update = "") this._syncTimeout = setTimeout(() => Homey.app.updateDevice(this), settings.Refreshtime*1000)
            return
        }
        catch (error) {
            //await disconnectPeripheral()

            throw error
        }
    }

    /**
     * update position to Soma
     * 
     */
    async updateposition (value, opts, dades) {
        console.log("updateposition")
        const settings = this.getSettings();
        console.log("Time:" + settings.Refreshtime*1000)
        let disconnectPeripheral = async () => {
        };

        try {
            let estat = this.getCapabilityValue('windowcoverings_state')
            if (estat !== "idle"){
                    await this.updatestate("idle_position")
            }
            const advertisement = await Homey.app.find(this)
            const peripheral = await advertisement.connect()
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
            const dataService = await services.find(service => service.uuid === DATAINFORMATION_SERVICE_UUID);
            if (!dataService) {
                throw new Error('Missing data service');
            }

            const characteristics = await dataService.discoverCharacteristics();

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
            this._syncTimeout = setTimeout(() => Homey.app.updateDevice(this), settings.Refreshtime*1000)
            return 
        }
        catch (error) {
            // await disconnectPeripheral()
            throw error
        }
    }
}

module.exports = SomaShadeDevice;
