/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import PrimitiveLight from '/scripts/core/assets/primitives/PrimitiveLight.js';
import LightsHandler from '/scripts/core/handlers/LightsHandler.js';
import { numberOr } from '/scripts/core/helpers/utils.module.js';
import * as THREE from 'three';

export default class PrimitivePointLight extends PrimitiveLight {
    constructor(params = {}) {
        params['assetId'] = PrimitivePointLight.assetId;
        super(params);
        this._distance = numberOr(params['distance'], 0);
        this._decay = numberOr(params['decay'], 2);
        this._createLight();
    }

    _createLight() {
        this._light = new THREE.PointLight(this._color, this._intensity,
            this._distance, this._decay);
        this._object.add(this._light);
    }

    _getDefaultName() {
        return PrimitivePointLight.assetName;
    }

    _updateLight() {
        super._updateLight();
        this._light.distance = this._distance;
        this._light.decay = this._decay;
    }

    exportParams() {
        let params = super.exportParams();
        params['distance'] = this._distance;
        params['decay'] = this._decay;
        return params;
    }

    getDistance() {
        return this._distance;
    }

    getDecay() {
        return this._decay;
    }

    setDistance(distance) {
        if(this._distance == distance) return;
        this._distance = distance;
        this._light.distance = distance;
    }

    setDecay(decay) {
        if(this._decay == decay) return;
        this._decay = decay;
        this._light.decay = decay;
    }

    static assetId = '944a6b29-05d2-47d9-9b33-60e7a3e18b7d';
    static assetName = 'Basic Light';
}

LightsHandler.registerAsset(PrimitivePointLight);
