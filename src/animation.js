(function (Shrike, undefined) {

function animate(elem, prop, options) {
    prop = prop.replace(/\-(\w)/g, function (_, $1) { return $1.toUpperCase(); });
    if (options.from !== undefined)
        elem.style[prop] = options.from;
    if (typeof options == 'string' || typeof options == 'number')
        options = {to: options};
    for (var vars = {
        from: '' + Shrike.first(options.from, Shrike.computedStyle(elem, prop)),
        to: '' + options.to,
        speed: Shrike.first(options.speed, options.increment, 5) / 10,
        delay: Shrike.first(options.delay, 20),
        finishHandlers: options.finish ? Shrike.isArray(options.finish) ?
        options.finish : [options.finish] : [],
        updateHandlers: options.update ? Shrike.isArray(options.update) ?
        options.update : [options.update] : []
    }, prefix = [], timer, currValue, target, down, divBy = 1,
    i = 0, j = 0, l = vars.from.length, ch, ch2; i < l; ++i) {
        ch = vars.from.charAt(i);
        ch2 = vars.from.charAt(i + 1);
        if ((ch == '-' && ch2 > '/' && ch2 < ':') || (ch > '/' && ch < ':'))
            break;
        prefix.push(ch);
    }
    prefix = prefix.join('');
    currValue = parseFloat(vars.from.substring(i));
    target = vars.to.substring(i);
    if (target < 1 && target > 0) {
        for (l = target.substring(target.indexOf('.') + 1).length; j < l; ++j)
            divBy *= 10;
    }
    target = parseFloat(target);
    currValue *= divBy;
    down = target < currValue;
    timer = setInterval(function () {
        var intify = parseInt, k = 0, l;
        if ((!down && currValue / divBy >= target) || (down && currValue / divBy <= target)) {
            clearInterval(timer);
            elem.style[prop] = vars.to;
            for (l = vars.finishHandlers.length; k < l; ++k)
                vars.finishHandlers[k](elem);
        }
        else {
            currValue += down ? -vars.speed : vars.speed;
            elem.style[prop] = prefix + currValue / divBy + vars.to.substring(vars.to.indexOf(target) + ('' + target).length);
            for (l = vars.updateHandlers.length; k < l; ++k)
                vars.updateHandlers[k](elem);
        }
    }, vars.delay);
}

var opacity = {
    'opacity': function (elem, options) {
        if (typeof options == 'string' || typeof options == 'number')
            options = {to: options};
        animate(elem, 'opacity', Shrike.extend(options, {
          to: options.to / 100
        }));
        var vars = Shrike.extend(options, {
            from: options.from !== undefined ? 'alpha(opacity=' + parseInt(options.from) + ')' : 'alpha(opacity=100)',
            to: 'alpha(opacity=' + options.to + ')',
            speed: Shrike.first(options.speed, options.increment, 5) * 10
        });
        animate(elem, 'filter', vars);
    }
},

drag = {
    'handle': function (elem, value, vars) {
        vars.handle = typeof value == 'string' ? Puma(value, elem) : value;
    },
    
    'start': function (elem, value, vars) {
        vars.startHandlers = vars.startHandlers || [];
        [].push.apply(vars.startHandlers, Shrike.isArray(value) ? value : [value]);
    },
    
    'finish': function (elem, value, vars) {
        vars.finishHandlers = vars.finishHandlers || [];
        [].push.apply(vars.finishHandlers, Shrike.isArray(value) ? value : [value]);
    }
};

function dragCleanup(elem, vars) {
    function dragEvt(e) {
        e = e || window.event;
        vars.startHandlers = vars.startHandlers || [];
        for (var i = 0, l = vars.startHandlers.length; i < l; ++i)
            vars.startHandlers[i](elem, e);
        doDrag(elem, e, vars.finishHandlers || []);
        return false;
    }
    if (vars.handle) {
        for (var i = 0, l = vars.handle.length; i < l; ++i)
            Shrike.addEvent(vars.handle[i], 'onmousedown', dragEvt);
    }
    else
        Shrike.addEvent(elem, 'onmousedown', dragEvt);
}

// Technique inspired by David Gauer's simpledrag.js http://ratfactor.com/javascript-drag-and-drop
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
