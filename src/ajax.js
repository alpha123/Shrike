(function (Shrike, encodeURIComponent) {

function addReadyStateChange(request, successHandlers, errorHandlers, elem) {
    request.onreadystatechange = function () {
        if (request.readyState != 4)
            return;
        var i, l, result;
        if (request.status == 200) {
            if (successHandlers.length == 0)
                elem.innerHTML = request.responseText;
            for (i = 0, l = successHandlers.length; i < l; ++i) {
                result = successHandlers[i](request, elem);
                if (typeof result == 'string' && elem) {
                    if (i == 0)
                        elem.innerHTML = '';
                    elem.innerHTML += result;
                }
            }
        }
        else {
            for (i = 0, l = errorHandlers.length; i < l; ++i)
                errorHandlers[i](request, elem);
        }
    };
}

Shrike.toQueryString = function toQueryString(obj, base) {
    var str = [], i, v;
    for (i in obj) {
        if (obj.hasOwnProperty(i)) {
            v = obj[i];
            if (base)
                i = base + '[' + i + ']';
            if (typeof v == 'object')
                str.push(toQueryString(v, i));
            else
                str.push(i + '=' + encodeURIComponent(v));
        }
    }
    return str.join('&');
};

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

})(Shrike, encodeURIComponent);
