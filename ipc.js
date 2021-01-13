const { loginUserHelper } = require('./helpers/auth.js')
const ffmpeg_static = require('ffmpeg-static-electron');
const ffprobe_static = require('ffprobe-static-electron');
const FfmpegCommand = require('fluent-ffmpeg');
const fs = require('fs')
const { remote, app, BrowserWindow, ipcMain } = require('electron')
const { exec, spawn } = require("child_process");


// Navs
ipcMain.on("nav", (event, loc) => {
  const mainWindow = BrowserWindow.getFocusedWindow();
  try {
      if (fs.existsSync(loc)) mainWindow.loadFile(loc)
  } catch (e) {
      mainWindow.webContents.send("loginError", String(e))
  }
    
})

ipcMain.on("loginRequest", (event, args) => {
  const mainWindow = BrowserWindow.getFocusedWindow();
  loginUserHelper(args["email"], args["password"]).then( (val) => {
    if (val) {
      mainWindow.webContents.send("loginError", val);
    } else {
      mainWindow.webContents.send("loginSuccess", "done");
    }
    
  })
});

ipcMain.on("ffmpegRequest", (event, loc) => {
  
  const ffprobePath = ffprobe_static.path;

  FfmpegCommand.setFfprobePath(ffprobePath);

  FfmpegCommand.ffprobe(loc, function(err, metadata) {
    if (err) {
      //handle
      return;
    }
    onFfprobeSuccess(loc, metadata);
  });
});

function setNumFrames (ffprobeData) {
  const format = ffprobeData.format;
  if (!format) return;
  const duration = format.duration;
  if (!duration) return;
  console.log("Duration: " + duration);
  return duration;
}

function hmsToSeconds(hms) {
  const a = hms.split(':'); // split it at the colons=
  // minutes are worth 60 seconds. Hours are worth 60 minutes.
  const seconds = (parseInt(a[0])) * 60 * 60 + (parseInt(a[1])) * 60 + (parseFloat(a[2])); 
  return seconds;
}

function handleFfmpegData (duration, data) {
  const mainWindow = BrowserWindow.getFocusedWindow();
  const keypointString = "time="
  const digits = "0123456789.: "
  const idx = data.indexOf(keypointString);
  if (idx == -1) return;
  const str = data.substring(idx + keypointString.length, idx + keypointString.length + 60)
  let num = ""
  for (let i = 0; i < str.length; i++) {
    if (digits.indexOf(str[i]) === -1) {
      break;
    }
    num += str[i]
  }
  const frac = Math.floor((hmsToSeconds(num.trim())/duration) * 100)
  mainWindow.webContents.send("ffmpegStatus", frac);
  return frac
}

function onFfprobeSuccess(loc, data) {
  const ffmpegPath = ffmpeg_static.path;
  const duration = setNumFrames(data);
  const output = app.getPath("temp") + '/output.mp4'
  const child = 
    exec(ffmpegPath +" -y -i \"" + loc +"\" -r 16 -c:v mpeg4 -qscale:v 5 -filter:v scale=480:-1 " + output, 
      {
        detached: true,
        stdio: [ 'ignore', 1, 2 ]
      },
      (error, stdout, stderr) => {
       if (error) {
        // TODO: Something
        console.log("Error: " + error)
        return;
       }
       
      }
    );
  child.unref()
  child.stderr.on('data', (data) => handleFfmpegData(duration, data));
}