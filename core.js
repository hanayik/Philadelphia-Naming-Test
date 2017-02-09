const { remote } = require('electron')
const path = require('path')
const csvsync = require('csvsync')
const fs = require('fs')
const $ = require('jQuery')
const {app} = require('electron').remote;
const appRootDir = require('app-root-dir').get() //get the path of the application bundle
const ffmpeg = appRootDir+'/ffmpeg/ffmpeg'
const exec = require( 'child_process' ).exec
const si = require('systeminformation');
var userDataPath = app.getPath('videos');
console.log('user path: ', userDataPath)
var moment = require('moment')
var content = document.getElementById("contentDiv")
var sys = {
  modelID: 'unknown',
  isMacBook: false // need to detect if macbook for ffmpeg recording framerate value
}
lowLag.init(); // init audio functions


// get date and time for appending to filenames
function getDateStamp() {
  ts = moment().format('MMMM Do YYYY, h:mm:ss a')
  ts = ts.replace(/ /g, '-') // replace spaces with dash
  ts = ts.replace(/,/g, '') // replace comma with nothing
  ts = ts.replace(/:/g, '-') // replace colon with dash
  console.log('recording date stamp: ', ts)
  return ts
}


// runs when called by systeminformation
function updateSys(ID) {
  sys.modelID = ID
  if (ID.includes("MacBook") == true) {
    sys.isMacBook = true
  }

  //console.log("updateSys has updated!")
  //console.log(ID.includes("MacBook"))
  //console.log(sys.isMacBook)
} // end updateSys

si.system(function(data) {
  console.log(data['model']);
  updateSys(data['model'])
})


// ffmpeg object constructor
function ff() {
  this.ffmpegPath = path.join(appRootDir,'ffmpeg','ffmpeg'),
  this.framerate = function () {

  },
  this.shouldOverwrite = '-y',         // do overwrite if file with same name exists
  this.threadQueSize = '50',           // preallocation
  this.cameraFormat = 'avfoundation',  // macOS only
  this.screenFormat = 'avfoundation',  // macOS only
  this.cameraDeviceID = '0',           // macOS only
  this.audioDeviceID = '0',            // macOS only
  this.screenDeviceID = '1',           // macOS only
  this.videoSize = '1280x720',         // output video dimensions
  this.videoCodec = 'libx264',         // encoding codec
  this.recQuality = '30',              //0-60 (0 = perfect quality but HUGE files)
  this.preset = 'ultrafast',
  this.videoExt = '.mp4',
  // filter is for picture in picture effect
  this.filter = '"[0]scale=iw/8:ih/8 [pip]; [1][pip] overlay=main_w-overlay_w-10:main_h-overlay_h-10"',
  this.isRecording = false,
  this.getSubjID = function() {
    var subjID = document.getElementById("subjID").value
    if (subjID === '') {
      console.log ('subject is blank')
      alert('Participant field is blank!')
      subjID = '0000'
    }
    return subjID
  },
  this.getSessID = function () {
    var sessID = document.getElementById("sessID").value
    if (sessID === '') {
      console.log ('session is blank')
      alert('Session field is blank!')
      sessID = '0000'
    }
    return sessID
  },
  this.datestamp = getDateStamp(),
  this.makeOutputFolder = function () {
    outpath = path.join(app.getPath('userData'), 'video')
    //fs.mkdirSync(path.join(app.getPath('userData'), 'video'))
    if (!fs.existsSync(outpath)) {
      fs.mkdirSync(outpath)
    }
    return outpath
  }
  this.outputFilename = function() {
    return path.join(this.makeOutputFolder(), this.getSubjID()+'_'+this.getSessID()+'_'+getDateStamp()+this.videoExt)
  },
  this.getFramerate = function () {
    if (sys.isMacBook == true){
      var framerate = 30
    } else {
      var framerate = 29.97
    }
    return framerate
  },
  this.startRec = function() {
    cmd = [
      this.ffmpegPath +
      ' ' + this.shouldOverwrite +
      ' -thread_queue_size ' + this.threadQueSize +
      ' -f ' + this.screenFormat +
      ' -framerate ' + this.getFramerate().toString() +
      ' -i ' + '"' + this.screenDeviceID + '"' +
      ' -thread_queue_size ' + this.threadQueSize +
      ' -f ' + this.cameraFormat +
      ' -framerate ' + this.getFramerate().toString() +
      ' -video_size ' + this.videoSize +
      ' -i "' + this.cameraDeviceID + '":"' + this.audioDeviceID + '"' +
      ' -profile:v baseline' +
      ' -c:v ' + this.videoCodec +
      ' -crf ' + this.recQuality +
      ' -preset ultrafast' +
      ' -filter_complex ' + this.filter +
      ' -r ' + this.getFramerate().toString() +
      ' ' + '"' + this.outputFilename() + '"'
    ]
    console.log('ffmpeg cmd: ')
    console.log(cmd)
    this.isRecording = true
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`)
        return
      }
      // console.log(`stdout: ${stdout}`);
      // console.log(`stderr: ${stderr}`);
    })
  },
  this.stopRec = function () {
    exec('killall ffmpeg')
  }
}


// play audio file using lowLag API
function playAudio(fileToPlay) {
  lowLag.load(fileToPlay);
  lowLag.play(fileToPlay);
}


// get timestamp (milliseconds since file loaded)
function getTime() {
  return performance.now()
}


// read csv file. This is how experiments will be controlled, query files to show, etc.
function readCSV(filename){
  var csv = fs.readFileSync(filename)
  var stim = csvsync.parse(csv, {
    skipHeader: false,
    returnObject: true
  })
  //var stim = csvReader(filename)
  console.log(stim)
  return stim
  //stim = readCSV(myfile)
  //console.log(stim)
  //var myfile = __dirname+'/experiments/pnt/assets/txt/pntstim.csv'
}



// remove all child elements from a div, here the convention will be to
// remove the elements from "contentDiv" after a trial
function clearScreen() {
  while (content.hasChildNodes())
  content.removeChild(content.lastChild)
}

var rec = new ff()
// show text instructions on screen
function showInstructions(txt) {
  clearScreen()
  rec.startRec()
  var textDiv = document.createElement("div")
  var p = document.createElement("p")
  var txtNode = document.createTextNode(txt)
  p.appendChild(txtNode)
  textDiv.appendChild(p)
  var lineBreak = document.createElement("br")
  var btnDiv = document.createElement("div")
  var startBtn = document.createElement("button")
  var startBtnTxt = document.createTextNode("Start")
  startBtn.appendChild(startBtnTxt)
  startBtn.onclick = showNextTrial
  btnDiv.appendChild(startBtn)
  content.appendChild(textDiv)
  content.appendChild(lineBreak)
  content.appendChild(btnDiv)
  return getTime()
}


// show single image on screen
function showImage(imgPath) {
  clearScreen()
  var imageEl = document.createElement("img")
  imageEl.src = imgPath
  content.appendChild(imageEl)
  return getTime()
}


// load experiment module js file. All experiments are written in js, no separate html file
function loadJS (ID) {
  if (!document.getElementById(ID +'JS')) {
    expDir = path.join(__dirname, '/experiments/', ID, path.sep)
    scrElement = document.createElement("script")
    scrElement.type = "application/javascript"
    scrElement.src = expDir + ID + '.js'
    scrElement.id = ID + 'JS'
    document.body.appendChild(scrElement)
    console.log('loaded: ', scrElement.src)
    //might need to wait for scrElement.onload event -- test this
    //http://stackoverflow.com/a/38834971/3280952
  }
}


// unload js at the end of experiment run
function unloadJS (ID) {
  if (document.getElementById(ID +'JS')) {
    scrElement = document.getElementById(ID +'JS')
    document.body.removeChild(scrElement)
    console.log('removed: ', ID +'JS')
  }
}


// wait for time (in ms) and then run the supplied function.
// for now, the supplied function can only have one input variable.
// this WILL HANG the gui
function waitThenDoSync(ms, doneWaitingCallback, arg){
   var start = performance.now()
   var end = start;
   while(end < start + ms) {
     end = performance.now()
  }
  if (arg !== undefined) {
    doneWaitingCallback(arg)
  } else {
    doneWaitingCallback()
  }
}


// wait for time (in ms) and then run the supplied function.
// for now, the supplied function can only have one input variable. (this does not hang gui)
function waitThenDoAsync (ms, doneWaitingCallback, arg) {
  start = performance.now()
  setTimeout(function () {
    if (arg !== undefined) {
      doneWaitingCallback(arg)
    } else {
      doneWaitingCallback()
    }
    end = performance.now()
    console.log('Actual waitThenDo() time: ', end - start)
  }, ms)
}


// load video from filename
function loadVideo() {
  clearScreen()
  var video = document.createElement('video')
  var source = document.createElement('source')
  source.type = "video/mp4"
  source.src = "./experiments/phon/assets/video/airplane264.mp4"
  source.id = "videoSrc"
  video.autoPlay = false
  video.id = 'videoElement'
  video.appendChild(source)
  content.appendChild(video)
  video.oncanplay = function () {
    video.play()
  }
  video.onended = function () {
    clearScreen()
  }
}


 // keys object for storing keypress information
var keys = {
  key : '',
  time : 0,
  rt: 0,
  specialKeys: [' ', 'Enter', 'ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Shift', 'Tab', 'BackSpace'],
  alphaNumericKeys: 'abcdefghijklmnopqrstuvwxyz1234567890'.split(''), // inspired by: http://stackoverflow.com/a/31755504/3280952
  whiteList: function () {
    return this.alphaNumericKeys.concat(this.specialKeys)
  },
  blackList: [],
  isAllowed: function () {
    idx = this.whiteList().indexOf(this.key)
    var val = false
    if (idx > 0) {
      val = true
    } else {
      val = false
    }
    return val
  }
}


// experiment object for storing session parameters, etc.
function experiment(name) {
  this.beginTime= 0,
  this.endTime= 0,
  this.duration= 0,
  this.name= name,
  this.rootpath= '',
  this.mediapath= '',
  this.getDuration = function () {
    return this.endTime - this.beginTime
  },
  this.setBeginTime = function() {
    this.beginTime = performance.now()
  },
  this.setEndTime = function () {
    this.endTime = performance.now()
  },
  this.getMediaPath = function () {
    this.mediapath = path.join(__dirname, '/assets/')
    return this.mediapath
  },
  this.getRootPath = function () {
    this.rootpath = path.join(__dirname,'/')
    return this.rootpath
  }
}


// video stimulus object for storing info about presentation
var videoStim = {
  beginTime: 0, //set with performance.now()
  stimType: '', // img, vid, txt, aud
  endTime: 0, // set with performance.now()
  duration: 0,
  file: 'empty',
  name: 'empty',
  ext: '.empty',
  //dir: path.join(experiment.getMediaPath(),'/pics'),
  getDuration: function () {
    return this.endTime - this.beginTime
  },
  setBeginTime: function() {
    this.beginTime = performance.now()
  },
  setEndTime: function() {
    this.endTime = performance.now()
  },
  setFile: function () {
    this.file = path.format({
      dir: this.dir,
      name: this.name,
      ext: this.ext
    })
  }
}


// image stimulus object for storing info about presentation
var imageStim = {
  imageEl: document.getElementById("imageElement"),
  beginTime: 0, //set with performance.now()
  stimType: '', // img, vid, txt, aud
  endTime: 0, // set with performance.now()
  duration: 0,
  file: 'empty',
  name: 'empty',
  ext: '.empty',
  //dir: path.join(experiment.getMediaPath(),'/pics'),
  getDuration: function () {
    return this.endTime - this.beginTime
  },
  setBeginTime: function() {
    this.beginTime = performance.now()
  },
  setEndTime: function() {
    this.endTime = performance.now()
  },
  setSource: function () {
    this.imageEl.src = this.file
  },
  setFile: function () {
    this.file = path.format({
      dir: this.dir,
      name: this.name,
      ext: this.ext
    })
  }
}

// audio stimulus object for storing info about presentation
var audioStim = {
  beginTime: 0, //set with performance.now()
  stimType: '', // img, vid, txt, aud
  endTime: 0, // set with performance.now()
  duration: 0,
  file: 'empty',
  name: 'empty',
  ext: '.empty',
  //dir: path.join(experiment.getMediaPath(),'/pics'),
  getDuration: function () {
    return this.endTime - this.beginTime
  },
  setBeginTime: function() {
    this.beginTime = performance.now()
  },
  setEndTime: function() {
    this.endTime = performance.now()
  },
  setFile: function () {
    this.file = path.format({
      dir: this.dir,
      name: this.name,
      ext: this.ext
    })
  }
}


// default video recording properties stored in the object
var videoRecObj = {
  dir: '',
  name: '',
  ext: '.mp4',
  vCodec: 'libx264',
  aCodec: '',
  saveName: '',
  setSaveName: function () {
    this.saveName = path.format(({
      dir: this.dir,
      name: this.name,
      ext: this.ext
    }))
  }
}


// default audio recording properties stored in the object
var audioRecObj = {
  dir: '',
  name: '',
  ext: '.wav',
  aCodec: '',
  saveName: '',
  setSaveName: function () {
    this.saveName = path.format(({
      dir: this.dir,
      name: this.name,
      ext: this.ext
    }))
  }
}


// update keys object when a keydown event is detected
function updateKeys() {
  // gets called from: document.addEventListener('keydown', updateKeys);
  keys.key = event.key
  keys.time = performance.now() // gives ms
  keys.rt = 0
  console.log("key: " + keys.key)
  if (keys.key === 'ArrowRight') {
    showNextTrial()
  }
  if (keys.key === 'ArrowLeft') {
    showPreviousTrial()
  }
}


// store state of navigation pane
var nav = {
  hidden: false
}


// open navigation pane
function openNav() {
    document.getElementById("navPanel").style.width = "150px"
    document.getElementById("contentDiv").style.marginLeft = "150px"
    document.body.style.backgroundColor = "rgba(0,0,0,0.3)"
    if (document.getElementById("imageElement")) {
      document.getElementById("imageElement").style.opacity = "0.1";
    }
    document.getElementById("closeNavBtn").innerHTML = "&times;"
}


// close navigation pane
function closeNav() {
    document.getElementById("navPanel").style.width = "0px";
    document.getElementById("contentDiv").style.marginLeft= "0px";
    document.getElementById("contentDiv").style.width= "100%";
    document.body.style.backgroundColor = "white";
    //document.getElementById("menuBtn").innerHTML = "&#9776;"
    if (document.getElementById("imageElement")) {
      document.getElementById("imageElement").style.opacity = "1";
    }
}


// toggle navigation pane, detect if hidden or not
function toggleNav() {
  if (nav.hidden) {
    openNav()
    nav.hidden = false
  } else {
    closeNav()
    nav.hidden = true
  }
}


// check if key that was pressed was the escape key or q. Quits experiment immediately
function checkForEscape() {
  key = event.key
  if (key === "Escape" || key=== "q") {
    console.log("Escape was pressed")
    openNav()
    nav.hidden = false
    unloadJS(exp.name)
    clearScreen()
    rec.stopRec()
  }
}

function getStarted() {
  var subjID = document.getElementById("subjID").value
  if (subjID === '') {
    console.log ('subject is blank')
    alert('Participant field is blank!')
  } else {
    console.log ('subject is: ', subjID)
    closeNav()
    showInstructions(instructions)
  }
}




// event listeners that are active for the life of the application
document.addEventListener('keydown', checkForEscape)
document.addEventListener('keydown', updateKeys)
// document.getElementById("videoElement").style.visibility = "hidden"
// document.getElementById("textElement").style.visibility = "hidden"
// document.getElementById("audioElement").style.visibility = "hidden"
// document.getElementById("buttonElement").style.visibility = "hidden"
