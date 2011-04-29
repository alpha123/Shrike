(function (Shrike) {

function addReadyStateChange(request, successHandlers, errorHandlers, elem) {
    request.onreadystatechange = function () {
        if (request.readyState != 4)
            return;
        var i, l, result;
        if (request.status == 200) {
            if (successHandlers.length == 0)
                elem.innerHTML = request.responseText;
            for (i = 0, l = successHandlers.length; i < l; ++i) {
                result = successHandlers[i](elem, request);
                if (typeof result == 'string') {
                    if (i == 0)
                        elem.innerHTML = '';
                    elem.innerHTML += result;
                }
            }
        }
        else {
            for (i = 0, l = errorHandlers.length; i < l; ++i)
                errorHandlers[i](elem, request);
        }
    };
}

Shrike.ajax = function (selectors, props) {
    var successHandlers = [], errorHandlers = [], options = {},
    ajax = {
        'url': function (_, url) {
            options.url = url;
        },
        
        'success': function (_, handler) {
            successHandlers.push(handler);
        },
        
        'error': function (_, handler) {
            errorHandlers.push(handler);
        },
        
        'get': function (elem, data) {
            var request = new XMLHttpRequest(); // I don't support IE 6 :-)
            request.open('GET', [options.url, typeof data == 'string' ? data :
            Shrike.toQueryString(data)].join('?'), true);
            addReadyStateChange(request, successHandlers, errorHandlers, elem);
            request.send(null);
        },
    
        'post': function (elem, data) {
            var request = new XMLHttpRequest();
            request.open('POST', options.url, true);
            request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
            addReadyStateChange(request, successHandlers, errorHandlers, elem);
            request.send(typeof data == 'string' ? data : Shrike.toQueryString(data));
        }
    };
    return Shrike.declaration(ajax, function () { })(selectors, props);
};

})(Shrike);
