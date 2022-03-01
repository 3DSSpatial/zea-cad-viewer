import {
  GeomItem,
  CADBody,
  CADPart,
  PMIItem,
  MeshProxy,
  LinesProxy,
  CompoundGeom,
  InstanceItem,
  CADAssembly,
} from '@zeainc/zea-engine'

const collectSceneStats = (root) => {
  const sceneStats = {
    ASSEMBLIES: 0,
    INSTANCE_ITEMS: 0,
    PARTS: 0,
    BODIES: 0,
    GEOMS: 0,
    TRIANGLES: 0,
    LINES: 0,
  }
  root.traverse((item) => {
    if (item instanceof PMIItem) {
      return false
    }
    if (item instanceof CADAssembly) {
      sceneStats.ASSEMBLIES++
    } else if (item instanceof CADPart) {
      sceneStats.PARTS++
    } else if (item instanceof InstanceItem) {
      sceneStats.INSTANCE_ITEMS++
    } else if (item instanceof GeomItem) {
      sceneStats.GEOMS++
      if (item instanceof CADBody) {
        sceneStats.BODIES++
      }
      const geom = item.geomParam.value
      if (geom) {
        if (geom instanceof CompoundGeom) {
          sceneStats.TRIANGLES += geom.getNumTriangles()
          sceneStats.LINES += geom.getNumLineSegments()
        } else if (geom instanceof MeshProxy) {
          sceneStats.TRIANGLES += geom.getNumTriangles()
        } else if (geom instanceof LinesProxy) {
          sceneStats.LINES += geom.getNumLineSegments()
        }
      }
    }
  })

  console.log(sceneStats)
  return sceneStats
}

export { collectSceneStats }
