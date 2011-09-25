(function (Shrike, XMLHttpRequest, encodeURIComponent, undefined) {

Shrike.toQueryString = function toQueryString(obj, base) {
    var str = [];
    Shrike.each(obj, function (val, key) {
        if (base)
            key = base + '[' + key + ']';
        if (typeof val == 'object')
            str.push(toQueryString(val, key));
        else
            str.push(key + '=' + encodeURIComponent(val));
    });
    return str.join('&');
};

Shrike.ajax = function (options) {
    var request = new XMLHttpRequest(), // I don't support IE 6 :)
    method = options.method ? options.method.toUpperCase() : 'GET',
    headers = options.headers || {},
    data = options.data || '',
    url = options.url + (options.method == 'GET' ? '?' + (
        typeof data == 'string' ? data : Shrike.toQueryString(data)
    ) : ''),
    success = typeof options.success == 'function' ? [options.success] : options.success || [],
    error = typeof options.error == 'function' ? [options.error] : options.error || [];
    if (method == 'POST' && !headers['Content-type'])
        headers['Content-type'] = 'application/x-www-form-urlencoded';
    request.open(method, url, true);
    Shrike.each(headers, function (value, header) {
        request.setRequestHeader(header, value);
    });
    request.onreadystatechange = function () {
        if (request.readyState != 4)
            return;
        Shrike.each(request.status == 200 ? success : error, function (callback) {
            callback(request);
        });
    };
    request.send(method == 'GET' ? undefined : typeof data == 'string' ? Shrike.toQueryString(data) : data)
    return request;
};

})(Shrike, XMLHttpRequest, encodeURIComponent);
