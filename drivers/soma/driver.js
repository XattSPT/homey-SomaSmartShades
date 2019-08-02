"use strict";

const SomaShadeDriver = require('../../lib/SomaDriver.js');

class SomaShadeSensorDriver extends SomaShadeDriver {
    getSomaShadeBleIdentification() {
        return 'SomaShade';
    }

    getSomaShadeBleName() {
        return 'SomaSmarthade';
    }

    getSupportedCapabilities() {
        return [
            "windowcoverings_set",
            "windowcoverings_state",
            "measure_battery",
            "onoff"
        ];
    }
}

module.exports = SomaShadeSensorDriver;