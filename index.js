// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.



// Event handlers
document.getElementById("loginButton").addEventListener("click", loginButtonHandler);
document.getElementById("loginForm").addEventListener("submit", loginFormHandler);
// --------------


function loginButtonHandler() {
	const loginSpinner = document.getElementById('loginSpinner');
	const form = document.getElementById("loginForm");
	if (form.checkValidity()) {
		loginSpinner.style.visibility = "visible";
		const email = document.getElementById("loginEmail").value;
		const password = document.getElementById("loginPassword").value;
		window.api.send("loginRequest",  {email: email, password: password})
	}
};

window.api.receive("loginSuccess", (data) => {
    window.api.send("nav", "submit.html")
});



function loginFormHandler(evt) {
	evt.preventDefault();
	return false;
}