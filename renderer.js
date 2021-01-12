// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.


window.api.receive("fromMain", (data) => {
    console.log(`Received ${data} from main process`);
    const element = document.getElementById("sample_text")
    element.innerText = data

});

window.api.receive("returnedPath", (data) => {
    console.log(`Received ${data} from main process`);
    const element = document.getElementById("path_text")
    element.innerText = data

});

window.api.send("toMain", "some data");
window.api.send("getPath", "path");