'use strict';

const Homey = require('homey');



class HomeySomaShade extends Homey.App {

    /**
     * init the app
     */
    onInit() {
        console.log('Successfully init Soma version: %s', this.homey.app.manifest.version);
    };

   
}

module.exports = HomeySomaShade;
