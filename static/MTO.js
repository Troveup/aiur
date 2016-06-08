var MTO =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "/assets/";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	
	//var Box2D = require("box2d");
	var WrappedCanvas = __webpack_require__(1);
	var MTOItem = __webpack_require__(2);
	var CharmDrawer = __webpack_require__(7);
	var Gateway = __webpack_require__(8);
	var Overlay = __webpack_require__(9);

	var hardCodedGateway = __webpack_require__(10);

	var DEG_TO_RAD = Math.PI / 180;

	var item;
	var dt, currTime, lastTime = Date.now();
	function loop() {
	    requestAnimationFrame(loop);

	    currTime = Date.now();
	    dt = currTime - lastTime;
	    lastTime = currTime;

	    if (item.draggingCharm) {
	        item.syncDragged();
	    }

	    item.stepPhysics(dt);
	    item.render();
	}

	var gate = new Gateway(); // TODO: figure out cors issue to resume testing
	var overlay;

	function main(opts) {
	    item = new MTOItem('canvas');

	    overlay = new Overlay(opts.overlayContainer);
	    overlay.buildHTML();

	    var chainPromise = null;
	    var promiseList = opts.referenceList.map(function(cloudRef) {
	        var loadPromise = gate.load(cloudRef);
	        if (cloudRef.refType == 'chain' && !chainPromise) {
	            chainPromise = loadPromise;
	        }
	        return loadPromise;
	    });
	    console.log("promiseList");
	    console.log(promiseList);

	    // TODO: use promises to wait until loading is done before setting initial chain
	    if (chainPromise) {
	        chainPromise.then(function(){
	            console.warn("figure out which chain has just been loaded, set it to base chain");
	            //item.setBaseChain(gate.get('chain', 'double'));
	        });
	    }

	    Promise.all(promiseList).then(function() {
	        if (opts.drawerContainer) {
	            buildDrawer(opts.drawerContainer, gate);
	        }
	    });

	    canvas.addEventListener('mousedown', function(evt) {
	        var hit = item.charmClickQuery(evt);
	        if (hit) {
	            overlay.displayInstance(item.selectedCharm);
	        }
	    });
	    canvas.addEventListener('mouseup', item.handleMouseup.bind(item));
	    canvas.addEventListener('mousemove', item.handleMousemove.bind(item), false);

	    loop();
	}

	function writeDebugInfo(root, secondsDelay) {
	    var debugNode = document.createElement('div');
	    debugNode.className = 'debugNode';

	    setTimeout(function() {
	        var data = item.debugCachedAnchors();
	        debugNode.innerHTML = data;

	        root.appendChild(debugNode);
	    }, secondsDelay*1000);
	}

	function deleteSelectedCharm() {
	    item.deleteSelectedCharm();
	}

	function buildDrawer(root, gate) {
	    var drawer = new CharmDrawer(root);
	    //drawer.defineCategory({
	        //title: 'Chains',
	        //type: 'chain'
	    //});

	    //var chainHash = hardCodedGateway['chain'];
	    //Object.keys(chainHash).map(function(chainKey) {
	        //drawer.addTypeEntry('chain', chainHash[chainKey]);
	    //});

	    //drawer.registerTypeHandler('chain', function(type, key) {
	        //item.setBaseChain(hardCodedGateway[type][key]);
	    //});

	    drawer.defineCategory({
	        title: 'Charms',
	        type: 'charm'
	    });

	    gate.forTypeEach('charm', function(charmPromise) {
	        charmPromise.then(function(charmDef){
	            drawer.addTypeEntry('charm', charmDef);
	        });
	    });

	    //var charmHash = hardCodedGateway['charm'];
	    //Object.keys(charmHash).map(function(charmKey) {
	        //drawer.addTypeEntry('charm', charmHash[charmKey]);
	    //});

	    drawer.registerTypeHandler('charm', function(type, key) {
	        gate.get(type, key).then(function(charmDef){
	            overlay.displayDefinition(charmDef);
	        });
	    });

	    overlay.registerDefHandler(function(overlayCharmDef) {
	        item.addCharm(overlayCharmDef);
	    });
	    overlay.registerInstanceHandler(function(charm) {
	        //item.addCharm(overlayCharmDef);
	        item.deleteSelectedCharm();
	    });
	}

	module.exports = {
	    main,
	    writeDebugInfo,
	    deleteSelectedCharm
	};



/***/ },
/* 1 */
/***/ function(module, exports) {

	
	var charmColors = {
	    normal: '#F26868',
	    selected: 'red',
	    hanging: 'yellow'
	};

	var anchorColors = {
	    normal: 'black',
	    locked: 'green',
	    overlap: 'yellow'
	};

	function WrappedCanvas(canvasID = 'canvas') {
	    var cnv = document.getElementById(canvasID);
	    if (!cnv) {
	        cnv = document.createElement('canvas');
	        cnv.id = 'canvas';
	        document.body.appendChild(cnv);
	    }

	    this.canvas = cnv;
	    this.context = cnv.getContext('2d');
	    
	    this.boundingRectangle = this.canvas.getBoundingClientRect();
	}

	WrappedCanvas.prototype.clean = function() {
	    var x = -this.origin.x;
	    var y = -this.origin.y;
	    var width = this.canvas.width;
	    var height = this.canvas.height;

	    this.context.clearRect( x, y, width, height );
	}

	WrappedCanvas.prototype.setup = function(opts) {
	    var dx = this.canvas.width / 2;
	    var dy = this.canvas.height / 2;
	    this.scaleFactor = opts.pixelsToMeter || 1;
	    this.context.scale(1, -1);
	    this.context.translate(dx, dy - this.canvas.height);
	    this.context.scale(this.scaleFactor, this.scaleFactor);
	 
	    this.origin = { x: dx, y: dx };
	};

	WrappedCanvas.prototype.getTransformedCoords = function(clientX, clientY) {
	    return {
	        x: (clientX - this.origin.x - this.boundingRectangle.left) / this.scaleFactor,
	        y: (this.boundingRectangle.bottom - clientY - this.origin.y) / this.scaleFactor
	    };
	}

	WrappedCanvas.prototype.drawLine = function(x1, y1, x2, y2) {
	    this.context.beginPath();
	    this.context.moveTo(x1, y1);
	    this.context.lineTo(x2, y2);
	    this.context.stroke();
	}

	WrappedCanvas.prototype.drawGrid = function(xDelta, yDelta, stepSize) {
	    this.context.save();
	    this.context.lineWidth = 1 / this.scaleFactor;
	    for (var x = 0; x < yDelta; x += stepSize) {
	        this.drawLine( x, 0, x, yDelta );
	    }
	    for (var y = 0; y < yDelta; y += stepSize) {
	        this.drawLine( 0, y, xDelta, y );
	    }
	    this.context.restore();
	}

	WrappedCanvas.prototype.drawCircle = function(x, y, radius, style) {
	    this.context.save();
	    
	    this.context.fillStyle = style;
	    this.context.beginPath();
	    this.context.arc(x, y, radius, 0, 2 * Math.PI, true);
	    this.context.fill();
	    this.context.restore();
	}

	WrappedCanvas.prototype.drawImage = function(x, y, angleInRadians, width, height, img) {
	    this.context.save();
	    this.context.translate(x, y);
	    this.context.rotate(angleInRadians);
	    this.context.scale(1, -1);

	    var hx = width / 2;
	    var hy = height / 2;
	    this.context.drawImage(img, -hx, -hy, width, height);
	    this.context.restore();
	}

	WrappedCanvas.prototype.strokeRectangle = function(x, y, angleInRadians, width, height, style) {
	    this.context.save();
	    this.context.lineWidth = 1 / this.scaleFactor;
	    this.context.fillStyle = style;
	    this.context.translate(x, y);
	    this.context.rotate(angleInRadians);

	    var hx = width / 2;
	    var hy = height / 2;

	    this.drawLine( -hx, -hy, -hx,  hy);
	    this.drawLine(  hx, -hy,  hx,  hy);
	    this.drawLine( -hx, -hy,  hx, -hy);
	    this.drawLine( -hx,  hy,  hx,  hy);

	    this.context.restore();
	}

	WrappedCanvas.prototype.drawRectangle = function(x, y, angleInRadians, width, height, style) {
	    this.context.save();
	    this.context.fillStyle = style;
	    this.context.translate(x, y);
	    this.context.rotate(angleInRadians);

	    var hx = width / 2;
	    var hy = height / 2;
	    this.context.fillRect( -hx, -hy, width, height);

	    this.context.restore();
	}

	module.exports = WrappedCanvas;



/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	
	var WrappedCanvas = __webpack_require__(1);
	var Charm = __webpack_require__(3);
	var Box2DHelper = __webpack_require__(6);

	var groundX = 0;
	var groundY = -29.5;
	var oblongWidth = 60;
	var oblongHeight = 1;

	function MTOItem(canvasID, baseSpec, charmSpecList) {
	    this.baseChain = null;
	    this.charmList = [];

	    this.selectedCharm = null;
	    this.draggingCharm = false;
	    this.groundBody = null;

	    this.physics = new Box2DHelper();
	    this.physics.init();

	    this.wrappedCanvas = new WrappedCanvas(canvasID);
	    this.wrappedCanvas.setup({
	        pixelsToMeter: 10
	    });

	    this.groundBody = this.physics.createBox(groundX, groundY, 0, oblongWidth, oblongHeight, 'static');
	    if (baseSpec) {
	        this.setBaseChain(baseSpec);
	    }
	    if (charmSpecList) {
	        charmSpecList.map(function(spec) {
	            this.addCharm(spec);
	        }.bind(this));
	    }
	}

	var CHAIN_X = 0;
	var CHAIN_Y = 25;

	MTOItem.prototype.setBaseChain = function(newCharmSpec) {
	    if (this.baseChain) {
	        this.baseChain.eachAnchor(function(anchor) {
	            var attached = anchor.attachedAnchor;
	            if (attached) {
	                attached.attachedAnchor = null;
	                attached.ownerCharm.parentAnchor = null;
	                anchor.attachedAnchor = null;
	                attached.isOverlapped = false;
	                anchor.isOverlapped = false;
	                this.physics.world.DestroyJoint(anchor.joint);
	            }
	            this.baseChain = null;
	        }.bind(this));
	    }

	    var b = new Charm(newCharmSpec);
	    b.pos.set( CHAIN_X, CHAIN_Y );
	    b.body = this.physics.createBox( b.pos.x, b.pos.y, b.angleInRadians, 1, 1, 'static');
	    b.loadAssets().then(function() {
	        this.baseChain = b;
	    }.bind(this));
	};

	MTOItem.prototype.addCharm = function(newCharmSpec) {
	    var newCharm = new Charm(newCharmSpec);
	    newCharm.body = this.physics.createBox( 0, 0, newCharm.angleInRadians, newCharm.width, newCharm.height, 'dynamic');
	    newCharm.body.SetLinearDamping(0.3);
	    newCharm.body.SetAngularDamping(0.2);
	    newCharm.loadAssets().then(function(){
	        this.charmList.push(newCharm);
	    }.bind(this));
	};

	MTOItem.prototype.deleteSelectedCharm = function() {
	    if (this.selectedCharm) {
	        this.physics.world.DestroyBody( this.selectedCharm.body );

	        var deleteIndex = -1;
	        this.charmList.map(function(charm, i) {
	            if (charm == this.selectedCharm) {
	                deleteIndex = i;
	            }
	        }.bind(this));

	        if (deleteIndex > -1) {
	            var deletion = this.charmList[deleteIndex];
	            if (false) { // this code causes issues
	                deletion.eachAnchor(function(anchor) {
	                    var attached = anchor.attachedAnchor;
	                    if (attached) {
	                        debugger;
	                        attached.attachedAnchor = null;
	                        if (anchor.ownerCharm == attached.ownerCharm.parentAnchor) {
	                            attached.ownerCharm.parentAnchor = null;
	                        }
	                        anchor.attachedAnchor = null;
	                        attached.isOverlapped = false;
	                        anchor.isOverlapped = false;
	                        this.physics.world.DestroyJoint(anchor.joint);
	                    }
	                }.bind(this));
	            }
	            this.charmList.splice(deleteIndex, 1);
	        }
	        this.selectedCharm = null;
	        this.draggingCharm = false;
	    }
	};

	MTOItem.prototype.iterateCharms = function(callback) {
	    return this.charmList.map(callback);
	};

	var anchorDrawRadius = 0.5;
	var anchorSnapRadius = 3;
	MTOItem.prototype.render = function() {
	    this.wrappedCanvas.clean();

	    if (this.baseChain) {
	        var b = this.baseChain;
	        this.wrappedCanvas.drawImage(b.pos.x, b.pos.y, b.angleInRadians, b.width, b.height, b.img);
	    }

	    this.iterateCharms(function(charm) {
	        this.wrappedCanvas.drawImage(charm.pos.x, charm.pos.y, charm.angleInRadians, charm.width, charm.height, charm.img);
	        if (charm == this.selectedCharm) {
	            this.wrappedCanvas.strokeRectangle(charm.pos.x, charm.pos.y, charm.angleInRadians, charm.width, charm.height, 'black');
	        }
	        charm.eachAnchor(function(anchor, isParent) {
	            var o = anchor.getTransformedOffset();
	            var style = anchor.isOverlapped ? 'green' : 'black';
	            this.wrappedCanvas.drawCircle(o.x, o.y, anchorDrawRadius, style);
	        }.bind(this));
	    }.bind(this));

	    if (this.baseChain) {
	        this.baseChain.eachAnchor(function(anchor, isParent) {
	            var o = anchor.getTransformedOffset();
	            var style = anchor.isOverlapped ? 'green' : 'black';
	            this.wrappedCanvas.drawCircle(o.x, o.y, anchorDrawRadius, style);
	        }.bind(this));
	    }

	    this.drawGround();
	};

	MTOItem.prototype.drawGround = function() {
	    var g = this.physics.summarize(this.groundBody);
	    this.wrappedCanvas.drawRectangle(g.x, g.y, g.angle, oblongWidth, oblongHeight, 'black');
	};

	MTOItem.prototype.stepPhysics = function(dt) {
	    this.physics.tick(dt);

	    // sync physics body data with containg Charm object
	    this.iterateCharms(function(charm) {
	        var physData = this.physics.summarize(charm.body);
	        charm.pos.x = physData.x;
	        charm.pos.y = physData.y;
	        charm.angleInRadians = physData.angle;
	    }.bind(this));
	};

	MTOItem.prototype.traverseHanging = function(seedCharm, fn) {
	    var checkQueue = [ seedCharm ];
	    for (var i = 0; i < checkQueue.length; i++) {
	        fn(checkQueue[i]);
	        checkQueue[i].eachAnchor(function(anchor, isParent) {
	            if (!isParent && anchor.attachedAnchor) {
	                checkQueue.push(anchor.attachedAnchor.ownerCharm);
	            }
	        });
	    }
	};

	MTOItem.prototype.traverseConnected = function(seedCharm, fn) {
	    var visited = Object.create(null);
	    var checkQueue = [ seedCharm ];
	    visited[seedCharm.key] = true;

	    for (var i = 0; i < checkQueue.length; i++) {
	        fn(checkQueue[i]);
	        checkQueue[i].eachAnchor(function(anchor, isParent) {
	            if (anchor.attachedAnchor) {
	                var expansionCharm = anchor.attachedAnchor.ownerCharm;
	                if (!visited[expansionCharm.key]) {
	                    visited[expansionCharm.key] = true;
	                    checkQueue.push(expansionCharm);
	                }
	            }
	        });
	    }
	};

	MTOItem.prototype.debugCachedAnchors = function() {
	    if (this.openRootAnchors) {
	        var rootStrings = this.openRootAnchors.map(function(anchor) {
	            return anchor.toString();
	        });
	    }

	    if (this.openFocusAnchors) {
	        var focusStrings = this.openFocusAnchors.map(function(anchor) {
	            return anchor.toString();
	        });
	    }

	    return ["Root anchors: "].concat(rootStrings, ["Focus anchors:"], focusStrings).join("<br>");
	};

	MTOItem.prototype.clearAnchorCache = function() {
	    this.openRootAnchors = [];
	    this.openFocusAnchors = [];
	}

	// use base chain as starting point for valid anchors to attach to, will be used to
	// check against any open anchors on the focused charm for connections
	MTOItem.prototype.cacheLiveAnchors = function() {
	    var that = this;
	    this.openRootAnchors = [];
	    this.openFocusAnchors = [];

	    this.traverseConnected(this.baseChain, function(charm) {
	        charm.eachAnchor(function(anchor) {
	            if (!anchor.attachedAnchor) {
	                that.openRootAnchors.push(anchor);
	            }
	        });
	    });

	    this.selectedCharm.eachAnchor(function(anchor) {
	        if (!anchor.attachedAnchor) {
	            that.openFocusAnchors.push(anchor);
	        }
	    });
	};

	MTOItem.prototype.getClosestCharmClicked = function(mousePos) {
	    var closestDist = Infinity;
	    var closestCharm = {
	        hit: false
	    };

	    this.charmList.map(function(charm) {
	        var result = charm.hitCheck(mousePos);
	        if (result.hit) {
	            if (!closestCharm.hit || result.dist < closestDist) {
	                closestCharm.hit = true;
	                closestCharm.charm = charm;
	                closestCharm.offset = result.offset;
	                closestDist = result.dist;
	            }
	        }
	    });
	    return closestCharm;
	};

	MTOItem.prototype.detachParentCharm = function(selectedCharm) {
	    var pa = selectedCharm.parentAnchor;
	    if (pa) {
	        var parentCharm = pa.attachedAnchor.ownerCharm;
	        pa.attachedAnchor.attachedAnchor = null;
	        pa.attachedAnchor = null;
	        this.physics.world.DestroyJoint(pa.joint);
	        selectedCharm.parentAnchor = null;
	        return parentCharm;
	    }

	    return null;
	};

	MTOItem.prototype.findAnchorCollisions = function(overlapRadius = 5) {
	    var overlappingAnchorPairs = [];

	    for (var i = 0; i < this.openFocusAnchors.length; i++) {
	        for (var j = 0; j < this.openRootAnchors.length; j++) {
	            var selectionAnchor = this.openFocusAnchors[i];
	            var hangingAnchor = this.openRootAnchors[j];

	            var result = selectionAnchor.checkCollision(hangingAnchor, overlapRadius);
	            if (result.hit) {
	                result.selectionAnchor = selectionAnchor;
	                result.hangingAnchor = hangingAnchor;
	                overlappingAnchorPairs.push( result );
	            }
	        }
	    }
	    return overlappingAnchorPairs;
	};

	MTOItem.prototype.attachAnchors = function(anchorA, anchorB) {
	    var bodyA = anchorA.ownerCharm.body;
	    var bodyB = anchorB.ownerCharm.body;

	    var newJoint = this.physics.createJoint(bodyA, anchorA.offset, bodyB, anchorB.offset);
	    anchorA.joint = newJoint;
	    anchorB.joint = newJoint;
	    anchorA.attachedAnchor = anchorB;
	    anchorB.attachedAnchor = anchorA;
	};

	// TODO: more semantic identifer, index level should define "mousedown" behavior
	MTOItem.prototype.charmClickQuery = function(evt) {
	    var mousePos = this.wrappedCanvas.getTransformedCoords(evt.clientX, evt.clientY);
	    var clickResult = this.getClosestCharmClicked(mousePos);
	    if (clickResult.hit) {
	        this.selectedCharm = clickResult.charm;
	        this.draggingCharm = true;
	        this.dragOffset = clickResult.offset;

	        this.detachParentCharm(clickResult.charm);
	        this.cacheLiveAnchors();
	        this.selectedCharm.halt();
	        return true;
	    } else {
	        this.selectedCharm = null;
	        //console.warn("TODO: could check gravity here?");
	        return false;
	    }
	};

	MTOItem.prototype.handleMouseup = function(evt) {
	    if (this.draggingCharm) {
	        this.selectedCharm.resume();
	        this.dragOffset = null;

	        var collisions = this.findAnchorCollisions(2*anchorSnapRadius);
	        if (collisions.length > 0) {
	            var closest = null;
	            var closestDist = Infinity;
	            collisions.map(function(hitReport) {
	                if (!closest || hitReport.separation < closestDist) {
	                    closest = hitReport;
	                    closestDist = hitReport.separation;
	                }
	            });

	            var selectionCharm = closest.selectionAnchor.ownerCharm;
	            this.traverseHanging(selectionCharm, function(hangingCharm) {
	                var physData = this.physics.summarize(hangingCharm.body);
	                hangingCharm.translate(physData, closest.dx, closest.dy);
	            }.bind(this));

	            this.attachAnchors(closest.selectionAnchor, closest.hangingAnchor);
	            selectionCharm.parentAnchor = closest.selectionAnchor;
	        }
	        this.clearAnchorCache();
	    }
	    this.draggingCharm = false;
	};

	MTOItem.prototype.syncDragged = function() {
	    var newX = this.mousePos.x - this.dragOffset.x;
	    var newY = this.mousePos.y - this.dragOffset.y;
	    this.selectedCharm.moveTo( newX, newY );

	    this.selectedCharm.halt();
	};

	MTOItem.prototype.handleMousemove = function(evt) {
	    this.mousePos = this.wrappedCanvas.getTransformedCoords(evt.clientX, evt.clientY);

	    // committing short circuited while broken
	    if (this.draggingCharm) {


	        // clear all anchor overlap statuses
	        this.baseChain.eachAnchor(function(anchor) {
	            anchor.isOverlapped = false;
	        });
	        this.iterateCharms(function(charm) {
	            charm.eachAnchor(function(anchor, isParent) {
	                anchor.isOverlapped = false;
	            });
	        });

	        // set the affected anchor statuses to overlapped
	        var collisions = this.findAnchorCollisions(2*anchorSnapRadius);
	        var closest = null;
	        var closestDist = Infinity;
	        collisions.map(function(hitReport) {
	            if (!closest || hitReport.separation < closestDist) {
	                closest = hitReport;
	                closestDist = hitReport.separation;
	            }
	        });
	        if (closest) {
	            closest.selectionAnchor.isOverlapped = true;
	            closest.hangingAnchor.isOverlapped = true;
	        }
	    }
	};

	module.exports = MTOItem;



/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	
	var Anchor = __webpack_require__(4);
	var Box2D = __webpack_require__(5);

	function createGUID() {
	    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
	        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
	        return v.toString(16);
	    });
	}

	function Charm(spec) {
	    this.key = createGUID(); // think of better method...
	    this.imgURL = spec.imgURL;
	    this.pos = new THREE.Vector2();
	    this.width = spec.width;
	    this.height = spec.height;
	    this.angleInRadians = spec.rotation || 0;

	    // invariant: `parentAnchor` should be cleared if not connecting to a parent charm anchor
	    this.parentAnchor = null;
	    this.anchors = [];
	    for (var i = 0, sentinel = spec.anchors.length - 1; i < sentinel; i += 2) {
	        var a = spec.anchors;
	        this.anchors.push( new Anchor( a[i], a[i+1], this) );
	    } 

	    this.body = null; // set by containing item
	    this.status = 'normal';
	}

	Charm.prototype.toString = function() {
	    return "Charm at [ "+ this.pos.x +", "+ this.pos.y +" ]";
	}

	Charm.prototype.halt = function() {
	    this.body.SetGravityScale(0);
	    this.body.SetLinearVelocity( Box2D.b2Vec2( 0, 0) );
	    this.body.SetAngularVelocity( 0 );
	};

	Charm.prototype.resume = function() {
	    //this.selectedCharm.status = 'normal';
	    this.body.SetGravityScale(1);
	};

	Charm.prototype.translate = function(oldPhys, dx, dy) {
	    var b2Pos = new Box2D.b2Vec2( oldPhys.x + dx, oldPhys.y + dy);
	    this.body.SetTransform( b2Pos, oldPhys.angle );
	};

	Charm.prototype.moveTo = function(x, y) {
	    var b2Pos = new Box2D.b2Vec2( x, y );
	    this.body.SetTransform( b2Pos, this.body.GetAngle() );
	};

	Charm.prototype.loadAssets = function() {
	    var that = this;

	    return new Promise(function(resolve, reject){
	        var img = new Image()
	        img.onload = function(){
	            resolve(that)
	        }
	        img.onerror = function(){
	            reject(that)
	        }

	        img.src = that.imgURL
	        that.img = img;
	    });
	};

	var upFromScreen = new THREE.Vector3(0, 0, 1);
	Charm.prototype.hitCheck = function(checkPos) {
	    var hx = this.width / 2;
	    var hy = this.height / 2;
	    var minX = this.pos.x - hx;
	    var maxX = this.pos.x + hx;
	    var minY = this.pos.y - hy;
	    var maxY = this.pos.y + hy;

	    // to transform rectangular region with known rotation and width x height to centered
	    // translate by negative position, rotate by negative angle, translate back by position
	    var checkCenterOffset = new THREE.Vector3(checkPos.x - this.pos.x, checkPos.y - this.pos.y, 0); // apparently 2D vecs don't need to rotate
	    checkCenterOffset.applyAxisAngle( upFromScreen, -this.angleInRadians );
	    checkCenterOffset.add( this.pos );

	    var miss = { hit: false };
	    if (checkCenterOffset.x < minX) return miss;
	    if (checkCenterOffset.x > maxX) return miss;
	    if (checkCenterOffset.y < minY) return miss;
	    if (checkCenterOffset.y > maxY) return miss;

	    // TODO: use only Box2D vectors
	    var center = this.pos.clone();
	    var displacement = new THREE.Vector2(checkPos.x, checkPos.y).sub(center);

	    return {
	        hit: true,
	        dist: displacement.length(),
	        offset: displacement
	    };
	};

	// pass callback of form
	// fn(anchor, isParent)
	Charm.prototype.eachAnchor = function(fn) {
	    this.anchors.map(function(anchor, i) {
	        fn(anchor, anchor == this.parentAnchor);
	    }.bind(this));
	};

	// TODO: es6 changes
	Charm.prototype.compareAnchors = function(comparison) {
	    var lenA = this.anchors.length;
	    var lenB = comparison.anchors.length;
	    var pointA = new THREE.Vector2();
	    var pointB = new THREE.Vector2();
	    var cutoffRadius = 10;
	    for (var i = 0; i < lenA; i++) {
	        for (var j = i; j < lenB; j++) {
	            pointA.copy(this.anchors[i].position).add(this.position);
	            pointB.copy(comparison.anchors[j].position).add(comparison.position);
	            var dist = pointA.distanceTo(pointB);
	            if (dist < cutoffRadius) {
	                return {
	                    hit: true,
	                    dist: dist,
	                    indexA: i,
	                    indexB: j
	                }
	            }
	        }
	    }

	    return {
	        hit: false
	    };
	};

	// these functions have to do with non-physical means of specifying change in location
	Charm.prototype.transitionTo = function(x, y, duration) {
	    this.transitionActive = true;

	    this.transitionStart = Date.now();
	    this.duration = duration;

	    this.startPos = this.pos.clone();
	    this.endPos = new THREE.Vector2(x, y);
	}

	Charm.prototype.syncTransition = function() {
	    if (!this.transitionActive) {
	        return;
	    }

	    var progress = (Date.now() - this.transitionStart) / this.duration;
	    if (progress >= 1) {
	        this.transitionActive = false;
	        return;
	    }

	    this.pos.lerpVectors(this.startPos, this.endPos, progress);
	}
	// end of non-physical location manipulation 

	module.exports = Charm;


/***/ },
/* 4 */
/***/ function(module, exports) {

	
	function Anchor(x, y, owner) {
	    this.ownerCharm = owner;
	    this.offset = new THREE.Vector2(x, y); // the offset of this anchor from the charm's origin at rotation 0
	    this.joint = null;
	    this.attachedAnchor = null;
	}

	Anchor.prototype.toString = function() {
	    var off = this.getTransformedOffset();
	    return "Anchor offset: [ "+ off.x +", "+ off.y +" ]";
	};

	Anchor.prototype.getTransformedOffset = function() {
	    var o = {};
	    var radians = this.ownerCharm.angleInRadians;
	    o.x = this.offset.x * Math.cos(radians) - this.offset.y * Math.sin(radians);
	    o.y = this.offset.x * Math.sin(radians) + this.offset.y * Math.cos(radians);
	    o.x += this.ownerCharm.pos.x;
	    o.y += this.ownerCharm.pos.y;
	    return o;
	};

	// calculate distance between anchors in global space, if lower than a cutoff
	Anchor.prototype.checkCollision = function(otherAnchor, overlapDiameter = 10) {
	    var offsetA = this.getTransformedOffset();
	    var offsetB = otherAnchor.getTransformedOffset();

	    var dx = offsetB.x - offsetA.x;
	    var dy = offsetB.y - offsetA.y;
	    var dist = Math.sqrt(dx * dx + dy * dy);

	    return {
	        hit: dist < overlapDiameter,
	        separation: dist,
	        dx: dx,
	        dy: dy
	    }
	};

	module.exports = Anchor;


/***/ },
/* 5 */
/***/ function(module, exports) {

	module.exports = Box2D;

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	
	var Box2D = __webpack_require__(5);

	// realizing this functionality should be a mixin

	function Box2DHelper() {
	    this.world = null;
	    this.bodies = [];
	};


	Box2DHelper.prototype.init = function() {
	    var earthGravity = new Box2D.b2Vec2( 0.0, -9.8 );
	    this.world = new Box2D.b2World( earthGravity );

	    this.bodyDef = new Box2D.b2BodyDef();

	    this.fixtureDef = new Box2D.b2FixtureDef();
	    this.fixtureDef.set_density( 1.0 );
	    this.fixtureDef.set_friction( 0.5 );
	};

	Box2DHelper.prototype.createBox = function(x, y, desiredAngle, width, height, type) {
	    if (type == 'static') {
	        this.bodyDef.set_type(Box2D.b2_staticBody);
	    } else if (type == 'kinematic') {
	        this.bodyDef.set_type(Box2D.b2_kinematicBody);
	    } else {
	        this.bodyDef.set_type(Box2D.b2_dynamicBody);
	    }
	    
	    var shape = new Box2D.b2PolygonShape();
	    shape.SetAsBox(width / 2, height / 2);
	    this.fixtureDef.set_shape( shape );

	    var newBody = this.world.CreateBody(this.bodyDef);
	    newBody.CreateFixture( this.fixtureDef );

	    newBody.SetTransform( new Box2D.b2Vec2( x, y ), desiredAngle );

	    this.bodies.push( newBody );

	    return newBody;
	};

	Box2DHelper.prototype.createJoint = function(bodyA, vectorLikeA, bodyB, vectorLikeB) {
	    var offsetA = new Box2D.b2Vec2(vectorLikeA.x, vectorLikeA.y);
	    var offsetB = new Box2D.b2Vec2(vectorLikeB.x, vectorLikeB.y);

	    var joint_def = new Box2D.b2RevoluteJointDef();
	    joint_def.set_bodyA( bodyA );
	    joint_def.set_localAnchorA( offsetA );
	    joint_def.set_bodyB( bodyB );
	    joint_def.set_localAnchorB( offsetB );

	    return Box2D.castObject( this.world.CreateJoint(joint_def), Box2D.b2RevoluteJoint );
	}


	Box2DHelper.prototype.summarize = function(body) {
	    var bpos = body.GetPosition();
	    return {
	        x: bpos.get_x(),
	        y: bpos.get_y(),
	        angle: body.GetAngle()
	    };
	};

	// FIXME: figure out way around extremely long delta
	// watch for the tab losing focus, if it does reset the `lastTime` upon returning to the tab
	//console.log("physics running at %s x real time delta", timeScale);
	var timeScale = 1;
	Box2DHelper.prototype.tick = function(dt) {
	    var realDeltaInSeconds = dt / 1000;
	    var desiredDelta = 1/60;
	    this.world.Step(realDeltaInSeconds*timeScale, 2, 2);
	    this.world.ClearForces(); // not certain if this is necessary...
	};

	module.exports = Box2DHelper;



/***/ },
/* 7 */
/***/ function(module, exports) {

	
	function CharmDrawer(rootElem) {
	    rootElem.className = "charmDrawerRoot";
	    rootElem.style.width = "200px";
	    rootElem.style.border = '1px solid black';
	    this.containers = {
	        root: rootElem
	    };
	    this.handlers = {};
	}

	// TODO: define max height and other parameters
	CharmDrawer.prototype.defineCategory = function(opts) {
	    var cat = document.createElement('div');
	    cat.setAttribute('data-type', opts.type);
	    cat.className = "drawerCategory group";
	    cat.innerHTML = `<div class="categoryHeader">${opts.title}</div>`;

	    this.containers.root.appendChild(cat);
	    this.containers[opts.type] = cat;
	};

	//console.warn("TODO: render anchors on drawer charms");
	CharmDrawer.prototype.addTypeEntry = function(categoryType, charmDef) {
	    var cat = this.containers[categoryType];

	    var cell = document.createElement('div');
	    //cell.setAttribute('data-type', categoryType);
	    cell.setAttribute('data-key', charmDef.key);
	    cell.className = "categoryCell";
	    cell.style.backgroundImage = `url(${charmDef.imgURL})`;

	    if (this.handlers[categoryType]) {
	        var fn = this.handlers[categoryType];
	        cell.addEventListener('click', function(evt) {
	            var key = evt.target.getAttribute('data-key');
	            fn.call(null, categoryType, key);
	        });
	    }

	    cat.appendChild(cell);
	};

	// for every cell of the given @categoryType apply the @fn with parametesr:
	// fn(type, key) // from gateway scheme, tbdocumented
	// don't really need the type parameter, seemed like it would be nice
	CharmDrawer.prototype.registerTypeHandler = function(categoryType, fn) {
	    this.handlers[categoryType] = fn;
	    var cat = this.containers[categoryType];
	    var cells = cat.querySelectorAll('.drawerCategory .categoryCell');
	    for (var i = 0; i < cells.length; i++) {
	        cells[i].addEventListener('click', function(evt) {
	            var key = evt.target.getAttribute('data-key');
	            fn.call(null, categoryType, key);
	        });
	    }
	};

	// TODO: add and remove trove pink border around selected elements
	CharmDrawer.prototype.highlightEntry = function(categoryType, key) { };
	CharmDrawer.prototype.clearHighlight = function(categoryType) { };


	module.exports = CharmDrawer;


/***/ },
/* 8 */
/***/ function(module, exports) {

	
	function Gateway() {
	    this.cache = Object.create(null);
	}

	// fetch item based on cloudRef, add to cache based on type and key and return promise with data
	Gateway.prototype.load = function(ref) {
	    var publicURL = `https://storage.googleapis.com/${ref.bucket}/gateway/${ref.refType}/${ref.key}/${ref.hash}.json`;

	    var categoryType = ref.refType;
	    var typeHash = this.cache[categoryType];
	    if (!typeHash) {
	        typeHash = this.cache[categoryType] = {};
	    }

	    return fetch(publicURL)
	        .then(function (response) {
	            typeHash[ref.key] = Promise.resolve(response.json());
	            return typeHash[ref.key];
	        });
	};

	Gateway.prototype.forTypeEach = function(type, fn) {
	    var typeHash = this.cache[type];
	    Object.keys(typeHash).map(function(hashKey) {
	        fn.call(null, typeHash[hashKey]);
	    });
	};

	Gateway.prototype.get = function(type, key) { // eventually version
	    return !!this.cache[type] ? this.cache[type][key] : null;
	};

	// directly set to cache, used internally and for debugging
	Gateway.prototype.set = function(type, key, entry) {
	    if (!this.cache[type]) {
	        this.cache[type] = {};
	    }
	    this.cache[type][key] = entry;
	};

	module.exports = Gateway;


/***/ },
/* 9 */
/***/ function(module, exports) {

	
	function Overlay(container) {
	    this.root = container;

	    this.storedDefinition = null;
	    this.storedInstance = null;
	}

	Overlay.prototype.buildHTML = function() {
	    this.root.innerHTML = ` <div class="categoryCell"></div> <button>Add Charm</button>`;
	    this.root.style.display = 'none';

	    var button = this.root.querySelector('button');
	    button.addEventListener('click', this.handleGenericButtonClick.bind(this));
	};

	Overlay.prototype.handleGenericButtonClick = function() {

	    if (this.storedDefinition) {
	        this.defHandler.call(null, this.storedDefinition);
	    }

	    if (this.storedInstance) {
	        this.instanceHandler.call(null, this.storedInstance);
	        this.hide();
	    }
	};

	Overlay.prototype.displayDefinition = function(charmDef) {
	    this.storedDefinition = charmDef;
	    this.storedInstance = null;

	    var imgDiv = this.root.querySelector('.categoryCell');
	    imgDiv.style.margin = '10px';
	    imgDiv.style.width = '80px';
	    imgDiv.style.height = '80px';
	    imgDiv.style.backgroundImage = `url(${charmDef.imgURL})`;

	    var button = this.root.querySelector('button');
	    button.innerHTML = 'Add Charm';

	    this.root.style.display = 'block';
	};

	// may need to modify this so definition is also passed, depends on what is
	// needed for rendering overlay details. if just image and charm ref needed
	// for deletion this is fine
	Overlay.prototype.displayInstance = function(charm) {
	    this.storedDefinition = null;
	    this.storedInstance = charm;

	    var imgDiv = this.root.querySelector('.categoryCell');
	    imgDiv.style.backgroundImage = `url(${charm.imgURL})`;

	    var button = this.root.querySelector('button');
	    button.innerHTML = 'Remove Charm';

	    this.root.style.display = 'block';
	};

	Overlay.prototype.registerDefHandler = function(fn) {
	    this.defHandler = fn;
	};
	Overlay.prototype.registerInstanceHandler = function(fn) {
	    this.instanceHandler = fn;
	};

	Overlay.prototype.hide = function() {
	    this.root.style.display = 'none';
	    this.storedDefinition = null;
	    this.storedInstance = null;
	};

	module.exports = Overlay;



/***/ },
/* 10 */
/***/ function(module, exports) {

	
	module.exports = {
	    chain: {
	        'single': {
	            type: 'chain',
	            key: 'single',
	            imgURL: "/demo-chain.png",
	            width: 60,
	            height: 80,
	            anchors: [ 0.75, -15.5 ]
	        },
	        'double': {
	            type: 'chain',
	            key: 'double',
	            imgURL: "/demo-chain.png",
	            width: 60,
	            height: 80,
	            anchors: [ -2, -15.5, 2, -15.5 ]
	        }
	    },
	    charm: {
	        'dev-simple-link': {
	            type: 'charm',
	            key: 'dev-simple-link',
	            imgURL: "/charm-link.png",
	            width: 1.866666666666667,
	            height: 5.833333333333333,
	            anchors: [ 0, 2.3, 0, -2.3 ]
	        },
	        'dev-directed-link': {
	            type: 'charm',
	            key: 'dev-directed-link',
	            imgURL: "/directed-charm-link.png",
	            width: 1.866666666666667,
	            height: 5.833333333333333,
	            anchors: [ 0, 2.3, 0, -2.3 ]
	        },
	        'splitter': {
	            type: 'charm',
	            key: 'splitter',
	            imgURL: "/charm-link.png",
	            width: 1.866666666666667,
	            height: 5.833333333333333,
	            anchors: [ -0.75, 0, 0.75, 2, 0.75, 0, 0.75, -2 ]
	        }
	    }
	};



/***/ }
/******/ ]);