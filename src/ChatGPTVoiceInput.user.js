// ==UserScript==
// @name         ChatGPT: 語音輸入與語音合成功能 (支援中/英/日/韓語言)
// @version      2.5.0
// @description  讓你可以透過語音輸入要問 ChatGPT 的問題並支援語音合成功能 (支援中文、英文、日文、韓文)
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTVoiceInput.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTVoiceInput.user.js
// @match        *://chat.openai.com/
// @match        *://chat.openai.com/*
// @author       Will Huang
// @run-at       document-idle
// @icon         https://www.google.com/s2/favicons?sz=64&domain=openai.com
// ==/UserScript==
(() => {
  // node_modules/tslib/tslib.es6.mjs
  var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
      d2.__proto__ = b2;
    } || function(d2, b2) {
      for (var p in b2)
        if (Object.prototype.hasOwnProperty.call(b2, p))
          d2[p] = b2[p];
    };
    return extendStatics(d, b);
  };
  function __extends(d, b) {
    if (typeof b !== "function" && b !== null)
      throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() {
      this.constructor = d;
    }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  }
  function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  }
  function __generator(thisArg, body) {
    var _ = { label: 0, sent: function() {
      if (t[0] & 1)
        throw t[1];
      return t[1];
    }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
      return this;
    }), g;
    function verb(n) {
      return function(v) {
        return step([n, v]);
      };
    }
    function step(op) {
      if (f)
        throw new TypeError("Generator is already executing.");
      while (g && (g = 0, op[0] && (_ = 0)), _)
        try {
          if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
            return t;
          if (y = 0, t)
            op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return { value: op[1], done: false };
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2])
                _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
      if (op[0] & 5)
        throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  }
  function __values(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m)
      return m.call(o);
    if (o && typeof o.length === "number")
      return {
        next: function() {
          if (o && i >= o.length)
            o = void 0;
          return { value: o && o[i++], done: !o };
        }
      };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
  }
  function __read(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m)
      return o;
    var i = m.call(o), r, ar = [], e;
    try {
      while ((n === void 0 || n-- > 0) && !(r = i.next()).done)
        ar.push(r.value);
    } catch (error) {
      e = { error };
    } finally {
      try {
        if (r && !r.done && (m = i["return"]))
          m.call(i);
      } finally {
        if (e)
          throw e.error;
      }
    }
    return ar;
  }
  function __spreadArray(to, from2, pack) {
    if (pack || arguments.length === 2)
      for (var i = 0, l = from2.length, ar; i < l; i++) {
        if (ar || !(i in from2)) {
          if (!ar)
            ar = Array.prototype.slice.call(from2, 0, i);
          ar[i] = from2[i];
        }
      }
    return to.concat(ar || Array.prototype.slice.call(from2));
  }
  function __await(v) {
    return this instanceof __await ? (this.v = v, this) : new __await(v);
  }
  function __asyncGenerator(thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator)
      throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
      return this;
    }, i;
    function verb(n) {
      if (g[n])
        i[n] = function(v) {
          return new Promise(function(a, b) {
            q.push([n, v, a, b]) > 1 || resume(n, v);
          });
        };
    }
    function resume(n, v) {
      try {
        step(g[n](v));
      } catch (e) {
        settle(q[0][3], e);
      }
    }
    function step(r) {
      r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);
    }
    function fulfill(value) {
      resume("next", value);
    }
    function reject(value) {
      resume("throw", value);
    }
    function settle(f, v) {
      if (f(v), q.shift(), q.length)
        resume(q[0][0], q[0][1]);
    }
  }
  function __asyncValues(o) {
    if (!Symbol.asyncIterator)
      throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
      return this;
    }, i);
    function verb(n) {
      i[n] = o[n] && function(v) {
        return new Promise(function(resolve, reject) {
          v = o[n](v), settle(resolve, reject, v.done, v.value);
        });
      };
    }
    function settle(resolve, reject, d, v) {
      Promise.resolve(v).then(function(v2) {
        resolve({ value: v2, done: d });
      }, reject);
    }
  }

  // node_modules/rxjs/dist/esm5/internal/util/isFunction.js
  function isFunction(value) {
    return typeof value === "function";
  }

  // node_modules/rxjs/dist/esm5/internal/util/createErrorClass.js
  function createErrorClass(createImpl) {
    var _super = function(instance) {
      Error.call(instance);
      instance.stack = new Error().stack;
    };
    var ctorFunc = createImpl(_super);
    ctorFunc.prototype = Object.create(Error.prototype);
    ctorFunc.prototype.constructor = ctorFunc;
    return ctorFunc;
  }

  // node_modules/rxjs/dist/esm5/internal/util/UnsubscriptionError.js
  var UnsubscriptionError = createErrorClass(function(_super) {
    return function UnsubscriptionErrorImpl(errors) {
      _super(this);
      this.message = errors ? errors.length + " errors occurred during unsubscription:\n" + errors.map(function(err, i) {
        return i + 1 + ") " + err.toString();
      }).join("\n  ") : "";
      this.name = "UnsubscriptionError";
      this.errors = errors;
    };
  });

  // node_modules/rxjs/dist/esm5/internal/util/arrRemove.js
  function arrRemove(arr, item) {
    if (arr) {
      var index = arr.indexOf(item);
      0 <= index && arr.splice(index, 1);
    }
  }

  // node_modules/rxjs/dist/esm5/internal/Subscription.js
  var Subscription = function() {
    function Subscription2(initialTeardown) {
      this.initialTeardown = initialTeardown;
      this.closed = false;
      this._parentage = null;
      this._finalizers = null;
    }
    Subscription2.prototype.unsubscribe = function() {
      var e_1, _a, e_2, _b;
      var errors;
      if (!this.closed) {
        this.closed = true;
        var _parentage = this._parentage;
        if (_parentage) {
          this._parentage = null;
          if (Array.isArray(_parentage)) {
            try {
              for (var _parentage_1 = __values(_parentage), _parentage_1_1 = _parentage_1.next(); !_parentage_1_1.done; _parentage_1_1 = _parentage_1.next()) {
                var parent_1 = _parentage_1_1.value;
                parent_1.remove(this);
              }
            } catch (e_1_1) {
              e_1 = { error: e_1_1 };
            } finally {
              try {
                if (_parentage_1_1 && !_parentage_1_1.done && (_a = _parentage_1.return))
                  _a.call(_parentage_1);
              } finally {
                if (e_1)
                  throw e_1.error;
              }
            }
          } else {
            _parentage.remove(this);
          }
        }
        var initialFinalizer = this.initialTeardown;
        if (isFunction(initialFinalizer)) {
          try {
            initialFinalizer();
          } catch (e) {
            errors = e instanceof UnsubscriptionError ? e.errors : [e];
          }
        }
        var _finalizers = this._finalizers;
        if (_finalizers) {
          this._finalizers = null;
          try {
            for (var _finalizers_1 = __values(_finalizers), _finalizers_1_1 = _finalizers_1.next(); !_finalizers_1_1.done; _finalizers_1_1 = _finalizers_1.next()) {
              var finalizer = _finalizers_1_1.value;
              try {
                execFinalizer(finalizer);
              } catch (err) {
                errors = errors !== null && errors !== void 0 ? errors : [];
                if (err instanceof UnsubscriptionError) {
                  errors = __spreadArray(__spreadArray([], __read(errors)), __read(err.errors));
                } else {
                  errors.push(err);
                }
              }
            }
          } catch (e_2_1) {
            e_2 = { error: e_2_1 };
          } finally {
            try {
              if (_finalizers_1_1 && !_finalizers_1_1.done && (_b = _finalizers_1.return))
                _b.call(_finalizers_1);
            } finally {
              if (e_2)
                throw e_2.error;
            }
          }
        }
        if (errors) {
          throw new UnsubscriptionError(errors);
        }
      }
    };
    Subscription2.prototype.add = function(teardown) {
      var _a;
      if (teardown && teardown !== this) {
        if (this.closed) {
          execFinalizer(teardown);
        } else {
          if (teardown instanceof Subscription2) {
            if (teardown.closed || teardown._hasParent(this)) {
              return;
            }
            teardown._addParent(this);
          }
          (this._finalizers = (_a = this._finalizers) !== null && _a !== void 0 ? _a : []).push(teardown);
        }
      }
    };
    Subscription2.prototype._hasParent = function(parent) {
      var _parentage = this._parentage;
      return _parentage === parent || Array.isArray(_parentage) && _parentage.includes(parent);
    };
    Subscription2.prototype._addParent = function(parent) {
      var _parentage = this._parentage;
      this._parentage = Array.isArray(_parentage) ? (_parentage.push(parent), _parentage) : _parentage ? [_parentage, parent] : parent;
    };
    Subscription2.prototype._removeParent = function(parent) {
      var _parentage = this._parentage;
      if (_parentage === parent) {
        this._parentage = null;
      } else if (Array.isArray(_parentage)) {
        arrRemove(_parentage, parent);
      }
    };
    Subscription2.prototype.remove = function(teardown) {
      var _finalizers = this._finalizers;
      _finalizers && arrRemove(_finalizers, teardown);
      if (teardown instanceof Subscription2) {
        teardown._removeParent(this);
      }
    };
    Subscription2.EMPTY = function() {
      var empty = new Subscription2();
      empty.closed = true;
      return empty;
    }();
    return Subscription2;
  }();
  var EMPTY_SUBSCRIPTION = Subscription.EMPTY;
  function isSubscription(value) {
    return value instanceof Subscription || value && "closed" in value && isFunction(value.remove) && isFunction(value.add) && isFunction(value.unsubscribe);
  }
  function execFinalizer(finalizer) {
    if (isFunction(finalizer)) {
      finalizer();
    } else {
      finalizer.unsubscribe();
    }
  }

  // node_modules/rxjs/dist/esm5/internal/config.js
  var config = {
    onUnhandledError: null,
    onStoppedNotification: null,
    Promise: void 0,
    useDeprecatedSynchronousErrorHandling: false,
    useDeprecatedNextContext: false
  };

  // node_modules/rxjs/dist/esm5/internal/scheduler/timeoutProvider.js
  var timeoutProvider = {
    setTimeout: function(handler, timeout) {
      var args = [];
      for (var _i = 2; _i < arguments.length; _i++) {
        args[_i - 2] = arguments[_i];
      }
      var delegate = timeoutProvider.delegate;
      if (delegate === null || delegate === void 0 ? void 0 : delegate.setTimeout) {
        return delegate.setTimeout.apply(delegate, __spreadArray([handler, timeout], __read(args)));
      }
      return setTimeout.apply(void 0, __spreadArray([handler, timeout], __read(args)));
    },
    clearTimeout: function(handle) {
      var delegate = timeoutProvider.delegate;
      return ((delegate === null || delegate === void 0 ? void 0 : delegate.clearTimeout) || clearTimeout)(handle);
    },
    delegate: void 0
  };

  // node_modules/rxjs/dist/esm5/internal/util/reportUnhandledError.js
  function reportUnhandledError(err) {
    timeoutProvider.setTimeout(function() {
      var onUnhandledError = config.onUnhandledError;
      if (onUnhandledError) {
        onUnhandledError(err);
      } else {
        throw err;
      }
    });
  }

  // node_modules/rxjs/dist/esm5/internal/util/noop.js
  function noop() {
  }

  // node_modules/rxjs/dist/esm5/internal/NotificationFactories.js
  var COMPLETE_NOTIFICATION = function() {
    return createNotification("C", void 0, void 0);
  }();
  function errorNotification(error) {
    return createNotification("E", void 0, error);
  }
  function nextNotification(value) {
    return createNotification("N", value, void 0);
  }
  function createNotification(kind, value, error) {
    return {
      kind,
      value,
      error
    };
  }

  // node_modules/rxjs/dist/esm5/internal/util/errorContext.js
  var context = null;
  function errorContext(cb) {
    if (config.useDeprecatedSynchronousErrorHandling) {
      var isRoot = !context;
      if (isRoot) {
        context = { errorThrown: false, error: null };
      }
      cb();
      if (isRoot) {
        var _a = context, errorThrown = _a.errorThrown, error = _a.error;
        context = null;
        if (errorThrown) {
          throw error;
        }
      }
    } else {
      cb();
    }
  }
  function captureError(err) {
    if (config.useDeprecatedSynchronousErrorHandling && context) {
      context.errorThrown = true;
      context.error = err;
    }
  }

  // node_modules/rxjs/dist/esm5/internal/Subscriber.js
  var Subscriber = function(_super) {
    __extends(Subscriber2, _super);
    function Subscriber2(destination) {
      var _this = _super.call(this) || this;
      _this.isStopped = false;
      if (destination) {
        _this.destination = destination;
        if (isSubscription(destination)) {
          destination.add(_this);
        }
      } else {
        _this.destination = EMPTY_OBSERVER;
      }
      return _this;
    }
    Subscriber2.create = function(next, error, complete) {
      return new SafeSubscriber(next, error, complete);
    };
    Subscriber2.prototype.next = function(value) {
      if (this.isStopped) {
        handleStoppedNotification(nextNotification(value), this);
      } else {
        this._next(value);
      }
    };
    Subscriber2.prototype.error = function(err) {
      if (this.isStopped) {
        handleStoppedNotification(errorNotification(err), this);
      } else {
        this.isStopped = true;
        this._error(err);
      }
    };
    Subscriber2.prototype.complete = function() {
      if (this.isStopped) {
        handleStoppedNotification(COMPLETE_NOTIFICATION, this);
      } else {
        this.isStopped = true;
        this._complete();
      }
    };
    Subscriber2.prototype.unsubscribe = function() {
      if (!this.closed) {
        this.isStopped = true;
        _super.prototype.unsubscribe.call(this);
        this.destination = null;
      }
    };
    Subscriber2.prototype._next = function(value) {
      this.destination.next(value);
    };
    Subscriber2.prototype._error = function(err) {
      try {
        this.destination.error(err);
      } finally {
        this.unsubscribe();
      }
    };
    Subscriber2.prototype._complete = function() {
      try {
        this.destination.complete();
      } finally {
        this.unsubscribe();
      }
    };
    return Subscriber2;
  }(Subscription);
  var _bind = Function.prototype.bind;
  function bind(fn, thisArg) {
    return _bind.call(fn, thisArg);
  }
  var ConsumerObserver = function() {
    function ConsumerObserver2(partialObserver) {
      this.partialObserver = partialObserver;
    }
    ConsumerObserver2.prototype.next = function(value) {
      var partialObserver = this.partialObserver;
      if (partialObserver.next) {
        try {
          partialObserver.next(value);
        } catch (error) {
          handleUnhandledError(error);
        }
      }
    };
    ConsumerObserver2.prototype.error = function(err) {
      var partialObserver = this.partialObserver;
      if (partialObserver.error) {
        try {
          partialObserver.error(err);
        } catch (error) {
          handleUnhandledError(error);
        }
      } else {
        handleUnhandledError(err);
      }
    };
    ConsumerObserver2.prototype.complete = function() {
      var partialObserver = this.partialObserver;
      if (partialObserver.complete) {
        try {
          partialObserver.complete();
        } catch (error) {
          handleUnhandledError(error);
        }
      }
    };
    return ConsumerObserver2;
  }();
  var SafeSubscriber = function(_super) {
    __extends(SafeSubscriber2, _super);
    function SafeSubscriber2(observerOrNext, error, complete) {
      var _this = _super.call(this) || this;
      var partialObserver;
      if (isFunction(observerOrNext) || !observerOrNext) {
        partialObserver = {
          next: observerOrNext !== null && observerOrNext !== void 0 ? observerOrNext : void 0,
          error: error !== null && error !== void 0 ? error : void 0,
          complete: complete !== null && complete !== void 0 ? complete : void 0
        };
      } else {
        var context_1;
        if (_this && config.useDeprecatedNextContext) {
          context_1 = Object.create(observerOrNext);
          context_1.unsubscribe = function() {
            return _this.unsubscribe();
          };
          partialObserver = {
            next: observerOrNext.next && bind(observerOrNext.next, context_1),
            error: observerOrNext.error && bind(observerOrNext.error, context_1),
            complete: observerOrNext.complete && bind(observerOrNext.complete, context_1)
          };
        } else {
          partialObserver = observerOrNext;
        }
      }
      _this.destination = new ConsumerObserver(partialObserver);
      return _this;
    }
    return SafeSubscriber2;
  }(Subscriber);
  function handleUnhandledError(error) {
    if (config.useDeprecatedSynchronousErrorHandling) {
      captureError(error);
    } else {
      reportUnhandledError(error);
    }
  }
  function defaultErrorHandler(err) {
    throw err;
  }
  function handleStoppedNotification(notification, subscriber) {
    var onStoppedNotification = config.onStoppedNotification;
    onStoppedNotification && timeoutProvider.setTimeout(function() {
      return onStoppedNotification(notification, subscriber);
    });
  }
  var EMPTY_OBSERVER = {
    closed: true,
    next: noop,
    error: defaultErrorHandler,
    complete: noop
  };

  // node_modules/rxjs/dist/esm5/internal/symbol/observable.js
  var observable = function() {
    return typeof Symbol === "function" && Symbol.observable || "@@observable";
  }();

  // node_modules/rxjs/dist/esm5/internal/util/identity.js
  function identity(x) {
    return x;
  }

  // node_modules/rxjs/dist/esm5/internal/util/pipe.js
  function pipeFromArray(fns) {
    if (fns.length === 0) {
      return identity;
    }
    if (fns.length === 1) {
      return fns[0];
    }
    return function piped(input) {
      return fns.reduce(function(prev, fn) {
        return fn(prev);
      }, input);
    };
  }

  // node_modules/rxjs/dist/esm5/internal/Observable.js
  var Observable = function() {
    function Observable2(subscribe) {
      if (subscribe) {
        this._subscribe = subscribe;
      }
    }
    Observable2.prototype.lift = function(operator) {
      var observable2 = new Observable2();
      observable2.source = this;
      observable2.operator = operator;
      return observable2;
    };
    Observable2.prototype.subscribe = function(observerOrNext, error, complete) {
      var _this = this;
      var subscriber = isSubscriber(observerOrNext) ? observerOrNext : new SafeSubscriber(observerOrNext, error, complete);
      errorContext(function() {
        var _a = _this, operator = _a.operator, source = _a.source;
        subscriber.add(operator ? operator.call(subscriber, source) : source ? _this._subscribe(subscriber) : _this._trySubscribe(subscriber));
      });
      return subscriber;
    };
    Observable2.prototype._trySubscribe = function(sink) {
      try {
        return this._subscribe(sink);
      } catch (err) {
        sink.error(err);
      }
    };
    Observable2.prototype.forEach = function(next, promiseCtor) {
      var _this = this;
      promiseCtor = getPromiseCtor(promiseCtor);
      return new promiseCtor(function(resolve, reject) {
        var subscriber = new SafeSubscriber({
          next: function(value) {
            try {
              next(value);
            } catch (err) {
              reject(err);
              subscriber.unsubscribe();
            }
          },
          error: reject,
          complete: resolve
        });
        _this.subscribe(subscriber);
      });
    };
    Observable2.prototype._subscribe = function(subscriber) {
      var _a;
      return (_a = this.source) === null || _a === void 0 ? void 0 : _a.subscribe(subscriber);
    };
    Observable2.prototype[observable] = function() {
      return this;
    };
    Observable2.prototype.pipe = function() {
      var operations = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        operations[_i] = arguments[_i];
      }
      return pipeFromArray(operations)(this);
    };
    Observable2.prototype.toPromise = function(promiseCtor) {
      var _this = this;
      promiseCtor = getPromiseCtor(promiseCtor);
      return new promiseCtor(function(resolve, reject) {
        var value;
        _this.subscribe(function(x) {
          return value = x;
        }, function(err) {
          return reject(err);
        }, function() {
          return resolve(value);
        });
      });
    };
    Observable2.create = function(subscribe) {
      return new Observable2(subscribe);
    };
    return Observable2;
  }();
  function getPromiseCtor(promiseCtor) {
    var _a;
    return (_a = promiseCtor !== null && promiseCtor !== void 0 ? promiseCtor : config.Promise) !== null && _a !== void 0 ? _a : Promise;
  }
  function isObserver(value) {
    return value && isFunction(value.next) && isFunction(value.error) && isFunction(value.complete);
  }
  function isSubscriber(value) {
    return value && value instanceof Subscriber || isObserver(value) && isSubscription(value);
  }

  // node_modules/rxjs/dist/esm5/internal/util/lift.js
  function hasLift(source) {
    return isFunction(source === null || source === void 0 ? void 0 : source.lift);
  }
  function operate(init) {
    return function(source) {
      if (hasLift(source)) {
        return source.lift(function(liftedSource) {
          try {
            return init(liftedSource, this);
          } catch (err) {
            this.error(err);
          }
        });
      }
      throw new TypeError("Unable to lift unknown Observable type");
    };
  }

  // node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js
  function createOperatorSubscriber(destination, onNext, onComplete, onError, onFinalize) {
    return new OperatorSubscriber(destination, onNext, onComplete, onError, onFinalize);
  }
  var OperatorSubscriber = function(_super) {
    __extends(OperatorSubscriber2, _super);
    function OperatorSubscriber2(destination, onNext, onComplete, onError, onFinalize, shouldUnsubscribe) {
      var _this = _super.call(this, destination) || this;
      _this.onFinalize = onFinalize;
      _this.shouldUnsubscribe = shouldUnsubscribe;
      _this._next = onNext ? function(value) {
        try {
          onNext(value);
        } catch (err) {
          destination.error(err);
        }
      } : _super.prototype._next;
      _this._error = onError ? function(err) {
        try {
          onError(err);
        } catch (err2) {
          destination.error(err2);
        } finally {
          this.unsubscribe();
        }
      } : _super.prototype._error;
      _this._complete = onComplete ? function() {
        try {
          onComplete();
        } catch (err) {
          destination.error(err);
        } finally {
          this.unsubscribe();
        }
      } : _super.prototype._complete;
      return _this;
    }
    OperatorSubscriber2.prototype.unsubscribe = function() {
      var _a;
      if (!this.shouldUnsubscribe || this.shouldUnsubscribe()) {
        var closed_1 = this.closed;
        _super.prototype.unsubscribe.call(this);
        !closed_1 && ((_a = this.onFinalize) === null || _a === void 0 ? void 0 : _a.call(this));
      }
    };
    return OperatorSubscriber2;
  }(Subscriber);

  // node_modules/rxjs/dist/esm5/internal/util/ObjectUnsubscribedError.js
  var ObjectUnsubscribedError = createErrorClass(function(_super) {
    return function ObjectUnsubscribedErrorImpl() {
      _super(this);
      this.name = "ObjectUnsubscribedError";
      this.message = "object unsubscribed";
    };
  });

  // node_modules/rxjs/dist/esm5/internal/Subject.js
  var Subject = function(_super) {
    __extends(Subject2, _super);
    function Subject2() {
      var _this = _super.call(this) || this;
      _this.closed = false;
      _this.currentObservers = null;
      _this.observers = [];
      _this.isStopped = false;
      _this.hasError = false;
      _this.thrownError = null;
      return _this;
    }
    Subject2.prototype.lift = function(operator) {
      var subject = new AnonymousSubject(this, this);
      subject.operator = operator;
      return subject;
    };
    Subject2.prototype._throwIfClosed = function() {
      if (this.closed) {
        throw new ObjectUnsubscribedError();
      }
    };
    Subject2.prototype.next = function(value) {
      var _this = this;
      errorContext(function() {
        var e_1, _a;
        _this._throwIfClosed();
        if (!_this.isStopped) {
          if (!_this.currentObservers) {
            _this.currentObservers = Array.from(_this.observers);
          }
          try {
            for (var _b = __values(_this.currentObservers), _c = _b.next(); !_c.done; _c = _b.next()) {
              var observer = _c.value;
              observer.next(value);
            }
          } catch (e_1_1) {
            e_1 = { error: e_1_1 };
          } finally {
            try {
              if (_c && !_c.done && (_a = _b.return))
                _a.call(_b);
            } finally {
              if (e_1)
                throw e_1.error;
            }
          }
        }
      });
    };
    Subject2.prototype.error = function(err) {
      var _this = this;
      errorContext(function() {
        _this._throwIfClosed();
        if (!_this.isStopped) {
          _this.hasError = _this.isStopped = true;
          _this.thrownError = err;
          var observers = _this.observers;
          while (observers.length) {
            observers.shift().error(err);
          }
        }
      });
    };
    Subject2.prototype.complete = function() {
      var _this = this;
      errorContext(function() {
        _this._throwIfClosed();
        if (!_this.isStopped) {
          _this.isStopped = true;
          var observers = _this.observers;
          while (observers.length) {
            observers.shift().complete();
          }
        }
      });
    };
    Subject2.prototype.unsubscribe = function() {
      this.isStopped = this.closed = true;
      this.observers = this.currentObservers = null;
    };
    Object.defineProperty(Subject2.prototype, "observed", {
      get: function() {
        var _a;
        return ((_a = this.observers) === null || _a === void 0 ? void 0 : _a.length) > 0;
      },
      enumerable: false,
      configurable: true
    });
    Subject2.prototype._trySubscribe = function(subscriber) {
      this._throwIfClosed();
      return _super.prototype._trySubscribe.call(this, subscriber);
    };
    Subject2.prototype._subscribe = function(subscriber) {
      this._throwIfClosed();
      this._checkFinalizedStatuses(subscriber);
      return this._innerSubscribe(subscriber);
    };
    Subject2.prototype._innerSubscribe = function(subscriber) {
      var _this = this;
      var _a = this, hasError = _a.hasError, isStopped = _a.isStopped, observers = _a.observers;
      if (hasError || isStopped) {
        return EMPTY_SUBSCRIPTION;
      }
      this.currentObservers = null;
      observers.push(subscriber);
      return new Subscription(function() {
        _this.currentObservers = null;
        arrRemove(observers, subscriber);
      });
    };
    Subject2.prototype._checkFinalizedStatuses = function(subscriber) {
      var _a = this, hasError = _a.hasError, thrownError = _a.thrownError, isStopped = _a.isStopped;
      if (hasError) {
        subscriber.error(thrownError);
      } else if (isStopped) {
        subscriber.complete();
      }
    };
    Subject2.prototype.asObservable = function() {
      var observable2 = new Observable();
      observable2.source = this;
      return observable2;
    };
    Subject2.create = function(destination, source) {
      return new AnonymousSubject(destination, source);
    };
    return Subject2;
  }(Observable);
  var AnonymousSubject = function(_super) {
    __extends(AnonymousSubject2, _super);
    function AnonymousSubject2(destination, source) {
      var _this = _super.call(this) || this;
      _this.destination = destination;
      _this.source = source;
      return _this;
    }
    AnonymousSubject2.prototype.next = function(value) {
      var _a, _b;
      (_b = (_a = this.destination) === null || _a === void 0 ? void 0 : _a.next) === null || _b === void 0 ? void 0 : _b.call(_a, value);
    };
    AnonymousSubject2.prototype.error = function(err) {
      var _a, _b;
      (_b = (_a = this.destination) === null || _a === void 0 ? void 0 : _a.error) === null || _b === void 0 ? void 0 : _b.call(_a, err);
    };
    AnonymousSubject2.prototype.complete = function() {
      var _a, _b;
      (_b = (_a = this.destination) === null || _a === void 0 ? void 0 : _a.complete) === null || _b === void 0 ? void 0 : _b.call(_a);
    };
    AnonymousSubject2.prototype._subscribe = function(subscriber) {
      var _a, _b;
      return (_b = (_a = this.source) === null || _a === void 0 ? void 0 : _a.subscribe(subscriber)) !== null && _b !== void 0 ? _b : EMPTY_SUBSCRIPTION;
    };
    return AnonymousSubject2;
  }(Subject);

  // node_modules/rxjs/dist/esm5/internal/scheduler/dateTimestampProvider.js
  var dateTimestampProvider = {
    now: function() {
      return (dateTimestampProvider.delegate || Date).now();
    },
    delegate: void 0
  };

  // node_modules/rxjs/dist/esm5/internal/scheduler/Action.js
  var Action = function(_super) {
    __extends(Action2, _super);
    function Action2(scheduler, work) {
      return _super.call(this) || this;
    }
    Action2.prototype.schedule = function(state, delay) {
      if (delay === void 0) {
        delay = 0;
      }
      return this;
    };
    return Action2;
  }(Subscription);

  // node_modules/rxjs/dist/esm5/internal/scheduler/intervalProvider.js
  var intervalProvider = {
    setInterval: function(handler, timeout) {
      var args = [];
      for (var _i = 2; _i < arguments.length; _i++) {
        args[_i - 2] = arguments[_i];
      }
      var delegate = intervalProvider.delegate;
      if (delegate === null || delegate === void 0 ? void 0 : delegate.setInterval) {
        return delegate.setInterval.apply(delegate, __spreadArray([handler, timeout], __read(args)));
      }
      return setInterval.apply(void 0, __spreadArray([handler, timeout], __read(args)));
    },
    clearInterval: function(handle) {
      var delegate = intervalProvider.delegate;
      return ((delegate === null || delegate === void 0 ? void 0 : delegate.clearInterval) || clearInterval)(handle);
    },
    delegate: void 0
  };

  // node_modules/rxjs/dist/esm5/internal/scheduler/AsyncAction.js
  var AsyncAction = function(_super) {
    __extends(AsyncAction2, _super);
    function AsyncAction2(scheduler, work) {
      var _this = _super.call(this, scheduler, work) || this;
      _this.scheduler = scheduler;
      _this.work = work;
      _this.pending = false;
      return _this;
    }
    AsyncAction2.prototype.schedule = function(state, delay) {
      var _a;
      if (delay === void 0) {
        delay = 0;
      }
      if (this.closed) {
        return this;
      }
      this.state = state;
      var id = this.id;
      var scheduler = this.scheduler;
      if (id != null) {
        this.id = this.recycleAsyncId(scheduler, id, delay);
      }
      this.pending = true;
      this.delay = delay;
      this.id = (_a = this.id) !== null && _a !== void 0 ? _a : this.requestAsyncId(scheduler, this.id, delay);
      return this;
    };
    AsyncAction2.prototype.requestAsyncId = function(scheduler, _id, delay) {
      if (delay === void 0) {
        delay = 0;
      }
      return intervalProvider.setInterval(scheduler.flush.bind(scheduler, this), delay);
    };
    AsyncAction2.prototype.recycleAsyncId = function(_scheduler, id, delay) {
      if (delay === void 0) {
        delay = 0;
      }
      if (delay != null && this.delay === delay && this.pending === false) {
        return id;
      }
      if (id != null) {
        intervalProvider.clearInterval(id);
      }
      return void 0;
    };
    AsyncAction2.prototype.execute = function(state, delay) {
      if (this.closed) {
        return new Error("executing a cancelled action");
      }
      this.pending = false;
      var error = this._execute(state, delay);
      if (error) {
        return error;
      } else if (this.pending === false && this.id != null) {
        this.id = this.recycleAsyncId(this.scheduler, this.id, null);
      }
    };
    AsyncAction2.prototype._execute = function(state, _delay) {
      var errored = false;
      var errorValue;
      try {
        this.work(state);
      } catch (e) {
        errored = true;
        errorValue = e ? e : new Error("Scheduled action threw falsy error");
      }
      if (errored) {
        this.unsubscribe();
        return errorValue;
      }
    };
    AsyncAction2.prototype.unsubscribe = function() {
      if (!this.closed) {
        var _a = this, id = _a.id, scheduler = _a.scheduler;
        var actions = scheduler.actions;
        this.work = this.state = this.scheduler = null;
        this.pending = false;
        arrRemove(actions, this);
        if (id != null) {
          this.id = this.recycleAsyncId(scheduler, id, null);
        }
        this.delay = null;
        _super.prototype.unsubscribe.call(this);
      }
    };
    return AsyncAction2;
  }(Action);

  // node_modules/rxjs/dist/esm5/internal/Scheduler.js
  var Scheduler = function() {
    function Scheduler2(schedulerActionCtor, now) {
      if (now === void 0) {
        now = Scheduler2.now;
      }
      this.schedulerActionCtor = schedulerActionCtor;
      this.now = now;
    }
    Scheduler2.prototype.schedule = function(work, delay, state) {
      if (delay === void 0) {
        delay = 0;
      }
      return new this.schedulerActionCtor(this, work).schedule(state, delay);
    };
    Scheduler2.now = dateTimestampProvider.now;
    return Scheduler2;
  }();

  // node_modules/rxjs/dist/esm5/internal/scheduler/AsyncScheduler.js
  var AsyncScheduler = function(_super) {
    __extends(AsyncScheduler2, _super);
    function AsyncScheduler2(SchedulerAction, now) {
      if (now === void 0) {
        now = Scheduler.now;
      }
      var _this = _super.call(this, SchedulerAction, now) || this;
      _this.actions = [];
      _this._active = false;
      return _this;
    }
    AsyncScheduler2.prototype.flush = function(action) {
      var actions = this.actions;
      if (this._active) {
        actions.push(action);
        return;
      }
      var error;
      this._active = true;
      do {
        if (error = action.execute(action.state, action.delay)) {
          break;
        }
      } while (action = actions.shift());
      this._active = false;
      if (error) {
        while (action = actions.shift()) {
          action.unsubscribe();
        }
        throw error;
      }
    };
    return AsyncScheduler2;
  }(Scheduler);

  // node_modules/rxjs/dist/esm5/internal/scheduler/async.js
  var asyncScheduler = new AsyncScheduler(AsyncAction);
  var async = asyncScheduler;

  // node_modules/rxjs/dist/esm5/internal/observable/empty.js
  var EMPTY = new Observable(function(subscriber) {
    return subscriber.complete();
  });

  // node_modules/rxjs/dist/esm5/internal/util/isScheduler.js
  function isScheduler(value) {
    return value && isFunction(value.schedule);
  }

  // node_modules/rxjs/dist/esm5/internal/util/args.js
  function last(arr) {
    return arr[arr.length - 1];
  }
  function popScheduler(args) {
    return isScheduler(last(args)) ? args.pop() : void 0;
  }

  // node_modules/rxjs/dist/esm5/internal/util/isArrayLike.js
  var isArrayLike = function(x) {
    return x && typeof x.length === "number" && typeof x !== "function";
  };

  // node_modules/rxjs/dist/esm5/internal/util/isPromise.js
  function isPromise(value) {
    return isFunction(value === null || value === void 0 ? void 0 : value.then);
  }

  // node_modules/rxjs/dist/esm5/internal/util/isInteropObservable.js
  function isInteropObservable(input) {
    return isFunction(input[observable]);
  }

  // node_modules/rxjs/dist/esm5/internal/util/isAsyncIterable.js
  function isAsyncIterable(obj) {
    return Symbol.asyncIterator && isFunction(obj === null || obj === void 0 ? void 0 : obj[Symbol.asyncIterator]);
  }

  // node_modules/rxjs/dist/esm5/internal/util/throwUnobservableError.js
  function createInvalidObservableTypeError(input) {
    return new TypeError("You provided " + (input !== null && typeof input === "object" ? "an invalid object" : "'" + input + "'") + " where a stream was expected. You can provide an Observable, Promise, ReadableStream, Array, AsyncIterable, or Iterable.");
  }

  // node_modules/rxjs/dist/esm5/internal/symbol/iterator.js
  function getSymbolIterator() {
    if (typeof Symbol !== "function" || !Symbol.iterator) {
      return "@@iterator";
    }
    return Symbol.iterator;
  }
  var iterator = getSymbolIterator();

  // node_modules/rxjs/dist/esm5/internal/util/isIterable.js
  function isIterable(input) {
    return isFunction(input === null || input === void 0 ? void 0 : input[iterator]);
  }

  // node_modules/rxjs/dist/esm5/internal/util/isReadableStreamLike.js
  function readableStreamLikeToAsyncGenerator(readableStream) {
    return __asyncGenerator(this, arguments, function readableStreamLikeToAsyncGenerator_1() {
      var reader, _a, value, done;
      return __generator(this, function(_b) {
        switch (_b.label) {
          case 0:
            reader = readableStream.getReader();
            _b.label = 1;
          case 1:
            _b.trys.push([1, , 9, 10]);
            _b.label = 2;
          case 2:
            if (false)
              return [3, 8];
            return [4, __await(reader.read())];
          case 3:
            _a = _b.sent(), value = _a.value, done = _a.done;
            if (!done)
              return [3, 5];
            return [4, __await(void 0)];
          case 4:
            return [2, _b.sent()];
          case 5:
            return [4, __await(value)];
          case 6:
            return [4, _b.sent()];
          case 7:
            _b.sent();
            return [3, 2];
          case 8:
            return [3, 10];
          case 9:
            reader.releaseLock();
            return [7];
          case 10:
            return [2];
        }
      });
    });
  }
  function isReadableStreamLike(obj) {
    return isFunction(obj === null || obj === void 0 ? void 0 : obj.getReader);
  }

  // node_modules/rxjs/dist/esm5/internal/observable/innerFrom.js
  function innerFrom(input) {
    if (input instanceof Observable) {
      return input;
    }
    if (input != null) {
      if (isInteropObservable(input)) {
        return fromInteropObservable(input);
      }
      if (isArrayLike(input)) {
        return fromArrayLike(input);
      }
      if (isPromise(input)) {
        return fromPromise(input);
      }
      if (isAsyncIterable(input)) {
        return fromAsyncIterable(input);
      }
      if (isIterable(input)) {
        return fromIterable(input);
      }
      if (isReadableStreamLike(input)) {
        return fromReadableStreamLike(input);
      }
    }
    throw createInvalidObservableTypeError(input);
  }
  function fromInteropObservable(obj) {
    return new Observable(function(subscriber) {
      var obs = obj[observable]();
      if (isFunction(obs.subscribe)) {
        return obs.subscribe(subscriber);
      }
      throw new TypeError("Provided object does not correctly implement Symbol.observable");
    });
  }
  function fromArrayLike(array) {
    return new Observable(function(subscriber) {
      for (var i = 0; i < array.length && !subscriber.closed; i++) {
        subscriber.next(array[i]);
      }
      subscriber.complete();
    });
  }
  function fromPromise(promise) {
    return new Observable(function(subscriber) {
      promise.then(function(value) {
        if (!subscriber.closed) {
          subscriber.next(value);
          subscriber.complete();
        }
      }, function(err) {
        return subscriber.error(err);
      }).then(null, reportUnhandledError);
    });
  }
  function fromIterable(iterable) {
    return new Observable(function(subscriber) {
      var e_1, _a;
      try {
        for (var iterable_1 = __values(iterable), iterable_1_1 = iterable_1.next(); !iterable_1_1.done; iterable_1_1 = iterable_1.next()) {
          var value = iterable_1_1.value;
          subscriber.next(value);
          if (subscriber.closed) {
            return;
          }
        }
      } catch (e_1_1) {
        e_1 = { error: e_1_1 };
      } finally {
        try {
          if (iterable_1_1 && !iterable_1_1.done && (_a = iterable_1.return))
            _a.call(iterable_1);
        } finally {
          if (e_1)
            throw e_1.error;
        }
      }
      subscriber.complete();
    });
  }
  function fromAsyncIterable(asyncIterable) {
    return new Observable(function(subscriber) {
      process(asyncIterable, subscriber).catch(function(err) {
        return subscriber.error(err);
      });
    });
  }
  function fromReadableStreamLike(readableStream) {
    return fromAsyncIterable(readableStreamLikeToAsyncGenerator(readableStream));
  }
  function process(asyncIterable, subscriber) {
    var asyncIterable_1, asyncIterable_1_1;
    var e_2, _a;
    return __awaiter(this, void 0, void 0, function() {
      var value, e_2_1;
      return __generator(this, function(_b) {
        switch (_b.label) {
          case 0:
            _b.trys.push([0, 5, 6, 11]);
            asyncIterable_1 = __asyncValues(asyncIterable);
            _b.label = 1;
          case 1:
            return [4, asyncIterable_1.next()];
          case 2:
            if (!(asyncIterable_1_1 = _b.sent(), !asyncIterable_1_1.done))
              return [3, 4];
            value = asyncIterable_1_1.value;
            subscriber.next(value);
            if (subscriber.closed) {
              return [2];
            }
            _b.label = 3;
          case 3:
            return [3, 1];
          case 4:
            return [3, 11];
          case 5:
            e_2_1 = _b.sent();
            e_2 = { error: e_2_1 };
            return [3, 11];
          case 6:
            _b.trys.push([6, , 9, 10]);
            if (!(asyncIterable_1_1 && !asyncIterable_1_1.done && (_a = asyncIterable_1.return)))
              return [3, 8];
            return [4, _a.call(asyncIterable_1)];
          case 7:
            _b.sent();
            _b.label = 8;
          case 8:
            return [3, 10];
          case 9:
            if (e_2)
              throw e_2.error;
            return [7];
          case 10:
            return [7];
          case 11:
            subscriber.complete();
            return [2];
        }
      });
    });
  }

  // node_modules/rxjs/dist/esm5/internal/util/executeSchedule.js
  function executeSchedule(parentSubscription, scheduler, work, delay, repeat) {
    if (delay === void 0) {
      delay = 0;
    }
    if (repeat === void 0) {
      repeat = false;
    }
    var scheduleSubscription = scheduler.schedule(function() {
      work();
      if (repeat) {
        parentSubscription.add(this.schedule(null, delay));
      } else {
        this.unsubscribe();
      }
    }, delay);
    parentSubscription.add(scheduleSubscription);
    if (!repeat) {
      return scheduleSubscription;
    }
  }

  // node_modules/rxjs/dist/esm5/internal/operators/observeOn.js
  function observeOn(scheduler, delay) {
    if (delay === void 0) {
      delay = 0;
    }
    return operate(function(source, subscriber) {
      source.subscribe(createOperatorSubscriber(subscriber, function(value) {
        return executeSchedule(subscriber, scheduler, function() {
          return subscriber.next(value);
        }, delay);
      }, function() {
        return executeSchedule(subscriber, scheduler, function() {
          return subscriber.complete();
        }, delay);
      }, function(err) {
        return executeSchedule(subscriber, scheduler, function() {
          return subscriber.error(err);
        }, delay);
      }));
    });
  }

  // node_modules/rxjs/dist/esm5/internal/operators/subscribeOn.js
  function subscribeOn(scheduler, delay) {
    if (delay === void 0) {
      delay = 0;
    }
    return operate(function(source, subscriber) {
      subscriber.add(scheduler.schedule(function() {
        return source.subscribe(subscriber);
      }, delay));
    });
  }

  // node_modules/rxjs/dist/esm5/internal/scheduled/scheduleObservable.js
  function scheduleObservable(input, scheduler) {
    return innerFrom(input).pipe(subscribeOn(scheduler), observeOn(scheduler));
  }

  // node_modules/rxjs/dist/esm5/internal/scheduled/schedulePromise.js
  function schedulePromise(input, scheduler) {
    return innerFrom(input).pipe(subscribeOn(scheduler), observeOn(scheduler));
  }

  // node_modules/rxjs/dist/esm5/internal/scheduled/scheduleArray.js
  function scheduleArray(input, scheduler) {
    return new Observable(function(subscriber) {
      var i = 0;
      return scheduler.schedule(function() {
        if (i === input.length) {
          subscriber.complete();
        } else {
          subscriber.next(input[i++]);
          if (!subscriber.closed) {
            this.schedule();
          }
        }
      });
    });
  }

  // node_modules/rxjs/dist/esm5/internal/scheduled/scheduleIterable.js
  function scheduleIterable(input, scheduler) {
    return new Observable(function(subscriber) {
      var iterator2;
      executeSchedule(subscriber, scheduler, function() {
        iterator2 = input[iterator]();
        executeSchedule(subscriber, scheduler, function() {
          var _a;
          var value;
          var done;
          try {
            _a = iterator2.next(), value = _a.value, done = _a.done;
          } catch (err) {
            subscriber.error(err);
            return;
          }
          if (done) {
            subscriber.complete();
          } else {
            subscriber.next(value);
          }
        }, 0, true);
      });
      return function() {
        return isFunction(iterator2 === null || iterator2 === void 0 ? void 0 : iterator2.return) && iterator2.return();
      };
    });
  }

  // node_modules/rxjs/dist/esm5/internal/scheduled/scheduleAsyncIterable.js
  function scheduleAsyncIterable(input, scheduler) {
    if (!input) {
      throw new Error("Iterable cannot be null");
    }
    return new Observable(function(subscriber) {
      executeSchedule(subscriber, scheduler, function() {
        var iterator2 = input[Symbol.asyncIterator]();
        executeSchedule(subscriber, scheduler, function() {
          iterator2.next().then(function(result) {
            if (result.done) {
              subscriber.complete();
            } else {
              subscriber.next(result.value);
            }
          });
        }, 0, true);
      });
    });
  }

  // node_modules/rxjs/dist/esm5/internal/scheduled/scheduleReadableStreamLike.js
  function scheduleReadableStreamLike(input, scheduler) {
    return scheduleAsyncIterable(readableStreamLikeToAsyncGenerator(input), scheduler);
  }

  // node_modules/rxjs/dist/esm5/internal/scheduled/scheduled.js
  function scheduled(input, scheduler) {
    if (input != null) {
      if (isInteropObservable(input)) {
        return scheduleObservable(input, scheduler);
      }
      if (isArrayLike(input)) {
        return scheduleArray(input, scheduler);
      }
      if (isPromise(input)) {
        return schedulePromise(input, scheduler);
      }
      if (isAsyncIterable(input)) {
        return scheduleAsyncIterable(input, scheduler);
      }
      if (isIterable(input)) {
        return scheduleIterable(input, scheduler);
      }
      if (isReadableStreamLike(input)) {
        return scheduleReadableStreamLike(input, scheduler);
      }
    }
    throw createInvalidObservableTypeError(input);
  }

  // node_modules/rxjs/dist/esm5/internal/observable/from.js
  function from(input, scheduler) {
    return scheduler ? scheduled(input, scheduler) : innerFrom(input);
  }

  // node_modules/rxjs/dist/esm5/internal/observable/of.js
  function of() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      args[_i] = arguments[_i];
    }
    var scheduler = popScheduler(args);
    return from(args, scheduler);
  }

  // node_modules/rxjs/dist/esm5/internal/util/isDate.js
  function isValidDate(value) {
    return value instanceof Date && !isNaN(value);
  }

  // node_modules/rxjs/dist/esm5/internal/operators/map.js
  function map(project, thisArg) {
    return operate(function(source, subscriber) {
      var index = 0;
      source.subscribe(createOperatorSubscriber(subscriber, function(value) {
        subscriber.next(project.call(thisArg, value, index++));
      }));
    });
  }

  // node_modules/rxjs/dist/esm5/internal/util/mapOneOrManyArgs.js
  var isArray = Array.isArray;
  function callOrApply(fn, args) {
    return isArray(args) ? fn.apply(void 0, __spreadArray([], __read(args))) : fn(args);
  }
  function mapOneOrManyArgs(fn) {
    return map(function(args) {
      return callOrApply(fn, args);
    });
  }

  // node_modules/rxjs/dist/esm5/internal/operators/mergeInternals.js
  function mergeInternals(source, subscriber, project, concurrent, onBeforeNext, expand, innerSubScheduler, additionalFinalizer) {
    var buffer = [];
    var active = 0;
    var index = 0;
    var isComplete = false;
    var checkComplete = function() {
      if (isComplete && !buffer.length && !active) {
        subscriber.complete();
      }
    };
    var outerNext = function(value) {
      return active < concurrent ? doInnerSub(value) : buffer.push(value);
    };
    var doInnerSub = function(value) {
      expand && subscriber.next(value);
      active++;
      var innerComplete = false;
      innerFrom(project(value, index++)).subscribe(createOperatorSubscriber(subscriber, function(innerValue) {
        onBeforeNext === null || onBeforeNext === void 0 ? void 0 : onBeforeNext(innerValue);
        if (expand) {
          outerNext(innerValue);
        } else {
          subscriber.next(innerValue);
        }
      }, function() {
        innerComplete = true;
      }, void 0, function() {
        if (innerComplete) {
          try {
            active--;
            var _loop_1 = function() {
              var bufferedValue = buffer.shift();
              if (innerSubScheduler) {
                executeSchedule(subscriber, innerSubScheduler, function() {
                  return doInnerSub(bufferedValue);
                });
              } else {
                doInnerSub(bufferedValue);
              }
            };
            while (buffer.length && active < concurrent) {
              _loop_1();
            }
            checkComplete();
          } catch (err) {
            subscriber.error(err);
          }
        }
      }));
    };
    source.subscribe(createOperatorSubscriber(subscriber, outerNext, function() {
      isComplete = true;
      checkComplete();
    }));
    return function() {
      additionalFinalizer === null || additionalFinalizer === void 0 ? void 0 : additionalFinalizer();
    };
  }

  // node_modules/rxjs/dist/esm5/internal/operators/mergeMap.js
  function mergeMap(project, resultSelector, concurrent) {
    if (concurrent === void 0) {
      concurrent = Infinity;
    }
    if (isFunction(resultSelector)) {
      return mergeMap(function(a, i) {
        return map(function(b, ii) {
          return resultSelector(a, b, i, ii);
        })(innerFrom(project(a, i)));
      }, concurrent);
    } else if (typeof resultSelector === "number") {
      concurrent = resultSelector;
    }
    return operate(function(source, subscriber) {
      return mergeInternals(source, subscriber, project, concurrent);
    });
  }

  // node_modules/rxjs/dist/esm5/internal/observable/defer.js
  function defer(observableFactory) {
    return new Observable(function(subscriber) {
      innerFrom(observableFactory()).subscribe(subscriber);
    });
  }

  // node_modules/rxjs/dist/esm5/internal/observable/fromEvent.js
  var nodeEventEmitterMethods = ["addListener", "removeListener"];
  var eventTargetMethods = ["addEventListener", "removeEventListener"];
  var jqueryMethods = ["on", "off"];
  function fromEvent(target, eventName, options, resultSelector) {
    if (isFunction(options)) {
      resultSelector = options;
      options = void 0;
    }
    if (resultSelector) {
      return fromEvent(target, eventName, options).pipe(mapOneOrManyArgs(resultSelector));
    }
    var _a = __read(isEventTarget(target) ? eventTargetMethods.map(function(methodName) {
      return function(handler) {
        return target[methodName](eventName, handler, options);
      };
    }) : isNodeStyleEventEmitter(target) ? nodeEventEmitterMethods.map(toCommonHandlerRegistry(target, eventName)) : isJQueryStyleEventEmitter(target) ? jqueryMethods.map(toCommonHandlerRegistry(target, eventName)) : [], 2), add = _a[0], remove = _a[1];
    if (!add) {
      if (isArrayLike(target)) {
        return mergeMap(function(subTarget) {
          return fromEvent(subTarget, eventName, options);
        })(innerFrom(target));
      }
    }
    if (!add) {
      throw new TypeError("Invalid event target");
    }
    return new Observable(function(subscriber) {
      var handler = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        return subscriber.next(1 < args.length ? args : args[0]);
      };
      add(handler);
      return function() {
        return remove(handler);
      };
    });
  }
  function toCommonHandlerRegistry(target, eventName) {
    return function(methodName) {
      return function(handler) {
        return target[methodName](eventName, handler);
      };
    };
  }
  function isNodeStyleEventEmitter(target) {
    return isFunction(target.addListener) && isFunction(target.removeListener);
  }
  function isJQueryStyleEventEmitter(target) {
    return isFunction(target.on) && isFunction(target.off);
  }
  function isEventTarget(target) {
    return isFunction(target.addEventListener) && isFunction(target.removeEventListener);
  }

  // node_modules/rxjs/dist/esm5/internal/observable/timer.js
  function timer(dueTime, intervalOrScheduler, scheduler) {
    if (dueTime === void 0) {
      dueTime = 0;
    }
    if (scheduler === void 0) {
      scheduler = async;
    }
    var intervalDuration = -1;
    if (intervalOrScheduler != null) {
      if (isScheduler(intervalOrScheduler)) {
        scheduler = intervalOrScheduler;
      } else {
        intervalDuration = intervalOrScheduler;
      }
    }
    return new Observable(function(subscriber) {
      var due = isValidDate(dueTime) ? +dueTime - scheduler.now() : dueTime;
      if (due < 0) {
        due = 0;
      }
      var n = 0;
      return scheduler.schedule(function() {
        if (!subscriber.closed) {
          subscriber.next(n++);
          if (0 <= intervalDuration) {
            this.schedule(void 0, intervalDuration);
          } else {
            subscriber.complete();
          }
        }
      }, due);
    });
  }

  // node_modules/rxjs/dist/esm5/internal/observable/interval.js
  function interval(period, scheduler) {
    if (period === void 0) {
      period = 0;
    }
    if (scheduler === void 0) {
      scheduler = asyncScheduler;
    }
    if (period < 0) {
      period = 0;
    }
    return timer(period, period, scheduler);
  }

  // node_modules/rxjs/dist/esm5/internal/operators/filter.js
  function filter(predicate, thisArg) {
    return operate(function(source, subscriber) {
      var index = 0;
      source.subscribe(createOperatorSubscriber(subscriber, function(value) {
        return predicate.call(thisArg, value, index++) && subscriber.next(value);
      }));
    });
  }

  // node_modules/rxjs/dist/esm5/internal/operators/catchError.js
  function catchError(selector) {
    return operate(function(source, subscriber) {
      var innerSub = null;
      var syncUnsub = false;
      var handledResult;
      innerSub = source.subscribe(createOperatorSubscriber(subscriber, void 0, void 0, function(err) {
        handledResult = innerFrom(selector(err, catchError(selector)(source)));
        if (innerSub) {
          innerSub.unsubscribe();
          innerSub = null;
          handledResult.subscribe(subscriber);
        } else {
          syncUnsub = true;
        }
      }));
      if (syncUnsub) {
        innerSub.unsubscribe();
        innerSub = null;
        handledResult.subscribe(subscriber);
      }
    });
  }

  // node_modules/rxjs/dist/esm5/internal/operators/take.js
  function take(count) {
    return count <= 0 ? function() {
      return EMPTY;
    } : operate(function(source, subscriber) {
      var seen = 0;
      source.subscribe(createOperatorSubscriber(subscriber, function(value) {
        if (++seen <= count) {
          subscriber.next(value);
          if (count <= seen) {
            subscriber.complete();
          }
        }
      }));
    });
  }

  // node_modules/rxjs/dist/esm5/internal/operators/retry.js
  function retry(configOrCount) {
    if (configOrCount === void 0) {
      configOrCount = Infinity;
    }
    var config2;
    if (configOrCount && typeof configOrCount === "object") {
      config2 = configOrCount;
    } else {
      config2 = {
        count: configOrCount
      };
    }
    var _a = config2.count, count = _a === void 0 ? Infinity : _a, delay = config2.delay, _b = config2.resetOnSuccess, resetOnSuccess = _b === void 0 ? false : _b;
    return count <= 0 ? identity : operate(function(source, subscriber) {
      var soFar = 0;
      var innerSub;
      var subscribeForRetry = function() {
        var syncUnsub = false;
        innerSub = source.subscribe(createOperatorSubscriber(subscriber, function(value) {
          if (resetOnSuccess) {
            soFar = 0;
          }
          subscriber.next(value);
        }, void 0, function(err) {
          if (soFar++ < count) {
            var resub_1 = function() {
              if (innerSub) {
                innerSub.unsubscribe();
                innerSub = null;
                subscribeForRetry();
              } else {
                syncUnsub = true;
              }
            };
            if (delay != null) {
              var notifier = typeof delay === "number" ? timer(delay) : innerFrom(delay(err, soFar));
              var notifierSubscriber_1 = createOperatorSubscriber(subscriber, function() {
                notifierSubscriber_1.unsubscribe();
                resub_1();
              }, function() {
                subscriber.complete();
              });
              notifier.subscribe(notifierSubscriber_1);
            } else {
              resub_1();
            }
          } else {
            subscriber.error(err);
          }
        }));
        if (syncUnsub) {
          innerSub.unsubscribe();
          innerSub = null;
          subscribeForRetry();
        }
      };
      subscribeForRetry();
    });
  }

  // node_modules/rxjs/dist/esm5/internal/operators/switchMap.js
  function switchMap(project, resultSelector) {
    return operate(function(source, subscriber) {
      var innerSubscriber = null;
      var index = 0;
      var isComplete = false;
      var checkComplete = function() {
        return isComplete && !innerSubscriber && subscriber.complete();
      };
      source.subscribe(createOperatorSubscriber(subscriber, function(value) {
        innerSubscriber === null || innerSubscriber === void 0 ? void 0 : innerSubscriber.unsubscribe();
        var innerIndex = 0;
        var outerIndex = index++;
        innerFrom(project(value, outerIndex)).subscribe(innerSubscriber = createOperatorSubscriber(subscriber, function(innerValue) {
          return subscriber.next(resultSelector ? resultSelector(value, innerValue, outerIndex, innerIndex++) : innerValue);
        }, function() {
          innerSubscriber = null;
          checkComplete();
        }));
      }, function() {
        isComplete = true;
        checkComplete();
      }));
    });
  }

  // node_modules/rxjs/dist/esm5/internal/operators/tap.js
  function tap(observerOrNext, error, complete) {
    var tapObserver = isFunction(observerOrNext) || error || complete ? { next: observerOrNext, error, complete } : observerOrNext;
    return tapObserver ? operate(function(source, subscriber) {
      var _a;
      (_a = tapObserver.subscribe) === null || _a === void 0 ? void 0 : _a.call(tapObserver);
      var isUnsub = true;
      source.subscribe(createOperatorSubscriber(subscriber, function(value) {
        var _a2;
        (_a2 = tapObserver.next) === null || _a2 === void 0 ? void 0 : _a2.call(tapObserver, value);
        subscriber.next(value);
      }, function() {
        var _a2;
        isUnsub = false;
        (_a2 = tapObserver.complete) === null || _a2 === void 0 ? void 0 : _a2.call(tapObserver);
        subscriber.complete();
      }, function(err) {
        var _a2;
        isUnsub = false;
        (_a2 = tapObserver.error) === null || _a2 === void 0 ? void 0 : _a2.call(tapObserver, err);
        subscriber.error(err);
      }, function() {
        var _a2, _b;
        if (isUnsub) {
          (_a2 = tapObserver.unsubscribe) === null || _a2 === void 0 ? void 0 : _a2.call(tapObserver);
        }
        (_b = tapObserver.finalize) === null || _b === void 0 ? void 0 : _b.call(tapObserver);
      }));
    }) : identity;
  }

  // ChatGPTVoiceInput.user.src.js
  (async function() {
    "use strict";
    const logLevel = 0;
    const defaultLang = "cmn-Hant-TW";
    let currentVoice = void 0;
    window.speechSynthesis.onvoiceschanged = function() {
      currentVoice = speechSynthesis.getVoices().filter((x) => x.lang === "zh-TW").pop();
    };
    const isMac = () => navigator.userAgentData.platform.toUpperCase().includes("MAC");
    let textAreaElement = void 0;
    let Parts = [];
    let submitButtonElement = void 0;
    const svgMicOn = '<svg stroke="currentColor" fill="currentColor" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="16px" height="16px" viewBox="0 0 16 16" version="1.1"><path d="M 8 8.949219 C 7.523438 8.949219 7.121094 8.777344 6.800781 8.433594 C 6.476562 8.089844 6.316406 7.671875 6.316406 7.183594 L 6.316406 3 C 6.316406 2.535156 6.480469 2.140625 6.808594 1.816406 C 7.136719 1.496094 7.535156 1.332031 8 1.332031 C 8.464844 1.332031 8.863281 1.496094 9.191406 1.816406 C 9.519531 2.140625 9.683594 2.535156 9.683594 3 L 9.683594 7.183594 C 9.683594 7.671875 9.523438 8.089844 9.199219 8.433594 C 8.878906 8.777344 8.476562 8.949219 8 8.949219 Z M 8 5.148438 Z M 7.5 14 L 7.5 11.734375 C 6.320312 11.609375 5.332031 11.117188 4.535156 10.25 C 3.734375 9.382812 3.332031 8.359375 3.332031 7.183594 L 4.332031 7.183594 C 4.332031 8.195312 4.691406 9.042969 5.410156 9.734375 C 6.125 10.421875 6.988281 10.765625 8 10.765625 C 9.011719 10.765625 9.875 10.421875 10.589844 9.734375 C 11.308594 9.042969 11.667969 8.195312 11.667969 7.183594 L 12.667969 7.183594 C 12.667969 8.359375 12.265625 9.382812 11.464844 10.25 C 10.667969 11.117188 9.679688 11.609375 8.5 11.734375 L 8.5 14 Z M 8 7.949219 C 8.199219 7.949219 8.363281 7.875 8.492188 7.726562 C 8.621094 7.574219 8.683594 7.394531 8.683594 7.183594 L 8.683594 3 C 8.683594 2.8125 8.617188 2.652344 8.484375 2.523438 C 8.351562 2.398438 8.1875 2.332031 8 2.332031 C 7.8125 2.332031 7.648438 2.398438 7.515625 2.523438 C 7.382812 2.652344 7.316406 2.8125 7.316406 3 L 7.316406 7.183594 C 7.316406 7.394531 7.378906 7.574219 7.507812 7.726562 C 7.636719 7.875 7.800781 7.949219 8 7.949219 Z M 8 7.949219 "></path></svg>';
    const svgMicOff = '<svg stroke="currentColor" fill="currentColor" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="16px" height="16px" viewBox="0 0 16 16" version="1.1"><path d="M 11.433594 9.984375 L 10.714844 9.265625 C 10.949219 8.976562 11.121094 8.652344 11.234375 8.292969 C 11.34375 7.929688 11.398438 7.5625 11.398438 7.183594 L 12.398438 7.183594 C 12.398438 7.695312 12.316406 8.1875 12.148438 8.667969 C 11.984375 9.144531 11.746094 9.582031 11.433594 9.984375 Z M 7.683594 6.234375 Z M 9.300781 7.851562 L 8.417969 6.984375 L 8.417969 3.015625 C 8.417969 2.828125 8.351562 2.667969 8.214844 2.535156 C 8.082031 2.398438 7.921875 2.332031 7.734375 2.332031 C 7.542969 2.332031 7.382812 2.398438 7.25 2.535156 C 7.117188 2.667969 7.050781 2.828125 7.050781 3.015625 L 7.050781 5.601562 L 6.050781 4.601562 L 6.050781 3.015625 C 6.050781 2.550781 6.214844 2.152344 6.542969 1.824219 C 6.871094 1.496094 7.265625 1.332031 7.734375 1.332031 C 8.199219 1.332031 8.597656 1.496094 8.925781 1.824219 C 9.253906 2.152344 9.417969 2.550781 9.417969 3.015625 L 9.417969 7.183594 C 9.417969 7.273438 9.410156 7.382812 9.390625 7.515625 C 9.375 7.648438 9.34375 7.761719 9.300781 7.851562 Z M 7.234375 14 L 7.234375 11.734375 C 6.054688 11.609375 5.066406 11.117188 4.265625 10.25 C 3.464844 9.382812 3.066406 8.359375 3.066406 7.183594 L 4.066406 7.183594 C 4.066406 8.195312 4.425781 9.042969 5.140625 9.734375 C 5.859375 10.421875 6.722656 10.765625 7.734375 10.765625 C 8.15625 10.765625 8.5625 10.695312 8.949219 10.558594 C 9.339844 10.417969 9.695312 10.226562 10.015625 9.984375 L 10.734375 10.699219 C 10.390625 10.988281 10.003906 11.21875 9.582031 11.390625 C 9.160156 11.5625 8.710938 11.679688 8.234375 11.734375 L 8.234375 14 Z M 13.851562 15.082031 L 0.601562 1.832031 L 1.234375 1.199219 L 14.484375 14.449219 Z M 13.851562 15.082031 "></path></svg>';
    const microphoneButtonElement = document.createElement("button");
    microphoneButtonElement.id = "btn-microphone";
    microphoneButtonElement.type = "button";
    microphoneButtonElement.classList = "absolute p-1 rounded-md text-gray-500 bottom-1.5 right-1 md:bottom-3.5 md:right-2 hover:bg-gray-100 dark:hover:text-gray-400 dark:hover:bg-gray-900 disabled:hover:bg-transparent dark:disabled:hover:bg-transparent";
    microphoneButtonElement.style.right = "3rem";
    microphoneButtonElement.title = `\u958B\u555F\u8A9E\u97F3\u8FA8\u8B58\u529F\u80FD (${isMac() ? "command+option+s" : "alt+s"})`;
    microphoneButtonElement.innerHTML = svgMicOff;
    microphoneButtonElement.addEventListener("click", () => {
      if (isSpeechRecognitionEnabled()) {
        speechRecognitionStop$.next();
      } else {
        speechRecognitionStart$.next();
      }
    });
    microphoneButtonElement.changeLanguage = function(language) {
      if (language) {
        console.log("\u5207\u63DB\u8A9E\u8A00\u5230", language);
        speechRecognitionStop$.next();
        speechRecognition.lang = language;
        setTimeout(() => {
          speechRecognitionStart$.next();
        }, 1e3);
      }
    };
    microphoneButtonElement.addEventListener("contextmenu", function(event) {
      event.preventDefault();
      var contextMenu = document.createElement("div");
      contextMenu.close = function() {
        this.remove();
      };
      contextMenu.setDefault = function(select) {
        console.log("set default to " + speechRecognition.lang);
        select.value = speechRecognition.lang;
      };
      contextMenu.id = "microphoneButtonElementContextMenu";
      contextMenu.style.position = "absolute";
      contextMenu.style.backgroundColor = "white";
      contextMenu.style.border = "1px solid black";
      contextMenu.style.padding = "10px";
      const styleElement = document.createElement("style");
      styleElement.textContent = `
        /* Light Theme */
        select {
            color: black;
            background-color: white;
            border: 1px solid black;
        }
        /* Dark Theme */
        @media (prefers-color-scheme: dark) {
            select {
                color: white;
                background-color: black;
                border: 1px solid white;
            }
        }`;
      contextMenu.appendChild(styleElement);
      const selectElement = document.createElement("select");
      selectElement.addEventListener("change", function(event2) {
        microphoneButtonElement.changeLanguage(this.value);
        contextMenu.close();
      });
      const option1 = document.createElement("option");
      option1.value = "";
      option1.text = "\u8ACB\u9078\u64C7\u8A9E\u97F3\u8FA8\u8B58\u7684\u6163\u7528\u8A9E\u8A00";
      selectElement.add(option1);
      var options = [
        { value: "cmn-Hant-TW", text: "\u4E2D\u6587 (\u53F0\u7063)" },
        { value: "cmn-Hans-CN", text: "\u666E\u901A\u8BDD (\u4E2D\u56FD\u5927\u9646)" },
        { value: "en-US", text: "English (United States)" },
        { value: "en-GB", text: "English (United Kingdom)" },
        { value: "en-AU", text: "English (Australia)" },
        { value: "en-CA", text: "English (Canada)" },
        { value: "en-IN", text: "English (India)" },
        { value: "ja-JP", text: "\u65E5\u672C\u8A9E" },
        { value: "ko-KR", text: "\uD55C\uAD6D\uC5B4" }
      ];
      options.forEach(function(item) {
        const option = document.createElement("option");
        option.value = item.value;
        option.text = item.text;
        option.selected = item.value == speechRecognition.lang;
        selectElement.add(option);
      });
      contextMenu.appendChild(selectElement);
      contextMenu.style.left = event.clientX + "px";
      contextMenu.style.top = event.clientY + "px";
      document.body.appendChild(contextMenu);
      document.addEventListener("click", function(ev) {
        if (!contextMenu.contains(ev.target)) {
          contextMenu.remove();
        }
      });
    });
    const svgSpeakerOn = '<svg stroke="currentColor" fill="currentColor" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="16px" height="16px" viewBox="0 0 16 16" version="1.1"><path d="M 9.332031 13.816406 L 9.332031 12.785156 C 10.410156 12.472656 11.292969 11.875 11.976562 10.992188 C 12.660156 10.109375 13 9.105469 13 7.984375 C 13 6.859375 12.660156 5.855469 11.984375 4.964844 C 11.304688 4.078125 10.421875 3.484375 9.332031 3.183594 L 9.332031 2.148438 C 10.710938 2.460938 11.832031 3.160156 12.699219 4.242188 C 13.566406 5.324219 14 6.570312 14 7.984375 C 14 9.394531 13.566406 10.640625 12.699219 11.726562 C 11.832031 12.808594 10.710938 13.503906 9.332031 13.816406 Z M 2 10 L 2 6 L 4.667969 6 L 8 2.667969 L 8 13.332031 L 4.667969 10 Z M 9 10.800781 L 9 5.183594 C 9.609375 5.371094 10.097656 5.726562 10.457031 6.25 C 10.820312 6.773438 11 7.355469 11 8 C 11 8.632812 10.816406 9.210938 10.449219 9.734375 C 10.082031 10.253906 9.601562 10.609375 9 10.800781 Z M 7 5.199219 L 5.117188 7 L 3 7 L 3 9 L 5.117188 9 L 7 10.816406 Z M 5.433594 8 Z M 5.433594 8 "></path></svg>';
    const svgSpeakerOff = '<svg stroke="currentColor" fill="currentColor" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="16px" height="16px" viewBox="0 0 16 16" version="1.1"><path d="M 13.550781 15.066406 L 11.351562 12.867188 C 11.039062 13.089844 10.703125 13.28125 10.339844 13.441406 C 9.980469 13.601562 9.605469 13.726562 9.214844 13.816406 L 9.214844 12.785156 C 9.472656 12.707031 9.71875 12.621094 9.957031 12.523438 C 10.195312 12.429688 10.421875 12.304688 10.632812 12.148438 L 7.882812 9.382812 L 7.882812 13.332031 L 4.550781 10 L 1.882812 10 L 1.882812 6 L 4.484375 6 L 0.816406 2.332031 L 1.535156 1.617188 L 14.265625 14.332031 Z M 12.949219 11.199219 L 12.234375 10.484375 C 12.457031 10.105469 12.621094 9.707031 12.726562 9.285156 C 12.832031 8.859375 12.882812 8.429688 12.882812 7.984375 C 12.882812 6.839844 12.550781 5.8125 11.882812 4.910156 C 11.214844 4.003906 10.328125 3.429688 9.214844 3.183594 L 9.214844 2.148438 C 10.59375 2.460938 11.714844 3.160156 12.582031 4.242188 C 13.449219 5.324219 13.882812 6.570312 13.882812 7.984375 C 13.882812 8.550781 13.804688 9.105469 13.648438 9.648438 C 13.496094 10.195312 13.261719 10.710938 12.949219 11.199219 Z M 10.714844 8.964844 L 9.214844 7.464844 L 9.214844 5.300781 C 9.738281 5.542969 10.148438 5.910156 10.441406 6.398438 C 10.734375 6.890625 10.882812 7.421875 10.882812 8 C 10.882812 8.167969 10.871094 8.332031 10.839844 8.492188 C 10.8125 8.652344 10.773438 8.8125 10.714844 8.964844 Z M 7.882812 6.132812 L 6.148438 4.398438 L 7.882812 2.667969 Z M 6.882812 10.898438 L 6.882812 8.398438 L 5.484375 7 L 2.882812 7 L 2.882812 9 L 4.984375 9 Z M 6.183594 7.699219 Z M 6.183594 7.699219 "></path></svg>';
    const speakerButtonElement = document.createElement("button");
    speakerButtonElement.id = "btn-speaker";
    speakerButtonElement.type = "button";
    speakerButtonElement.classList = "absolute p-1 rounded-md text-gray-500 bottom-1.5 right-1 md:bottom-3.5 md:right-2 hover:bg-gray-100 dark:hover:text-gray-400 dark:hover:bg-gray-900 disabled:hover:bg-transparent dark:disabled:hover:bg-transparent";
    speakerButtonElement.style.right = "5rem";
    speakerButtonElement.innerHTML = svgSpeakerOff;
    speakerButtonElement.title = `\u958B\u555F\u8A9E\u97F3\u5408\u6210\u529F\u80FD (${isMac() ? "command+option+m" : "alt+m"})`;
    speakerButtonElement.addEventListener("click", () => {
      const enabled = isSpeechSynthesisEnabled();
      if (enabled) {
        speechSynthesisStop$.next();
      } else {
        speechSynthesisStart$.next();
      }
    });
    speakerButtonElement.addEventListener("contextmenu", function(event) {
      event.preventDefault();
      var contextMenu = document.createElement("div");
      contextMenu.close = function() {
        this.remove();
      };
      contextMenu.id = "speakerButtonElementContextMenu";
      contextMenu.style.position = "absolute";
      contextMenu.style.backgroundColor = "white";
      contextMenu.style.border = "1px solid black";
      contextMenu.style.padding = "10px";
      const styleElement = document.createElement("style");
      styleElement.textContent = `
        /* Light Theme */
        select {
            color: black;
            background-color: white;
            border: 1px solid black;
        }
        /* Dark Theme */
        @media (prefers-color-scheme: dark) {
            select {
                color: white;
                background-color: black;
                border: 1px solid white;
            }
        }`;
      contextMenu.appendChild(styleElement);
      const selectElement = document.createElement("select");
      selectElement.addEventListener("change", function(event2) {
        currentVoice = speechSynthesis.getVoices().filter((x) => x.voiceURI === this.value).pop();
        console.log("\u4F60\u76EE\u524D\u9078\u4E2D\u7684\u8A9E\u97F3\u5408\u6210\u8072\u97F3\u662F: ", currentVoice);
        speechSynthesisStart$.next();
        contextMenu.close();
      });
      const option1 = document.createElement("option");
      option1.value = "";
      option1.text = "\u8ACB\u9078\u64C7\u8A9E\u97F3\u5408\u6210\u7684\u6163\u7528\u8072\u97F3";
      selectElement.add(option1);
      speechSynthesis.getVoices().forEach(function(item) {
        const option = document.createElement("option");
        option.value = item.voiceURI;
        option.text = item.name;
        option.selected = item == currentVoice;
        selectElement.add(option);
      });
      contextMenu.appendChild(selectElement);
      contextMenu.style.left = event.clientX + "px";
      contextMenu.style.top = event.clientY + "px";
      document.body.appendChild(contextMenu);
      document.addEventListener("click", function(ev) {
        if (!contextMenu.contains(ev.target)) {
          contextMenu.remove();
        }
      });
    });
    function isSpeechSynthesisEnabled() {
      return speakerButtonElement.innerHTML === svgSpeakerOn;
    }
    ;
    function isSpeechRecognitionEnabled() {
      return microphoneButtonElement.innerHTML === svgMicOn;
    }
    ;
    var ChatGPTRunningStatus = false;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const speechRecognition = new SpeechRecognition();
    speechRecognition.continuous = true;
    speechRecognition.interimResults = true;
    speechRecognition.lang = defaultLang;
    speechRecognition.onstart = (event) => {
      logLevel >= 1 && console.log("\u958B\u59CB\u9032\u884C SpeechRecognition \u8A9E\u97F3\u8FA8\u8B58");
    };
    speechRecognition.onerror = (event) => {
      logLevel >= 1 && console.log("SpeechRecognition \u8A9E\u97F3\u8FA8\u8B58\u932F\u8AA4(error)\u6216\u4E2D\u65B7(abort)!", event);
    };
    speechRecognition.onend = (event) => {
      logLevel >= 1 && console.log("\u505C\u6B62 SpeechRecognition \u8A9E\u97F3\u8FA8\u8B58!", event);
      speechRecognitionStop$.next();
    };
    speechRecognition.onresult = async (event) => {
      await processSpeechRecognitionResult(event);
    };
    async function processSpeechRecognitionResult(event) {
      logLevel >= 2 && console.log("\u8A9E\u97F3\u8B58\u5225\u4E8B\u4EF6: ", event);
      let results = event.results[event.resultIndex];
      logLevel >= 2 && console.log("results.length", results.length);
      let transcript = results[0].transcript;
      logLevel >= 1 && console.log("\u8A9E\u97F3\u8F38\u5165: " + transcript, "isFinal: ", results.isFinal);
      if (Parts.length == 0) {
        Parts[0] = transcript;
      } else {
        Parts[Parts.length - 1] = transcript;
      }
      textAreaElement.value = Parts.join("") + "\u2026";
      textAreaElement.dispatchEvent(new Event("input", { bubbles: true }));
      textAreaElement.focus();
      textAreaElement.setSelectionRange(textAreaElement.value.length, textAreaElement.value.length);
      textAreaElement.scrollTop = textAreaElement.scrollHeight;
      if (results.isFinal) {
        logLevel >= 2 && console.log("Final Result: ", results);
        let id = getVoiceCommandByTranscript(Parts[Parts.length - 1]);
        logLevel >= 2 && console.log("id = ", id);
        switch (id) {
          case "enter":
            Parts.pop();
            if (Parts.length > 0) {
              textAreaElement.value = Parts.join("");
              textAreaElement.dispatchEvent(new Event("input", { bubbles: true }));
              textAreaElement.focus();
              textAreaElement.setSelectionRange(textAreaElement.value.length, textAreaElement.value.length);
              textAreaElement.scrollTop = textAreaElement.scrollHeight;
              submitButtonElement.click();
              Parts = [];
              speechRecognitionStop$.next();
            }
            break;
          case "clear":
            Parts = [];
            break;
          case "reload":
            location.reload();
            break;
          case "delete":
            Parts.pop();
            Parts.pop();
            break;
          case "\u63DB\u884C":
            Parts[Parts.length - 1] = "\r\n";
            break;
          case "\u91CD\u7F6E":
            reset();
            break;
          case "\u5207\u63DB\u81F3\u4E2D\u6587\u6A21\u5F0F":
            logLevel >= 2 && console.log("\u5207\u63DB\u81F3\u4E2D\u6587\u6A21\u5F0F");
            microphoneButtonElement.changeLanguage("cmn-Hant-TW");
            Parts[Parts.length - 1] = "";
            break;
          case "\u5207\u63DB\u81F3\u82F1\u6587\u6A21\u5F0F":
            logLevel >= 2 && console.log("\u5207\u63DB\u81F3\u82F1\u6587\u6A21\u5F0F");
            microphoneButtonElement.changeLanguage("en-US");
            Parts[Parts.length - 1] = "";
            break;
          case "\u5207\u63DB\u81F3\u65E5\u6587\u6A21\u5F0F":
          case "\u5207\u63DB\u81F3\u65E5\u6587":
            logLevel >= 2 && console.log("\u5207\u63DB\u81F3\u65E5\u6587\u6A21\u5F0F");
            microphoneButtonElement.changeLanguage("ja-JP");
            Parts[Parts.length - 1] = "";
            break;
          case "\u5207\u63DB\u81F3\u97D3\u6587\u6A21\u5F0F":
            logLevel >= 2 && console.log("\u5207\u63DB\u81F3\u97D3\u6587\u6A21\u5F0F");
            microphoneButtonElement.changeLanguage("ko-KR");
            Parts[Parts.length - 1] = "";
            break;
          case "\u95DC\u9589\u8A9E\u97F3\u8FA8\u8B58":
            logLevel >= 2 && console.log("\u95DC\u9589\u8A9E\u97F3\u8FA8\u8B58");
            speechRecognitionStop$.next();
            break;
          case "paste":
            Parts.pop();
            logLevel >= 2 && console.log("\u8CBC\u4E0A\u526A\u8CBC\u7C3F");
            Parts = [...Parts, "\r\n\r\n"];
            Parts = [...Parts, await window.navigator.clipboard.readText()];
            Parts = [...Parts, "\r\n\r\n"];
            break;
          case "explain_code":
            Parts[Parts.length - 1] = Parts[Parts.length - 1].replace(/…$/g, "");
            logLevel >= 2 && console.log("\u78BA\u8A8D\u8F38\u5165 (\u8AAA\u660E\u7A0B\u5F0F\u78BC)");
            Parts = [...Parts, "\r\n\r\n"];
            Parts = [...Parts, await window.navigator.clipboard.readText()];
            Parts = [...Parts, "\r\n\r\n"];
            break;
          default:
            Parts[Parts.length - 1] = Parts[Parts.length - 1].replace(/…$/g, "");
            logLevel >= 2 && console.log("\u78BA\u8A8D\u8F38\u5165", Parts);
            break;
        }
        Parts = [...Parts, ""];
        textAreaElement.value = Parts.join("");
        textAreaElement.dispatchEvent(new Event("input", { bubbles: true }));
        textAreaElement.focus();
        textAreaElement.setSelectionRange(textAreaElement.value.length, textAreaElement.value.length);
        textAreaElement.scrollTop = textAreaElement.scrollHeight;
      }
    }
    const speechRecognitionStart$ = new Subject();
    speechRecognitionStart$.subscribe(() => {
      logLevel >= 1 && console.log("speechRecognitionStart$");
      speechSynthesisStop$.next();
      microphoneButtonElement.innerHTML = svgMicOn;
      microphoneButtonElement.title = `\u95DC\u9589\u8A9E\u97F3\u8FA8\u8B58\u529F\u80FD (${isMac() ? "command+option+s" : "alt+s"})`;
      if (textAreaElement.value) {
        Parts = [textAreaElement.value, ""];
      } else {
        Parts = [];
      }
      speechRecognition.start();
      logLevel >= 1 && console.log("speechRecognitionStart$ Started", Parts, textAreaElement.value);
    });
    const speechRecognitionStop$ = new Subject();
    speechRecognitionStop$.subscribe(() => {
      logLevel >= 1 && console.log("speechRecognitionStop$");
      microphoneButtonElement.innerHTML = svgMicOff;
      microphoneButtonElement.title = `\u958B\u555F\u8A9E\u97F3\u8FA8\u8B58\u529F\u80FD (${isMac() ? "command+option+s" : "alt+s"})`;
      if (Parts.length > 0) {
        textAreaElement.value = textAreaElement.value.replace(/…$/, "");
        textAreaElement.dispatchEvent(new Event("input", { bubbles: true }));
        textAreaElement.focus();
        textAreaElement.setSelectionRange(textAreaElement.value.length, textAreaElement.value.length);
        textAreaElement.scrollTop = textAreaElement.scrollHeight;
        Parts = [];
      }
      speechRecognition.abort();
    });
    const speechSynthesisStart$ = new Subject();
    speechSynthesisStart$.subscribe(() => {
      logLevel >= 1 && console.log("speechSynthesisStart$");
      speechRecognitionStop$.next();
      speakerButtonElement.innerHTML = svgSpeakerOn;
      speakerButtonElement.title = `\u95DC\u9589\u8A9E\u97F3\u5408\u6210\u529F\u80FD (${isMac() ? "command+option+m" : "alt+m"})`;
    });
    const speechSynthesisStop$ = new Subject();
    speechSynthesisStop$.subscribe(() => {
      logLevel >= 1 && console.log("speechSynthesisStop$");
      speakerButtonElement.innerHTML = svgSpeakerOff;
      speakerButtonElement.title = `\u958B\u555F\u8A9E\u97F3\u5408\u6210\u529F\u80FD (${isMac() ? "command+option+m" : "alt+m"})`;
      checkAudio().subscribe({
        next: (audioStream) => {
          audioStream.getTracks().forEach(function(track) {
            track.stop();
          });
        },
        error: (error) => {
          logLevel >= 2 && console.error("Microphone is not usable: " + error);
        }
      });
      if (speechSynthesis.speaking) {
        logLevel >= 2 && console.log("\u6B63\u5728\u64AD\u653E\u5408\u6210\u8A9E\u97F3\u4E2D\uFF0C\u53D6\u6D88\u672C\u6B21\u64AD\u653E\uFF01");
        speechSynthesis.cancel();
      }
    });
    function getVoiceCommandByTranscript(str) {
      const voice_commands = {
        enter: {
          terms: [
            "enter",
            "Run",
            "go",
            // 繁體字
            "\u9001\u51FA",
            "\u53BB\u5427",
            "\u958B\u59CB",
            "\u72C2\u5954\u5427",
            "\u8DD1\u8D77\u4F86",
            // 簡體字
            "\u56DE\u8F66"
          ],
          match: "exact"
          // prefix, exact, postfix
        },
        reload: {
          terms: [
            "reload",
            "\u91CD\u65B0\u6574\u7406",
            "\u91CD\u8F09\u9801\u9762"
          ],
          match: "exact"
          // prefix, exact, postfix
        },
        clear: {
          terms: [
            "clear",
            "\u91CD\u65B0\u8F38\u5165",
            "\u6E05\u9664",
            "\u6E05\u7A7A",
            "\u6DE8\u7A7A"
          ],
          match: "exact"
          // prefix, exact, postfix
        },
        delete: {
          terms: [
            "delete",
            // 繁體字
            "\u522A\u9664",
            "\u522A\u9664\u4E0A\u4E00\u53E5",
            // 簡體字
            "\u5220\u9664"
          ],
          match: "exact"
          // prefix, exact, postfix
        },
        paste: {
          terms: [
            "paste",
            "\u8CBC\u4E0A",
            "\u8CBC\u4E0A\u526A\u8CBC\u7C3F"
          ],
          match: "exact"
          // prefix, exact, postfix
        },
        explain_code: {
          terms: [
            "\u8ACB\u8AAA\u660E\u4EE5\u4E0B\u7A0B\u5F0F\u78BC",
            "\u8ACB\u8AAA\u660E\u4E00\u4E0B\u7A0B\u5F0F\u78BC",
            "\u8AAA\u660E\u4E00\u4E0B\u7A0B\u5F0F\u78BC",
            "\u8AAA\u660E\u4EE5\u4E0B\u7A0B\u5F0F\u78BC"
          ],
          match: "exact"
          // prefix, exact, postfix
        },
        \u9017\u9EDE: {
          terms: [
            "comma",
            "\u9017\u865F",
            "\u9017\u9EDE"
          ],
          match: "exact"
          // prefix, exact, postfix
        },
        \u53E5\u9EDE: {
          terms: [
            "period",
            "\u53E5\u865F",
            "\u53E5\u9EDE"
          ],
          match: "exact"
          // prefix, exact, postfix
        },
        \u554F\u865F: {
          terms: [
            "questionmark",
            "\u554F\u865F"
          ],
          match: "exact"
          // prefix, exact, postfix
        },
        \u63DB\u884C: {
          terms: [
            "newline",
            "\u63DB\u884C",
            "\u65B7\u884C"
          ],
          match: "exact"
          // prefix, exact, postfix
        },
        \u91CD\u7F6E: {
          terms: [
            "reset",
            "\u91CD\u7F6E",
            "\u91CD\u65B0\u958B\u59CB",
            "\u30EA\u30BB\u30C3\u30C8",
            // Risetto
            "\uCD08\uAE30\uD654"
            // chogihwa
          ],
          match: "exact"
          // prefix, exact, postfix
        },
        \u5207\u63DB\u81F3\u4E2D\u6587\u6A21\u5F0F: {
          terms: [
            "\u5207\u63DB\u81F3\u4E2D\u6587\u6A21\u5F0F",
            "\u5207\u63DB\u5230\u4E2D\u6587\u6A21\u5F0F",
            "\u5207\u63DB\u81F3\u4E2D\u6587",
            "\u5207\u63DB\u5230\u4E2D\u6587",
            "\u5207\u63DB\u81F3\u4E2D\u8A9E\u6A21\u5F0F",
            "\u5207\u63DB\u5230\u4E2D\u8A9E\u6A21\u5F0F",
            "\u5207\u63DB\u81F3\u4E2D\u8A9E",
            "\u5207\u63DB\u5230\u4E2D\u8A9E",
            "switch to Chinese mode"
          ],
          match: "exact"
          // prefix, exact, postfix
        },
        \u5207\u63DB\u81F3\u82F1\u6587\u6A21\u5F0F: {
          terms: [
            "\u5207\u63DB\u81F3\u82F1\u6587\u6A21\u5F0F",
            "\u5207\u63DB\u5230\u82F1\u6587\u6A21\u5F0F",
            "\u5207\u63DB\u81F3\u82F1\u6587",
            "\u5207\u63DB\u5230\u82F1\u6587",
            "\u5207\u63DB\u81F3\u82F1\u8A9E\u6A21\u5F0F",
            "\u5207\u63DB\u5230\u82F1\u8A9E\u6A21\u5F0F",
            "\u5207\u63DB\u81F3\u82F1\u8A9E",
            "\u5207\u63DB\u5230\u82F1\u8A9E",
            "switch to English mode"
          ],
          match: "exact"
          // prefix, exact, postfix
        },
        \u5207\u63DB\u81F3\u65E5\u6587\u6A21\u5F0F: {
          terms: [
            "\u5207\u63DB\u81F3\u65E5\u6587\u6A21\u5F0F",
            "\u5207\u63DB\u5230\u65E5\u6587\u6A21\u5F0F",
            "\u5207\u63DB\u81F3\u65E5\u6587",
            "\u5207\u63DB\u5230\u65E5\u6587",
            "\u5207\u63DB\u81F3\u65E5\u8A9E\u6A21\u5F0F",
            "\u5207\u63DB\u5230\u65E5\u8A9E\u6A21\u5F0F",
            "\u5207\u63DB\u81F3\u65E5\u8A9E",
            "\u5207\u63DB\u5230\u65E5\u8A9E",
            "switch to Japanese mode"
          ],
          match: "exact"
          // prefix, exact, postfix
        },
        \u5207\u63DB\u81F3\u97D3\u6587\u6A21\u5F0F: {
          terms: [
            "\u5207\u63DB\u81F3\u97D3\u6587\u6A21\u5F0F",
            "\u5207\u63DB\u5230\u97D3\u6587\u6A21\u5F0F",
            "\u5207\u63DB\u81F3\u97D3\u6587",
            "\u5207\u63DB\u5230\u97D3\u6587",
            "\u5207\u63DB\u81F3\u97D3\u8A9E\u6A21\u5F0F",
            "\u5207\u63DB\u5230\u97D3\u8A9E\u6A21\u5F0F",
            "\u5207\u63DB\u81F3\u97D3\u8A9E",
            "\u5207\u63DB\u5230\u97D3\u8A9E",
            "switch to Korea mode"
          ],
          match: "exact"
          // prefix, exact, postfix
        },
        \u95DC\u9589\u8A9E\u97F3\u8FA8\u8B58: {
          terms: [
            "\u95DC\u9589\u8A9E\u97F3\u8FA8\u8B58",
            "\u95DC\u9589\u8A9E\u97F3"
          ],
          match: "exact"
          // prefix, exact, postfix
        }
      };
      str = str.trim();
      if (navigator.userAgent.indexOf("Edg/") >= 0 && str.substr(str.length - 1, 1) == "\u3002") {
        str = str.slice(0, -1);
      }
      for (const commandId in voice_commands) {
        if (Object.hasOwnProperty.call(voice_commands, commandId)) {
          const cmd = voice_commands[commandId];
          for (const term of cmd.terms) {
            let regex = new RegExp("^" + term + "$", "i");
            if (cmd.match === "prefix") {
              regex = new RegExp("^" + term, "i");
            }
            if (cmd.match === "postfix") {
              regex = new RegExp(term + "$", "i");
            }
            logLevel >= 2 && console.log("term = ", term, ", str = ", str, ", match = ", cmd.match, ", UA = ", navigator.userAgent);
            if (str.search(regex) !== -1) {
              return commandId;
            }
          }
        }
      }
      return "";
    }
    const createUtteranceTextListener = () => {
      return new Observable((subscriber) => {
        var lastParagraphElement;
        var observer = new MutationObserver((mutations) => {
          logLevel >= 2 && console.log(`\u76E3\u6E2C\u5230 ${mutations.length} \u500B\u8B8A\u66F4`, mutations);
          mutations.forEach((mutation) => {
            logLevel >= 2 && console.log(`TYPE: ${mutation.type}, \u65B0\u589E ${mutation.addedNodes.length} \u500B\u7BC0\u9EDE\uFF0C\u522A\u9664 ${mutation.removedNodes.length} \u500B\u7BC0\u9EDE`);
            if (mutation.type === "characterData" && (mutation.target.parentNode.tagName === "P" || mutation.target.parentNode.tagName === "LI")) {
              logLevel >= 2 && console.log(mutation.target);
              logLevel >= 2 && console.log(lastParagraphElement);
              logLevel >= 2 && console.log(mutation.target.parentNode);
              ChatGPTRunningStatus = true;
              if (lastParagraphElement && lastParagraphElement != mutation.target.parentNode) {
                logLevel >= 2 && console.log("lastParagraphElement = ", lastParagraphElement);
                subscriber.next(lastParagraphElement.textContent);
              }
              lastParagraphElement = mutation.target.parentNode;
            }
            if (mutation.type === "childList" && mutation.target.tagName === "BUTTON" && mutation.target.type !== "button" && mutation.addedNodes.length === 1 && mutation.addedNodes[0].nodeName === "svg" && mutation.addedNodes[0].textContent === "") {
              logLevel >= 2 && console.log("!!\u52A0\u5165\u8A9E\u97F3\u4F47\u5217!!", lastParagraphElement);
              setTimeout(() => {
                ChatGPTRunningStatus = false;
              }, 1e3);
              if (!!lastParagraphElement.textContent) {
                subscriber.next(lastParagraphElement.textContent);
              }
              lastParagraphElement = void 0;
            }
          });
        });
        var target = document.getElementsByTagName("main")[0];
        var config2 = {
          attributes: false,
          // 監測屬性變更
          childList: true,
          // 監測子節點的變更
          subtree: true,
          // 監測所有從 target 開始的子節點
          characterData: true
        };
        observer.observe(target, config2);
      });
    };
    const listenUtteranceTextAndSpeak = () => {
      defer(() => createUtteranceTextListener()).pipe(
        switchMap((lastParagraphTextFromChatGPT) => SpeakText(lastParagraphTextFromChatGPT)),
        retry()
      ).subscribe({
        error: (err) => logLevel >= 1 && console.error("\u76E3\u807D\u4E26\u9032\u884C\u8A9E\u97F3\u5408\u6210\u932F\u8AA4", err),
        complete: () => logLevel >= 1 && console.log("\u76E3\u807D\u4E26\u9032\u884C\u8A9E\u97F3\u5408\u6210\u7D50\u675F")
      });
    };
    const SpeakText = (text) => {
      return new Observable((subscriber) => {
        if (!isSpeechSynthesisEnabled()) {
          return;
        }
        logLevel >= 1 && console.log(`\u6E96\u5099\u5408\u6210\u95B1\u8B80\u6587\u7AE0\u8A9E\u97F3: ${text}`, currentVoice);
        let utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = currentVoice;
        if (currentVoice.lang === "zh-TW") {
          utterance.rate = 1.3;
        } else {
          utterance.rate = 1;
        }
        utterance.onstart = (evt) => {
          logLevel >= 2 && console.log("\u958B\u59CB\u767C\u97F3", evt);
          subscriber.next(evt);
        };
        utterance.onend = (evt) => {
          logLevel >= 2 && console.log("\u7D50\u675F\u767C\u97F3", evt);
          subscriber.complete();
        };
        utterance.onerror = (evt) => {
          logLevel >= 2 && console.log("\u767C\u97F3\u904E\u7A0B\u5931\u6557", evt);
          subscriber.error(evt);
        };
        speechSynthesis.speak(utterance);
      });
    };
    const checkAudio = () => {
      logLevel >= 2 && console.log("Checking Audio availability!");
      return new Observable((subscriber) => {
        navigator.getUserMedia(
          { audio: true },
          function(stream) {
            subscriber.next(stream);
            subscriber.complete();
          },
          function(error) {
            subscriber.error(error);
          }
        );
      });
    };
    const selectTextToSpeak = () => {
      const toDocumentSelectedText = () => (observable2) => observable2.pipe(
        map(() => window.getSelection()),
        filter((selection) => selection.rangeCount > 0 && !selection.isCollapsed),
        map((selection) => selection.getRangeAt(0).toString())
      );
      fromEvent(document, "selectionchange").pipe(
        toDocumentSelectedText(),
        tap((selectedText) => {
          logLevel >= 2 && console.log("Get the selected text: ", selectedText);
        }),
        tap(() => {
          speechSynthesis.cancel();
        }),
        switchMap((selectedText) => timer(1e3).pipe(switchMap(() => SpeakText(selectedText)))),
        catchError((err) => of(err))
      ).subscribe();
    };
    const keydown$ = fromEvent(document, "keydown");
    const registerHotKeys = () => {
      const altOrCommandOption = (event) => {
        return event.altKey && (isMac() ? event.metaKey : true);
      };
      const keydownEscape$ = keydown$.pipe(filter((ev) => ev.key === "Escape" && !(ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey)));
      const keydownEnter$ = keydown$.pipe(filter((ev) => ev.key === "Enter" && ev.target.nodeName === "TEXTAREA" && !(ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey)));
      const keydownAltS$ = keydown$.pipe(filter((ev) => altOrCommandOption(ev) && ev.code === "KeyS"));
      const keydownAltT$ = keydown$.pipe(filter((ev) => altOrCommandOption(ev) && ev.code === "KeyT"));
      const keydownAltR$ = keydown$.pipe(filter((ev) => altOrCommandOption(ev) && ev.code === "KeyR"));
      const keydownAltM$ = keydown$.pipe(filter((ev) => altOrCommandOption(ev) && ev.code === "KeyM"));
      keydownAltT$.subscribe((ev) => {
        speechSynthesisStop$.next();
        speechRecognitionStop$.next();
      });
      keydownAltS$.subscribe((ev) => {
        microphoneButtonElement.dispatchEvent(new Event("click", { bubbles: true }));
      });
      keydownAltM$.subscribe((ev) => {
        speakerButtonElement.dispatchEvent(new Event("click", { bubbles: true }));
      });
      keydownAltR$.subscribe((ev) => {
        reset();
      });
      keydownEscape$.subscribe((ev) => {
        reset();
      });
    };
    function initializeTextboxInputEvent() {
      textAreaElement.addEventListener("input", (ev) => {
        if (isSpeechRecognitionEnabled()) {
          logLevel >= 1 && console.log("initializeTextboxInputEvent", ev);
          if (!!ev.inputType) {
            speechRecognitionStop$.next();
          }
        }
      });
    }
    function addButtons() {
      submitButtonElement = textAreaElement.nextSibling;
      submitButtonElement.addEventListener("click", (ev) => {
        this.submit();
        setTimeout(() => {
          reset();
        }, 500);
      });
      textAreaElement.parentElement.insertBefore(microphoneButtonElement, submitButtonElement);
      textAreaElement.parentElement.insertBefore(speakerButtonElement, microphoneButtonElement);
      textAreaElement.style.paddingRight = "90px";
    }
    function reset() {
      Parts = [];
      speechSynthesisStop$.next();
      speechRecognitionStop$.next();
      textAreaElement.value = "";
      textAreaElement.dispatchEvent(new Event("input", { bubbles: true }));
      textAreaElement.focus();
      textAreaElement.setSelectionRange(textAreaElement.value.length, textAreaElement.value.length);
      textAreaElement.scrollTop = textAreaElement.scrollHeight;
      if (document.querySelector("#microphoneButtonElementContextMenu")) {
        document.querySelector("#microphoneButtonElementContextMenu").close();
      }
      if (document.querySelector("#speakerButtonElementContextMenu")) {
        document.querySelector("#speakerButtonElementContextMenu").close();
      }
      speakerButtonElement.innerHTML = svgSpeakerOff;
      microphoneButtonElement.innerHTML = svgMicOff;
    }
    setTimeout(() => {
      setInterval(() => {
        if (document.querySelector("#btn-speaker") === null) {
          logLevel >= 1 && console.log("\u5075\u6E2C\u5230\u63DB\u9801\u4E8B\u4EF6");
          reset();
          setTimeout(() => {
            textAreaElement = document.activeElement;
            addButtons();
            initializeTextboxInputEvent();
          }, 300);
        }
      }, 300);
    }, 5e3);
    interval(100).pipe(
      map(() => document.activeElement),
      filter((element) => element.tagName === "TEXTAREA" && element.nextSibling.tagName === "BUTTON"),
      take(1)
    ).subscribe((textarea) => {
      textAreaElement = textarea;
      setTimeout(() => {
        addButtons();
        registerHotKeys();
        listenUtteranceTextAndSpeak();
        selectTextToSpeak();
        initializeTextboxInputEvent();
      }, 300);
    });
  })();
})();
// @license      MIT
