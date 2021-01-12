const axios = require('axios');
const Store = require('electron-store');

const store = new Store();

const TUMEKE_API = "https://api.dev.tumeke.io"

axios.interceptors.request.use(function (config) {
  let id_token = store.get('id_token')
  console.log('Sending request')
  config.headers.Authorization = id_token;
  config.headers["Access-Control-Allow-Origin"] = "*"
  axios.defaults.crossDomain = true
  return config;
});

const loginUser = async () => (await axios.get(`${TUMEKE_API}/loginUser`)).data

const getCompanyById = async (company_id) => (await axios.get(`${TUMEKE_API}/getCompanyById/${company_id}`)).data

const virgilJwt = async () => (await axios.get(`${TUMEKE_API}/virgilJwt`)).data

module.exports = {
	loginUser,
	getCompanyById,
	virgilJwt
}