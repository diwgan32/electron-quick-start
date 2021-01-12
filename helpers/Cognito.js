require('cross-fetch/polyfill');
const AmazonCognitoIdentity = require("amazon-cognito-identity-js");

const VIRGIL_URL_LENGTH = 28

var AWS_REGION = "us-east-1"

// dev
const COGNITO_CONFIG = {
  UserPoolId : "",
  ClientId : ""
};

var CognitoUserPool = null;
//AmazonCognitoIdentity.config.region = awsRegion;
var userPool = null;

const initializeUserPools = (poolId, clientId) => {
  COGNITO_CONFIG.UserPoolId = poolId;
  COGNITO_CONFIG.ClientId = clientId;
  CognitoUserPool = AmazonCognitoIdentity.CognitoUserPool;
  userPool = new AmazonCognitoIdentity.CognitoUserPool(COGNITO_CONFIG);
}

const authDetails = (email,password) => new AmazonCognitoIdentity.AuthenticationDetails({
  Username : email,
  Password : password,
})

const cognitoUser = (email) => new AmazonCognitoIdentity.CognitoUser(
  {Username : email, Pool : userPool}
)

// callback to promise prob a better way
const cognitoAuthUser = (email,password) => new Promise ((resolve,reject) =>
  {
    const callbkfn = {
        onSuccess: function (result) {
          resolve(result)
        },
        onFailure: function(err) {
            reject(err)
        }
      }
    cognitoUser(email).authenticateUser(authDetails(email,password),callbkfn)
  });

// callback to promise prob a better way
const cognitoChangePassword = (email,oldPassword,newPassword) => new Promise ((resolve,reject) =>
  {
    const user = cognitoUser(email);
    const callbkfn = {
        onSuccess: function (result) {
          user.changePassword(oldPassword, newPassword, function (err, result) {
            if(err){
              reject(err)
            } else{
              resolve(result.user)
            }
          })
          resolve(result)
        },
        onFailure: function(err) {
          reject(err)
        }
      }
    user.authenticateUser(authDetails(email,oldPassword), callbkfn)
  });

const cognitoRefreshTokenRN = () => new Promise((resolve, reject) => 
  {
    userPool.storage.sync(function(err, result) {
      if (err) {
        console.log("Sync error")
        // Something wrong with getting current session
        reject(err);
      } else if (result === 'SUCCESS') {
        var cognitoUser = userPool.getCurrentUser();

        if (!cognitoUser || cognitoUser === null) {
          reject(err);
          return;
        }
          // Continue with steps in Use case 16
        cognitoUser.getSession(function(err, session) {
          if (err) {
            console.log("Get session error")
            reject(err);
            return;
          }
          var refresh_token = session.getRefreshToken().token;
          var token = new AmazonCognitoIdentity.CognitoRefreshToken({ RefreshToken: refresh_token })

          if (session.isValid()) {
            resolve(session)
            return;
          }

          cognitoUser.refreshSession(token, function (err, session) {
            if (err) {
              console.log("Refresh error")
              reject(err);
              return;
            }
            var idToken = session.getIdToken().getJwtToken();
            resolve(session)
          })

        });
      }
    });
  })

const cognitoRefreshTokenWeb = () => new Promise((resolve, reject) => 
  {
    var cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser || cognitoUser === null) {
      reject(err);
    }
      // Continue with steps in Use case 16
    cognitoUser.getSession(function(err, session) {
      if (err) {
        console.log("Get session error")
        reject(err);
        return;
      }
      var refresh_token = session.getRefreshToken().token;
      var token = new AmazonCognitoIdentity.CognitoRefreshToken({ RefreshToken: refresh_token })

      if (session.isValid()) {
        resolve(session)
      }

      cognitoUser.refreshSession(token, function (err, session) {
        if (err) {
          console.log("Refresh error")
          reject(err);
          return;
        }
        var idToken = session.getIdToken().getJwtToken();
        resolve(session)
      })

    });
  })

// callback to promise prob a better way
const cognitoRegisterUser = (email,password,virgil_id) => new Promise ((resolve,reject) =>
  {
    if (virgil_id === undefined) {
      throw "Undefined virgilId"
    }
    const attributeList = []
    var virgil_dict = {
      Name: 'custom:virgil_id',
      Value: virgil_id,
    };
    const virgilIdCognito = new AmazonCognitoIdentity.CognitoUserAttribute(virgil_dict);

    attributeList.push(virgilIdCognito)
    userPool.signUp(email, password, attributeList, null, function(err,result) {
      console.log(err,result)
      if(err){
        reject(err)
      } else{
        resolve(result.user)
      }
    })
  });

module.exports = {
   cognitoAuthUser,
   cognitoRegisterUser,
   cognitoChangePassword,
   cognitoRefreshTokenWeb,
   cognitoRefreshTokenRN,
   COGNITO_CONFIG,
   initializeUserPools
};
