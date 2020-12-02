const {
  MathFunctions,
  Ray,
  Vec3,
  Color,
  Xfo,
  ColorParameter,
  BaseTool,
  Material,
  GeomItem,
  Sphere,
  TreeItem,
  Lines,
} = window.zeaEngine
const { MeasurementChange, UndoRedoManager } = window.zeaUx
/**
 * UI Tool for measurements
 *
 * @extends {BaseTool}
 */
class MeasurementTool extends BaseTool {
  /**
   * Creates an instance of MeasurementTool.
   *
   * @param {object} appData - The appData value
   */
  constructor(appData) {
    super()

    this.colorParam = this.addParameter(new ColorParameter('Color', new Color('#FCFC00')))
    if (!appData) console.error('App data not provided to tool')
    this.appData = appData
    this.measurementChange = undefined

    const ballMaterial = new Material('ball', 'HandleShader')
    ballMaterial.getParameter('BaseColor').setValue(new Color(1, 0, 0))
    ballMaterial.getParameter('MaintainScreenSize').setValue(true)

    const sphere = new Sphere(0.003)
    this.markerGeomItem0 = new GeomItem('Sphere0', sphere, ballMaterial)
    this.markerGeomItem0.getParameter('Visible').setValue(false)
    this.appData.renderer.addTreeItem(this.markerGeomItem0)
    this.markerGeomItem1 = new GeomItem('Sphere0', sphere, ballMaterial)
    this.markerGeomItem1.getParameter('Visible').setValue(false)
    this.appData.renderer.addTreeItem(this.markerGeomItem1)

    this.highlights = new TreeItem('MeasurementTool_highlights')
    this.appData.renderer.addTreeItem(this.highlights)

    this.tolerance = 0.005
    this.setRootItem(appData.scene.getRoot())
  }

  setRootItem(rootItem) {
    this.rootItem = rootItem
  }

  setTolerance(tolerance) {
    this.tolerance = tolerance
  }

  /**
   * The activateTool method.
   */
  activateTool() {
    super.activateTool()
    this.prevCursor = this.appData.renderer.getGLCanvas().style.cursor
    if (this.appData) this.appData.renderer.getGLCanvas().style.cursor = 'crosshair'
  }

  /**
   * The deactivateTool method.
   */
  deactivateTool() {
    super.deactivateTool()
    if (this.appData) this.appData.renderer.getGLCanvas().style.cursor = this.prevCursor
  }

  /**
   *
   *
   * @param {MouseEvent|TouchEvent} event - The event value
   */
  onPointerDown(event) {
    // skip if the alt key is held. Allows the camera tool to work
    if (event.altKey || (event.pointerType === 'mouse' && event.button !== 0)) return

    if (!this.markerGeomItem0.getParameter('Visible').getValue()) return
    const startPos = this.markerGeomItem0.getParameter('GlobalXfo').getValue().tr

    // const ray = event.pointerRay
    // let startPos
    // if (event.intersectionData) {
    //   startPos = ray.start.add(ray.dir.scale(event.intersectionData.dist))
    // } else {
    //   const plane = new Ray(new Vec3(), new Vec3(0, 0, 1))
    //   const distance = ray.intersectRayPlane(plane)
    //   startPos = ray.start.add(ray.dir.scale(distance))
    // }

    // const color = this.colorParam.getValue()

    // this.measurementChange = new MeasurementChange(this.appData.scene.getRoot(), startPos, color)
    // UndoRedoManager.getInstance().addChange(this.measurementChange)
    this.dragging = true

    event.stopPropagation()
  }

  generateHighlight(result) {
    const segs = 60
    const verts = segs * 2
    if (!this.lineGeomItem) {
      const lines = new Lines()

      lines.setNumVertices(verts)
      lines.setNumSegments(segs)
      for (let i = 0; i < segs; i++) {
        lines.setSegmentVertexIndices(i, i * 2, i * 2 + 1)
      }

      const lineMaterial = new Material('lines', 'LinesShader')
      lineMaterial.getParameter('BaseColor').setValue(new Color(1, 0, 0))
      lineMaterial.getParameter('Overlay').setValue(0.7)

      this.lineGeomItem = new GeomItem('lines', lines, lineMaterial)
      this.highlights.addChild(this.lineGeomItem)
    }
    if (result.shape == 'circle-axis' || result.shape == 'line') {
      const lines = this.lineGeomItem.getParameter('Geometry').getValue()

      const positions = lines.getVertexAttribute('positions')
      if (result.shape == 'circle-axis') {
        const scZ = (result.xfo.sc.x + result.xfo.sc.y) * 0.5
        for (let i = 0; i < verts; i++) {
          positions.getValueRef(i).set(0, 0, MathFunctions.lerp(-result.radius * scZ, result.radius * scZ, i / verts))
        }
      } else if (result.shape == 'line') {
        for (let i = 0; i < verts; i++) {
          positions.getValueRef(i).set(0, 0, MathFunctions.lerp(0, 1, i / verts))
        }
      }
      lines.emit('geomDataChanged')
    } else if (result.shape == 'circle') {
      const lines = this.lineGeomItem.getParameter('Geometry').getValue()

      const radius = result.radius
      const positions = lines.getVertexAttribute('positions')
      for (let i = 0; i < verts; i++) {
        const angle = MathFunctions.lerp(result.domain[0], result.domain[1], i / verts)
        positions.getValueRef(i).set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.0)
      }
      lines.emit('geomDataChanged')
    }

    this.lineGeomItem.getParameter('GlobalXfo').setValue(result.xfo)
  }

  /**
   *
   *
   * @param {MouseEvent|TouchEvent} event - The event value
   */
  onPointerMove(event) {
    if (this.dragging) {
      const data = { ray: event.pointerRay, tolerance: this.tolerance }
      this.rootItem.query('closestEdgeOrSurface', data).then((result) => {
        if (result) {
          this.markerGeomItem1.getParameter('Visible').setValue(true)
          this.markerGeomItem1.getParameter('GlobalXfo').setValue(new Xfo(result.point))
        } else {
          this.markerGeomItem1.getParameter('Visible').setValue(false)
          // const startPos = this.markerGeomItem0.getParameter('GlobalXfo').getValue().tr
          // const param = event.pointerRay.closestPoint(startPos)
          // if (param > 0) {
          //   const pointOnRay = event.pointerRay.start.add(event.pointerRay.dir.scale(param))
          //   this.markerGeomItem1.getParameter('Visible').setValue(true)
          //   this.markerGeomItem1.getParameter('GlobalXfo').setValue(new Xfo(pointOnRay))
          // } else {
          //   this.markerGeomItem1.getParameter('Visible').setValue(false)
          // }
        }

        if (this.markerGeomItem1.getParameter('Visible').getValue()) {
          // Now adjust the snap 0 position based on the snap1 position.
          //
        }

        if (this.snapTarget0) {
          const data = { ray: event.pointerRay, shape: this.snapTarget0.shape }
          this.snapTarget0.geomItem.queryEdge('closestEdgeOrSurface', this.snapTarget0.edgeId, data).then((result) => {
            if (result) {
              this.markerGeomItem0.getParameter('GlobalXfo').setValue(new Xfo(result.point))
            }
          })
        }
      })

      // const ray = event.pointerRay
      // let endPos
      // if (event.intersectionData) {
      //   endPos = ray.start.add(ray.dir.scale(event.intersectionData.dist))
      // } else {
      //   const plane = new Ray(new Vec3(), new Vec3(0, 0, 1))
      //   const distance = ray.intersectRayPlane(plane)
      //   endPos = ray.start.add(ray.dir.scale(distance))
      // }
      // this.measurementChange.update(endPos)
      // event.stopPropagation()
    } else {
      const data = { ray: event.pointerRay, tolerance: this.tolerance }
      this.rootItem.query('closestEdgeOrSurface', data).then((result) => {
        if (result) {
          this.generateHighlight(result)
          this.markerGeomItem0.getParameter('Visible').setValue(true)
          this.markerGeomItem0.getParameter('GlobalXfo').setValue(new Xfo(result.point))
          this.snapTarget0 = result
        } else {
          this.markerGeomItem0.getParameter('Visible').setValue(false)
        }
      })
    }
  }

  /**
   *
   *
   * @param {MouseEvent|TouchEvent} event - The event value
   */
  onPointerUp(event) {
    if (this.dragging) {
      this.dragging = false

      if (
        !this.markerGeomItem0.getParameter('Visible').getValue() ||
        !this.markerGeomItem1.getParameter('Visible').getValue()
      ) {
        // this.measurementChange.cancel()
      } else {
        // this.measurementChange.end()
      }
      // this.measurementChange = undefined
      event.stopPropagation()
    }
  }
}

export { MeasurementTool }
