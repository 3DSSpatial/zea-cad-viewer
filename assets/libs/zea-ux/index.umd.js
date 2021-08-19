(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@zeainc/zea-engine')) :
  typeof define === 'function' && define.amd ? define(['exports', '@zeainc/zea-engine'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.zeaUx = {}, global.zeaEngine));
}(this, (function (exports, zeaEngine) { 'use strict';

  /**
   * A Handle is an UI widget that lives in the scene, it translates a series of pointer events into a higher level interaction.
   *
   * **Parameters**
   * * **Color(`ColorParameter`):** Specifies the color of the handle.
   * * **HighlightColor(`ColorParameter`):** Specifies the highlight color of the handle.
   *
   * @extends TreeItem
   */
  class Handle extends zeaEngine.TreeItem {
    /**
     * Creates an instance of Handle.
     *
     * @param {string} name - The name value.
     */
    constructor(name) {
      super(name);

      this.captured = false;
      this.colorParam = this.addParameter(new zeaEngine.ColorParameter('Color', new zeaEngine.Color()));
      this.highlightColorParam = this.addParameter(new zeaEngine.ColorParameter('HighlightColor', new zeaEngine.Color(1, 1, 1)));
    }

    /**
     * Applies a special shinning shader to the handle to illustrate interaction with it.
     */
    highlight() {
      this.emit('highlight');
    }

    /**
     * Removes the shining shader from the handle.
     */
    unhighlight() {
      this.emit('unhighlight');
    }

    /**
     * Returns the manipulation plane of the handle, denoting a start and a direction.
     *
     * @return {Ray} The return value.
     */
    getManipulationPlane() {
      const xfo = this.getParameter('GlobalXfo').getValue();
      return new zeaEngine.Ray(xfo.tr, xfo.ori.getZaxis())
    }

    // ///////////////////////////////////
    // Mouse events

    /**
     * Event fired when a pointing device is initially moved within the space of the handle.
     *
     * @param {MouseEvent|TouchEvent|object} event - The event param.
     */
    onPointerEnter(event) {
      this.highlight();
    }

    /**
     * Event fired when a pointing device moves outside of the space of the handle.
     *
     * @param {MouseEvent|TouchEvent|object} event - The event param.
     */
    onPointerLeave(event) {
      this.unhighlight();
    }

    /**
     * Event fired when a pointing device button is pressed while the pointer is over the handle element.
     *
     * @param {MouseEvent|TouchEvent|object} event - The event param.
     */
    onPointerDown(event) {
      event.setCapture(this);
      event.stopPropagation();
      this.captured = true;

      if (event.changedTouches) {
        this.highlight();
      }

      if (event.viewport) this.handlePointerDown(event);
      else if (event.vrviewport) this.onVRControllerButtonDown(event);
    }

    /**
     * Event fired when a pointing device is moved while the cursor's hotspot is over the handle.
     *
     * @param {MouseEvent|TouchEvent|object} event - The event param.
     */
    onPointerMove(event) {
      if (this.captured) {
        event.stopPropagation();
        if (event.viewport) this.handlePointerMove(event);
        else if (event.vrviewport) this.onVRPoseChanged(event);
      }

      event.preventDefault();
    }

    /**
     * Event fired when a pointing device button is released while the pointer is over the handle.
     *
     * @param {MouseEvent|TouchEvent|object} event - The event param.
     */
    onPointerUp(event) {
      if (this.captured) {
        event.releaseCapture();
        event.stopPropagation();
        this.captured = false;
        if (event.changedTouches) {
          this.unhighlight();
        }
        if (event.viewport) this.handlePointerUp(event);
        else if (event.vrviewport) this.onVRControllerButtonUp(event);
      }
    }

    /**
     * Event fired when the user rotates the pointing device wheel over the handle.
     *
     * @param {MouseEvent} event - The event param.
     */
    onWheel(event) {}

    /**
     * Handles mouse down interaction with the handle.
     *
     * @param {MouseEvent} event - The event param.
     * @return {boolean} - The return value.
     */
    handlePointerDown(event) {
      this.gizmoRay = this.getManipulationPlane();
      const ray = event.pointerRay;
      const dist = ray.intersectRayPlane(this.gizmoRay);
      event.grabPos = ray.pointAtDist(dist);
      this.onDragStart(event);
      return true
    }

    /**
     * Handles mouse move interaction with the handle.
     *
     * @param {MouseEvent} event - The event param
     * @return { boolean } - The return value
     */
    handlePointerMove(event) {
      const ray = event.pointerRay;
      const dist = ray.intersectRayPlane(this.gizmoRay);
      event.holdPos = ray.pointAtDist(dist);
      this.onDrag(event);
      return true
    }

    /**
     * Handles mouse up interaction with the handle.
     *
     * @param {MouseEvent} event - The event param.
     * @return {boolean} - The return value.
     */
    handlePointerUp(event) {
      const ray = event.pointerRay;
      if (ray) {
        const dist = ray.intersectRayPlane(this.gizmoRay);
        event.releasePos = ray.pointAtDist(dist);
      }

      this.onDragEnd(event);
      return true
    }

    // ///////////////////////////////////
    // VRController events

    /**
     * Event fired when a VR controller button is pressed over the handle.
     *
     * @param {object} event - The event param.
     * @return {boolean} The return value.
     */
    onVRControllerButtonDown(event) {
      this.activeController = event.controller;
      const xfo = this.activeController.getTipXfo().clone();

      const gizmoRay = this.getManipulationPlane();
      const offset = xfo.tr.subtract(gizmoRay.start);
      const grabPos = xfo.tr.subtract(gizmoRay.dir.scale(offset.dot(gizmoRay.dir)));
      event.grabPos = grabPos;
      this.onDragStart(event);
      return true
    }

    /**
     * The onVRPoseChanged method.
     *
     * @param {object} event - The event param.
     * @return {boolean} - The return value.
     */
    onVRPoseChanged(event) {
      if (this.activeController) {
        const xfo = this.activeController.getTipXfo();
        const gizmoRay = this.getManipulationPlane();
        const offset = xfo.tr.subtract(gizmoRay.start);
        const holdPos = xfo.tr.subtract(gizmoRay.dir.scale(offset.dot(gizmoRay.dir)));
        event.holdPos = holdPos;
        this.onDrag(event);
        return true
      }
    }

    /**
     * Event fired when a VR controller button is released over the handle.
     *
     * @param {object} event - The event param.
     * @return {boolean} - The return value.
     */
    onVRControllerButtonUp(event) {
      if (this.activeController == event.controller) {
        const xfo = this.activeController.getTipXfo();
        this.onDragEnd(event, xfo.tr);
        this.activeController = undefined;
        return true
      }
    }

    // ///////////////////////////////////
    // Interaction events

    /**
     * Handles the initially drag of the handle.
     *
     * @param {MouseEvent|TouchEvent|object} event - The event param.
     */
    onDragStart(event) {
      console.warn('@Handle#onDragStart - Implement me!', event);
    }

    /**
     * Handles drag action of the handle.
     *
     * @param {MouseEvent|TouchEvent|object} event - The event param.
     */
    onDrag(event) {
      console.warn('@Handle#onDrag - Implement me!', event);
    }

    /**
     * Handles the end of dragging the handle.
     *
     * @param {MouseEvent|TouchEvent|object} event - The event param.
     */
    onDragEnd(event) {
      console.warn('@Handle#onDragEnd - Implement me!', event);
    }
  }

  /**
   * Class representing a base linear movement scene widget.
   *
   * @extends Handle
   */
  class BaseLinearMovementHandle extends Handle {
    /**
     * Create base linear movement scene widget.
     * @param {string} name - The name value.
     */
    constructor(name) {
      super(name);
    }

    // ///////////////////////////////////
    // Mouse events

    /**
     * Handles mouse down interaction with the handle.
     *
     * @param {MouseEvent|TouchEvent|object} event - The event param.
     * @return {boolean} - The return value.
     */
    handlePointerDown(event) {
      this.gizmoRay = this.getManipulationPlane();
      const ray = event.pointerRay;
      this.grabDist = ray.intersectRayVector(this.gizmoRay)[1];
      const grabPos = this.gizmoRay.pointAtDist(this.grabDist);
      event.grabDist = this.grabDist;
      event.grabPos = grabPos;
      this.onDragStart(event);
      return true
    }

    /**
     * Handles mouse move interaction with the handle.
     *
     * @param {MouseEvent|TouchEvent|object} event - The event param
     */
    handlePointerMove(event) {
      const ray = event.pointerRay;
      const dist = ray.intersectRayVector(this.gizmoRay)[1];
      const holdPos = this.gizmoRay.pointAtDist(dist);
      event.holdDist = dist;
      event.holdPos = holdPos;
      event.value = dist;
      event.delta = dist - this.grabDist;
      this.onDrag(event);
    }

    /**
     * Handles mouse up interaction with the handle.
     *
     * @param {MouseEvent|TouchEvent|object} event - The event param.
     * @return {boolean} - The return value.
     */
    handlePointerUp(event) {
      const ray = event.pointerRay;
      if (ray) {
        const dist = ray.intersectRayVector(this.gizmoRay)[1];
        const releasePos = this.gizmoRay.pointAtDist(dist);
        event.releasePos = releasePos;
      }

      this.onDragEnd(event);
      return true
    }

    // ///////////////////////////////////
    // VRController events

    /**
     * Event fired when a VR controller button is pressed over the handle.
     *
     * @param {object} event - The event param.
     * @return {boolean} The return value.
     */
    onVRControllerButtonDown(event) {
      this.gizmoRay = this.getManipulationPlane();

      this.activeController = event.controller;
      const xfo = this.activeController.getTipXfo();
      this.grabDist = xfo.tr.subtract(this.gizmoRay.start).dot(this.gizmoRay.dir);
      const grabPos = this.gizmoRay.start.add(this.gizmoRay.dir.scale(this.grabDist));
      event.grabPos = grabPos;
      this.onDragStart(event);
      return true
    }

    /**
     * The onVRPoseChanged method.
     *
     * @param {object} event - The event param.
     * @return {boolean} The return value.
     */
    onVRPoseChanged(event) {
      const xfo = this.activeController.getTipXfo();
      const dist = xfo.tr.subtract(this.gizmoRay.start).dot(this.gizmoRay.dir);
      const holdPos = this.gizmoRay.start.add(this.gizmoRay.dir.scale(dist));
      event.value = dist;
      event.holdPos = holdPos;
      event.delta = dist - this.grabDist;
      this.onDrag(event);
      return true
    }

    /**
     * Event fired when a VR controller button is released over the handle.
     *
     * @param {object} event - The event param.
     * @return {boolean} - The return value.
     */
    onVRControllerButtonUp(event) {
      if (this.activeController == event.controller) {
        // const xfo = this.activeController.getTipXfo()
        this.onDragEnd();
        this.activeController = undefined;
        return true
      }
    }
  }

  /**
   * `UndoRedoManager` is a mixture of the [Factory Design Pattern](https://en.wikipedia.org/wiki/Factory_method_pattern) and the actual changes stacks manager.
   * This is the heart of the Undo/Redo System, letting you navigate through the changes history you've saved.
   *
   * **Events**
   * * **changeAdded:** Triggered when a change is added.
   * * **changeUpdated:** Triggered when the last change added updates its state.
   * * **changeUndone:** Triggered when the `undo` method is called, after removing the last change from the stack.
   * * **changeRedone:** Triggered when the `redo` method is called, after restoring the last change removed from the undo stack.
   * */
  class UndoRedoManager extends zeaEngine.EventEmitter {
    /**
     * It doesn't have any parameters, but under the hood it uses [EventsEmitter]() to notify subscribers when something happens.
     * The implementation is really simple, just initialize it like any other class.
     */
    constructor() {
      super();
      this.__undoStack = [];
      this.__redoStack = [];
      this.__currChange = null;

      this.__currChangeUpdated = this.__currChangeUpdated.bind(this);
    }

    /**
     * As the name indicates, it empties undo/redo stacks permanently, losing all stored actions.
     * Right now, before flushing the stacks it calls the `destroy` method on all changes, ensure to at least declare it.
     */
    flush() {
      for (const change of this.__undoStack) change.destroy();
      this.__undoStack = [];
      for (const change of this.__redoStack) change.destroy();
      this.__redoStack = [];
      if (this.__currChange) {
        this.__currChange.off('updated', this.__currChangeUpdated);
        this.__currChange = null;
      }
    }

    /**
     * Receives an instance of a class that extends or has the same structure as `Change` class.
     * When this action happens, the last added change update notifications will get disconnected.
     * Which implies that any future updates to changes that are not the last one, would need a new call to the `addChange` method.
     * Also, resets the redo stack(Calls destroy method when doing it).
     *
     * @param {Change} change - The change param.
     */
    addChange(change) {
      // console.log("AddChange:", change.name)
      if (this.__currChange && this.__currChange.off) {
        this.__currChange.off('updated', this.__currChangeUpdated);
      }

      this.__undoStack.push(change);
      this.__currChange = change;
      if (this.__currChange.on) this.__currChange.on('updated', this.__currChangeUpdated);

      for (const change of this.__redoStack) change.destroy();
      this.__redoStack = [];

      this.emit('changeAdded', { change });
    }

    /**
     * Returns the last change added to the undo stack, but in case it is empty a `null` is returned.
     *
     * @return {Change|null} The return value.
     */
    getCurrentChange() {
      return this.__currChange
    }

    /**
     * @private
     * @param {object|any} updateData
     */
    __currChangeUpdated(updateData) {
      this.emit('changeUpdated', updateData);
    }

    /**
     * Rollback the latest action, passing it to the redo stack in case you wanna recover it later on.
     *
     * @param {boolean} pushOnRedoStack - The pushOnRedoStack param.
     */
    undo(pushOnRedoStack = true) {
      if (this.__undoStack.length > 0) {
        if (this.__currChange) {
          this.__currChange.off('updated', this.__currChangeUpdated);
          this.__currChange = null;
        }

        const change = this.__undoStack.pop();
        // console.log("undo:", change.name)
        change.undo();
        if (pushOnRedoStack) {
          this.__redoStack.push(change);
          this.emit('changeUndone');
        }
      }
    }

    /**
     * Method to cancel the current change added to the UndoRedoManager.
     * Reverts the change and discards it.
     */
    cancel() {
      if (this.__undoStack.length > 0) {
        if (this.__currChange) {
          this.__currChange.off('updated', this.__currChangeUpdated);
          this.__currChange = null;
        }

        const change = this.__undoStack.pop();
        change.undo();
      }
    }

    /**
     * Rollbacks the `undo` action by moving the change from the `redo` stack to the `undo` stack.
     * Emits the `changeRedone` event, if you want to subscribe to it.
     */
    redo() {
      if (this.__redoStack.length > 0) {
        const change = this.__redoStack.pop();
        // console.log("redo:", change.name)
        change.redo();
        this.__undoStack.push(change);
        this.emit('changeRedone');
      }
    }

    // //////////////////////////////////
    // User Synchronization

    /**
     * Basically returns a new instance of the derived `Change` class. This is why we need the `name` attribute.
     *
     * @param {string} className - The className param.
     * @return {Change} - The return value.
     */
    constructChange(className) {
      return zeaEngine.Registry.constructClass(className)
    }

    /**
     * Checks if a class of an instantiated object is registered in the UndoRedo Factory.
     *
     * @param {Change} inst - The instance of the Change class.
     * @return {boolean} - Returns 'true' if the class has been registered.
     */
    static isChangeClassRegistered(inst) {
      try {
        const name = zeaEngine.Registry.getBlueprintName(inst);
        return true
      } catch (e) {
        return false
      }
    }

    /**
     * Very simple method that returns the name of the instantiated class, checking first in the registry and returning if found,
     * if not then checks the `name` attribute declared in constructor.
     *
     * @param {Change} inst - The instance of the Change class.
     * @return {string} - The return value.
     */
    static getChangeClassName(inst) {
      return zeaEngine.Registry.getBlueprintName(inst)
    }

    /**
     * Registers the class in the UndoRedoManager Factory.
     * Why do we need to specify the name of the class?
     * Because when the code is transpiled, the defined class names change, so it won't be known as we declared it anymore.
     *
     * @param {string} name - The name param.
     * @param {Change} cls - The cls param.
     */
    static registerChange(name, cls) {
      zeaEngine.Registry.register(name, cls);
    }

    static getInstance() {
      if (!inst) {
        inst = new UndoRedoManager();
      }
      return inst
    }
  }

  let inst;

  /**
   * Kind of an abstract class, that represents the mandatory structure of a change classes that are used in the [`UndoRedoManager`]().
   *
   * @note If you don't extend this class, ensure to implement all methods specified in here.
   * @extends {EventEmitter}
   */
  class Change extends zeaEngine.EventEmitter {
    /**
     * Every class that extends from `Change` must contain a global `name` attribute.
     * It is used by the `UndoRedoManager` factory to re-construct the class of the specific implementation of the `Change` class.
     *
     * @param {string} name - The name value.
     */
    constructor(name) {
      super();
      this.name = name ? name : UndoRedoManager.getChangeClassName(this);
    }

    /**
     * Called by the `UndoRedoManager` in the `undo` method, and contains the code you wanna run when the undo action is triggered,
     * of course it depends on what you're doing.
     *
     * @note This method needs to be implemented, otherwise it will throw an Error.
     */
    undo() {
      throw new Error('Implement me')
    }

    /**
     * Called by the `UndoRedoManager` in the `redo` method, and is the same as the `undo` method, contains the specific code you wanna run.
     *
     * @note This method needs to be implemented, otherwise it will throw an Error.
     */
    redo() {
      throw new Error('Implement me')
    }

    /**
     * Use this method to update the state of your `Change` class.
     *
     * @note This method needs to be implemented, otherwise it will throw an Error.
     *
     * @param {object|string|any} updateData - The updateData param.
     */
    update(updateData) {
      throw new Error('Implement me')
    }

    /**
     * Serializes the `Change` instance as a JSON object, allowing persistence/replication
     *
     * @note This method needs to be implemented, otherwise it will return an empty object.
     *
     * @param {object} context - The appData param.
     * @return {object} The return value.
     */
    toJSON(context) {
      return {}
    }

    /**
     * The counterpart of the `toJSON` method, restoring `Change` instance's state with the specified JSON object.
     * Each `Change` class must implement the logic for reconstructing itself.
     * Very often used to restore from persisted/replicated JSON.
     *
     * @note This method needs to be implemented, otherwise it will do nothing.
     *
     * @param {object} j - The j param.
     * @param {object} context - The context param.
     */
    fromJSON(j, context) {}

    /**
     * Useful method to update the state of an existing identified `Change` through replication.
     *
     * @note By default it calls the `update` method in the `Change` class, but you can override this if you need to.
     *
     * @param {object} j - The j param.
     */
    updateFromJSON(j) {
      // Many change objects can load json directly
      // in the update method.
      this.update(j);
    }

    /**
     * Method destined to clean up things that would need to be cleaned manually.
     * It is executed when flushing the undo/redo stacks or adding a new change to the undo stack,
     * so it is require in any class that represents a change.
     *
     */
    destroy() {}
  }

  /**
   * Represents a `Change` class for storing `Parameter` values.
   *
   * **Events**
   * * **updated:** Triggered when the `ParameterValueChange` value is updated.
   *
   * @extends Change
   */
  class ParameterValueChange extends Change {
    /**
     * Creates an instance of ParameterValueChange.
     *
     * @param {Parameter} param - The param value.
     * @param {object|string|number|any} newValue - The newValue value.
     */
    constructor(param, newValue) {
      if (param) {
        super(param ? param.getName() + ' Changed' : 'ParameterValueChange');
        this.__prevValue = param.getValue();
        this.__param = param;
        if (newValue != undefined) {
          this.__nextValue = newValue;
          this.__param.setValue(this.__nextValue);
        }
      } else {
        super();
      }

      this.suppressPrimaryChange = false;
      this.secondaryChanges = [];
    }

    /**
     * Rollbacks the value of the parameter to the previous one, passing it to the redo stack in case you wanna recover it later on.
     */
    undo() {
      if (!this.__param) return

      if (!this.suppressPrimaryChange) this.__param.setValue(this.__prevValue);

      this.secondaryChanges.forEach((change) => change.undo());
    }

    /**
     * Rollbacks the `undo` action by moving the change from the `redo` stack to the `undo` stack
     * and updating the parameter with the new value.
     */
    redo() {
      if (!this.__param) return
      if (!this.suppressPrimaryChange) this.__param.setValue(this.__nextValue);

      this.secondaryChanges.forEach((change) => change.redo());
    }

    /**
     * Updates the state of the current parameter change value.
     *
     * @param {Parameter} updateData - The updateData param.
     */
    update(updateData) {
      if (!this.__param) return
      this.__nextValue = updateData.value;
      this.__param.setValue(this.__nextValue);
      this.emit('updated', updateData);
    }

    /**
     * Serializes `Parameter` instance value as a JSON object, allowing persistence/replication.
     *
     * @param {object} context - The context param.
     * @return {object} The return value.
     */
    toJSON(context) {
      const j = {
        name: this.name,
        paramPath: this.__param.getPath(),
      };

      if (this.__nextValue != undefined) {
        if (this.__nextValue.toJSON) {
          j.value = this.__nextValue.toJSON();
        } else {
          j.value = this.__nextValue;
        }
      }
      return j
    }

    /**
     * Restores `Parameter` instance's state with the specified JSON object.
     *
     * @param {object} j - The j param.
     * @param {object} context - The context param.
     */
    fromJSON(j, context) {
      const param = context.appData.scene.getRoot().resolvePath(j.paramPath, 1);
      if (!param || !(param instanceof zeaEngine.Parameter)) {
        console.warn('resolvePath is unable to resolve', j.paramPath);
        return
      }
      this.__param = param;
      this.__prevValue = this.__param.getValue();
      if (this.__prevValue.clone) this.__nextValue = this.__prevValue.clone();
      else this.__nextValue = this.__prevValue;

      this.name = j.name;
      if (j.value != undefined) this.updateFromJSON(j);
    }

    /**
     * Updates the state of an existing identified `Parameter` through replication.
     *
     * @param {object} j - The j param.
     */
    updateFromJSON(j) {
      if (!this.__param) return
      if (this.__nextValue.fromJSON) this.__nextValue.fromJSON(j.value);
      else this.__nextValue = j.value;
      this.__param.setValue(this.__nextValue);
    }
  }

  UndoRedoManager.registerChange('ParameterValueChange', ParameterValueChange);

  /**
   * Class representing Handle Shader.
   *
   * @extends {GLShader}
   */
  class HandleShader extends zeaEngine.GLShader {
    /**
     * Creates an instance of HandleShader.
     *
     * @param {*} gl - The gl value
     */
    constructor(gl) {
      super(gl);

      this.__shaderStages['VERTEX_SHADER'] = zeaEngine.shaderLibrary.parseShader(
        'HandleShader.vertexShader',
        `
precision highp float;

attribute vec3 positions;
#ifdef ENABLE_TEXTURES
attribute vec2 texCoords;
#endif

<%include file="GLSLUtils.glsl"/>
<%include file="stack-gl/transpose.glsl"/>
<%include file="drawItemId.glsl"/>
<%include file="drawItemTexture.glsl"/>
<%include file="modelMatrix.glsl"/>

uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;

#ifdef ENABLE_MULTI_DRAW
<%include file="materialparams.glsl"/>
#else
uniform int MaintainScreenSize;
uniform float Overlay;
#endif

/* VS Outputs */
varying float v_drawItemId;
varying vec4 v_geomItemData;
varying vec3 v_viewPos;
#ifdef ENABLE_TEXTURES
varying vec2 v_textureCoord;
#endif

void main(void) {
  int drawItemId = getDrawItemId();
  v_drawItemId = float(drawItemId);
  v_geomItemData  = getInstanceData(drawItemId);
  mat4 modelMatrix = getModelMatrix(drawItemId);
  mat4 modelViewMatrix = viewMatrix * modelMatrix;

  //////////////////////////////////////////////
  // Material

#ifdef ENABLE_MULTI_DRAW
  vec2 materialCoords = v_geomItemData.zw;
  vec4 materialValue1 = getMaterialValue(materialCoords, 1);
  int maintainScreenSize = int(materialValue1.x + 0.5);
  float overlay = materialValue1.y;
#else
  int maintainScreenSize = MaintainScreenSize;
  float overlay = Overlay;
#endif

  //////////////////////////////////////////////
  
  if (maintainScreenSize != 0) {
    float dist = modelViewMatrix[3][2];
    float sc = abs(dist); // Note: items in front of the camera will have a negative value here.
    mat4 scmat = mat4(
      sc, 0.0, 0.0, 0.0,
      0.0, sc, 0.0, 0.0,
      0.0, 0.0, sc, 0.0,
      0.0, 0.0, 0.0, 1.0
    );
    modelViewMatrix = modelViewMatrix * scmat;
  }

  vec4 viewPos = modelViewMatrix * vec4(positions, 1.0);
  gl_Position = projectionMatrix * viewPos;

  if(overlay > 0.0){
    gl_Position.z = mix(gl_Position.z, -gl_Position.w, overlay);
  }

  v_viewPos = viewPos.xyz;
  v_textureCoord = texCoords;
  v_textureCoord.y = 1.0 - v_textureCoord.y;// Flip y
}
`
      );

      this.__shaderStages['FRAGMENT_SHADER'] = zeaEngine.shaderLibrary.parseShader(
        'HandleShader.fragmentShader',
        `
precision highp float;

<%include file="GLSLUtils.glsl"/>
<%include file="math/constants.glsl"/>
<%include file="drawItemTexture.glsl"/>
<%include file="stack-gl/gamma.glsl"/>
<%include file="materialparams.glsl"/>


#if defined(DRAW_COLOR)

uniform color BaseColor;

#ifdef ENABLE_TEXTURES
uniform sampler2D BaseColorTex;
uniform int BaseColorTexType;
#endif

#elif defined(DRAW_GEOMDATA)

uniform int floatGeomBuffer;
uniform int passId;

<%include file="GLSLBits.glsl"/>

#elif defined(DRAW_HIGHLIGHT)

#ifdef ENABLE_FLOAT_TEXTURES
vec4 getHighlightColor(int id) {
  return fetchTexel(instancesTexture, instancesTextureSize, (id * pixelsPerItem) + 4);
}
#else // ENABLE_FLOAT_TEXTURES

uniform vec4 highlightColor;

vec4 getHighlightColor() {
    return highlightColor;
}

#endif // ENABLE_FLOAT_TEXTURES

#endif // DRAW_HIGHLIGHT

/* VS Outputs */
varying float v_drawItemId;
varying vec4 v_geomItemData;
varying vec3 v_viewPos;
#ifdef ENABLE_TEXTURES
varying vec2 v_textureCoord;
#endif


#ifdef ENABLE_ES3
  out vec4 fragColor;
#endif
void main(void) {
#ifndef ENABLE_ES3
  vec4 fragColor;
#endif

  int drawItemId = int(v_drawItemId + 0.5);

  //////////////////////////////////////////////
  // Color
#if defined(DRAW_COLOR)


#ifdef ENABLE_MULTI_DRAW

  vec2 materialCoords = v_geomItemData.zw;
  vec4 baseColor = toLinear(getMaterialValue(materialCoords, 0));

#else // ENABLE_MULTI_DRAW

#ifndef ENABLE_TEXTURES
  vec4 baseColor = toLinear(BaseColor);
#else
  vec4 baseColor = getColorParamValue(BaseColor, BaseColorTex, BaseColorTexType, v_textureCoord);
#endif // ENABLE_TEXTURES

#endif // ENABLE_MULTI_DRAW

  fragColor = baseColor;

#ifdef ENABLE_INLINE_GAMMACORRECTION
  fragColor.rgb = toGamma(fragColor.rgb);
#endif

  //////////////////////////////////////////////
  // GeomData
#elif defined(DRAW_GEOMDATA)

  float viewDist = length(v_viewPos);

  if(floatGeomBuffer != 0) {
    fragColor.r = float(passId); 
    fragColor.g = float(v_drawItemId);
    fragColor.b = 0.0;// TODO: store poly-id or something.
    fragColor.a = viewDist;
  } else {
    ///////////////////////////////////
    // UInt8 buffer
    fragColor.r = mod(v_drawItemId, 256.) / 256.;
    fragColor.g = (floor(v_drawItemId / 256.) + (float(passId) * 64.)) / 256.;

    // encode the dist as a 16 bit float
    vec2 float16bits = encode16BitFloatInto2xUInt8(viewDist);
    fragColor.b = float16bits.x;
    fragColor.a = float16bits.y;
  }

  //////////////////////////////////////////////
  // Highlight
#elif defined(DRAW_HIGHLIGHT)
  
  fragColor = getHighlightColor(drawItemId);

#endif // DRAW_HIGHLIGHT

#ifndef ENABLE_ES3
  gl_FragColor = fragColor;
#endif
}
`
      );

      this.finalize();
    }

    /**
     * Returns parameter declarations
     *
     * @static
     * @return {array} - Params declarations
     */
    static getParamDeclarations() {
      const paramDescs = super.getParamDeclarations();
      paramDescs.push({
        name: 'BaseColor',
        defaultValue: new zeaEngine.Color(1.0, 1.0, 0.5),
      });
      paramDescs.push({
        name: 'MaintainScreenSize',
        defaultValue: 0,
      });
      paramDescs.push({ name: 'Overlay', defaultValue: 0.0 });
      return paramDescs
    }

    /**
     * The getPackedMaterialData method.
     * @param {any} material - The material param.
     * @return {any} - The return value.
     */
    static getPackedMaterialData(material) {
      const matData = new Float32Array(8);
      const baseColor = material.getParameter('BaseColor').getValue();
      matData[0] = baseColor.r;
      matData[1] = baseColor.g;
      matData[2] = baseColor.b;
      matData[3] = baseColor.a;
      matData[4] = material.getParameter('MaintainScreenSize').getValue();
      matData[5] = material.getParameter('Overlay').getValue();
      return matData
    }

    /**
     * Returns whether the shader's overlay is true or not.
     *
     * @static
     * @return {boolean} - The overlay value
     */
    static isOverlay() {
      return true
    }
  }

  zeaEngine.Registry.register('HandleShader', HandleShader);

  const transformVertices = (geometry, xfo) => {
    geometry.update();

    const positions = geometry.getVertexAttribute('positions');
    for (let i = 0; i < positions.length; i++) {
      const v = positions.getValueRef(i);
      const v2 = xfo.transformVec3(v);
      v.set(v2.x, v2.y, v2.z);
    }
  };

  /**
   * Class representing a linear movement scene widget.
   *
   * @extends BaseLinearMovementHandle
   */
  class LinearMovementHandle extends BaseLinearMovementHandle {
    /**
     * Create a linear movement scene widget.
     *
     * @param {string} name - The name value.
     * @param {number} length - The length value.
     * @param {number} thickness - The thickness value.
     * @param {Color} color - The color value.
     */
    constructor(name, length = 0.1, thickness = 0.003, color = new zeaEngine.Color()) {
      super(name);
      this.colorParam.setValue(color);

      this.handleMat = new zeaEngine.Material('handle', 'HandleShader');
      this.handleMat.getParameter('BaseColor').setValue(color);
      this.handleMat.getParameter('MaintainScreenSize').setValue(1);
      this.handleMat.getParameter('Overlay').setValue(0.9);

      const handleGeom = new zeaEngine.Cylinder(thickness, length, 64);
      handleGeom.getParameter('BaseZAtZero').setValue(true);
      const tipGeom = new zeaEngine.Cone(thickness * 4, thickness * 10, 64, true);
      const handle = new zeaEngine.GeomItem('handle', handleGeom, this.handleMat);

      const tip = new zeaEngine.GeomItem('tip', tipGeom, this.handleMat);
      const tipXfo = new zeaEngine.Xfo();
      tipXfo.tr.set(0, 0, length);

      transformVertices(tipGeom, tipXfo);

      this.colorParam.on('valueChanged', () => {
        this.handleMat.getParameter('BaseColor').setValue(this.colorParam.getValue());
      });

      this.addChild(handle);
      this.addChild(tip);
    }

    /**
     * Applies a special shinning shader to the handle to illustrate interaction with it.
     */
    highlight() {
      super.highlight();
      this.handleMat.getParameter('BaseColor').setValue(this.highlightColorParam.getValue());
    }

    /**
     * Removes the shining shader from the handle.
     */
    unhighlight() {
      super.unhighlight();
      this.handleMat.getParameter('BaseColor').setValue(this.colorParam.getValue());
    }

    /**
     * Sets global xfo target parameter.
     *
     * @param {Parameter} param - The video param.
     * @param {boolean} track - The track param.
     */
    setTargetParam(param, track = true) {
      this.param = param;
      if (track) {
        const __updateGizmo = () => {
          this.getParameter('GlobalXfo').setValue(param.getValue());
        };
        __updateGizmo();
        param.on('valueChanged', __updateGizmo);
      }
    }

    /**
     * Returns target's global xfo parameter.
     *
     * @return {Parameter} - returns handle's target global Xfo.
     */
    getTargetParam() {
      return this.param ? this.param : this.getParameter('GlobalXfo')
    }

    /**
     * Handles the initially drag of the handle.
     *
     * @param {MouseEvent|TouchEvent|object} event - The event param.
     */
    onDragStart(event) {
      this.grabPos = event.grabPos;
      const param = this.getTargetParam();
      this.baseXfo = param.getValue();

      this.change = new ParameterValueChange(param);
      UndoRedoManager.getInstance().addChange(this.change);
    }

    /**
     * Handles drag action of the handle.
     *
     * @param {MouseEvent|TouchEvent|object} event - The event param.
     */
    onDrag(event) {
      const dragVec = event.holdPos.subtract(this.grabPos);

      const newXfo = this.baseXfo.clone();
      newXfo.tr.addInPlace(dragVec);

      this.change.update({
        value: newXfo,
      });
    }

    /**
     * Handles the end of dragging the handle.
     *
     * @param {MouseEvent|TouchEvent|object} event - The event param.
     */
    onDragEnd(event) {
      this.change = null;
    }
  }

  /**
   * Class representing an axial rotation scene widget.
   *
   * @extends Handle
   */
  class BaseAxialRotationHandle extends Handle {
    /**
     * Create an axial rotation scene widget.
     *
     * @param {string} name - The name value.
     */
    constructor(name) {
      super(name);
    }

    /**
     * Sets global xfo target parameter
     *
     * @param {Parameter} param - The param param.
     * @param {boolean} track - The track param.
     */
    setTargetParam(param, track = true) {
      this.param = param;
      if (track) {
        const __updateGizmo = () => {
          this.getParameter('GlobalXfo').setValue(param.getValue());
        };
        __updateGizmo();
        param.on('valueChanged', __updateGizmo);
      }
    }

    /**
     * Returns target's global xfo parameter.
     *
     * @return {Parameter} - returns handle's target global Xfo.
     */
    getTargetParam() {
      return this.param ? this.param : this.getParameter('GlobalXfo')
    }

    /**
     * Handles the initially drag of the handle.
     *
     * @param {MouseEvent|TouchEvent|object} event - The event param.
     */
    onDragStart(event) {
      this.baseXfo = this.getParameter('GlobalXfo').getValue().clone();
      this.baseXfo.sc.set(1, 1, 1);
      this.deltaXfo = new zeaEngine.Xfo();

      const param = this.getTargetParam();
      const paramXfo = param.getValue();
      this.offsetXfo = this.baseXfo.inverse().multiply(paramXfo);

      this.vec0 = event.grabPos.subtract(this.baseXfo.tr);
      this.grabCircleRadius = this.vec0.length();
      this.vec0.normalizeInPlace();

      this.change = new ParameterValueChange(param);
      UndoRedoManager.getInstance().addChange(this.change);
    }

    /**
     * Handles drag action of the handle.
     *
     * @param {MouseEvent|TouchEvent|object} event - The event param.
     */
    onDrag(event) {
      const vec1 = event.holdPos.subtract(this.baseXfo.tr);
      // const dragCircleRadius = vec1.length()
      vec1.normalizeInPlace();

      // modulate the angle by the radius the mouse moves
      // away from the center of the handle.
      // This makes it possible to rotate the object more than
      // 180 degrees in a single movement.
      // Note: this modulator made rotations quite unpredictable
      // especially when the angle between the ray and the plane is acute.
      // disabling for now.
      const modulator = 1.0; //dragCircleRadius / this.grabCircleRadius
      let angle = this.vec0.angleTo(vec1) * modulator;
      if (this.vec0.cross(vec1).dot(this.baseXfo.ori.getZaxis()) < 0) angle = -angle;

      if (this.range) {
        angle = zeaEngine.MathFunctions.clamp(angle, this.range[0], this.range[1]);
      }

      if (event.shiftKey) {
        // modulat the angle to X degree increments.
        const increment = Math.degToRad(22.5);
        angle = Math.floor(angle / increment) * increment;
      }

      this.deltaXfo.ori.setFromAxisAndAngle(new zeaEngine.Vec3(0, 0, 1), angle);

      const newXfo = this.baseXfo.multiply(this.deltaXfo);
      const value = newXfo.multiply(this.offsetXfo);

      this.change.update({
        value,
      });
    }

    /**
     * Handles the end of dragging the handle.
     *
     * @param {MouseEvent|TouchEvent|object} event - The event param.
     */
    onDragEnd(event) {
      this.change = null;
    }
  }

  /**
   * Class representing an axial rotation scene widget. It has a `Torus` shape and is used to rotate objects around the specified axes.
   * You can do it by specifying the localXfo orientation:
   *
   * ```javascript
   * const xfo1 = new Xfo()
   * // This is rotation over `Y` axis
   * xfo1.ori.setFromAxisAndAngle(new Vec3(0, 1, 0), Math.PI * 0.5)
   * axialRotationHandle.getParameter('LocalXfo').setValue(xfo1)
   * ```
   * **Parameters**
   * * **Radius(`NumberParameter`):** Specifies the radius of the handler.
   *
   * @extends BaseAxialRotationHandle
   */
  class AxialRotationHandle extends BaseAxialRotationHandle {
    /**
     * Create an axial rotation scene widget.
     *
     * @param {string} name - The name value.
     * @param {number} radius - The radius value.
     * @param {number} thickness - The thickness value.
     * @param {Color} color - The color value.
     */
    constructor(name, radius, thickness, color = new zeaEngine.Color(1, 1, 0)) {
      super(name);

      this.radiusParam = this.addParameter(new zeaEngine.NumberParameter('Radius', radius));
      this.colorParam.setValue(color);

      this.handleMat = new zeaEngine.Material('handle', 'HandleShader');
      this.handleMat.getParameter('BaseColor').setValue(color);
      this.handleMat.getParameter('MaintainScreenSize').setValue(1);
      this.handleMat.getParameter('Overlay').setValue(0.9);

      // const handleGeom = new Cylinder(radius, thickness * 2, 64, 2, false);
      const handleGeom = new zeaEngine.Torus(thickness, radius, 64, Math.PI * 0.5);
      this.handle = new zeaEngine.GeomItem('handle', handleGeom, this.handleMat);
      this.handleXfo = new zeaEngine.Xfo();

      this.radiusParam.on('valueChanged', () => {
        radius = this.radiusParam.getValue();
        handleGeom.getParameter('OuterRadius').setValue(radius);
        handleGeom.getParameter('InnerRadius').setValue(radius * 0.02);
      });

      this.colorParam.on('valueChanged', () => {
        this.handleMat.getParameter('BaseColor').setValue(this.colorParam.getValue());
      });

      this.addChild(this.handle);
    }

    /**
     * Applies a special shinning shader to the handle to illustrate interaction with it.
     */
    highlight() {
      super.highlight();
      this.handleMat.getParameter('BaseColor').setValue(this.highlightColorParam.getValue());
    }

    /**
     * Removes the shining shader from the handle.
     */
    unhighlight() {
      super.unhighlight();
      this.handleMat.getParameter('BaseColor').setValue(this.colorParam.getValue());
    }

    /**
     * Returns handle's global Xfo
     *
     * @return {Xfo} - The Xfo value
     */
    getBaseXfo() {
      return this.getParameter('GlobalXfo').getValue()
    }

    /**
     * Handles the initially drag interaction of the handle.
     *
     * @param {MouseEvent|TouchEvent|object} event - The event param.
     */
    onDragStart(event) {
      super.onDragStart(event);
    }

    /**
     * Handles drag interaction of the handle.
     *
     * @param {MouseEvent|TouchEvent|object} event - The event param.
     */
    onDrag(event) {
      super.onDrag(event);
    }

    /**
     * Handles the end of dragging interaction with the handle.
     *
     * @param {MouseEvent|TouchEvent|object} event - The event param.
     */
    onDragEnd(event) {
      super.onDragEnd(event);
    }
  }

  /**
   * Class representing a planar movement scene widget.
   *
   * @extends Handle
   */
  class PlanarMovementHandle extends Handle {
    /**
     * Create a planar movement scene widget.
     *
     * @param {string} name - The name value.
     */
    constructor(name) {
      super(name);
      this.fullXfoManipulationInVR = true;
    }

    /**
     * Sets global xfo target parameter.
     *
     * @param {Parameter} param - The video param.
     * @param {boolean} track - The track param.
     */
    setTargetParam(param, track = true) {
      this.param = param;
      if (track) {
        const __updateGizmo = () => {
          this.getParameter('GlobalXfo').setValue(param.getValue());
        };
        __updateGizmo();
        param.on('valueChanged', __updateGizmo);
      }
    }

    /**
     * Returns target's global xfo parameter.
     *
     * @return {Parameter} - returns handle's target global Xfo.
     */
    getTargetParam() {
      return this.param ? this.param : this.getParameter('GlobalXfo')
    }

    /**
     * Handles the initially drag of the handle.
     *
     * @param {MouseEvent|TouchEvent|object} event - The event param.
     */
    onDragStart(event) {
      this.grabPos = event.grabPos;
      const param = this.getTargetParam();
      this.baseXfo = param.getValue();

      this.change = new ParameterValueChange(param);
      UndoRedoManager.getInstance().addChange(this.change);
    }

    /**
     * Handles drag action of the handle.
     *
     * @param {MouseEvent|TouchEvent|object} event - The event param.
     */
    onDrag(event) {
      const dragVec = event.holdPos.subtract(this.grabPos);

      const newXfo = this.baseXfo.clone();
      newXfo.tr.addInPlace(dragVec);

      this.change.update({
        value: newXfo,
      });
    }

    /**
     * Handles the end of dragging the handle.
     *
     * @param {MouseEvent|TouchEvent|object} event - The event param.
     */
    onDragEnd(event) {
      this.change = null;
    }

    // ///////////////////////////////////
    // VRController events

    /**
     * Event fired when a VR controller button is pressed over the handle.
     *
     * @param {object} event - The event param.
     * @return {boolean} The return value.
     */
    onVRControllerButtonDown(event) {
      if (this.fullXfoManipulationInVR) {
        this.activeController = event.controller;
        const xfo = this.activeController.getTipXfo();
        const handleXfo = this.getParameter('GlobalXfo').getValue();
        this.grabOffset = xfo.inverse().multiply(handleXfo);
      } else {
        super.onVRControllerButtonDown(event);
      }
      return true
    }

    /**
     * The onVRPoseChanged method.
     *
     * @param {object} event - The event param.
     */
    onVRPoseChanged(event) {
      if (this.fullXfoManipulationInVR) {
        const xfo = this.activeController.getTipXfo();
        const newXfo = xfo.multiply(this.grabOffset);
        if (this.change) {
          this.change.update({
            value: newXfo,
          });
        } else {
          const param = this.getTargetParam();
          param.setValue(newXfo);
        }
      } else {
        super.onVRPoseChanged(event);
      }
    }

    /**
     * Event fired when a VR controller button is released over the handle.
     *
     * @param {object} event - The event param.
     */
    onVRControllerButtonUp(event) {
      if (this.fullXfoManipulationInVR) {
        this.change = null;
      } else {
        super.onVRControllerButtonUp(event);
      }
    }
  }

  /**
   * Class representing a planar movement scene widget.
   *
   * **Parameters**
   * * **Size(`NumberParameter`):** Specifies the size of the plane handle.
   *
   * @extends Handle
   */
  class XfoPlanarMovementHandle extends PlanarMovementHandle {
    /**
     * Create a planar movement scene widget.
     * @param {string} name - The name value.
     * @param {number} size - The size value.
     * @param {Vec3} offset - The offset value.
     * @param {Color} color - The color value.
     */
    constructor(name, size, offset, color = new zeaEngine.Color()) {
      super(name);

      this.sizeParam = this.addParameter(new zeaEngine.NumberParameter('Size', size));
      this.colorParam.setValue(color);

      this.handleMat = new zeaEngine.Material('handle', 'HandleShader');
      this.handleMat.getParameter('BaseColor').setValue(color);
      this.handleMat.getParameter('MaintainScreenSize').setValue(1);
      this.handleMat.getParameter('Overlay').setValue(0.9);

      const handleGeom = new zeaEngine.Cuboid(size, size, size * 0.02);

      const handleGeomXfo = new zeaEngine.Xfo();
      handleGeomXfo.tr = offset;
      transformVertices(handleGeom, handleGeomXfo);
      this.handle = new zeaEngine.GeomItem('handle', handleGeom, this.handleMat);

      this.sizeParam.on('valueChanged', () => {
        size = this.sizeParam.getValue();
        handleGeom.getParameter('X').setValue(size);
        handleGeom.getParameter('Y').setValue(size);
        handleGeom.getParameter('Z').setValue(size * 0.02);
      });

      this.colorParam.on('valueChanged', () => {
        this.handleMat.getParameter('BaseColor').setValue(this.colorParam.getValue());
      });
      this.addChild(this.handle);
    }

    /**
     * Applies a special shinning shader to the handle to illustrate interaction with it.
     */
    highlight() {
      super.highlight();
      this.handleMat.getParameter('BaseColor').setValue(this.highlightColorParam.getValue());
    }

    /**
     * Removes the shining shader from the handle.
     */
    unhighlight() {
      super.unhighlight();
      this.handleMat.getParameter('BaseColor').setValue(this.colorParam.getValue());
    }
  }

  /**
   * Class representing a xfo handle. Base transformations for objects in the scene
   *
   * **Parameters**
   * * **HighlightColor(`ColorParameter`):** Specifies the highlight color of the handle.
   *
   * @extends TreeItem
   */
  class XfoHandle extends zeaEngine.TreeItem {
    /**
     * Create an axial rotation scene widget.
     *
     * @param {number} size - The size value.
     * @param {number} thickness - The thickness value.
     */
    constructor(size = 0.1, thickness = 0.003) {
      super('XfoHandle');

      this.highlightColorParam = this.addParameter(new zeaEngine.ColorParameter('HighlightColor', new zeaEngine.Color(1, 1, 1)));

      this.highlightColorParam.on('valueChanged', () => {
        const color = this.highlightColorParam.getValue();

        this.traverse((item) => {
          if (item instanceof Handle) item.getParameter('HighlightColor').setValue(color);
        });
      });
      // ////////////////////////////////
      // LinearMovementHandle

      const translationHandles = new zeaEngine.TreeItem('Translate');
      // translationHandles.setVisible(false)
      this.addChild(translationHandles);

      const red = new zeaEngine.Color(1, 0.1, 0.1);
      const green = new zeaEngine.Color('#32CD32'); // limegreen https://www.rapidtables.com/web/color/green-color.html
      const blue = new zeaEngine.Color('#1E90FF'); // dodgerblue https://www.rapidtables.com/web/color/blue-color.html
      red.a = 1;
      green.a = 1;
      blue.a = 1;

      {
        const linearXWidget = new LinearMovementHandle('linearX', size, thickness, red);
        const xfo = new zeaEngine.Xfo();
        xfo.ori.setFromAxisAndAngle(new zeaEngine.Vec3(0, 1, 0), Math.PI * 0.5);
        linearXWidget.getParameter('LocalXfo').setValue(xfo);
        translationHandles.addChild(linearXWidget);
      }
      {
        const linearYWidget = new LinearMovementHandle('linearY', size, thickness, green);
        const xfo = new zeaEngine.Xfo();
        xfo.ori.setFromAxisAndAngle(new zeaEngine.Vec3(1, 0, 0), Math.PI * -0.5);
        linearYWidget.getParameter('LocalXfo').setValue(xfo);
        translationHandles.addChild(linearYWidget);
      }
      {
        const linearZWidget = new LinearMovementHandle('linearZ', size, thickness, blue);
        translationHandles.addChild(linearZWidget);
      }

      // ////////////////////////////////
      // planarXYWidget
      const planarSize = size * 0.35;
      {
        const planarXYWidget = new XfoPlanarMovementHandle(
          'planarXY',
          planarSize,
          new zeaEngine.Vec3(planarSize * 0.5, planarSize * 0.5, 0.0),
          blue
        );
        const xfo = new zeaEngine.Xfo();
        planarXYWidget.getParameter('LocalXfo').setValue(xfo);
        translationHandles.addChild(planarXYWidget);
      }
      {
        const planarYZWidget = new XfoPlanarMovementHandle(
          'planarYZ',
          planarSize,
          new zeaEngine.Vec3(planarSize * -0.5, planarSize * 0.5, 0.0),
          red
        );
        const xfo = new zeaEngine.Xfo();
        xfo.ori.setFromAxisAndAngle(new zeaEngine.Vec3(0, 1, 0), Math.PI * 0.5);
        planarYZWidget.getParameter('LocalXfo').setValue(xfo);
        translationHandles.addChild(planarYZWidget);
      }
      {
        const planarXZWidget = new XfoPlanarMovementHandle(
          'planarXZ',
          planarSize,
          new zeaEngine.Vec3(planarSize * 0.5, planarSize * 0.5, 0.0),
          green
        );
        const xfo = new zeaEngine.Xfo();
        xfo.ori.setFromAxisAndAngle(new zeaEngine.Vec3(1, 0, 0), Math.PI * 0.5);
        planarXZWidget.getParameter('LocalXfo').setValue(xfo);
        translationHandles.addChild(planarXZWidget);
      }

      // ////////////////////////////////
      // Rotation
      const rotationHandles = new zeaEngine.TreeItem('Rotate');
      // rotationHandles.setVisible(false)
      this.addChild(rotationHandles);
      // {
      //   const rotationWidget = new SphericalRotationHandle('rotation', size - thickness, new Color(1, 1, 1, 0))
      //   rotationHandles.addChild(rotationWidget)
      // }
      {
        const rotationXWidget = new AxialRotationHandle('rotationX', size * 0.75, thickness, red);
        const xfo = new zeaEngine.Xfo();
        xfo.ori.setFromEulerAngles(new zeaEngine.EulerAngles(Math.PI * -0.5, Math.PI * -0.5, 0));
        rotationXWidget.getParameter('LocalXfo').setValue(xfo);
        rotationHandles.addChild(rotationXWidget);
      }
      {
        const rotationYWidget = new AxialRotationHandle('rotationY', size * 0.75, thickness, green);
        const xfo = new zeaEngine.Xfo();
        xfo.ori.setFromAxisAndAngle(new zeaEngine.Vec3(1, 0, 0), Math.PI * -0.5);
        rotationYWidget.getParameter('LocalXfo').setValue(xfo);
        rotationHandles.addChild(rotationYWidget);
      }
      {
        const rotationZWidget = new AxialRotationHandle('rotationZ', size * 0.75, thickness, blue);
        const xfo = new zeaEngine.Xfo();
        xfo.ori.setFromAxisAndAngle(new zeaEngine.Vec3(0, 0, 1), Math.PI * 0.5);
        rotationZWidget.getParameter('LocalXfo').setValue(xfo);
        rotationHandles.addChild(rotationZWidget);
      }
      /*
      // ////////////////////////////////
      // Scale - Not supported
      const scaleHandles = new TreeItem('Scale')
      scaleHandles.setVisible(false)
      this.addChild(scaleHandles)

      const scaleHandleLength = size * 0.95
      {
        const scaleXWidget = new LinearScaleHandle('scaleX', scaleHandleLength, thickness, red)
        const xfo = new Xfo()
        xfo.ori.setFromAxisAndAngle(new Vec3(0, 1, 0), Math.PI * 0.5)
        scaleXWidget.getParameter('LocalXfo').setValue(xfo)
        scaleHandles.addChild(scaleXWidget)
      }
      {
        const scaleYWidget = new LinearScaleHandle('scaleY', scaleHandleLength, thickness, green)
        const xfo = new Xfo()
        xfo.ori.setFromAxisAndAngle(new Vec3(1, 0, 0), Math.PI * -0.5)
        scaleYWidget.getParameter('LocalXfo').setValue(xfo)
        scaleHandles.addChild(scaleYWidget)
      }
      {
        const scaleZWidget = new LinearScaleHandle('scaleZ', scaleHandleLength, thickness, blue)
        scaleHandles.addChild(scaleZWidget)
      }
      */
    }

    /**
     * Calculate the global Xfo for the handles.
     *
     * @return {Xfo} - The Xfo value
     * @private
     */
    _cleanGlobalXfo() {
      const parentItem = this.getParentItem();
      if (parentItem !== undefined) {
        const parentXfo = parentItem.getParameter('GlobalXfo').getValue().clone();
        parentXfo.sc.set(1, 1, 1);
        return parentXfo.multiply(this.__localXfoParam.getValue())
      } else return this.__localXfoParam.getValue()
    }

    /**
     * Displays handles depending on the specified mode(Move, Rotate, Scale).
     * If nothing is specified, it hides all of them.
     * @deprecated
     * @param {string} handleManipulationMode - The mode of the Xfo parameter
     */
    showHandles(handleManipulationMode) {
      this.setVisible(true);
    }

    /**
     * Sets global xfo target parameter.
     *
     * @param {Parameter} param - The video param.
     */
    setTargetParam(param) {
      this.param = param;
      this.traverse((item) => {
        if (item instanceof Handle) item.setTargetParam(param, false);
      });
    }
  }

  /**
   * An operator for aiming items at targets.
   *
   * @extends {Operator}
   */
  class SelectionGroupXfoOperator extends zeaEngine.Operator {
    /**
     * Creates an instance of SelectionGroupXfoOperator.
     *
     * @param {number} initialXfoModeParam - Initial XFO Mode, check `INITIAL_XFO_MODES` in `Group` documentation
     * @param {XfoParameter} globalXfoParam - The GlobalXfo param found on the Group.
     */
    constructor(initialXfoModeParam, globalXfoParam) {
      super();
      this.addInput(new zeaEngine.OperatorInput('InitialXfoMode')).setParam(initialXfoModeParam);
      this.addOutput(new zeaEngine.OperatorOutput('GroupGlobalXfo')).setParam(globalXfoParam);

      this.currGroupXfo = new zeaEngine.Xfo();
    }

    /**
     * Updates operator inputs(`OperatorInput`) of current `Operator` using the specified `TreeItem`.
     *
     * @param {TreeItem} item - The tree item being added
     */
    addItem(item) {
      this.addInput(new zeaEngine.OperatorInput('MemberGlobalXfo' + this.getNumInputs())).setParam(item.getParameter('GlobalXfo'));
      this.setDirty();
    }

    /**
     * Finds and removes the `OperatorInput` of the specified `TreeItem` from current`Operator`.
     *
     * @param {TreeItem} item - The Bind Xfo calculated from the initial Transforms of the Group Members.
     */
    removeItem(item) {
      // The first input it the 'InitialXfoMode', so remove the input for the specified item.
      const xfoParam = item.getParameter('GlobalXfo');
      for (let i = 1; i < this.getNumInputs(); i++) {
        const input = this.getInputByIndex(i);
        if (input.getParam() == xfoParam) {
          this.removeInput(input);
          this.setDirty();
          return
        }
      }
      throw new Error('Item not found in SelectionGroupXfoOperator')
    }

    /**
     * Move the group. When the selection group is manipulated, this method is called.
     * Here we propagate the delta to each of the selection members.
     *
     * @param {Xfo} xfo - The new value being set to the Groups GlobalXfo param.
     */
    backPropagateValue(xfo) {
      const invXfo = this.currGroupXfo.inverse();
      const delta = xfo.multiply(invXfo);
      delta.ori.normalizeInPlace();

      // During interactive manipulation, it is possible on heavy scenes
      // that multiple backPropagateValue calls occur between renders.
      // Note: that the currGroupXfo would not be re-computed in that time,
      // and to this means that we cannot calculate the delta based on the current
      // Value of the output. ('GroupGlobalXfo')
      // By updating the cache of the currGroupXfo value, a successive call to
      // backPropagateValue will apply to the result of the previous call to backPropagateValue
      this.currGroupXfo = delta.multiply(this.currGroupXfo);
      for (let i = 1; i < this.getNumInputs(); i++) {
        const input = this.getInputByIndex(i);
        const currXfo = input.getValue();
        const result = delta.multiply(currXfo);
        input.setValue(result);
      }
    }

    /**
     * Calculates a new Xfo for the group based on the members.
     */
    evaluate() {
      const groupTransformOutput = this.getOutput('GroupGlobalXfo');
      this.currGroupXfo = new zeaEngine.Xfo();

      if (this.getNumInputs() == 1) {
        groupTransformOutput.setClean(this.currGroupXfo);
        return
      }

      const initialXfoMode = this.getInput('InitialXfoMode').getValue();
      if (initialXfoMode == zeaEngine.Group.INITIAL_XFO_MODES.manual) {
        // The xfo is manually set by the current global xfo.
        this.currGroupXfo = groupTransformOutput.getValue().clone();
        return
      } else if (initialXfoMode == zeaEngine.Group.INITIAL_XFO_MODES.first) {
        const itemXfo = this.getInputByIndex(1).getValue();
        this.currGroupXfo.tr = itemXfo.tr.clone();
        this.currGroupXfo.ori = itemXfo.ori.clone();
      } else if (initialXfoMode == zeaEngine.Group.INITIAL_XFO_MODES.average) {
        this.currGroupXfo.ori.set(0, 0, 0, 0);
        let numTreeItems = 0;
        for (let i = 1; i < this.getNumInputs(); i++) {
          const itemXfo = this.getInputByIndex(i).getValue();
          this.currGroupXfo.tr.addInPlace(itemXfo.tr);

          // Note: Averaging rotations causes weird and confusing GizmoRotation.
          if (numTreeItems == 0) this.currGroupXfo.ori.addInPlace(itemXfo.ori);
          numTreeItems++;
        }
        this.currGroupXfo.tr.scaleInPlace(1 / numTreeItems);
        // this.currGroupXfo.sc.scaleInPlace(1 / numTreeItems);
      } else if (initialXfoMode == zeaEngine.Group.INITIAL_XFO_MODES.globalOri) {
        let numTreeItems = 0;
        for (let i = 1; i < this.getNumInputs(); i++) {
          const itemXfo = this.getInputByIndex(i).getValue();
          this.currGroupXfo.tr.addInPlace(itemXfo.tr);
          numTreeItems++;
        }
        this.currGroupXfo.tr.scaleInPlace(1 / numTreeItems);
      } else {
        throw new Error('Invalid Group.INITIAL_XFO_MODES.')
      }
      this.currGroupXfo.ori.normalizeInPlace();
      groupTransformOutput.setClean(this.currGroupXfo);
    }
  }

  const GROUP_XFO_MODES = {
    disabled: 0,
    manual: 1,
    first: 2,
    average: 3,
    globalOri: 4,
  };

  /**
   * A specific type of `Group` class that contains/handles selection of one or more items from the scene.
   *
   * **Option parameter values**
   *
   * | Option | type | default | Description |
   * | --- | --- | --- | --- |
   * | selectionOutlineColor | `Color` | `new Color('#03e3ac'))`  and opacity of `0.1` | See `Color` documentation |
   * | branchSelectionOutlineColor | `Color` | `new Color('#81f1d5')` and opacity of `0.55` | See `Color` documentation |
   *
   * @extends {Group}
   */
  class SelectionGroup extends zeaEngine.SelectionSet {
    /**
     * Creates an instance of SelectionGroup.
     *
     *
     * **Parameters**
     * @param {object} options - Custom options for selection
     */
    constructor(options) {
      super();

      let selectionColor;
      let subtreeColor;
      options.selectionOutlineColor
        ? (selectionColor = options.selectionOutlineColor)
        : (selectionColor = new zeaEngine.Color(3 / 255, 227 / 255, 172 / 255, 0.1));

      if (options.branchSelectionOutlineColor) subtreeColor = options.branchSelectionOutlineColor;
      else {
        subtreeColor = selectionColor.lerp(new zeaEngine.Color('white'), 0.5);
        subtreeColor.a = 0.1;
      }

      this.getParameter('HighlightColor').setValue(selectionColor);
      this.addParameter(new zeaEngine.ColorParameter('SubtreeHighlightColor', subtreeColor));

      this.__itemsParam.setFilterFn((item) => item instanceof zeaEngine.BaseItem);

      this.__initialXfoModeParam = this.addParameter(
        new zeaEngine.MultiChoiceParameter('InitialXfoMode', GROUP_XFO_MODES.average, ['manual', 'first', 'average', 'global'])
      );

      this.selectionGroupXfoOp = new SelectionGroupXfoOperator(
        this.getParameter('InitialXfoMode'),
        this.getParameter('GlobalXfo')
      );
    }

    /**
     * Returns enum of available xfo modes.
     *
     * | Name | Default |
     * | --- | --- |
     * | manual | <code>0</code> |
     * | first | <code>1</code> |
     * | average | <code>2</code> |
     * | globalOri | <code>3</code> |
     */
    static get INITIAL_XFO_MODES() {
      return GROUP_XFO_MODES
    }

    /**
     * Constructs a new selection group by copying the values from current one and returns it.
     *
     * @return {SelectionGroup} - Cloned selection group.
     */
    clone() {
      const cloned = new SelectionGroup();
      cloned.copyFrom(this);
      return cloned
    }

    /**
     *
     * @param {TreeItem} item -
     * @param {number} index -
     * @private
     */
    __bindItem(item, index) {
      if (item instanceof zeaEngine.TreeItem) {
        const highlightColor = this.getParameter('HighlightColor').getValue();
        highlightColor.a = this.getParameter('HighlightFill').getValue();
        item.addHighlight('selected' + this.getId(), highlightColor, false);

        const subTreeColor = this.getParameter('SubtreeHighlightColor').getValue();
        item.getChildren().forEach((childItem) => {
          if (childItem instanceof zeaEngine.TreeItem) {
            childItem.addHighlight('branchselected' + this.getId(), subTreeColor, true);
          }
        });

        this.selectionGroupXfoOp.addItem(item, index);
      }
    }

    /**
     *
     * @param {TreeItem} item -
     * @param {number} index -
     * @private
     */
    __unbindItem(item, index) {
      if (item instanceof zeaEngine.TreeItem) {
        item.removeHighlight('selected' + this.getId());
        item.getChildren().forEach((childItem) => {
          if (childItem instanceof zeaEngine.TreeItem) {
            childItem.removeHighlight('branchselected' + this.getId(), true);
          }
        });

        this.selectionGroupXfoOp.removeItem(item, index);
      }
    }
  }

  /**
   * Represents a `Change` class for storing `Selection` values.
   *
   * @extends Change
   */
  class SelectionChange extends Change {
    /**
     * Creates an instance of SelectionChange.
     *
     * @param {SelectionManager} selectionManager - The selectionManager value.
     * @param {Set} prevSelection - The prevSelection value.
     * @param {Set} newSelection - The newSelection value.
     */
    constructor(selectionManager, prevSelection, newSelection) {
      super('SelectionChange');
      this.__selectionManager = selectionManager;
      this.__prevSelection = prevSelection;
      this.__newSelection = newSelection;
    }

    /**
     * Sets the state of selections to the previous list of items selected.
     */
    undo() {
      this.__selectionManager.setSelection(this.__prevSelection, false);
    }

    /**
     * Restores the state of the selections to the latest the list of items selected.
     */
    redo() {
      this.__selectionManager.setSelection(this.__newSelection, false);
    }

    /**
     * Serializes selection values as a JSON object, allowing persistence/replication.
     *
     * @param {object} context - The appData param.
     * @return {object} The return value.
     */
    toJSON(context) {
      const j = super.toJSON(context);

      const itemPaths = [];
      for (const treeItem of this.__newSelection) {
        itemPaths.push(treeItem.getPath());
      }
      j.itemPaths = itemPaths;
      return j
    }

    /**
     * Restores selection state from a JSON object.
     *
     * @param {object} j - The j param.
     * @param {object} context - The context param.
     */
    fromJSON(j, context) {
      super.fromJSON(j, context);

      this.__selectionManager = context.appData.selectionManager;
      this.__prevSelection = new Set(this.__selectionManager.getSelection());

      const sceneRoot = context.appData.scene.getRoot();
      const newSelection = new Set();
      for (const itemPath of j.itemPaths) {
        newSelection.add(sceneRoot.resolvePath(itemPath, 1));
      }
      this.__newSelection = newSelection;

      this.__selectionManager.setSelection(this.__newSelection, false);
    }
  }

  UndoRedoManager.registerChange('SelectionChange', SelectionChange);

  /**
   * Class representing a change of visibility state for selected items.
   *
   * @extends Change
   */
  class SelectionVisibilityChange extends Change {
    /**
     * Create a toggle selection visibility.
     *
     * @param {Set} selection - The selection value.
     * @param {boolean} state - The state value.
     */
    constructor(selection, state) {
      super('Selection Visibility Change');
      this.selection = selection;
      this.state = state;
      this._changeItemsVisibility(this.state);
    }

    /**
     * Restores previous visibility status of the selected items
     */
    undo() {
      this._changeItemsVisibility(!this.state);
    }

    /**
     * Recreates previous visibility status of the selected items
     */
    redo() {
      this._changeItemsVisibility(this.state);
    }

    /**
     * Changes items visibility.
     *
     * @param {boolean} state - The state param.
     * @private
     */
    _changeItemsVisibility(state) {
      for (const treeItem of this.selection) {
        treeItem.getParameter('Visible').setValue(state);
      }
    }
  }

  UndoRedoManager.registerChange('ToggleSelectionVisibility', SelectionVisibilityChange);

  /**
   * Class representing a selection manager
   *
   * **Events**
   * **leadSelectionChanged:** Triggered when selecting one item.
   * **selectionChanged:** Triggered when the selected objects change.
   *
   * @extends {EventEmitter}
   */
  class SelectionManager extends zeaEngine.EventEmitter {
    /**
     * Creates an instance of SelectionManager.
     *
     * @param {object} appData - The options object.
     * @param {object} [options={}] - The appData value.
     *  enableXfoHandles - enables display Xfo Gizmo handles when items are selected.
     *  selectionOutlineColor - enables highlight color to use to outline selected items.
     *  branchSelectionOutlineColor - enables highlight color to use to outline selected items.
     */
    constructor(appData, options = {}) {
      super();
      this.appData = appData;
      this.leadSelection = undefined;
      this.selectionGroup = new SelectionGroup(options);

      if (options.enableXfoHandles === true) {
        const size = 0.1;
        const thickness = size * 0.02;
        this.xfoHandle = new XfoHandle(size, thickness);
        this.xfoHandle.setTargetParam(this.selectionGroup.getParameter('GlobalXfo'), false);
        this.xfoHandle.setVisible(false);
        this.xfoHandle.getParameter('HighlightColor').setValue(new zeaEngine.Color(1, 1, 0));
        this.xfoHandleVisible = true;

        this.selectionGroup.addChild(this.xfoHandle);
      }

      if (this.appData.renderer) {
        this.setRenderer(this.appData.renderer);
      }
    }

    /**
     * Adds specified the renderer to the `SelectionManager` and attaches the `SelectionGroup`.
     *
     * @param {GLBaseRenderer} renderer - The renderer param.
     */
    setRenderer(renderer) {
      if (this.__renderer == renderer) {
        console.warn(`Renderer already set on SelectionManager`);
        return
      }
      this.__renderer = renderer;
      this.__renderer.addTreeItem(this.selectionGroup);
    }

    /**
     * Sets initial Xfo mode of the selection group.
     *
     * @see `Group` class documentation
     *
     * @param {number} mode - The Xfo mode
     */
    setXfoMode(mode) {
      if (this.xfoHandle) {
        this.selectionGroup.getParameter('InitialXfoMode').setValue(mode);
      }
    }

    /**
     * Displays handles depending on the specified mode(Move, Rotate, Scale).
     * If nothing is specified, it hides all of them.
     * @deprecated
     * @param {boolean} enabled - The mode of the Xfo parameter
     */
    showHandles(enabled) {
      this.xfoHandleVisible = enabled;
    }

    /**
     * Determines if the Xfo Manipulation handle should be displayed or not.
     */
    updateHandleVisibility() {
      if (!this.xfoHandle) return
      const selection = this.selectionGroup.getItems();
      const visible = Array.from(selection).length > 0;
      this.xfoHandle.setVisible(visible && this.xfoHandleVisible);
      this.__renderer.requestRedraw();
    }

    /**
     * Returns an array with the selected items.
     *
     * @return {array} - The return value.
     */
    getSelection() {
      return this.selectionGroup.getItems()
    }

    /**
     * Sets a new selection of items in the `SelectionManager`
     *
     * @param {Set} newSelection - The newSelection param
     * @param {boolean} [createUndo=true] - The createUndo param
     */
    setSelection(newSelection, createUndo = true) {
      const selection = new Set(this.selectionGroup.getItems());
      const prevSelection = new Set(selection);
      for (const treeItem of newSelection) {
        if (!selection.has(treeItem)) {
          treeItem.setSelected(true);
          selection.add(treeItem);
        }
      }
      for (const treeItem of selection) {
        if (!newSelection.has(treeItem)) {
          treeItem.setSelected(false);
          selection.delete(treeItem);
        }
      }

      this.selectionGroup.setItems(selection);

      // Deselecting can change the lead selected item.
      if (selection.size > 0) this.__setLeadSelection(selection.values().next().value);
      else this.__setLeadSelection();
      this.updateHandleVisibility();

      if (createUndo) {
        const change = new SelectionChange(this, prevSelection, selection);
        UndoRedoManager.getInstance().addChange(change);
      }

      this.emit('selectionChanged', { prevSelection, selection });
    }

    /**
     *
     * @param {TreeItem} treeItem - The treeItem value
     * @private
     */
    __setLeadSelection(treeItem) {
      if (this.leadSelection != treeItem) {
        this.leadSelection = treeItem;
        this.emit('leadSelectionChanged', { treeItem });
      }
    }

    /**
     * The toggleItemSelection method.
     *
     * @param {TreeItem} treeItem - The treeItem param.
     * @param {boolean} replaceSelection - The replaceSelection param.
     */
    toggleItemSelection(treeItem, replaceSelection = true) {
      const selection = new Set(this.selectionGroup.getItems());
      const prevSelection = new Set(selection);

      // Avoid clearing the selection when we have the
      // item already selected and are deselecting it.
      // (to clear all selection)
      if (replaceSelection && !(selection.size == 1 && selection.has(treeItem))) {
        let clear = true;
        if (selection.has(treeItem)) {
          let count = 1;
          treeItem.traverse((subTreeItem) => {
            if (selection.has(subTreeItem)) {
              count++;
            }
          });
          // Note: In some cases, the item is currently selected, and
          // its children make up all the selected items. In that case
          // the user intends to deselect the item and all its children.
          // Avoid cleaning here, so the deselection can occur.
          clear = count != selection.size;
        }

        if (clear) {
          Array.from(selection).forEach((item) => {
            item.setSelected(false);
          });
          selection.clear();
        }
      }

      let sel;
      if (!selection.has(treeItem)) {
        treeItem.setSelected(true);
        selection.add(treeItem);
        sel = true;
      } else {
        treeItem.setSelected(false);
        selection.delete(treeItem);
        sel = false;
      }

      // const preExpandSelSize = selection.size;

      // Now expand the selection to the subtree.
      // treeItem.traverse((subTreeItem)=>{
      //   if (sel) {
      //     if(!selection.has(subTreeItem)) {
      //       // subTreeItem.setSelected(true);
      //       selection.add(subTreeItem);
      //       // this.selectionGroup.addItem(treeItem);
      //     }
      //   }
      //   else {
      //     if(selection.has(subTreeItem)) {
      //       subTreeItem.setSelected(false);
      //       selection.delete(subTreeItem);
      //       // this.selectionGroup.removeItem(treeItem);
      //     }
      //   }
      // })

      this.selectionGroup.setItems(selection);

      if (sel && selection.size === 1) {
        this.__setLeadSelection(treeItem);
      } else if (!sel) {
        // Deselecting can change the lead selected item.
        if (selection.size === 1) this.__setLeadSelection(selection.values().next().value);
        else if (selection.size === 0) this.__setLeadSelection();
      }

      const change = new SelectionChange(this, prevSelection, selection);
      UndoRedoManager.getInstance().addChange(change);

      this.updateHandleVisibility();
      this.emit('selectionChanged', { prevSelection, selection });
    }

    /**
     * Clears selection state by removing previous selected items and the Xfo handlers.
     *
     * @param {boolean} newChange - The newChange param.
     * @return {boolean} - The return value.
     */
    clearSelection(newChange = true) {
      const selection = new Set(this.selectionGroup.getItems());
      if (selection.size == 0) return false
      let prevSelection;
      if (newChange) {
        prevSelection = new Set(selection);
      }
      for (const treeItem of selection) {
        treeItem.setSelected(false);
      }
      selection.clear();
      this.selectionGroup.setItems(selection);
      this.updateHandleVisibility();
      if (newChange) {
        const change = new SelectionChange(this, prevSelection, selection);
        UndoRedoManager.getInstance().addChange(change);
        this.emit('selectionChanged', { selection, prevSelection });
      }
      return true
    }

    /**
     * Selects the specified items replacing previous selection or concatenating new items to it.
     *
     * @param {array} treeItems - The treeItems param.
     * @param {boolean} replaceSelection - The replaceSelection param.
     */
    selectItems(treeItems, replaceSelection = true) {
      const selection = new Set(this.selectionGroup.getItems());
      const prevSelection = new Set(selection);

      if (replaceSelection) {
        selection.clear();
      }

      for (const treeItem of treeItems) {
        if (!treeItem.isSelected()) {
          treeItem.setSelected(true);
          selection.add(treeItem);
        }
      }

      const change = new SelectionChange(this, prevSelection, selection);

      UndoRedoManager.getInstance().addChange(change);

      this.selectionGroup.setItems(selection);
      if (selection.size === 1) {
        this.__setLeadSelection(selection.values().next().value);
      } else if (selection.size === 0) {
        this.__setLeadSelection();
      }
      this.updateHandleVisibility();
      this.emit('selectionChanged', { prevSelection, selection });
    }

    /**
     * Deselects the specified items from the selection group.
     *
     * @param {array} treeItems - The treeItems param.
     */
    deselectItems(treeItems) {
      const selection = new Set(this.selectionGroup.getItems());
      const prevSelection = new Set(selection);

      for (const treeItem of treeItems) {
        if (treeItem.isSelected()) {
          treeItem.setSelected(false);
          selection.delete(treeItem);
        }
      }

      this.selectionGroup.setItems(selection);
      const change = new SelectionChange(this, prevSelection, selection);

      UndoRedoManager.getInstance().addChange(change);

      if (selection.size === 1) {
        this.__setLeadSelection(selection.values().next().value);
      } else if (selection.size === 0) {
        this.__setLeadSelection();
      }
      this.updateHandleVisibility();
      this.emit('selectionChanged', { prevSelection, selection });
    }

    /**
     * Toggles selection visibility, if the visibility is `true`then sets it to `false` and vice versa.
     */
    toggleSelectionVisibility() {
      if (this.leadSelection) {
        const selection = this.selectionGroup.getItems();
        const state = !this.leadSelection.getVisible();
        const change = new SelectionVisibilityChange(selection, state);
        UndoRedoManager.getInstance().addChange(change);
      }
    }

    // ////////////////////////////////////
    /**
     * The startPickingMode method.
     *
     * @param {string} label - The label param.
     * @param {function} fn - The fn param.
     * @param {function} filterFn - The filterFn param.
     * @param {number} count - The count param.
     */
    startPickingMode(label, fn, filterFn, count) {
      // Display this in a status bar.
      console.log(label);
      this.__pickCB = fn;
      this.__pickFilter = filterFn;
      this.__pickCount = count;
      this.__picked = [];
    }

    /**
     * The pickingFilter method.
     *
     * @param {TreeItem} item - The item param.
     * @return {any} The return value.
     */
    pickingFilter(item) {
      return this.__pickFilter(item)
    }

    /**
     * The pickingModeActive method.
     *
     * @return {boolean} The return value.
     */
    pickingModeActive() {
      return this.__pickCB != undefined
    }

    /**
     * The cancelPickingMode method.
     */
    cancelPickingMode() {
      this.__pickCB = undefined;
    }

    /**
     * The pick method.
     * @param {TreeItem} item - The item param.
     */
    pick(item) {
      if (this.__pickCB) {
        if (Array.isArray(item)) {
          if (this.__pickFilter) this.__picked = this.__picked.concat(item.filter(this.__pickFilter));
          else this.__picked = this.__picked.concat(item);
        } else {
          if (this.__pickFilter && !this.__pickFilter(item)) return
          this.__picked.push(item);
        }
        if (this.__picked.length == this.__pickCount) {
          this.__pickCB(this.__picked);
          this.__pickCB = undefined;
        }
      }
    }
  }

  /**
   * Class representing an `Add TreeItem` Change. Meaning that this should be called when you add a new `TreeItem` to the scene.
   *
   * @extends Change
   */
  class TreeItemAddChange extends Change {
    /**
     * Creates an instance of TreeItemAddChange.
     *
     * @param {TreeItem} treeItem -
     * @param {TreeItem} owner -
     * @param {SelectionManager} selectionManager -
     */
    constructor(treeItem, owner, selectionManager) {
      if (treeItem) {
        super(treeItem.getName() + ' Added');
        this.treeItem = treeItem;
        this.owner = owner;
        this.selectionManager = selectionManager;
        this.prevSelection = new Set(this.selectionManager.getSelection());
        this.treeItemIndex = this.owner.addChild(this.treeItem);
        this.selectionManager.setSelection(new Set([this.treeItem]), false);

        this.treeItem.addRef(this);
      } else {
        super();
      }
    }

    /**
     * Removes the newly added TreeItem from its owner.
     */
    undo() {
      if (this.treeItem instanceof zeaEngine.Operator) {
        const op = this.treeItem;
        op.detach();
      } else if (this.treeItem instanceof zeaEngine.TreeItem) {
        this.treeItem.traverse((subTreeItem) => {
          if (subTreeItem instanceof zeaEngine.Operator) {
            const op = subTreeItem;
            op.detach();
          }
        }, false);
      }
      this.owner.removeChild(this.treeItemIndex);
      if (this.selectionManager) this.selectionManager.setSelection(this.prevSelection, false);
    }

    /**
     * Restores undone `TreeItem`.
     */
    redo() {
      // Now re-attach all the detached operators.
      if (this.treeItem instanceof zeaEngine.Operator) {
        const op = this.treeItem;
        op.reattach();
      } else if (subTreeItem instanceof zeaEngine.TreeItem) {
        this.treeItem.traverse((subTreeItem) => {
          if (subTreeItem instanceof zeaEngine.Operator) {
            const op = subTreeItem;
            op.reattach();
          }
        }, false);
      }
      this.owner.addChild(this.treeItem);
      if (this.selectionManager) this.selectionManager.setSelection(new Set([this.treeItem]), false);
    }

    /**
     * Serializes `TreeItem` like instanced class into a JSON object.
     *
     * @param {object} context - The context treeItem
     * @return {object} - JSON object
     */
    toJSON(context) {
      const j = {
        name: this.name,
        treeItem: this.treeItem.toJSON(context),
        treeItemPath: this.treeItem.getPath(),
        treeItemIndex: this.treeItemIndex,
      };
      return j
    }

    /**
     * Reconstructs `TreeItem` like parameter from JSON object.
     *
     * @param {object} j -The j treeItem
     * @param {object} context - The context treeItem
     */
    fromJSON(j, context) {
      const treeItem = zeaEngine.Registry.constructClass(j.treeItem.type);
      if (!treeItem) {
        console.warn('resolvePath is unable to construct', j.treeItem);
        return
      }
      this.name = j.name;
      this.treeItem = treeItem;
      this.treeItem.addRef(this);

      this.treeItem.fromJSON(j.treeItem, context);
      this.treeItemIndex = this.owner.addChild(this.treeItem, false, false);
    }

    /**
     * Removes reference of the `TreeItem` from current change.
     */
    destroy() {
      this.treeItem.removeRef(this);
    }
  }

  UndoRedoManager.registerChange('TreeItemAddChange', TreeItemAddChange);

  /**
   * Class representing a `Move TreeItem` Change(Moving a TreeItem from one parent to another).
   *
   * @extends Change
   */
  class TreeItemMoveChange extends Change {
    /**
     * Creates an instance of TreeItemMoveChange.
     *
     * @param {TreeItem} treeItem - The item to move.
     * @param {TreeItem} newOwner - The new owner item.
     * @memberof TreeItemMoveChange
     */
    constructor(treeItem, newOwner) {
      if (treeItem) {
        super(treeItem.getName() + ' Moved');
        this.treeItem = treeItem;
        this.oldOwner = this.treeItem.getOwner();
        this.oldOwnerIndex = this.oldOwner.getChildIndex(this.treeItem);
        this.newOwner = newOwner;
        this.newOwner.addChild(this.treeItem, true);
      } else {
        super();
      }
    }

    /**
     * Inserts back the moved TreeItem in the old owner item(Rollbacks the move action).
     */
    undo() {
      this.oldOwner.insertChild(this.treeItem, this.oldOwnerIndex, true);
    }

    /**
     * Executes the move action inserting the TreeItem back to the new owner item.
     */
    redo() {
      this.newOwner.addChild(this.treeItem, true);
    }

    /**
     * Returns a JSON object with the specifications of the change(Typically used for replication).
     *
     * @param {object} context - The context value
     * @return {object} - JSON object of the change
     */
    toJSON(context) {
      const j = {
        name: this.name,
        treeItemPath: this.treeItem.getPath(),
        newOwnerPath: this.newOwner.getPath(),
      };

      return j
    }

    /**
     * Restores the Change state from the specified JSON object.
     *
     * @param {object} j - The serialized object with the change data.
     * @param {object} context - The context value
     */
    fromJSON(j, context) {
      const treeItem = appData.scene.getRoot().resolvePath(j.treeItemPath, 1);
      if (!treeItem) {
        console.warn('resolvePath is unable to resolve', j.treeItemPath);
        return
      }
      const newOwner = appData.scene.getRoot().resolvePath(j.newOwnerPath, 1);
      if (!newOwner) {
        console.warn('resolvePath is unable to resolve', j.newOwnerPath);
        return
      }
      this.name = j.name;
      this.treeItem = treeItem;
      this.newOwner = newOwner;

      this.oldOwner = this.treeItem.getOwner();
      this.oldOwnerIndex = this.oldOwner.getChildIndex(this.treeItem);
      this.newOwner.addChild(this.treeItem, true);
    }
  }

  UndoRedoManager.registerChange('TreeItemMoveChange', TreeItemMoveChange);

  /**
   * Class representing a TreeItems removal Change,
   * taking into account that it would remove all the specified items ti their children
   *
   * @extends Change
   */
  class TreeItemsRemoveChange extends Change {
    /**
     * Creates an instance of TreeItemsRemoveChange.
     *
     * @param {array} items - List of TreeItems
     * @param {object} appData - The appData value
     */
    constructor(items, appData) {
      super();
      this.items = [];
      this.itemOwners = [];
      this.itemPaths = [];
      this.itemIndices = [];
      if (items) {
        this.selectionManager = appData.selectionManager;
        this.prevSelection = new Set(this.selectionManager.getSelection());
        this.items = items;
        this.newSelection = new Set(this.prevSelection);

        const itemNames = [];
        this.items.forEach((item) => {
          const owner = item.getOwner();
          const itemIndex = owner.getChildIndex(item);
          itemNames.push(item.getName());
          item.addRef(this);
          this.itemOwners.push(owner);
          this.itemPaths.push(item.getPath());
          this.itemIndices.push(itemIndex);

          if (this.selectionManager && this.newSelection.has(item)) this.newSelection.delete(item);
          if (item instanceof zeaEngine.Operator) {
            const op = item;
            op.detach();
          } else if (item instanceof zeaEngine.TreeItem) {
            item.traverse((subTreeItem) => {
              if (subTreeItem instanceof zeaEngine.Operator) {
                const op = subTreeItem;
                op.detach();
              }
              if (this.selectionManager && this.newSelection.has(subTreeItem)) this.newSelection.delete(subTreeItem);
            }, false);
          }

          owner.removeChild(itemIndex);
        });
        this.selectionManager.setSelection(this.newSelection, false);

        this.name = itemNames + ' Deleted';
      }
    }

    /**
     * Restores all items removed in the change, reattaching them to their old owners.
     */
    undo() {
      this.items.forEach((item, index) => {
        this.itemOwners[index].insertChild(item, this.itemIndices[index], false, false);

        // Now re-attach all the detached operators.
        if (item instanceof zeaEngine.Operator) {
          const op = item;
          op.reattach();
        } else if (subTreeItem instanceof zeaEngine.TreeItem) {
          item.traverse((subTreeItem) => {
            if (subTreeItem instanceof zeaEngine.Operator) {
              const op = subTreeItem;
              op.reattach();
            }
          }, false);
        }
      });
      if (this.selectionManager) this.selectionManager.setSelection(this.prevSelection, false);
    }

    /**
     * Executes initial change to remove items from their owners.
     */
    redo() {
      if (this.selectionManager) this.selectionManager.setSelection(this.newSelection, false);

      // Now re-detach all the operators.
      this.items.forEach((item, index) => {
        this.itemOwners[index].removeChild(this.itemIndices[index]);

        if (item instanceof zeaEngine.Operator) {
          const op = item;
          op.detach();
        } else if (subTreeItem instanceof zeaEngine.TreeItem) {
          item.traverse((subTreeItem) => {
            if (subTreeItem instanceof zeaEngine.Operator) {
              const op = subTreeItem;
              op.detach();
            }
          }, false);
        }
      });
    }

    /**
     * Serializes current change data as a JSON object, so this action can be stored/replicated somewhere else.
     *
     * @param {object} appData - The appData value
     * @return {object} - JSON Object representation of current change
     * @memberof TreeItemsRemoveChange
     */
    toJSON(appData) {
      const j = {
        name: this.name,
        items: [],
        itemPaths: this.itemPaths,
        itemIndices: this.itemIndices,
      };
      this.items.forEach((item) => {
        j.items.push(item.toJSON());
      });
      return j
    }

    /**
     * Restores Change action from a JSON object.
     *
     * @param {object} j - The JSON object with Change data.
     * @param {object} appData - The appData value
     * @memberof TreeItemsRemoveChange
     */
    fromJSON(j, appData) {
      this.name = j.name;
      j.itemPaths.forEach((itemPath) => {
        const item = appData.scene.getRoot().resolvePath(itemPath, 1);
        if (!item) {
          console.warn('resolvePath is unable to resolve', itemPath);
          return
        }
        const owner = item.getOwner();
        this.itemOwners.push(owner);
        this.itemPaths.push(item.getPath());
        this.itemIndices.push(owner.getChildIndex(item));
      });
    }

    /**
     * The destroy method cleans up any data requiring manual cleanup.
     * Deleted items still on the undo stack are then flushed and any
     * GPU resources cleaned up.
     */
    destroy() {
      this.items.forEach((item) => item.removeRef(this));
    }
  }

  UndoRedoManager.registerChange('TreeItemsRemoveChange', TreeItemsRemoveChange);

  /**
   * Class representing a selection tool.
   *
   * @extends BaseTool
   */
  class SelectionTool extends zeaEngine.BaseTool {
    /**
     * Creates an instance of SelectionTool.
     *
     * @param {object} appData - The appData value
     */
    constructor(appData) {
      super();

      if (!appData) console.error('App data not provided to tool');
      this.appData = appData;
      this.dragging = false;
      if (!appData.selectionManager)
        console.error('`SelectionTool` requires `SelectionManager` to be provided in the `appData` object');
      this.selectionManager = appData.selectionManager;

      this.selectionRect = new zeaEngine.Rect(1, 1);
      this.selectionRectMat = new zeaEngine.Material('marker', 'ScreenSpaceShader');
      this.selectionRectMat.getParameter('BaseColor').setValue(new zeaEngine.Color('#03E3AC'));
      this.selectionRectXfo = new zeaEngine.Xfo();
      this.selectionRectXfo.tr.set(0.5, 0.5, 0);
      this.selectionRectXfo.sc.set(0, 0, 0);

      this.rectItem = new zeaEngine.GeomItem('selectionRect', this.selectionRect, this.selectionRectMat);
      this.rectItem.getParameter('Visible').setValue(false);
      this.appData.renderer.addTreeItem(this.rectItem);
    }

    /**
     * activate this tool
     */
    activateTool() {
      super.activateTool();
      this.prevCursor = this.appData.renderer.getGLCanvas().style.cursor;
      this.appData.renderer.getGLCanvas().style.cursor = 'auto';
    }

    /**
     * Disables tool usage.
     */
    deactivateTool() {
      super.deactivateTool();
      this.appData.renderer.getGLCanvas().style.cursor = this.prevCursor;
    }

    /**
     * Activates selection tool.
     */
    setSelectionManager(selectionManager) {
      this.selectionManager = selectionManager;
    }

    setSelectionFilter(fn) {
      this.__selectionFilterFn = fn;
    }

    /**
     * Activates selection tool.
     */
    activateTool() {
      super.activateTool();
    }

    /**
     * Deactivates the selection tool.
     */
    deactivateTool() {
      super.deactivateTool();
      this.selectionRectXfo.sc.set(0, 0, 0);
      this.rectItem.getParameter('GlobalXfo').setValue(this.selectionRectXfo);
      this.rectItem.getParameter('Visible').setValue(false);
    }

    /**
     *
     *
     * @param {GLViewport} viewport - The viewport value
     * @param {*} delta - The delta value
     * @private
     */
    __resizeRect(viewport, delta) {
      const sc = new zeaEngine.Vec2((1 / viewport.getWidth()) * 2, (1 / viewport.getHeight()) * 2);
      const size = delta.multiply(sc);
      this.selectionRectXfo.sc.set(Math.abs(size.x), Math.abs(size.y), 1);

      const center = this.pointerDownPos.subtract(delta.scale(0.5));
      const tr = center.multiply(sc).subtract(new zeaEngine.Vec2(1, 1));

      this.selectionRectXfo.tr.x = tr.x;
      this.selectionRectXfo.tr.y = -tr.y;
      this.rectItem.getParameter('GlobalXfo').setValue(this.selectionRectXfo);
    }

    /**
     *
     *
     * @param {MouseEvent|TouchEvent|object} event - The event param.
     * @private
     */
    onPointerDoublePress(event) {}

    /**
     * Event fired when a pointing device button is pressed while the pointer is over the tool.
     *
     * @param {MouseEvent|TouchEvent|object} event - The event param.
     * @return {boolean} The return value.
     */
    onPointerDown(event) {
      if (event.pointerType === 'touch' || (event.button == 0 && !event.altKey)) {
        this.pointerDownPos = event.pointerPos;
        this.dragging = false;

        event.stopPropagation();
      }
    }

    /**
     * Event fired when a pointing device is moved while the cursor's hotspot is inside it.
     *
     * @param {MouseEvent|TouchEvent|object} event - The event param.
     * @return {boolean} The return value.
     */
    onPointerMove(event) {
      if (this.pointerDownPos) {
        const delta = this.pointerDownPos.subtract(event.pointerPos);
        const dist = delta.length();
        // dragging only is activated after 4 pixels.
        // This is to avoid causing as rect selection for nothing.
        if (dist > 4) {
          this.dragging = true;
          // Start drawing the selection rectangle on screen.
          this.rectItem.getParameter('Visible').setValue(true);
          this.__resizeRect(event.viewport, delta);
        }
        event.stopPropagation();
      }
    }

    /**
     * Event fired when a pointing device button is released while the pointer is over the tool.
     *
     * @param {MouseEvent|TouchEvent|object} event - The event param.
     * @return {boolean} The return value.
     */
    onPointerUp(event) {
      if (this.pointerDownPos) {
        // event.viewport.renderGeomDataFbo();
        if (this.dragging) {
          this.rectItem.getParameter('Visible').setValue(false);
          const pointerUpPos = event.pointerPos;
          const tl = new zeaEngine.Vec2(
            Math.min(this.pointerDownPos.x, pointerUpPos.x),
            Math.min(this.pointerDownPos.y, pointerUpPos.y)
          );
          const br = new zeaEngine.Vec2(
            Math.max(this.pointerDownPos.x, pointerUpPos.x),
            Math.max(this.pointerDownPos.y, pointerUpPos.y)
          );

          let geomItems = event.viewport.getGeomItemsInRect(tl, br);

          if (this.__selectionFilterFn) {
            const newSet = [];
            for (let i = 0; i < geomItems.length; i++) {
              const treeItem = this.__selectionFilterFn(geomItems[i]);
              if (!newSet.includes(treeItem)) {
                newSet.push(treeItem);
              }
            }
            geomItems = newSet;
          }

          if (!this.selectionManager) throw 'Please set the Selection Manager on the Selection Tool before using it.'
          if (this.selectionManager.pickingModeActive()) {
            this.selectionManager.pick(geomItems);
          } else {
            // Remove all the scene widgets. (UI elements should not be selectable.)
            const regularGeomItems = new Set([...geomItems].filter((x) => !(x.getOwner() instanceof Handle)));

            if (!event.shiftKey) {
              this.selectionManager.selectItems(regularGeomItems, !event.ctrlKey);
            } else {
              this.selectionManager.deselectItems(regularGeomItems);
            }

            this.selectionRectXfo.sc.set(0, 0, 0);
            this.rectItem.getParameter('GlobalXfo').setValue(this.selectionRectXfo);
          }
        } else {
          const intersectionData = event.viewport.getGeomDataAtPos(event.pointerPos);
          if (intersectionData != undefined && !(intersectionData.geomItem.getOwner() instanceof Handle)) {
            let treeItem = intersectionData.geomItem;
            if (this.__selectionFilterFn) treeItem = this.__selectionFilterFn(treeItem);

            if (this.selectionManager.pickingModeActive()) {
              this.selectionManager.pick(treeItem);
            } else {
              if (!event.shiftKey) {
                this.selectionManager.toggleItemSelection(treeItem, !event.ctrlKey);
              } else {
                const items = new Set();
                items.add(treeItem);
                this.selectionManager.deselectItems(items);
              }
            }
          } else {
            this.selectionManager.clearSelection();
          }
        }
        this.pointerDownPos = undefined;
        event.stopPropagation();
      }
    }

    // ///////////////////////////////////
    // VRController events

    /**
     * Event fired when a VR controller button is pressed over a tool.
     *
     * @param {object} event - The event param.
     * @return {boolean} The return value.
     */
    onVRControllerButtonDown(event) {
      if (event.button == 1) {
        if (!this.selectionManager) throw 'Please set the Selection Manager on the Selection Tool before using it.'
        const intersectionData = event.controller.getGeomItemAtTip();
        if (intersectionData != undefined && !(intersectionData.geomItem.getOwner() instanceof Handle)) {
          this.selectionManager.toggleItemSelection(intersectionData.geomItem);
          event.stopPropagation();
        }
      }
    }
  }

  /* eslint-disable require-jsdoc */
  const util = newUtil();
  const inliner = newInliner();
  const fontFaces = newFontFaces();
  const images = newImages();

  // Default impl options
  const defaultOptions = {
    // Default is to fail on error, no placeholder
    imagePlaceholder: undefined,
    // Default cache bust is false, it will use the cache
    cacheBust: false,
  };

  const domtoimage = {
    toSvg: toSvg,
    toPng: toPng,
    toJpeg: toJpeg,
    toBlob: toBlob,
    toPixelData: toPixelData,
    toCanvas: toCanvas,
    impl: {
      fontFaces: fontFaces,
      images: images,
      util: util,
      inliner: inliner,
      options: {},
    },
  };

  /**
       * @param {Node} node - The DOM Node object to render
       * @param {Object} options - Rendering options
       * @param {Function} options.filter - Should return true if passed node should be included in the output
       *          (excluding node means excluding it's children as well). Not called on the root node.
       * @param {string} options.bgcolor - color for the background, any valid CSS color value.
       * @param {number} options.width - width to be applied to node before rendering.
       * @param {number} options.height - height to be applied to node before rendering.
       * @param {Object} options.style - an object whose properties to be copied to node's style before rendering.
       * @param {number} options.quality - a Number between 0 and 1 indicating image quality (applicable to JPEG only),
                  defaults to 1.0.
       * @param {string} options.imagePlaceholder - dataURL to use as a placeholder for failed images, default behaviour is to fail fast on images we can't fetch
       * @param {boolean} options.cacheBust - set to true to cache bust by appending the time to the request url
       * @return {Promise} - A promise that is fulfilled with a SVG image data URL
       * */
  function toSvg(node, options) {
    options = options || {};
    copyOptions(options);
    return Promise.resolve(node)
      .then(function (node) {
        return cloneNode(node, options.filter, true)
      })
      .then(embedFonts)
      .then(inlineImages)
      .then(applyOptions)
      .then(function (clone) {
        return makeSvgDataUri(clone, options.width || util.width(node), options.height || util.height(node))
      })

    /**
     *
     *
     * @param {object} clone -
     * @return {object} -
     */
    function applyOptions(clone) {
      if (options.bgcolor) clone.style.backgroundColor = options.bgcolor;

      if (options.width) clone.style.width = options.width + 'px';
      if (options.height) clone.style.height = options.height + 'px';

      if (options.style)
        Object.keys(options.style).forEach(function (property) {
          clone.style[property] = options.style[property];
        });

      return clone
    }
  }

  /**
   * @param {Node} node - The DOM Node object to render
   * @param {Object} options - Rendering options, @see {@link toSvg}
   * @return {Promise} - A promise that is fulfilled with a Uint8Array containing RGBA pixel data.
   * */
  function toPixelData(node, options) {
    return draw(node, options || {}).then(function (canvas) {
      return canvas.getContext('2d').getImageData(0, 0, util.width(node), util.height(node)).data
    })
  }

  /**
   * @param {Node} node - The DOM Node object to render
   * @param {Object} options - Rendering options, @see {@link toSvg}
   * @return {Promise} - A promise that is fulfilled with a Uint8Array containing RGBA pixel data.
   * */
  function toCanvas(node, options) {
    return draw(node, options || {}).then(function (canvas) {
      return canvas
    })
  }

  /**
   * @param {Node} node - The DOM Node object to render
   * @param {Object} options - Rendering options, @see {@link toSvg}
   * @return {Promise} - A promise that is fulfilled with a PNG image data URL
   * */
  function toPng(node, options) {
    return draw(node, options || {}).then(function (canvas) {
      return canvas.toDataURL()
    })
  }

  /**
   * @param {Node} node - The DOM Node object to render
   * @param {Object} options - Rendering options, @see {@link toSvg}
   * @return {Promise} - A promise that is fulfilled with a JPEG image data URL
   * */
  function toJpeg(node, options) {
    options = options || {};
    return draw(node, options).then(function (canvas) {
      return canvas.toDataURL('image/jpeg', options.quality || 1.0)
    })
  }

  /**
   * @param {Node} node - The DOM Node object to render
   * @param {Object} options - Rendering options, @see {@link toSvg}
   * @return {Promise} - A promise that is fulfilled with a PNG image blob
   * */
  function toBlob(node, options) {
    return draw(node, options || {}).then(util.canvasToBlob)
  }

  /**
   *
   *
   * @param {object} options -
   */
  function copyOptions(options) {
    // Copy options to impl options for use in impl
    if (typeof options.imagePlaceholder === 'undefined') {
      domtoimage.impl.options.imagePlaceholder = defaultOptions.imagePlaceholder;
    } else {
      domtoimage.impl.options.imagePlaceholder = options.imagePlaceholder;
    }

    if (typeof options.cacheBust === 'undefined') {
      domtoimage.impl.options.cacheBust = defaultOptions.cacheBust;
    } else {
      domtoimage.impl.options.cacheBust = options.cacheBust;
    }
  }
  /**
   *
   *
   * @param {*} domNode -
   * @param {*} options -
   * @return {*}
   */
  function draw(domNode, options) {
    return toSvg(domNode, options)
      .then(util.makeImage)
      .then(util.delay(100))
      .then(function (image) {
        const canvas = newCanvas(domNode);
        canvas.getContext('2d').drawImage(image, 0, 0);
        return canvas
      })

    /**
     *
     *
     * @param {*} domNode -
     * @return {*}
     */
    function newCanvas(domNode) {
      const canvas = document.createElement('canvas');
      canvas.width = options.width || util.width(domNode);
      canvas.height = options.height || util.height(domNode);

      if (options.bgcolor) {
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = options.bgcolor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      return canvas
    }
  }

  function cloneNode(node, filter, root) {
    if (!root && filter && !filter(node)) return Promise.resolve()

    return Promise.resolve(node)
      .then(makeNodeCopy)
      .then(function (clone) {
        return cloneChildren(node, clone, filter)
      })
      .then(function (clone) {
        return processClone(node, clone)
      })

    function makeNodeCopy(node) {
      if (node instanceof HTMLCanvasElement) return util.makeImage(node.toDataURL())
      return node.cloneNode(false)
    }

    function cloneChildren(original, clone, filter) {
      const children = original.childNodes;
      if (children.length === 0) return Promise.resolve(clone)

      return cloneChildrenInOrder(clone, util.asArray(children), filter).then(function () {
        return clone
      })

      function cloneChildrenInOrder(parent, children, filter) {
        let done = Promise.resolve();
        children.forEach(function (child) {
          done = done
            .then(function () {
              return cloneNode(child, filter)
            })
            .then(function (childClone) {
              if (childClone) parent.appendChild(childClone);
            });
        });
        return done
      }
    }

    function processClone(original, clone) {
      if (!(clone instanceof Element)) return clone

      return Promise.resolve()
        .then(cloneStyle)
        .then(clonePseudoElements)
        .then(copyUserInput)
        .then(fixSvg)
        .then(function () {
          return clone
        })

      function cloneStyle() {
        copyStyle(window.getComputedStyle(original), clone.style);

        function copyStyle(source, target) {
          if (source.cssText) target.cssText = source.cssText;
          else copyProperties(source, target);

          function copyProperties(source, target) {
            util.asArray(source).forEach(function (name) {
              target.setProperty(name, source.getPropertyValue(name), source.getPropertyPriority(name));
            });
          }
        }
      }

      function clonePseudoElements() {
  [':before', ':after'].forEach(function (element) {
          clonePseudoElement(element);
        });

        function clonePseudoElement(element) {
          const style = window.getComputedStyle(original, element);
          const content = style.getPropertyValue('content');

          if (content === '' || content === 'none') return

          const className = util.uid();
          clone.className = clone.className + ' ' + className;
          const styleElement = document.createElement('style');
          styleElement.appendChild(formatPseudoElementStyle(className, element, style));
          clone.appendChild(styleElement);

          function formatPseudoElementStyle(className, element, style) {
            const selector = '.' + className + ':' + element;
            const cssText = style.cssText ? formatCssText(style) : formatCssProperties(style);
            return document.createTextNode(selector + '{' + cssText + '}')

            function formatCssText(style) {
              const content = style.getPropertyValue('content');
              return style.cssText + ' content: ' + content + ';'
            }

            function formatCssProperties(style) {
              return util.asArray(style).map(formatProperty).join('; ') + ';'

              function formatProperty(name) {
                return name + ': ' + style.getPropertyValue(name) + (style.getPropertyPriority(name) ? ' !important' : '')
              }
            }
          }
        }
      }

      function copyUserInput() {
        if (original instanceof HTMLTextAreaElement) clone.innerHTML = original.value;
        if (original instanceof HTMLInputElement) clone.setAttribute('value', original.value);
      }

      function fixSvg() {
        if (!(clone instanceof SVGElement)) return
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

        if (!(clone instanceof SVGRectElement)) return
        ;['width', 'height'].forEach(function (attribute) {
          const value = clone.getAttribute(attribute);
          if (!value) return

          clone.style.setProperty(attribute, value);
        });
      }
    }
  }

  function embedFonts(node) {
    return fontFaces.resolveAll().then(function (cssText) {
      const styleNode = document.createElement('style');
      node.appendChild(styleNode);
      styleNode.appendChild(document.createTextNode(cssText));
      return node
    })
  }

  function inlineImages(node) {
    return images.inlineAll(node).then(function () {
      return node
    })
  }

  function makeSvgDataUri(node, width, height) {
    return Promise.resolve(node)
      .then(function (node) {
        node.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
        return new XMLSerializer().serializeToString(node)
      })
      .then(util.escapeXhtml)
      .then(function (xhtml) {
        return '<foreignObject x="0" y="0" width="100%" height="100%">' + xhtml + '</foreignObject>'
      })
      .then(function (foreignObject) {
        return (
          '<svg xmlns="http://www.w3.org/2000/svg" width="' +
          width +
          '" height="' +
          height +
          '">' +
          foreignObject +
          '</svg>'
        )
      })
      .then(function (svg) {
        return 'data:image/svg+xml;charset=utf-8,' + svg
      })
  }

  function newUtil() {
    return {
      escape: escape,
      parseExtension: parseExtension,
      mimeType: mimeType,
      dataAsUrl: dataAsUrl,
      isDataUrl: isDataUrl,
      canvasToBlob: canvasToBlob,
      resolveUrl: resolveUrl,
      getAndEncode: getAndEncode,
      uid: uid(),
      delay: delay,
      asArray: asArray,
      escapeXhtml: escapeXhtml,
      makeImage: makeImage,
      width: width,
      height: height,
    }

    function mimes() {
      /*
       * Only WOFF and EOT mime types for fonts are 'real'
       * see http://www.iana.org/assignments/media-types/media-types.xhtml
       */
      const WOFF = 'application/font-woff';
      const JPEG = 'image/jpeg';

      return {
        woff: WOFF,
        woff2: WOFF,
        ttf: 'application/font-truetype',
        eot: 'application/vnd.ms-fontobject',
        png: 'image/png',
        jpg: JPEG,
        jpeg: JPEG,
        gif: 'image/gif',
        tiff: 'image/tiff',
        svg: 'image/svg+xml',
      }
    }

    function parseExtension(url) {
      const match = /\.([^\.\/]*?)$/g.exec(url);
      if (match) return match[1]
      else return ''
    }

    function mimeType(url) {
      const extension = parseExtension(url).toLowerCase();
      return mimes()[extension] || ''
    }

    function isDataUrl(url) {
      return url.search(/^(data:)/) !== -1
    }

    function toBlob(canvas) {
      return new Promise(function (resolve) {
        const binaryString = window.atob(canvas.toDataURL().split(',')[1]);
        const length = binaryString.length;
        const binaryArray = new Uint8Array(length);

        for (let i = 0; i < length; i++) binaryArray[i] = binaryString.charCodeAt(i);

        resolve(
          new Blob([binaryArray], {
            type: 'image/png',
          })
        );
      })
    }

    function canvasToBlob(canvas) {
      if (canvas.toBlob)
        return new Promise(function (resolve) {
          canvas.toBlob(resolve);
        })

      return toBlob(canvas)
    }

    function resolveUrl(url, baseUrl) {
      const doc = document.implementation.createHTMLDocument();
      const base = doc.createElement('base');
      doc.head.appendChild(base);
      const a = doc.createElement('a');
      doc.body.appendChild(a);
      base.href = baseUrl;
      a.href = url;
      return a.href
    }

    function uid() {
      let index = 0;

      return function () {
        return 'u' + fourRandomChars() + index++

        function fourRandomChars() {
          /* see http://stackoverflow.com/a/6248722/2519373 */
          return ('0000' + ((Math.random() * Math.pow(36, 4)) << 0).toString(36)).slice(-4)
        }
      }
    }

    function makeImage(uri) {
      return new Promise(function (resolve, reject) {
        const image = new Image();
        image.onload = function () {
          resolve(image);
        };
        image.onerror = reject;
        image.src = uri;
      })
    }

    function getAndEncode(url) {
      const TIMEOUT = 30000;
      if (domtoimage.impl.options.cacheBust) {
        // Cache bypass so we dont have CORS issues with cached images
        // Source: https://developer.mozilla.org/en/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest#Bypassing_the_cache
        url += (/\?/.test(url) ? '&' : '?') + new Date().getTime();
      }

      return new Promise(function (resolve) {
        const request = new XMLHttpRequest();

        request.onreadystatechange = done;
        request.ontimeout = timeout;
        request.responseType = 'blob';
        request.timeout = TIMEOUT;
        request.open('GET', url, true);
        request.send();

        let placeholder;
        if (domtoimage.impl.options.imagePlaceholder) {
          const split = domtoimage.impl.options.imagePlaceholder.split(/,/);
          if (split && split[1]) {
            placeholder = split[1];
          }
        }

        function done() {
          if (request.readyState !== 4) return

          if (request.status !== 200) {
            if (placeholder) {
              resolve(placeholder);
            } else {
              fail('cannot fetch resource: ' + url + ', status: ' + request.status);
            }

            return
          }

          const encoder = new FileReader();
          encoder.onloadend = function () {
            const content = encoder.result.split(/,/)[1];
            resolve(content);
          };
          encoder.readAsDataURL(request.response);
        }

        function timeout() {
          if (placeholder) {
            resolve(placeholder);
          } else {
            fail('timeout of ' + TIMEOUT + 'ms occured while fetching resource: ' + url);
          }
        }

        function fail(message) {
          console.error(message);
          resolve('');
        }
      })
    }

    function dataAsUrl(content, type) {
      return 'data:' + type + ';base64,' + content
    }

    function escape(string) {
      return string.replace(/([.*+?^${}()|\[\]\/\\])/g, '\\$1')
    }

    function delay(ms) {
      return function (arg) {
        return new Promise(function (resolve) {
          setTimeout(function () {
            resolve(arg);
          }, ms);
        })
      }
    }

    function asArray(arrayLike) {
      const array = [];
      const length = arrayLike.length;
      for (let i = 0; i < length; i++) array.push(arrayLike[i]);
      return array
    }

    function escapeXhtml(string) {
      return string.replace(/#/g, '%23').replace(/\n/g, '%0A')
    }

    function width(node) {
      const leftBorder = px(node, 'border-left-width');
      const rightBorder = px(node, 'border-right-width');
      return node.scrollWidth + leftBorder + rightBorder
    }

    function height(node) {
      const topBorder = px(node, 'border-top-width');
      const bottomBorder = px(node, 'border-bottom-width');
      return node.scrollHeight + topBorder + bottomBorder
    }

    function px(node, styleProperty) {
      const value = window.getComputedStyle(node).getPropertyValue(styleProperty);
      return parseFloat(value.replace('px', ''))
    }
  }

  function newInliner() {
    const URL_REGEX = /url\(['"]?([^'"]+?)['"]?\)/g;

    return {
      inlineAll: inlineAll,
      shouldProcess: shouldProcess,
      impl: {
        readUrls: readUrls,
        inline: inline,
      },
    }

    function shouldProcess(string) {
      return string.search(URL_REGEX) !== -1
    }

    function readUrls(string) {
      const result = [];
      let match;
      while ((match = URL_REGEX.exec(string)) !== null) {
        result.push(match[1]);
      }
      return result.filter(function (url) {
        return !util.isDataUrl(url)
      })
    }

    function inline(string, url, baseUrl, get) {
      return Promise.resolve(url)
        .then(function (url) {
          return baseUrl ? util.resolveUrl(url, baseUrl) : url
        })
        .then(get || util.getAndEncode)
        .then(function (data) {
          return util.dataAsUrl(data, util.mimeType(url))
        })
        .then(function (dataUrl) {
          return string.replace(urlAsRegex(url), '$1' + dataUrl + '$3')
        })

      function urlAsRegex(url) {
        return new RegExp('(url\\([\'"]?)(' + util.escape(url) + ')([\'"]?\\))', 'g')
      }
    }

    function inlineAll(string, baseUrl, get) {
      if (nothingToInline()) return Promise.resolve(string)

      return Promise.resolve(string)
        .then(readUrls)
        .then(function (urls) {
          let done = Promise.resolve(string);
          urls.forEach(function (url) {
            done = done.then(function (string) {
              return inline(string, url, baseUrl, get)
            });
          });
          return done
        })

      function nothingToInline() {
        return !shouldProcess(string)
      }
    }
  }

  function newFontFaces() {
    return {
      resolveAll: resolveAll,
      impl: {
        readAll: readAll,
      },
    }

    function resolveAll() {
      return readAll()
        .then(function (webFonts) {
          return Promise.all(
            webFonts.map(function (webFont) {
              return webFont.resolve()
            })
          )
        })
        .then(function (cssStrings) {
          return cssStrings.join('\n')
        })
    }

    function readAll() {
      return Promise.resolve(util.asArray(document.styleSheets))
        .then(getCssRules)
        .then(selectWebFontRules)
        .then(function (rules) {
          return rules.map(newWebFont)
        })

      function selectWebFontRules(cssRules) {
        return cssRules
          .filter(function (rule) {
            return rule.type === CSSRule.FONT_FACE_RULE
          })
          .filter(function (rule) {
            return inliner.shouldProcess(rule.style.getPropertyValue('src'))
          })
      }

      function getCssRules(styleSheets) {
        const cssRules = [];
        styleSheets.forEach(function (sheet) {
          try {
            util.asArray(sheet.cssRules || []).forEach(cssRules.push.bind(cssRules));
          } catch (e) {
            console.log('Error while reading CSS rules from ' + sheet.href, e.toString());
          }
        });
        return cssRules
      }

      function newWebFont(webFontRule) {
        return {
          resolve: function resolve() {
            const baseUrl = (webFontRule.parentStyleSheet || {}).href;
            return inliner.inlineAll(webFontRule.cssText, baseUrl)
          },
          src: function () {
            return webFontRule.style.getPropertyValue('src')
          },
        }
      }
    }
  }

  function newImages() {
    return {
      inlineAll: inlineAll,
      impl: {
        newImage: newImage,
      },
    }

    function newImage(element) {
      return {
        inline: inline,
      }

      function inline(get) {
        if (util.isDataUrl(element.src)) return Promise.resolve()

        return Promise.resolve(element.src)
          .then(get || util.getAndEncode)
          .then(function (data) {
            return util.dataAsUrl(data, util.mimeType(element.src))
          })
          .then(function (dataUrl) {
            return new Promise(function (resolve, reject) {
              element.onload = resolve;
              element.onerror = reject;
              element.src = dataUrl;
            })
          })
      }
    }

    function inlineAll(node) {
      if (!(node instanceof Element)) return Promise.resolve(node)

      return inlineBackground(node).then(function () {
        if (node instanceof HTMLImageElement) return newImage(node).inline()
        else
          return Promise.all(
            util.asArray(node.childNodes).map(function (child) {
              return inlineAll(child)
            })
          )
      })

      function inlineBackground(node) {
        const background = node.style.getPropertyValue('background');

        if (!background) return Promise.resolve(node)

        return inliner
          .inlineAll(background)
          .then(function (inlined) {
            node.style.setProperty('background', inlined, node.style.getPropertyPriority('background'));
          })
          .then(function () {
            return node
          })
      }
    }
  }

  /**
   * Traverse a dom tree and call a callback at each node.
   * @param {HTMLElement} node
   * @param {number} depth
   * @param {function} func
   */
  function traverse(node, depth, func) {
    if (!func(node, depth)) return
    node = node.firstChild;
    while (node) {
      traverse(node, depth + 1, func);
      node = node.nextSibling;
    }
  }

  /**
   * Computes the size of th element, including margins.
   * @param {HTMLElement} elem
   * @return {object}
   */
  function elemSize(elem) {
    const computedStyle = elem.computedStyleMap();
    const elmWidth = computedStyle.get('width').value;
    const elmMarginHorizontal = computedStyle.get('margin-left').value + computedStyle.get('margin-right').value;
    const elmHeight = computedStyle.get('height').value;
    const elmMarginVertical = computedStyle.get('margin-top').value + computedStyle.get('margin-bottom').value;
    return {
      width: elmWidth + elmMarginHorizontal,
      height: elmHeight + elmMarginVertical,
    }
  }

  const idx = 'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg"'.length;
  const renderElementUI = (elem, size, key, callback) => {
    domtoimage.toSvg(elem).then((uri) => {
      // To work around a bug in domtoimage, we insert a viewBox into the SVG that ensures it renders
      // all the way to the edges. otherwise, an image is generated that crops the left and bottom borders.
      const uri2 = uri.substring(0, idx) + ` viewBox="0 0 ${size.width} ${size.height}"` + uri.substring(idx);
      const image = new Image();
      image.onload = function () {
        callback(image, key);
      };
      // image.onerror = reject
      image.src = uri2;
    });
  };
  const plane = new zeaEngine.Plane(1, 1);

  /**
   * Class representing a VR controller UI.
   * @extends TreeItem
   */
  class VRControllerUI extends zeaEngine.TreeItem {
    /**
     * Create a VR controller UI.
     * @param {any} appData - The appData value.
     * @param {any} vrUIDOMElement - The vrUIDOMElement value.
     */
    constructor(appData, vrUIDOMElement) {
      super('VRControllerUI');

      this.setSelectable(false);
      this.appData = appData;
      this.__vrUIDOMElement = vrUIDOMElement;
      this.__vrUIDOMElement.style.display = 'none';

      // const debugGeomItem = new GeomItem('Debug', new Plane(1, 1), new Material('debug-ui-mat', 'FlatSurfaceShader'))
      // // Flip it over so we see the front.
      // const debugGeomItemXfo = new Xfo()
      // debugGeomItemXfo.ori.setFromAxisAndAngle(new Vec3(0, 1, 0), Math.PI)
      // this.addChild(debugGeomItem, false)

      const uiOffset = new zeaEngine.TreeItem('Offset');
      this.addChild(uiOffset, false);
      this.ready = false;

      /* */
      const resizeObserver = new ResizeObserver((entries) => {
        resizeObserver.disconnect();

        const localXfo = new zeaEngine.Xfo();
        const dpm = 0.0005; // dots-per-meter (1 each 1/2mm)
        localXfo.sc.set(dpm, dpm, dpm);
        localXfo.ori.setFromEulerAngles(new zeaEngine.EulerAngles(Math.PI, Math.PI, 0));
        // localXfo.ori.setFromAxisAndAngle(new Vec3(0, 1, 0), Math.PI)
        // localXfo.ori.setFromAxisAndAngle(new Vec3(1, 0, 0), Math.PI)
        uiOffset.getParameter('LocalXfo').setValue(localXfo);

        this.size = new zeaEngine.Vec3(vrUIDOMElement.clientWidth * dpm, vrUIDOMElement.clientHeight * dpm, 1);

        // debugGeomItemXfo.sc = this.size
        // debugGeomItem.getParameter('LocalXfo').setValue(debugGeomItemXfo)

        traverse(vrUIDOMElement, 0, (elem, depth) => {
          if (elem.className == 'button') {
            const size = elemSize(elem);
            // console.log(depth, elem.id, elem.className, size.width, size.height, elem.offsetLeft, elem.offsetTop)
            const localXfo = new zeaEngine.Xfo();

            localXfo.sc.set(size.width, -size.height, 1);

            // Note: The plane geom goes from [-0.5, -0.5] to [0.5, 0.5], so we need to offset it here.
            // To debug the placements of these UI elements, display tbe backing panel by making this class
            // in
            localXfo.tr.set(
              elem.offsetLeft + size.width * 0.5 - vrUIDOMElement.clientWidth * 0.5,
              elem.offsetTop + size.height * 0.5 - vrUIDOMElement.clientHeight * 0.5,
              -depth
            );

            const uimat = new zeaEngine.Material('element-vr-ui-mat', 'FlatSurfaceShader');
            uimat.getParameter('BaseColor').setValue(new zeaEngine.Color(0.3, 0.3, 0.3));
            const image = new zeaEngine.DataImage();
            uimat.getParameter('BaseColor').setValue(image);

            const geomItem = new zeaEngine.GeomItem('element-vr-ui', plane, uimat, localXfo);
            geomItem.setSelectable(false);
            uiOffset.addChild(geomItem, false);

            const imageDatas = {};
            if (size.width > 0 && size.height > 0) {
              renderElementUI(elem, size, elem.id + elem.className, (data, key) => {
                // console.log('Rendered', elem.id, elem.className, size.width, size.height, elem.offsetLeft, elem.offsetTop)
                imageDatas[key] = data;
                image.setData(size.width, size.height, data);
              });
            }

            const mutationObserver = new MutationObserver((mutations) => {
              if (size.width == 0 || size.height == 0) return
              // Each time the dome changes, we use the classList as a key to cache
              // the generated images. Update the UI by adding and removing classes
              const key = elem.id + elem.className;
              if (!imageDatas[key]) {
                renderElementUI(elem, size, key, (data, key) => {
                  imageDatas[key] = data;
                  image.setData(size.width, size.height, data);
                });
              } else {
                image.setData(size.width, size.height, imageDatas[key]);
              }
            });

            mutationObserver.observe(elem, {
              attributes: true,
              characterData: false,
              childList: false,
              subtree: false,
            });
            return false
          }
          return true
        });

        this.ready = true;
        this.emit('ready');
      });
      resizeObserver.observe(vrUIDOMElement);
      /* */
    }

    // ///////////////////////////////////

    /**
     * The activate method.
     */
    activate() {
      this.__vrUIDOMElement.style.display = 'block';
    }

    /**
     * The deactivate method.
     */
    deactivate() {
      this.__vrUIDOMElement.style.display = 'none';
    }

    /**
     * The sendMouseEvent method.
     * @param {any} eventName - The eventName param.
     * @param {any} args - The args param.
     * @param {any} element - The element param.
     * @return {any} The return value.
     */
    sendMouseEvent(eventName, args, element) {
      // console.log('sendMouseEvent:', eventName, element)

      const event = new MouseEvent(
        eventName,
        Object.assign(
          {
            target: element,
            view: window,
            bubbles: true,
            // composed: true,
            cancelable: true,
          },
          args
        )
      );

      // Dispatch the event to a leaf item in the DOM tree.
      element.dispatchEvent(event);

      // The event is re-cycled to generate a 'click' event on mouse down.
      return event
    }
  }

  /**
   * Class representing a VR UI tool.
   *
   * @extends BaseTool
   */
  class VRUITool extends zeaEngine.BaseTool {
    /**
     * Create a VR UI tool.
     * @param {object} appData - The appData value.
     * @param {HTMLElement} vrUIDOMElement - The  dom element we will use as the VR UI
     */
    constructor(appData, vrUIDOMElement) {
      super(appData);
      this.appData = appData;

      this.__vrUIDOMElement = vrUIDOMElement;
      this.controllerUI = new VRControllerUI(appData, this.__vrUIDOMElement);

      // To debug the UI in the renderer without being in VR, enable this line.
      // appData.renderer.addTreeItem(this.controllerUI)

      const pointermat = new zeaEngine.Material('pointermat', 'LinesShader');
      pointermat.setSelectable(false);
      pointermat.getParameter('BaseColor').setValue(new zeaEngine.Color(1.2, 0, 0));

      const line = new zeaEngine.Lines();
      line.setNumVertices(2);
      line.setNumSegments(1);
      line.setSegmentVertexIndices(0, 0, 1);
      const positions = line.getVertexAttribute('positions');
      positions.getValueRef(0).set(0.0, 0.0, 0.0);
      positions.getValueRef(1).set(0.0, 0.0, -1.0);
      line.setBoundingBoxDirty();
      this.__pointerLocalXfo = new zeaEngine.Xfo();
      this.__pointerLocalXfo.sc.set(1, 1, 0.1);
      this.__pointerLocalXfo.ori.setFromAxisAndAngle(new zeaEngine.Vec3(1, 0, 0), Math.PI * -0.2);

      this.__uiPointerItem = new zeaEngine.GeomItem('VRControllerPointer', line, pointermat);
      this.__uiPointerItem.setSelectable(false);

      this.__triggerHeld = false;
      this.uiOpen = false;

      this.appData.renderer.getXRViewport().then((xrvp) => {
        xrvp.on('presentingChanged', (event) => {
          if (this.uiOpen && !event.state) this.closeUI();
        });
      });
    }

    /**
     * The getName method.
     *
     * @return {string} The return value.
     */
    getName() {
      return 'VRUITool'
    }

    // ///////////////////////////////////
    /**
     * The activateTool method.
     */
    activateTool() {
      super.activateTool();
    }

    /**
     * The deactivateTool method.
     */
    deactivateTool() {
      if (this.uiOpen) this.closeUI();
      super.deactivateTool();
    }

    /**
     * The displayUI method.
     * @param {VRController} uiController - The uiController param.
     * @param {VRController} pointerController - The pointerController param.
     * @param {Xfo} headXfo - The headXfo param.
     */
    displayUI(uiController, pointerController, headXfo) {
      this.controllerUI.activate();
      this.uiController = uiController;
      this.pointerController = pointerController;

      const uiLocalXfo = this.controllerUI.getParameter('LocalXfo').getValue();
      uiLocalXfo.ori.setFromAxisAndAngle(new zeaEngine.Vec3(1, 0, 0), Math.PI * -0.6);
      // uiLocalXfo.tr.set(0, -0.05, 0.08)

      if (this.pointerController) {
        const xfoA = this.uiController.getTreeItem().getParameter('GlobalXfo').getValue();
        const xfoB = this.pointerController.getTreeItem().getParameter('GlobalXfo').getValue();
        const headToCtrlA = xfoA.tr.subtract(headXfo.tr);
        const headToCtrlB = xfoB.tr.subtract(headXfo.tr);
        if (headToCtrlA.cross(headToCtrlB).dot(headXfo.ori.getYaxis()) > 0.0) {
          uiLocalXfo.tr.set(0.05, -0.05, 0.08);
        } else {
          uiLocalXfo.tr.set(-0.05, -0.05, 0.08);
        }
      } else {
        uiLocalXfo.tr.set(0, -0.05, 0.08);
      }

      this.controllerUI.getParameter('LocalXfo').setValue(uiLocalXfo);

      if (this.uiController) {
        this.uiController.getTipItem().addChild(this.controllerUI, false);
        if (this.pointerController) this.pointerController.getTipItem().addChild(this.__uiPointerItem, false);

        if (this.appData.session) {
          const postMessage = () => {
            this.appData.session.pub('pose-message', {
              interfaceType: 'VR',
              showUIPanel: {
                controllerId: this.uiController.getId(),
                localXfo: uiLocalXfo.toJSON(),
                size: this.controllerUI.size.toJSON(),
              },
            });
          };
          if (!this.controllerUI.ready) {
            this.controllerUI.on('ready', postMessage);
          } else {
            postMessage();
          }
        }
      }
      this.uiOpen = true;
    }

    /**
     * The closeUI method.
     */
    closeUI() {
      this.controllerUI.deactivate();

      if (this.uiController) {
        this.uiController.getTipItem().removeChildByHandle(this.controllerUI);
        if (this.pointerController) {
          this.pointerController.getTipItem().removeChildByHandle(this.__uiPointerItem);
        }

        if (this.appData.session) {
          this.appData.session.pub('pose-message', {
            interfaceType: 'VR',
            closehideUIPanel: {
              controllerId: this.uiController.getId(),
            },
          });
        }
      }
      this.uiOpen = false;
    }

    // ///////////////////////////////////
    // VRController events

    /**
     * The setPointerLength method.
     * @param {number} length - The length param.
     */
    setPointerLength(length) {
      this.__pointerLocalXfo.sc.set(1, 1, length);
      this.__uiPointerItem.getParameter('LocalXfo').setValue(this.__pointerLocalXfo);
    }

    /**
     * The calcUIIntersection method.
     *
     * @return {object|undefined} The return value.
     */
    calcUIIntersection() {
      const pointerXfo = this.__uiPointerItem.getParameter('GlobalXfo').getValue();
      const pointerVec = pointerXfo.ori.getZaxis().negate();
      const ray = new zeaEngine.Ray(pointerXfo.tr, pointerVec);

      const planeXfo = this.controllerUI.getParameter('GlobalXfo').getValue();
      const planeSize = this.controllerUI.size.multiply(planeXfo.sc);

      const plane = new zeaEngine.Ray(planeXfo.tr, planeXfo.ori.getZaxis().negate());
      const res = ray.intersectRayPlane(plane);
      if (res <= 0) {
        // Let the pointer shine right past the UI.
        this.setPointerLength(0.5);
        return
      }
      const hitOffset = pointerXfo.tr.add(pointerVec.scale(res)).subtract(plane.start);
      const x = hitOffset.dot(planeXfo.ori.getXaxis()) / planeSize.x;
      const y = hitOffset.dot(planeXfo.ori.getYaxis()) / planeSize.y;
      if (Math.abs(x) > 0.5 || Math.abs(y) > 0.5) {
        // Let the pointer shine right past the UI.
        this.setPointerLength(0.5);
        return
      }
      this.setPointerLength(res / planeXfo.sc.z);
      const rect = this.__vrUIDOMElement.getBoundingClientRect();
      return {
        clientX: Math.round(x * -rect.width + rect.width / 2),
        clientY: Math.round(y * -rect.height + rect.height / 2),
      }
    }

    /**
     * The sendEventToUI method.
     * @param {string} eventName - The eventName param.
     * @param {any} args - The args param.
     * @return {any} The return value.
     */
    sendEventToUI(eventName, args) {
      const hit = this.calcUIIntersection();
      if (hit) {
        hit.offsetX = hit.pageX = hit.pageX = hit.screenX = hit.clientX;
        hit.offsetY = hit.pageY = hit.pageY = hit.screenY = hit.clientY;

        let element = document.elementFromPoint(hit.clientX, hit.clientY);
        if (element) {
          if (element.shadowRoot) element = element.shadowRoot.elementFromPoint(hit.clientX, hit.clientY);
          if (element != this._element) {
            if (this._element) this.controllerUI.sendMouseEvent('mouseleave', Object.assign(args, hit), this._element);
            this._element = element;
            this.controllerUI.sendMouseEvent('mouseenter', Object.assign(args, hit), this._element);
          }
          this.controllerUI.sendMouseEvent(eventName, Object.assign(args, hit), this._element);
        } else {
          this._element = null;
        }
        return this._element
      } else if (this._element) {
        this.controllerUI.sendMouseEvent('mouseleave', Object.assign(args, hit), this._element);
        this._element = null;
      }
    }

    /**
     * The onVRControllerButtonDown method.
     * @param {object} event - The event param.
     */
    onPointerDown(event) {
      if (event.pointerType === zeaEngine.POINTER_TYPES.xr) {
        if (event.controller == this.pointerController && this.uiOpen) {
          this.__triggerHeld = true;
          const target = this.sendEventToUI('mousedown', {
            button: event.button - 1,
          });
          if (target) {
            this.__triggerDownElem = target;
          } else {
            this.__triggerDownElem = null;
          }
          // While the UI is open, no other tools get events.
          event.stopPropagation();
        }
      }
    }

    /**
     * The onVRControllerButtonUp method.
     * @param {object} event - The event param.
     */
    onPointerUp(event) {
      if (event.pointerType === zeaEngine.POINTER_TYPES.xr) {
        if (event.controller == this.pointerController && this.uiOpen) {
          this.__triggerHeld = false;
          const target = this.sendEventToUI('mouseup', {
            button: event.button - 1,
          });
          if (target && this.__triggerDownElem == target) {
            this.sendEventToUI('mouseup', {
              button: event.button - 1,
            });
          }
          this.__triggerDownElem = null;
          // While the UI is open, no other tools get events.
          event.stopPropagation();
        }
      }
    }

    /**
     * The onVRPoseChanged method.
     * @param {object} event - The event param.
     */
    onPointerMove(event) {
      if (event.pointerType === zeaEngine.POINTER_TYPES.xr) {
        if (!this.uiOpen) {
          if (
            !event.controllers[0] ||
            event.controllers[0].buttonPressed ||
            !event.controllers[1] ||
            event.controllers[1].buttonPressed
          ) {
            return
          }
          // Controller coordinate system
          // X = Horizontal.
          // Y = Up.
          // Z = Towards handle base.
          const headXfo = event.viewXfo;
          const checkControllers = (ctrlA, ctrlB) => {
            // Note: do not open the UI when the controller buttons are pressed.
            const xfoA = ctrlA.getTreeItem().getParameter('GlobalXfo').getValue();
            const headToCtrlA = xfoA.tr.subtract(headXfo.tr);
            headToCtrlA.normalizeInPlace();
            if (headToCtrlA.angleTo(xfoA.ori.getYaxis()) < Math.PI * 0.25) {
              this.displayUI(ctrlA, ctrlB, headXfo);
              event.setCapture(this);
              event.stopPropagation();
              return true
            }
            return false
          };

          if (checkControllers(event.controllers[0], event.controllers[1])) return
          if (checkControllers(event.controllers[1], event.controllers[0])) return
        } else {
          // Controller coordinate system
          // X = Horizontal.
          // Y = Up.
          // Z = Towards handle base.
          const headXfo = event.viewXfo;
          const checkControllers = () => {
            const xfoA = this.uiController.getTreeItem().getParameter('GlobalXfo').getValue();
            const headToCtrlA = xfoA.tr.subtract(headXfo.tr);
            headToCtrlA.normalizeInPlace();
            if (headToCtrlA.angleTo(xfoA.ori.getYaxis()) > Math.PI * 0.5) {
              // Remove ourself from the system.
              this.closeUI();
              if (event.getCapture() == this) {
                event.releaseCapture(this);
              }
              return false
            }
            return true
          };

          if (checkControllers()) {
            this.sendEventToUI('mousemove', {});
          }
          // While the UI is open, no other tools get events.
          event.stopPropagation();
        }
      }
    }
  }

  /**
   * Class representing a hold objects change.
   *
   * @extends Change
   */
  class HoldObjectsChange extends Change {
    /**
     * Create a hold objects change.
     *
     * @param {object} data - The data value.
     */
    constructor(data) {
      super('HoldObjectsChange');

      this.__selection = [];
      this.__prevXfos = [];
      this.__newXfos = [];

      if (data) this.update(data);
    }

    /**
     * The undo method.
     */
    undo() {
      for (let i = 0; i < this.__selection.length; i++) {
        if (this.__selection[i] && this.__prevXfos[i]) {
          this.__selection[i].getParameter('GlobalXfo').setValue(this.__prevXfos[i]);
        }
      }
    }

    /**
     * The redo method.
     */
    redo() {
      for (let i = 0; i < this.__selection.length; i++) {
        if (this.__selection[i] && this.__newXfos[i]) {
          this.__selection[i].getParameter('GlobalXfo').setValue(this.__newXfos[i]);
        }
      }
    }

    /**
     * The update method.
     * @param {object} updateData - The updateData param.
     */
    update(updateData) {
      if (updateData.newItem) {
        this.__selection[updateData.newItemId] = updateData.newItem;
        this.__prevXfos[updateData.newItemId] = updateData.newItem.getParameter('GlobalXfo').getValue();
      } else if (updateData.changeXfos) {
        for (let i = 0; i < updateData.changeXfoIds.length; i++) {
          const gidx = updateData.changeXfoIds[i];
          if (!this.__selection[gidx]) continue
          this.__selection[gidx].getParameter('GlobalXfo').setValue(updateData.changeXfos[i]);
          this.__newXfos[gidx] = updateData.changeXfos[i];
        }
      }
      this.emit('updated', updateData);
    }

    /**
     * The toJSON method.
     * @param {object} context - The context param.
     * @return {object} The return value.
     */
    toJSON(context) {
      const j = super.toJSON(context);

      const itemPaths = [];
      for (let i = 0; i < this.__selection.length; i++) {
        if (this.__selection[i]) {
          itemPaths[i] = this.__selection[i].getPath();
        } else {
          itemPaths.push(null);
        }
      }
      j.itemPaths = itemPaths;

      return j
    }

    /**
     * The fromJSON method.
     * @param {object} j - The j param.
     * @param {object} context - The context param.
     */
    fromJSON(j, context) {
      super.fromJSON(j, context);

      const sceneRoot = context.appData.scene.getRoot();
      this.__selection = [];
      for (let i = 0; i < j.itemPaths.length; i++) {
        const itemPath = j.itemPaths[i];
        if (itemPath && itemPath != '') {
          const newItem = sceneRoot.resolvePath(itemPath, 1);
          if (newItem != sceneRoot) {
            this.__selection[i] = newItem;
            this.__prevXfos[i] = newItem.getParameter('GlobalXfo').getValue();
          }
        }
      }
    }

    /**
     * Updates the state of an existing identified `Parameter` through replication.
     *
     * @param {object} j - The j param.
     */
    updateFromJSON(j) {
      this.update(j);
    }
  }

  UndoRedoManager.registerChange('HoldObjectsChange', HoldObjectsChange);

  /**
   * Class representing a VR hold objects tool.
   * @extends BaseTool
   */
  class VRHoldObjectsTool extends zeaEngine.BaseTool {
    /**
     * Create a VR hold objects tool.
     * @param {object} appData - The appData value.
     */
    constructor(appData) {
      super(appData);

      this.appData = appData;
      this.__pressedButtonCount = 0;

      this.__freeIndices = [];
      this.__vrControllers = [];
      this.__heldObjectCount = 0;
      this.__heldGeomItems = [];
      this.__highlightedGeomItemIds = []; // controller id to held goem id.
      this.__heldGeomItemIds = []; // controller id to held goem id.
      this.__heldGeomItemRefs = [];
      this.__heldGeomItemOffsets = [];
    }

    /**
     * The activateTool method.
     */
    activateTool() {
      super.activateTool();

      this.appData.renderer.getGLCanvas().style.cursor = 'crosshair';

      const addIconToController = (controller) => {
        // The tool might already be deactivated.
        if (!this.__activated) return
        // const cross = new Cross(0.03)
        // const mat = new Material('Cross', 'FlatSurfaceShader')
        // mat.getParameter('BaseColor').setValue(new Color('#03E3AC'))
        // mat.visibleInGeomDataBuffer = false
        // const geomItem = new GeomItem('HandleToolTip', cross, mat)
        // controller.getTipItem().removeAllChildren()
        // controller.getTipItem().addChild(geomItem, false)
      };

      this.appData.renderer.getXRViewport().then((xrvp) => {
        for (const controller of xrvp.getControllers()) {
          addIconToController();
        }
        this.addIconToControllerId = xrvp.on('controllerAdded', (event) => addIconToController(event.controller));
      });
    }

    /**
     * The deactivateTool method.
     */
    deactivateTool() {
      super.deactivateTool();

      this.appData.renderer.getXRViewport().then((xrvp) => {
        // for(let controller of xrvp.getControllers()) {
        //   controller.getTipItem().removeAllChildren();
        // }
        xrvp.removeListenerById('controllerAdded', this.addIconToControllerId);
      });
    }

    // ///////////////////////////////////
    // VRController events

    /**
     * The computeGrabXfo method.
     * @param {array} refs - The refs param.
     * @return {Xfo} The return value.
     */
    computeGrabXfo(refs) {
      let grabXfo;
      if (refs.length == 1) {
        grabXfo = this.__vrControllers[refs[0]].getTipXfo();
      } else if (refs.length == 2) {
        const xfo0 = this.__vrControllers[refs[0]].getTipXfo();
        const xfo1 = this.__vrControllers[refs[1]].getTipXfo();

        xfo0.ori.alignWith(xfo1.ori);

        grabXfo = new zeaEngine.Xfo();
        grabXfo.tr = xfo0.tr.lerp(xfo1.tr, 0.5);
        grabXfo.ori = xfo0.ori.lerp(xfo1.ori, 0.5);

        let vec0 = xfo1.tr.subtract(xfo0.tr);
        vec0.normalizeInPlace();
        const vec1 = grabXfo.ori.getXaxis();
        if (vec0.dot(vec1) < 0.0) vec0 = vec0.negate();

        const angle = vec0.angleTo(vec1);
        if (angle > 0) {
          const axis = vec1.cross(vec0);
          axis.normalizeInPlace();
          const align = new zeaEngine.Quat();
          align.setFromAxisAndAngle(axis, angle);
          grabXfo.ori = align.multiply(grabXfo.ori);
        }
      }
      return grabXfo
    }

    /**
     * The initAction method.
     */
    initAction() {
      for (let i = 0; i < this.__heldGeomItems.length; i++) {
        const heldGeom = this.__heldGeomItems[i];
        if (!heldGeom) continue
        const grabXfo = this.computeGrabXfo(this.__heldGeomItemRefs[i]);
        this.__heldGeomItemOffsets[i] = grabXfo.inverse().multiply(heldGeom.getParameter('GlobalXfo').getValue());
      }
    }

    /**
     * Event fired when a pointing device button is pressed
     *
     * @param {MouseEvent} event - The event param.
     */
    onPointerDown(event) {
      if (event.pointerType === zeaEngine.POINTER_TYPES.xr) {
        const id = event.controller.getId();
        this.__vrControllers[id] = event.controller;

        // const intersectionData = event.controller.getGeomItemAtTip()
        const geomItem = this.__highlightedGeomItemIds[id];
        if (geomItem) {
          // if (geomItem.getOwner() instanceof Handle) return false

          // console.log("onMouseDown on Geom"); // + " Material:" + geomItem.getMaterial().name);
          // console.log(geomItem.getPath()) // + " Material:" + geomItem.getMaterial().name);

          let gidx = this.__heldGeomItems.indexOf(geomItem);
          if (gidx == -1) {
            gidx = this.__heldGeomItems.length;
            this.__heldObjectCount++;
            this.__heldGeomItems.push(geomItem);
            this.__heldGeomItemRefs[gidx] = [id];
            this.__heldGeomItemIds[id] = gidx;

            const changeData = {
              newItem: geomItem,
              newItemId: gidx,
            };
            if (!this.change) {
              this.change = new HoldObjectsChange(changeData);
              UndoRedoManager.getInstance().addChange(this.change);
            } else {
              this.change.update(changeData);
            }
          } else {
            this.__heldGeomItemIds[id] = gidx;
            this.__heldGeomItemRefs[gidx].push(id);
          }
          this.initAction();
          event.stopPropagation();
        }
      }
    }

    /**
     * Event fired when a pointing device button is released while the pointer is over the tool.
     *
     * @param {MouseEvent} event - The event param.
     */
    onPointerUp(event) {
      if (event.pointerType === zeaEngine.POINTER_TYPES.xr) {
        const id = event.controller.getId();

        this.__pressedButtonCount--;
        if (this.__heldGeomItemIds[id] !== undefined) {
          const gidx = this.__heldGeomItemIds[id];
          const refs = this.__heldGeomItemRefs[gidx];
          refs.splice(refs.indexOf(id), 1);
          if (refs.length == 0) {
            this.__heldObjectCount--;
            this.__heldGeomItems[gidx] = undefined;

            this.change = undefined;
          }
          this.__heldGeomItemIds[id] = undefined;
          this.initAction();
          event.stopPropagation();
        }
      }
    }

    /**
     * Event fired when a pointing device is moved
     *
     * @param {MouseEvent} event - The event param.
     */
    onPointerMove(event) {
      if (event.pointerType === zeaEngine.POINTER_TYPES.xr) {
        if (!this.change) {
          event.controllers.forEach((controller) => {
            const id = controller.getId();
            const intersectionData = controller.getGeomItemAtTip();
            if (intersectionData) {
              const geomItem = intersectionData.geomItem;
              if (this.__highlightedGeomItemIds[id] != geomItem) {
                if (this.__highlightedGeomItemIds[id]) {
                  this.__highlightedGeomItemIds[id].removeHighlight('vrHoldObject');
                }
                geomItem.addHighlight('vrHoldObject', new zeaEngine.Color(1, 0, 0, 0.2));
                this.__highlightedGeomItemIds[id] = geomItem;
              }
            } else {
              if (this.__highlightedGeomItemIds[id]) {
                const geomItem = this.__highlightedGeomItemIds[id];
                geomItem.removeHighlight('vrHoldObject');
                this.__highlightedGeomItemIds[id] = null;
              }
            }
          });

          return
        }

        const changeXfos = [];
        const changeXfoIds = [];
        for (let i = 0; i < this.__heldGeomItems.length; i++) {
          const heldGeom = this.__heldGeomItems[i];
          if (!heldGeom) continue
          const grabXfo = this.computeGrabXfo(this.__heldGeomItemRefs[i]);
          changeXfos.push(grabXfo.multiply(this.__heldGeomItemOffsets[i]));
          changeXfoIds.push(i);
        }

        this.change.update({ changeXfos, changeXfoIds });

        event.stopPropagation();
      }
    }

    /**
     * Event fired when a pointing device button is double clicked on the tool.
     *
     * @param {MouseEvent} event - The event param.
     */
    onPointerDoublePress(event) {
      if (event.pointerType === zeaEngine.POINTER_TYPES.xr) ;
    }
  }

  /**
   * Class representing a primary create tool.
   *
   * @extends BaseTool
   */
  class BaseCreateTool extends zeaEngine.BaseTool {
    /**
     * Creates an instance of BaseCreateTool.
     *
     * @param {object} appData - The appData value.
     */
    constructor(appData) {
      super(appData);
    }

    /**
     * Checks if the tool is a primary tool or not.
     *
     * @return {boolean} - Returns `true`.
     */
    isPrimaryTool() {
      return true
    }
  }

  /**
   * Base class for creating geometry tools.
   *
   * @extends BaseCreateTool
   */
  class CreateGeomTool extends BaseCreateTool {
    /**
     * Create a create geom tool.
     *
     * @param {object} appData - The appData value.
     */
    constructor(appData) {
      super(appData);

      if (!appData) console.error('App data not provided to tool');
      this.appData = appData;
      this.stage = 0;
      this.removeToolOnRightClick = true;
      this.parentItem = 'parentItem' in appData ? appData.parentItem : appData.scene.getRoot();

      this.colorParam = this.addParameter(new zeaEngine.ColorParameter('Color', new zeaEngine.Color(0.7, 0.2, 0.2)));

      this.controllerAddedHandler = this.controllerAddedHandler.bind(this);
    }

    addIconToVRController(controller) {
      if (!this.vrControllerToolTip) {
        this.vrControllerToolTip = new zeaEngine.Cross(0.05);
        this.vrControllerToolTipMat = new zeaEngine.Material('VRController Cross', 'LinesShader');
        this.vrControllerToolTipMat.getParameter('BaseColor').setValue(this.colorParam.getValue());
        this.vrControllerToolTipMat.setSelectable(false);
      }
      const geomItem = new zeaEngine.GeomItem('CreateGeomToolTip', this.vrControllerToolTip, this.vrControllerToolTipMat);
      geomItem.setSelectable(false);
      // controller.getTipItem().removeAllChildren()
      controller.getTipItem().addChild(geomItem, false);
    }

    controllerAddedHandler(event) {
      this.addIconToVRController(event.controller);
    }

    /**
     * The activateTool method.
     */
    activateTool() {
      super.activateTool();

      this.prevCursor = this.appData.renderer.getGLCanvas().style.cursor;
      this.appData.renderer.getGLCanvas().style.cursor = 'crosshair';

      this.appData.renderer.getXRViewport().then((xrvp) => {
        for (const controller of xrvp.getControllers()) {
          this.addIconToVRController(controller);
        }
        xrvp.on('controllerAdded', this.controllerAddedHandler);
      });
    }

    /**
     * The deactivateTool method.
     */
    deactivateTool() {
      super.deactivateTool();

      this.appData.renderer.getGLCanvas().style.cursor = this.prevCursor;

      this.appData.renderer.getXRViewport().then((xrvp) => {
        // for(let controller of xrvp.getControllers()) {
        //   controller.getTipItem().removeAllChildren();
        // }
        xrvp.off('controllerAdded', this.controllerAddedHandler);
      });
    }

    /**
     * Transforms the screen position in the viewport to an Xfo object.
     *
     * @param {MouseEvent|TouchEvent} event - The event param
     * @return {Xfo} The return value.
     */
    screenPosToXfo(event) {
      const ray = event.pointerRay;
      const planeRay = new zeaEngine.Ray(this.constructionPlane.tr, this.constructionPlane.ori.getZaxis());
      const dist = ray.intersectRayPlane(planeRay);
      if (dist > 0.0) {
        const xfo = this.constructionPlane.clone();
        xfo.tr = ray.pointAtDist(dist);
        return xfo
      }

      const camera = event.viewport.getCamera();
      const xfo = camera.getParameter('GlobalXfo').getValue().clone();
      xfo.tr = ray.pointAtDist(camera.getFocalDistance());
      return xfo
    }

    /**
     * Starts the creation of the geometry.
     *
     * @param {Xfo} xfo - The xfo param.
     */
    createStart(xfo) {
      this.stage = 1;
    }

    /**
     * The createPoint method.
     *
     * @param {Vec3} pt - The pt param.
     */
    createPoint(pt) {
      // console.warn('Implement me')
    }

    /**
     * The createMove method.
     *
     * @param {Vec3} pt - The pt param.
     */
    createMove(pt) {
      // console.warn('Implement me')
    }

    /**
     * The createRelease method.
     *
     * @param {Vec3} pt - The pt param.
     */
    createRelease(pt) {
      // console.warn('Implement me')
    }

    // ///////////////////////////////////
    // Mouse events

    /**
     * Event fired when a pointing device button is pressed over the viewport while the tool is activated.
     *
     * @param {MouseEvent|TouchEvent} event - The event param.
     */
    onPointerDown(event) {
      // skip if the alt key is held. Allows the camera tool to work
      if (event.pointerType === zeaEngine.POINTER_TYPES.xr) {
        this.onVRControllerButtonDown(event);
      } else {
        if (event.altKey) return
        if (this.stage == 0) {
          if (event.button == 0 || event.pointerType !== 'mouse') {
            this.constructionPlane = new zeaEngine.Xfo();

            const xfo = this.screenPosToXfo(event);
            this.createStart(xfo);
            event.stopPropagation();
          } else if (event.button == 2) ;
        } else if (event.button == 2) {
          // Cancel the draw action.
          UndoRedoManager.getInstance().cancel();
          this.stage = 0;
        }
      }

      event.stopPropagation();
    }

    /**
     * Event fired when a pointing device is moved while the cursor's hotspot is inside the viewport, while tool is activated.
     *
     * @param {MouseEvent|TouchEvent} event - The event param.
     */
    onPointerMove(event) {
      if (event.pointerType === zeaEngine.POINTER_TYPES.xr) {
        this.onVRPoseChanged(event);
      } else if (this.stage > 0) {
        const xfo = this.screenPosToXfo(event);
        this.createMove(xfo.tr);
        event.stopPropagation();
      }
    }

    /**
     * Event fired when a pointing device button is released while the pointer is over the viewport, while the tool is activated.
     *
     * @param {MouseEvent|TouchEvent} event - The event param.
     */
    onPointerUp(event) {
      if (event.pointerType === zeaEngine.POINTER_TYPES.xr) {
        this.onVRControllerButtonUp(event);
      } else if (this.stage > 0) {
        const xfo = this.screenPosToXfo(event);
        this.createRelease(xfo.tr);
        event.stopPropagation();
      }
    }

    /**
     * Event fired when the user rotates the pointing device wheel, while the tool is activated.
     *
     * @param {MouseEvent} event - The event param.
     */
    onWheel(event) {
      // console.warn('Implement me')
    }

    // ///////////////////////////////////
    // Keyboard events

    /**
     * Event fired when the user presses a key on the keyboard, while the tool is activated.
     *
     * @param {KeyboardEvent} event - The event param.
     */
    onKeyPressed(event) {
      // console.warn('Implement me')
    }

    /**
     * Event fired when the user presses down a key on the keyboard, while the tool is activated.
     *
     * @param {KeyboardEvent} event - The event param.
     */
    onKeyDown(event) {
      // console.warn('Implement me')
    }

    /**
     * Event fired when the user releases a key on the keyboard.
     *
     * @param {KeyboardEvent} event - The event param.
     */
    onKeyUp(event) {
      // console.warn('Implement me')
    }

    // ///////////////////////////////////

    /**
     * Event fired when one or more touch points have been disrupted in an implementation-specific manner inside the viewport, when the tool is activated.
     *
     * @param {TouchEvent} event - The event param.
     */
    onTouchCancel(event) {
      // console.warn('Implement me')
    }

    // ///////////////////////////////////
    // VRController events

    /**
     * Event fired when a VR controller button is pressed inside the viewport, when the tool is activated.
     *
     * @param {object} event - The event param.
     * @return {boolean} The return value.
     */
    onVRControllerButtonDown(event) {
      if (!this.__activeController) {
        // TODO: Snap the Xfo to any nearby construction planes.
        this.__activeController = event.controller;
        this.constructionPlane = new zeaEngine.Xfo();
        const xfo = this.constructionPlane.clone();
        xfo.tr = this.__activeController.getTipXfo().tr;
        this.createStart(xfo, this.appData.scene.getRoot());
      }
      event.stopPropagation();
    }

    /**
     * The onVRPoseChanged method.
     *
     * @param {object} event - The event param.
     * @return {boolean} The return value.
     */
    onVRPoseChanged(event) {
      if (this.__activeController && this.stage > 0) {
        // TODO: Snap the Xfo to any nearby construction planes.
        const xfo = this.__activeController.getTipXfo();
        this.createMove(xfo.tr);
        event.stopPropagation();
      }
    }

    /**
     * Event fired when a VR controller button is released inside the viewport, when the tool is activated.
     *
     * @param {object} event - The event param.
     * @return {boolean} The return value.
     */
    onVRControllerButtonUp(event) {
      if (this.stage > 0) {
        if (this.__activeController == event.controller) {
          const xfo = this.__activeController.getTipXfo();
          this.createRelease(xfo.tr);
          if (this.stage == 0) this.__activeController = undefined;
          event.stopPropagation();
        }
      }
    }
  }

  /**
   * Class representing a create geom change.
   *
   * @extends Change
   */
  class CreateGeomChange extends Change {
    /**
     * Create a create circle change.
     * @param {string} name - The name value.
     */
    constructor(name) {
      super(name);
    }

    /**
     * The setParentAndXfo method.
     * @param {TreeItem} parentItem - The parentItem param.
     * @param {Xfo} xfo - The xfo param.
     */
    setParentAndXfo(parentItem, xfo) {
      this.parentItem = parentItem;
      const name = this.parentItem.generateUniqueName(this.geomItem.getName());
      this.geomItem.setName(name);
      this.geomItem.getParameter('GlobalXfo').setValue(xfo);
      this.parentItem.addChild(this.geomItem);

      // this.geomItem.addRef(this) // keep a ref to stop it being destroyed
    }

    /**
     * Removes recently created geometry from its parent.
     */
    undo() {
      this.parentItem.removeChild(this.parentItem.getChildIndex(this.geomItem));
    }

    /**
     * Restores recently created geometry and adds it to the specified parent tree item.
     */
    redo() {
      this.parentItem.addChild(this.geomItem, false, false);
    }

    /**
     * Serializes the change as a JSON object.
     *
     * @param {object} context - The context value
     * @return {object} - The serialized change
     */
    toJSON(context) {
      const j = super.toJSON(context);
      j.parentItemPath = this.parentItem.getPath();
      j.geomItemName = this.geomItem.getName();
      j.geomItemXfo = this.geomItem.getParameter('LocalXfo').getValue();

      const material = this.geomItem.getParameter('Material').getValue();
      j.color = material.getParameter('BaseColor').getValue();
      return j
    }

    /**
     * Restores geometry from using the specified JSON
     *
     * @param {object} j - The j param.
     * @param {object} context - The appData param.
     */
    fromJSON(j, context) {
      const sceneRoot = context.appData.scene.getRoot();
      this.parentItem = sceneRoot.resolvePath(j.parentItemPath, 1);
      this.geomItem.setName(this.parentItem.generateUniqueName(j.geomItemName));
      const xfo = new zeaEngine.Xfo();
      xfo.fromJSON(j.geomItemXfo);
      this.geomItem.getParameter('LocalXfo').setValue(xfo);
      this.childIndex = this.parentItem.addChild(this.geomItem, false);

      if (j.color) {
        const color = new zeaEngine.Color(0.7, 0.2, 0.2);
        color.fromJSON(j.color);
        const material = this.geomItem.getParameter('Material').getValue();
        material.getParameter('BaseColor').setValue(color);
      }
    }

    // updateFromJSON(j) {
    //   if (this.__newValue.fromJSON)
    //     this.__newValue.fromJSON(j.value);
    //   else
    //     this.__newValue = j.value;
    // }

    /**
     * Removes geometry item reference from change change.
     */
    destroy() {
      // this.geomItem.removeRef(this) // remove the tmp ref.
    }
  }

  /**
   * Class representing a create line change.
   *
   * **Events**
   * * **updated:** Triggered when the change is updated
   *
   * @extends CreateGeomChange
   */
  class CreateLineChange extends CreateGeomChange {
    /**
     * Create a create line change.
     *
     * @param {TreeItem} parentItem - The parentItem value.
     * @param {Xfo} xfo - The xfo value.
     * @param {Color} color - The color value.
     * @param {number} thickness - The thickness value.
     */
    constructor(parentItem, xfo, color, thickness) {
      super('Create Line');

      this.line = new zeaEngine.Lines(0.0);
      this.line.setNumVertices(2);
      this.line.setNumSegments(1);
      this.line.setSegmentVertexIndices(0, 0, 1);

      const material = new zeaEngine.Material('Line', 'FatLinesShader');
      material.getParameter('BaseColor').setValue(new zeaEngine.Color(0.7, 0.2, 0.2));
      this.geomItem = new zeaEngine.GeomItem('Line', this.line, material);

      if (color) {
        material.getParameter('BaseColor').setValue(color);
      }

      if (thickness) {
        this.line.lineThickness = thickness;
      }

      if (parentItem && xfo) {
        this.setParentAndXfo(parentItem, xfo);
      }
    }

    /**
     * Updates Line using the specified data.
     *
     * @param {object} updateData - The updateData param.
     */
    update(updateData) {
      if (updateData.p1) {
        this.line.getVertexAttribute('positions').getValueRef(1).setFromOther(updateData.p1);
        this.line.emit('geomDataChanged');
      }

      this.emit('updated', updateData);
    }

    /**
     * Restores line geometry using a JSON object.
     *
     * @param {object} j - The j param.
     * @param {object} context - The context param.
     */
    fromJSON(j, context) {
      super.fromJSON(j, context);
      if (j.color) {
        const color = new zeaEngine.Color();
        color.fromJSON(j.color);
        material.getParameter('BaseColor').setValue(color);
      }

      if (j.thickness) {
        this.line.lineThickness = j.thickness;
      }
    }
  }

  UndoRedoManager.registerChange('CreateLineChange', CreateLineChange);

  /**
   * Tool for creating a line tool.
   *
   * **Events**
   * * **actionFinished:** Triggered when the creation of the geometry is completed.
   *
   * @extends CreateGeomTool
   */
  class CreateLineTool extends CreateGeomTool {
    /**
     * Create a create line tool.
     * @param {object} appData - The appData value.
     */
    constructor(appData) {
      super(appData);

      this.lineThickness = this.addParameter(new zeaEngine.NumberParameter('LineThickness', 0.01, [0, 0.1])); // 1cm.
    }

    /**
     * Starts line geometry creation.
     *
     * @param {Xfo} xfo - The xfo param.
     */
    createStart(xfo) {
      this.change = new CreateLineChange(this.parentItem, xfo);
      UndoRedoManager.getInstance().addChange(this.change);

      this.xfo = xfo.inverse();
      this.stage = 1;
      this.length = 0.0;
    }

    /**
     * Updates line structural data.
     *
     * @param {Vec3} pt - The pt param.
     */
    createMove(pt) {
      const offset = this.xfo.transformVec3(pt);
      this.length = offset.length();
      this.change.update({ p1: offset });
    }

    /**
     * Finishes Line geometry creation.
     *
     * @param {Vec3} pt - The pt param.
     */
    createRelease(pt) {
      if (this.length == 0) {
        UndoRedoManager.getInstance().cancel();
      }
      this.stage = 0;
      this.emit('actionFinished');
    }

    /**
     * The onVRControllerButtonDown method.
     *
     * @param {object} event - The event param.
     */
    onVRControllerButtonDown(event) {
      if (this.stage == 0) {
        const stageScale = event.viewport.__stageScale;
        this.lineThickness.setValue(stageScale * 0.003);
      }
      super.onVRControllerButtonDown(event);
    }
  }

  /**
   * Class representing a create cone change.
   *
   * **Events**
   * * **updated:** Triggered when the change is updated
   *
   * @extends CreateGeomChange
   */
  class CreateConeChange extends CreateGeomChange {
    /**
     * Create a create cone change.
     *
     * @param {TreeItem} parentItem - The parentItem value.
     * @param {Xfo} xfo - The xfo value.
     */
    constructor(parentItem, xfo, color) {
      super('Create Cone');

      const cone = new zeaEngine.Cone(0.0, 0.0);
      const material = new zeaEngine.Material('Cone', 'SimpleSurfaceShader');
      this.geomItem = new zeaEngine.GeomItem('Cone', cone, material);

      if (parentItem && xfo) {
        material.getParameter('BaseColor').setValue(color);
        this.setParentAndXfo(parentItem, xfo);
      }
    }

    /**
     * Updates cone with the specified data.
     *
     * @param {object} updateData - The updateData param.
     */
    update(updateData) {
      if (updateData.radius)
        this.geomItem.getParameter('Geometry').getValue().getParameter('Radius').setValue(updateData.radius);
      if (updateData.height)
        this.geomItem.getParameter('Geometry').getValue().getParameter('Height').setValue(updateData.height);

      this.emit('updated', updateData);
    }
  }

  UndoRedoManager.registerChange('CreateConeChange', CreateConeChange);

  /**
   * Tool for creating a Cone geometry.
   *
   * **Events**
   * * **actionFinished:** Triggered when the creation of the geometry is completed.
   *
   * @extends CreateGeomTool
   */
  class CreateConeTool extends CreateGeomTool {
    /**
     * Create a create cone tool.
     * @param {object} appData - The appData value.
     */
    constructor(appData) {
      super(appData);
    }

    /**
     * Starts the creation of the geometry.
     *
     * @param {Xfo} xfo - The xfo param.
     */
    createStart(xfo) {
      this.xfo = xfo;
      this.invXfo = xfo.inverse();
      this.change = new CreateConeChange(this.parentItem, xfo, this.colorParam.getValue());
      UndoRedoManager.getInstance().addChange(this.change);

      this.stage = 1;
      this._radius = 0.0;
      this._height = 0.0;
    }

    /**
     * Updates Cone geometry structural properties.
     *
     * @param {Vec3} pt - The pt param.
     */
    createMove(pt) {
      if (this.stage == 1) {
        const vec = pt.subtract(this.xfo.tr);
        // TODO: Rotate the cone so the base is aligned with the vector towards the controller
        this._radius = vec.length();
        this.change.update({ radius: this._radius });
      } else {
        this._height = this.invXfo.transformVec3(pt).y;
        this.change.update({ height: this._height });
      }
    }

    /**
     * Finishes the creation of the Cone.
     *
     * @param {Vec3} pt - The pt param.
     */
    createRelease(pt) {
      if (this._radius == 0) {
        UndoRedoManager.getInstance().cancel();
        this.stage = 0;
        this.emit('actionFinished');
      }
      if (this.stage == 1) {
        this.stage = 2;

        const quat = new zeaEngine.Quat();
        quat.setFromAxisAndAngle(new zeaEngine.Vec3(1, 0, 0), Math.PI * 0.5);
        this.constructionPlane.ori = this.constructionPlane.ori.multiply(quat);
        this.constructionPlane.tr = pt;
        this.invXfo = this.constructionPlane.inverse();
      } else if (this.stage == 2) {
        this.stage = 0;
        this.emit('actionFinished');
      }
    }
  }

  /**
   * Class representing a create circle change.
   *
   * **Events**
   * * **updated:** Triggered when the change is updated
   *
   * @extends CreateGeomChange
   */
  class CreateCircleChange extends CreateGeomChange {
    /**
     * Creates an instance of CreateCircleChange.
     *
     * @param {TreeItem} parentItem - The parentItem value.
     * @param {Xfo} xfo - The xfo value.
     */
    constructor(parentItem, xfo) {
      super('CreateCircle');

      this.circle = new zeaEngine.Circle(0, 64);
      this.circle.lineThickness = 0.05;

      const material = new zeaEngine.Material('circle', 'FatLinesShader');
      material.getParameter('BaseColor').setValue(new zeaEngine.Color(0.7, 0.2, 0.2));

      this.geomItem = new zeaEngine.GeomItem('Circle', this.circle, material);

      if (parentItem && xfo) {
        this.setParentAndXfo(parentItem, xfo);
      }
    }

    /**
     * Updates circle with the specified data.
     *
     * @param {object} updateData - The updateData param.
     */
    update(updateData) {
      this.circle.getParameter('Radius').setValue(updateData.radius);
      this.emit('updated', updateData);
    }

    /**
     * Serializes change as a JSON object.
     *
     * @return {object} - The return value.
     */
    toJSON() {
      const j = super.toJSON();
      j.radius = this.circle.getParameter('Radius').getValue();
      return j
    }

    /**
     * Updates circle with the specified JSON
     *
     * @param {object} j - The j param.
     */
    updateFromJSON(j) {
      console.log('CreateCircleChange:', j);
      if (j.radius) this.circle.getParameter('Radius').setValue(j.radius);
    }
  }

  UndoRedoManager.registerChange('CreateCircleChange', CreateCircleChange);

  /**
   * Tool for creating a circle geometry.
   *
   * **Events**
   * * **actionFinished:** Triggered when the creation of the geometry is completed.
   *
   * @extends CreateGeomTool
   */
  class CreateCircleTool extends CreateGeomTool {
    /**
     * Create a create circle tool.
     * @param {object} appData - The appData value.
     */
    constructor(appData) {
      super(appData);
    }

    /**
     * Starts the creation of the geometry.
     *
     * @param {Xfo} xfo - The xfo param.
     */
    createStart(xfo) {
      this.change = new CreateCircleChange(this.parentItem, xfo);
      UndoRedoManager.getInstance().addChange(this.change);

      this.xfo = xfo;
      this.stage = 1;
      this.radius = 0.0;
    }

    /**
     * Updates Circle geometry radius.
     *
     * @param {Vec3} pt - The pt param.
     */
    createMove(pt) {
      this.radius = pt.distanceTo(this.xfo.tr);
      this.change.update({ radius: this.radius });
      this.appData.renderer.forceRender();
    }

    /**
     * Finishes geometry creation.
     *
     * @param {Vec3} pt - The pt param.
     */
    createRelease(pt) {
      if (this.radius == 0) {
        UndoRedoManager.getInstance().cancel();
      }

      this.change = null;
      this.stage = 0;
      this.emit('actionFinished');
    }
  }

  /**
   * Class representing a create rect change.
   *
   * **Events**
   * * **updated:** Triggered when the change is updated
   *
   * @extends CreateGeomChange
   */
  class CreateRectChange extends CreateGeomChange {
    /**
     * Create a create rect change.
     *
     * @param {TreeItem} parentItem - The parentItem value.
     * @param {Xfo} xfo - The xfo value.
     */
    constructor(parentItem, xfo) {
      super('CreateRect');

      this.rect = new zeaEngine.Rect(0, 0);
      this.rect.lineThickness = 0.05;

      const material = new zeaEngine.Material('circle', 'FatLinesShader');
      material.getParameter('BaseColor').setValue(new zeaEngine.Color(0.7, 0.2, 0.2));
      this.geomItem = new zeaEngine.GeomItem('Rect', this.rect, material);

      if (parentItem && xfo) {
        this.setParentAndXfo(parentItem, xfo);
      }
    }

    /**
     * Updates rectangle with the specified data.
     *
     * @param {object} updateData - The updateData param.
     */
    update(updateData) {
      if (updateData.baseSize) {
        this.rect.getParameter('X').setValue(updateData.baseSize[0]);
        this.rect.getParameter('Y').setValue(updateData.baseSize[1]);
      }
      if (updateData.tr) {
        const xfo = this.geomItem.getParameter('LocalXfo').getValue();
        xfo.tr.fromJSON(updateData.tr);
        this.geomItem.getParameter('LocalXfo').setValue(xfo);
      }

      this.emit('updated', updateData);
    }
  }

  UndoRedoManager.registerChange('CreateRectChange', CreateRectChange);

  /**
   * Tool for creating a rectangle geometry.
   *
   * **Events**
   * * **actionFinished:** Triggered when the creation of the geometry is completed.
   *
   * @extends CreateGeomTool
   */
  class CreateRectTool extends CreateGeomTool {
    /**
     * Create a create rect tool.
     * @param {object} appData - The appData value.
     */
    constructor(appData) {
      super(appData);
    }

    /**
     * Starts the creation of a rectangle geometry.
     *
     * @param {Xfo} xfo - The xfo param.
     */
    createStart(xfo) {
      this.change = new CreateRectChange(this.parentItem, xfo);
      UndoRedoManager.getInstance().addChange(this.change);

      this.xfo = xfo;
      this.invXfo = xfo.inverse();
      this.stage = 1;
      this._size = 0.0;
    }

    /**
     * Updated the rectangle geometry structural properties.
     *
     * @param {Vec3} pt - The pt param.
     */
    createMove(pt) {
      if (this.stage == 1) {
        const delta = this.invXfo.transformVec3(pt)

        ;(this._size = Math.abs(delta.x)), Math.abs(delta.y);

        // const delta = pt.subtract(this.xfo.tr)
        this.change.update({
          baseSize: [Math.abs(delta.x), Math.abs(delta.y)],
          tr: this.xfo.tr.add(delta.scale(0.5)),
        });
      } else {
        const vec = this.invXfo.transformVec3(pt);
        this.change.update({ height: vec.y });
      }
    }

    /**
     * Finishes the creation of a rectangle geometry.
     *
     * @param {Vec3} pt - The pt param.
     */
    createRelease(pt) {
      if (this._size == 0) {
        UndoRedoManager.getInstance().cancel();
      }
      this.stage = 0;
      this.emit('actionFinished');
    }
  }

  /**
   * Class representing a create freehand line change.
   *
   * **Events**
   * * **updated:** Triggered when the change is updated
   *
   * @extends CreateGeomChange
   */
  class CreateFreehandLineChange extends CreateGeomChange {
    /**
     * Create a create freehand line change.
     *
     * @param {TreeItem} parentItem - The parentItem value.
     * @param {Xfo} xfo - The xfo value.
     * @param {Color} color - The color value.
     * @param {number} thickness - The thickness value.
     */
    constructor(parentItem, xfo, color, thickness = 0.001) {
      super('CreateFreehandLine');

      this.used = 0;
      this.vertexCount = 100;

      this.line = new zeaEngine.Lines();
      this.line.setNumVertices(this.vertexCount);
      this.line.setNumSegments(this.vertexCount - 1);
      this.line.getVertexAttribute('positions').setValue(0, new zeaEngine.Vec3());
      this.line.lineThickness = thickness;

      const material = new zeaEngine.Material('freeHandLine', 'FatLinesShader');
      material.getParameter('LineThickness').setValue(thickness);
      if (color) {
        material.getParameter('BaseColor').setValue(color);
      }

      this.geomItem = new zeaEngine.GeomItem('freeHandLine', this.line, material);

      if (parentItem && xfo) {
        this.setParentAndXfo(parentItem, xfo);
      }
    }

    /**
     * Updates free hand line using the specified data.
     *
     * @param {object} updateData - The updateData param.
     */
    update(updateData) {
      // console.log("update:", this.used)

      this.used++;

      let realloc = false;
      if (this.used >= this.line.getNumSegments()) {
        this.vertexCount = this.vertexCount + 100;
        this.line.setNumVertices(this.vertexCount);
        this.line.setNumSegments(this.vertexCount - 1);
        realloc = true;
      }

      this.line.getVertexAttribute('positions').setValue(this.used, updateData.point);
      // this.line.getVertexAttributes().lineThickness.setValue(this.used, updateData.lineThickness);
      this.line.setSegmentVertexIndices(this.used - 1, this.used - 1, this.used);

      if (realloc) {
        this.line.emit('geomDataTopologyChanged', {
          topologyChanged: true,
        });
      } else {
        this.line.emit('geomDataChanged', {
          topologyChanged: true,
        });
      }
      this.emit('updated', updateData);
    }

    /**
     * Serializes change as a JSON object.
     *
     * @param {object} context - The appData param.
     * @return {object} The return value.
     */
    toJSON(context) {
      const j = super.toJSON(context);
      j.lineThickness = this.line.lineThickness;
      const material = this.geomItem.getParameter('Material').getValue();
      j.color = material.getParameter('BaseColor').getValue();
      return j
    }

    /**
     * Restores free hand line from a JSON object.
     *
     * @param {object} j - The j param.
     * @param {object} context - The appData param.
     */
    fromJSON(j, context) {
      // Need to set line thickness before the geom is added to the tree.
      if (j.lineThickness) {
        this.line.lineThickness = j.lineThickness;
        // this.line.addVertexAttribute('lineThickness', Float32, 0.0);
        this.geomItem.getMaterial().getParameter('LineThickness').setValue(j.lineThickness);
      }

      if (j.color) {
        const color = new zeaEngine.Color(0.7, 0.2, 0.2);
        color.fromJSON(j.color);
        this.geomItem.getMaterial().getParameter('BaseColor').setValue(color);
      }

      super.fromJSON(j, context);
    }
  }

  UndoRedoManager.registerChange('CreateFreehandLineChange', CreateFreehandLineChange);

  /**
   * Tool for creating a free hand line.
   *
   * **Events**
   * * **actionFinished:** Triggered when the creation of the geometry is completed.
   *
   * @extends CreateLineTool
   */
  class CreateFreehandLineTool extends CreateLineTool {
    /**
     * Create a create freehand line tool.
     *
     * @param {object} appData - The appData value.
     */
    constructor(appData) {
      super(appData);

      this.mp = this.addParameter(new zeaEngine.BooleanParameter('Modulate Thickness By Stroke Speed', false));
    }

    /**
     * Starts the creation of a free hand line.
     *
     * @param {Xfo} xfo - The xfo param.
     */
    createStart(xfo) {
      const color = this.colorParam.getValue();
      const lineThickness = this.lineThickness.getValue();

      this.change = new CreateFreehandLineChange(this.parentItem, xfo, color, lineThickness);
      UndoRedoManager.getInstance().addChange(this.change);

      this.xfo = xfo;
      this.invXfo = xfo.inverse();
      this.stage = 1;
      this.prevP = xfo.tr;
      this.length = 0;
    }

    /**
     * Updates the free hand line data.
     *
     * @param {Vec3} pt - The pt param.
     */
    createMove(pt) {
      const p = this.invXfo.transformVec3(pt);
      const delta = p.subtract(this.prevP).length();
      this.change.update({
        point: p,
      });

      this.length += delta;
      this.prevP = p;
    }

    /**
     * Finishes free hand line creation
     *
     * @param {Vec3} pt - The pt param.
     */
    createRelease(pt) {
      if (this.length == 0) {
        UndoRedoManager.getInstance().cancel();
      }

      this.stage = 0;
      this.emit('actionFinished');
    }
  }

  /**
   * Class representing a create sphere change.
   *
   * **Events**
   * * **updated:** Triggered when the change is updated
   *
   * @extends CreateGeomChange
   */
  class CreateSphereChange extends CreateGeomChange {
    /**
     * Create a create sphere change.
     * @param {TreeItem} parentItem - The parentItem value.
     * @param {Xfo} xfo - The xfo value.
     */
    constructor(parentItem, xfo, color) {
      super('CreateSphere', parentItem);

      this.sphere = new zeaEngine.Sphere(0, 24, 12);
      const material = new zeaEngine.Material('Sphere', 'SimpleSurfaceShader');
      this.geomItem = new zeaEngine.GeomItem('Sphere', this.sphere, material);

      if (parentItem && xfo && color) {
        material.getParameter('BaseColor').setValue(color);
        this.setParentAndXfo(parentItem, xfo);
      }
    }

    /**
     * Updates sphere geometry using the specified data.
     *
     * @param {object} updateData - The updateData param.
     */
    update(updateData) {
      this.sphere.getParameter('Radius').setValue(updateData.radius);

      this.emit('updated', updateData);
    }

    /**
     * Serializes sphere geometry as a JSON object.
     *
     * @return {object} The return value.
     */
    toJSON() {
      const j = super.toJSON();
      j.radius = this.sphere.getParameter('Radius').getValue();
      return j
    }

    /**
     * Updates sphere geometry using a JSON object.
     *
     * @param {object} j - The j param.
     */
    updateFromJSON(j) {
      if (j.radius) this.sphere.getParameter('Radius').setValue(j.radius);
    }
  }

  UndoRedoManager.registerChange('CreateSphereChange', CreateSphereChange);

  /**
   * Tool for creating Sphere geometries.
   *
   * **Events**
   * * **actionFinished:** Triggered when the creation of the geometry is completed.
   *
   * @extends CreateGeomTool
   */
  class CreateSphereTool extends CreateGeomTool {
    /**
     * Create a create sphere tool.
     *
     * @param {object} appData - The appData value.
     */
    constructor(appData) {
      super(appData);
    }

    /**
     * Starts the creation of the sphere geometry.
     *
     * @param {Xfo} xfo - The xfo param.
     */
    createStart(xfo) {
      this.change = new CreateSphereChange(this.parentItem, xfo, this.colorParam.getValue());
      UndoRedoManager.getInstance().addChange(this.change);

      this.xfo = xfo;
      this.stage = 1;
      this.radius = 0.0;
    }

    /**
     * Updates the sphere geometry structural properties.
     *
     * @param {vec3} pt - The pt param.
     */
    createMove(pt) {
      this.radius = pt.distanceTo(this.xfo.tr);
      this.change.update({ radius: this.radius });
    }

    /**
     * Finishes the creation of the sphere geometry.
     *
     * @param {Vec3} pt - The pt param.
     */
    createRelease(pt) {
      if (this.radius == 0) {
        UndoRedoManager.getInstance().cancel();
      }
      this.stage = 0;
      this.emit('actionFinished');
    }
  }

  /**
   * Class representing a create cuboid change.
   *
   * **Events**
   * * **updated:** Triggered when the change is updated
   *
   * @extends CreateGeomChange
   */
  class CreateCuboidChange extends CreateGeomChange {
    /**
     * Create a create cuboid change.
     *
     * @param {TreeItem} parentItem - The parentItem value.
     * @param {Xfo} xfo - The xfo value.
     */
    constructor(parentItem, xfo, color) {
      super('CreateCuboid');

      this.cuboid = new zeaEngine.Cuboid(0, 0, 0, true);
      const material = new zeaEngine.Material('Cuboid', 'SimpleSurfaceShader');
      this.geomItem = new zeaEngine.GeomItem('Cuboid', this.cuboid, material);

      if (parentItem && xfo) {
        material.getParameter('BaseColor').setValue(color);
        this.setParentAndXfo(parentItem, xfo);
      }
    }

    /**
     * Updates cuboid using the specified data.
     *
     * @param {object} updateData - The updateData param.
     */
    update(updateData) {
      if (updateData.baseSize) {
        this.cuboid.setBaseSize(updateData.baseSize[0], updateData.baseSize[1]);
      }
      if (updateData.tr) {
        const xfo = this.geomItem.getParameter('LocalXfo').getValue();
        xfo.tr.fromJSON(updateData.tr);
        this.geomItem.getParameter('LocalXfo').setValue(xfo);
      }
      if (updateData.height) {
        this.cuboid.getParameter('Z').setValue(updateData.height);
      }
      this.emit('updated', updateData);
    }
  }

  UndoRedoManager.registerChange('CreateCuboidChange', CreateCuboidChange);

  /**
   * Tool for creating Cuboid geometry.
   *
   * **Events**
   * * **actionFinished:** Triggered when the creation of the geometry is completed.
   *
   * @extends CreateGeomTool
   */
  class CreateCuboidTool extends CreateGeomTool {
    /**
     * Create a create cuboid tool.
     *
     * @param {object} appData - The appData value.
     */
    constructor(appData) {
      super(appData);
    }

    /**
     * Starts the creation of the cuboid.
     *
     * @param {Xfo} xfo - The xfo param.
     */
    createStart(xfo) {
      this.change = new CreateCuboidChange(this.parentItem, xfo, this.colorParam.getValue());
      UndoRedoManager.getInstance().addChange(this.change);

      this.xfo = xfo;
      this.invXfo = xfo.inverse();
      this.stage = 1;
      this._height = 0.0;
    }

    /**
     * Updates cuboid structural properties.
     *
     * @param {Vec3} pt - The pt param.
     */
    createMove(pt) {
      if (this.stage == 1) {
        const delta = this.invXfo.transformVec3(pt);

        // const delta = pt.subtract(this.xfo.tr)
        this.change.update({
          baseSize: [Math.abs(delta.x), Math.abs(delta.y)],
          tr: this.xfo.tr.add(delta.scale(0.5)),
        });
      } else {
        const vec = this.invXfo.transformVec3(pt);
        this.change.update({ height: vec.y });
      }
    }

    /**
     * Finishes the creation of the cuboid.
     *
     * @param {Vec3} pt - The pt param.
     */
    createRelease(pt) {
      if (this.stage == 1) {
        this.stage = 2;
        this.pt1 = pt;

        const quat = new zeaEngine.Quat();
        quat.setFromAxisAndAngle(new zeaEngine.Vec3(1, 0, 0), Math.PI * 0.5);
        this.constructionPlane.ori = this.constructionPlane.ori.multiply(quat);
        this.constructionPlane.tr = pt;
        this.invXfo = this.constructionPlane.inverse();
      } else if (this.stage == 2) {
        this.stage = 0;
        this.emit('actionFinished');
      }
    }
  }

  /* eslint-disable require-jsdoc */

  /**
   * @extends BaseTool
   */
  class ToolManager extends zeaEngine.BaseTool {
    constructor() {
      super();
      this.tools = {};
      this.toolStack = [];
    }

    registerTool(toolName, tool) {
      this.tools[toolName] = tool;
    }

    pushTool(toolName) {
      const tool = this.tools[toolName];
      if (!tool) throw Error('Tool not found', toolName)
      if (tool.activateTool) tool.activateTool();
      this.toolStack.push(this.tools[toolName]);
    }

    popTool() {
      if (this.toolStack.length == 0) {
        throw Error('Tool stack is empty')
      }
      const tool = this.toolStack[this.toolStack.length - 1];
      if (tool.deactivateTool) tool.deactivateTool();
      this.toolStack.pop();
    }

    /**
     * Returns the tool currently at the top of the stack.
     * @return {Tool} - the currently active tool.
     */
    activeTool() {
      if (this.toolStack.length > 0) {
        return this.toolStack[this.toolStack.length - 1]
      }
      return ''
    }

    /**
     * Returns the name of the tool currently at the top of the stack.
     * @return - the name of the tool.
     */
    activeToolName() {
      if (this.toolStack.length > 0) {
        const tool = this.toolStack[this.toolStack.length - 1];
        for (const key in this.tools) {
          if (this.tools[key] == tool) return key
        }
      }
      return ''
    }

    // ///////////////////////////////////
    // Pointer events

    /**
     * Event fired when a pointing device button is pressed while the pointer is over the tool.
     *
     * @param {MouseEvent} event - The event param.
     */
    onPointerDown(event) {
      for (let i = this.toolStack.length - 1; i >= 0; i--) {
        const tool = this.toolStack[i];
        if (tool.onPointerDown) {
          tool.onPointerDown(event);
          if (!event.propagating) break
        }
      }
    }

    /**
     * Event fired when a pointing device is moved while the cursor's hotspot is inside it.
     *
     * @param {MouseEvent} event - The event param.
     */
    onPointerMove(event) {
      for (let i = this.toolStack.length - 1; i >= 0; i--) {
        const tool = this.toolStack[i];
        if (tool.onPointerMove) {
          tool.onPointerMove(event);
          if (!event.propagating) break
        }
      }
    }

    /**
     * Event fired when a pointing device button is released while the pointer is over the tool.
     *
     * @param {MouseEvent} event - The event param.
     */
    onPointerUp(event) {
      for (let i = this.toolStack.length - 1; i >= 0; i--) {
        const tool = this.toolStack[i];
        if (tool.onPointerUp) {
          tool.onPointerUp(event);
          if (!event.propagating) break
        }
      }
    }

    /**
     * Event fired when a pointing device button is double clicked on the tool.
     *
     * @param {MouseEvent} event - The event param.
     */
    onPointerDoublePress(event) {
      for (let i = this.toolStack.length - 1; i >= 0; i--) {
        const tool = this.toolStack[i];
        if (tool.onPointerDoublePress) {
          tool.onPointerDoublePress(event);
          if (!event.propagating) break
        }
      }
    }

    /**
     * Event fired when the user rotates the pointing device wheel.
     *
     * @param {MouseEvent} event - The event param.
     */
    onWheel(event) {
      for (let i = this.toolStack.length - 1; i >= 0; i--) {
        const tool = this.toolStack[i];
        if (tool.onWheel) {
          tool.onWheel(event);
          if (!event.propagating) break
        }
      }
    }

    // ///////////////////////////////////
    // Keyboard events

    /**
     * Event fired when the user presses a key on the keyboard.
     *
     * @param {KeyboardEvent} event - The event param.
     */
    onKeyPressed(event) {
      for (let i = this.toolStack.length - 1; i >= 0; i--) {
        const tool = this.toolStack[i];
        if (tool.onKeyPressed) {
          tool.onKeyPressed(event);
          if (!event.propagating) break
        }
      }
    }

    /**
     * Event fired when the user presses down a key on the keyboard.
     *
     * @param {KeyboardEvent} event - The event param.
     */
    onKeyDown(event) {
      for (let i = this.toolStack.length - 1; i >= 0; i--) {
        const tool = this.toolStack[i];
        if (tool.onKeyDown) {
          tool.onKeyDown(event);
          if (!event.propagating) break
        }
      }
    }

    /**
     * Event fired when the user releases a key on the keyboard.
     *
     * @param {KeyboardEvent} event - The event param.
     */
    onKeyUp(event) {
      for (let i = this.toolStack.length - 1; i >= 0; i--) {
        const tool = this.toolStack[i];
        if (tool.onKeyUp) {
          tool.onKeyUp(event);
          if (!event.propagating) break
        }
      }
    }
  }

  /**
   * Class representing a slider scene widget. There are two parts in this widget, the slider and the handle.<br>
   * The **Handle** is the moving part of the widget, the object you interact with. The **Slider** is the path that the **handle** follows.
   *
   * **Parameters**
   * * **Length(`NumberParameter`):** Specifies the length of the slider.
   * * **HandleRadius(`NumberParameter`):** Specifies the handle radius.
   * * **BarRadius(`NumberParameter`):** Specifies the radius of the slider.
   *
   *
   * @extends BaseLinearMovementHandle
   */
  class SliderHandle extends BaseLinearMovementHandle {
    /**
     * Create a slider scene widget.
     *
     * @param {string} name - The name value.
     * @param {number} length - The length value.
     * @param {number} radius - The radius value.
     * @param {Color} color - The color value.
     */
    constructor(name, length = 0.5, radius = 0.02, color = new zeaEngine.Color('#F9CE03')) {
      super(name);

      this.lengthParam = this.addParameter(new zeaEngine.NumberParameter('Length', length));
      this.handleRadiusParam = this.addParameter(new zeaEngine.NumberParameter('HandleRadius', radius));
      this.barRadiusParam = this.addParameter(new zeaEngine.NumberParameter('BarRadius', radius * 0.25));
      this.colorParam.setValue(color);

      this.handleMat = new zeaEngine.Material('handle', 'FlatSurfaceShader');
      this.handleMat.getParameter('BaseColor').setValue(this.colorParam.getValue());

      const topBarMat = new zeaEngine.Material('topBar', 'FlatSurfaceShader');
      topBarMat.getParameter('BaseColor').setValue(new zeaEngine.Color(0.5, 0.5, 0.5));

      const barGeom = new zeaEngine.Cylinder(radius * 0.25, 1, 64, 2, true, true);
      const handleGeom = new zeaEngine.Sphere(radius, 64);

      this.handle = new zeaEngine.GeomItem('handle', handleGeom, this.handleMat);
      this.baseBar = new zeaEngine.GeomItem('baseBar', barGeom, this.handleMat);
      this.topBar = new zeaEngine.GeomItem('topBar', barGeom, topBarMat);
      this.handleXfo = new zeaEngine.Xfo();
      this.baseBarXfo = new zeaEngine.Xfo();
      this.topBarXfo = new zeaEngine.Xfo();

      this.barRadiusParam.on('valueChanged', () => {
        barGeom.getParameter('Radius').setValue(this.barRadiusParam.getValue());
      });
      this.handleRadiusParam.on('valueChanged', () => {
        handleGeom.getParameter('Radius').setValue(this.handleRadiusParam.getValue());
      });
      this.lengthParam.on('valueChanged', () => {
        this.__updateSlider(this.value);
      });
      this.colorParam.on('valueChanged', () => {
        this.handleMat.getParameter('BaseColor').setValue(this.colorParam.getValue());
      });

      this.addChild(this.handle);
      this.addChild(this.baseBar);
      this.addChild(this.topBar);

      this.__updateSlider(0);
    }

    /**
     * Applies a special shinning shader to the handle to illustrate interaction with it.
     */
    highlight() {
      super.highlight();
      this.handleMat.getParameter('BaseColor').setValue(this.highlightColorParam.getValue());
    }

    /**
     * Removes the shining shader from the handle.
     */
    unhighlight() {
      super.unhighlight();
      this.handleMat.getParameter('BaseColor').setValue(this.colorParam.getValue());
    }

    /**
     * Sets global xfo target parameter.
     *
     * @param {Parameter} param - The video param.
     * @param {boolean} track - The track param.
     */
    setTargetParam(param) {
      this.param = param;
      const __updateSlider = () => {
        this.__updateSlider(param.getValue());
      };
      __updateSlider();
      param.on('valueChanged', __updateSlider);
    }

    /**
     *
     *
     * @param {*} value -
     * @private
     */
    __updateSlider(value) {
      this.value = value;
      const range = this.param && this.param.getRange() ? this.param.getRange() : [0, 1];
      const v = zeaEngine.MathFunctions.remap(value, range[0], range[1], 0, 1);
      const length = this.lengthParam.getValue();
      this.baseBarXfo.sc.z = v * length;
      this.handleXfo.tr.z = v * length;
      this.topBarXfo.tr.z = v * length;
      this.topBarXfo.sc.z = (1 - v) * length;
      this.handle.getParameter('LocalXfo').setValue(this.handleXfo);
      this.baseBar.getParameter('LocalXfo').setValue(this.baseBarXfo);
      this.topBar.getParameter('LocalXfo').setValue(this.topBarXfo);
    }

    // ///////////////////////////////////
    // Interaction events

    /**
     * Handles the initially drag of the handle.
     *
     * @param {MouseEvent|TouchEvent|object} event - The event param.
     */
    onDragStart(event) {
      // Hilight the material.
      this.handleXfo.sc.x = this.handleXfo.sc.y = this.handleXfo.sc.z = 1.2;
      this.handle.getParameter('LocalXfo').setValue(this.handleXfo);
      if (!this.param) {
        return
      }

      this.change = new ParameterValueChange(this.param);
      UndoRedoManager.getInstance().addChange(this.change);
    }

    /**
     * Handles drag action of the handle.
     *
     * @param {MouseEvent|TouchEvent|object} event - The event param.
     */
    onDrag(event) {
      const length = this.lengthParam.getValue();
      const range = this.param && this.param.getRange() ? this.param.getRange() : [0, 1];
      const value = zeaEngine.MathFunctions.clamp(
        zeaEngine.MathFunctions.remap(event.value, 0, length, range[0], range[1]),
        range[0],
        range[1]
      );
      if (!this.param) {
        this.__updateSlider(value);
        this.value = value;
        return
      }

      this.change.update({
        value,
      });
    }

    /**
     * Handles the end of dragging the handle.
     *
     * @param {MouseEvent|TouchEvent|object} event - The event param.
     */
    onDragEnd(event) {
      this.change = null;
      // unhilight the material.
      this.handleXfo.sc.x = this.handleXfo.sc.y = this.handleXfo.sc.z = 1.0;
      this.handle.getParameter('LocalXfo').setValue(this.handleXfo);
    }

    /**
     * Serializes handle item as a JSON object.
     *
     * @param {object} context - The context param.
     * @return {object} The return value.
     */
    toJSON(context) {
      const json = super.toJSON(context);
      if (this.param) json.targetParam = this.param.getPath();
      return json
    }

    /**
     * Restores handle item from a JSON object.
     *
     * @param {object} json - The json param.
     * @param {object} context - The context param.
     */
    fromJSON(json, context) {
      super.fromJSON(json, context);

      if (json.targetParam) {
        context.resolvePath(json.targetParam).then((param) => {
          this.setTargetParam(param);
        });
      }
    }
  }

  zeaEngine.Registry.register('SliderHandle', SliderHandle);

  /**
   * Class representing a slider scene widget with an arc shape. There are two parts in this widget, the slider and the handle.<br>
   * The **Handle** is the moving part of the widget, the object you interact with. The **Slider** is the path that the **handle** follows.
   *
   *
   * **Parameters**
   * * **ArcRadius(`NumberParameter`):** Specifies the radius of the slider.
   * * **ArcAngle(`NumberParameter`):** Specifies the arc angle of the slider.
   * * **HandleRadius(`NumberParameter`):** Specifies the radius of the handle in the slider.
   *
   * **Events**
   * * **dragStart:** Triggered when the pointer is down.
   * * **dragEnd:** Triggered when the pointer is released.
   *
   * @extends BaseAxialRotationHandle
   */
  class ArcSlider extends BaseAxialRotationHandle {
    /**
     * Creates an instance of ArcSlider.
     *
     * @param {string} name - The name value
     * @param {number} [arcRadius=1] - The arcRadius value
     * @param {number} [arcAngle=1] - The arcAngle value
     * @param {number} [handleRadius=0.02] - The handleRadius value
     * @param {Color} [color=new Color(1, 1, 0)] - the color value
     */
    constructor(name, arcRadius = 1, arcAngle = 1, handleRadius = 0.02, color = new zeaEngine.Color(1, 1, 0)) {
      super(name);
      this.arcRadiusParam = this.addParameter(new zeaEngine.NumberParameter('ArcRadius', arcRadius));
      this.arcAngleParam = this.addParameter(new zeaEngine.NumberParameter('ArcAngle', arcAngle));
      this.handleRadiusParam = this.addParameter(new zeaEngine.NumberParameter('HandleRadius', handleRadius));
      // this.barRadiusParam = this.addParameter(
      //   new NumberParameter('Bar Radius', radius * 0.25)
      // );
      this.colorParam.setValue(color);

      this.handleMat = new zeaEngine.Material('handleMat', 'HandleShader');
      this.handleMat.getParameter('BaseColor').setValue(color);

      const arcGeom = new zeaEngine.Circle(arcRadius, 64, arcAngle);
      const handleGeom = new zeaEngine.Sphere(handleRadius, 64);

      this.handle = new zeaEngine.GeomItem('handle', handleGeom, this.handleMat);
      this.arc = new zeaEngine.GeomItem('arc', arcGeom, this.handleMat);
      this.handleXfo = new zeaEngine.Xfo();
      this.handleGeomOffsetXfo = new zeaEngine.Xfo();
      this.handleGeomOffsetXfo.tr.x = arcRadius;
      this.handle.getParameter('GeomOffsetXfo').setValue(this.handleGeomOffsetXfo);

      // this.barRadiusParam.on('valueChanged', () => {
      //   arcGeom.getParameter('Radius').setValue(this.barRadiusParam.getValue());
      // });

      this.range = [0, arcAngle];
      this.arcAngleParam.on('valueChanged', () => {
        const arcAngle = this.arcAngleParam.getValue();
        arcGeom.getParameter('Angle').setValue(arcAngle);
        this.range = [0, arcAngle];
      });
      this.arcRadiusParam.on('valueChanged', () => {
        const arcRadius = this.arcRadiusParam.getValue();
        arcGeom.getParameter('Radius').setValue(arcRadius);
        this.handleGeomOffsetXfo.tr.x = arcRadius;
        this.handle.getParameter('GeomOffsetXfo').setValue(this.handleGeomOffsetXfo);
      });
      this.handleRadiusParam.on('valueChanged', () => {
        handleGeom.getParameter('Radius').setValue(this.handleRadiusParam.getValue());
      });

      this.colorParam.on('valueChanged', () => {
        this.handleMat.getParameter('BaseColor').setValue(this.colorParam.getValue());
      });

      this.addChild(this.handle);
      this.addChild(this.arc);

      // this.__updateSlider(0);
      this.setTargetParam(this.handle.getParameter('GlobalXfo'), false);
    }

    // ///////////////////////////////////
    // Mouse events

    /**
     * Event fired when a pointing device is initially moved within the space of the handle.
     *
     * @param {MouseEvent} event - The event param.
     */
    onPointerEnter(event) {
      if (event.intersectionData && event.intersectionData.geomItem == this.handle) this.highlight();
    }

    /**
     * Event fired when a pointing device moves outside of the space of the handle.
     *
     * @param {MouseEvent} event - The event param.
     */
    onPointerLeave(event) {
      this.unhighlight();
    }

    /**
     * Event fired when a pointing device button is pressed while the pointer is over the handle element.
     *
     * @param {MouseEvent} event - The event param.
     */
    onPointerDown(event) {
      // We do not want to handle events
      // that have propagated from children of
      // the slider.
      if (event.intersectionData && event.intersectionData.geomItem == this.handle) super.onPointerDown(event);
    }

    /**
     * Applies a special shinning shader to the handle to illustrate interaction with it.
     */
    highlight() {
      super.highlight();
      this.handleMat.getParameter('BaseColor').setValue(this.highlightColorParam.getValue());
    }

    /**
     * Removes the shining shader from the handle.
     */
    unhighlight() {
      super.unhighlight();
      this.handleMat.getParameter('BaseColor').setValue(this.colorParam.getValue());
    }

    // /**
    //  * The setTargetParam method.
    //  * @param {any} param - The param param.
    //  */
    // setTargetParam(param) {
    //   this.param = param;
    //   const __updateSlider = () => {
    //     this.__updateSlider(param.getValue());
    //   };
    //   __updateSlider();
    //   param.on('valueChanged', __updateSlider);
    // }

    /**
     * Sets global xfo target parameter
     *
     * @param {Parameter} param - The param param.
     * @param {boolean} track - The track param.
     */
    setTargetParam(param, track = true) {
      this.param = param;
      if (track) {
        if (this.param instanceof zeaEngine.XfoParameter) {
          const __updateGizmo = () => {
            this.getParameter('GlobalXfo').setValue(param.getValue());
          };
          __updateGizmo();
          param.on('valueChanged', __updateGizmo);
        } else if (this.param instanceof zeaEngine.NumberParameter) {
          const __updateGizmo = () => {
            this.handleXfo.ori.setFromAxisAndAngle(new zeaEngine.Vec3(0, 0, 1), param.getValue());
            this.handle.getParameter('GlobalXfo').setValue(this.handleXfo);
          };
          __updateGizmo();
          param.on('valueChanged', __updateGizmo);
        }
      }
    }

    // eslint-disable-next-line require-jsdoc
    // __updateSlider(value) {
    //   this.value = value
    //   const range =
    //     this.param && this.param.getRange() ? this.param.getRange() : [0, 1];
    //   const v = Math.remap(value, range[0], range[1], 0, 1);
    //   const length = this.arcAngleParam.getValue();
    //   this.handleXfo.ori.setFromAxisAndAngle(this.axis, ) = v * length;
    //   this.handle.getParameter('LocalXfo').setValue(this.handleXfo;
    // }

    // ///////////////////////////////////
    // Interaction events

    /**
     * Returns handle's global Xfo
     *
     * @return {Xfo} - The Xfo value
     */
    getBaseXfo() {
      return this.handle.getParameter('GlobalXfo').getValue()
    }

    /**
     * Handles the initially drag interaction of the handle.
     *
     * @param {MouseEvent|TouchEvent|object} event - The event param.
     */
    onDragStart(event) {
      this.baseXfo = this.getParameter('GlobalXfo').getValue().clone();
      this.baseXfo.sc.set(1, 1, 1);
      this.deltaXfo = new zeaEngine.Xfo();
      // this.offsetXfo = this.baseXfo.inverse().multiply(this.param.getValue());

      this.vec0 = this.getParameter('GlobalXfo').getValue().ori.getXaxis();
      // this.grabCircleRadius = this.arcRadiusParam.getValue();
      this.vec0.normalizeInPlace();

      this.change = new ParameterValueChange(this.param);
      UndoRedoManager.getInstance().addChange(this.change);

      // Hilight the material.
      this.handleGeomOffsetXfo.sc.x = this.handleGeomOffsetXfo.sc.y = this.handleGeomOffsetXfo.sc.z = 1.2;
      this.handle.getParameter('GeomOffsetXfo').setValue(this.handleGeomOffsetXfo);

      this.emit('dragStart');
    }

    /**
     * Handles drag interaction of the handle.
     *
     * @param {MouseEvent|TouchEvent|object} event - The event param.
     */
    onDrag(event) {
      const vec1 = event.holdPos.subtract(this.baseXfo.tr);
      vec1.normalizeInPlace();

      let angle = this.vec0.angleTo(vec1);
      if (this.vec0.cross(vec1).dot(this.baseXfo.ori.getZaxis()) < 0) angle = -angle;

      if (this.range) {
        angle = zeaEngine.MathFunctions.clamp(angle, this.range[0], this.range[1]);
      }

      if (event.shiftKey) {
        // modulate the angle to X degree increments.
        const increment = Math.degToRad(22.5);
        angle = Math.floor(angle / increment) * increment;
      }

      this.deltaXfo.ori.setFromAxisAndAngle(new zeaEngine.Vec3(0, 0, 1), angle);

      const newXfo = this.baseXfo.multiply(this.deltaXfo);
      const value = newXfo; // .multiply(this.offsetXfo);

      if (this.change) {
        if (this.param instanceof zeaEngine.XfoParameter) {
          this.change.update({
            value,
          });
        } else if (this.param instanceof zeaEngine.NumberParameter) {
          this.change.update({
            value: angle,
          });
        }
      } else {
        if (this.param instanceof zeaEngine.XfoParameter) {
          this.param.setValue(value);
        } else if (this.param instanceof zeaEngine.NumberParameter) {
          this.param.setValue(angle);
        }
      }
    }

    /**
     * Handles the end of dragging interaction with the handle.
     *
     * @param {MouseEvent|TouchEvent|object} event - The event param.
     */
    onDragEnd(event) {
      this.change = null;
      this.handleGeomOffsetXfo.sc.x = this.handleGeomOffsetXfo.sc.y = this.handleGeomOffsetXfo.sc.z = 1.0;
      this.handle.getParameter('GeomOffsetXfo').setValue(this.handleGeomOffsetXfo);

      this.emit('dragEnd');
    }

    /**
     * Serializes handle item as a JSON object.
     *
     * @param {object} context - The context param.
     * @return {object} The return value.
     */
    toJSON(context) {
      const json = super.toJSON(context);
      if (this.param) json.targetParam = this.param.getPath();
      return json
    }

    /**
     * Restores handle item from a JSON object.
     *
     * @param {object} json - The json param.
     * @param {object} context - The context param.
     */
    fromJSON(json, context) {
      super.fromJSON(json, context);

      if (json.targetParam) {
        context.resolvePath(json.targetParam).then((param) => {
          this.setTargetParam(param);
        });
      }
    }
  }

  zeaEngine.Registry.register('ArcSlider', ArcSlider);

  /**
   * Class representing a planar movement scene widget.
   *
   * @extends Handle
   */
  class ScreenSpaceMovementHandle extends Handle {
    /**
     * Create a planar movement scene widget.
     *
     * @param {string} name - The name value
     */
    constructor(name) {
      super(name);
    }

    /**
     * Sets global xfo target parameter.
     *
     * @param {Parameter} param - The video param.
     * @param {boolean} track - The track param.
     */
    setTargetParam(param, track = true) {
      this.param = param;
      if (track) {
        const __updateGizmo = () => {
          this.getParameter('GlobalXfo').setValue(param.getValue());
        };
        __updateGizmo();
        param.on('valueChanged', __updateGizmo);
      }
    }

    /**
     * Returns target's global xfo parameter.
     *
     * @return {Parameter} - returns handle's target global Xfo.
     */
    getTargetParam() {
      return this.param ? this.param : this.getParameter('GlobalXfo')
    }

    // ///////////////////////////////////
    // Mouse events

    /**
     * Handles mouse down interaction with the handle.
     *
     * @param {MouseEvent} event - The event param.
     * @return {boolean} - The return value.
     */
    handlePointerDown(event) {
      this.gizmoRay = new zeaEngine.Ray();
      const ray = event.pointerRay;
      const cameraXfo = event.viewport.getCamera().getParameter('GlobalXfo').getValue();
      this.gizmoRay.dir = cameraXfo.ori.getZaxis();
      const param = this.getTargetParam();
      const baseXfo = param.getValue();
      this.gizmoRay.start = baseXfo.tr;
      const dist = ray.intersectRayPlane(this.gizmoRay);
      event.grabPos = ray.pointAtDist(dist);
      this.onDragStart(event);
      return true
    }

    /**
     * Handles mouse move interaction with the handle.
     *
     * @param {MouseEvent|TouchEvent} event - The event param
     * @return {boolean} - The return value
     */
    handlePointerMove(event) {
      const ray = event.pointerRay;
      const dist = ray.intersectRayPlane(this.gizmoRay);
      event.holdPos = ray.pointAtDist(dist);
      this.onDrag(event);
      return true
    }

    /**
     * Handles mouse up interaction with the handle.
     *
     * @param {MouseEvent|TouchEvent} event - The event param.
     * @return {boolean} - The return value.
     */
    handlePointerUp(event) {
      const ray = event.pointerRay;
      if (ray) {
        const dist = ray.intersectRayPlane(this.gizmoRay);
        event.releasePos = ray.pointAtDist(dist);
      }

      this.onDragEnd(event);
      return true
    }

    // ///////////////////////////////////
    // Interaction events

    /**
     * Handles the initially drag of the handle.
     *
     * @param {MouseEvent|TouchEvent|object} event - The event param.
     */
    onDragStart(event) {
      this.grabPos = event.grabPos;
      const param = this.getTargetParam();
      this.baseXfo = param.getValue();

      this.change = new ParameterValueChange(param);
      UndoRedoManager.getInstance().addChange(this.change);
    }

    /**
     * Handles drag action of the handle.
     *
     * @param {MouseEvent|TouchEvent|object} event - The event param.
     */
    onDrag(event) {
      const dragVec = event.holdPos.subtract(this.grabPos);

      const newXfo = this.baseXfo.clone();
      newXfo.tr.addInPlace(dragVec);

      this.change.update({
        value: newXfo,
      });
    }

    /**
     * Handles the end of dragging the handle.
     *
     * @param {MouseEvent|TouchEvent|object} event - The event param.
     */
    onDragEnd(event) {
      this.change = null;
    }
  }

  const sphere = new zeaEngine.Sphere(0.003);
  const line = new zeaEngine.Lines(0.0);
  line.setNumVertices(2);
  line.setNumSegments(1);
  line.setSegmentVertexIndices(0, 0, 1);
  line.getVertexAttribute('positions').getValueRef(1).setFromOther(new zeaEngine.Vec3(0, 0, 1));

  /**
   *
   *
   * @extends {TreeItem}
   */
  class MeasureDistance extends zeaEngine.TreeItem {
    /**
     * Creates an instance of MeasureDistance.
     * @param {string} name
     * @param {Color} color
     */
    constructor(name = 'MeasureDistance', color = new zeaEngine.Color('#F9CE03')) {
      super(name);

      this.colorParam = this.addParameter(new zeaEngine.ColorParameter('Color', color));
      this.unitsParameter = this.addParameter(new zeaEngine.StringParameter('Units', 'mm'));

      this.markerMaterial = new zeaEngine.Material('Marker', 'HandleShader');
      this.markerMaterial.getParameter('BaseColor').setValue(this.colorParam.getValue());
      this.markerMaterial.getParameter('MaintainScreenSize').setValue(1);
      this.markerMaterial.getParameter('Overlay').setValue(0.5);

      this.lineMaterial = new zeaEngine.Material('Line', 'LinesShader');
      this.lineMaterial.getParameter('BaseColor').setValue(this.colorParam.getValue());
      this.lineMaterial.getParameter('Overlay').setValue(0.5);

      this.startMarker = new zeaEngine.GeomItem(`${name}StartMarker`, sphere, this.markerMaterial);
      this.endMarker = new zeaEngine.GeomItem(`${name}EndMarker`, sphere, this.markerMaterial);

      this.addChild(this.startMarker);
      this.addChild(this.endMarker);

      this.lineGeomItem = new zeaEngine.GeomItem('Line', line, this.lineMaterial);
      this.lineGeomItem.setSelectable(false);
      this.addChild(this.lineGeomItem);

      this.label = new zeaEngine.Label('Distance');
      this.label.getParameter('FontSize').setValue(20);
      this.label.getParameter('BackgroundColor').setValue(this.colorParam.getValue());

      this.billboard = new zeaEngine.BillboardItem('DistanceBillboard', this.label);
      this.billboard.getParameter('LocalXfo').setValue(new zeaEngine.Xfo());
      this.billboard.getParameter('PixelsPerMeter').setValue(1500);
      this.billboard.getParameter('AlignedToCamera').setValue(true);
      this.billboard.getParameter('DrawOnTop').setValue(true);
      this.billboard.getParameter('FixedSizeOnscreen').setValue(true);
      this.billboard.getParameter('Alpha').setValue(1);

      this.addChild(this.billboard);

      this.colorParam.on('valueChanged', () => {
        const color = this.colorParam.getValue();
        this.markerMaterial.getParameter('BaseColor').setValue(color);
        this.lineMaterial.getParameter('BaseColor').setValue(color);
        this.label.getParameter('BackgroundColor').setValue(color);
      });
    }

    /**
     * Updates the measured value
     */
    updateMeasurement() {
      const startXfo = this.startMarker.getParameter('GlobalXfo').getValue();
      const endXfo = this.endMarker.getParameter('GlobalXfo').getValue();

      const vector = endXfo.tr.subtract(startXfo.tr);
      const distance = vector.length();

      const lineXfo = startXfo.clone();
      lineXfo.ori.setFromDirectionAndUpvector(vector, new zeaEngine.Vec3(vector.z, vector.x, vector.y));
      lineXfo.sc.z = distance;

      this.lineGeomItem.getParameter('GlobalXfo').setValue(lineXfo);

      // Convert meters to mm.
      const distanceInMM = distance * 1000;

      this.label.getParameter('Text').setValue(`${parseFloat(distanceInMM.toFixed(4))}${this.unitsParameter.getValue()}`);

      vector.normalizeInPlace();
      const midPoint = startXfo.tr.add(vector.scale(distance * 0.5));
      const labelXfo = new zeaEngine.Xfo(midPoint);
      labelXfo.ori.setFromDirectionAndUpvector(vector, new zeaEngine.Vec3(vector.z, vector.x, vector.y));
      this.billboard.getParameter('GlobalXfo').setValue(labelXfo);
    }

    /**
     *
     *
     * @param {Vec3} position
     */
    setStartMarkerPos(position) {
      const newXfo = this.startMarker.getParameter('GlobalXfo').getValue();
      newXfo.tr = position;
      this.startMarker.getParameter('GlobalXfo').setValue(newXfo);
      this.updateMeasurement();
    }

    /**
     *
     *
     * @param {Vec3} position
     */
    setEndMarkerPos(position) {
      const endXfo = this.endMarker.getParameter('GlobalXfo').getValue();
      endXfo.tr = position;
      this.endMarker.getParameter('GlobalXfo').setValue(endXfo);
      this.updateMeasurement();
    }

    /**
     *
     *
     * @param {boolean} isVisible -
     */
    setGeomBuffersVisibility(isVisible) {
      this.startMarker.setSelectable(!isVisible);
      this.endMarker.setSelectable(!isVisible);
    }

    /**
     *
     * @return {string}
     */
    getMeasurementText() {
      return this.label.getParameter('Text').getValue()
    }
  }

  zeaEngine.Registry.register('MeasureDistance', MeasureDistance);

  const sphere$1 = new zeaEngine.Sphere(0.003, 24, 12, false);
  const line$1 = new zeaEngine.Lines(0.0);
  line$1.setNumVertices(2);
  line$1.setNumSegments(1);
  line$1.setSegmentVertexIndices(0, 0, 1);
  line$1.getVertexAttribute('positions').getValueRef(1).setFromOther(new zeaEngine.Vec3(0, 0, 1));
  /**
   *
   *
   * @extends {TreeItem}
   */
  class MeasureAngle extends zeaEngine.TreeItem {
    /**
     * Creates an instance of MeasureAngle.
     * @param {string} name
     * @param {Color} color
     */
    constructor(name = 'MeasureAngle', color = new zeaEngine.Color('#00AA00')) {
      super(name);

      this.colorParam = this.addParameter(new zeaEngine.ColorParameter('Color', color));

      this.markerMaterial = new zeaEngine.Material('Marker', 'HandleShader');
      this.markerMaterial.getParameter('BaseColor').setValue(this.colorParam.getValue());
      this.markerMaterial.getParameter('MaintainScreenSize').setValue(1);
      this.markerMaterial.getParameter('Overlay').setValue(0.5);

      this.markerMaterialB = new zeaEngine.Material('Marker', 'HandleShader');
      this.markerMaterialB.getParameter('BaseColor').setValue(new zeaEngine.Color(1, 0, 0));
      this.markerMaterialB.getParameter('MaintainScreenSize').setValue(1);
      this.markerMaterialB.getParameter('Overlay').setValue(0.5);

      this.lineMaterial = new zeaEngine.Material('Line', 'LinesShader');
      this.lineMaterial.getParameter('BaseColor').setValue(this.colorParam.getValue());
      this.lineMaterial.getParameter('Overlay').setValue(0.5);

      this.markerA = new zeaEngine.GeomItem(`markerA`, sphere$1, this.markerMaterial);
      this.markerB = new zeaEngine.GeomItem(`markerB`, sphere$1, this.markerMaterialB);
      this.addChild(this.markerA);
      this.addChild(this.markerB);
    }

    /**
     * Given the 2 marker positions, calculate and display the angle.
     */
    createLinesAndLabel() {
      this.markerA.addChild(new zeaEngine.GeomItem('Line', line$1, this.lineMaterial), false);
      this.markerB.addChild(new zeaEngine.GeomItem('Line', line$1, this.lineMaterial), false);

      this.label = new zeaEngine.Label('Distance');
      this.label.getParameter('FontSize').setValue(20);
      this.label.getParameter('BackgroundColor').setValue(this.colorParam.getValue());

      this.billboard = new zeaEngine.BillboardItem('DistanceBillboard', this.label);
      this.billboard.getParameter('LocalXfo').setValue(new zeaEngine.Xfo());
      this.billboard.getParameter('PixelsPerMeter').setValue(1500);
      this.billboard.getParameter('AlignedToCamera').setValue(true);
      this.billboard.getParameter('DrawOnTop').setValue(true);
      this.billboard.getParameter('FixedSizeOnscreen').setValue(true);
      this.billboard.getParameter('Alpha').setValue(1);

      this.addChild(this.billboard);

      this.colorParam.on('valueChanged', () => {
        const color = this.colorParam.getValue();
        this.markerMaterial.getParameter('BaseColor').setValue(color);
        this.lineMaterial.getParameter('BaseColor').setValue(color);
        this.label.getParameter('BackgroundColor').setValue(color);
      });

      // ////////////////////////////////////////
      // Calculate the angle
      const xfoA = this.markerA.getParameter('GlobalXfo').getValue();
      const xfoB = this.markerB.getParameter('GlobalXfo').getValue();

      const normA = xfoA.ori.getZaxis();
      const normB = xfoB.ori.getZaxis();

      const axis = normA.cross(normB).normalize();
      const tangentA = axis.cross(normA).normalize();
      const tangentB = axis.cross(normB).normalize();

      const rayA = new zeaEngine.Ray(xfoA.tr, tangentA);
      const rayB = new zeaEngine.Ray(xfoB.tr, tangentB);
      const params = rayA.intersectRayVector(rayB);

      const angle = tangentA.angleTo(tangentB);

      const labelXfo = new zeaEngine.Xfo();
      labelXfo.tr.addInPlace(rayA.pointAtDist(params[0]));
      labelXfo.tr.addInPlace(rayB.pointAtDist(params[1]));
      labelXfo.tr.scaleInPlace(0.5);

      xfoA.ori.setFromDirectionAndUpvector(tangentA, normA);
      this.markerA.getParameter('GlobalXfo').setValue(xfoA);
      xfoB.ori.setFromDirectionAndUpvector(tangentB, normA);
      this.markerB.getParameter('GlobalXfo').setValue(xfoB);

      const lineAXfo = new zeaEngine.Xfo();
      lineAXfo.sc.z = params[0];
      this.markerA.getChild(0).getParameter('LocalXfo').setValue(lineAXfo);
      const lineBXfo = new zeaEngine.Xfo();
      lineBXfo.sc.z = params[1];
      this.markerB.getChild(0).getParameter('LocalXfo').setValue(lineBXfo);

      this.label.getParameter('Text').setValue(`${(angle / (Math.PI / 180)).toFixed(3)} °`);

      this.billboard.getParameter('GlobalXfo').setValue(labelXfo);
    }

    /**
     *
     *
     * @param {Xfo} xfo
     */
    setXfoA(xfo) {
      this.markerA.getParameter('GlobalXfo').setValue(xfo);
      this.markerB.getParameter('GlobalXfo').setValue(xfo);
    }

    /**
     *
     *
     * @return {Xfo}
     */
    getXfoA() {
      return this.markerA.getParameter('GlobalXfo').getValue()
    }

    /**
     *
     *
     * @param {Xfo} xfo
     */
    setXfoB(xfo) {
      this.markerB.getParameter('GlobalXfo').setValue(xfo);
      this.createLinesAndLabel();
    }
  }

  zeaEngine.Registry.register('MeasureAngle', MeasureAngle);

  /**
   * Represents a Measurement change.
   *
   * @extends Change
   */
  class MeasurementChange extends Change {
    /**
     * Creates an instance of MeasurementChange.
     *
     * @param {TreeItem} measurement - The parent that the measurement will be added to.
     */
    constructor(measurement) {
      super('MeasurementChange');

      if (measurement) {
        this.measurement = measurement;
      }
    }

    /**
     *
     *
     * @param {object} data - An object containing potentially the start and end positions.
     * @memberof MeasurementChange
     */
    update(data) {
      this.measurement.fromJSON(data.measurementData);
      this.emit('updated', data);
    }

    /**
     *
     */
    end() {
      this.measurement.setGeomBuffersVisibility(true);
    }

    /**
     * Removes recently created geometry from its parent.
     */
    undo() {
      console.log('undo MeasurementChange');
      this.parentItem = this.measurement.getOwner();
      this.childIndex = this.parentItem.getChildIndex(this.measurement);
      this.parentItem.removeChild(this.childIndex);
    }

    /**
     * Restores recently created geometry and adds it to the specified parent tree item.
     */
    redo() {
      console.log('redo MeasurementChange');
      this.parentItem.insertChild(this.measurement, this.childIndex);
    }

    /**
     * Serializes the change as a JSON object.
     *
     * @param {object} context - The context value
     * @return {object} - The serialized change
     */
    toJSON(context) {
      const j = super.toJSON(context);
      j.parentItemPath = this.measurement.getOwner().getPath();
      j.measurementType = zeaEngine.Registry.getBlueprintName(this.measurement);
      j.measurementData = this.measurement.toJSON(context);
      return j
    }

    /**
     * Restores geometry from using the specified JSON
     *
     * @param {object} j - The j param.
     * @param {object} context - The appData param.
     */
    fromJSON(j, context) {
      const sceneRoot = context.appData.scene.getRoot();
      const parentItem = sceneRoot.resolvePath(j.parentItemPath, 1);
      if (parentItem) {
        this.measurement = zeaEngine.Registry.constructBlueprintName(j.measurementType);
        this.measurement.fromJSON(j.measurementData);
        parentItem.addChild(this.measurement);
      }
    }

    /**
     * Removes geometry item reference from change change.
     */
    destroy() {}
  }

  UndoRedoManager.registerChange('MeasurementChange', MeasurementChange);

  /**
   * UI Tool for measurements
   *
   * @extends {BaseTool}
   */
  class MeasureDistanceTool extends zeaEngine.BaseTool {
    /**
     * Creates an instance of MeasureDistanceTool.
     *
     * @param {object} appData - The appData value
     */
    constructor(appData) {
      super();

      this.colorParam = this.addParameter(new zeaEngine.ColorParameter('Color', new zeaEngine.Color('#F9CE03')));
      if (!appData) console.error('App data not provided to tool');
      this.appData = appData;
      this.measurementChange = null;
      this.highlightedItemA = null;
      this.highlightedItemB = null;
      this.stage = 0;
    }

    /**
     * The activateTool method.
     */
    activateTool() {
      super.activateTool();
      if (this.appData && this.appData.renderer) {
        this.prevCursor = this.appData.renderer.getGLCanvas().style.cursor;
        this.appData.renderer.getGLCanvas().style.cursor = 'crosshair';
      }
    }

    /**
     * The deactivateTool method.
     */
    deactivateTool() {
      super.deactivateTool();
      if (this.appData && this.appData.renderer) {
        this.appData.renderer.getGLCanvas().style.cursor = this.prevCursor;
      }

      if (this.stage != 0) {
        const parentItem = this.measurement.getOwner();
        parentItem.removeChild(parentItem.getChildIndex(this.measurement));
        this.measurement = null;

        if (this.highlightedItemB) {
          this.highlightedItemB.removeHighlight('measure', true);
          this.highlightedItemB = null;
        }
        if (this.highlightedItemA) {
          this.highlightedItemA.removeHighlight('measure', true);
          this.highlightedItemA = null;
        }
        this.stage = 0;
      }
    }

    /**
     * @param {GeomItem} geomItem
     * @param {Vec3} pos
     * @return {Vec3}
     * @private
     */
    snapToParametricEdge(geomItem, pos) {
      const xfo = geomItem.getParameter('GlobalXfo').getValue();
      if (geomItem.hasParameter('CurveType')) {
        const curveType = geomItem.getParameter('CurveType').getValue();

        switch (curveType) {
          case 'Line': {
            const crvToPnt = pos.subtract(xfo.tr);
            const xaxis = xfo.ori.getXaxis();
            return xfo.tr.add(xaxis.scale(crvToPnt.dot(xaxis)))
          }
          case 'Circle': {
            const crvToPnt = pos.subtract(xfo.tr);
            const radius = geomItem.getParameter('Radius').getValue() * xfo.sc.x;
            const zaxis = xfo.ori.getZaxis();
            crvToPnt.subtractInPlace(zaxis.scale(crvToPnt.dot(zaxis)));
            const length = crvToPnt.length();
            return xfo.tr.add(crvToPnt.scale(radius / length))
          }
          default: {
            console.log('Unhandled Edge Type: ', curveType);
          }
        }
      } else if (geomItem.hasParameter('SurfaceType')) {
        const surfaceType = geomItem.getParameter('SurfaceType').getValue();

        switch (surfaceType) {
          case 'Plane': {
            const srfToPnt = pos.subtract(xfo.tr);
            const zaxis = xfo.ori.getZaxis();
            return pos.subtract(zaxis.scale(srfToPnt.dot(zaxis)))
          }
          case 'Cylinder': {
            const srfToPnt = pos.subtract(xfo.tr);
            const zaxis = xfo.ori.getZaxis();
            const pointOnAxis = xfo.tr.add(zaxis.scale(srfToPnt.dot(zaxis)));

            const radius = geomItem.getParameter('Radius').getValue() * xfo.sc.x;
            const axisToPnt = pos.subtract(pointOnAxis);
            const length = axisToPnt.length();
            return pointOnAxis.add(axisToPnt.scale(radius / length))
          }
          default: {
            console.log('Unhandled Surface Type: ', surfaceType);
          }
        }
      }
    }

    /**
     *
     *
     * @param {MouseEvent|TouchEvent} event - The event value
     */
    onPointerDown(event) {
      // skip if the alt key is held. Allows the camera tool to work
      if (event.altKey || (event.pointerType === 'mouse' && event.button !== 0) || !event.intersectionData) return

      if (this.stage == 0) {
        if (this.highlightedItemA) {
          const ray = event.pointerRay;
          let hitPos;
          if (event.intersectionData) {
            hitPos = ray.start.add(ray.dir.scale(event.intersectionData.dist));
          } else {
            const plane = new zeaEngine.Ray(new zeaEngine.Vec3(), new zeaEngine.Vec3(0, 0, 1));
            const distance = ray.intersectRayPlane(plane);
            hitPos = ray.start.add(ray.dir.scale(distance));
          }

          const startPos = this.snapToParametricEdge(this.highlightedItemA, hitPos);
          const color = this.colorParam.getValue();

          this.measurement = new MeasureDistance('Measure Distance', color);
          this.measurement.setStartMarkerPos(startPos);
          this.measurement.setEndMarkerPos(startPos);
          this.appData.scene.getRoot().addChild(this.measurement);

          this.measurementChange = new MeasurementChange(this.measurement);
          UndoRedoManager.getInstance().addChange(this.measurementChange);

          this.stage++;
          event.stopPropagation();
        }
      } else if (this.stage == 1) {
        if (this.highlightedItemB) {
          const ray = event.pointerRay;
          const hitPos = ray.start.add(ray.dir.scale(event.intersectionData.dist));
          const startPos = this.snapToParametricEdge(this.highlightedItemA, hitPos);
          const endPos = this.snapToParametricEdge(this.highlightedItemB, hitPos);
          this.measurement.setStartMarkerPos(startPos);
          this.measurement.setEndMarkerPos(endPos);

          if (this.highlightedItemA) {
            this.highlightedItemA.removeHighlight('measure', true);
            this.highlightedItemA = null;
          }
          if (this.highlightedItemB) {
            this.highlightedItemB.removeHighlight('measure', true);
            this.highlightedItemB = null;
          }
          this.stage = 0;
          this.measurement = null;
          event.stopPropagation();
        }
      }
    }

    /**
     *
     *
     * @param {MouseEvent|TouchEvent} event - The event value
     */
    onPointerMove(event) {
      // skip if the alt key is held. Allows the camera tool to work
      if (event.altKey || (event.pointerType === 'mouse' && event.button !== 0)) return

      if (this.stage == 0) {
        if (event.intersectionData) {
          const { geomItem } = event.intersectionData;
          if (geomItem.hasParameter('CurveType') || geomItem.hasParameter('SurfaceType')) {
            if (!geomItem != this.highlightedItemA) {
              if (this.highlightedItemA) {
                this.highlightedItemA.removeHighlight('measure', true);
              }
              this.highlightedItemA = geomItem;
              this.highlightedItemA.addHighlight('measure', new zeaEngine.Color(1, 1, 1, 0.2), true);
            }
          }
        } else {
          if (this.highlightedItemA) {
            this.highlightedItemA.removeHighlight('measure', true);
            this.highlightedItemA = null;
          }
        }
        event.stopPropagation();
      } else if (this.stage == 1) {
        if (event.intersectionData) {
          const { geomItem } = event.intersectionData;
          if (geomItem != this.highlightedItemA && geomItem != this.highlightedItemB) {
            if (geomItem.hasParameter('CurveType') || geomItem.hasParameter('SurfaceType')) {
              if (this.highlightedItemB) {
                this.highlightedItemB.removeHighlight('measure', true);
                this.highlightedItemB = null;
              }

              this.highlightedItemB = geomItem;
              this.highlightedItemB.addHighlight('measure', new zeaEngine.Color(1, 1, 1, 0.2), true);
            }
          }
        } else {
          if (this.highlightedItemB) {
            this.highlightedItemB.removeHighlight('measure', true);
            this.highlightedItemB = null;
          }
        }

        event.stopPropagation();
      }
    }

    /**
     *
     *
     * @param {MouseEvent|TouchEvent} event - The event value
     */
    onPointerUp(event) {}
  }

  /**
   * UI Tool for measurements
   *
   * @extends {BaseTool}
   */
  class MeasureCenterDistancesTool extends zeaEngine.BaseTool {
    /**
     * Creates an instance of MeasureCenterDistancesTool.
     *
     * @param {object} appData - The appData value
     */
    constructor(appData) {
      super();

      this.colorParam = this.addParameter(new zeaEngine.ColorParameter('Color', new zeaEngine.Color('#F9CE03')));
      if (!appData) console.error('App data not provided to tool');
      this.appData = appData;
      this.measurementChange = null;
      this.highlightedItemA = null;
      this.highlightedItemB = null;
      this.stage = 0;
    }

    /**
     * The activateTool method.
     */
    activateTool() {
      super.activateTool();
      if (this.appData && this.appData.renderer) {
        this.prevCursor = this.appData.renderer.getGLCanvas().style.cursor;
        this.appData.renderer.getGLCanvas().style.cursor = 'crosshair';
      }
    }

    /**
     * The deactivateTool method.
     */
    deactivateTool() {
      super.deactivateTool();
      if (this.appData && this.appData.renderer) {
        this.appData.renderer.getGLCanvas().style.cursor = this.prevCursor;
      }

      if (this.stage != 0) {
        const parentItem = this.measurement.getOwner();
        parentItem.removeChild(parentItem.getChildIndex(this.measurement));
        this.measurement = null;

        if (this.highlightedItemB) {
          this.highlightedItemB.removeHighlight('measure', true);
          this.highlightedItemB = null;
        }
        if (this.highlightedItemA) {
          this.highlightedItemA.removeHighlight('measure', true);
          this.highlightedItemA = null;
        }
        this.stage = 0;
      }
    }

    /**
     * @param {GeomItem} geomItem
     * @param {string} key
     * @private
     */
    highlightEdge(geomItem, key) {}

    /**
     * @param {GeomItem} geomItem
     * @param {Vec3} pos
     * @return {Vec3}
     * @private
     */
    snapToParametricCenter(geomItem, pos) {
      const xfo = geomItem.getParameter('GlobalXfo').getValue();
      if (geomItem.hasParameter('CurveType')) {
        const curveType = geomItem.getParameter('CurveType').getValue();

        switch (curveType) {
          case 'Circle': {
            const crvToPnt = pos.subtract(xfo.tr);
            const zaxis = xfo.ori.getZaxis();
            return xfo.tr.add(zaxis.scale(crvToPnt.dot(zaxis)))
          }
          default: {
            console.log('Unhandled Edge Type: ', curveType);
          }
        }
      } else if (geomItem.hasParameter('SurfaceType')) {
        const surfaceType = geomItem.getParameter('SurfaceType').getValue();

        switch (surfaceType) {
          case 'Cylinder':
          case 'Cone': {
            const srfToPnt = pos.subtract(xfo.tr);
            const zaxis = xfo.ori.getZaxis();
            return xfo.tr.add(zaxis.scale(srfToPnt.dot(zaxis)))
          }
          default: {
            console.log('Unhandled Surface Type: ', surfaceType);
          }
        }
      }
    }

    /**
     *
     *
     * @param {MouseEvent|TouchEvent} event - The event value
     */
    onPointerDown(event) {
      // skip if the alt key is held. Allows the camera tool to work
      if (event.altKey || (event.pointerType === 'mouse' && event.button !== 0) || !event.intersectionData) return

      if (this.stage == 0) {
        if (this.highlightedItemA) {
          const ray = event.pointerRay;
          let hitPos;
          if (event.intersectionData) {
            hitPos = ray.start.add(ray.dir.scale(event.intersectionData.dist));
          } else {
            const plane = new zeaEngine.Ray(new zeaEngine.Vec3(), new zeaEngine.Vec3(0, 0, 1));
            const distance = ray.intersectRayPlane(plane);
            hitPos = ray.start.add(ray.dir.scale(distance));
          }

          const startPos = this.snapToParametricCenter(this.highlightedItemA, hitPos);
          const color = this.colorParam.getValue();

          this.measurement = new MeasureDistance('Measure Distance', color);
          this.measurement.setStartMarkerPos(startPos);
          this.measurement.setEndMarkerPos(startPos);
          this.appData.scene.getRoot().addChild(this.measurement);

          this.measurementChange = new MeasurementChange(this.measurement);
          UndoRedoManager.getInstance().addChange(this.measurementChange);

          this.stage++;
          event.stopPropagation();
        }
      } else if (this.stage == 1) {
        if (this.highlightedItemB) {
          const ray = event.pointerRay;
          const hitPos = ray.start.add(ray.dir.scale(event.intersectionData.dist));
          let endPos = this.snapToParametricCenter(this.highlightedItemB, hitPos);
          const startPos = this.snapToParametricCenter(this.highlightedItemA, endPos);
          endPos = this.snapToParametricCenter(this.highlightedItemB, startPos);
          this.measurement.setStartMarkerPos(startPos);
          this.measurement.setEndMarkerPos(endPos);

          if (this.highlightedItemA) {
            this.highlightedItemA.removeHighlight('measure', true);
            this.highlightedItemA = null;
          }
          if (this.highlightedItemB) {
            this.highlightedItemB.removeHighlight('measure', true);
            this.highlightedItemB = null;
          }
          this.stage = 0;
          this.measurement = null;
          event.stopPropagation();
        }
      }
    }

    /**
     * Checks to see if the surface is appropriate for this kind of measurement.
     * @param {GeomItem} geomItem - The geomItem to check
     * @return {boolean}
     */
    checkGeom(geomItem) {
      if (geomItem.hasParameter('CurveType')) {
        const curveTypeParm = geomItem.getParameter('CurveType');
        return curveTypeParm.getValue() == 'Circle'
      }
      if (geomItem.hasParameter('SurfaceType')) {
        const surfaceTypeParm = geomItem.getParameter('SurfaceType');
        return surfaceTypeParm.getValue() == 'Cone' || surfaceTypeParm.getValue() == 'Cylinder'
      }
    }

    /**
     *
     *
     * @param {MouseEvent|TouchEvent} event - The event value
     */
    onPointerMove(event) {
      // skip if the alt key is held. Allows the camera tool to work
      if (event.altKey || (event.pointerType === 'mouse' && event.button !== 0)) return

      if (this.stage == 0) {
        if (event.intersectionData) {
          const { geomItem } = event.intersectionData;
          if (geomItem != this.highlightedItemA && this.checkGeom(geomItem)) {
            if (this.highlightedItemA) {
              this.highlightedItemA.removeHighlight('measure', true);
            }
            this.highlightedItemA = geomItem;

            const color = this.colorParam.getValue().clone();
            color.a = 0.2;
            this.highlightedItemA.addHighlight('measure', color, true);
          }
        } else {
          if (this.highlightedItemA) {
            this.highlightedItemA.removeHighlight('measure', true);
            this.highlightedItemA = null;
          }
        }
        event.stopPropagation();
      } else if (this.stage == 1) {
        if (event.intersectionData) {
          const { geomItem } = event.intersectionData;
          if (geomItem != this.highlightedItemA && geomItem != this.highlightedItemB && this.checkGeom(geomItem)) {
            if (this.highlightedItemB) {
              this.highlightedItemB.removeHighlight('measure', true);
              this.highlightedItemB = null;
            }

            this.highlightedItemB = geomItem;
            const color = this.colorParam.getValue().clone();
            color.a = 0.2;
            this.highlightedItemB.addHighlight('measure', color, true);
          }
        } else {
          if (this.highlightedItemB) {
            this.highlightedItemB.removeHighlight('measure', true);
            this.highlightedItemB = null;
          }
        }
        event.stopPropagation();
      }
    }

    /**
     *
     *
     * @param {MouseEvent|TouchEvent} event - The event value
     */
    onPointerUp(event) {}
  }

  /**
   * UI Tool for measurements
   *
   * @extends {BaseTool}
   */
  class MeasureRadiusTool extends zeaEngine.BaseTool {
    /**
     * Creates an instance of MeasureRadiusTool.
     *
     * @param {object} appData - The appData value
     */
    constructor(appData) {
      super();

      this.colorParam = this.addParameter(new zeaEngine.ColorParameter('Color', new zeaEngine.Color('#F9CE03')));
      if (!appData) console.error('App data not provided to tool');
      this.appData = appData;
      this.highlightedItemA = null;
    }

    /**
     * The activateTool method.
     */
    activateTool() {
      super.activateTool();
      if (this.appData && this.appData.renderer) {
        this.prevCursor = this.appData.renderer.getGLCanvas().style.cursor;
        this.appData.renderer.getGLCanvas().style.cursor = 'crosshair';
      }
    }

    /**
     * The deactivateTool method.
     */
    deactivateTool() {
      super.deactivateTool();
      if (this.appData && this.appData.renderer) {
        this.appData.renderer.getGLCanvas().style.cursor = this.prevCursor;
      }
    }

    /**
     *
     *
     * @param {MouseEvent|TouchEvent} event - The event value
     */
    onPointerDown(event) {
      // skip if the alt key is held. Allows the camera tool to work
      if (event.altKey || (event.pointerType === 'mouse' && event.button !== 0) || !event.intersectionData) return

      if (this.highlightedItemA) {
        const ray = event.pointerRay;
        let hitPos;
        if (event.intersectionData) {
          hitPos = ray.start.add(ray.dir.scale(event.intersectionData.dist));
        } else {
          const plane = new zeaEngine.Ray(new zeaEngine.Vec3(), new zeaEngine.Vec3(0, 0, 1));
          const distance = ray.intersectRayPlane(plane);
          hitPos = ray.start.add(ray.dir.scale(distance));
        }
        const geomItem = this.highlightedItemA;
        const xfo = geomItem.getParameter('GlobalXfo').getValue();
        let axisPos;
        let edgePos;
        if (geomItem.hasParameter('CurveType')) {
          const curveType = geomItem.getParameter('CurveType').getValue();
          switch (curveType) {
            case 'Circle': {
              const crvToPnt = hitPos.subtract(xfo.tr);
              const radius = geomItem.getParameter('Radius').getValue() * xfo.sc.x;
              const zaxis = xfo.ori.getZaxis();
              crvToPnt.subtractInPlace(zaxis.scale(crvToPnt.dot(zaxis)));
              const length = crvToPnt.length();
              axisPos = xfo.tr;
              edgePos = axisPos.add(crvToPnt.scale(radius / length));
            }
            default: {
              console.log('Unhandled Edge Type: ', curveType);
            }
          }
        } else if (geomItem.hasParameter('SurfaceType')) {
          const surfaceType = geomItem.getParameter('SurfaceType').getValue();
          switch (surfaceType) {
            case 'Cylinder': {
              const srfToPnt = hitPos.subtract(xfo.tr);
              const zaxis = xfo.ori.getZaxis();
              axisPos = xfo.tr.add(zaxis.scale(srfToPnt.dot(zaxis)));

              const radius = geomItem.getParameter('Radius').getValue() * xfo.sc.x;
              const axisToPnt = hitPos.subtract(axisPos);
              const length = axisToPnt.length();
              edgePos = axisPos.add(axisToPnt.scale(radius / length));
            }
            default: {
              console.log('Unhandled Surface Type: ', surfaceType);
            }
          }
        }
        const color = this.colorParam.getValue();

        const measurement = new MeasureDistance('MeasureRadius', color);
        measurement.setStartMarkerPos(axisPos);
        measurement.setEndMarkerPos(edgePos);
        measurement.setGeomBuffersVisibility(false);
        this.appData.scene.getRoot().addChild(measurement);

        const measurementChange = new MeasurementChange(measurement);
        UndoRedoManager.getInstance().addChange(measurementChange);

        if (this.highlightedItemA) this.highlightedItemA.removeHighlight('measure', true);
        event.stopPropagation();
      }
    }

    /**
     *
     *
     * @param {MouseEvent|TouchEvent} event - The event value
     */
    onPointerMove(event) {
      // skip if the alt key is held. Allows the camera tool to work
      if (event.altKey || (event.pointerType === 'mouse' && event.button !== 0)) return

      if (!this.dragging) {
        if (event.intersectionData) {
          const { geomItem } = event.intersectionData;
          if (
            (geomItem.hasParameter('CurveType') && geomItem.getParameter('CurveType').getValue() == 'Circle') ||
            (geomItem.hasParameter('SurfaceType') && geomItem.getParameter('SurfaceType').getValue() == 'Cylinder')
          ) {
            if (geomItem != this.highlightedItemA) {
              if (this.highlightedItemA) {
                this.highlightedItemA.removeHighlight('measure', true);
              }
              this.highlightedItemA = geomItem;
              const color = this.colorParam.getValue().clone();
              color.a = 0.2;
              this.highlightedItemA.addHighlight('measure', color, true);
            }
          }
        } else {
          if (this.highlightedItemA) {
            this.highlightedItemA.removeHighlight('measure', true);
            this.highlightedItemA = null;
          }
        }
      }
    }

    /**
     *
     *
     * @param {MouseEvent|TouchEvent} event - The event value
     */
    onPointerUp(event) {}
  }

  /**
   * UI Tool for measurements
   *
   * @extends {BaseTool}
   */
  class MeasureAngleTool extends zeaEngine.BaseTool {
    /**
     * Creates an instance of MeasureAngleTool.
     *
     * @param {object} appData - The appData value
     */
    constructor(appData) {
      super();

      this.colorParam = this.addParameter(new zeaEngine.ColorParameter('Color', new zeaEngine.Color('#F9CE03')));
      if (!appData) console.error('App data not provided to tool');
      this.appData = appData;
      this.measurementChange = null;
      this.highlightedItemA = null;
      this.highlightedItemAHitPos = null;
      this.highlightedItemB = null;
      this.stage = 0;
    }

    /**
     * The activateTool method.
     */
    activateTool() {
      super.activateTool();
      if (this.appData && this.appData.renderer) {
        this.prevCursor = this.appData.renderer.getGLCanvas().style.cursor;
        this.appData.renderer.getGLCanvas().style.cursor = 'crosshair';
      }
    }

    /**
     * The deactivateTool method.
     */
    deactivateTool() {
      super.deactivateTool();
      if (this.appData && this.appData.renderer) {
        this.appData.renderer.getGLCanvas().style.cursor = this.prevCursor;
      }
      if (this.stage != 0) {
        const parentItem = this.measurement.getOwner();
        parentItem.removeChild(parentItem.getChildIndex(this.measurement));
        this.measurement = null;

        if (this.highlightedItemB) {
          this.highlightedItemB.removeHighlight('measure', true);
          this.highlightedItemB = null;
        }
        if (this.highlightedItemA) {
          this.highlightedItemA.removeHighlight('measure', true);
          this.highlightedItemA = null;
        }
        this.stage = 0;
      }
    }

    /**
     * Checks to see if the surface is appropriate for this kind of measurement.
     * @param {GeomItem} geomItem - The geomItem to check
     * @return {boolean}
     */
    checkSurface(geomItem) {
      const surfaceTypeParm = geomItem.getParameter('SurfaceType');
      return (
        surfaceTypeParm &&
        (surfaceTypeParm.getValue() == 'Plane' ||
          surfaceTypeParm.getValue() == 'Cone' ||
          surfaceTypeParm.getValue() == 'Cylinder')
      )
    }

    /**
     *
     *
     * @param {MouseEvent|TouchEvent} event - The event value
     */
    onPointerDown(event) {
      // skip if the alt key is held. Allows the camera tool to work
      if (event.altKey || (event.pointerType === 'mouse' && event.button !== 0) || !event.intersectionData) return

      const getSurfaceXfo = (geomItem, hitPos, closestTo) => {
        const xfo = new zeaEngine.Xfo();
        const surfaceTypeParm = geomItem.getParameter('SurfaceType');
        if (surfaceTypeParm) {
          const surfaceType = surfaceTypeParm.getValue();
          switch (surfaceType) {
            case 'Plane': {
              const geomMat = geomItem.getParameter('GeomMat').getValue();
              const srfToPnt = hitPos.subtract(geomMat.translation);
              let zaxis = geomMat.zAxis.clone();
              if (zaxis.dot(event.pointerRay.dir) > 0) zaxis = zaxis.negate();

              const hitPos2 = hitPos;
              if (closestTo) {
                const normA = zaxis;
                const normB = closestTo.ori.getZaxis();
                const vectorAB = closestTo.tr.subtract(hitPos);
                const axis = normA.cross(normB).normalize();
                hitPos2.addInPlace(axis.scale(vectorAB.dot(axis)));
              }

              xfo.ori.setFromDirectionAndUpvector(zaxis, new zeaEngine.Vec3(zaxis.z, zaxis.x, zaxis.y));
              xfo.tr = hitPos2.subtract(zaxis.scale(srfToPnt.dot(zaxis)));
              break
            }
            case 'Cone': {
              const globalXfo = geomItem.getParameter('GlobalXfo').getValue();
              const semiAngle = geomItem.getParameter('SemiAngle').getValue();
              const startRadius = geomItem.getParameter('StartRadius').getValue();
              const zaxis = globalXfo.ori.getZaxis();
              const zaxisDist = hitPos.subtract(globalXfo.tr).dot(zaxis);
              const radiusAtPoint = startRadius + Math.tan(semiAngle) * zaxisDist;
              let hitPos2 = hitPos;
              if (closestTo) {
                const vec2 = closestTo.tr.subtract(globalXfo.tr);
                vec2.subtractInPlace(zaxis.scale(vec2.dot(zaxis)));
                hitPos2 = globalXfo.tr.add(vec2.normalize().scale(radiusAtPoint));
                hitPos2.addInPlace(zaxis.scale(zaxisDist));
              }
              const vec = hitPos2.subtract(globalXfo.tr);
              xfo.ori.setFromDirectionAndUpvector(zaxis, vec);
              const rot = new zeaEngine.Quat();
              rot.setFromAxisAndAngle(new zeaEngine.Vec3(1, 0, 0), semiAngle);
              xfo.ori.multiplyInPlace(rot);
              xfo.tr = hitPos2;

              const zaxis2 = globalXfo.ori.getZaxis();
              const angle = zaxis2.angleTo(xfo.ori.getZaxis());
              console.log(angle, semiAngle);
              break
            }
            case 'Cylinder': {
              const globalXfo = geomItem.getParameter('GlobalXfo').getValue();
              const radius = geomItem.getParameter('Radius').getValue() * globalXfo.sc.x;
              const zaxis = globalXfo.ori.getZaxis();
              const zaxisDist = hitPos.subtract(globalXfo.tr).dot(zaxis);
              const pointOnAxis = globalXfo.tr.add(zaxis.scale(zaxisDist));

              const axisToPnt = hitPos.subtract(pointOnAxis);
              const length = axisToPnt.length();
              let hitPos2 = pointOnAxis.add(axisToPnt.scale(radius / length));
              if (closestTo) {
                const vec2 = closestTo.tr.subtract(globalXfo.tr);
                vec2.subtractInPlace(zaxis.scale(vec2.dot(zaxis)));
                hitPos2 = globalXfo.tr.add(vec2.normalize().scale(radius));
                hitPos2.addInPlace(zaxis.scale(zaxisDist));
              }
              const vec = hitPos2.subtract(globalXfo.tr);
              xfo.ori.setFromDirectionAndUpvector(zaxis, vec);
              const rot = new zeaEngine.Quat();
              rot.setFromAxisAndAngle(new zeaEngine.Vec3(1, 0, 0), Math.PI * 0.5);
              xfo.ori.multiplyInPlace(rot);
              xfo.tr = hitPos2;
              break
            }
            default: {
              console.log('Unhandled Surface Type: ', surfaceType);
            }
          }
        }
        return xfo
      };

      if (this.stage == 0) {
        const { geomItem } = event.intersectionData;
        if (this.checkSurface(geomItem)) {
          const color = this.colorParam.getValue();
          this.measurement = new MeasureAngle('MeasureAngle', color);
          this.appData.scene.getRoot().addChild(this.measurement);

          const ray = event.pointerRay;
          const hitPos = ray.start.add(ray.dir.scale(event.intersectionData.dist));
          const xfoA = getSurfaceXfo(geomItem, hitPos);
          this.measurement.setXfoA(xfoA);

          this.geomItemA = geomItem;
          this.hitPosA = hitPos;

          this.stage++;
          event.stopPropagation();
        }
      } else if (this.stage == 1) {
        const { geomItem } = event.intersectionData;
        if (this.checkSurface(geomItem)) {
          const ray = event.pointerRay;
          const hitPos = ray.start.add(ray.dir.scale(event.intersectionData.dist));
          const xfoB = getSurfaceXfo(geomItem, hitPos);
          // this.measurement.setXfoB(xfoB)
          const xfoA = getSurfaceXfo(this.geomItemA, this.hitPosA, xfoB);
          this.measurement.setXfoA(xfoA);

          // const xfoB2 = getSurfaceXfo(geomItem, hitPos, xfoA)
          this.measurement.setXfoB(xfoB);

          const measurementChange = new MeasurementChange(this.measurement);
          UndoRedoManager.getInstance().addChange(measurementChange);

          if (this.highlightedItemA) this.highlightedItemA.removeHighlight('measure', true);
          if (this.highlightedItemB) this.highlightedItemB.removeHighlight('measure', true);

          this.stage = 0;
          event.stopPropagation();
        }
      }
    }

    /**
     *
     *
     * @param {MouseEvent|TouchEvent} event - The event value
     */
    onPointerMove(event) {
      // skip if the alt key is held. Allows the camera tool to work
      if (event.altKey || (event.pointerType === 'mouse' && event.button !== 0)) return

      if (this.stage == 0) {
        if (event.intersectionData) {
          const { geomItem } = event.intersectionData;
          if (this.checkSurface(geomItem)) {
            if (geomItem != this.highlightedItemA) {
              if (this.highlightedItemA) {
                this.highlightedItemA.removeHighlight('measure', true);
              }
              this.highlightedItemA = geomItem;
              const color = this.colorParam.getValue().clone();
              color.a = 0.2;
              this.highlightedItemA.addHighlight('measure', color, true);
            }
          }
        } else {
          if (this.highlightedItemA) {
            this.highlightedItemA.removeHighlight('measure', true);
            this.highlightedItemA = null;
          }
        }
      } else if (this.stage == 1) {
        if (event.intersectionData) {
          const { geomItem } = event.intersectionData;
          if (geomItem != this.highlightedItemA && geomItem != this.highlightedItemB && this.checkSurface(geomItem)) {
            if (this.highlightedItemB) {
              this.highlightedItemB.removeHighlight('measure', true);
            }
            this.highlightedItemB = geomItem;

            const color = this.colorParam.getValue().clone();
            color.a = 0.2;
            this.highlightedItemB.addHighlight('measure', color, true);
          }
        } else {
          if (this.highlightedItemB) {
            this.highlightedItemB.removeHighlight('measure', true);
            this.highlightedItemB = null;
          }
        }
      }
    }

    /**
     *
     *
     * @param {MouseEvent|TouchEvent} event - The event value
     */
    onPointerUp(event) {
      if (this.dragging) {
        this.dragging = false;
        this.measurementChange = null;
        if (this.highlightedItemA) this.highlightedItemA.removeHighlight('measure', true);
        event.stopPropagation();
      }
    }
  }

  exports.ArcSlider = ArcSlider;
  exports.AxialRotationHandle = AxialRotationHandle;
  exports.Change = Change;
  exports.CreateCircleChange = CreateCircleChange;
  exports.CreateCircleTool = CreateCircleTool;
  exports.CreateConeChange = CreateConeChange;
  exports.CreateConeTool = CreateConeTool;
  exports.CreateCuboidChange = CreateCuboidChange;
  exports.CreateCuboidTool = CreateCuboidTool;
  exports.CreateFreehandLineChange = CreateFreehandLineChange;
  exports.CreateFreehandLineTool = CreateFreehandLineTool;
  exports.CreateLineChange = CreateLineChange;
  exports.CreateLineTool = CreateLineTool;
  exports.CreateRectChange = CreateRectChange;
  exports.CreateRectTool = CreateRectTool;
  exports.CreateSphereChange = CreateSphereChange;
  exports.CreateSphereTool = CreateSphereTool;
  exports.LinearMovementHandle = LinearMovementHandle;
  exports.MeasureAngle = MeasureAngle;
  exports.MeasureAngleTool = MeasureAngleTool;
  exports.MeasureCenterDistancesTool = MeasureCenterDistancesTool;
  exports.MeasureDistance = MeasureDistance;
  exports.MeasureDistanceTool = MeasureDistanceTool;
  exports.MeasureRadiusTool = MeasureRadiusTool;
  exports.MeasurementChange = MeasurementChange;
  exports.ParameterValueChange = ParameterValueChange;
  exports.PlanarMovementHandle = PlanarMovementHandle;
  exports.ScreenSpaceMovementHandle = ScreenSpaceMovementHandle;
  exports.SelectionChange = SelectionChange;
  exports.SelectionManager = SelectionManager;
  exports.SelectionTool = SelectionTool;
  exports.SelectionVisibilityChange = SelectionVisibilityChange;
  exports.SliderHandle = SliderHandle;
  exports.ToolManager = ToolManager;
  exports.TreeItemAddChange = TreeItemAddChange;
  exports.TreeItemMoveChange = TreeItemMoveChange;
  exports.TreeItemsRemoveChange = TreeItemsRemoveChange;
  exports.UndoRedoManager = UndoRedoManager;
  exports.VRHoldObjectsTool = VRHoldObjectsTool;
  exports.VRUITool = VRUITool;
  exports.XfoHandle = XfoHandle;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=index.umd.js.map
