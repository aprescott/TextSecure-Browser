/* vim: ts=4:sw=4
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

function b64ToUint6 (nChr) {

  return nChr > 64 && nChr < 91 ?
      nChr - 65
    : nChr > 96 && nChr < 123 ?
      nChr - 71
    : nChr > 47 && nChr < 58 ?
      nChr + 4
    : nChr === 43 ?
      62
    : nChr === 47 ?
      63
    :
      0;

}

function base64DecToArr (sBase64, nBlocksSize) {
  var
    sB64Enc = sBase64.replace(/[^A-Za-z0-9\+\/]/g, ""), nInLen = sB64Enc.length,
    nOutLen = nBlocksSize ? Math.ceil((nInLen * 3 + 1 >> 2) / nBlocksSize) * nBlocksSize : nInLen * 3 + 1 >> 2;
var aBBytes = new ArrayBuffer(nOutLen);
var taBytes = new Uint8Array(aBBytes);

  for (var nMod3, nMod4, nUint24 = 0, nOutIdx = 0, nInIdx = 0; nInIdx < nInLen; nInIdx++) {
    nMod4 = nInIdx & 3;
    nUint24 |= b64ToUint6(sB64Enc.charCodeAt(nInIdx)) << 18 - 6 * nMod4;
    if (nMod4 === 3 || nInLen - nInIdx === 1) {
      for (nMod3 = 0; nMod3 < 3 && nOutIdx < nOutLen; nMod3++, nOutIdx++) {
        taBytes[nOutIdx] = nUint24 >>> (16 >>> nMod3 & 24) & 255;
      }
      nUint24 = 0;
    }
  }
  return aBBytes;
}

/* Base64 string to array encoding */

function uint6ToB64 (nUint6) {

  return nUint6 < 26 ?
      nUint6 + 65
    : nUint6 < 52 ?
      nUint6 + 71
    : nUint6 < 62 ?
      nUint6 - 4
    : nUint6 === 62 ?
      43
    : nUint6 === 63 ?
      47
    :
      65;

}

function base64EncArr (aBytes) {

  var nMod3, sB64Enc = "";

  for (var nLen = aBytes.length, nUint24 = 0, nIdx = 0; nIdx < nLen; nIdx++) {
    nMod3 = nIdx % 3;
    //if (nIdx > 0 && (nIdx * 4 / 3) % 76 === 0) { sB64Enc += "\r\n"; }
    nUint24 |= aBytes[nIdx] << (16 >>> nMod3 & 24);
    if (nMod3 === 2 || aBytes.length - nIdx === 1) {
      sB64Enc += String.fromCharCode(uint6ToB64(nUint24 >>> 18 & 63), uint6ToB64(nUint24 >>> 12 & 63), uint6ToB64(nUint24 >>> 6 & 63), uint6ToB64(nUint24 & 63));
      nUint24 = 0;
    }
  }

  return sB64Enc.replace(/A(?=A$|$)/g, "=");

}


window.textsecure = window.textsecure || {};

/*********************************
 *** Type conversion utilities ***
 *********************************/
// Strings/arrays
//TODO: Throw all this shit in favor of consistent types
//TODO: Namespace
var StaticByteBufferProto = new dcodeIO.ByteBuffer().__proto__;
var StaticArrayBufferProto = new ArrayBuffer().__proto__;
var StaticUint8ArrayProto = new Uint8Array().__proto__;
var StaticWordArrayProto = CryptoJS.lib.WordArray.create('').__proto__;
function getString(thing) {
	if (thing === Object(thing)) {
		if (thing.__proto__ == StaticUint8ArrayProto)
			return String.fromCharCode.apply(null, thing);
		if (thing.__proto__ == StaticArrayBufferProto)
			return getString(new Uint8Array(thing));
		if (thing.__proto__ == StaticByteBufferProto)
			return thing.toString("binary");
		if (thing.__proto__ == StaticWordArrayProto)
			return thing.toString(CryptoJS.enc.Latin1);
	}
	return thing;
}

function getStringable(thing) {
	return (typeof thing == "string" || typeof thing == "number" || typeof thing == "boolean" ||
			(thing === Object(thing) &&
				(thing.__proto__ == StaticArrayBufferProto ||
				thing.__proto__ == StaticUint8ArrayProto ||
				thing.__proto__ == StaticByteBufferProto ||
				thing.__proto__ == StaticWordArrayProto)));
}

function isEqual(a, b, mayBeShort) {
	// TODO: Special-case arraybuffers, etc
	if (a === undefined || b === undefined)
		return false;
	a = getString(a);
	b = getString(b);
	var maxLength = mayBeShort ? Math.min(a.length, b.length) : Math.max(a.length, b.length);
	if (maxLength < 5)
		throw new Error("a/b compare too short");
	return a.substring(0, Math.min(maxLength, a.length)) == b.substring(0, Math.min(maxLength, b.length));
}

function toArrayBuffer(thing) {
	//TODO: Optimize this for specific cases
	if (thing === undefined)
		return undefined;
	if (thing === Object(thing) && thing.__proto__ == StaticArrayBufferProto)
		return thing;

	if (thing instanceof Array) {
		// Assuming Uint16Array from curve25519
		var res = new ArrayBuffer(thing.length * 2);
		var uint = new Uint16Array(res);
		for (var i = 0; i < thing.length; i++)
			uint[i] = thing[i];
		return res;
	}

	if (!getStringable(thing))
		throw new Error("Tried to convert a non-stringable thing of type " + typeof thing + " to an array buffer");
	var str = getString(thing);
	var res = new ArrayBuffer(str.length);
	var uint = new Uint8Array(res);
	for (var i = 0; i < str.length; i++)
		uint[i] = str.charCodeAt(i);
	return res;
}


function base64ToArrayBuffer(string) {
	return base64DecToArr(string);
}

// Protobuf decoding
//TODO: throw on missing fields everywhere
window.textsecure.protos = function() {
	var self = {};

	self.IncomingPushMessageProtobuf = dcodeIO.ProtoBuf.loadProtoFile("protos/IncomingPushMessageSignal.proto").build("textsecure.IncomingPushMessageSignal");
	self.decodeIncomingPushMessageProtobuf = function(string) {
		return self.IncomingPushMessageProtobuf.decode(btoa(string));
	}

	self.PushMessageContentProtobuf = dcodeIO.ProtoBuf.loadProtoFile("protos/IncomingPushMessageSignal.proto").build("textsecure.PushMessageContent");
	self.decodePushMessageContentProtobuf = function(string) {
		return self.PushMessageContentProtobuf.decode(btoa(string));
	}

	self.WhisperMessageProtobuf = dcodeIO.ProtoBuf.loadProtoFile("protos/WhisperTextProtocol.proto").build("textsecure.WhisperMessage");
	self.decodeWhisperMessageProtobuf = function(string) {
		return self.WhisperMessageProtobuf.decode(btoa(string));
	}

	self.PreKeyWhisperMessageProtobuf = dcodeIO.ProtoBuf.loadProtoFile("protos/WhisperTextProtocol.proto").build("textsecure.PreKeyWhisperMessage");
	self.decodePreKeyWhisperMessageProtobuf = function(string) {
		return self.PreKeyWhisperMessageProtobuf.decode(btoa(string));
	}

	self.DeviceInitProtobuf = dcodeIO.ProtoBuf.loadProtoFile("protos/DeviceMessages.proto").build("textsecure.DeviceInit");
	self.decodeDeviceInitProtobuf = function(string) {
		return self.DeviceInitProtobuf.decode(btoa(string));
	}

	self.IdentityKeyProtobuf = dcodeIO.ProtoBuf.loadProtoFile("protos/DeviceMessages.proto").build("textsecure.IdentityKey");
	self.decodeIdentityKeyProtobuf = function(string) {
		return self.IdentityKeyProtobuf.decode(btoa(string));
	}

	self.DeviceControlProtobuf = dcodeIO.ProtoBuf.loadProtoFile("protos/DeviceMessages.proto").build("textsecure.DeviceControl");
	self.decodeDeviceControlProtobuf = function(string) {
		return self.DeviceControlProtobuf.decode(btoa(string));
	}

	return self;
}();

// Number formatting utils
window.textsecure.utils = function() {
	var self = {};
	self.unencodeNumber = function(number) {
		return number.split(".");
	};

	/**************************
	 *** JSON'ing Utilities ***
	 **************************/
	function ensureStringed(thing) {
		if (getStringable(thing))
			return getString(thing);
		else if (thing instanceof Array) {
			var res = [];
			for (var i = 0; i < thing.length; i++)
				res[i] = ensureStringed(thing[i]);
			return res;
		} else if (thing === Object(thing)) {
			var res = {};
			for (var key in thing)
				res[key] = ensureStringed(thing[key]);
			return res;
		}
		throw new Error("unsure of how to jsonify object of type " + typeof thing);

	}

	self.jsonThing = function(thing) {
		return JSON.stringify(ensureStringed(thing));
	}

	return self;
}();

window.textsecure.throwHumanError = function(error, type, humanError) {
	var e = new Error(error);
	if (type !== undefined)
		e.name = type;
	e.humanError = humanError;
	throw e;
}

/************************************************
 *** Utilities to store data in local storage ***
 ************************************************/
window.textsecure.storage = function() {
	var self = {};

	/*****************************
	 *** Base Storage Routines ***
	 *****************************/
	self.putEncrypted = function(key, value) {
		//TODO
		if (value === undefined)
			throw new Error("Tried to store undefined");
		localStorage.setItem("e" + key, textsecure.utils.jsonThing(value));
	}

	self.getEncrypted = function(key, defaultValue) {
	//TODO
		var value = localStorage.getItem("e" + key);
		if (value === null)
			return defaultValue;
		return JSON.parse(value);
	}

	self.removeEncrypted = function(key) {
		localStorage.removeItem("e" + key);
	}

	self.putUnencrypted = function(key, value) {
		if (value === undefined)
			throw new Error("Tried to store undefined");
		localStorage.setItem("u" + key, textsecure.utils.jsonThing(value));
	}

	self.getUnencrypted = function(key, defaultValue) {
		var value = localStorage.getItem("u" + key);
		if (value === null)
			return defaultValue;
		return JSON.parse(value);
	}

	self.removeUnencrypted = function(key) {
		localStorage.removeItem("u" + key);
	}

	/**********************
	 *** Device Storage ***
	 **********************/
	self.devices = function() {
		var self = {};

		var internalSaveDeviceObject = function(deviceObject, onlyKeys) {
			if (deviceObject.identityKey === undefined || deviceObject.encodedNumber === undefined)
				throw new Error("Tried to store invalid deviceObject");

			var number = textsecure.utils.unencodeNumber(deviceObject.encodedNumber)[0];
			var map = textsecure.storage.getEncrypted("devices" + number);

			if (map === undefined)
				map = { devices: [deviceObject], identityKey: deviceObject.identityKey };
			else if (map.identityKey != getString(deviceObject.identityKey))
				throw new Error("Identity key changed");
			else {
				var updated = false;
				for (var i in map.devices) {
					if (map.devices[i].encodedNumber == deviceObject.encodedNumber) {
						if (!onlyKeys)
							map.devices[i] = deviceObject;
						else {
							map.devices[i].preKey = deviceObject.preKey;
							map.devices[i].preKeyId = deviceObject.preKeyId;
							map.devices[i].signedKey = deviceObject.signedKey;
							map.devices[i].signedKeyId = deviceObject.signedKeyId;
							map.devices[i].registrationId = deviceObject.registrationId;
						}
						updated = true;
					}
				}

				if (!updated)
					map.devices.push(deviceObject);
			}

			textsecure.storage.putEncrypted("devices" + number, map);
		}

		self.saveDeviceObject = function(deviceObject) {
			return internalSaveDeviceObject(deviceObject, false);
		}

		self.saveKeysToDeviceObject = function(deviceObject) {
			return internalSaveDeviceObject(deviceObject, true);
		}

		self.getDeviceObjectsForNumber = function(number) {
			var map = textsecure.storage.getEncrypted("devices" + number);
			return map === undefined ? [] : map.devices;
		}

		self.getDeviceObject = function(encodedNumber) {
			var number = textsecure.utils.unencodeNumber(encodedNumber);
			var devices = self.getDeviceObjectsForNumber(number[0]);
			if (devices === undefined)
				return undefined;

			for (var i in devices)
				if (devices[i].encodedNumber == encodedNumber)
					return devices[i];

			return undefined;
		}

		self.removeDeviceIdsForNumber = function(number, deviceIdsToRemove) {
			var map = textsecure.storage.getEncrypted("devices" + number);
			if (map === undefined)
				throw new Error("Tried to remove device for unknown number");

			var newDevices = [];
			var devicesRemoved = 0;
			for (var i in map.devices) {
				var keep = true;
				for (var j in deviceIdsToRemove)
					if (map.devices[i].encodedNumber == number + "." + deviceIdsToRemove[j])
						keep = false;

				if (keep)
					newDevices.push(map.devices[i]);
				else
					devicesRemoved++;
			}

			if (devicesRemoved != deviceIdsToRemove.length)
				throw new Error("Tried to remove unknown device");
		}

		return self;
	}();

	/*********************
	 *** Group Storage ***
	 *********************/
	self.groups = function() {
		var self = {};

		var addGroupToNumber = function(groupId, number) {
			var membership = textsecure.storage.getEncrypted("groupMembership" + number, [groupId]);
			if (membership.indexOf(groupId) < 0)
				membership.push(groupId);
			textsecure.storage.putEncrypted("groupMembership" + number, membership);
		}

		var removeGroupFromNumber = function(groupId, number) {
			var membership = textsecure.storage.getEncrypted("groupMembership" + number, [groupId]);
			membership = membership.filter(function(group) { return group != groupId; });
			if (membership.length == 0)
				textsecure.storage.removeEncrypted("groupMembership" + number);
			else
				textsecure.storage.putEncrypted("groupMembership" + number, membership);
		}

		self.getGroupListForNumber = function(number) {
			return textsecure.storage.getEncrypted("groupMembership" + number, []);
		}

		self.createNewGroup = function(numbers, groupId) {
			if (groupId !== undefined && textsecure.storage.getEncrypted("group" + groupId) !== undefined) {
				throw new Error("Tried to recreate group");
            }

            while (groupId === undefined || textsecure.storage.getEncrypted("group" + groupId) !== undefined) {
                groupId = getString(textsecure.crypto.getRandomBytes(16));
            }

			var me = textsecure.utils.unencodeNumber(textsecure.storage.getUnencrypted("number_id"))[0];
			var haveMe = false;
			var finalNumbers = [];
			for (var i in numbers) {
				var number = libphonenumber.util.verifyNumber(numbers[i]);
				if (number == me)
					haveMe = true;
				if (finalNumbers.indexOf(number) < 0) {
					finalNumbers.push(number);
					addGroupToNumber(groupId, number);
				}
			}

			if (!haveMe)
				finalNumbers.push(me);

			textsecure.storage.putEncrypted("group" + groupId, {numbers: finalNumbers});

			return {id: groupId, numbers: finalNumbers};
		}

		self.getNumbers = function(groupId) {
			var group = textsecure.storage.getEncrypted("group" + groupId);
			if (group === undefined)
				return undefined;

			return group.numbers;
		}

		self.removeNumber = function(groupId, number) {
			var group = textsecure.storage.getEncrypted("group" + groupId);
			if (group === undefined)
				return undefined;

			try {
				number = libphonenumber.util.verifyNumber(number);
			} catch (e) {
				return group.numbers;
			}

			var me = textsecure.utils.unencodeNumber(textsecure.storage.getUnencrypted("number_id"))[0];
			if (number == me)
				throw new Error("Cannot remove ourselves from a group, leave the group instead");

			var i = group.numbers.indexOf(number);
			if (i > -1) {
				group.numbers.slice(i, 1);
				textsecure.storage.putEncrypted("group" + groupId, group);
				removeGroupFromNumber(groupId, number);
			}

			return group.numbers;
		}

		self.addNumbers = function(groupId, numbers) {
			var group = textsecure.storage.getEncrypted("group" + groupId);
			if (group === undefined)
				return undefined;

			for (var i in numbers) {
				var number = libphonenumber.util.verifyNumber(numbers[i]);
				if (group.numbers.indexOf(number) < 0) {
					group.numbers.push(number);
					addGroupToNumber(groupId, number);
				}
			}

			textsecure.storage.putEncrypted("group" + groupId, group);
			return group.numbers;
		}

		self.deleteGroup = function(groupId) {
			textsecure.storage.removeEncrypted("group" + groupId);
		}

		self.getGroup = function(groupId) {
			var group = textsecure.storage.getEncrypted("group" + groupId);
			if (group === undefined)
				return undefined;

			return { id: groupId, numbers: group.numbers }; //TODO: avatar/name tracking
		}

		return self;
	}();

	return self;
}();

/**********************
 *** NaCL Interface ***
 **********************/
window.textsecure.nacl = function() {
	var self = {};

	self.USE_NACL = true;

	var onLoadCallbacks = [];
	var naclLoaded = 0;
	self.registerOnLoadFunction = function(func) {
		return new Promise(function(resolve, reject) {
			if (naclLoaded || !self.USE_NACL)
				return resolve(func());
			onLoadCallbacks[onLoadCallbacks.length] = [ func, resolve, reject ];
		});
	}

	var naclMessageNextId = 0;
	var naclMessageIdCallbackMap = {};
	window.moduleDidLoad = function() {
		common.hideModule();
		naclLoaded = 1;
		for (var i = 0; i < onLoadCallbacks.length; i++) {
			try {
				onLoadCallbacks[i][1](onLoadCallbacks[i][0]());
			} catch (e) {
				onLoadCallbacks[i][2](e);
			}
		}
		onLoadCallbacks = [];
	}

	window.handleMessage = function(message) {
		naclMessageIdCallbackMap[message.data.call_id](message.data);
	}

	self.postNaclMessage = function(message) {
		if (!self.USE_NACL)
			throw new Error("Attempted to make NaCL call with !USE_NACL?");

		return new Promise(function(resolve) {
			naclMessageIdCallbackMap[naclMessageNextId] = resolve;
			message.call_id = naclMessageNextId++;

			common.naclModule.postMessage(message);
		});
	}

	return self;
}();

//TODO: Some kind of textsecure.init(use_nacl)
window.textsecure.registerOnLoadFunction = window.textsecure.nacl.registerOnLoadFunction;

window.textsecure.replay = function() {
	var self = {};

	self.REPLAY_FUNCS = {
		SEND_MESSAGE: 1,
		INIT_SESSION: 2,
	}

	var functions = {};

	self.registerReplayFunction = function(func, functionCode) {
		functions[functionCode] = func;
	}

	self.replayError = function(replayData) {
		var args = Array.prototype.slice.call(arguments);
		args.shift();
		args = replayData.args.concat(args);
		functions[replayData.replayFunction].apply(window, args);
	}

	self.createReplayableError = function(shortMsg, longMsg, replayFunction, args) {
		var e = new Error(shortMsg);
		e.name = "ReplayableError";
		e.humanError = e.longMessage = longMsg;
		e.replayData = { replayFunction: replayFunction, args: args };
		e.replay = function() {
			self.replayError(e.replayData);
		}
		return e;
	}

	return self;
}();

// message_callback({message: decryptedMessage, pushMessage: server-providedPushMessage})
window.textsecure.subscribeToPush = function(message_callback) {
	var socket = textsecure.api.getMessageWebsocket();

	socket.onmessage = function(message) {
		textsecure.crypto.decryptWebsocketMessage(message.message).then(function(plaintext) {
			var proto = textsecure.protos.decodeIncomingPushMessageProtobuf(getString(plaintext));
			// After this point, a) decoding errors are not the server's fault, and
			// b) we should handle them gracefully and tell the user they received an invalid message
			console.log("Successfully decoded message with id: " + message.id);
			socket.send(JSON.stringify({type: 1, id: message.id}));
			return textsecure.crypto.handleIncomingPushMessageProto(proto).then(function(decrypted) {
				// Delivery receipt
				if (decrypted === null)
					//TODO: Pass to UI
					return;

				// Now that its decrypted, validate the message and clean it up for consumer processing
				// Note that messages may (generally) only perform one action and we ignore remaining fields
				// after the first action.

				if (decrypted.flags == null)
					decrypted.flags = 0;

				if ((decrypted.flags & textsecure.protos.PushMessageContentProtobuf.Flags.END_SESSION)
							== textsecure.protos.PushMessageContentProtobuf.Flags.END_SESSION)
					return;
				if (decrypted.flags != 0)
					throw new Error("Unknown flags in message");

				var handleAttachment = function(attachment) {
					return textsecure.api.getAttachment(attachment.id).then(function(encryptedBin) {
						return textsecure.crypto.decryptAttachment(encryptedBin, toArrayBuffer(attachment.key)).then(function(decryptedBin) {
							attachment.decrypted = decryptedBin;
						});
					});
				};

				var promises = [];

				if (decrypted.group !== null) {
                    decrypted.group.id = getString(decrypted.group.id);
					var existingGroup = textsecure.storage.groups.getNumbers(decrypted.group.id);
					if (existingGroup === undefined) {
						if (decrypted.group.type != textsecure.protos.PushMessageContentProtobuf.GroupContext.Type.UPDATE)
							throw new Error("Got message for unknown group");
						textsecure.storage.groups.createNewGroup(decrypted.group.members, decrypted.group.id);
					} else {
						var fromIndex = existingGroup.indexOf(proto.source);

						if (fromIndex < 0) //TODO: This could be indication of a race...
							throw new Error("Sender was not a member of the group they were sending from");

						switch(decrypted.group.type) {
						case textsecure.protos.PushMessageContentProtobuf.GroupContext.Type.UPDATE:
							if (decrypted.group.avatar !== null)
								promises.push(handleAttachment(decrypted.group.avatar));

							if (existingGroup.filter(function(number) { decrypted.group.members.indexOf(number) < 0 }).length != 0)
								throw new Error("Attempted to remove numbers from group with an UPDATE");
							decrypted.group.added = decrypted.group.members.filter(function(number) { return existingGroup.indexOf(number) < 0; });

							var newGroup = textsecure.storage.groups.addNumbers(decrypted.group.id, decrypted.group.added);
							if (newGroup.length != decrypted.group.members.length ||
										newGroup.filter(function(number) { return decrypted.group.members.indexOf(number) < 0; }).length != 0)
								throw new Error("Error calculating group member difference");

							//TODO: Also follow this path if avatar + name haven't changed (ie we should start storing those)
							if (decrypted.group.avatar === null && decrypted.group.added.length == 0 && decrypted.group.name === null)
								return;

							//TODO: Strictly verify all numbers (ie dont let verifyNumber do any user-magic tweaking)

							decrypted.body = null;
							decrypted.attachments = [];

							break;
						case textsecure.protos.PushMessageContentProtobuf.GroupContext.Type.QUIT:
							textsecure.storage.groups.removeNumber(decrypted.group.id, proto.source);

							decrypted.body = null;
							decrypted.attachments = [];
						case textsecure.protos.PushMessageContentProtobuf.GroupContext.Type.DELIVER:
							decrypted.group.name = null;
							decrypted.group.members = [];
							decrypted.group.avatar = null;

							break;
						default:
							throw new Error("Unknown group message type");
						}
					}
				}

				for (var i in decrypted.attachments)
					promises.push(handleAttachment(decrypted.attachments[i]));
				return Promise.all(promises).then(function() {
					message_callback({pushMessage: proto, message: decrypted});
				});
			})
		}).catch(function(e) {
			// TODO: Show "Invalid message" messages?
			console.log("Error handling incoming message: ");
			console.log(e);
		});
	};
};

window.textsecure.registerSingleDevice = function(number, verificationCode, stepDone) {
    var signalingKey = textsecure.crypto.getRandomBytes(32 + 20);
    textsecure.storage.putEncrypted('signaling_key', signalingKey);

    var password = btoa(getString(textsecure.crypto.getRandomBytes(16)));
    password = password.substring(0, password.length - 2);
    textsecure.storage.putEncrypted("password", password);

    var registrationId = new Uint16Array(textsecure.crypto.getRandomBytes(2))[0];
    registrationId = registrationId & 0x3fff;
    textsecure.storage.putUnencrypted("registrationId", registrationId);

    return textsecure.api.confirmCode(number, verificationCode, password, signalingKey, registrationId, true).then(function() {
        var numberId = number + ".1";
        textsecure.storage.putUnencrypted("number_id", numberId);
        textsecure.storage.putUnencrypted("regionCode", libphonenumber.util.getRegionCodeForNumber(number));
        stepDone(1);

        return textsecure.crypto.generateKeys().then(function(keys) {
            stepDone(2);
            return textsecure.api.registerKeys(keys).then(function() {
                stepDone(3);
            });
        });
    });
}

window.textsecure.registerSecondDevice = function(encodedDeviceInit, cryptoInfo, stepDone) {
	var deviceInit = textsecure.protos.decodeDeviceInit(encodedDeviceInit);
	return cryptoInfo.decryptAndHandleDeviceInit(deviceInit).then(function(identityKey) {
		if (identityKey.server != textsecure.api.relay)
			throw new Error("Unknown relay used by master");
		var number = identityKey.phoneNumber;

		stepDone(1);

		var signalingKey = textsecure.crypto.getRandomBytes(32 + 20);
		textsecure.storage.putEncrypted('signaling_key', signalingKey);

		var password = btoa(getString(textsecure.crypto.getRandomBytes(16)));
		password = password.substring(0, password.length - 2);
		textsecure.storage.putEncrypted("password", password);

		var registrationId = new Uint16Array(textsecure.crypto.getRandomBytes(2))[0];
		registrationId = registrationId & 0x3fff;
		textsecure.storage.putUnencrypted("registrationId", registrationId);

		return textsecure.api.confirmCode(number, identityKey.provisioningCode, password, signalingKey, registrationId, false).then(function(result) {
			var numberId = number + "." + result;
			textsecure.storage.putUnencrypted("number_id", numberId);
			textsecure.storage.putUnencrypted("regionCode", libphonenumber.util.getRegion(number));
			stepDone(2);

			return textsecure.crypto.generateKeys().then(function(keys) {
				stepDone(3);
				return textsecure.api.registerKeys(keys).then(function() {
					stepDone(4);
					//TODO: Send DeviceControl.NEW_DEVICE_REGISTERED to all other devices
				});
			});
		});
	});
};
