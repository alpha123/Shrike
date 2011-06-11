var Shrike = (function (document, undefined) {

function Shrike(selector, context) {
    return Puma(selector, context);
}

function nodeManipulator(func, after) {
    return function (elem, nodes) {
        var clone = true, vars = {};
        if (nodes.node !== undefined || nodes.nodes !== undefined) {
            vars = nodes;
            if (nodes.clone !== undefined)
                clone = nodes.clone;
            nodes = nodes.node ? nodes.node : nodes.nodes;
        }
        if (!Shrike.isArray(nodes))
            nodes = [nodes];
        for (var i = 0, l = nodes.length; i < l; ++i)
            func(elem, nodes[i], clone, vars);
        if (after)
            after(elem, nodes, clone, vars);
    };
}

function nodeAdder(add) {
    return nodeManipulator(function (elem, node, clone, vars) {
        vars.frag = vars.frag || document.createDocumentFragment();
        vars.frag.appendChild(node);
    }, function (elem, nodes, clone, vars) {
        add(elem, clone ? vars.frag.cloneNode(true) : vars.frag, vars);
    });
}

function removeAll(array, obj) {
    for (var i = 0, l = array.length; i < l; ++i) {
        if (array[i] === obj)
            array.splice(i, 1);
    } 
}

var modify = {  
    'destroy': nodeManipulator(function (elem, node) {
        if (node == 'self')
            elem.parentNode.removeChild(elem);
        else if (node == 'all') {
            while (elem.lastChild) // Can't just use innerHTML = '' because it's read-only for tables in IE
                elem.removeChild(elem.lastChild);
        }
        else
            elem.removeChild(node);
    }),
    
    'top': nodeAdder(function (elem, frag) { elem.insertBefore(frag, elem.firstChild); }),
    
    'bottom': nodeAdder(function (elem, frag) { elem.appendChild(frag); }),
    
    'before': nodeAdder(function (elem, frag) { elem.parentNode.insertBefore(frag, elem); }),
    
    'after': nodeAdder(function (elem, frag) { elem.parentNode.insertBefore(frag, elem.nextSibling); })
},

attr = {
    'class': function (elem, value) {
        if (typeof value == 'string')
            elem.className = value;
        else {
            var classes = elem.className.split(' '), str, cls, i = 0, l;
            if (value.add) {
                for (cls = value.add.split(' '), l = cls.length; i < l; ++i)
                    classes.push(cls[i]);
            }
            if (value.remove) {
                for (cls = value.remove.split(' '), l = cls.length; i < l; ++i)
                    removeAll(classes, cls[i]);
            }
            str = classes.join(' ');
            if (str.charAt(0) == ' ')
                str = str.substring(1);
            elem.className = str;
        }
    },
    
    'style': function (elem, value) {
        Shrike.style(elem, value);
    },
    
    'on': function (elem, value) {
        if (Shrike.on)
            Shrike.on(elem, value);
    },
    
    'html': function (elem, value) {
        elem.innerHTML = value;
    }
};

Shrike.declaration = function (obj, func, init, cleanup) {
    return function (selectors, properties) {
        var pairs = [], elems, props, vars, i, j = 0, k, l, m, n;
        if (properties)
            pairs.push(selectors.length === undefined ? [selectors] : selectors, properties, {});
        else {
            for (i in selectors) {
                if (selectors.hasOwnProperty(i))
                    pairs.push(Puma(i), selectors[i], {});
            }
        }
        for (k = pairs.length; j < k; ++j) {
            elems = pairs[j];
            props = pairs[++j];
            vars = pairs[++j];
            for (m = 0, n = elems.length; m < n; ++m) {
                if (init)
                    init(elems[m], vars);
                for (l in props) {
                    if (props.hasOwnProperty(l)) {
                        if (obj.hasOwnProperty(l) && typeof obj[l] == 'function')
                            obj[l](elems[m], props[l], vars);
                        else if (func)
                            func(elems[m], l, props[l], vars);
                    }
                }
                if (cleanup)
                    cleanup(elems[m], vars);
            }
        }
        return Shrike;
    };
};

Shrike.merge = function (obj) {
    var args = arguments, arg, l = args.length - 1, i = 1, j, func;
    if (typeof args[l] == 'function')
        func = args[l];
    else {
        func = function (x) { return x; };
        ++l;
    }
    while (i < l) {
        arg = args[i++];
        for (j in arg) {
            if (arg.hasOwnProperty(j))
                obj[j] = func.call(arg, arg[j], j);
        }
    }
    return obj;
};

Shrike.merge(Shrike, {
    extend: function () {
        var args = [].slice.call(arguments);
        args.unshift({});
        return Shrike.merge.apply(Shrike, args);
    },
    
    clone: function () {
        return Shrike.extend.apply(Shrike, arguments);
    },
    
    // From http://javascript.crockford.com/prototypal.html
    inherit: function (obj) {
        function F() { }
        F.prototype = obj;
        return new F();
    },
    
    first: function () {
        for (var args = arguments, i = 0, l = args.length; i < l; ++i) {
            if (args[i] !== undefined)
                return args[i];
        }
        return null;
    },
    
    inspect: function (obj, sep, linesep, keyFunc, valueFunc) {
        sep = sep || ': ';
        function noop(x) { return x; }
        keyFunc = keyFunc || noop;
        valueFunc = valueFunc || noop;
        var str = [], i;
        for (i in obj) {
            if (obj.hasOwnProperty(i))
                str.push([keyFunc(i), valueFunc(obj[i])].join(sep));
        }
        return str.join(linesep || '\n');
    },
    
    bind: function (func, thisObj, preArgs, postArgs) { // Intentionally not compatible with ES5
        return function () {
            var args = [].slice.call(arguments);
            args.unshift.apply(args, preArgs || []);
            args.push.apply(args, postArgs || []);
            return func.apply(thisObj, args);
        };
    },
    
    isArray: function (obj) {
        return ({}).toString.call(obj) == '[object Array]';
    },
    
    computedStyle: function (elem, prop) {
        if (window.getComputedStyle)
            return document.defaultView.getComputedStyle(elem, null).getPropertyValue(
            prop.replace(/[A-Z]/, function ($0) { return '-' + $0.toLowerCase(); }));
        else if (elem.currentStyle)
            return elem.currentStyle[prop];
        return 0;
    },
    
    // From http://www.quirksmode.org/js/findpos.html
    position: function (elem) {
        var x = 0, y = 0;
        do {
            x += elem.offsetLeft;
            y += elem.offsetTop;
        } while (elem = elem.offsetParent);
        return {x: x, y: y};
    },
    
    size: function (elem) {
        return {height: elem.offsetHeight, width: elem.offsetWidth};
    },
    
    create: function (tag) {
        var tokens = Puma.Scanner.tokenize(tag),
        elem = document.createElement(tokens[0].value), i = 1, l = arguments.length,
        j, k = 1, m = tokens.length, attr, arg,
        frag = document.createDocumentFragment();
        while (k < m) {
            switch (tokens[k++].value) {
                case '#':
                    elem.id = tokens[k].value;
                    break;
                case '.':
                    Shrike.attr(elem, {'class': {add: tokens[k].value}});
                    break;
                case '[':
                    attr = {};
                    attr[tokens[k].value] = tokens[k += 2].value;
                    Shrike.attr(elem, attr);
                    break;
                case ':':
                    if (tokens[k].value == 'contains')
                        elem.innerHTML += tokens[k += 2].value;
                    break;
            }
        }
        while (i < l) {
            arg = arguments[i++];
            if (typeof arg == 'string')
                elem.innerHTML += arg;
            else if (arg.nodeType)
                frag.appendChild(arg.cloneNode(true));
            else if (arg.node)
                frag.appendChild(arg.clone ? arg.node.cloneNode(true) : arg.node);
            else
                Shrike.attr(elem, arg);
        }
        elem.appendChild(frag);
        return elem;
    },
    
    modify: Shrike.declaration(modify, function (elem, position, nodes) {
        var pos = parseInt(position);
        if (pos != 'x' - 2) // NaN
            modify['before'](elem.children[pos - 1], nodes);
    }),

    attr: Shrike.declaration(attr, function (elem, prop, value) {
        if (value === null)
            elem.removeAttribute(prop);
        else
            elem.setAttribute(prop, value);
    }),

    style: Shrike.declaration({}, function (elem, prop, value) {
        elem.style[prop.replace(/\-(\w)/g, function (_, $1) { return $1.toUpperCase(); })] = value;
    })
});

return Shrike;

})(document);
