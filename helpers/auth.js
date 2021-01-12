const Store = require('electron-store');

const {
  cognitoAuthUser,
  cognitoRegisterUser,
  cognitoChangePassword,
  cognitoRefreshTokenWeb,
  initializeUserPools
} = require('./Cognito.js');

const {
    isVirgilInitialized,
    initializeVirgil,
    decryptAESKeys,
    getVirgilPrivateKey,
    joinGroup
} = require('./VirgilHelpers');

initializeUserPools(
    "us-east-1_tHpDUmzBu",
    "6bl5v103snuaql4jiutp3qv5vi"
)

const {
    loginUser,
    getCompanyById,
    virgilJwt
} = require("./database")

const store = new Store();

let isDecryptingKeys = false;
const asyncStore = (key, val) => 
  store.set(key, val)

const cognitologinWithEmailPasswordAsync = async (email, password) => {
    return await cognitoAuthUser(email, password)
        .then(authUser => authUser)
        .catch(error => error);
}

const getAESKeys = () => {
    return store.get('aes_keys')
}

const getUser = () => {
    return JSON.parse(store.get('userObj'))
}

const decryptAESKeysHelper = async (user, company, password) => {
    // TODO: Clean up this logic
    console.log("Checking already decrypting");
    if (isDecryptingKeys) {
        console.log("Already decrypting, quitting");
        return;
    }
    isDecryptingKeys = true;
    console.log("Checking user valid")
    if (!user) {
        console.log("User not valid, quitting")
        return;
    }
    console.log("Checking if already decrypted keys")
    // TODO: fix this condition to use asyncstorage
    // if (decryptedAESKeys !== undefined) {
    //     console.log("Already decrypted keys")
    //     return;
    // }
    console.log("Initialized? " + isVirgilInitialized())
    if (isVirgilInitialized()) {
        try {
            console.log("User: " + JSON.stringify(state.authUser.user));
            const decryptedKeys = await decryptAESKeys(user, company);
            console.log("Decrypt: " + decryptedKeys);
            console.log("calling dispatch with callback");

            await asyncStore("aes_keys", JSON.stringify(decryptedKeys));
            isDecryptingKeys = false;
            return decryptedKeys;
        } catch (e) {
            console.log("DECRYPT KEYS VIRGIL ERROR: " + e);
            isDecryptingKeys = false;
            return;
        }
    }
    const uid = user.uid;
    const passwordFinal = password ? password : "";
    try {
        await initializeVirgil();
        await getVirgilPrivateKey(passwordFinal, false);
        await joinGroup(user, company);
    } catch (e) {
        console.log("DECRYPT KEYS VIRGIL ERROR: " + e);
        isDecryptingKeys = false;
        return;
    }
    try {
        const decryptedAESKeys = await decryptAESKeys(user, company);
        await asyncStore("aes_keys", JSON.stringify(decryptedAESKeys));
    } catch (error) {
        console.log(error);
    }

    isDecryptingKeys = false;
    return;
    // Commented out this pathway for now because 
    // it turns out that restoring the private key doesn't
    // need the password to be entered again.
   
}

const loginUserHelper = async (email, password) => {
    console.log("In login saga")
    let cognitoUser = null;
    let user = null;
    let userObj = null;
    let companyObj = null;
    let id_token = null;
    try {
        cognitoUser = await cognitologinWithEmailPasswordAsync(email, password);
        if (cognitoUser.message) {
          return cognitoUser.message;
        }
        console.log('cognitoUser',cognitoUser)

        id_token = cognitoUser.getIdToken().getJwtToken()
        // TODO store
        await asyncStore('id_token',id_token);
        try {
            userObj = await loginUser();
        } catch (e) {
            console.log(e)
            if (!e.response) {
                return "Server down for maintenance. Please check back in 5 minutes"
            }
            return "Login error"
        }
        
        if (userObj.role === "none" || userObj.role === "rejected") {
            return "User not authorized to access this app."
        }
        companyObj = await getCompanyById(userObj.company_id)

        console.log("Company obj", companyObj)
        
        console.log('userObj',userObj)
        const userCookie = "userObj"
        const companyCookie = "companyObj"
        await asyncStore(userCookie, JSON.stringify(userObj));
        await asyncStore(companyCookie, JSON.stringify(companyObj))
        await decryptAESKeysHelper(userObj, companyObj, password);
        return;
    } catch (e) {
        return String(e);
    }
    

}

module.exports = {
    loginUserHelper
}