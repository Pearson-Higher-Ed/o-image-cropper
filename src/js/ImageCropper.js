var Cropper = (function () {
    /**
     * Default list of options. You may override any of these options when instantiating the Cropper
     */
    var options = {
        container_class: 'cropper',
        width:      0,
        height:     0,
        min_width:  0,
        min_height: 0,
        max_width:  0,
        max_height: 0,
        ratio:      {width: 0, height: 0}
    };

    /**
     * Polyfill for browsers that don't natively support Function.bind
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind#Browser_compatibility
     */
    if (!Function.prototype.bind) {
        Function.prototype.bind = function (this_ref) {
            if (typeof this !== "function") {
                throw new TypeError("Bound function not callable");
            }

            var args  = Array.prototype.slice.call(arguments, 1);
            var self  = this;
            var f     = function () {};

            var bound = function () {
                return self.apply(this instanceof f && this_ref ? this : this_ref, args.concat(Array.prototype.slice.call(arguments)));
            };

            f.prototype     = this.prototype;
            bound.prototype = new f();

            return bound;
        };
    }

    /**
     * Cross browser normalization for fetching computed style rules
     * @param element Node
     * @param property string
     * @return string
     */
    function getStyle (element, property) {
        if (element.currentStyle) {
            return element.currentStyle[property]; // IE
        } else if (typeof window.getComputedStyle == 'function') {
            return window.getComputedStyle(element, null).getPropertyValue(property);
        } else {
            return element.style[property];
        }
    }

    /**
     * Cross-browser normalizations for attaching and detaching event handlers
     */
    var on = (function () {
        if (window.addEventListener) {
            return function (el, ev, fn) {
                el.addEventListener(ev, fn, false);
            };
        } else if (window.attachEvent) {
            return function (el, ev, fn) {
                el.attachEvent('on' + ev, fn);
            };
        } else {
            return function (el, ev, fn) {
                el['on' + ev] =  fn;
            };
        }
    }());

    var off = function (el, ev, fn) {
        if (el.removeEventListener) {
            el.removeEventListener(ev, fn, false);
        } else if (el.detachEvent) {
            el.detachEvent('on'+ ev,fn);
        } else {
            el['on' + ev] = false;
        }
    };

    /**
     * Cross-browser normalization for event objects. Makes relatedTarget, target, etc.
     * work in all browsers, without polluting the global Event object
     *
     * @param event Event
     * @return Event
     */
    function e(event) {
        event               = event || window.event;
        event.target        = event.target || event.srcElement;
        event.relatedTarget = event.relatedTarget || (event.type == 'mouseover' ? event.fromElement : event.toElement);
        event.target        = event.target || event.srcElement;

        event.stop = function () {
            event.preventDefault ? event.preventDefault() : event.returnValue = false;
            if (event.stopPropagation) {
                event.stopPropagation();
            }
            if (event.cancelBubble != null) {
                event.cancelBubble = true;
            }
        };

        if (event.target.nodeType === 3) {
            event.target = event.target.parentNode; //Safari bug
        }

        return event;
    }

    /**
     * Simple object cloning function
     * @param obj Object
     * @return Object
     */
    function clone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        var new_obj = obj.constructor();
        for (var key in obj) {
            new_obj[key] = clone(obj[key]);
        }

        return new_obj;
    }

    /**
     * The Cropper constructor
     * See the provided documentation for an explanation of all possible options
     *
     * @param image Node
     * @param opts Object
     */
    var C = function (image, opts) {
        this.options = clone(options);

        opts = opts || {};
        for (var i in opts) {
            this.options[i] = opts[i];
        }

        this.image   = image;

        var rect     = this.image.getBoundingClientRect();
        this.width   = Math.round(rect.right - rect.left); // sometimes getBoundingClientRect() returns float values
        this.height  = Math.round(rect.bottom - rect.top);

        this.coordinates = {x: 0, y: 0, width: 0, height: 0};
        this.moving      = this.resizing = this.direction = false;
        this.handles     = {};
        this.overlays    = {};

        this.wrapImage();
        this.attachEventListeners();
    };

    /**
     * Wraps the image in a div that will also hold the crop area selection and resizing handlers
     */
    C.prototype.wrapImage = function () {
        var container = document.createElement('div');
            container.className = this.options.container_class;

        var parent    = this.image.parentNode;
        var sibling   = this.image.nextSibling;

        container.appendChild(this.image);

        this.image.style.padding = this.image.style.margin = this.image.style.border = 0;

        if (sibling) {
            parent.insertBefore(container, sibling);
        } else {
            parent.appendChild(container);
        }

        /**
         * Disable image dragging
         * Older versions of Internet Explorer will drag the entire image instead of
         * triggering the mousedown / mousemove events properly
         */
        this.image.ondragstart = function () { return false; }

        var position = getStyle(container, 'position');
            if (position == 'static') {
                container.style.position = 'relative';
            }

            container.style.width  = this.width + 'px';
            container.style.height = this.height + 'px';

        this.container = container;
    };

    C.prototype.createCropArea = function (coordinates) {
        var div = document.createElement('div');
            div.className = this.options.container_class + '-area';
            div.style.position   = 'absolute';
            div.style.cursor     = 'move';

            /**
             * IE clicks through transparent divs, so we have to set a 1x1px
             * transparent gif as the background for the selection area
             */
            div.style.background = 'url(data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7)';

        this.createHandles(div);
        this.createOverlays(div);

        this.container.appendChild(div);

        this.crop_area = div;

        if (typeof coordinates != 'undefined') {
            this.coordinates = coordinates;
            this.crop();
        }
    };

    /**
     * Creates resizing handles and attaches event listeners on them
     * Each handle is named according to its position and the cardinal points for easy referencing:
     * top-left == NW, top-middle = N, top-right = NE, etc
     */
    C.prototype.createHandles = function (crop_area) {
        var self  = this;
        var delta = '-3px';

        var handles = {
            'nw': {left: delta,  top: delta},
            'n' : {left: '50%',  top: delta,    marginLeft: delta},
            'ne': {right: delta, top: delta},
            'e' : {right: delta, top: '50%',    marginTop: delta},
            'se': {right: delta, bottom: delta, zIndex: 10},
            's' : {left: '50%',  bottom: delta, marginLeft: delta},
            'sw': {left: delta,  bottom: delta},
            'w' : {left: delta,  top: '50%',    marginTop: delta}
        };

        for (var position in handles) {
            var styles = handles[position];

            var handle = document.createElement('div');
                handle.className = this.options.container_class + '-area-handle';

            for (var property in styles) {
                handle.style[property] = styles[property];
            }
            handle.style.position = 'absolute';
            handle.style.cursor   = position + '-resize';
            handle.setAttribute('position', position);

            crop_area.appendChild(handle);

            on(handle, 'mousedown', function (event) {
                self.resizing  = true;
                self.direction =  event.target.getAttribute('position');
            });

            this.handles[position] = handle;
        }
    };

    /**
     * In order to create the illusion of a transparent mask, four overlays have to be created,
     * to cover the top, left, right and bottom parts of the crop wrapper
     */
    C.prototype.createOverlays = function () {

        var overlays = {
            'top':    {left: 0, top: 0, right: 0, width: '100%'},
            'left':   {left: 0},
            'right':  {right: 0},
            'bottom': {left: 0, bottom: 0, right: 0, width: '100%'}
        };

        var position;
        for (position in overlays) {
            var styles = overlays[position];

            var overlay = document.createElement('div');
                overlay.className = this.options.container_class + '-overlay';
                overlay.style.position = 'absolute';

            for (var property in styles) {
                overlay.style[property] = styles[property];
            }

            this.container.appendChild(overlay);

            this.overlays[position] = overlay;
        }
    };

    C.prototype.attachEventListeners = function () {
        on(this.container, 'mousedown', this.mouseDown.bind(this));

        on(document, 'mouseup',   this.mouseUp.bind(this));
        on(document, 'mousemove', this.mouseMove.bind(this));
    };

    /**
     * Detaches all event listeners and removes the container DOM node
     */
    C.prototype.destroy = function () {
        off(this.container, 'mousedown', this.mouseDown.bind(this));

        off(document, 'mouseup',   this.mouseUp.bind(this));
        off(document, 'mousemove', this.mouseMove.bind(this));

        this.container.parentNode.replaceChild(this.image, this.container);
    };

    /**
     * MouseDown handler
     * When mousedown is triggered, store the pointer position.
     * Everything will be updated relative to this position when mousemove is next triggered
     */
    C.prototype.mouseDown = function (event) {
        //  event.stop();

        var target      =  event.target;
        var coordinates = this.getCursorPosition(event);

        if (!this.crop_area) {
            this.createCropArea();
        }

        // clone all the coordinates when dragging starts
        this.dragStartCrop = clone(this.coordinates);

        // these are the actual mouse pointer coordinates for this event
        this.dragStart = coordinates;

        // if the mousedown event was triggered on the crop area itself, it means the user is initiating a movement instead of a resize
        if (target == this.crop_area) {
            this.moving = true;
            return;
        }

        // the mousedown event, when triggered on the resize handles, is handled separately (see the handle creation function)
        if (target.className == this.options.container_class + '-area-handle') {
            return;
        }

        var width  = this.options.width  ? this.options.width :  (this.options.min_width ? this.options.min_width : 0);
        var height = this.options.height ? this.options.height : (this.options.min_height ? this.options.min_height : 0);

        this.coordinates.x      = coordinates.x;
        this.coordinates.y      = coordinates.y;
        this.coordinates.width  = width;
        this.coordinates.height = height;

        this.dragStartCrop = clone(this.coordinates);

        this.confine();
        this.crop();

        if (width && height) {
            return;
        }

        this.resizing  = true;
        this.direction = 'se';
    };

    /**
     * Applies the crop coordinates visually, on the crop area div,
     * and also call the update() function, if specified
     */
    C.prototype.crop = function () {
        if (this.moving) {
            this.confine();
        }

        this.crop_area.style.left   = this.coordinates.x + 'px';
        this.crop_area.style.top    = this.coordinates.y + 'px';
        this.crop_area.style.width  = this.coordinates.width + 'px';
        this.crop_area.style.height = this.coordinates.height + 'px';

        this.overlays.top.style.height    = this.overlays.left.style.top = this.overlays.right.style.top = this.coordinates.y + 'px';
        this.overlays.left.style.height   = this.overlays.right.style.height = this.coordinates.height + 'px';
        this.overlays.left.style.width    = this.coordinates.x + 'px';

        this.overlays.right.style.width   = this.width - this.coordinates.x - this.coordinates.width + 'px';
        this.overlays.bottom.style.height = this.height - this.coordinates.y - this.coordinates.height + 'px';

        if (typeof this.options.update == 'function') {
            this.options.update.call(this, this.coordinates);
        }
    };

    /**
     * Confine the crop area to the container bounds while moving
     */
    C.prototype.confine = function () {
        if (this.coordinates.x + this.coordinates.width > this.width) {
            this.coordinates.x = this.width - this.coordinates.width;
        }
        if (this.coordinates.x < 0) {
            this.coordinates.x = 0;
        }
        if (this.coordinates.y + this.coordinates.height > this.height) {
            this.coordinates.y = this.height - this.coordinates.height;
        }
        if (this.coordinates.y < 0) {
            this.coordinates.y = 0;
        }
    };

    C.prototype.mouseUp = function (event) {
        this.resizing = this.moving = this.direction = false;
    };

    C.prototype.mouseMove = function (event) {
        if (this.resizing) {
            return this.resize(event);
        }
        if (this.moving) {
            return this.move(event);
        }
    };

    /**
     * This function handles the actual resizing on mousemove
     * It also restricts the width and height to the minimum and maximum provided, if any
     */
    C.prototype.resize = function (event) {
        var pos    = this.getCursorPosition(event);
        var x      = this.dragStartCrop.x;
        var y      = this.dragStartCrop.y;
        var width  = this.dragStartCrop.width;
        var height = this.dragStartCrop.height;

        pos.x = Math.max(0, pos.x);
        pos.y = Math.max(0, pos.y);

        var delta_x = pos.x - this.dragStart.x;
        var delta_y = pos.y - this.dragStart.y;

        /**
         * Resize the width
         * This is where having the handles named by the cardinal points comes in handy
         */
        function resize_width (ratio) {
            if (this.direction.match(/w/)) {
                x = pos.x;
                width = width - delta_x;

                if (pos.x > this.dragStartCrop.x + this.dragStartCrop.width) {
                    this.direction = this.direction.replace('w', 'e');
                    x = this.dragStartCrop.x + this.dragStartCrop.width;

                    this.dragStart.x = this.dragStartCrop.x = x;

                    this.dragStartCrop.width = width = 0;
                }
            } else if (this.direction.match(/e/)) {
                width = Math.min(width + delta_x, this.width - x);

                if (pos.x < this.dragStartCrop.x) {
                    this.direction = this.direction.replace('e', 'w');
                    this.dragStart.x = x;

                    this.dragStartCrop.width = width = 0;
                }
            }

            /**
             * Let's make sure the auto-resized height doesn't overflow
             * the container
             */
            if (ratio) {
                var previous = clone(this.coordinates);

                /**
                 * I am using a while loop here rather than a simple if
                 * check because, if you move the mouse really quickly, the delta
                 * will have a large enough value so that the previous step (that we
                 * need to revert to in order to not overflow the container) will
                 * be smaller than the actual maximum possible value to ensure the
                 * bottom of the crop area hugs the bottom of the container as tightly
                 * as possible
                 */
                var new_height = width / ratio;
                while (this.coordinates.y + new_height > this.height) {
                    width--;
                    x = previous.x;
                    new_height = width / ratio;
                }
            }
        }

        function resize_height (ratio) {
            var based_on_width = ratio && (this.direction.match(/e/) || this.direction.match(/w/));
            if (based_on_width) {
                height = Math.round(width / ratio);
            }

            if (this.direction.match(/n/)) {
                if (based_on_width) {
                    y = this.dragStartCrop.y + this.dragStartCrop.height - height;
                    y = Math.max(y, 0);
                } else {
                    y = pos.y;
                    height = height - delta_y;
                }

                if (pos.y > this.dragStartCrop.y + this.dragStartCrop.height) {
                    this.direction = this.direction.replace('n', 's');

                    y = this.dragStart.y + this.dragStartCrop.height;

                    this.dragStart.y = this.dragStartCrop.y = y;
                    this.dragStartCrop.height = height = 0;
                }
            } else if (this.direction.match(/s/)) {
                if (!based_on_width) {
                    height = Math.min(height + delta_y, this.height - y);
                }

                if (pos.y < this.dragStartCrop.y) {
                    this.direction = this.direction.replace('s', 'n');

                    this.dragStart.y = y;
                    this.dragStartCrop.height = height = 0;
                }
            }

            if (!based_on_width && ratio) {
                var previous = clone(this.coordinates);

                /**
                 * Take a look at resize_width above to find out why a while
                 * is used instead of an if check
                 */
                width = Math.round(height * ratio);
                while (this.coordinates.x + width > this.width) {
                    height--;
                    y = previous.y;
                    width = Math.round(height * ratio);
                }
            }
        }

        if (this.options.ratio.width > 0 && this.options.ratio.height > 0) {
            var ratio = this.options.ratio.width / this.options.ratio.height;

            resize_width.call(this, ratio);
            resize_height.call(this, ratio);
        } else {
            resize_width.call(this);
            resize_height.call(this);
        }

        if (this.options.min_width) {
            width = Math.max(width, this.options.min_width);
        }
        if (this.options.min_height) {
            height = Math.max(height, this.options.min_height);
        }
        if (this.options.max_width) {
            width = Math.min(width,  this.options.max_width);
        }
        if (this.options.max_height) {
            height = Math.min(height, this.options.max_height);
        }

        this.coordinates.x      = x;
        this.coordinates.y      = y;
        this.coordinates.width  = width;
        this.coordinates.height = height;

        this.crop();
    };

    /**
     * Simple crop area position update, directly proportional with the amount of
     * mouse movement since the mousedown event was triggered
     *
     * @param event Event
     */
    C.prototype.move = function (event) {
        var pos = this.getCursorPosition(event);

        var delta_x = pos.x - this.dragStart.x;
        var delta_y = pos.y - this.dragStart.y;

        this.coordinates.x = this.dragStartCrop.x + delta_x;
        this.coordinates.y = this.dragStartCrop.y + delta_y;

        this.crop();
    };

    /**
     * Calculates the mouse pointer position, relative to the crop container's position on the page
     *
     * @param event Event
     * @return Object
     */
    C.prototype.getCursorPosition = function (event) {
        var rect = this.container.getBoundingClientRect();

        event =  event ;

        return {
            x: Math.round(event.clientX - rect.left),
            y: Math.round(event.clientY - rect.top)
        };
    };

    return C;
})();

module.exports = Cropper;
