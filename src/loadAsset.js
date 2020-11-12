const { Xfo, EulerAngles } = window.zeaEngine
const { CADAsset } = window.zeaCad

const loadAsset = (parentItem, appData, data) => {
  const asset = new CADAsset()
  asset.getParameter('FilePath').setValue(data.url)
  // asset.on('loaded', () => {
  //   appData.renderer.frameAll()
  // })
  asset.getMaterialLibrary().on('loaded', () => {
    const materials = asset.getMaterialLibrary().getMaterials()
    materials.forEach((material) => {
      if (material.getShaderName() == 'SimpleSurfaceShader') {
        material.setShaderName('StandardSurfaceShader')
      }
    })
  })
  asset.getGeometryLibrary().on('loaded', () => {
    appData.renderer.frameAll()
  })

  parentItem.addChild(asset)
  return asset
}

export default loadAsset
