(function (Shrike, undefined) {

function animate(elem, prop, options) {
    prop = prop.replace(/\-(.)/g, function (_, $1) { return $1.toUpperCase(); });
    var o = Shrike.extend(options, {start: undefined, update: undefined, finish: undefined}),
    v = Viper(Shrike.merge({
        object: elem.style,
        property: prop,
        from: o.from || elem.style[prop] || Shrike.computedStyle(elem, prop)
    }, typeof o == 'object' ? o : {to: o}));
    Shrike.each(['start', 'update', 'finish'], function (e) {
        if (!options[e])
            options[e] = [];
        if (!Shrike.isArray(options[e]))
            options[e] = [options[e]];
        Shrike.each(options[e], function (func) {
            func = Shrike.bind(func, elem, [v]);
            // Tie ourselves in knots for Closure Compiler's ADVANCED_OPTIMIZATIONS
            if (e == 'start')
                v.startHandlers.push(func);
            else if (e == 'update')
                v.updateHandlers.push(func);
            else
                v.finishHandlers.push(func);
        });
    });
    return v.start();
}

var push = [].push, opacity = {
    'opacity': function (elem, options) {
        if (typeof elem.style.opacity != 'string') {
            return animate(elem, 'filter', Shrike.merge(options, {
              from: 'alpha(opacity=' + (options.from != undefined ? options.from * 100 :
                  /alpha\(opacity=(\d+)\)/.exec(elem.style.filter)[1] || 100) + ')',
              to: options.to * 100
            }));
        }
        return animate(elem, 'opacity', options);
    }
},

drag = {
    'handle': function (elem, value, vars) {
        vars.handle = typeof value == 'string' ? Jaguar(value, elem) : value;
    },
    
    'start': function (elem, value, vars) {
        vars.startHandlers = vars.startHandlers || [];
        push.apply(vars.startHandlers, Shrike.isArray(value) ? value : [value]);
    },
    
    'finish': function (elem, value, vars) {
        vars.finishHandlers = vars.finishHandlers || [];
        push.apply(vars.finishHandlers, Shrike.isArray(value) ? value : [value]);
    }
};

function dragCleanup(elem, vars) {
    function dragEvt(e) {
        e = e || window.event;
        vars.startHandlers = vars.startHandlers || [];
        for (var i = 0, l = vars.startHandlers.length; i < l; ++i)
            vars.startHandlers[i](elem, e);
        doDrag(elem, e, vars.finishHandlers || []);
        return false; // Prevent text from being highlighted during the drag
    }
    if (vars.handle) {
        for (var i = 0, l = vars.handle.length; i < l; ++i)
            Shrike.addEvent(vars.handle[i], 'onmousedown', dragEvt);
    }
    else
        Shrike.addEvent(elem, 'onmousedown', dragEvt);
}

// Inspired by David Gauer's simpledrag.js (http://ratfactor.com/javascript-drag-and-drop)
function doDrag(elem, evt, handlers) {
    var doc = document, s = elem.style, pos = Shrike.position(elem),
    x = Math.abs(pos.x - evt.clientX), y = Math.abs(pos.y - evt.clientY),
    mm = Shrike.addEvent(doc, 'onmousemove', mousemove),
    mu = Shrike.addEvent(doc, 'onmouseup', mouseup);
    function mousemove(e) {
        e = e || window.event;
        s.left = e.clientX - x + 'px';
        s.top = e.clientY - y + 'px';
    }
    function mouseup(e) {
        e = e || window.event;
        mm.detach();
        mu.detach();
        for (var i = 0, l = handlers.length; i < l; ++i)
            handlers[i](elem, e);
    }
}

Shrike.animate = Shrike.declaration(opacity, animate);

Shrike.drag = Shrike.declaration(drag, function () { }, function () { }, dragCleanup);

})(Shrike);
