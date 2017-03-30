const settings = require('electron-settings');

function checkCloudSettings() {
  useCloud = settings.get('useCloud')
  if (useCloud === true) {
    menu.items[4].submenu.items[0].checked= true
  } else if (useCloud === false) {
    menu.items[4].submenu.items[0].checked= false
  } else if (typeof(useCloud) === "undefined") {
    console.log ("useCloud was undefined")
    settings.set('useCloud', true)
    menu.items[4].submenu.items[0].checked= true
  }
}

function toggleCloudSetting() {
  useCloud = settings.get('useCloud')
  if (useCloud === true) {
    menu.items[4].submenu.items[0].checked= false
    settings.set('useCloud', false)
    console.log("useCloud is now false")
  } else if (useCloud === false) {
    menu.items[4].submenu.items[0].checked= true
    settings.set('useCloud', true)
    console.log("useCloud is now true")
  }
}

function checkForCloudOptions() {
  savePath = path.join(app.getPath('userData'), 'Data')
  var userHome = app.getPath('home')
  var boxSyncDir = path.join(userHome,'Box Sync')
  var dropboxDir = path.join(userHome,'Dropbox')
  var dropboxCstarDir = path.join(userHome,'Dropbox (C-STAR)')
  // Box Sync will be rarely used, so check it first
  if (fs.existsSync(boxSyncDir)) {
    savePath = boxSyncDir
    console.log("save path is: ", savePath)
    return savePath
  } else if (fs.existsSync(dropboxCstarDir)) {
    savePath = dropboxCstarDir
    console.log("save path is: ", savePath)
    return savePath
  } else if (fs.existsSync(dropboxDir)) {
    savePath = dropboxDir
    console.log("save path is: ", savePath)
    return savePath
  }
  console.log("save path is: ", savePath)
  return savePath
}

document.addEventListener('DOMContentLoaded', checkCloudSettings);
document.addEventListener('DOMContentLoaded', checkForCloudOptions);
