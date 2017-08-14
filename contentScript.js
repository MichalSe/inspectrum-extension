/**
 * Created by michalsela on 05/04/2017.
 */
var csrf = null;
var siteUrl = "https://inspectrumapp.com";
//var siteUrl = "http://localhost:8000";

var selectedEl;
function aContentScriptFunction(el){
    selectedEl = el;
}

function getSelectedEl(){
    return selectedEl;
}
// Retrieve content script code from storage
var UPDATE_INTERVAL = 2 * 60 * 60 * 1000; // Update after 2 hour
chrome.storage.local.get({
    lastUpdated_inspectrum: 0,
    code_inspectrum: ''
}, function(items) {
    if (Date.now() - items.lastUpdated_inspectrum > UPDATE_INTERVAL) {
        // Get updated file, and if found, save it.
        get('https://static.inspectrumapp.com/contentScriptFunctions.js', function(code) {
            if (!code) return;
            chrome.storage.local.set({lastUpdated_inspectrum: Date.now(), code_inspectrum: code});
        });
    }
    if (items.code_inspectrum) // Cached csfunctions Version is available, use it
        execute(items.code_inspectrum);
    else // No cached version yet. Load from extension
        get(chrome.extension.getURL('contentScriptFunctions.js'), execute);
});


function execute(code) {
    try {
       eval(code);
    } catch (e) {
        console.log(e);
    }

    // If your extension depends on csfunctions, initialize it from here.
    inspectrumTagInit();
    inspectrumPageInit();

    chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.name == "init") {
            getCookieFromBackground();
            userLogin(sendResponse);
            return true;
        }
        if (request.name == 'stateChange') {
            localStorage.setItem("toggleName_inspectrum", request.newState);
            localStorage.setItem("toggle_inspectrum", "true");
            if (request.oldState) {
                saveLastState(request.oldState);
            }
           // if (request.oldState != request.newState) {
                activateNewState(request.newState);
           // }
        }
        if (!inspectrumRunning()) return;

        if (request.name == "export") {
                sendResponse({code: getStyleFromInspectrum(), domain: document.location.hostname.replace("www.", "")});

           // var popup = document.getElementsByClassName("inspectrumExport")[0];
           // document.getElementsByClassName("code-innerText")[0].innerHTML = getStyleFromInspectrum();
           // popup.classList.toggle("show");
        }
        if (request.name == 'modifiedStylesheets' || request.name == 'stylesheets') {
            setStylsheetsInStorage(request.name,request.resource);

            if (request.name == "modifiedStylesheets") {
                var modified = getModifiedStylesheetFromStorage();
                var original = getStylesheetFromStorage();
                if (modified != "undefined" && original != "undefined") {
                    diffBetweenCss(JSON.parse(modified), JSON.parse(original));
                }
            }
        }
        if (request.observer === true) {
            observer = observerElementStyleChange();
        }
        if (request.observer === false) {
            endObserver(observer);
            if (request.oldState) {
                saveLastState(request.oldState);
            }
        }
        // modified resource + DOM + merge with previous state specific changes
        if (request.name == 'apply') {
            writeStyleToInspectrum();
           // updateSidebarPanel(getStyleFromInspectrum())
        }

        if (request.name == 'addState') {
            setStateInList(request.id, "");
        }
        if (request.name == 'clearState') {
            //TODO CHANGE BACK IN MULTIPLE STATES, change logic for toggle in storage (removed in init)
            // TODO or add last state (id) and toggle will be true/false
           // removeStateFromList(request.id);
            if (getCurrentStateId() == request.id) {
                clearStateFromLocalStorage();
                setStateInList(request.id,"");
            }
            location.reload();
        }
        if (request.name == "tab") {
            sendResponse({tabId: localStorage.getItem("tabId")})
        }
    });

    window.onbeforeunload = function(e) {
        if (inspectrumRunning()) {
            setStateInDB(getStateById(getCurrentStateId()),"POST");
        }
    };

    function userLogin(sendReponse) {
        $.ajax({
            type: 'GET',
            dataType: "json",
            url: siteUrl + "/verified/",

            crossDomain: true,
            success: function (responseData) {
                if (responseData) {
                    var verified = JSON.parse(responseData.verified);
                    var states = getStateList();
                     sendReponse({toggle: localStorage.getItem("toggle_inspectrum"),
                            id: getCurrentStateId(),
                            states: states,
                            domain: document.location.hostname,
                            logged: verified
                    });
                }
            },
            error: function (response) {
                console.log('GET failed. ');
                //closeToggleInStorage();
                var states = getStateList();
                  sendReponse({toggle: localStorage.getItem("toggle_inspectrum"),
                            id: getCurrentStateId(),
                            states: states,
                            domain: document.location.hostname,
                            logged: false
                    });
            }
        });
    }
}

function get(url, callback) {
    var x = new XMLHttpRequest();
    x.onload = x.onerror = function() { callback(x.responseText); };
    x.open('GET', url);
    x.send();
}

function getCookieFromBackground() {
     chrome.runtime.sendMessage({state: "cookie"}, function(response){
         csrf = response.token;
    });
}
