QUnit.config.testTimeout = 4000;

Ink.requireModules(['Ink.Dom.Event_1', 'Ink.Dom.Element_1', 'Ink.Dom.Selector_1', 'Ink.Dom.Browser_1'], function (InkEvent, InkElement, Selector, Browser) {
    (function () {
        module('throttle');

        var pass = function () { ok(true); };
        var fail = function () { ok(false); };

        function testWithClock(name, testBack) {
            return test(name, function () {
                var clock = sinon.useFakeTimers();
                testBack(clock);
                clock.restore();
            });
        }

        testWithClock('Delay first call', function (clock) {
            var spy = sinon.spy();
            var throttledFunc = InkEvent.throttle(spy, 100);

            throttledFunc();
            ok(spy.notCalled);
            clock.tick(101);
            ok(spy.calledOnce);
        });
        testWithClock('Limit amount of calls', function (clock) {
            var spy = sinon.spy();
            var throttledFunc = InkEvent.throttle(spy, 100);

            // Call twice, wait
            throttledFunc();
            throttledFunc();
            clock.tick(101);

            ok(spy.calledOnce);
        });
        testWithClock('Order of calls', function (clock) {
            var spy = sinon.spy();
            var throttledFunc = InkEvent.throttle(spy, 100);

            throttledFunc(1);
            throttledFunc(2);  // Ignored
            clock.tick(101);
            ok(spy.lastCall.calledWith(1));

            throttledFunc(3);
            clock.tick(101);
            ok(spy.lastCall.calledWith(3));
        });
        testWithClock('Context and arguments', function (clock) {
            InkEvent.throttle(function (arg) {
                equal(arg, 'arg');
                equal(this, 'this');
            }, 0).call('this', 'arg');
            clock.tick(101);
        });
        testWithClock('Separated calls', function (clock) {
            var spy = sinon.spy();
            var fewTimes = InkEvent.throttle(spy, 20);

            fewTimes(1);
            clock.tick(21);
            ok(spy.lastCall.calledWith(1));

            fewTimes(2);
            clock.tick(20);
            ok(spy.lastCall.calledWith(2));

            fewTimes(3);
            clock.tick(20);
            ok(spy.lastCall.calledWith(3));
        });


        testWithClock('called with the correct timing between calls', function (clock) {
            var firstCallTime;
            var spy;
            var throttled = InkEvent.throttle(spy = sinon.spy(function () {
                if (firstCallTime) {
                    equal(+new Date() - firstCallTime, 200);
                } else {
                    firstCallTime = +new Date();
                }
            }), 200);

            expect(2);

            throttled();
            throttled();
            clock.tick(201);

            throttled();
            clock.tick(200);

            ok(spy.calledTwice);
        });
    }());

    module('fire');

    test('basic', function () {
        var elem = InkElement.create('div');
        document.body.appendChild(elem);

        InkEvent.observe(elem, 'click', function (ev) {
            equal(ev.memo.memo, 'check');
            document.body.removeChild(elem);
        });

        expect(1);
        InkEvent.fire(elem, 'click', {memo: 'check'});
    });

    test('bubbling', function () {
        var elem = InkElement.create('div', {className: 'elem'});
        var child = InkElement.create('div', { insertBottom: elem });
        document.body.appendChild(elem);

        InkEvent.observe(elem, 'click', function (ev) {
            equal(ev.memo.memo, 'check');
            ok(InkEvent.element(ev) === child);
            ok(this === elem);
            document.body.removeChild(elem);
        });

        expect(3);
        InkEvent.fire(child, 'click', {memo: 'check'});
    });

    asyncTest('fire() and bubbling, no appending to document', function () {
        // [bug] This fails in chrome. Why?
        var elem = InkElement.create('div', {className: 'elem'});
        var child = InkElement.create('div', { insertBottom: elem });

        InkEvent.observe(elem, 'click', function (ev) {
            equal(ev.memo.memo, 'check');
            ok(InkEvent.element(ev) === child);
            ok(this === elem);
            start();
        });

        InkEvent.fire(child, 'click', {memo: 'check'});
    });

    asyncTest('events on the window', function () {
        expect(1);
        var cb = InkEvent.observe(window, 'resize', function (event) {
            ok(true);
            InkEvent.stopObserving(window, 'resize', cb);
            start();
        });
        InkEvent.fire(window, 'resize');
    });

    module('observe');

    asyncTest('basic', function () {
        var div = InkElement.create('div');
        InkEvent.observe(div, 'click', function () {
            ok(true);
            start();
        });
        InkEvent.fire(div, 'click');
    });

    test('return the handler', function () {
        var handler = function () {};
        var cb = InkEvent.observe(InkElement.create('div'), 'keyup', handler);
        equal(typeof cb, 'function', 'returned a function');
        ok(cb === handler, 'returned same function');
    });

    module('observeOnce');

    asyncTest('fire only once', function () {
        var div = InkElement.create('div');
        InkEvent.observeOnce(div, 'click', function () {
            ok(true);
            start();
        });
        expect(1);  // The above ok(true) will break if called more than once.
        InkEvent.fire(div, 'click');
        InkEvent.fire(div, 'click');
        InkEvent.fire(div, 'click');
        InkEvent.fire(div, 'click');
    });

    test('return the handler', function () {
        var handler = function () {};
        var cb = InkEvent.observeOnce(InkElement.create('div'), 'keyup', handler);
        ok(cb !== handler, 'returned the onceBack');
        ok(typeof cb === 'function', 'returned a function');
    });

    (function () {
        // TODO DRY this
        var elem,
            child,
            grandChild;

        module('observeDelegated fired', {
            setup: function () {
                elem = InkElement.create('ul');
                child = InkElement.create('li');
                grandChild = InkElement.create('span');
                grandChild.className = 'the-grandchild';

                elem.appendChild(child);
                child.appendChild(grandChild);
                document.body.appendChild(elem);
            },
            teardown: function () { document.body.removeChild(elem); }
        });

        asyncTest('observeDelegated fired', function () {
            expect(1);
            InkEvent.observeDelegated(elem, 'click', 'li', function (event) {
                ok(InkEvent.element(event) === child, 'InkEvent.element(event) resolves to the selected element');
                start( );
            });

            InkEvent.fire(grandChild, 'click');
        });
    })();

    (function () {
        var elem,
            child,
            grandChild;

        module('observeDelegated not fired' , {
            setup: function () {
                elem = InkElement.create('ul');
                child = InkElement.create('li');
                grandChild = InkElement.create('span');
                grandChild.className = 'the-grandchild';

                elem.appendChild(child);
                child.appendChild(grandChild);
                document.body.appendChild(elem);
            },
            teardown: function () { document.body.removeChild(elem); }
        });
        asyncTest('observeDelegated not fired', function () {
            expect(1);
            InkEvent.observeDelegated(elem, 'click', 'ul', function (event) {
                ok(false, 'should not fire event on delegation parent');
            });
            InkEvent.observe(elem, 'click', function (event) {
                ok(true, 'should fire normal event');
                start( );
            });

            InkEvent.fire(elem, 'click');
        });
    })( );

    (function () {
        var elem,
            child,
            grandChild;

        module('observeDelegated not fired' , {
            setup: function () {
                elem = InkElement.create('ul');
                child = InkElement.create('li');
                grandChild = InkElement.create('span');
                grandChild.className = 'the-grandchild';

                elem.appendChild(child);
                child.appendChild(grandChild);
                document.body.appendChild(elem);
            },
            teardown: function () { document.body.removeChild(elem); }
        });

        test('observeDelegated + some selectors', function () {
            expect(2);
            stop(2);
            InkEvent.observeDelegated(elem, 'click', 'li > span.classIDontHave', function () {
                ok(false, 'should not find this element');
            });

            InkEvent.observeDelegated(elem, 'click', 'li > span', function () {
                ok(true, 'selected by tag name, correctly');
                start();
            });

            InkEvent.observeDelegated(elem, 'click', 'li > span.the-grandchild', function () {
                ok(true, 'selected by class, correctly');
                start();
            });

            InkEvent.fire(grandChild, 'click');
        });
    }());

    (function () {
        var elem,
            child,
            grandChild;

        module('observeDelegated on many children' , {
            setup: function () {
                elem = InkElement.create('ul');
                child = InkElement.create('li');
                grandChild = InkElement.create('span');
                grandChild2 = InkElement.create('span');
                grandChild3 = InkElement.create('span');
                grandChild.className = 'the-grandchild';
                grandChild2.className = 'the-grandchild-2';
                grandChild3.className = 'the-grandchild-3';

                elem.appendChild(child);
                child.appendChild(grandChild);
                child.appendChild(grandChild2);
                child.appendChild(grandChild3);
                document.body.appendChild(elem);
            },
            teardown: function () { document.body.removeChild(elem); }
        });

        asyncTest('observeDelegated on many children', function () {
            expect(1);

            InkEvent.observeDelegated(elem, 'click', '.the-grandchild', function () {
                ok(false);
            });

            InkEvent.observeDelegated(elem, 'click', '.the-grandchild-2', function (ev) {
                ok(InkEvent.element(ev) === grandChild2);
                start();
            });

            InkEvent.observeDelegated(elem, 'click', '.the-grandchild-3', function () {
                ok(false);
            });

            InkEvent.fire(grandChild2, 'click');
        });
    }());

    module('hashchange', {
        setup: function () { location.hash = ''; },
        teardown: function () { location.hash = ''; }
    });

    asyncTest('observe it', function ( ) {
        if (Browser.IE && parseFloat(Browser.version) < 8) {
            ok(true, 'skipped');
            start();
            return;
        }

        var cb = InkEvent.observe( window , 'hashchange' , function( e ) {
            ok(true, 'callback to onhashchange called');
            InkEvent.stopObserving(window, 'hashchange', cb);
            start();
        });

        location.hash = 'changed';
    });

    module('pushstate');
    asyncTest('test pushState', function ( ) {
        if (Browser.IE && parseFloat(Browser.version) < 10) {
            ok(true, 'skipped');
            start();
            return;
        }
        history.pushState( '' , '' , location.pathname.replace( /_\d\/$/ , '_2/' ) );

        var cb = InkEvent.observe( window , 'popstate' , function( e ) {
            ok(true);
            InkEvent.stopObserving(window, 'popstate', cb);
            start();
        });

        expect(1);
        history.back( );
    });
});

