/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import PrimitiveMesh from '/scripts/core/assets/primitives/PrimitiveMesh.js';
import ShapesHandler from '/scripts/core/handlers/ShapesHandler.js';
import { numberOr } from '/scripts/core/helpers/utils.module.js';
import * as THREE from 'three';

export default class PrimitiveTorus extends PrimitiveMesh {
    constructor(params = {}) {
        params['assetId'] = PrimitiveTorus.assetId;
        super(params);
        this._radius = numberOr(params['radius'], 0.1);
        this._tube = numberOr(params['tube'], 0.05);
        this._radialSegments = params['radialSegments'] || 16;
        this._tubularSegments = params['tubularSegments'] || 32;
        this._arc = numberOr(params['arc'], 360);
        this._createMesh();
    }

    _createMesh() {
        let arc = this._arc * Math.PI / 180;
        let geometry = new THREE.TorusGeometry(this._radius, this._tube,
            this._radialSegments, this._tubularSegments, arc);
        this._mesh = new THREE.Mesh(geometry, this._getMaterial());
        this._object.add(this._mesh);
    }

    _getDefaultName() {
        return PrimitiveTorus.assetName;
    }

    _updateGeometry() {
        let arc = this._arc * Math.PI / 180;
        let oldGeometry = this._mesh.geometry;
        let geometry = new THREE.TorusGeometry(this._radius, this._tube,
            this._radialSegments, this._tubularSegments, arc);
        this._mesh.geometry = geometry;
        oldGeometry.dispose();
    }

    exportParams() {
        let params = super.exportParams();
        params['radius'] = this._radius;
        params['tube'] = this._tube;
        params['radialSegments'] = this._radialSegments;
        params['tubularSegments'] = this._tubularSegments;
        params['arc'] = this._arc;
        return params;
    }

    getRadius() {
        return this._radius;
    }

    getTube() {
        return this._tube;
    }

    getRadialSegments() {
        return this._radialSegments;
    }

    getTubularSegments() {
        return this._tubularSegments;
    }

    getArc() {
        return this._arc;
    }

    setRadius(radius) {
        if(this._radius == radius) return;
        this._radius = radius;
        this._updateGeometry();
    }

    setTube(tube) {
        if(this._tube == tube) return;
        this._tube = tube;
        this._updateGeometry();
    }

    setRadialSegments(radialSegments) {
        if(this._radialSegments == radialSegments) return;
        this._radialSegments = radialSegments;
        this._updateGeometry();
    }

    setTubularSegments(tubularSegments) {
        if(this._tubularSegments == tubularSegments) return;
        this._tubularSegments = tubularSegments;
        this._updateGeometry();
    }

    setArc(arc) {
        if(this._arc == arc) return;
        this._arc = arc;
        this._updateGeometry();
    }


    static assetId = '6b8bcbf1-49b0-42ce-9d60-9a7db6e425bf';
    static assetName = 'Torus';
}

ShapesHandler.registerAsset(PrimitiveTorus);
