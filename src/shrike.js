function Puma(selector, context) {
    return Puma.Parser.parse(selector).evaluate(context || document);
}

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
                result = successHandlers[i](elem, request);
                if (typeof result == 'string') {
                    if (i == 0)
                        elem.innerHTML = '';
                    elem.innerHTML += result;
                }
            }
        }
        else {
            for (i = 0, l = errorHandlers.length; i < l; ++i)
                errorHandlers[i](elem, request);
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
        from: Shrike.first(options.from, Shrike.computedStyle(elem, prop)),
        to: '' + options.to,
        speed: Shrike.first(options.speed, 5) / 10,
        finishHandlers: options.finish ? options.finish instanceof Array ?
        options.finish : [options.finish] : [],
        updateHandlers: options.update ? options.update instanceof Array ?
        options.update : [options.update] : []
    }, prefix = [], timer, currValue, target, down, divBy = 1,
    i = 0, j = 0, l = vars.from.length, ch; i < l; ++i) {
        ch = vars.from.charAt(i);
        if (ch > '/' && ch < ':')
            break;
        prefix.push(ch);
    }
    prefix = prefix.join('');
    currValue = parseFloat(vars.from.substring(i));
    target = vars.to.substring(i);
    if (target < 1) {
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
            for (l = vars.finishHandlers.length; k < l; ++k)
                vars.finishHandlers[k](elem);
        }
        else {
            currValue += down ? -vars.speed : vars.speed;
            elem.style[prop] = prefix + currValue / divBy + vars.to.substring(vars.to.indexOf(target) + ('' + target).length);
            for (l = vars.updateHandlers.length; k < l; ++k)
                vars.updateHandlers[k](elem);
        }
    }, 20);
}

var opacity = {
    'opacity': function (elem, options) {
        if (typeof options == 'string' || typeof options == 'number')
            options = {to: options};
        animate(elem, 'opacity', options);
        var vars = Shrike.extend(options, {
            from: 'alpha(opacity=100)',
            to: 'alpha(opacity=' + options.to + ')',
            speed: (options.speed || 5) * 10
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
        [].push.apply(vars.startHandlers, value instanceof Array ? value : [value]);
    },
    
    'finish': function (elem, value, vars) {
        vars.finishHandlers = vars.finishHandlers || [];
        [].push.apply(vars.finishHandlers, value instanceof Array ? value : [value]);
    }
};

function dragCleanup(elem, vars) {
    function dragEvt(e) {
        e = e || window.event;
        for (var i = 0, l = vars.startHandlers.length; i < l; ++i)
            vars.startHandlers[i](elem, e);
        doDrag(elem, e, vars.finishHandlers);
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
