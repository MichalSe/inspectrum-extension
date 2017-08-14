/**
 * Created by michalsela on 31/07/2017.
 */
//********************
// css parsing functions
//********************
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
    result = mergeBetweenOldAndNewResult(localStorage.getItem("sheet_inspectrum"), result);
    localStorage.setItem("sheet_inspectrum", result);
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

function parseCssStyle(arr) {
    var cssString = '';

    for (var i = 0; i < arr.length; i++) {
        cssString += arr[i].key + ' { ' + arr[i].value + ' } ';
    }
    return cssString;
}

//TODO for mutation observer corrupted css validate in parseCssStyle
function validateCss(value) {
    //'body { font-size: 12px; }'
   // css.parse(value)
}

//********************
// local storage functions
//********************

function clearStateFromLocalStorage() {
    document.getElementById("inspectrum").innerHTML = "";
    localStorage.setItem("sheet_inspectrum", "");
    localStorage.setItem("DOM_inspectrum", "");
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
   localStorage.setItem(name + '_inspectrum', JSON.stringify(resource));
}

function getModifiedStylesheetFromStorage() {
 return localStorage.getItem('modifiedStylesheets_inspectrum');
}

function getStylesheetFromStorage() {
 return localStorage.getItem('stylesheets_inspectrum');
}

function getStyleFromLocalStorage() {
    var sheet = localStorage.getItem("sheet_inspectrum");
    var dom = localStorage.getItem("DOM_inspectrum");
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

function closeToggleInStorage() {
    localStorage.setItem("toggle_inspectrum", "false");
}

//********************
// DB functions
//********************

function setStateInDB(state, reqType) {
    chrome.runtime.sendMessage({state:"setStateDB", stateData: state, reqType: reqType, domain: document.location.hostname, csrf: csrf})
}

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

//********************
// state functions
//********************

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

    localStorage.setItem("DOM_inspectrum", "");
    localStorage.setItem("sheet_inspectrum", "");
}

function getStateList() {
    var localStorageStates = localStorage.getItem('state_list_inspectrum');
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
    localStorage.setItem("state_list_inspectrum", JSON.stringify(states));
    if (!skipDB) setStateInDB({id:state, css: cssText}, "POST");
}

function removeStateFromList(state){
    var states = getStateList();
    states = states.filter(function( obj ) {
        return obj.id !== state;
    });
    localStorage.setItem("state_list_inspectrum", JSON.stringify(states));
    setStateInDB({id:state}, "DELETE");
}

//********************
// mutation observer functions
//********************
var observer;
function observerElementStyleChange() {
// select the target node
    var target = document.body;
    var mutationArray = [];
// create an observer instance
    observer = new MutationObserver(function (mutations) {
       // console.log(mutations);
        mutations.forEach(function (mutation) {
            var cssLine = mutation.target.style.cssText.split('/n').pop();
            var key = '';
            if (!getSelectedEl()) return;
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

        var mergedResult = mergeBetweenOldAndNewResult(localStorage.getItem("DOM_inspectrum"), parseCssStyle(mutationArray));
        localStorage.setItem('DOM_inspectrum', mergedResult);
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

//********************
// init functions
//********************
function inspectrumRunning(){
    var toggle = localStorage.getItem("toggle_inspectrum");
      return (toggle && toggle != '' && toggle != 'undefined' && toggle != 'false');
}

//TODO find solution for page reload vs new tab
function inspectrumPageInit() {
    if (inspectrumRunning()) {
        observerElementStyleChange();
        chrome.runtime.sendMessage({state: "initInspectrum"});
        writeStyleToInspectrum();
        //insertStyleToCssFile();
    }  
}

function inspectrumTagInit() {
    if (!document.getElementById("inspectrum")) {
        var style = document.createElement("style");
        style.type = "text/css";
        style.setAttribute("id", "inspectrum");
        document.getElementsByTagName("head")[0].appendChild(style);
    }
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
