/**
 * Created by michalsela on 14/06/2017.
 */

document.addEventListener('DOMContentLoaded', function() {
    chrome.runtime.sendMessage({state: "exportHtml"}, function(response) {
        document.getElementsByClassName("code-innerText")[0].innerHTML = response.code;
        document.getElementsByClassName("domain")[0].innerHTML = response.domain;
    });
});