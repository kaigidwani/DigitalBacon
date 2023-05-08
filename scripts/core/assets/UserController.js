/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import global from '/scripts/core/global.js';
import Avatar from '/scripts/core/assets/Avatar.js';
import BasicMovement from '/scripts/core/assets/BasicMovement.js';
import UserHand from '/scripts/core/assets/UserHand.js';
import Hands from '/scripts/core/enums/Hands.js';
import PubSubTopics from '/scripts/core/enums/PubSubTopics.js';
import UserMessageCodes from '/scripts/core/enums/UserMessageCodes.js';
import PubSub from '/scripts/core/handlers/PubSub.js';
import SessionHandler from '/scripts/core/handlers/SessionHandler.js';
import SettingsHandler from '/scripts/core/handlers/SettingsHandler.js';
import { vector3s, euler, quaternion } from '/scripts/core/helpers/constants.js';
import { uuidv4 } from '/scripts/core/helpers/utils.module.js';

const AVATAR_KEY = "DigitalBacon:Avatar";
const FADE_START = 0.6;
const FADE_END = 0.2;
//const FADE_MIDDLE = (FADE_START + FADE_END) / 2;
const FADE_RANGE = FADE_START - FADE_END;
const EPSILON = 0.00000000001;
  
class UserController {
    init(params) {
        if(params == null) {
            params = {};
        }
        this._id = uuidv4();
        this._dynamicAssets = [];
        this._userObj = params['User Object'];
        this._flightEnabled = params['Flight Enabled'] || false;
        this._avatarUrl = localStorage.getItem(AVATAR_KEY)
            || 'https://d1a370nemizbjq.cloudfront.net/6a141c79-d6e5-4b0d-aa0d-524a8b9b54a4.glb';
        this._avatarFadeUpdateNumber = 0;

        this._setup();
        this._addSubscriptions();
    }

    _setup() {
        if(global.deviceType != "XR") {
            this._avatar = new Avatar({
                'Focus Camera': true,
                'URL': this._avatarUrl,
            });
        } else {
            this.hands = {};
            for(let hand of [Hands.RIGHT, Hands.LEFT]) {
                let userHand = new UserHand(hand);
                this.hands[hand] = userHand;
            }
        }
        this._basicMovement = new BasicMovement({
            'User Object': this._userObj,
            'Avatar': this._avatar,
        });
        this._dynamicAssets.push(this._basicMovement);
    }

    _addSubscriptions() {
        PubSub.subscribe(this._id, PubSubTopics.USER_SCALE_UPDATED, (scale) => {
            this._userObj.scale.set(scale, scale, scale);
        });
    }

    getId() {
        return this._id;
    }

    getAvatar() {
        return this._avatar;
    }
    getAvatarUrl() {
        return this._avatarUrl;
    }

    updateAvatar(url) {
        localStorage.setItem(AVATAR_KEY, url);
        this._avatarUrl = url;
        if(global.deviceType != "XR") this._avatar.updateSourceUrl(url);
        PubSub.publish(this._id, PubSubTopics.AVATAR_UPDATED, this._avatarUrl);
    }

    getDistanceBetweenHands() {
        if(global.deviceType != 'XR') return;
        let leftPosition = this.hands[Hands.LEFT].getWorldPosition();
        let rightPosition = this.hands[Hands.RIGHT].getWorldPosition();
        return leftPosition.distanceTo(rightPosition);
    }

    _pushXRDataForRTC(data) {
        let codes = 0;
        let userScale = SettingsHandler.getUserScale();
        global.camera.getWorldPosition(vector3s[0]);
        this._userObj.getWorldPosition(vector3s[1]);
        let position = vector3s[0].sub(vector3s[1]).divideScalar(userScale)
            .toArray();

        global.camera.getWorldQuaternion(quaternion);
        quaternion.normalize();
        euler.setFromQuaternion(quaternion);
        let rotation = euler.toArray();
        rotation.pop();

        data.push(...position);
        data.push(...rotation);
        codes += UserMessageCodes.AVATAR;

        for(let hand of [Hands.LEFT, Hands.RIGHT]) {
            let userHand = this.hands[hand];
            if(userHand.isInScene()) {
                position = userHand.getWorldPosition().sub(vector3s[1])
                    .divideScalar(userScale);
                rotation = userHand.getWorldRotation().toArray();
                rotation.pop();
                data.push(...position.toArray());
                data.push(...rotation);
                codes += UserMessageCodes[hand + '_HAND'];
            }
        }
        return codes;
    }

    getDataForRTC() {
        let codes = 0;
        let data = [];
        if(global.deviceType == "XR") {
            codes += this._pushXRDataForRTC(data);
        }
        let worldVelocity = this._basicMovement.getWorldVelocity();
        if(worldVelocity.length() >= 0.00001) {
            data.push(...this._basicMovement.getWorldVelocity().toArray());
            codes += UserMessageCodes.USER_VELOCITY;
        }
        if(global.renderer.info.render.frame % 300 == 0) {
            this._userObj.getWorldPosition(vector3s[0]);
            data.push(...vector3s[0].toArray());
            codes += UserMessageCodes.USER_POSITION;
        }
        let codesArray = new Uint8Array([codes]);
        return [codesArray.buffer, Float32Array.from(data).buffer];
    }

    attach(object) {
        this._userObj.attach(object);
    }

    remove(object) {
        if(object.parent == this._userObj) {
            this._userObj.parent.attach(object);
        }
    }

    hasChild(object) {
        return object.parent == this._userObj;
    }

    addToScene(scene) {
        if(global.deviceType != "XR") {
            this._avatar.addToScene(global.cameraFocus);
        } else {
            this.hands[Hands.RIGHT].addToScene(scene);
            this.hands[Hands.LEFT].addToScene(scene);
        }
    }

    removeFromScene() {
        if(global.deviceType != "XR") {
            this._avatar.removeFromScene();
        } else {
            this.hands[Hands.RIGHT].removeFromScene();
            this.hands[Hands.LEFT].removeFromScene();
        }
    }

    _updateAvatar() {
        let updateNumber = SessionHandler.getControlsUpdateNumber();
        if(this._avatarFadeUpdateNumber == updateNumber) return;
        this._avatarFadeUpdateNumber = updateNumber;
        let cameraDistance = SessionHandler.getCameraDistance();
        if(cameraDistance > FADE_START * 2) return;
        let diff = cameraDistance - this._avatarFadeCameraDistance
        if(Math.abs(diff) < EPSILON) return;
        //Fade Logic Start
        this._avatarFadeCameraDistance = cameraDistance;
        let fadePercent = Math.max(cameraDistance, FADE_END);
        fadePercent = (fadePercent - FADE_END) / FADE_RANGE;
        if(fadePercent == 0) {
            if(this._avatar.isDisplayingAvatar())
                this._avatar.hideAvatar();
            return;
        } else if(!this._avatar.isDisplayingAvatar()) {
            this._avatar.displayAvatar();
        }
        (fadePercent < 1)
            ? this._avatar.fade(fadePercent)
            : this._avatar.endFade();
        //Fade Logic end

        //Disappear Logic start
        //let object = this._avatar.getObject();
        //if(cameraDistance < FADE_MIDDLE) {
        //    if(object.parent) this._avatar.removeFromScene();
        //} else if(!object.parent) {
        //    this._avatar.addToScene(global.cameraFocus);
        //}
        //Disappear Logic end
    }

    update(timeDelta) {
        if(this._avatar) {
            this._updateAvatar();
        }
        for(let i = 0; i < this._dynamicAssets.length; i++) {
            this._dynamicAssets[i].update(timeDelta);
        }
    }
}

let userController = new UserController();
export default userController;
