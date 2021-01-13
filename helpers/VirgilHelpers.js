const { EThree, IKeyEntryStorage } = require('@virgilsecurity/e3kit-node');
const { remote, app, BrowserWindow, ipcMain } = require('electron')

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
	const mainWindow = BrowserWindow.getFocusedWindow();
    mainWindow.webContents.send("loginError", "Initializing virgil");
	const initializeFunction = () => getToken().then(result => result.virgil_token);
	console.log(initializeFunction)
	
	eThree = await EThree.initialize(initializeFunction, {
		groupStorageName: app.getPath("userData")+"/.virgil-group-storage",
		storageName: app.getPath("userData")+"/.virgil-local-storage"
	})
	mainWindow.webContents.send("loginError", "done");
	console.log("Successfully initialized virgil")
	

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
	const mainWindow = BrowserWindow.getFocusedWindow();
	mainWindow.webContents.send("loginError", "Checking user valid");
	const { company_admin_virgil_id, aes_key } = companyObj;
	mainWindow.webContents.send("loginError", "companyObj: " + companyObj);
	console.log("company obj", companyObj)
	let decryptedObj = {}
	for (var key of Object.keys(aes_key)) {
		decryptedObj[key] = await decryptMessage(aes_key[key], company_admin_virgil_id)
		mainWindow.webContents.send("loginError", "decrypted: " + decryptedObj[key]);
	}
	return decryptedObj;
}

async function changePassword(oldPassword, newPassword) {
	await eThree.changePassword(oldPassword, newPassword);
}

async function getVirgilPrivateKey(keyPassword, createNewAccount) {
	if (!useVirgil) return;
	const mainWindow = BrowserWindow.getFocusedWindow();
	const hasLocalKey = await eThree.hasLocalPrivateKey();
	mainWindow.webContents.send("loginError", "Key password: " + keyPassword);
	console.log("key password1: " + keyPassword)
	if (!hasLocalKey) {
		mainWindow.webContents.send("loginError", "No local key");
	
		try {
			mainWindow.webContents.send("loginError", "Restoring private key");
	
			await eThree.restorePrivateKey(keyPassword);
		} catch (err) {
			mainWindow.webContents.send("loginError", err);
	
			console.log(err);
			if (createNewAccount) {
				//mainWindow.webContents.send("loginError", "Creating new virgil account");
				createNewUserVirgil(keyPassword)
			} else {
				//mainWindow.webContents.send("loginError", "No local key exists: " + keyPassword);
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
