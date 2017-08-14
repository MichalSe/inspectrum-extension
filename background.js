// // Background page -- background.js

var siteUrl = "https://inspectrumapp.com";
//var siteUrl = "http://localhost:8000/";


chrome.runtime.onConnect.addListener(function(port) {
  port.onMessage.addListener(function(msg) {
    if (msg.state == "modifiedResource") {
      if (autoSave) {
        updateModifiedResource(msg);
      }
    }
   /* if (msg.state == "sidebar") {
        port.postMessage({name:"sidebarPanel", css: msg.css});
    }*/
  });

});
 var domain; var code;
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
      switch(request.state) {
          case "initInspectrum":
              autoSave = true;
              chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
              chrome.browserAction.setIcon({
                   path: "icons/icon-active.png", tabId: tabs[0].id
              });
            });
              break;
          case "save":
            autoSave = true;
             chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
                chrome.browserAction.setIcon({
                    path: "icons/icon-active.png", tabId: tabs[0].id
                });
                chrome.tabs.sendMessage(tabs[0].id, {
                    name: 'stateChange',
                    observer: true,
                    oldState: request.oldState,
                    newState: request.newState }, function (response) {
                    // updateModifiedResource(request);
                });
            });
            break;
        case "close":
            chrome.tabs.executeScript({
                code:
                'localStorage.setItem("toggle_inspectrum", "false");'
            });
            chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
                chrome.browserAction.setIcon({
                    path: "icons/icon-inactive.png", tabId: tabs[0].id
                });
                 chrome.tabs.sendMessage(tabs[0].id, {observer: false, oldState: request.oldState}, function (response) {
                });
            });
            autoSave = false;
            removeCss();
            break;
        case "resource":
             chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {name: request.css, resource: request.cssObject}, function (response) {
                });
            });
            break;
          case "cookie":
              chrome.cookies.get({"url": siteUrl, "name": "csrftoken"}, function(cookie) {
                  sendResponse({token: cookie.value});
              });
               return true;
          break;
          case "export":
               chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
                        chrome.tabs.sendMessage(tabs[0].id, {name: "export"}, function (response) {
                            domain = response.domain;
                            code = response.code;
                            chrome.tabs.create({'url': chrome.extension.getURL('viewChanges.html')}, function(){

                            });
                        });
                    });

          break;
          case "exportHtml":
                sendResponse({code: code, domain: domain});
          break;
          case "setStateDB":
              setStateFromDB(request.stateData, request.reqType, request.domain, request.csrf, request.referrer);
              break;
    }
  });

function updateModifiedResource(request){
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
          chrome.tabs.sendMessage(tabs[0].id, {
              name: request.css,
              resource: request.cssObject
          }, function (response) {
               chrome.tabs.sendMessage(tabs[0].id, {name: 'apply'}, function (response) {
             });
          });
    });
}

function removeCss() {
    chrome.tabs.executeScript({
    code:
       'document.getElementById("inspectrum")!= null ? document.getElementById("inspectrum").innerHTML = "" : "";'
    });
}

callback = function(details) {
    details.requestHeaders.push({
        name: 'Referer',
        value: 'chrome-extension://omjeafamcinppohnjbghgfmhnlmiiejd'
    });
    return {
        requestHeaders: details.requestHeaders
    };
};

filter = { urls: ["https://inspectrumapp.com/states/url/*"] };
opts = ['blocking', 'requestHeaders']
chrome.webRequest.onBeforeSendHeaders.addListener(callback, filter, opts);

function setStateFromDB(state, reqType, domain, csrf) {
    $.ajax({
      // A value of 'PUT' or 'DELETE' will trigger a preflight request.
      type: reqType,
      dataType: 'json',
      url:  siteUrl + "/states/url/" + domain + "/",
      contentType: 'application/json',
      beforeSend: function(request) {
           request.setRequestHeader("X-CSRFToken", csrf);
      },
      xhrFields: {
        // The 'xhrFields' property sets additional fields on the XMLHttpRequest.
        // This can be used to set the 'withCredentials' property.
        // Set the value to 'true' if you'd like to pass cookies to the server.
        // If this is enabled, your server must respond with the header
        // 'Access-Control-Allow-Credentials: true'.
        withCredentials: true
      },
      data: JSON.stringify(state),
      success: function(responseData) {
      },
      error: function() {
      }
    });
}
