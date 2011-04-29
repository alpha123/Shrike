(function (Shrike) {

Shrike.addEvent = function (elem, event, func, thisObj, argArray) {
    thisObj = thisObj || elem;
    argArray = argArray || [];
    var evt = elem[event], old = evt;
    if (!evt || !evt.handlers) {
        evt = elem[event] = function () {
            var i = 0, args = argArray.slice.call(arguments), handlers = evt.handlers,
            l = handlers.length - 1;
            args.unshift.apply(args, argArray);
            for (; i < l; ++i)
                handlers[i].apply(thisObj, args);
            if (l + 1)
                return handlers[i].apply(thisObj, args);
        };
        evt.handlers = old ? [old] : [];
    }
    evt.handlers.push(func);
    return func;
};
    
Shrike.removeEvent = function (elem, event, func) {
    var handlers, i = 0, l;
    if (elem[event] && (handlers = elem[event].handlers)) {
        for (l = handlers.length; i < l; ++i) {
            if (handlers[i] == func)
                handlers.splice(i, 1);
        }
    }
    return func;
};

var readyHandlers = [], isRunning = false;
function ieReady() {
    isRunning = true;
    try {
        document.documentElement.doScroll('left');
    }
    catch (e) {
        setTimeout(ieReady, 0);
        return;
    }
    for (var i = 0, l = readyHandlers.length; i < l; ++i)
        readyHandlers[i]();
}

Shrike.ready = function (func) {
    if (document.addEventListener)
        document.addEventListener('DOMContentLoaded', func, false);
    else {
        readyHandlers.push(func);
        if (!isRunning)
            ieReady();
    }
    return Shrike;
};

Shrike.on = Shrike.declaration({}, function (elem, evt, func) {
    Shrike.addEvent(elem, 'on' + evt, func);
});

Shrike.off = Shrike.declaration({}, function (elem, evt, func) {
    Shrike.removeEvent(elem, 'on' + evt, func);
});

})(Shrike);
