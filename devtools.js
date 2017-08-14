/**
 * Created by michalsela on 21/03/2017.
 */

function getPageResources(){
    stylesheets = {};
    chrome.devtools.inspectedWindow.getResources(function(resources){
        for(var i = 0; i < resources.length; i++) {
            if (resources[i].type == 'stylesheet') {
                (function (resource) {
                    resource.getContent(function (content, encoding) {
                        stylesheets[resource.url] = content;
                        chrome.runtime.sendMessage({ //change to callback method here after get content is finished
                            state: "resource",
                            css: "stylesheets",
                            cssObject: stylesheets
                        });
                    });
                })(resources[i]);
            }
        }
    });
}

function listenToResourceChange(){
    modifiedStylesheets = {};
    chrome.devtools.inspectedWindow.onResourceContentCommitted.addListener(function(resource, content) {
        modifiedStylesheets[resource.url] = content;
        port.postMessage({ state: "modifiedResource",
            css: "modifiedStylesheets",
            cssObject: modifiedStylesheets});

        //TODO check change to async here after get content is finished
        //should i also send styelsheet here? since the inspect element might not be open yet
    });
}

function elementsPanel() {
    chrome.devtools.panels.elements.onSelectionChanged.addListener(
        evalSelectedElem)
}

function evalSelectedElem(){
 chrome.devtools.inspectedWindow.eval("aContentScriptFunction($0)",
            { useContentScriptContext: true });
}

window.addEventListener('load', function() {
    getPageResources();
    listenToResourceChange();
   // evalSelectedElem();
    elementsPanel();
    //listenToElementsPanel();
}, false);


document.addEventListener('DOMContentLoaded', evalSelectedElem);

var port = chrome.runtime.connect({name: "knockknock"});

/*
var sidebar;
chrome.devtools.panels.elements.createSidebarPane("Inspectrum",
    function(extensionSidebar) {
        extensionSidebar.setPage("sidebar.html");
        extensionSidebar.setHeight("8ex");

    });

port.onMessage.addListener(function(msg) {
    if (msg.state == "sidebarPanel")
        sidebar.setObject(msg.css);
});


*/


