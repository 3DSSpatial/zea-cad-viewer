function t(){}const e=t=>t;function n(t,e){for(const n in e)t[n]=e[n];return t}function o(t){return t()}function r(){return Object.create(null)}function s(t){t.forEach(o)}function i(t){return"function"==typeof t}function a(t,e){return t!=t?e==e:t!==e||t&&"object"==typeof t||"function"==typeof t}let c;function l(t,e){return c||(c=document.createElement("a")),c.href=e,t===c.href}function u(e,...n){if(null==e)return t;const o=e.subscribe(...n);return o.unsubscribe?()=>o.unsubscribe():o}function f(t){let e;return u(t,(t=>e=t))(),e}function d(t,e,n){t.$$.on_destroy.push(u(e,n))}function p(t,e,n,o){if(t){const r=h(t,e,n,o);return t[0](r)}}function h(t,e,o,r){return t[1]&&r?n(o.ctx.slice(),t[1](r(e))):o.ctx}function m(t,e,n,o){if(t[2]&&o){const r=t[2](o(n));if(void 0===e.dirty)return r;if("object"==typeof r){const t=[],n=Math.max(e.dirty.length,r.length);for(let o=0;o<n;o+=1)t[o]=e.dirty[o]|r[o];return t}return e.dirty|r}return e.dirty}function g(t,e,n,o,r,s){if(r){const i=h(e,n,o,s);t.p(i,r)}}function $(t){if(t.ctx.length>32){const e=[],n=t.ctx.length/32;for(let t=0;t<n;t++)e[t]=-1;return e}return-1}function y(t){const e={};for(const n in t)"$"!==n[0]&&(e[n]=t[n]);return e}function b(t,e){const n={};e=new Set(e);for(const o in t)e.has(o)||"$"===o[0]||(n[o]=t[o]);return n}function _(t,e,n){return t.set(n),e}const w="undefined"!=typeof window;let x=w?()=>window.performance.now():()=>Date.now(),v=w?t=>requestAnimationFrame(t):t;const P=new Set;function k(t){P.forEach((e=>{e.c(t)||(P.delete(e),e.f())})),0!==P.size&&v(k)}function E(t,e){t.appendChild(e)}function j(t){if(!t)return document;const e=t.getRootNode?t.getRootNode():t.ownerDocument;return e&&e.host?e:t.ownerDocument}function O(t){const e=N("style");return function(t,e){E(t.head||t,e)}(j(t),e),e}function I(t,e,n){t.insertBefore(e,n||null)}function S(t){t.parentNode.removeChild(t)}function L(t,e){for(let n=0;n<t.length;n+=1)t[n]&&t[n].d(e)}function N(t){return document.createElement(t)}function R(t){return document.createElementNS("http://www.w3.org/2000/svg",t)}function T(t){return document.createTextNode(t)}function A(){return T(" ")}function F(){return T("")}function C(t,e,n,o){return t.addEventListener(e,n,o),()=>t.removeEventListener(e,n,o)}function M(t){return function(e){return e.preventDefault(),t.call(this,e)}}function q(t){return function(e){return e.stopPropagation(),t.call(this,e)}}function B(t){return function(e){e.target===this&&t.call(this,e)}}function D(t,e,n){null==n?t.removeAttribute(e):t.getAttribute(e)!==n&&t.setAttribute(e,n)}function U(t,e){const n=Object.getOwnPropertyDescriptors(t.__proto__);for(const o in e)null==e[o]?t.removeAttribute(o):"style"===o?t.style.cssText=e[o]:"__value"===o?t.value=t[o]=e[o]:n[o]&&n[o].set?t[o]=e[o]:D(t,o,e[o])}function H(t){return""===t?null:+t}function K(t,e){e=""+e,t.wholeText!==e&&(t.data=e)}function z(t,e){t.value=null==e?"":e}function W(t,e,n,o){t.style.setProperty(e,n,o?"important":"")}function J(t,e,n){t.classList[n?"add":"remove"](e)}function G(t,e,n=!1){const o=document.createEvent("CustomEvent");return o.initCustomEvent(t,n,!1,e),o}const Q=new Set;let V,Z=0;function X(t,e,n,o,r,s,i,a=0){const c=16.666/o;let l="{\n";for(let t=0;t<=1;t+=c){const o=e+(n-e)*s(t);l+=100*t+`%{${i(o,1-o)}}\n`}const u=l+`100% {${i(n,1-n)}}\n}`,f=`__svelte_${function(t){let e=5381,n=t.length;for(;n--;)e=(e<<5)-e^t.charCodeAt(n);return e>>>0}(u)}_${a}`,d=j(t);Q.add(d);const p=d.__svelte_stylesheet||(d.__svelte_stylesheet=O(t).sheet),h=d.__svelte_rules||(d.__svelte_rules={});h[f]||(h[f]=!0,p.insertRule(`@keyframes ${f} ${u}`,p.cssRules.length));const m=t.style.animation||"";return t.style.animation=`${m?`${m}, `:""}${f} ${o}ms linear ${r}ms 1 both`,Z+=1,f}function Y(t,e){const n=(t.style.animation||"").split(", "),o=n.filter(e?t=>t.indexOf(e)<0:t=>-1===t.indexOf("__svelte")),r=n.length-o.length;r&&(t.style.animation=o.join(", "),Z-=r,Z||v((()=>{Z||(Q.forEach((t=>{const e=t.__svelte_stylesheet;let n=e.cssRules.length;for(;n--;)e.deleteRule(n);t.__svelte_rules={}})),Q.clear())})))}function tt(t){V=t}function et(){if(!V)throw new Error("Function called outside component initialization");return V}function nt(t){et().$$.before_update.push(t)}function ot(t){et().$$.on_mount.push(t)}function rt(t){et().$$.after_update.push(t)}function st(t){et().$$.on_destroy.push(t)}function it(){const t=et();return(e,n)=>{const o=t.$$.callbacks[e];if(o){const r=G(e,n);o.slice().forEach((e=>{e.call(t,r)}))}}}function at(t,e){et().$$.context.set(t,e)}function ct(t){return et().$$.context.get(t)}function lt(t,e){const n=t.$$.callbacks[e.type];n&&n.slice().forEach((t=>t.call(this,e)))}const ut=[],ft=[],dt=[],pt=[],ht=Promise.resolve();let mt=!1;function gt(){mt||(mt=!0,ht.then(xt))}function $t(){return gt(),ht}function yt(t){dt.push(t)}function bt(t){pt.push(t)}let _t=!1;const wt=new Set;function xt(){if(!_t){_t=!0;do{for(let t=0;t<ut.length;t+=1){const e=ut[t];tt(e),vt(e.$$)}for(tt(null),ut.length=0;ft.length;)ft.pop()();for(let t=0;t<dt.length;t+=1){const e=dt[t];wt.has(e)||(wt.add(e),e())}dt.length=0}while(ut.length);for(;pt.length;)pt.pop()();mt=!1,_t=!1,wt.clear()}}function vt(t){if(null!==t.fragment){t.update(),s(t.before_update);const e=t.dirty;t.dirty=[-1],t.fragment&&t.fragment.p(t.ctx,e),t.after_update.forEach(yt)}}let Pt;function kt(t,e,n){t.dispatchEvent(G(`${e?"intro":"outro"}${n}`))}const Et=new Set;let jt;function Ot(){jt={r:0,c:[],p:jt}}function It(){jt.r||s(jt.c),jt=jt.p}function St(t,e){t&&t.i&&(Et.delete(t),t.i(e))}function Lt(t,e,n,o){if(t&&t.o){if(Et.has(t))return;Et.add(t),jt.c.push((()=>{Et.delete(t),o&&(n&&t.d(1),o())})),t.o(e)}}const Nt={duration:0};function Rt(n,o,r,a){let c=o(n,r),l=a?0:1,u=null,f=null,d=null;function p(){d&&Y(n,d)}function h(t,e){const n=t.b-l;return e*=Math.abs(n),{a:l,b:t.b,d:n,duration:e,start:t.start,end:t.start+e,group:t.group}}function m(o){const{delay:r=0,duration:i=300,easing:a=e,tick:m=t,css:g}=c||Nt,$={start:x()+r,b:o};o||($.group=jt,jt.r+=1),u||f?f=$:(g&&(p(),d=X(n,l,o,i,r,a,g)),o&&m(0,1),u=h($,i),yt((()=>kt(n,o,"start"))),function(t){let e;0===P.size&&v(k),new Promise((n=>{P.add(e={c:t,f:n})}))}((t=>{if(f&&t>f.start&&(u=h(f,i),f=null,kt(n,u.b,"start"),g&&(p(),d=X(n,l,u.b,u.duration,0,a,c.css))),u)if(t>=u.end)m(l=u.b,1-l),kt(n,u.b,"end"),f||(u.b?p():--u.group.r||s(u.group.c)),u=null;else if(t>=u.start){const e=t-u.start;l=u.a+u.d*a(e/u.duration),m(l,1-l)}return!(!u&&!f)})))}return{run(t){i(c)?(Pt||(Pt=Promise.resolve(),Pt.then((()=>{Pt=null}))),Pt).then((()=>{c=c(),m(t)})):m(t)},end(){p(),u=f=null}}}function Tt(t,e){t.d(1),e.delete(t.key)}function At(t,e){Lt(t,1,1,(()=>{e.delete(t.key)}))}function Ft(t,e,n,o,r,s,i,a,c,l,u,f){let d=t.length,p=s.length,h=d;const m={};for(;h--;)m[t[h].key]=h;const g=[],$=new Map,y=new Map;for(h=p;h--;){const t=f(r,s,h),a=n(t);let c=i.get(a);c?o&&c.p(t,e):(c=l(a,t),c.c()),$.set(a,g[h]=c),a in m&&y.set(a,Math.abs(h-m[a]))}const b=new Set,_=new Set;function w(t){St(t,1),t.m(a,u),i.set(t.key,t),u=t.first,p--}for(;d&&p;){const e=g[p-1],n=t[d-1],o=e.key,r=n.key;e===n?(u=e.first,d--,p--):$.has(r)?!i.has(o)||b.has(o)?w(e):_.has(r)?d--:y.get(o)>y.get(r)?(_.add(o),w(e)):(b.add(r),d--):(c(n,i),d--)}for(;d--;){const e=t[d];$.has(e.key)||c(e,i)}for(;p;)w(g[p-1]);return g}function Ct(t,e){const n={},o={},r={$$scope:1};let s=t.length;for(;s--;){const i=t[s],a=e[s];if(a){for(const t in i)t in a||(o[t]=1);for(const t in a)r[t]||(n[t]=a[t],r[t]=1);t[s]=a}else for(const t in i)r[t]=1}for(const t in o)t in n||(n[t]=void 0);return n}function Mt(t){return"object"==typeof t&&null!==t?t:{}}function qt(t,e,n){const o=t.$$.props[e];void 0!==o&&(t.$$.bound[o]=n,n(t.$$.ctx[o]))}function Bt(t){t&&t.c()}function Dt(t,e,n,r){const{fragment:a,on_mount:c,on_destroy:l,after_update:u}=t.$$;a&&a.m(e,n),r||yt((()=>{const e=c.map(o).filter(i);l?l.push(...e):s(e),t.$$.on_mount=[]})),u.forEach(yt)}function Ut(t,e){const n=t.$$;null!==n.fragment&&(s(n.on_destroy),n.fragment&&n.fragment.d(e),n.on_destroy=n.fragment=null,n.ctx=[])}function Ht(e,n,o,i,a,c,l,u=[-1]){const f=V;tt(e);const d=e.$$={fragment:null,ctx:null,props:c,update:t,not_equal:a,bound:r(),on_mount:[],on_destroy:[],on_disconnect:[],before_update:[],after_update:[],context:new Map(n.context||(f?f.$$.context:[])),callbacks:r(),dirty:u,skip_bound:!1,root:n.target||f.$$.root};l&&l(d.root);let p=!1;if(d.ctx=o?o(e,n.props||{},((t,n,...o)=>{const r=o.length?o[0]:n;return d.ctx&&a(d.ctx[t],d.ctx[t]=r)&&(!d.skip_bound&&d.bound[t]&&d.bound[t](r),p&&function(t,e){-1===t.$$.dirty[0]&&(ut.push(t),gt(),t.$$.dirty.fill(0)),t.$$.dirty[e/31|0]|=1<<e%31}(e,t)),n})):[],d.update(),p=!0,s(d.before_update),d.fragment=!!i&&i(d.ctx),n.target){if(n.hydrate){const t=function(t){return Array.from(t.childNodes)}(n.target);d.fragment&&d.fragment.l(t),t.forEach(S)}else d.fragment&&d.fragment.c();n.intro&&St(e.$$.fragment),Dt(e,n.target,n.anchor,n.customElement),xt()}tt(f)}class Kt{$destroy(){Ut(this,1),this.$destroy=t}$on(t,e){const n=this.$$.callbacks[t]||(this.$$.callbacks[t]=[]);return n.push(e),()=>{const t=n.indexOf(e);-1!==t&&n.splice(t,1)}}$set(t){var e;this.$$set&&(e=t,0!==Object.keys(e).length)&&(this.$$.skip_bound=!0,this.$$set(t),this.$$.skip_bound=!1)}}var zt={queryHandler:{parse:t=>{return e=new URLSearchParams(t),[...e].reduce(((t,[e,n])=>(t[e]=n,t)),{});var e},stringify:t=>"?"+new URLSearchParams(t).toString()},urlTransform:{apply:t=>t,remove:t=>t},useHash:!1};const Wt=RegExp(/\:([^/()]+)/g);function Jt(t,e){if(navigator.userAgent.includes("jsdom"))return!1;e&&Gt(t),function(){if(navigator.userAgent.includes("jsdom"))return!1;const{hash:t}=window.location;if(t){if(/^[A-Za-z]+[\w\-\:\.]*$/.test(t.substring(1))){const e=document.querySelector(t);e&&e.scrollIntoView()}}}()}function Gt(t){t&&t.scrollTo&&"scroll-lock"!==t.dataset.routify&&"lock"!==t.dataset["routify-scroll"]&&(t.style["scroll-behavior"]="auto",t.scrollTo({top:0,behavior:"auto"}),t.style["scroll-behavior"]="",Gt(t.parentElement))}const Qt=t=>{const e=[];let n;for(;n=Wt.exec(t);)e.push(n[1]);return e};function Vt(t,e){Vt._console=Vt._console||{log:console.log,warn:console.warn};const{_console:n}=Vt,o=t.componentFile.name.replace(/Proxy<_?(.+)>/,"$1").replace(/^Index$/,t.component.shortPath.split("/").pop()).replace(/^./,(t=>t.toUpperCase())).replace(/\:(.+)/,"U5B$1u5D"),r=[`<${o}> received an unexpected slot "default".`,`<${o}> was created with unknown prop 'scoped'`,`<${o}> was created with unknown prop 'scopedSync'`];for(const t of["log","warn"])console[t]=(...e)=>{r.includes(e[0])||n[t](...e)},e().then((()=>{console[t]=n[t]}))}function Zt(){let t=window.location.pathname+window.location.search+window.location.hash;const{url:e,options:n}=function(t){const[e,n]=t.split("__[[routify_url_options]]__"),o=JSON.parse(decodeURIComponent(n||"")||"{}");return window.routify=window.routify||{},window.routify.prefetched=o.prefetch,{url:e,options:o}}(t);return{...Xt(e),options:n}}function Xt(t){zt.useHash&&(t=t.replace(/.*#(.+)/,"$1"));const e=t.startsWith("/")?window.location.origin:void 0,n=new URL(t,e);return{url:n,fullpath:n.pathname+n.search+n.hash}}function Yt(t,e,n){const o=zt.useHash?"#":"";let r;return r=function(t,e,n){const o=Object.assign({},n,e),r=function(t,e){if(!zt.queryHandler)return"";const n=Qt(t),o={};e&&Object.entries(e).forEach((([t,e])=>{n.includes(t)||(o[t]=e)}));return zt.queryHandler.stringify(o).replace(/\?$/,"")}(t,e);for(const[e,n]of Object.entries(o))t=t.replace(`:${e}`,n);return`${t}${r}`}(t,e,n),r=zt.urlTransform.apply(r),r=o+r,r}function te(t){let e;const n=t[2].default,o=p(n,t,t[1],null);return{c(){o&&o.c()},m(t,n){o&&o.m(t,n),e=!0},p(t,[r]){o&&o.p&&(!e||2&r)&&g(o,n,t,t[1],e?m(n,t[1],r,null):$(t[1]),null)},i(t){e||(St(o,t),e=!0)},o(t){Lt(o,t),e=!1},d(t){o&&o.d(t)}}}function ee(t,e,n){let{$$slots:o={},$$scope:r}=e,{scoped:s={}}=e;return t.$$set=t=>{"scoped"in t&&n(0,s=t.scoped),"$$scope"in t&&n(1,r=t.$$scope)},[s,r,o]}class ne extends Kt{constructor(t){super(),Ht(this,t,ee,te,a,{scoped:0})}}const oe=[];function re(t,e){return{subscribe:se(t,e).subscribe}}function se(e,n=t){let o;const r=new Set;function s(t){if(a(e,t)&&(e=t,o)){const t=!oe.length;for(const t of r)t[1](),oe.push(t,e);if(t){for(let t=0;t<oe.length;t+=2)oe[t][0](oe[t+1]);oe.length=0}}}return{set:s,update:function(t){s(t(e))},subscribe:function(i,a=t){const c=[i,a];return r.add(c),1===r.size&&(o=n(s)||t),i(e),()=>{r.delete(c),0===r.size&&(o(),o=null)}}}}function ie(e,n,o){const r=!Array.isArray(e),a=r?[e]:e,c=n.length<2;return re(o,(e=>{let o=!1;const l=[];let f=0,d=t;const p=()=>{if(f)return;d();const o=n(r?l[0]:l,e);c?e(o):d=i(o)?o:t},h=a.map(((t,e)=>u(t,(t=>{l[e]=t,f&=~(1<<e),o&&p()}),(()=>{f|=1<<e}))));return o=!0,p(),function(){s(h),d()}}))}window.routify=window.routify||{};const ae=se(null),ce=se([]);ce.subscribe((t=>window.routify.routes=t));let le=se({component:{params:{}}});const ue=se(null),fe=se(!0);function de(t,e=!1){t=zt.urlTransform.remove(t);let{pathname:n,search:o}=Xt(t).url;const r=f(ce),s=r.find((t=>n===t.meta.name))||r.find((t=>n.match(t.regex)));if(!s)throw new Error(`Route could not be found for "${n}".`);const i=e?Object.create(s):s,{route:a,redirectPath:c,rewritePath:l}=pe(i,r);return l&&(({pathname:n,search:o}=Xt(Yt(l,a.params)).url),c&&(a.redirectTo=Yt(c,a.params||{}))),zt.queryHandler&&(a.params=Object.assign({},zt.queryHandler.parse(o))),function(t,e){if(t.paramKeys){const n=function(t){const e=[];return t.forEach((t=>{e[t.path.split("/").filter(Boolean).length-1]=t})),e}(t.layouts),o=e.split("/").filter(Boolean),r=function(t){return t.split("/").filter(Boolean).map((t=>t.match(/\:(.+)/))).map((t=>t&&t[1]))}(t.path);r.forEach(((e,r)=>{e&&(t.params[e]=o[r],n[r]?n[r].param={[e]:o[r]}:t.param={[e]:o[r]})}))}}(a,n),a.leftover=t.replace(new RegExp(a.regex),""),a}function pe(t,e,n,o){const{redirect:r,rewrite:s}=t.meta;if(r||s){n=r?r.path||r:n,o=s?s.path||s:n;const i=r&&r.params,a=s&&s.params,c=e.find((t=>t.path.replace(/\/index$/,"")===o));return c===t&&console.error(`${o} is redirecting to itself`),c||console.error(`${t.path} is redirecting to non-existent path: ${o}`),(i||a)&&(c.params=Object.assign({},c.params,i,a)),pe(c,e,n,o)}return{route:t,redirectPath:n,rewritePath:o}}function he(t,e,n){const o=t.slice();return o[1]=e[n],o}function me(t,e){let n,o;return{key:t,first:null,c(){n=N("iframe"),l(n.src,o=e[1].url)||D(n,"src",o),D(n,"frameborder","0"),D(n,"title","routify prefetcher"),this.first=n},m(t,e){I(t,n,e)},p(t,r){e=t,1&r&&!l(n.src,o=e[1].url)&&D(n,"src",o)},d(t){t&&S(n)}}}function ge(e){let n,o=[],r=new Map,s=e[0];const i=t=>t[1].options.prefetch;for(let t=0;t<s.length;t+=1){let n=he(e,s,t),a=i(n);r.set(a,o[t]=me(a,n))}return{c(){n=N("div");for(let t=0;t<o.length;t+=1)o[t].c();D(n,"id","__routify_iframes"),W(n,"display","none")},m(t,e){I(t,n,e);for(let t=0;t<o.length;t+=1)o[t].m(n,null)},p(t,[e]){1&e&&(s=t[0],o=Ft(o,e,i,1,t,s,r,n,Tt,me,null,he))},i:t,o:t,d(t){t&&S(n);for(let t=0;t<o.length;t+=1)o[t].d()}}}const $e=se([]),ye=ie($e,(t=>t.slice(0,2)));function be(t){const e=t.data?t.data.prefetchId:t;if(!e)return null;const n=f($e).find((t=>t&&t.options.prefetch==e));if(n){const{gracePeriod:t}=n.options,o=new Promise((e=>setTimeout(e,t))),r=new Promise((e=>{window.requestIdleCallback?window.requestIdleCallback(e):setTimeout(e,t+1e3)}));Promise.all([o,r]).then((()=>{$e.update((t=>t.filter((t=>t.options.prefetch!=e))))}))}}function _e(t,e,n){let o;return d(t,ye,(t=>n(0,o=t))),[o]}ye.subscribe((t=>t.forEach((({options:t})=>{setTimeout((()=>be(t.prefetch)),t.timeout)})))),addEventListener("message",be,!1);class we extends Kt{constructor(t){super(),Ht(this,t,_e,ge,a,{})}}function xe(){return ct("routify")||le}const ve={_hooks:[t=>fe.set(!1)],subscribe:ke},Pe={_hooks:[],subscribe:ke};function ke(t){const e=this._hooks,n=e.length;return t((t=>{e[n]=t})),(...o)=>{delete e[n],t(...o)}}const Ee={subscribe:t=>ie(xe(),(t=>{return e=t,n=t.route,o=t.routes,function(t,r={},s){const{component:i}=e,a=Object.assign({},n.params,i.params);let c=t&&t.nodeType&&t;c&&(t=t.getAttribute("href")),t=t?f(t):i.shortPath;const l=o.find((e=>[e.shortPath||"/",e.path].includes(t)));if(l&&"proximity"===l.meta.preload&&window.requestIdleCallback){const t=routify.appLoaded?0:1500;setTimeout((()=>{window.requestIdleCallback((()=>l.api.preload()))}),t)}s&&!1!==s.strict||(t=t.replace(/index$/,""));let u=Yt(t,r,a);return c?(c.href=u,{update(e){c.href=Yt(t,e,a)}}):u;function f(t){if(t.match(/^\.\.?\//)){let[,e,n]=t.match(/^([\.\/]+)(.*)/),o=i.path.replace(/\/$/,"");const r=e.match(/\.\.\//g)||[];i.isPage&&r.push(null),r.forEach((()=>o=o.replace(/\/[^\/]+\/?$/,""))),t=(t=`${o}/${n}`.replace(/\/$/,""))||"/"}else if(t.match(/^\//));else{const e=o.find((e=>e.meta.name===t));e&&(t=e.shortPath)}return t}};var e,n,o})).subscribe(t)};const je={subscribe(t){const e=ct("routifyupdatepage");return ie(Ee,(t=>function(n,o,r,s){const i=t(n,o);r?e(i,s):history.replaceState({},null,i)})).subscribe(t)}},Oe={subscribe(t){return this._origin=this.getOrigin(),t(Ie)},props:{},templates:{},services:{plain:{propField:"name",valueField:"content"},twitter:{propField:"name",valueField:"content"},og:{propField:"property",valueField:"content"}},plugins:[{name:"applyTemplate",condition:()=>!0,action:(t,e)=>[t,(Oe.getLongest(Oe.templates,t)||(t=>t))(e)]},{name:"createMeta",condition:()=>!0,action(t,e){Oe.writeMeta(t,e)}},{name:"createOG",condition:t=>!t.match(":"),action(t,e){Oe.writeMeta(`og:${t}`,e)}},{name:"createTitle",condition:t=>"title"===t,action(t,e){document.title=e}}],getLongest(t,e){const n=t[e];if(n){const o=f(ae).path;return n[Object.keys(t[e]).filter((t=>o.includes(t))).sort(((t,e)=>e.length-t.length))[0]]}},writeMeta(t,e){const n=document.getElementsByTagName("head")[0],o=t.match(/(.+)\:/),r=o&&o[1]||"plain",{propField:s,valueField:i}=Ie.services[r]||Ie.services.plain,a=document.querySelector(`meta[${s}='${t}']`);a&&a.remove();const c=document.createElement("meta");c.setAttribute(s,t),c.setAttribute(i,e),c.setAttribute("data-origin","routify"),n.appendChild(c)},set(t,e){"string"==typeof t&&Oe.plugins.forEach((n=>{n.condition(t,e)&&([t,e]=n.action(t,e)||[t,e])}))},clear(){const t=document.querySelector("meta");t&&t.remove()},template(t,e){const n=Oe.getOrigin;Oe.templates[t]=Oe.templates[t]||{},Oe.templates[t][n]=e},update(){Object.keys(Oe.props).forEach((t=>{let e=Oe.getLongest(Oe.props,t);Oe.plugins.forEach((n=>{n.condition(t,e)&&([t,e]=n.action(t,e)||[t,e])}))}))},batchedUpdate(){Oe._pendingUpdate||(Oe._pendingUpdate=!0,setTimeout((()=>{Oe._pendingUpdate=!1,this.update()})))},_updateQueued:!1,_origin:!1,getOrigin(){if(this._origin)return this._origin;const t=xe();return t&&f(t).path||"/"},_pendingUpdate:!1},Ie=new Proxy(Oe,{set(t,e,n,o){const{props:r}=t;return Reflect.has(t,e)?Reflect.set(t,e,n,o):(r[e]=r[e]||{},r[e][t.getOrigin()]=n),window.routify.appLoaded&&t.batchedUpdate(),!0}});function Se(t,e,n){const o=t.slice();return o[21]=e[n].component,o[22]=e[n].componentFile,o[2]=e[n].decorator,o[1]=e[n].nodes,o}function Le(t){let e,n,o=[],r=new Map,s=[t[4]];const i=t=>t[7];for(let e=0;e<1;e+=1){let n=Se(t,s,e),a=i(n);r.set(a,o[e]=Ae(a,n))}return{c(){for(let t=0;t<1;t+=1)o[t].c();e=F()},m(t,r){for(let e=0;e<1;e+=1)o[e].m(t,r);I(t,e,r),n=!0},p(t,n){33554621&n&&(s=[t[4]],Ot(),o=Ft(o,n,i,1,t,s,r,e.parentNode,At,Ae,e,Se),It())},i(t){if(!n){for(let t=0;t<1;t+=1)St(o[t]);n=!0}},o(t){for(let t=0;t<1;t+=1)Lt(o[t]);n=!1},d(t){for(let e=0;e<1;e+=1)o[e].d(t);t&&S(e)}}}function Ne(t){let e,n;return e=new qe({props:{decorator:t[2],nodes:t[1],scoped:{...t[0],...t[25]}}}),{c(){Bt(e.$$.fragment)},m(t,o){Dt(e,t,o),n=!0},p(t,n){const o={};4&n&&(o.decorator=t[2]),16&n&&(o.nodes=t[1]),33554433&n&&(o.scoped={...t[0],...t[25]}),e.$set(o)},i(t){n||(St(e.$$.fragment,t),n=!0)},o(t){Lt(e.$$.fragment,t),n=!1},d(t){Ut(e,t)}}}function Re(t){let e,n,o=t[21]&&t[1].length&&Ne(t);return{c(){o&&o.c(),e=F()},m(t,r){o&&o.m(t,r),I(t,e,r),n=!0},p(t,n){t[21]&&t[1].length?o?(o.p(t,n),16&n&&St(o,1)):(o=Ne(t),o.c(),St(o,1),o.m(e.parentNode,e)):o&&(Ot(),Lt(o,1,1,(()=>{o=null})),It())},i(t){n||(St(o),n=!0)},o(t){Lt(o),n=!1},d(t){o&&o.d(t),t&&S(e)}}}function Te(t){let e,o,r;const s=[{scoped:t[0]},{scopedSync:t[5]},t[3].param||{}];var i=t[22];function a(t){let e={$$slots:{default:[Re,({scoped:t,decorator:e})=>({25:t,2:e}),({scoped:t,decorator:e})=>(t?33554432:0)|(e?4:0)]},$$scope:{ctx:t}};for(let t=0;t<s.length;t+=1)e=n(e,s[t]);return{props:e}}return i&&(e=new i(a(t))),{c(){e&&Bt(e.$$.fragment),o=A()},m(t,n){e&&Dt(e,t,n),I(t,o,n),r=!0},p(t,n){const r=41&n?Ct(s,[1&n&&{scoped:t[0]},32&n&&{scopedSync:t[5]},8&n&&Mt(t[3].param||{})]):{};if(100663317&n&&(r.$$scope={dirty:n,ctx:t}),i!==(i=t[22])){if(e){Ot();const t=e;Lt(t.$$.fragment,1,0,(()=>{Ut(t,1)})),It()}i?(e=new i(a(t)),Bt(e.$$.fragment),St(e.$$.fragment,1),Dt(e,o.parentNode,o)):e=null}else i&&e.$set(r)},i(t){r||(e&&St(e.$$.fragment,t),r=!0)},o(t){e&&Lt(e.$$.fragment,t),r=!1},d(t){e&&Ut(e,t),t&&S(o)}}}function Ae(t,e){let n,o,r,s;var i=e[2];function a(t){return{props:{scoped:t[0],$$slots:{default:[Te]},$$scope:{ctx:t}}}}return i&&(o=new i(a(e))),{key:t,first:null,c(){n=F(),o&&Bt(o.$$.fragment),r=F(),this.first=n},m(t,e){I(t,n,e),o&&Dt(o,t,e),I(t,r,e),s=!0},p(t,n){e=t;const s={};if(1&n&&(s.scoped=e[0]),67108925&n&&(s.$$scope={dirty:n,ctx:e}),i!==(i=e[2])){if(o){Ot();const t=o;Lt(t.$$.fragment,1,0,(()=>{Ut(t,1)})),It()}i?(o=new i(a(e)),Bt(o.$$.fragment),St(o.$$.fragment,1),Dt(o,r.parentNode,r)):o=null}else i&&o.$set(s)},i(t){s||(o&&St(o.$$.fragment,t),s=!0)},o(t){o&&Lt(o.$$.fragment,t),s=!1},d(t){t&&S(n),t&&S(r),o&&Ut(o,t)}}}function Fe(e){let n,o,r,s;return{c(){n=N("div"),W(n,"display","contents")},m(a,c){var l;I(a,n,c),r||(l=o=e[10].call(null,n),s=l&&i(l.destroy)?l.destroy:t,r=!0)},d(t){t&&S(n),r=!1,s()}}}function Ce(t){let e,n,o,r=t[4]&&Le(t),s=!t[6]&&Fe(t);return{c(){r&&r.c(),e=A(),s&&s.c(),n=F()},m(t,i){r&&r.m(t,i),I(t,e,i),s&&s.m(t,i),I(t,n,i),o=!0},p(t,[o]){t[4]?r?(r.p(t,o),16&o&&St(r,1)):(r=Le(t),r.c(),St(r,1),r.m(e.parentNode,e)):r&&(Ot(),Lt(r,1,1,(()=>{r=null})),It()),t[6]?s&&(s.d(1),s=null):s||(s=Fe(t),s.c(),s.m(n.parentNode,n))},i(t){o||(St(r),o=!0)},o(t){Lt(r),o=!1},d(t){r&&r.d(t),t&&S(e),s&&s.d(t),t&&S(n)}}}function Me(t,e,n){let o,r,s,i,a;d(t,ae,(t=>n(14,s=t))),d(t,ce,(t=>n(16,a=t)));let c,{nodes:l=[]}=e,{scoped:u={}}=e,{decorator:f}=e,p=null,h=null,m={},g=1;const $=se(null);d(t,$,(t=>n(4,r=t)));const y=ct("routify")||le;d(t,y,(t=>n(15,i=t)));at("routify",$);let b=[];function w(t){n(5,m={...u});const e={...r,nodes:h,decorator:f||ne,layout:p.isLayout?p:i.layout,component:p,route:s,routes:a,componentFile:t,parentNode:c||i.parentNode};$.set(e),_(y,i.child=p,i),0===h.length&&async function(){await new Promise((t=>setTimeout(t)));const t=r.component.path===s.path;!window.routify.stopAutoReady&&t&&async function({page:t,metatags:e,afterPageLoad:n,parentNode:o}){const r=t.last!==t;setTimeout((()=>Jt(o,r)));const{path:s}=t,{options:i}=Zt(),a=i.prefetch;for(const e of n._hooks)e&&await e(t.api);e.update(),dispatchEvent(new CustomEvent("app-loaded")),parent.postMessage({msg:"app-loaded",prefetched:window.routify.prefetched,path:s,prefetchId:a},"*"),window.routify.appLoaded=!0,window.routify.stopAutoReady=!1}({page:r.component,metatags:Ie,afterPageLoad:ve,parentNode:c})}()}return t.$$set=t=>{"nodes"in t&&n(1,l=t.nodes),"scoped"in t&&n(0,u=t.scoped),"decorator"in t&&n(2,f=t.decorator)},t.$$.update=()=>{6146&t.$$.dirty&&b!==l&&(n(12,b=l),n(3,[p,...h]=[...l],p),n(3,p.api.reset=()=>n(11,g++,g),p)),8&t.$$.dirty&&function(t){let e=t.component();e instanceof Promise?e.then(w):w(e)}(p),2064&t.$$.dirty&&n(7,o=r&&g&&function({meta:t,path:e,param:n,params:o}){return JSON.stringify({path:e,invalidate:g,param:(t["param-is-page"]||t["slug-is-page"])&&n,queryParams:t["query-params-is-page"]&&o})}(r.component)),16&t.$$.dirty&&r&&Vt(r,$t)},[u,l,f,p,r,m,c,o,$,y,t=>n(6,c=t.parentNode),g,b]}class qe extends Kt{constructor(t){super(),Ht(this,t,Me,Ce,a,{nodes:1,scoped:0,decorator:2})}}function Be(t,e){let n=!1;function o(o,r){const s=de(o||Zt().fullpath);s.redirectTo&&(history.replaceStateNative({},null,s.redirectTo),delete s.redirectTo);const i=[...(r&&de(Zt().fullpath,t)||s).layouts,s];n&&delete n.last,s.last=n,n=s,o||ue.set(s),ae.set(s),s.api.preload().then((()=>{fe.set(!0),e(i)}))}const r=function(t){["pushState","replaceState"].forEach((t=>{history[t+"Native"]||(history[t+"Native"]=history[t]),history[t]=async function(e={},n,o){if(o===location.pathname+location.search+location.hash)return!1;const{id:r,path:s,params:i}=f(ae);e={id:r,path:s,params:i,...e};const a=new Event(t.toLowerCase());Object.assign(a,{state:e,title:n,url:o});return await Ue(a,o)?(history[t+"Native"].apply(this,[e,n,o]),dispatchEvent(a)):void 0}}));let e=!1;const n={click:De,pushstate:()=>t(),replacestate:()=>t(),popstate:async n=>{e?e=!1:await Ue(n,Zt().fullpath)?t():(e=!0,n.preventDefault(),history.go(1))}};Object.entries(n).forEach((t=>addEventListener(...t)));return()=>{Object.entries(n).forEach((t=>removeEventListener(...t)))}}(o);return{updatePage:o,destroy:r}}function De(t){const e=t.target.closest("a"),n=e&&e.href;if(t.ctrlKey||t.metaKey||t.altKey||t.shiftKey||t.button||t.defaultPrevented)return;if(!n||e.target||e.host!==location.host)return;const o=new URL(n),r=o.pathname+o.search+o.hash;t.preventDefault(),history.pushState({},"",r)}async function Ue(t,e){const n=de(e).api;for(const o of Pe._hooks.filter(Boolean)){if(!await o(t,n,{url:e}))return!1}return!0}function He(t){let e,n;return e=new qe({props:{nodes:t[0]}}),{c(){Bt(e.$$.fragment)},m(t,o){Dt(e,t,o),n=!0},p(t,n){const o={};1&n&&(o.nodes=t[0]),e.$set(o)},i(t){n||(St(e.$$.fragment,t),n=!0)},o(t){Lt(e.$$.fragment,t),n=!1},d(t){Ut(e,t)}}}function Ke(t){let e,n,o,r=t[0]&&null!==t[1]&&He(t);return n=new we({}),{c(){r&&r.c(),e=A(),Bt(n.$$.fragment)},m(t,s){r&&r.m(t,s),I(t,e,s),Dt(n,t,s),o=!0},p(t,[n]){t[0]&&null!==t[1]?r?(r.p(t,n),3&n&&St(r,1)):(r=He(t),r.c(),St(r,1),r.m(e.parentNode,e)):r&&(Ot(),Lt(r,1,1,(()=>{r=null})),It())},i(t){o||(St(r),St(n.$$.fragment,t),o=!0)},o(t){Lt(r),Lt(n.$$.fragment,t),o=!1},d(t){r&&r.d(t),t&&S(e),Ut(n,t)}}}function ze(t,e,n){let o;d(t,ae,(t=>n(1,o=t)));let r,s,{routes:i}=e,{config:a={}}=e;window.routify=window.routify||{},window.routify.inBrowser=!window.navigator.userAgent.match("jsdom"),Object.assign(zt,a);at("routifyupdatepage",((...t)=>s&&s.updatePage(...t)));const c=t=>n(0,r=t),l=()=>{s&&(s.destroy(),s=null)};let u=null;return st(l),t.$$set=t=>{"routes"in t&&n(2,i=t.routes),"config"in t&&n(3,a=t.config)},t.$$.update=()=>{4&t.$$.dirty&&i&&(clearTimeout(u),u=setTimeout((()=>{l(),s=Be(i,c),ce.set(i),s.updatePage()})))},[r,o,i,a]}class We extends Kt{constructor(t){super(),Ht(this,t,ze,Ke,a,{routes:2,config:3})}}function Je(t){const e=async function(e){return await Ge(t,{file:e.tree,state:{treePayload:e},scope:{}})};return e.sync=function(e){return Qe(t,{file:e.tree,state:{treePayload:e},scope:{}})},e}async function Ge(t,e){const n=await t(e);if(!1===n)return!1;const o=n||e.file;if(o.children){const n=await Promise.all(o.children.map((async n=>Ge(t,{state:e.state,scope:Ve(e.scope||{}),parent:e.file,file:await n}))));o.children=n.filter(Boolean)}return o}function Qe(t,e){const n=t(e);if(!1===n)return!1;const o=n||e.file;if(o.children){const n=o.children.map((n=>Qe(t,{state:e.state,scope:Ve(e.scope||{}),parent:e.file,file:n})));o.children=n.filter(Boolean)}return o}function Ve(t){return JSON.parse(JSON.stringify(t))}const Ze=Je((({file:t})=>{(t.isPage||t.isFallback)&&(t.regex=((t,e)=>{const n=e?"":"/?$";return`^${t=(t=(t=t.replace(/\/_fallback?$/,"(/|$)")).replace(/\/index$/,"(/index)?")).replace(Wt,"([^/]+)")+n}`})(t.path,t.isFallback))})),Xe=Je((({file:t})=>{t.paramKeys=Qt(t.path)})),Ye=Je((({file:t})=>{t.isFallback||t.isIndex?t.shortPath=t.path.replace(/\/[^/]+$/,""):t.shortPath=t.path})),tn=Je((({file:t})=>{t.ranking=(({path:t})=>t.split("/").filter(Boolean).map((t=>"_fallback"===t?"A":t.startsWith(":")?"B":"C")).join(""))(t)})),en=Je((({file:t})=>{const e=t,n=t.meta&&t.meta.children||[];n.length&&(e.children=e.children||[],e.children.push(...n.map((t=>({isMeta:!0,...t,meta:t})))))})),nn=Je((t=>{const{file:e}=t,{isFallback:n,meta:o}=e,r=e.path.split("/").pop().startsWith(":"),s=e.path.endsWith("/index"),i=o.index||0===o.index,a=!1===o.index;e.isIndexable=i||!n&&!r&&!s&&!a,e.isNonIndexable=!e.isIndexable})),on=Je((({file:t,parent:e})=>{Object.defineProperty(t,"parent",{get:()=>e}),Object.defineProperty(t,"nextSibling",{get:()=>sn(t,1)}),Object.defineProperty(t,"prevSibling",{get:()=>sn(t,-1)}),Object.defineProperty(t,"lineage",{get:()=>rn(e)})}));function rn(t,e=[]){return t&&(e.unshift(t),rn(t.parent,e)),e}function sn(t,e){if(!t.root){const n=t.parent.children.filter((t=>t.isIndexable)),o=n.indexOf(t);return n[o+e]}}const an=Je((({file:t,parent:e})=>{t.isIndex&&Object.defineProperty(e,"index",{get:()=>t})})),cn=Je((({file:t,scope:e})=>{function n(t){if(!t.isLayout&&t.meta.reset)return[];const{parent:e}=t,o=e&&e.component&&e,r=o&&(o.isReset||o.meta.reset),s=e&&!r&&n(e)||[];return o&&s.push(o),s}Object.defineProperty(t,"layouts",{get:()=>n(t)})})),ln=Je((({file:t})=>{const e=t.root?function(){}:t.children?(t.isPage,function(){}):(t.isReset||t.isLayout||t.isFallback,function(){});Object.setPrototypeOf(t,e.prototype)}));var un=Object.freeze({__proto__:null,setRegex:Ze,setParamKeys:Xe,setShortPath:Ye,setRank:tn,addMetaChildren:en,setIsIndexable:nn,assignRelations:on,assignIndex:an,assignLayout:cn,createFlatList:t=>{Je((t=>{(t.file.isPage||t.file.isFallback)&&t.state.treePayload.routes.push(t.file)})).sync(t),t.routes.sort(((t,e)=>t.ranking>=e.ranking?-1:1))},setPrototype:ln});const fn={isDir:!1,ext:"svelte",isLayout:!1,isReset:!1,isIndex:!1,isFallback:!1,isPage:!1,ownMeta:{},meta:{recursive:!0,preload:!1,prerender:!0},id:"__fallback"};function dn(t){return Object.entries(fn).forEach((([e,n])=>{void 0===t[e]&&(t[e]=n)})),t.children&&(t.children=t.children.map(dn)),t}const pn=Je((({file:t})=>{t.api=new hn(t)}));class hn{constructor(t){this.__file=t,Object.defineProperty(this,"__file",{enumerable:!1}),this.isMeta=!!t.isMeta,this.path=t.path,this.title=function(t){return void 0!==t.meta.title?t.meta.title:(t.shortPath||t.path).split("/").pop().replace(/-/g," ")}(t),this.meta=t.meta}get parent(){return!this.__file.root&&this.__file.parent.api}get children(){return(this.__file.children||this.__file.isLayout&&this.__file.parent.children||[]).filter((t=>!t.isNonIndexable)).sort(((t,e)=>t.isMeta&&e.isMeta?0:(t=(t.meta.index||t.meta.title||t.path).toString(),e=(e.meta.index||e.meta.title||e.path).toString(),t.localeCompare(e,void 0,{numeric:!0,sensitivity:"base"})))).map((({api:t})=>t))}get next(){return mn(this,1)}get prev(){return mn(this,-1)}async preload(){const t=[...this.__file.layouts,this.__file,this.index&&this.index.__file].filter(Boolean).map((t=>t.component()));await Promise.all(t)}get component(){return this.__file.component?this.__file.component():!!this.__file.index&&this.__file.index.component()}get componentWithIndex(){return new Promise((t=>Promise.all([this.component,this.index&&this.index.component]).then((e=>t(e)))))}get index(){const t=this.__file.children&&this.__file.children.find((t=>t.isIndex));return t&&t.api}}function mn(t,e){if(!t.__file.root){const n=t.parent.children.indexOf(t);return t.parent.children[n+e]}}const gn={...un,restoreDefaults:({tree:t})=>dn(t),assignAPI:pn};const $n={root:!0,children:[{isFallback:!0,path:"/_fallback",component:()=>import("./_fallback-df55d12f.js").then((t=>t.default))},{isPage:!0,path:"/examples",id:"_examples",component:()=>import("./examples-4a46d10c.js").then((t=>t.default))},{isIndex:!0,isPage:!0,path:"/index",id:"_index",component:()=>import("./index-bbf8bb5b.js").then((t=>t.default))},{isPage:!0,path:"/layout",id:"_layout",component:()=>import("./layout-be33f1db.js").then((t=>t.default))},{isDir:!0,ext:"",children:[{isIndex:!0,isPage:!0,path:"/login/index",id:"_login_index",component:()=>import("./index-a7f96b72.js").then((t=>t.default))}],path:"/login"},{isDir:!0,children:[{isIndex:!0,isPage:!0,path:"/sign-in-callback/index",id:"_signInCallback_index",component:()=>import("./index-bfe10473.js").then((t=>t.default))}],isLayout:!0,isReset:!0,path:"/sign-in-callback",id:"_signInCallback__reset",component:()=>import("./_reset-0d28f3b9.js").then((t=>t.default))}],isLayout:!0,path:"/",id:"__layout",component:()=>import("./_layout-33bb9409.js").then((t=>t.default))},{tree:yn,routes:bn}=function(t){const e=["restoreDefaults","setParamKeys","setRegex","setShortPath","setRank","assignLayout","setPrototype","addMetaChildren","assignRelations","setIsIndexable","assignIndex","assignAPI","createFlatList"],n={tree:t,routes:[]};for(let t of e){(gn[t].sync||gn[t])(n)}return n}($n);function _n(e){let n,o;return n=new We({props:{routes:bn}}),{c(){Bt(n.$$.fragment)},m(t,e){Dt(n,t,e),o=!0},p:t,i(t){o||(St(n.$$.fragment,t),o=!0)},o(t){Lt(n.$$.fragment,t),o=!1},d(t){Ut(n,t)}}}!function(t,e={target:document.body},n="hmr",o="app-loaded"){const r=document.getElementById(n),s=document.createElement("div");function i(){removeEventListener(o,i),r&&r.remove(),s.style.visibility=null,s.setAttribute("id",n)}s.style.visibility="hidden",e.target.appendChild(s),r?addEventListener(o,i):i(),new t({...e,target:s})}(class extends Kt{constructor(t){super(),Ht(this,t,null,_n,a,{})}},{target:document.body},"routify-app");export{yt as $,Bt as A,Dt as B,Ut as C,it as D,se as E,_ as F,e as G,$t as H,st as I,b as J,n as K,y as L,U as M,B as N,q as O,Ct as P,Ot as Q,It as R,Kt as S,Mt as T,nt as U,i as V,l as W,je as X,qt as Y,bt as Z,W as _,A as a,Rt as a0,at as a1,ct as a2,Ft as a3,At as a4,rt as a5,R as a6,f as a7,z as a8,M as a9,L as aa,H as ab,re as ac,ie as ad,D as b,I as c,E as d,N as e,S as f,d as g,p as h,Ht as i,J as j,g as k,C as l,$ as m,t as n,m as o,St as p,Lt as q,lt as r,a as s,T as t,Ee as u,K as v,s as w,ot as x,F as y,ft as z};
//# sourceMappingURL=main.js.map
