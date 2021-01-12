const { EThree } = require('@virgilsecurity/e3kit-node');

const {
    loginUser,
    getCompanyById,
    virgilJwt
} = require("./database")

var eThree = null;
var groupChat = null;
const TUMEKE_API = "https://api.dev.tumeke.io"
const useVirgil = true;

// Assumes that device already authenticated w cognito
async function initializeVirgil() {
	if (!useVirgil) return;
	const getToken = virgilJwt;
	const initializeFunction = () => getToken().then(result => result.virgil_token);
	console.log(initializeFunction)
	try {
		eThree = await EThree.initialize(initializeFunction)
		console.log("Successfully initialized virgil")
	} catch (err) {
		console.log("Virgil error: " + err);
	}

}

function isVirgilInitialized() {
	return eThree !== null && groupChat !== null;
}

async function logoutVirgil() {
	if (!useVirgil) return;
	try {
		await eThree.cleanup();
	} catch (err) {
		console.log("Error cleaning up " + err)
	}
	eThree = null;
}

async function createNewUserVirgil(password) {
	if (!useVirgil) return;
	try {
		await eThree.register();
		await eThree.backupPrivateKey(password);
		console.log("Done")
	} catch (err) {
		console.log("Error: " + err);
	}
}

async function createVirgilGroupWithSelf(uid, groupId) {
	if (!useVirgil) return;
	console.log("Creating group with self: " + uid)
	const participants = await eThree.findUsers([uid]);
	console.log("Got user card")
	groupChat = await eThree.createGroup(groupId, participants);
	console.log("Group done")
	return;
}

async function encryptMessage(message) {
	if (!useVirgil) return;
	return await groupChat.encrypt(message);
}

async function decryptMessage(message, messageCreatorUID) {
	if (!useVirgil) return;
	console.log("messagecreatoruid", messageCreatorUID)
	const messageSender = await eThree.findUsers(messageCreatorUID);
	return await groupChat.decrypt(message, messageSender);
}

async function addUserToGroup(uid) {
	console.log('finding users: ' + uid)
	const newParticipant = await eThree.findUsers(uid);
	console.log('adding to groupchat: ' + JSON.stringify(newParticipant))
	try {
		await groupChat.add(newParticipant);
	} catch (e) {
		// this is the error for when user is already in group.
		// if they are not, then throw error
		if (!(String(e).startsWith("KeyknoxClientError"))) {
			throw "Add user to group error"
		}
	}
	
}

async function acceptUserIntoCompanyVirgilHelper(uid) {
	await addUserToGroup(uid);
}

async function joinGroup(userObj, companyObj) {
	if (!useVirgil) return;
	if (userObj.role === "requesting") return;
	const { virgil_id, company_admin_virgil_id } = companyObj
	const card = await eThree.findUsers(company_admin_virgil_id);
	groupChat = await eThree.loadGroup(companyObj.virgil_id, card);
}

async function decryptAESKeys(userObj, companyObj) {
	const { company_admin_virgil_id, aes_key } = companyObj;
	console.log("company obj", companyObj)
	let decryptedObj = {}
	for (var key of Object.keys(aes_key)) {
		decryptedObj[key] = await decryptMessage(aes_key[key], company_admin_virgil_id)
	}
	return decryptedObj;
}

async function changePassword(oldPassword, newPassword) {
	await eThree.changePassword(oldPassword, newPassword);
}

async function getVirgilPrivateKey(keyPassword, createNewAccount) {
	if (!useVirgil) return;
	const hasLocalKey = await eThree.hasLocalPrivateKey()
	console.log("key password1: " + keyPassword)
	if (!hasLocalKey) {
		try {
			await eThree.restorePrivateKey(keyPassword);
		} catch (err) {
			console.log(err);
			if (createNewAccount) {
				createNewUserVirgil(keyPassword)
			} else {
				console.log("key password: " + keyPassword);
				throw new Error("No local key exists")
			}

		}
	}
}

module.exports = {
	eThree,
	initializeVirgil,
	isVirgilInitialized,
	decryptAESKeys,
	getVirgilPrivateKey,
	joinGroup
}
