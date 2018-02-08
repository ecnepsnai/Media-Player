const {app, dialog} = require('electron').remote;
const playerWindow = require('electron').remote.getCurrentWindow();
const ipc = require('electron').ipcRenderer;

let playbackOptions = {
    shuffle: false,
    promptDelete: true,
    permDelete: false
};

$(function() {
    syncApplicationMenu();
    $('#welcome').show();
    var os = require('os');
    if (os.type() === 'Darwin') {
        $('#welcome').css({
            'padding-top': '1em'
        });
    }
});

$('#shuffle').change(toggleShuffle);
function toggleShuffle() {
    playbackOptions.shuffle = !playbackOptions.shuffle;
    $('#shuffle').prop('checked', playbackOptions.shuffle);
    syncApplicationMenu();
}

$('#delete_prompt').change(togglePrompt);
function togglePrompt() {
    playbackOptions.promptDelete = !playbackOptions.promptDelete;
    $('#delete_prompt').prop('checked', playbackOptions.promptDelete);
    syncApplicationMenu();
}

$('#perm_delete').change(togglePerm);
function togglePerm() {
    playbackOptions.permDelete = !playbackOptions.permDelete;
    $('#perm_delete').prop('checked', playbackOptions.permDelete);
    syncApplicationMenu();
}

function syncApplicationMenu() {
    let menu = app.getApplicationMenu();

    let shuffleMenu = menu.getMenuItemById('toggleShuffle');
    let promptMenu = menu.getMenuItemById('togglePrompt');
    let permMenu = menu.getMenuItemById('toggleDelete');

    shuffleMenu.checked = playbackOptions.shuffle;
    promptMenu.checked = playbackOptions.promptDelete;
    permMenu.checked = playbackOptions.permDelete;

    playerWindow.setMenu(menu);
}

document.addEventListener('keydown', function(event) {
    if (event.key === 'ArrowLeft' || event.key === 'j') {
        changeMedia(true);
    } else if (event.key === 'ArrowRight' || event.key === 'k') {
        changeMedia(false);
    } else if (event.key === 'Backspace' || event.key === 'Delete' || event.key === 'x') {
        deleteMedia();
    }
});

var files;
var currentFileIdx;
const $browser = $('#browser');
const $title = $('#title');
const fs = require('fs');
const trash = require('trash');
const SUPPORTED_MEDIA_TYPES = [
    '.webm',
    '.webp',
    '.mp4',
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.bmp'
];

$browser.on('mouseenter', function() {
    $title.show();
});
$browser.on('mouseleave', function() {
    $title.hide();
});

// Menu Handlers
ipc.on('open_single_file', function() {
    browseForSingleFile();
});
ipc.on('open_directory', function() {
    browseForDirectory();
});
ipc.on('toggleShuffle', toggleShuffle);
ipc.on('togglePrompt', togglePrompt);
ipc.on('togglePerm', togglePerm);
ipc.on('sync_menu', syncApplicationMenu);


function errorDialog(title, message) {
    dialog.showMessageBox({
        type: 'error',
        buttons: ['Dismiss'],
        defaultId: 0,
        title: title,
        message: message
    });
}

function buildFileArray(path) {
    try {
        var fileList = [];
        fs.readdirSync(path).forEach(function(file) {
            if (isMediaFile(file)) {
                fileList.push(path + '/' + file);
            }
        });
        return playbackOptions.shuffle ? fileList.shuffle() : fileList;
    } catch(e) {
        errorDialog('Error', 'Error occurred while locating media files: ' + e);
    }
}

function isMediaFile(file) {
    for (var i = 0, count = SUPPORTED_MEDIA_TYPES.length; i < count; i++) {
        if (file.toLowerCase().endsWith(SUPPORTED_MEDIA_TYPES[i])) {
            return true;
        }
    }
    return false;
}

function showMedia() {
    var media = files[currentFileIdx];
    $title.html(media + '<br>' + (currentFileIdx + 1) + '/' + files.length);
    if (media.toLowerCase().endsWith('.webm') || media.toLowerCase().endsWith('.mp4')) {
        var $video = $('<video loop class="media" controls loop></video>');
        $video.attr('src', files[currentFileIdx]);
        $browser.empty();
        $browser.append($video);
        $video[0].play();
    } else {
        var $img = $('<img class="media">');
        $img.attr('src', files[currentFileIdx]);
        $browser.empty();
        $browser.append($img);
    }
    sizeMedia();
}

function sizeMedia() {
    var $media = $('.media');
    $media.css({
        'max-height': window.innerHeight,
        'max-width': window.innerWidth
    });
}
window.onresize = sizeMedia;

function changeMedia(back) {
    if (!files) {
        return;
    }

    if (!back) {
        if (currentFileIdx >= files.length - 1) {
            currentFileIdx = 0;
        } else {
            currentFileIdx++;
        }
    } else {
        if (currentFileIdx === 0) {
            currentFileIdx = files.length - 1;
        } else {
            currentFileIdx--;
        }
    }
    showMedia();
}

function deleteMedia() {
    if (!files) {
        return;
    }

    var doDelete = function() {
        try {
            var file = files[currentFileIdx];
            if (playbackOptions.permDelete) {
                fs.unlinkSync(file);
            } else {
                trash([file]).catch(() => {
                    fs.unlinkSync(file);
                });
            }
            files.splice(currentFileIdx, 1);
            if (files.length === 0) {
                $('#welcome').show();
                $browser.empty();
                $browser.hide();
            } else {
                if (currentFileIdx === files.length) {
                    currentFileIdx = 0;
                }
                showMedia();
            }
        } catch(e) {
            errorDialog('Error', 'Error while deleting media file: ' + e);
        }
    };

    if (playbackOptions.promptDelete) {
        dialog.showMessageBox({
            type: 'warning',
            buttons: ['Yes', 'No'],
            defaultId: 0,
            title: 'Delete File',
            message: 'Are you sure you wish to delete this file?'
        }, function(cancel) {
            if (!cancel) {
                doDelete();
            }
        });
    } else {
        doDelete();
    }
}

function browseForDirectory() {
    var pathArr = dialog.showOpenDialog({
        title: 'Open Media Directory',
        message: 'Select directory containing media files',
        properties: ['openDirectory']
    });
    if (pathArr && pathArr.length === 1) {
        var path = pathArr[0];
        files = buildFileArray(path);
        if (files.length > 0) {
            toggleToPlayer();
        } else {
            errorDialog('No supported files', 'No compatible media files were located. Supported files are: ' + SUPPORTED_MEDIA_TYPES.join(', '));
        }
    }
}

function browseForSingleFile() {
    var pathArr = dialog.showOpenDialog({
        title: 'Open Media File',
        message: 'Select the media file to play',
        properties: ['openFile'],
        filters: [
            {
                name: 'Supported media types',
                extensions: SUPPORTED_MEDIA_TYPES.map(function(ext) {
                    return ext.substring(1);
                })
            }
        ]
    });
    if (pathArr && pathArr.length === 1) {
        var path = pathArr[0];
        if (isMediaFile(path)) {
            files = [path];
            toggleToPlayer();
        } else {
            errorDialog('No supported files', 'No compatible media files were located. Supported files are: ' + SUPPORTED_MEDIA_TYPES.join(', '));
        }
    }
}

function toggleToPlayer() {
    currentFileIdx = 0;
    $('#welcome').hide();
    $browser.show();
    resizeWindow();
    showMedia();
    $('body').toggleClass('light', false);
    $('body').toggleClass('dark', true);
}

function resizeWindow() {
    let current = playerWindow.getBounds();

    playerWindow.setBounds({
        x: current.x,
        y: current.y,
        width: 890,
        height: 510,
    });
    playerWindow.setResizable(true);
    playerWindow.setFullScreenable(true);
}

Array.prototype.shuffle = function() {
    let counter = this.length;
    while (counter > 0) {
        let index = Math.floor(Math.random() * counter);
        counter--;
        let temp = this[counter];
        this[counter] = this[index];
        this[index] = temp;
    }

    return this;
};

$('#open_dir_button').on('click', browseForDirectory);
$('#open_file_button').on('click', browseForSingleFile);
