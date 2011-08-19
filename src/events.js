(function (Shrike, window, document, Puma, Wildcat, undefined) {

Shrike.addEvent = function (elem, event, func) {
    if (typeof event != 'string') {
        Shrike.each(event, function (func, event) {
            Shrike.addEvent(elem, event, func);
        });
    }
    // TODO: clean this mess up
    var evt = elem[event], old = evt, fn = Shrike.bind(func, elem);
    if (!evt || !evt._shrikeHandlers) {
        evt = elem[event] = function () {
            for (var i = 0, args = arguments, handlers = evt._shrikeHandlers,
            l = handlers.length - 1; i < l; ++i)
                handlers[i].bound.apply(undefined, args);
            if (l + 1)
                return handlers[i].bound.apply(undefined, args);
        };
        evt._shrikeHandlers = old ? [{bound: old, unbound: old}] : [];
    }
    evt._shrikeHandlers.push({bound: fn, unbound: func});
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
    if (elem[event] && (handlers = elem[event]._shrikeHandlers)) {
        for (l = handlers.length; i < l; ++i) {
            if (handlers[i].bound == func || handlers[i].unbound == func ||
            (func.fn && handlers[i].bound == func.fn))
                handlers.splice(i, 1);
        }
    }
    return func;
};

Shrike.delegateEvent = function (elem, event, matches, func) {
    return Shrike.addEvent(elem, event, function () {
        var binding;
        if (binding = matches.apply(elem, arguments))
            func.apply(binding, arguments);
    });
};

Shrike.publisher = function (obj) {
    var channels = {};
    return Shrike.merge(obj || {}, {
        publish: function (channel, args, binding) {
            if (channels[channel])
                channels[channel].apply(binding || null, args);
            return this;
        },
        
        subscribe: function (channel, handler) {
            return Shrike.addEvent(channels, channel, handler);
        }
    });
};

Shrike.normalize = function (evt) {
    evt = evt || window.event;
    return Shrike.extend(evt, { // Some browsers don't like us modifying evt directly
        target: evt.target || evt.srcElement,
        stopPropagation: evt.stopPropagation || function () { this.cancelBubble = true; },
        preventDefault: evt.preventDefault || function () { this.returnValue = false; },
        stop: function () {
            this.preventDefault();
            this.stopPropagation();
        }
    });
};

var readyHandlers = [], isRunning = false, supports = [];
function ieReady() {
    isRunning = true;
    // I stole this idea from somebody, I think it was Diego Perini
    try {
        document.firstChild.doScroll('left');
    }
    catch (e) {
        setTimeout(ieReady, 0);
        return;
    }
    for (var i = 0, l = readyHandlers.length; i < l; ++i)
        readyHandlers[i]();
}

Shrike.ready = function (func) {
    if (document.body) {
        func();
        return;
    }
    if (document.addEventListener)
        document.addEventListener('DOMContentLoaded', func, false);
    else {
        readyHandlers.push(func);
        if (!isRunning)
            ieReady();
    }
    return Shrike;
};

Shrike.match = Wildcat ? function (elem, selector) {
    if (supports[selector] == undefined) {
        supports[selector] = true;
        try {
            Wildcat.compile(selector);
        }
        catch (e) {
            supports[selector] = false;
        }
    }
    return (supports[selector] ? Wildcat.match : Puma.match)(elem, selector);
} : Puma.match;

Shrike.on = Shrike.declaration({}, function (elem, evt, func) {
    evt = 'on' + evt;
    if (typeof func == 'function')
        Shrike.addEvent(elem, evt, func);
    else {
        Shrike.each(func, function (fn, selector) {
            Shrike.delegateEvent(elem, evt, function (e) {
                e = e || window.event;
                var target = e.target || e.srcElement;
                if (Shrike.match(target, selector))
                    return target;
            }, fn);
        });
    }
});

Shrike.off = Shrike.declaration({}, function (elem, evt, func) {
    Shrike.removeEvent(elem, 'on' + evt, func);
});

Shrike.attr.properties['on'] = Shrike.on;
};

})(Shrike, this, document, Puma, this.Wildcat);
