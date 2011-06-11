(function (Shrike, document) {

Shrike.addEvent = function (elem, event, func) {
    var evt = elem[event], old = evt, fn = Shrike.bind(func, elem);
    if (!evt || !evt.shrikeHandlers) {
        evt = elem[event] = function () {
            for (var i = 0, args = arguments, handlers = evt.shrikeHandlers,
            l = handlers.length - 1; i < l; ++i)
                handlers[i].bound.apply(null, args);
            if (l + 1)
                return handlers[i].bound.apply(null, args);
        };
        evt.shrikeHandlers = old ? [{bound: old, unbound: old}] : [];
    }
    evt.shrikeHandlers.push({bound: fn, unbound: func});
    return {
        fn: fn,
        
        attach: function (elm, evt) {
            Shrike.addEvent(elm || elem, evt || event, fn);
            return this;
        },
        
        detach: function () {
            Shrike.removeEvent(elem, event, fn);
            return this;
        }
    };
};
    
Shrike.removeEvent = function (elem, event, func) {
    var handlers, i = 0, l;
    if (elem[event] && (handlers = elem[event].shrikeHandlers)) {
        for (l = handlers.length; i < l; ++i) {
            if (handlers[i].bound == func || handlers[i].unbound == func ||
            (func.fn && handlers[i].bound == func.fn))
                handlers.splice(i, 1);
        }
    }
    return func;
};

Shrike.publisher = function (obj) {
    var channels = {};
    return Shrike.merge(obj || {}, {
        publish: function (channel, args) {
            if (channels[channel])
                channels[channel].apply(null, args);
            return this;
        },
        
        subscribe: function (channel, handler) {
            return Shrike.addEvent(channels, channel, handler);
        }
    });
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

})(Shrike, document);
