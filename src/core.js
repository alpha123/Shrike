var Shrike = (function () {

function Shrike(selector, context) {
    return Puma(selector, context);
}

Shrike.merge = function (obj1, obj2, func) {
    func = func || function (f) { return f; };
    for (var i in obj2) {
        if (obj2.hasOwnProperty(i))
            obj1[i] = func(obj2[i], i);
    }
    return obj1;
};

Shrike.extend = function (obj1, obj2, func) {
    var newObj = {};
    Shrike.merge(newObj, obj1);
    Shrike.merge(newObj, obj2, func);
    return newObj;
};

Shrike.clone = function (obj) {
    var newObj = {}, i;
    for (i in obj) {
        if (obj.hasOwnProperty(i))
            newObj[i] = obj[i];
    }
    return newObj;
};

// From http://javascript.crockford.com/prototypal.html
Shrike.object = function (obj) {
    function F() { }
    F.prototype = obj;
    return new F();
};

Shrike.first = function () {
    for (var args = arguments, i = 0, l = args.length; i < l; ++i) {
        if (args[i] !== void 0)
            return args[i];
    }
    return null;
};

Shrike.toQueryString = function (obj) {
    var str = [], euc = encodeURIComponent, i;
    for (i in obj) {
        if (obj.hasOwnProperty(i))
            str.push([euc(i), euc(obj[i])].join('='));
    }
    return str.join('&');
};

Shrike.computedStyle = function (elem, prop) {
    prop = prop.replace(/[A-Z]/, function ($0) { return '-' + $0.toLowerCase(); });
    if (window.getComputedStyle)
        return document.defaultView.getComputedStyle(elem, null).getPropertyValue(prop);
    else if (elem.currentStyle)
        return elem.currentStyle[prop];
    return 0;
};

// From http://www.quirksmode.org/js/findpos.html
Shrike.position = function (elem) {
    var x = 0, y = 0;
    do {
        x += elem.offsetLeft;
        y += elem.offsetTop;
    } while (elem = elem.offsetParent);
    return {x: x, y: y};
};

Shrike.create = function (tag) {
    var tree = Puma.Parser.parse(tag), elem, i = 1, l = arguments.length, j, arg,
    undef = void 0;
    if (tree instanceof Puma.AST.Tag)
        elem = document.createElement(tree.value);
    else {
        elem = document.createElement(tree.left.value);
        switch (tree.value) {
            case '#':
                elem.id = tree.right.value;
                break;
        }
    }
    for (; i < l; ++i) {
        arg = arguments[i];
        if (typeof arg == 'string')
            elem.innerHTML += arg;
        else if (arg.nodeType !== undef)
            elem.appendChild(arg.cloneNode(true));
        else if (arg.clone !== undef && arg.node !== undef)
            elem.appendChild(arg.clone ? arg.node.cloneNode(true) : arg.node);
        else {
            for (j in arg) {
                if (arg.hasOwnProperty(j)) {
                    if (j == 'html')
                        elem.innerHTML = arg[j];
                    else
                        elem.setAttribute(j, arg[j]);
                }
            }
        }
    }
    return elem;
};

Shrike.declaration = function (obj, func, init, cleanup) {
    return function (selectors, properties) {
        var pairs = [], elems, props, vars, i, j = 0, k, l, m, n;
        if (properties)
            pairs.push(selectors.length === void 0 ? [selectors] : selectors, properties, {});
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

Shrike.style = Shrike.declaration({}, function (elem, prop, value) {
    elem.style[prop.replace(/\-(\w)/g, function (_, $1) { return $1.toUpperCase(); })] = value;
});

function nodeManipulator(func, after) {
    return function (elem, nodes) {
        var clone = true, undef = void 0, vars = {};
        if (nodes.node !== undef || nodes.nodes !== undef) {
            vars = nodes;
            if (nodes.clone !== undef)
                clone = nodes.clone;
            nodes = nodes.node ? nodes.node : nodes.nodes;
        }
        if (!(nodes instanceof Array))
            nodes = [nodes];
        for (var i = 0, l = nodes.length; i < l; ++i)
            func(elem, nodes[i], clone, vars);
        if (after)
            after(elem, nodes, clone, vars);
    };
}

function removeAll(array, obj) {
    for (var i = 0, l = array.length; i < l; ++i) {
        if (array[i] === obj)
            array.splice(i, 1);
    } 
}

var manipulate = {
    'append': nodeManipulator(function (elem, node, clone, vars) {
        vars.frag = vars.frag || document.createDocumentFragment();
        vars.frag.appendChild(clone ? node.cloneNode(true) : node);
    }, function (elem, nodes, clone, vars) {
        elem.appendChild(vars.frag);
    }),
        
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
    
    'top': nodeManipulator(function (elem, node, clone) {
        elem.insertBefore(clone ? node.cloneNode(true) : node, elem.firstChild);
    }),
    
    'bottom': this['append'],
    
    'before': nodeManipulator(function (elem, node, clone) {
        elem.parentNode.insertBefore(clone ? node.cloneNode(true) : node, elem);
    }),
    
    'after': nodeManipulator(function (elem, node, clone) {
        elem.parentNode.insertBefore(clone ? node.cloneNode(true) : node, elem.nextSibling);
    })
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
    
    'html': function (elem, value) {
        elem.innerHTML = value;
    }
};

Shrike.manipulate = Shrike.declaration(manipulate, function () { });

Shrike.attr = Shrike.declaration(attr, function (elem, prop, value) {
    elem.setAttribute(prop, value);
});

return Shrike;

})();
