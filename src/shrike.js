function Puma(selector, context) {
    var pc = Puma.parseCache, tree;
    if (pc[selector])
        tree = pc[selector];
    else {
        tree = Puma.Parser.parse(selector);
        pc[selector] = tree;
        pc.push(selector);
        if (pc.length > Puma.parseCacheSize)
            pc[pc.shift()] = void 0;
    }
    return tree.evaluate(context || document);
}

Puma.parseCache = [];
Puma.parseCacheSize = 100;

Puma.AST = {
    Tag: function (value) {
        this.value = value;
        this.evaluate = function (context) {
            var result = context.getElementsByTagName(value);
            if (result instanceof Object)
                return [].slice.call(result);
            return Puma.arrayFilter(result, function () { return true; });
        };
    },
    
    BinOp: function (value, left, right) {
        this.value = value;
        this.left = left;
        this.right = right;
        this.evaluate = function (context) {
            var op = Puma.operators.binary[value], matches = [], elems, i;
            if (op.noIter)
                return op(this.left, this.right, context);
            elems = context.getElementsByTagName('*');
            i = elems.length;
            while (i--) {
                if(op(elems[i], this.left, this.right, context))
                    matches.push(elems[i]);
            }
            return matches;
        };
    },
    
    UnOp: function (value, right) {
        this.value = value;
        this.right = right;
        this.evaluate = function (context) {
            var op = Puma.operators.unary[value], matches = [], elems, i;
            if (op.noIter)
                return op(this.right, context);
            elems = context.getElementsByTagName('*');
            i = elems.length;
            while (i--) {
                if(op(elems[i], this.right, context))
                    matches.push(elems[i]);
            }
            return matches;
        };
    }
};

// A scanner and top-down operator precendence parser for CSS selectors.
// Technique and code inspired by Douglas Crockford's article
// "Top Down Operator Precendence"
// http://javascript.crockford.com/tdop/tdop.html

Puma.Scanner = {
    tokenize: function (selector) {
        var current = selector.charAt(0), i = 0, from, str, oper,
        length = selector.length, tokens = [], chars = '0123456789-_';
    
        function makeToken(type, value) {
            return {
                type: type,
                value: value,
                from: from,
                to: i,
                error: function (message) {
                    throw new Error(message);
                }
            };
        }
        function test(character) {
            return ((character >= 'a' && character <= 'z') || (character >= 'A'
            && character <= 'Z') || chars.indexOf(character) >= 0) && character;
        }
        while (current) {
            from = i;
            if (current == ' ') {
                current = selector.charAt(++i);
                var old = selector.charAt(i - 2);
                if ((test(current) || current == '*' || Puma.operators.unary[current]) &&
                (test(old) || old == '*'))
                    tokens.push(makeToken('op', ' '));
            }
            else if (test(current)) {
                str = [current];
                ++i;
                while (1) {
                    current = selector.charAt(i);
                    if (test(current)) {
                        str.push(current);
                        ++i;
                    }
                    else
                        break;
                }
                tokens.push(makeToken('ident', str.join('')));
            }
            else if (current == '"' || current == "'") {
                str = [];
                var quote = current;
                while (1) {
                    current = selector.charAt(++i);
                    if (current < ' ')
                        makeToken('ident', str.join('')).error('Bad string');
                    if (current == quote)
                        break;
                    if (current == '\\') {
                        if (++i >= length)
                            makeToken('ident', str.join('')).error('Bad string');
                        current = '\\' + selector.charAt(i);
                    }
                    str.push(current);
                }
                tokens.push(makeToken('ident', str.join('')));
                current = selector.charAt(++i);
            }
            else if (current == '*' && selector.charAt(i + 1) != '=') {
                tokens.push(makeToken('ident', current));
                current = selector.charAt(++i);
            }
            else {
                oper = [current];
                current = selector.charAt(++i);
                var old = selector.charAt(i - 1);
                if ((current == '*' || !test(current)) && current != ' ' && old != '[' &&
                old != ']' && old != '(' && old != ')' && current != '"' && current != "'") {
                    oper.push(current);
                    current = selector.charAt(++i);
                }
                tokens.push(makeToken('op', oper.join('')));
            }
        }
        return tokens;
    }
};

Puma.Parser = {
    parse: function (selector) {
        var symbols = {}, token, tokens = Puma.Scanner.tokenize(selector),
        tokenNum = 0, result, i;
        
        function advance(id) {
            if (id && token.id != id)
                token.error('Expected ' + id + ', not ' + token.id);
            if (tokenNum >= tokens.length) {
                token = symbols['(end)'];
                return;
            }
            var tok = tokens[tokenNum++], val = tok.value, type = tok.type,
            prevTok = tokens[tokenNum - 2], node, i;
            if (type == 'ident') {
                node = new Puma.AST.Tag(val);
                node.nud = function () {
                    return this;
                };
                node.led = null;
                node.lbp = 0;
            }
            else if (type == 'op') {
                if (!symbols[val])
                    tok.error('Unknown operator ' + val);
                if (Puma.operators.unary[val] && (!prevTok ||
                (prevTok.type == 'op' && prevTok.value != ']' && prevTok.value != ')')))
                    node = new Puma.AST.UnOp(val, tok.right);
                else
                    node = new Puma.AST.BinOp(val, tok.right, tok.left);
                for (i in symbols[val])
                    node[i] = symbols[val][i];
            }
            else
                tok.error('Unexpected token ' + val);
            token = node;
            token.from = tok.from;
            token.to = tok.to;
            token.value = token.id = val;
            token.arity = type;
            token.error = tok.error;
            return token;
        }
        
        function expression(rbp) {
            var left, tok = token;
            advance();
            left = tok.nud();
            while (rbp < token.lbp) {
                tok = token;
                advance();
                left = tok.led(left);
            }
            return left;
        }

        function symbol(id, bindingPower) {
            bindingPower = bindingPower || 0;
            var sym = symbols[id];
            if (sym) {
                if (bindingPower >= sym.lbp)
                    sym.lbp = bindingPower;
            }
            else {
                sym = {
                    error: function (message) {
                        throw new Error(message);
                    },
                    
                    nud: function () {
                        this.error('Undefined. ' + id);
                    },
            
                    led: function (left) {
                        this.error('Missing operator.');
                    },
                    
                    lbp: bindingPower
                };
                sym.id = sym.value = id;
                symbols[id] = sym;
            }
            return sym;
        }
        
        function infix(id, bindingPower, led) {
            var sym = symbol(id, bindingPower);
            sym.led = led || function (left) {
                this.left = left;
                this.right = expression(bindingPower);
                this.arity = 'binary';
                return this;
            };
            return sym;
        }
        
        function prefix(id, nud) {
            var sym = symbol(id);
            sym.nud = nud || function () {
                this.right = expression(10);
                this.arity = 'unary';
                return this;
            };
        }

        symbol(']');
        symbol(')');
        symbol('(end)');
        symbol('(ident)');
        
        for (i in Puma.operators.binary)
            infix(i, Puma.operators.binary[i].precendence || 10);
        
        infix('[', 20, function (left) {
            this.left = left;
            this.right = expression(0);
            this.arity = 'binary';
            advance(']');
            return this;
        });
        
        infix('(', 20, function (left) {
            this.left = left;
            this.right = expression(0);
            this.arity = 'binary';
            advance(')');
            return this;
        });
        
        for (i in Puma.operators.unary)
            prefix(i);
        
        prefix('[', function () {
            this.right = expression(0);
            this.arity = 'unary';
            advance(']');
            return this;
        });
        
        advance();
        result = expression(0);
        advance('(end)');
        result.query = selector;
        result.tokens = tokens;
        return result;
    }
};

(function () {

function arrayIndexOf(array, elem) {
    if (array.indexOf)
        return array.indexOf(elem);
    for (var i = 0, l = array.length; i < l; ++i) {
        if (array[i] === elem)
            return i;
    }
    return -1;
}

function arrayFilter(array, func) {
    if (array.filter)
        return array.filter(func);
    for (var newArray = [], i = 0, l = array.length; i < l; ++i) {
        if (func(array[i], i))
            newArray.push(array[i]);
    }
    return newArray;
}

Puma.arrayIndexOf = arrayIndexOf;
Puma.arrayFilter = arrayFilter;

Puma.operators = {
    unary: {
        '#': function (right, context) {
            if (context.getElementById) {
                var elem = context.getElementById(right.value);
                return elem ? [elem] : [];
            }
            return arrayFilter(context.getElementsByTagName('*'), function (e) {
                return e.id == right.value;
            });
        },
        
        '.': function (right, context) {
            if (context.getElementsByClassName)
                return [].slice.call(context.getElementsByClassName(right.value));
            return arrayFilter(context.getElementsByTagName('*'), function (e) {
                return arrayIndexOf(e.className.split(' '), right.value) >= 0;
            });
        },
        
        ':': function (right, context) {
            return Puma.operators.binary[':'](new Puma.AST.Tag('*'), right, context);
        },
        
        '::': function (right, context) {
            return Puma.operators.binary['::'](new Puma.AST.Tag('*'), right, context);
        },
        
        '[': function (right, context) {
            return Puma.operators.binary['['](new Puma.AST.Tag('*'), right, context);
        }
    },
    
    binary: {
        '#': function (left, right, context) {
            var leftNodes = left.evaluate(context), elem;
            if (context.getElementById) {
                elem = context.getElementById(right.value);
                if (arrayIndexOf(leftNodes, elem) >= 0)
                    return [elem];
                else
                    return [];
            }
            return arrayFilter(context.getElementsByTagName('*'), function (e) {
                return e.id == right.value && arrayIndexOf(leftNodes, e) >= 0;
            });
        },
        
        '.': function (left, right, context) {
            var leftNodes = left.evaluate(context);
            if (context.getElementsByClassName) {
                return arrayFilter(context.getElementsByClassName(right.value),
                function (e) {
                    return arrayIndexOf(leftNodes, e) >= 0;
                });
            }
            return arrayFilter(context.getElementsByTagName('*'), function (e) {
                return arrayIndexOf(e.className.split(' '), right.value) >= 0 &&
                arrayIndexOf(leftNodes, e) >= 0;
            });
        },
        
        ',': function (left, right, context) {
            for (var leftNodes = left.evaluate(context),
            rightNodes = right.evaluate(context), i = 0, l = rightNodes.length;
            i < l; ++i) {
               if (arrayIndexOf(leftNodes, rightNodes[i]) < 0)
                    leftNodes.push(rightNodes[i]);
            }
            return leftNodes;
        },
        
        '>': function (left, right, context) {
            var leftNodes = left.evaluate(context);
            return arrayFilter(right.evaluate(context), function (e) {
                return arrayIndexOf(leftNodes, e.parentNode) >= 0;
            });
        },
        
        ' ': function (left, right, context) {
            var leftNodes = left.evaluate(context);
            return arrayFilter(right.evaluate(context), function (e) {
                var parent = e;
                while (parent = parent.parentNode) {
                    if (arrayIndexOf(leftNodes, parent) >= 0)
                        return true;
                }
                return false;
            });
        },
        
        '+': function (left, right, context) {
            var leftNodes = left.evaluate(context);
            return arrayFilter(right.evaluate(context), function (e) {
                var sibling = e;
                while (sibling = sibling.previousSibling) {
                    if (sibling.nodeType == 1)
                        return arrayIndexOf(leftNodes, sibling) >= 0;
                }
            });
        },
        
        '~': function (left, right, context) {
            var leftNodes = left.evaluate(context);
            return arrayFilter(right.evaluate(context), function (e) {
                var sibling = e;
                while (sibling = sibling.previousSibling) {
                    if (sibling.nodeType == 1 && arrayIndexOf(leftNodes, sibling) >= 0)
                        return true;
                }
                return false;
            });
        },
        
        ':': function (left, right, context) {
            var pseudos = Puma.pseudoclasses;
            if (!pseudos[right.value] && !pseudos[right.left.value])
                right.error('Unknown pseudoclass ' + (right.value != '(' ? right.value : right.left.value));
            return arrayFilter(left.evaluate(context), function (e) {
                if (right.value == '(')
                    return pseudos[right.left.value](e, right.right, context);
                return pseudos[right.value](e);
            });
        },
        
        '::': function (left, right, context) {
            var pseudos = Puma.pseudoelements, leftNodes, i = 0, l, result = [],
            pseudoelement;
            if (!pseudos[right.value])
                right.error('Unknown pseudoelement ' + right.value);
            for (leftNodes = left.evaluate(context), l = leftNodes.length; i < l; ++i) {
                pseudoelement = pseudos[right.value](leftNodes[i]);
                if (pseudoelement != null)
                    result.push.apply(result, pseudoelement);
            }
            return result;
        },
        
        '[': function (left, right, context) {
            var leftNodes = left.evaluate(context), rightNodes;
            if (right.arity == 'binary')
                return Puma.operators.binary[right.value](leftNodes, right.left,
                right.right);
            rightNodes = right.evaluate(context);
            return arrayFilter(leftNodes, function (e) {
                return e.hasAttribute(right.value);
            });
        },
        
        '=': function (nodes, left, right) {
            return arrayFilter(nodes, function (e) {
                return e.getAttribute(left.value) == right.value;
            });
        },
        
        '!=': function (nodes, left, right) {
            return arrayFilter(nodes, function (e) {
                return e.getAttribute(left.value) != right.value;
            });
        },
        
        '^=': function (nodes, left, right) {
            return arrayFilter(nodes, function (e) {
                var attr = e.getAttribute(left.value);
                return attr && attr.indexOf(right.value) == 0;
            });
        },
        
        '$=': function (nodes, left, right) {
            return arrayFilter(nodes, function (e) {
                var attr = e.getAttribute(left.value);
                return attr && attr.lastIndexOf(right.value) == attr.length - right.value.length;
            });
        },
        
        '*=': function (nodes, left, right) {
            return arrayFilter(nodes, function (e) {
                var attr = e.getAttribute(left.value);
                return attr && attr.indexOf(right.value) >= 0;
            });
        },
        
        '@=': function (nodes, left, right) {
            return arrayFilter(nodes, function (e) {
                var attr = e.getAttribute(left.value);
                return attr && (new RegExp(right.value)).test(attr);
            });
        }
    }
};

var POB = Puma.operators.binary, POU = Puma.operators.unary;

POB['>'].precendence = POB[' '].precendence = POB['+'].precendence =
POB['~'].precendence = 8;

POB[','].precendence = 5;

POB['#'].noIter = POB['.'].noIter = POB[','].noIter = POB['>'].noIter =
POB[' '].noIter = POB['+'].noIter = POB['~'].noIter = POB[':'].noIter =
POB['::'].noIter = POB['['].noIter = POU['#'].noIter = POU['.'].noIter =
POU[':'].noIter = POU['::'].noIter = POU['['].noIter = true;

Puma.pseudoclasses = {
    'contains': function (elem, text) {
        text = text.value;
        var innerText = elem.innerText || elem.textContent || '';
        if (text.indexOf('/') == 0 && text.lastIndexOf('/') == text.length - 1)
            return (new RegExp(text.substring(1, text.length - 1))).test(innerText);
        return innerText.indexOf(text) >= 0;
    },
    
    'not': function (elem, expr, context) {
        if (!expr.notCache)
            expr.notCache = expr.evaluate(context);
        return arrayIndexOf(expr.notCache, elem) < 0;
    },
    
    'first-child': function (elem) {
        var children = elem.parentNode.children;
        return children && elem == elem.parentNode.children[0];
    },
    
    'last-child': function (elem) {
        var children = elem.parentNode.children;
        return children && elem == children[children.length - 1];
    },
    
    'nth-child': function (elem, expr) {
        var n = expr.value;
        if (n == 'n')
            return true;
        if (n == 'odd')
            return arrayIndexOf(elem.parentNode.children, elem) % 2 == 0;
        if (n == 'even')
            return arrayIndexOf(elem.parentNode.children, elem) % 2 == 1;
        if (!expr.nthChildCache) {
            if (n.length == 1 && n != '+') {
                expr.nthChildCache = function (e) {
                    return arrayIndexOf(e.parentNode.children, e) == n - 1;
                };
            }
            else if (n == '+') {
                expr.nthChildCache = function (e) {
                    for (var idx = arrayIndexOf(e.parentNode.children, e),
                    x = parseInt(expr.right.value) - 1,
                    y = expr.left.value.length > 1 ? parseInt(expr.left.value.length) : 0,
                    i = 0, l = e.parentNode.children.length; i < l; ++i) {
                        if (idx == i * y + x)
                            return true;
                    }
                    return false;
                };
            }
            else {
                expr.nthChildCache = function (e) {
                    for (var idx = arrayIndexOf(e.parentNode.children, e) + 1,
                    x = parseInt(n), i = 0, l = e.parentNode.children.length; i < l; ++i) {
                        if (idx == i * x)
                            return true;
                    }
                    return false;
                };
            }
        }
        return expr.nthChildCache(elem);
    }
};

Puma.pseudoelements = {
};

})();
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
    },
    
    'for': function (elem, value) { // Work around IE bug
        elem.htmlFor = value;
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
    
    clone: function (obj) {
        var newObj = {}, i;
        for (i in obj) {
            if (obj.hasOwnProperty(i))
                newObj[i] = obj[i];
        }
        return newObj;
    },
    
    // From http://javascript.crockford.com/prototypal.html
    object: function (obj) {
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
    
    toQueryString: function (obj) {
        var euc = encodeURIComponent;
        return Shrike.inspect(obj, '=', '&', euc, euc);
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
        return {}.toString.call(obj) == '[object Array]';
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
            else if (arg.nodeType !== undefined)
                frag.appendChild(arg.cloneNode(true));
            else if (arg.clone !== undefined && arg.node !== undefined)
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
(function (Shrike) {

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

})(Shrike);
(function (Shrike) {

function animate(elem, prop, options) {
    prop = prop.replace(/\-(\w)/g, function (_, $1) { return $1.toUpperCase(); });
    if (options.from !== void 0)
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
            from: options.from !== void 0 ? 'alpha(opacity=' + parseInt(options.from) + ')' : 'alpha(opacity=100)',
            to: 'alpha(opacity=' + options.to + ')',
            speed: Shrike.first(options.speed, options.increment, 5) * 10
        });
        animate(elem, 'filter', vars);
    }
},

drag = {
    'handle': function (elem, value, vars) {
        vars.handle = typeof value == 'string' ? Puma(value) : value;
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
    x = Math.abs(pos.x - evt.clientX), y = Math.abs(pos.y - evt.clientY);
    function mousemove(e) {
        e = e || window.event;
        s.left = e.clientX - x + 'px';
        s.top = e.clientY - y + 'px';
    }
    function mouseup(e) {
        e = e || window.event;
        Shrike.removeEvent(doc, 'onmousemove', mousemove);
        Shrike.removeEvent(doc, 'onmouseup', mouseup);
        for (var i = 0, l = handlers.length; i < l; ++i)
            handlers[i](elem, e);
    }
    Shrike.addEvent(doc, 'onmousemove', mousemove);
    Shrike.addEvent(doc, 'onmouseup', mouseup);
}

Shrike.animate = Shrike.declaration(opacity, animate);

Shrike.drag = Shrike.declaration(drag, function () { }, function () { }, dragCleanup);

})(Shrike);
