

document.addEventListener('DOMContentLoaded', function() {

    //loading toggle state
    var previousState = null;
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {name: "init"}, function (response) {
            if (!response) return;
            $('.js-name').html(response.domain.replace("www.", ""));
            $('.js-loader').hide();
            $('.js-img').attr("src","http://www.google.com/s2/favicons?domain="+ response.domain);
            if (response.logged) {
                if (response.states && response.states.length > 0) {
                    initStatesFromStorage(response.states);
                } else {
                    var state = stateMarkup('default');
                    $('.js-stateList').append(state);
                }
                if (response.toggle == "true") {
                    previousState = $('*[data-state="' + response.id + '"]').prop('checked', true);
                     $('.js-underToggleText').html("Inspectrum is recording...")
                } else {
                    $('.js-underToggleText').html("Turned Off")
                }
            } else {
                $('.js-login').addClass('show');
                $('.js-underToggleText').hide();
            }
        });
    });

  /*  chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {name: "init"}, function (response) {
                if (!response) return;
                $('.js-name').html(response.domain.replace("www.", ""));
                $('.js-loader').hide();
                $('.js-img').attr("src","http://www.google.com/s2/favicons?domain="+ response.domain);
                if (response.logged) {
                    if (response.states && response.states.length > 0) {
                        initStatesFromStorage(response.states);
                    } else {
                        var state = stateMarkup('default');
                        $('.js-stateList').append(state);
                    }
                    if (response.toggle) {
                        previousState = $('*[data-state="' + response.toggle + '"]').prop('checked', true);
                         $('.js-underToggleText').html("Inspectrum is recording...")
                    } else {
                        $('.js-underToggleText').html("Turned Off")
                    }
                } else {
                    $('.js-login').addClass('show');
                    $('.js-underToggleText').hide();
                }

            });
    });*/


    $('.js-stateList').on('change', '.js-toggleState', function(){
        if ($(this).is(':checked')) {
            $('.js-underToggleText').html("Inspectrum is recording...")
            chrome.runtime.sendMessage({
                state: 'save',
                oldState: previousState ? previousState.data('state'): '',
                newState: $(this).data('state')
            });
            previousState = $(this);
            $('input:checkbox').not(this).prop('checked',false);
        }
        if ($('input:checkbox:checked').length == 0) {
           chrome.runtime.sendMessage({state: "close", oldState: $(this).data('state')});
             $('.js-underToggleText').html("Turned Off")
        }
    });

   //TODO add support for clearing each state
   // $('.js-clearState').on('click', function() {
   //     var stateInput = $(this).next().children('.js-toggleState');
   //     chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
   //         chrome.tabs.sendMessage(tabs[0].id, {name: "clearState", id: stateInput.data('state')}, function (response) {
   //             $(stateInput).closest("li").remove();
   //         });
   //     });
   // });
     $('.js-clearState').on('click', function() {
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            //chrome.tabs.sendMessage(tabs[0].id, {name: "clearState", id: stateInput.data('state')}, function (response) {
            chrome.tabs.sendMessage(tabs[0].id, {name: "clearState", id: $('.js-toggleState').data('state')}, function (response) {
            });
        });
    });

    $('.js-view-share').on('click', function(){
         chrome.runtime.sendMessage({state: "export", oldState: $(this).data('state')});
         /*chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {name: "export"}, function (response) {
                window.close();
            });
        });*/
    });
    //for multiple states:
    //var newState = document.getElementsByClassName('addState-plus')[0];
  //  var inputStateName = document.getElementsByClassName('addState-input')[0];

  /*  newState.addEventListener('click', function() {
        inputStateName.value = "";
        if ($('.stateList li').length > 3) {
            return;
        }*/
     //   inputStateName.classList.toggle("show");

  //  });

   /* inputStateName.addEventListener('keyup', function(e) {
        if (e.keyCode != 13) return;
        this.classList.toggle("show");
        var id = $(this).val();
        if (!id) return;
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {name: "addState", id: id}, function (response) {
                var state = stateMarkup(id);
                $('.js-stateList').append(state);
            });
        });
        $(this).val = "";
    });*/
});

function initStatesFromStorage(states) {
    for (var i = 0; i < states.length; i++ ){
         var state = stateMarkup(states[i].id);
         $('.js-stateList').append(state);
    }
}

function stateMarkup(id) {
    return '<li class ="state-item">' +
               // id +
             //'<i class="fa fa-trash clearState js-clearState" aria-hidden="true"></i>' +
                '<label class="switch">' +
                    '<input type="checkbox" class="toggleState js-toggleState" data-state="' + id+'">' +
                    '<div class="slider round"></div>' +
                '</label>' +
            '</li>';
}

$.getScript('https://www.w3schools.com/lib/w3.js', function()
{
    w3.includeHTML();
});
