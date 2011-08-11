(function (window, document, Puma, undefined) {

function Shrike() {
    return Puma.apply(Puma, arguments);
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
            if (hasOwn.call(arg, j))
                obj[j] = func.call(arg, arg[j], j);
        }
    }
    return obj;
};

var old = window.Shrike, hasOwn = ({}).hasOwnProperty, slice = [].slice,
features = (function () {
    var test = document.createElement('table'), features = {brokenInnerHTML: false},
    broken = ['COL', 'COLGROUP', 'FRAMESET', 'HEAD', 'HTML', 'STYLE', 'TABLE', 'TBODY', 'TFOOT',
    'THEAD', 'TITLE', 'TR'];
    try {
        // IE lt 8? doesn't support innerHTML on COL, COLGROUP, FRAMESET, HEAD, HTML, STYLE,
        // TABLE, TBODY, TFOOT, THEAD, TITLE, or TR elements
        test.innerHTML = '<tr><td></td></tr>';
    }
    catch (e) {
        features.brokenInnerHTML = function (name) {
            return Puma.arrayIndexOf(broken, name.toUpperCase()) > -1;
        };
    }
    Shrike.merge(features, Puma.features);
    return features;
})(),
usefulElement = document.createElement('div'),
modify = {  
    'destroy': nodeManipulator(function (elem, node) {
        if (node == 'self')
            elem.parentNode.removeChild(elem);
        else if (node == 'all') {
            while (elem.lastChild) // Can't just use innerHTML = '' because it's read-only for some elements in IE
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
                for (cls = value.remove.split(' '), i = 0, l = cls.length; i < l; ++i)
                    removeAll(classes, cls[i]);
            }
            str = classes.join(' ');
            if (str.charAt(0) == ' ')
                str = str.substr(1);
            elem.className = str;
        }
    },
    
    'style': function (elem, value) {
        Shrike.style(elem, value);
    },
    
    'html': function (elem, value) {
        if (features.brokenInnerHTML && features.brokenInnerHTML(elem.nodeName))) {
            Shrike.modify(elem, {'destroy': 'all'});
            usefulElement.innerHTML = '<' + elem.nodeName + '>' + value + '</' + elem.nodeName + '>';
            var frag = document.createDocumentFragment();
            // I don't know why I have to convert the nodeList to an array. Shrike.each does behave differently
            // if the 1st argument is an array, but there is an optional 3rd argument to force it to treat the 1st
            // argument like an array. Unfortunately -- like iterating over it manually -- that throws a DOMException.
            Shrike.each(slice.call(usefulElement.firstChild.childNodes), Shrike.bind(frag.appendChild, frag));
            elem.appendChild(frag);
            usefulElement.innerHTML = '';
        }
        else
            elem.innerHTML = value;
    },
    
    'text': function (elem, value) {
        if (elem.innerText !== undefined)
            elem.innerText = value;
        else
            elem.textContent = value;
    }
}, attrDeclaration;

Shrike.declaration = function (obj, func, init, cleanup) {
    function fn(selectors, properties) {
        var pairs = [], elems, props, vars, returnval = [], i, j = 0, k, l, m, n;
        if (properties && !properties.nodeType)
            pairs.push(selectors.length == undefined ? [selectors] : selectors, properties, {});
        else {
            for (i in selectors) {
                if (hasOwn.call(selectors, i))
                    pairs.push(Puma(i, properties), selectors[i], {});
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
                    if (hasOwn.call(props, l)) {
                        if (hasOwn.call(obj, l) && typeof obj[l] == 'function')
                            returnval.push(obj[l](elems[m], props[l], vars));
                        else if (func)
                            returnval.push(func(elems[m], l, props[l], vars));
                    }
                }
                if (cleanup)
                    cleanup(elems[m], vars);
            }
        }
        return Array(returnval.length).join() == returnval ? // Check if the array is empty
        [] : returnval.length == 1 ? returnval[0] : returnval;
    }
    fn.declaration = {properties: obj, missing: func, init: init, cleanup: cleanup};
    return fn;
};

attrDeclaration = Shrike.declaration(attr, function (elem, prop, value) {
    if (value == null)
        elem.removeAttribute(prop);
    else if (Puma.fixAttrs[attr])
        elem[Puma.fixAttrs[attr]] = value;
    else
        elem.setAttribute(prop, value);
});

Shrike.merge(Shrike, {
    extend: function () {
        var args = slice.call(arguments);
        args.unshift({});
        return Shrike.merge.apply(Shrike, args);
    },
    
    inherit: Puma.Parser.create,
    
    each: function (obj, func, forceArray) {
        var i = 0, l = obj.length;
        if (forceArray == undefined ? Shrike.isArray(obj) : forceArray) {
            for (; i < l; ++i)
                func.call(obj, obj[i], i);
        }
        else {
            for (i in obj) {
                if (hasOwn.call(obj, i))
                    func.call(obj, obj[i], i);
            }
        }
        return obj;
    },
    
    keys: function (obj) {
        if (Object.keys)
            return Object.keys(obj);
        var keys = [];
        Shrike.each(obj, function (_, key) { keys.push(key); }, false);
        return keys;
    },
    
    inspect: function (obj, sep, linesep, keyFunc, valueFunc) {
        sep = sep || ': ';
        function noop(x) { return x; }
        keyFunc = keyFunc || noop;
        valueFunc = valueFunc || noop;
        var str = [], i;
        for (i in obj) {
            if (hasOwn.call(obj, i))
                str.push([keyFunc(i), valueFunc(obj[i])].join(sep));
        }
        return str.join(linesep || '\n');
    },
    
    bind: function (func, thisObj, preArgs, postArgs) { // Intentionally not compatible with ES5
        return function () {
            var args = slice.call(arguments);
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
        if (!isNaN(pos))
            modify['before'](elem.children[pos - 1], nodes);
    }),
    
    destroy: function (elem) {
        Shrike.modify(elem.length != undefined ? elem : arguments, {'destroy': 'self'});
    },
    
    append: function (elem, child) {
        if (typeof child == 'string')
            child = Shrike.create.apply(Shrike, slice.call(arguments, 1));
        Shrike.modify(elem, {'bottom': child});
    },

    attr: function (elems, attr) {
        if (typeof attr == 'string') {
            if (elems.length == undefined)
                return Puma.getAttribute(elems, attr);
            for (var values = [], i = 0, l = elems.length; i < l; ++i)
                values.push(Puma.getAttribute(elems[i], attr));
            return values;
        }
        return attrDeclaration.apply(Shrike, arguments);
    },

    style: Shrike.declaration({}, function (elem, prop, value) {
        elem.style[prop.replace(/\-(.)/g, function (_, $1) { return $1.toUpperCase(); })] = value;
    }),
    
    chain: function (elems, base) {
        if (typeof elems == 'string')
            elems = Puma(elems);
        if (elems.length == undefined)
            elems = [elems];
        var chained = Shrike.extend(base || Shrike, function (func) {
            if (func.chain) {
                return function () {
                    var args = slice.call(arguments);
                    args.unshift(elems);
                    return func.chain.apply(chained, args);
                };
            }
            if (func.declaration) {
                return function (props, value) {
                    if (value !== undefined) {
                        var name = props;
                        props = {};
                        props[name] = value;
                    }
                    func.call(chained, elems, props);
                    return chained;
                };
            }
            return function () {
                for (var args = slice.call(arguments), result = [], i = 0, l = elems.length; i < l; ++i)
                    result.push(func.apply(chained, [elems[i]].concat(args)));
                return Array(result.length).join() == result ? chained : result;
            };
        });
        chained.nodes = elems;
        return chained;
    },
    
    noConflict: function () {
        window.Shrike = old;
        return Shrike;
    },
    
    features: features
});

Shrike.merge(Shrike.attr, {
    properties: attr,
    declaration: attrDeclaration.declaration,
    chain: function (elem, attr, value) {
        var name, result;
        if (value != undefined) {
            name = attr;
            attr = {};
            attr[name] = value;
        }
        result = Shrike.attr(elem, attr);
        return typeof attr == 'string' ? result : this;
    }
});

Shrike.each.chain = Shrike.each;

window.Shrike = Shrike;

})(this, document, Puma);
