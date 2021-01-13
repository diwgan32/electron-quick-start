// Event handlers
document.getElementById("submitFile").addEventListener("change", submitFileChangeHandler);
// --------------

let file;

function submitFileChangeHandler(data) {
	file = data.target.files[0];
	window.api.send("ffmpegRequest", file.path)
}



window.api.receive("ffmpegStatus", (data) => {
    document.getElementById("submitCompressProgress").textContent = data;
});
