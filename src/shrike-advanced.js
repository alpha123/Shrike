var l=void 0,n,r,s,u;function v(e){this.value=e;this.evaluate=function(f){f=f.getElementsByTagName(e);if(f instanceof Object)return[].slice.call(f);return n(f,function(){return!0})}}function w(e,f,d){this.value=e;this.left=f;this.right=d;this.evaluate=function(b){var a=r.d[e],c=[],h,g;if(a.a)return a(this.left,this.right,b);h=b.getElementsByTagName("*");for(g=h.length;g--;)a(h[g],this.left,this.right,b)&&c.push(h[g]);return c}}
function x(e,f){this.value=e;this.right=f;this.evaluate=function(d){var b=r.k[e],a=[],c,h;if(b.a)return b(this.right,d);c=d.getElementsByTagName("*");for(h=c.length;h--;)b(c[h],this.right,d)&&a.push(c[h]);return a}}
function z(e){function f(h,b){return{type:h,value:b,c:c,b:a,error:function(a){throw Error(a);}}}function d(a){return(a>="a"&&a<="z"||a>="A"&&a<="Z"||j.indexOf(a)>=0)&&a}for(var b=e.charAt(0),a=0,c,h,g=e.length,k=[],j="0123456789-_";b;)if(c=a,b==" "){var b=e.charAt(++a),i=e.charAt(a-2);(d(b)||b=="*"||r.k[b])&&(d(i)||i=="*")&&k.push(f("op"," "))}else if(d(b)){h=[b];for(++a;;)if(b=e.charAt(a),d(b))h.push(b),++a;else break;k.push(f("ident",h.join("")))}else if(b=='"'||b=="'"){h=[];for(i=b;;){b=e.charAt(++a);
b<" "&&f("ident",h.join("")).error("Bad string");if(b==i)break;b=="\\"&&(++a>=g&&f("ident",h.join("")).error("Bad string"),b="\\"+e.charAt(a));h.push(b)}k.push(f("ident",h.join("")));b=e.charAt(++a)}else if(b=="*"&&e.charAt(a+1)!="=")k.push(f("ident",b)),b=e.charAt(++a);else{h=[b];b=e.charAt(++a);i=e.charAt(a-1);if((b=="*"||!d(b))&&b!=" "&&i!="["&&i!="]"&&i!="("&&i!=")"&&b!='"'&&b!="'")h.push(b),b=e.charAt(++a);k.push(f("op",h.join("")))}return k}
function A(e){function f(a){a&&g.id!=a&&g.error("Expected "+a+", not "+g.id);if(j>=k.length)g=h["(end)"];else{var a=k[j++],c=a.value,b=a.type,d=k[j-2],e,f;if(b=="ident")e=new v(c),e.r=function(){return this},e.q=null,e.n=0;else if(b=="op")for(f in h[c]||a.error("Unknown operator "+c),e=r.k[c]&&(!d||d.type=="op"&&d.value!="]"&&d.value!=")")?new x(c,a.right):new w(c,a.right,a.left),h[c])e[f]=h[c][f];else a.error("Unexpected token "+c);g=e;g.c=a.c;g.b=a.b;g.value=g.id=c;g.arity=b;g.error=a.error}}function d(a){var c,
h=g;f();for(c=h.r();a<g.n;)h=g,f(),c=h.q(c);return c}function b(a,c){var c=c||0,b=h[a];if(b){if(c>=b.n)b.n=c}else b={error:function(a){throw Error(a);},r:function(){this.error("Undefined. "+a)},q:function(){this.error("Missing operator.")},n:c},b.id=b.value=a,h[a]=b;return b}function a(a,c,h){b(a,c).q=h||function(a){this.left=a;this.right=d(c);this.arity="binary";return this}}function c(a,c){b(a).r=c||function(){this.right=d(10);this.arity="unary";return this}}var h={},g,k=z(e),j=0,i;b("]");b(")");
b("(end)");b("(ident)");for(i in r.d)a(i,r.d[i].j||10);a("[",20,function(a){this.left=a;this.right=d(0);this.arity="binary";f("]");return this});a("(",20,function(a){this.left=a;this.right=d(0);this.arity="binary";f(")");return this});for(i in r.k)c(i);c("[",function(){this.right=d(0);this.arity="unary";f("]");return this});f();e=d(0);f("(end)");return e}
(function(){function e(a,c){if(a.indexOf)return a.indexOf(c);for(var h=0,b=a.length;h<b;++h)if(a[h]===c)return h;return-1}function f(a,c){if(a.filter)return a.filter(c);for(var b=[],g=0,d=a.length;g<d;++g)c(a[g],g)&&b.push(a[g]);return b}n=f;r={k:{"#":function(a,c){if(c.getElementById){var b=c.getElementById(a.value);return b?[b]:[]}return f(c.getElementsByTagName("*"),function(c){return c.id==a.value})},".":function(a,c){if(c.getElementsByClassName)return[].slice.call(c.getElementsByClassName(a.value));
return f(c.getElementsByTagName("*"),function(c){return e(c.className.split(" "),a.value)>=0})},":":function(a,c){return r.d[":"](new v("*"),a,c)},"::":function(a,c){return r.d["::"](new v("*"),a,c)},"[":function(a,c){return r.d["["](new v("*"),a,c)}},d:{"#":function(a,c,b){var g=a.evaluate(b);if(b.getElementById)return a=b.getElementById(c.value),e(g,a)>=0?[a]:[];return f(b.getElementsByTagName("*"),function(a){return a.id==c.value&&e(g,a)>=0})},".":function(a,c,b){var g=a.evaluate(b);if(b.getElementsByClassName)return f(b.getElementsByClassName(c.value),
function(a){return e(g,a)>=0});return f(b.getElementsByTagName("*"),function(a){return e(a.className.split(" "),c.value)>=0&&e(g,a)>=0})},",":function(a,c,b){for(var a=a.evaluate(b),c=c.evaluate(b),b=0,g=c.length;b<g;++b)e(a,c[b])<0&&a.push(c[b]);return a},">":function(a,c,b){var g=a.evaluate(b);return f(c.evaluate(b),function(a){return e(g,a.parentNode)>=0})}," ":function(a,c,b){var g=a.evaluate(b);return f(c.evaluate(b),function(a){for(;a=a.parentNode;)if(e(g,a)>=0)return!0;return!1})},"+":function(a,
c,b){var g=a.evaluate(b);return f(c.evaluate(b),function(a){for(;a=a.previousSibling;)if(a.nodeType==1)return e(g,a)>=0})},"~":function(a,c,b){var g=a.evaluate(b);return f(c.evaluate(b),function(a){for(;a=a.previousSibling;)if(a.nodeType==1&&e(g,a)>=0)return!0;return!1})},":":function(a,c,b){var g=s;!g[c.value]&&!g[c.left.value]&&c.error("Unknown pseudoclass "+(c.value!="("?c.value:c.left.value));return f(a.evaluate(b),function(a){if(c.value=="(")return g[c.left.value](a,c.right,b);return g[c.value](a)})},
"::":function(a,c,b){var g=u,d=0,e=[],f;g[c.value]||c.error("Unknown pseudoelement "+c.value);a=a.evaluate(b);for(b=a.length;d<b;++d)f=g[c.value](a[d]),f!=null&&e.push.apply(e,f);return e},"[":function(a,c,b){a=a.evaluate(b);if(c.arity=="binary")return r.d[c.value](a,c.left,c.right);c.evaluate(b);return f(a,function(a){return a.hasAttribute(c.value)})},"=":function(a,c,b){return f(a,function(a){return a.getAttribute(c.value)==b.value})},"!=":function(a,c,b){return f(a,function(a){return a.getAttribute(c.value)!=
b.value})},"^=":function(a,c,b){return f(a,function(a){return(a=a.getAttribute(c.value))&&a.indexOf(b.value)==0})},"$=":function(a,c,b){return f(a,function(a){return(a=a.getAttribute(c.value))&&a.lastIndexOf(b.value)==a.length-b.value.length})},"*=":function(a,c,b){return f(a,function(a){return(a=a.getAttribute(c.value))&&a.indexOf(b.value)>=0})},"@=":function(a,c,b){return f(a,function(a){return(a=a.getAttribute(c.value))&&RegExp(b.value).test(a)})}}};var d=r.d,b=r.k;d[">"].j=d[" "].j=d["+"].j=d["~"].j=
8;d[","].j=5;d["#"].a=d["."].a=d[","].a=d[">"].a=d[" "].a=d["+"].a=d["~"].a=d[":"].a=d["::"].a=d["["].a=b["#"].a=b["."].a=b[":"].a=b["::"].a=b["["].a=!0;s={contains:function(a,c){var c=c.value,b=a.innerText||a.textContent||"";if(c.indexOf("/")==0&&c.lastIndexOf("/")==c.length-1)return RegExp(c.substring(1,c.length-1)).test(b);return b.indexOf(c)>=0},not:function(a,c,b){if(!c.v)c.v=c.evaluate(b);return e(c.v,a)<0},"first-child":function(a){return a.parentNode.children&&a==a.parentNode.children[0]},
"last-child":function(a){var c=a.parentNode.children;return c&&a==c[c.length-1]},"nth-child":function(a,c){var b=c.value;if(b=="n")return!0;if(b=="odd")return e(a.parentNode.children,a)%2==0;if(b=="even")return e(a.parentNode.children,a)%2==1;if(!c.w)c.w=b.length==1&&b!="+"?function(a){return e(a.parentNode.children,a)==b-1}:b=="+"?function(a){for(var b=e(a.parentNode.children,a),d=parseInt(c.right.value)-1,h=c.left.value.length>1?parseInt(c.left.value.length):0,f=0,a=a.parentNode.children.length;f<
a;++f)if(b==f*h+d)return!0;return!1}:function(a){for(var c=e(a.parentNode.children,a)+1,d=parseInt(b),f=0,a=a.parentNode.children.length;f<a;++f)if(c==f*d)return!0;return!1};return c.w(a)}};u={}})();
var B=function(){function e(d,b){return A(d).evaluate(b||document)}function f(d,b){return function(a,c){var h=!0,g={};if(c.i!==l||c.H!==l){g=c;if(c.l!==l)h=c.l;c=c.i?c.i:c.H}c instanceof Array||(c=[c]);for(var e=0,f=c.length;e<f;++e)d(a,c[e],h,g);b&&b(a,c,h,g)}}e.u=function(d,b,a){var a=a||function(a){return a},c;for(c in b)b.hasOwnProperty(c)&&(d[c]=a(b[c],c))};e.extend=function(d,b,a){var c={};e.u(c,d);e.u(c,b,a);return c};e.l=function(d){var b={},a;for(a in d)d.hasOwnProperty(a)&&(b[a]=d[a]);return b};
e.object=function(d){function b(){}b.prototype=d;return new b};e.t=function(){for(var d=arguments,b=0,a=d.length;b<a;++b)if(d[b]!==l)return d[b];return null};e.z=function(d){var b=[],a=encodeURIComponent,c;for(c in d)d.hasOwnProperty(c)&&b.push([a(c),a(d[c])].join("="));return b.join("&")};e.D=function(d,b){b=b.replace(/[A-Z]/,function(a){return"-"+a.toLowerCase()});if(window.getComputedStyle)return document.defaultView.getComputedStyle(d,null).getPropertyValue(b);else if(d.currentStyle)return d.currentStyle[b];
return 0};e.position=function(d){var b=0,a=0;do b+=d.offsetLeft,a+=d.offsetTop;while(d=d.offsetParent);return{x:b,y:a}};e.create=function(d){var b=A(d),a,c=1,e=arguments.length,g;if(b instanceof v)a=document.createElement(b.value);else switch(a=document.createElement(b.left.value),b.value){case "#":a.id=b.right.value}for(;c<e;++c)if(b=arguments[c],typeof b=="string")a.innerHTML+=b;else if(b.nodeType!==l)a.appendChild(b.cloneNode(!0));else if(b.l!==l&&b.i!==l)a.appendChild(b.l?b.i.cloneNode(!0):b.i);
else for(g in b)if(b.hasOwnProperty(g))g=="html"?a.innerHTML=b[g]:a.setAttribute(g,b[g]);return a};e.e=function(d,b,a,c){return function(h,g){var f=[],j,i,m,o=0,t,p,q,y;if(g)f.push(h.length===l?[h]:h,g,{});else for(j in h)h.hasOwnProperty(j)&&f.push(A(j).evaluate(document),h[j],{});for(t=f.length;o<t;++o){j=f[o];i=f[++o];m=f[++o];q=0;for(y=j.length;q<y;++q){a&&a(j[q],m);for(p in i)if(i.hasOwnProperty(p))if(d.hasOwnProperty(p)&&typeof d[p]=="function")d[p](j[q],i[p],m);else b&&b(j[q],p,i[p],m);c&&
c(j[q],m)}}return e}};e.style=e.e({},function(d,b,a){d.style[b.replace(/\-(\w)/g,function(a,b){return b.toUpperCase()})]=a});e.G=e.e({append:f(function(d,b,a,c){c.p=c.p||document.createDocumentFragment();c.p.appendChild(a?b.cloneNode(!0):b)},function(d,b,a,c){d.appendChild(c.p)}),destroy:f(function(d,b){if(b=="self")d.parentNode.removeChild(d);else if(b=="all")for(;d.lastChild;)d.removeChild(d.lastChild);else d.removeChild(b)}),top:f(function(d,b,a){d.insertBefore(a?b.cloneNode(!0):b,d.firstChild)}),
bottom:this.append,before:f(function(d,b,a){d.parentNode.insertBefore(a?b.cloneNode(!0):b,d)}),after:f(function(d,b,a){d.parentNode.insertBefore(a?b.cloneNode(!0):b,d.nextSibling)})},function(){});e.K=e.e({"class":function(d,b){if(typeof b=="string")d.className=b;else{var a=d.className.split(" "),c,e=0,g;if(b.add){c=b.add.split(" ");for(g=c.length;e<g;++e)a.push(c[e])}if(b.remove){c=b.remove.split(" ");for(g=c.length;e<g;++e)for(var f=a,j=c[e],i=0,m=f.length;i<m;++i)f[i]===j&&f.splice(i,1)}a=a.join(" ");
a.charAt(0)==" "&&(a=a.substring(1));d.className=a}},html:function(d,b){d.innerHTML=b}},function(d,b,a){d.setAttribute(b,a)});return e}();
(function(e){function f(){b=!0;try{document.documentElement.doScroll("left")}catch(a){setTimeout(f,0);return}for(var c=0,e=d.length;c<e;++c)d[c]()}e.h=function(a,b,d){var e,f;e=e||a;f=f||[];var j=a[b],i=j;if(!j||!j.m)j=a[b]=function(){var a=0,b=f.slice.call(arguments),c=j.m,d=c.length-1;for(b.unshift.apply(b,f);a<d;++a)c[a].apply(e,b);if(d+1)return c[a].apply(e,b)},j.m=i?[i]:[];j.m.push(d)};e.s=function(a,b,d){var e,f=0;if(a[b]&&(e=a[b].m))for(a=e.length;f<a;++f)e[f]==d&&e.splice(f,1)};var d=[],b=
!1;e.J=function(a){document.addEventListener?document.addEventListener("DOMContentLoaded",a,!1):(d.push(a),b||f())};e.I=e.e({},function(a,b,d){e.h(a,"on"+b,d)});e.L=e.e({},function(a,b,d){e.s(a,"on"+b,d)})})(B);
(function(e){function f(d,b,a,c){d.onreadystatechange=function(){if(d.readyState==4){var e,f,k;if(d.status==200){if(b.length==0)c.innerHTML=d.responseText;e=0;for(f=b.length;e<f;++e)if(k=b[e](c,d),typeof k=="string"){if(e==0)c.innerHTML="";c.innerHTML+=k}}else{e=0;for(f=a.length;e<f;++e)a[e](c,d)}}}}e.B=function(d){var b=[],a=[],c={};e.e({url:function(a,b){c.url=b},success:function(a,c){b.push(c)},error:function(b,c){a.push(c)},get:function(d,g){var k=new XMLHttpRequest;k.open("GET",[c.url,typeof g==
"string"?g:e.z(g)].join("?"),!0);f(k,b,a,d);k.send(null)},post:function(d,g){var k=new XMLHttpRequest;k.open("POST",c.url,!0);k.setRequestHeader("Content-type","application/x-www-form-urlencoded");f(k,b,a,d);k.send(typeof g=="string"?g:e.z(g))}},function(){})(d,l)}})(B);
(function(e){function f(b,a,c){a=a.replace(/\-(\w)/g,function(a,b){return b.toUpperCase()});if(c.c!==l)b.style[a]=c.c;if(typeof c=="string"||typeof c=="number")c={b:c};for(var d={c:e.t(c.c,e.D(b,a)),b:""+c.b,g:e.t(c.g,5)/10,f:c.finish?c.finish instanceof Array?c.finish:[c.finish]:[],A:c.update?c.update instanceof Array?c.update:[c.update]:[]},f=[],k,j,i,m,o=1,t=c=0,p=d.c.length,q;c<p;++c){q=d.c.charAt(c);if(q>"/"&&q<":")break;f.push(q)}f=f.join("");j=parseFloat(d.c.substring(c));i=d.b.substring(c);
if(i<1)for(p=i.substring(i.indexOf(".")+1).length;t<p;++t)o*=10;i=parseFloat(i);j*=o;m=i<j;k=setInterval(function(){var c=0,e;if(!m&&j/o>=i||m&&j/o<=i){clearInterval(k);for(e=d.f.length;c<e;++c)d.f[c](b)}else{j+=m?-d.g:d.g;b.style[a]=f+j/o+d.b.substring(d.b.indexOf(i)+(""+i).length);for(e=d.A.length;c<e;++c)d.A[c](b)}},20)}function d(b,a,c){function d(a){a=a||window.event;j.left=a.clientX-m+"px";j.top=a.clientY-o+"px"}function f(a){a=a||window.event;e.s(k,"onmousemove",d);e.s(k,"onmouseup",f);for(var i=
0,j=c.length;i<j;++i)c[i](b,a)}var k=document,j=b.style,i=e.position(b),m=Math.abs(i.x-a.clientX),o=Math.abs(i.y-a.clientY);e.h(k,"onmousemove",d);e.h(k,"onmouseup",f)}e.C=e.e({opacity:function(b,a){if(typeof a=="string"||typeof a=="number")a={b:a};f(b,"opacity",a);var c=e.extend(a,{c:"alpha(opacity=100)",b:"alpha(opacity="+a.b+")",g:(a.g||5)*10});f(b,"filter",c)}},f);e.F=e.e({handle:function(b,a,c){c.handle=typeof a=="string"?A(a).evaluate(document):a},start:function(b,a,c){c.o=c.o||[];[].push.apply(c.o,
a instanceof Array?a:[a])},finish:function(b,a,c){c.f=c.f||[];[].push.apply(c.f,a instanceof Array?a:[a])}},function(){},function(){},function(b,a){function c(c){for(var c=c||window.event,e=0,f=a.o.length;e<f;++e)a.o[e](b,c);d(b,c,a.f);return!1}if(a.handle)for(var f=0,g=a.handle.length;f<g;++f)e.h(a.handle[f],"onmousedown",c);else e.h(b,"onmousedown",c)})})(B);
B.J(function(){B.style({"#theTestDiv":{"background-color":"green"}});B.I({"#theTestDiv":{click:function(){B.C({"#theFood":{"font-size":{b:"25px",g:6,finish:function(){log.info("finished animation")}},"letter-spacing":{c:"1px",b:"5px"}},"p:contains(Shrubbery)":{opacity:0}})}},"#theTestDiv + form":{submit:function(){return!1}},"#toggleBB":{click:function(){log.M()}}});B.B({"#theTestDiv":{url:"ajaxtest.php",success:function(){log.info("ajax finished")},get:{key1:"value1",key2:"value2"}}});B.G({"#theTestDiv":{append:[B.create("br"),
B.create("span#theFood","This is food",{"class":"food"})],top:B.create("p","Shrubbery")}});B.style(document.body,{"background-color":"#31addd","font-family":"Trebuchet MS"});B.F({"#theDraggableDiv":{handle:A("#theDraggableDivsHandle").evaluate(document),start:function(){log.info("started drag")},finish:function(){log.info("finished drag")}}})});