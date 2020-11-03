
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function set_custom_element_data(node, prop, value) {
        if (prop in node) {
            node[prop] = value;
        }
        else {
            attr(node, prop, value);
        }
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.29.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const { Color, GLRenderer, Scene } = window.zeaEngine;

    const getRamdomUser = async () => {
      const res = await window.superagent.get('https://randomuser.me/api');

      const randomUser = res.body.results[0];

      const userId = randomUser.login.uuid;

      const userData = {
        color: Color.random().toHex(),
        family_name: randomUser.name.first,
        given_name: randomUser.name.last,
        id: userId,
        picture: `https://avatars.dicebear.com/api/human/${userId}.svg?mood[]=happy`,
      };

      return userData
    };

    const getAppData = (canvas) => {
      const renderer = new GLRenderer(canvas);
      const scene = new Scene();

      // scene.setupGrid(10, 10)
      renderer.setScene(scene);

      const appData = {
        scene,
        renderer,
      };

      return appData
    };

    const { Xfo, EulerAngles } = window.zeaEngine;
    const { CADAsset } = window.zeaCad;

    const loadAsset = () => {
      const asset = new CADAsset();
      const xfo = new Xfo();
      xfo.sc.set(2);
      xfo.ori.setFromEulerAngles(new EulerAngles(0.0, Math.PI * -0.5, 0, 'ZXY'));

      asset.getParameter('GlobalXfo').setValue(xfo);
      asset.getParameter('FilePath').setValue('servo_mestre-visu.zcad');

      return asset
    };

    /* src/App.svelte generated by Svelte v3.29.0 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let zea_layout1;
    	let div2;
    	let img;
    	let img_src_value;
    	let t0;
    	let div0;
    	let zea_menu;
    	let zea_menu_item2;
    	let t1;
    	let zea_menu_subitems;
    	let zea_menu_item0;
    	let t2;
    	let t3;
    	let zea_menu_item1;
    	let t4;
    	let t5;
    	let div1;
    	let zea_user_chip_set;
    	let t6;
    	let zea_user_chip;
    	let t7;
    	let zea_layout0;
    	let zea_scroll_pane;
    	let zea_tree_view;
    	let t8;
    	let div3;
    	let canvas_1;

    	const block = {
    		c: function create() {
    			zea_layout1 = element("zea-layout");
    			div2 = element("div");
    			img = element("img");
    			t0 = space();
    			div0 = element("div");
    			zea_menu = element("zea-menu");
    			zea_menu_item2 = element("zea-menu-item");
    			t1 = text("Tools\n          ");
    			zea_menu_subitems = element("zea-menu-subitems");
    			zea_menu_item0 = element("zea-menu-item");
    			t2 = text("Camera Manipulator");
    			t3 = space();
    			zea_menu_item1 = element("zea-menu-item");
    			t4 = text("Measurement Tool");
    			t5 = space();
    			div1 = element("div");
    			zea_user_chip_set = element("zea-user-chip-set");
    			t6 = space();
    			zea_user_chip = element("zea-user-chip");
    			t7 = space();
    			zea_layout0 = element("zea-layout");
    			zea_scroll_pane = element("zea-scroll-pane");
    			zea_tree_view = element("zea-tree-view");
    			t8 = space();
    			div3 = element("div");
    			canvas_1 = element("canvas");
    			attr_dev(img, "alt", "ZEA logo");
    			attr_dev(img, "class", "App-logo");
    			if (img.src !== (img_src_value = "/logo-zea.svg")) attr_dev(img, "src", img_src_value);
    			add_location(img, file, 150, 4, 4503);
    			set_custom_element_data(zea_menu_item0, "class", "MenuItem");
    			set_custom_element_data(zea_menu_item0, "hotkey", "c");
    			set_custom_element_data(zea_menu_item0, "id", "camera-manipulator");
    			set_custom_element_data(zea_menu_item0, "callback", /*useCameraManipulator*/ ctx[4]);
    			add_location(zea_menu_item0, file, 156, 12, 4726);
    			set_custom_element_data(zea_menu_item1, "class", "MenuItem");
    			set_custom_element_data(zea_menu_item1, "hotkey", "m");
    			set_custom_element_data(zea_menu_item1, "id", "measurement-tool");
    			set_custom_element_data(zea_menu_item1, "callback", /*useMeasurementTool*/ ctx[3]);
    			add_location(zea_menu_item1, file, 157, 12, 4872);
    			add_location(zea_menu_subitems, file, 155, 10, 4694);
    			add_location(zea_menu_item2, file, 153, 8, 4652);
    			set_custom_element_data(zea_menu, "type", "dropdown");
    			set_custom_element_data(zea_menu, "show-anchor", "true");
    			add_location(zea_menu, file, 152, 6, 4598);
    			attr_dev(div0, "class", "MenuHolder");
    			add_location(div0, file, 151, 4, 4567);
    			set_custom_element_data(zea_user_chip_set, "id", "zea-user-chip-set");
    			add_location(zea_user_chip_set, file, 163, 6, 5127);
    			attr_dev(div1, "class", "UserChipSetHolder");
    			add_location(div1, file, 162, 4, 5089);
    			set_custom_element_data(zea_user_chip, "id", "zea-user-chip");
    			add_location(zea_user_chip, file, 166, 4, 5212);
    			attr_dev(div2, "slot", "a");
    			attr_dev(div2, "class", "App-header");
    			add_location(div2, file, 149, 2, 4465);
    			set_custom_element_data(zea_tree_view, "id", "zea-tree-view");
    			add_location(zea_tree_view, file, 173, 6, 5465);
    			set_custom_element_data(zea_scroll_pane, "slot", "a");
    			add_location(zea_scroll_pane, file, 172, 4, 5432);
    			attr_dev(canvas_1, "id", "renderer");
    			add_location(canvas_1, file, 179, 6, 5636);
    			attr_dev(div3, "slot", "b");
    			attr_dev(div3, "id", "scene-host");
    			add_location(div3, file, 178, 4, 5599);
    			set_custom_element_data(zea_layout0, "slot", "b");
    			set_custom_element_data(zea_layout0, "cell-a-size", "200");
    			set_custom_element_data(zea_layout0, "cell-b-size", "100%");
    			set_custom_element_data(zea_layout0, "cell-c-size", "0");
    			set_custom_element_data(zea_layout0, "resize-cell-c", "false");
    			add_location(zea_layout0, file, 170, 2, 5304);
    			set_custom_element_data(zea_layout1, "orientation", "vertical");
    			set_custom_element_data(zea_layout1, "cell-a-size", "50");
    			set_custom_element_data(zea_layout1, "resize-cell-a", "false");
    			set_custom_element_data(zea_layout1, "cell-b-size", "100%");
    			set_custom_element_data(zea_layout1, "cell-c-size", "0");
    			set_custom_element_data(zea_layout1, "resize-cell-c", "false");
    			add_location(zea_layout1, file, 147, 0, 4307);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, zea_layout1, anchor);
    			append_dev(zea_layout1, div2);
    			append_dev(div2, img);
    			append_dev(div2, t0);
    			append_dev(div2, div0);
    			append_dev(div0, zea_menu);
    			append_dev(zea_menu, zea_menu_item2);
    			append_dev(zea_menu_item2, t1);
    			append_dev(zea_menu_item2, zea_menu_subitems);
    			append_dev(zea_menu_subitems, zea_menu_item0);
    			append_dev(zea_menu_item0, t2);
    			append_dev(zea_menu_subitems, t3);
    			append_dev(zea_menu_subitems, zea_menu_item1);
    			append_dev(zea_menu_item1, t4);
    			append_dev(div2, t5);
    			append_dev(div2, div1);
    			append_dev(div1, zea_user_chip_set);
    			/*zea_user_chip_set_binding*/ ctx[5](zea_user_chip_set);
    			append_dev(div2, t6);
    			append_dev(div2, zea_user_chip);
    			/*zea_user_chip_binding*/ ctx[6](zea_user_chip);
    			append_dev(zea_layout1, t7);
    			append_dev(zea_layout1, zea_layout0);
    			append_dev(zea_layout0, zea_scroll_pane);
    			append_dev(zea_scroll_pane, zea_tree_view);
    			append_dev(zea_layout0, t8);
    			append_dev(zea_layout0, div3);
    			append_dev(div3, canvas_1);
    			/*canvas_1_binding*/ ctx[7](canvas_1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(zea_layout1);
    			/*zea_user_chip_set_binding*/ ctx[5](null);
    			/*zea_user_chip_binding*/ ctx[6](null);
    			/*canvas_1_binding*/ ctx[7](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const { Xfo, Vec3, CuttingPlane, Color } = window.zeaEngine;
    	const { MeasurementTool, CreateFreehandLineTool, LinearMovementHandle } = window.zeaUx;
    	const { Session, SessionSync } = window.zeaCollab;
    	let canvas;
    	let cuttingPlane;
    	let scene;
    	let renderer;
    	let userChip;
    	let userChipSet;
    	let measurementTool;
    	let freeHandLineTool;
    	let cameraManipulator;
    	let asset;
    	let linearHandle;

    	const useMeasurementTool = () => {
    		if (renderer.getViewport().getManipulator() === measurementTool) {
    			renderer.getViewport().setManipulator(cameraManipulator);
    			$$invalidate(0, canvas.style.cursor = "auto", canvas);
    			return;
    		}

    		renderer.getViewport().setManipulator(measurementTool);
    		$$invalidate(0, canvas.style.cursor = "cell", canvas);
    	};

    	const useCameraManipulator = () => {
    		renderer.getViewport().setManipulator(cameraManipulator);
    		freeHandLineTool.deactivateTool();
    		$$invalidate(0, canvas.style.cursor = "auto", canvas);
    	};

    	const useFreeHandLineTool = () => {
    		if (renderer.getViewport().getManipulator() === freeHandLineTool) {
    			freeHandLineTool.deactivateTool();
    			renderer.getViewport().setManipulator(cameraManipulator);
    			$$invalidate(0, canvas.style.cursor = "auto", canvas);
    			return;
    		}

    		freeHandLineTool.activateTool();
    		renderer.getViewport().setManipulator(freeHandLineTool);
    		$$invalidate(0, canvas.style.cursor = "cell", canvas);
    	};

    	const addCuttingPlane = () => {
    		if (!linearHandle) {
    			// Setting up the CuttingPlane
    			cuttingPlane = new CuttingPlane("CuttingPlane");

    			const cuttingPlaneXfo = new Xfo();
    			cuttingPlaneXfo.tr.set(0, 0, 0);
    			cuttingPlaneXfo.ori.setFromAxisAndAngle(new Vec3(0, 1, 0), 1.55);
    			cuttingPlane.getParameter("CutAwayEnabled").setValue(true);
    			linearHandle = new LinearMovementHandle("linear1", 0.05, 0.002, new Color("#FF0000"));
    			linearHandle.getParameter("LocalXfo").setValue(cuttingPlaneXfo);
    			linearHandle.addChild(cuttingPlane, false);
    			scene.getRoot().addChild(linearHandle);
    			cuttingPlane.addItem(asset);
    		} else {
    			scene.getRoot().removeChildByHandle(linearHandle);
    		}
    	};

    	onMount(async () => {
    		const appData = getAppData(canvas);
    		scene = appData.scene;
    		renderer = appData.renderer;
    		const userData = await getRamdomUser();
    		const socketUrl = "https://websocket-staging.zea.live";
    		const session = new Session(userData, socketUrl);
    		session.joinRoom("zea-template-svelte");
    		const sessionSync = new SessionSync(session, appData, userData, {});
    		$$invalidate(2, userChipSet.session = session, userChipSet);
    		$$invalidate(1, userChip.userData = userData, userChip);
    		asset = loadAsset();
    		scene.getRoot().addChild(asset);

    		// Initializing the treeview
    		const sceneTreeView = document.getElementById("zea-tree-view");

    		sceneTreeView.appData = appData;
    		sceneTreeView.rootItem = asset;
    		measurementTool = new MeasurementTool({ scene });
    		measurementTool.activateTool();
    		freeHandLineTool = new CreateFreehandLineTool(appData);
    		cameraManipulator = renderer.getViewport().getManipulator();
    		renderer.getViewport().getCamera().setPositionAndTarget(new Vec3(2.5, 0, 0), new Vec3(0, 0, 0));
    		const toolbar = document.createElement("zea-toolbar");

    		toolbar.tools = {
    			cameraManipulator: {
    				tag: "zea-toolbar-tool",
    				data: {
    					iconName: "camera-outline",
    					toolName: "Camera Manipulator",
    					callback: () => useCameraManipulator()
    				}
    			},
    			measurementTool: {
    				tag: "zea-toolbar-tool",
    				data: {
    					iconName: "resize-outline",
    					toolName: "Measurement Tool",
    					callback: () => useMeasurementTool()
    				}
    			},
    			freeHandLineTool: {
    				tag: "zea-toolbar-tool",
    				data: {
    					iconName: "draw-freehand",
    					iconType: "zea",
    					toolName: "Free Hand Line Tool",
    					callback: () => useFreeHandLineTool()
    				}
    			},
    			cuttingPlaneTool: {
    				tag: "zea-toolbar-tool",
    				data: {
    					iconName: "cut-outline",
    					toolName: "Add Cutting Plane",
    					callback: () => addCuttingPlane()
    				}
    			}
    		};

    		const sceneHost = document.getElementById("scene-host");
    		sceneHost.prepend(toolbar);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function zea_user_chip_set_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			userChipSet = $$value;
    			$$invalidate(2, userChipSet);
    		});
    	}

    	function zea_user_chip_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			userChip = $$value;
    			$$invalidate(1, userChip);
    		});
    	}

    	function canvas_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			canvas = $$value;
    			$$invalidate(0, canvas);
    		});
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		getRamdomUser,
    		getAppData,
    		Xfo,
    		Vec3,
    		CuttingPlane,
    		Color,
    		MeasurementTool,
    		CreateFreehandLineTool,
    		LinearMovementHandle,
    		loadAsset,
    		Session,
    		SessionSync,
    		canvas,
    		cuttingPlane,
    		scene,
    		renderer,
    		userChip,
    		userChipSet,
    		measurementTool,
    		freeHandLineTool,
    		cameraManipulator,
    		asset,
    		linearHandle,
    		useMeasurementTool,
    		useCameraManipulator,
    		useFreeHandLineTool,
    		addCuttingPlane
    	});

    	$$self.$inject_state = $$props => {
    		if ("canvas" in $$props) $$invalidate(0, canvas = $$props.canvas);
    		if ("cuttingPlane" in $$props) cuttingPlane = $$props.cuttingPlane;
    		if ("scene" in $$props) scene = $$props.scene;
    		if ("renderer" in $$props) renderer = $$props.renderer;
    		if ("userChip" in $$props) $$invalidate(1, userChip = $$props.userChip);
    		if ("userChipSet" in $$props) $$invalidate(2, userChipSet = $$props.userChipSet);
    		if ("measurementTool" in $$props) measurementTool = $$props.measurementTool;
    		if ("freeHandLineTool" in $$props) freeHandLineTool = $$props.freeHandLineTool;
    		if ("cameraManipulator" in $$props) cameraManipulator = $$props.cameraManipulator;
    		if ("asset" in $$props) asset = $$props.asset;
    		if ("linearHandle" in $$props) linearHandle = $$props.linearHandle;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		canvas,
    		userChip,
    		userChipSet,
    		useMeasurementTool,
    		useCameraManipulator,
    		zea_user_chip_set_binding,
    		zea_user_chip_binding,
    		canvas_1_binding
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
      target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
