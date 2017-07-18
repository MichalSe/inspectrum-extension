/**
 * Created by michalsela on 05/04/2017.
 */

var siteUrl = "https://inspectrumapp.com";
//var siteUrl = "http://localhost:8000";

//chrome.runtime.onConnect.addListener(function(port) {
//  port.onMessage.addListener(function(msg) {
//    if (msg.name == "init")
//       verifyUserLogin(port);
//  });
//});
//var portBP = chrome.runtime.connect();

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.name == "init") {
            verifyUserLogin(sendResponse);
            return true;
        }
        if (request.name == "export") {
                sendResponse({code: getStyleFromInspectrum(), domain: document.location.hostname.replace("www.", "")});

           // var popup = document.getElementsByClassName("inspectrumExport")[0];
           // document.getElementsByClassName("code-innerText")[0].innerHTML = getStyleFromInspectrum();
           // popup.classList.toggle("show");
        }
        else if (request.name == 'modifiedStylesheets' || request.name == 'stylesheets') {
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
        if (request.name == 'stateChange') {
            localStorage.setItem("toggle", request.newState);
             if (request.oldState) {
                saveLastState(request.oldState);
            }
           // if (request.oldState != request.newState) {
                activateNewState(request.newState);
           // }
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
        }
        if (request.name == "tab") {
            sendResponse({tabId: localStorage.getItem("tabId")})
        }
      /*  if (request.name == 'sidebar') {
            sendResponse({state: "sidebar", css : getStyleFromInspectrum()});
        }*/
});

//function updateSidebarPanel(cssText){
//    portBP.postMessage({state: "sidebar", css : cssText})
//}

function clearStateFromLocalStorage() {
    document.getElementById("inspectrum").innerHTML = "";
    localStorage.setItem("inspectrumSheet", "");
    localStorage.setItem("inspectrumDOM", "");
   // localStorage.setItem("toggle", "");
}

function writeStyleToInspectrum() {
    var oldCss = _.find(getStateList(), function(obj) {
                return obj.id == getCurrentStateId();
    });
    document.getElementById("inspectrum").innerHTML =
        oldCss ? mergeBetweenOldAndNewResult(oldCss.css, getStyleFromLocalStorage()) : getStyleFromLocalStorage();;
}

function getStyleFromInspectrum() {
     var oldCss = _.find(getStateList(), function(obj) {
                return obj.id == getCurrentStateId();
    });
    return oldCss ? mergeBetweenOldAndNewResult(oldCss.css, getStyleFromLocalStorage()) : getStyleFromLocalStorage();
}

function getCurrentStateId() {
      //TODO change back in multiple state
    return "default";
    //return localStorage.getItem("toggle");
}

function setStylsheetsInStorage(name, resource){
   localStorage.setItem(name, JSON.stringify(resource));
}

function getModifiedStylesheetFromStorage() {
 return localStorage.getItem('modifiedStylesheets');
}

function getStylesheetFromStorage() {
 return localStorage.getItem('stylesheets');
}

function getStyleFromLocalStorage() {
    var sheet = localStorage.getItem("inspectrumSheet");
    var dom = localStorage.getItem("inspectrumDOM");
    var code = '';
    if (sheet != null && sheet != '' && sheet != 'undefined') {
        code += sheet;
        code += '\n';
    }
    if (dom != null && dom != '' && dom != 'undefined') {
        code += dom;
    }
    return code;
}

function mergeBetweenOldAndNewResult(oldDiff, newDiff) {
    if (oldDiff == null || oldDiff == "undefined" || oldDiff == "") return newDiff;
    if (newDiff == null || newDiff == "undefined" || newDiff == "") return oldDiff;
    var oldDiffObj = css.parse(oldDiff);
    var newDiffObj = css.parse(newDiff);

    var rules = newDiffObj.stylesheet.rules;
    var clonedRules = JSON.parse(JSON.stringify(rules)); //only works JSON-serializable content (eg. no functions)
    var rulesOriginal = oldDiffObj.stylesheet.rules;  ///each rule object is a selector or at-rule
    var counter = 0;

    //for same selectors
    for (var i = 0; i < rules.length; i++) {
        var selectors = rules[i].selectors; //TODO add support to other types of rules (keyframe, media query..)
        if (selectors) {
            for (var k = 0; k < rulesOriginal.length; k++) {
                if (rulesOriginal[k].selectors != null && arraysEqual(rulesOriginal[k].selectors, selectors)) {
                    var merged = merge(rules[i].declarations, rulesOriginal[k].declarations); //each declaration is a property-value
                    //TODO what if there is more than one occurrence? need to merge several times
                    break;
                } else {
                    var merged = null;
                }
            }

            if (typeof merged != "undefined" && merged != null && merged.length > 0) {
                clonedRules[counter].declarations = merged;
            }
        } else {
            clonedRules.splice(counter, 1); // no selector
            counter--;
        }
        counter++;
    }

    // for different selectors - merge into result from old object
    for (var k = 0; k < rulesOriginal.length; k++) {
        var selectors = rulesOriginal[k].selectors;
        var found = false;
        for (var i = 0; i < rules.length; i++) {
            if (rules[i].selectors != null && arraysEqual(rules[i].selectors, selectors)) {
                found = true;
                break;
            }
        }
        if (!found) {
            clonedRules.push(rulesOriginal[k]);
        }
    }
    newDiffObj.stylesheet.rules = clonedRules;
    return css.stringify(newDiffObj);
}

function diffBetweenCssObjects(modifiedCss, oldCss) {
// TODO add checks for modifiedcss and stylesheetcss if exists/null
    var result = '';
    for (var key in modifiedCss) {
        var modifiedCssObject = css.parse(modifiedCss[key], {source: key});
        var oldCssObject = css.parse(oldCss[key], {source: key});
        var rules = modifiedCssObject.stylesheet.rules;
        var clonedRules = JSON.parse(JSON.stringify(rules)); //only works JSON-serializable content (eg. no functions)
        var rulesOriginal = oldCssObject.stylesheet.rules;  ///each rule object is a selector or at-rule
        var counter = 0;
        for (var i = 0; i < rules.length; i++) {
            var selectors = rules[i].selectors;  //TODO add support to other types of rules (keyframe, media query..)

            if (selectors) {
                for (var k = 0; k < rulesOriginal.length; k++) {

                    if (rulesOriginal[k].selectors != null && arraysEqual(rulesOriginal[k].selectors, selectors)) {
                        //relies on ordered files
                        var diff = difference(rules[i].declarations, rulesOriginal[k].declarations); //each declaration is a property-value
                        rulesOriginal.splice(k,1);
                        break;
                    } else {
                        var diff = null;
                    }
                }

                if (typeof diff != "undefined" && diff != null && diff.length > 0) {
                    clonedRules[counter].declarations = diff;
                } else {
                    clonedRules.splice(counter, 1); // no diff they are the same
                    counter--;
                }
            } else {
                clonedRules.splice(counter, 1); // no selector
                counter--;
            }
            counter++;
        }
        modifiedCssObject.stylesheet.rules = clonedRules;
        result += css.stringify(modifiedCssObject); // result for all css files - changes later for different states (array, etc)
    }
    return result;
}

function arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length)
        return false;
    for (var i = arr1.length; i--;) {
        if (arr1[i] !== arr2[i])
            return false;
    }

    return true;
}

function diffBetweenCss(modifiedCss, oldCss) {
    var result = diffBetweenCssObjects(modifiedCss, oldCss);
    result = mergeBetweenOldAndNewResult(localStorage.getItem("inspectrumSheet"), result);
    localStorage.setItem("inspectrumSheet", result);
    saveLastState("default"); //TODO in multiple state send state
}

var difference = function (array) {
    var rest = Array.prototype.concat.apply(Array.prototype, Array.prototype.slice.call(arguments, 1));
    var containsEquals = function (obj, target) {
        if (obj == null) return false;
        return _.any(obj, function (value) {
            return isEqualCss(value, target);
        });
    };
    return _.filter(array, function (value) {
        return !containsEquals(rest, value);
    });
};

function isEqualCss(value, target) {
    return (value.value == target.value) && (value.property == target.property);
}

function isNotEqualCss(value, target) {
    return (value.value == target.value) && (value.property != target.property);
}

// if value == value and property != property take from newer, if doesnt exist add from old.
var merge = function (array) {
    var conflictingValues = function (obj, target) {
        if (obj == null) return false;
        return _.any(obj, function (value) {
            return isNotEqualCss(value, target);
        });
    };
    var sameValues = function (obj, target) {
        if (obj == null) return false;
        return _.any(obj, function (value) {
            return isEqualCss(value, target);
        });
    };
    return _.filter(array, function (value) {
        return sameValues(rest, value);
    });

//remove older properties (conflicting)
// remove every css that is equal? is this a state that exists?
    var rest = Array.prototype.concat.apply(Array.prototype, Array.prototype.slice.call(arguments, 1));
    rest = _.filter(rest, function (value) {
        return !conflictingValues(rest, value) && !sameValues(rest, value);
    });

//merge anything else into newer array
    return _.merge(array, rest);
}

if (!document.getElementById("inspectrum")) {
    var style = document.createElement("style");
    style.type = "text/css";
    style.setAttribute("id", "inspectrum");
    document.getElementsByTagName("head")[0].appendChild(style);
}

/*
var newlink = document.createElement("link");
newlink.href = chrome.extension.getURL("inspectrum.css");
newlink.type = "text/css";
newlink.rel = "stylesheet";
newlink.id = "inspectrum";
document.getElementsByTagName("head")[0].appendChild(newlink);
*/


/*
var domain = document.location.hostname.replace("www.", "");
var exportObj = document.createElement('div');
exportObj.className = "inspectrumExport";
exportObj.innerHTML = '<div class="window-close"></div>' +
    '<div class="domain">'+ domain + '</div>' +
    '<div class="inspectrumExport-title">Quick View Changes</div>' +
    '<div class="inspectrumExport-code">' +
    '<textarea readonly class="code-innerText"></textarea>' +
    '</div>' +
    '<div class="logoContainer"><img src='+chrome.extension.getURL("/icons/icon-active.png")+'><span class="logo">Inspectrum</span></div>' +
    '<div class="logo-smallText">by HackingUI</div>';
document.body.appendChild(exportObj);

$(document).mouseup(function(e)
{
    var container = $(".inspectrumExport");
    // if the target of the click isn't the container nor a descendant of the container
    if (!container.is(e.target) && container.has(e.target).length === 0)
    {
        container.removeClass('show');
    }
});

var link = document.createElement("link");
link.href = chrome.extension.getURL("stylesheets/viewChanges.css");
link.type = "text/css";
link.rel = "stylesheet";
document.getElementsByTagName("head")[0].appendChild(link);

var closePopup = document.getElementsByClassName("window-close")[0];
closePopup.addEventListener("click", function () {
    document.getElementsByClassName("inspectrumExport")[0].classList.toggle("show");
});
*/
function parseCssStyle(arr) {
    var cssString = '';

    for (var i = 0; i < arr.length; i++) {
        cssString += arr[i].key + ' { ' + arr[i].value + ' } ';
    }
    return cssString;
}

//TODO for mutation observer corrupted css
function validateCss(value) {
    //'body { font-size: 12px; }'
   // css.parse(value)
}

var selectedEl ;
function aContentScriptFunction(el){
    console.log(el)
    selectedEl = el;
}
var observer;
function observerElementStyleChange() {
// select the target node
    var target = document.body;
    var mutationArray = [];
// create an observer instance
    observer = new MutationObserver(function (mutations) {
       // console.log(mutations);
        mutations.forEach(function (mutation) {
         //   console.log(mutation); //TODO when page finishes load it grabs some css even after load finishes - img in stackoverflow
            var cssLine = mutation.target.style.cssText.split('/n').pop();
            var key = '';
            if (!selectedEl) return;
            var id = mutation.target.id;
            var className = mutation.target.className;
            if (id) {
                key = '#' + id;
                 if (id != selectedEl.id) return;

            } else if (className) {
                key = '.' + className.toString().replace(/\s/g, ".");
                if (className != selectedEl.className) return;
            }

            if (key) {
                if (mutationArray.length == 0) {
                    mutationArray.push({key: key, value: cssLine});
                } else {
                    var found = false;
                    for (var i = 0; i < mutationArray.length; i++) {
                        if (mutationArray[i].key === key) {
                            mutationArray[i] = {key: key, value: cssLine};
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        mutationArray.push({key: key, value: cssLine});
                    }
                }
            }
        });

        var mergedResult = mergeBetweenOldAndNewResult(localStorage.getItem("inspectrumDOM"), parseCssStyle(mutationArray));
        localStorage.setItem('inspectrumDOM', mergedResult);
        saveLastState("default", true); //TODO in multiple state send state and skipDB until fixing bug
        // no update for style tag inspectrum cause the mutation array already diffs in open tab
       //  updateSidebarPanel(getStyleFromInspectrum())//TODO after fixing bug
    });
// configuration of the observer:
    var config = {attributes: true, attributeFilter: ['style'], subtree: true};

// pass in the target node, as well as the observer options
    observer.observe(target, config);
    return observer;
}

function endObserver(observer) {
// later, you can stop observing
    observer.disconnect();
}

function saveLastState(oldState, skipDB) {
    var oldCss = getStateById(oldState);
    var merged =  oldCss ? mergeBetweenOldAndNewResult(oldCss.css, getStyleFromLocalStorage()) : getStyleFromLocalStorage();
    setStateInList(oldState, merged, skipDB);
}

function activateNewState(state) {

    var foundState = getStateById(state);
    if (foundState) {
        document.getElementById("inspectrum").innerHTML = foundState.css;
    }

    localStorage.setItem("inspectrumDOM", "");
    localStorage.setItem("inspectrumSheet", "");
}

function getStateList() {
    var localStorageStates = localStorage.getItem('stateListInspectrum');
    var stateList = localStorageStates ? JSON.parse(localStorageStates) : "";
    if (stateList == "" || stateList == "undefined" || !stateList) {
        stateList = getStatesFromDB();
    }
    return stateList ? stateList : [];
}

function getStateById(state) {
    var foundState = _.find(getStateList(), function(obj) {
        return (obj.id == state);
    });
    return foundState;

}

function setStateInList(state, cssText, skipDB) {
    var states = getStateList();
    var foundState = _.find(states, function(obj) {
        return obj.id == state;
    });
     if (foundState){
            foundState.css = cssText;
    } else {
         states.push({id: state, css : cssText});
    }
    localStorage.setItem("stateListInspectrum", JSON.stringify(states));
    if (!skipDB) setStateFromDB({id:state, css: cssText}, "POST");
}

function removeStateFromList(state){
    var states = getStateList();
    states = states.filter(function( obj ) {
        return obj.id !== state;
    });
    localStorage.setItem("stateListInspectrum", JSON.stringify(states));
    setStateFromDB({id:state}, "DELETE");
}

function inspectrumRunning(){
    var toggle = localStorage.getItem("toggle");
      return (toggle && toggle != '' && toggle != 'undefined');
}

//TODO find solution for page reload vs new tab
function pageInit() {
    //localStorage.setItem("toggle", "");
    getCookieFromBackground();
    if (inspectrumRunning()) {
        observerElementStyleChange();
        chrome.runtime.sendMessage({state: "initInspectrum"});
        writeStyleToInspectrum();
        //insertStyleToCssFile();
    }
}

pageInit();

var csrf = null;
function getCookieFromBackground() {
     chrome.runtime.sendMessage({state: "cookie"}, function(response){
         csrf = response.token;
    });
}



/*
function insertStyleToCssFile() {
    var storageObj = css.parse(getStyleFromLocalStorage());
    var stylesheet;
    for (var i = 0; i < document.styleSheets.length; i++) {
        if (document.styleSheets[i].ownerNode.id == "inspectrum") {
            stylesheet = document.styleSheets[i];
        }
    }
    //temporary for checking cause local file has issue with access to stylshhet
    stylesheet = document.styleSheets[0];
    if (stylesheet) {
        var rules = storageObj.stylesheet.rules;
        for (var k = 0; k < rules.length; k++) {
            var cssString = rules[k].selectors.join() + " { "; //TODO check array to string
            if (cssString != ".[object.SVGAnimatedString] { ") {
               var declarations = rules[k].declarations;
                for (var i = 0; i < declarations.length; i++) {
                    cssString += declarations[i].property + " : " + declarations[i].value + ";"
                }
                cssString += " } ";
                if (typeof cssString === 'string')
                stylesheet.insertRule(cssString, stylesheet.cssRules ? stylesheet.cssRules.length : 0);
                }
        }
    }
}*/

function getStatesFromDB() {
//TODO get current URL to send to db
    var states = null;
    $.ajax({
		type: 'GET',
		dataType: "json",
		url: siteUrl + "/states/url/" + document.location.hostname + "/",
	 	crossDomain: true,
		success: function (responseData, textStatus, jqXHR) {
            if (responseData && responseData.states)
            states = JSON.parse(responseData.states);
		},
		error: function (responseData, textStatus, errorThrown) {
			console.log('GET failed.');
		}
	});
    return states;
}

function setStateFromDB(state, reqType) {
    chrome.runtime.sendMessage({state:"setStateDB", stateData: state, reqType: reqType, domain: document.location.hostname, csrf: csrf})
}

function verifyUserLogin(sendReponse) {
    getCookieFromBackground();
    $.ajax({
		type: 'GET',
		dataType: "json",
		url: siteUrl + "/verified/",
	 	crossDomain: true,
		success: function (responseData) {
            if (responseData) {
                var verified = JSON.parse(responseData.verified);
                var states = getStateList();
                 sendReponse({toggle: localStorage.getItem("toggle"),
                        states: states,
                        domain: document.location.hostname,
                        logged: verified
                });
            }
		},
		error: function () {
			console.log('GET failed.');
            var states = getStateList();
              port.postMessage({toggle: localStorage.getItem("toggle"),
                        states: states,
                        domain: document.location.hostname,
                        logged: false
                });
		}
	});
}

window.onbeforeunload = function(e) {
    if (inspectrumRunning()) {
        setStateFromDB(getStateById(getCurrentStateId()),"POST");
    }
};