/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import global from '/scripts/core/global.js';
import AssetTypes from '/scripts/core/enums/AssetTypes.js';
import FileTypes from '/scripts/core/enums/FileTypes.js';
import ImageFileTypes from '/scripts/core/enums/ImageFileTypes.js';
import ModelFileTypes from '/scripts/core/enums/ModelFileTypes.js';
import LibraryHandler from '/scripts/core/handlers/LibraryHandler.js';
import SessionHandler from '/scripts/core/handlers/SessionHandler.js';
import { uuidv4 } from '/scripts/core/helpers/utils.module.js';

class UploadHandler {
    constructor() {
        this._input = document.createElement('input');
        this._input.type = "file";
        this._locks = new Set();
        this._assetIds = [];
        this._fileListenerActive = false;
        this._triggerUpload = false;
        this._addEventListeners();
    }

    _addEventListeners() {
        this._input.addEventListener("change", () => { this._upload(); });
        if(global.deviceType != "XR") {
            this._input.addEventListener("click",
                (e) => { e.stopPropagation(); });
            this._eventType = global.deviceType == "MOBILE"
                ? 'touchend'
                : 'click';
            this._clickListener = (e) => {
                setTimeout(() => {
                    if(this._triggerUpload) {
                        this._triggerUpload = false;
                        this._input.click();
                    }
                }, 20);
            };
            //Why this convoluted chain of event listener checking a variable
            //set by interactable action (which uses polling)? Because we can't
            //trigger the file input with a click event outside of an event
            //listener on Firefox and Safari :(
        }
    }

    _uploadProjectFile() {
        if(this._input.files.length > 0 && this._callback)
            this._callback(this._input.files[0]);
    }

    _uploadAssets() {
        this.uploadFiles(this._input.files, this._callback);
    }

    uploadFiles(files, callback) {
        //Adding functionLock for potential race condition where LibraryHandler
        //callback gets called before next iteration of loop for multiple files
        let functionLock = uuidv4();
        this._locks.add(functionLock);
        for(let file of files) {
            let extension = file.name.split('.').pop().toLowerCase();
            if(extension in FileTypes) {
                let lock = uuidv4();
                if(extension in ImageFileTypes) {
                    this._locks.add(lock);
                    LibraryHandler.addNewAsset(file, file.name,
                        AssetTypes.IMAGE, (assetId) => {
                            this._libraryCallback(assetId, lock, callback);
                        });
                } else if(extension in ModelFileTypes) {
                    this._locks.add(lock);
                    LibraryHandler.addNewAsset(file, file.name,AssetTypes.MODEL,
                        (assetId) => {
                            this._libraryCallback(assetId, lock, callback);
                        });
                } else {
                    console.log("TODO: Support other file types");
                }
            } else {
                console.log("TODO: Tell user invalid filetype, and list valid ones");
            }
        }
        this._input.value = '';
        this._locks.delete(functionLock);
        if(this._locks.size == 0) {
            if(callback) callback(this._assetIds);
            this._assetIds = [];
        }
    }

    _libraryCallback(assetId, lock, callback) {
        this._assetIds.push(assetId);
        this._locks.delete(lock);
        if(this._locks.size == 0) {
            if(callback) callback(this._assetIds);
            this._assetIds = [];
        }
    }

    listenForAssets(callback, supportMultipleFiles, type) {
        if(this._fileListenerActive)
            throw new Error("File listener already in use");
        this._callback = callback;
        this._fileListenerActive = true;
        this._input.multiple = supportMultipleFiles;
        this._upload = this._uploadAssets;
        if(type == AssetTypes.IMAGE) {
            this._input.accept = "image/*";
        } else if(type == AssetTypes.MODEL) {
            this._input.accept = ".glb";
        } else {
            this._input.accept = '';
        }
        document.addEventListener(this._eventType, this._clickListener);
    }

    listenForProjectFile(callback) {
        if(this._fileListenerActive)
            throw new Error("File listener already in use");
        this._callback = callback;
        this._fileListenerActive = true;
        this._input.multiple = false;
        this._input.accept = '.zip';
        this._upload = this._uploadProjectFile;
        document.addEventListener(this._eventType, this._clickListener);
    }

    triggerUpload() {
        if(global.deviceType == 'XR') {
            SessionHandler.exitXRSession();
            this._input.click();
        } else {
            this._triggerUpload = true;
        }
    }

    stopListening() {
        this._callback = null;
        this._fileListenerActive = false;
        document.removeEventListener(this._eventType, this._clickListener);
    }

}

let uploadHandler = new UploadHandler();
export default uploadHandler;
