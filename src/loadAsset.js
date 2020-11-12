const { Xfo, EulerAngles } = window.zeaEngine
const { CADAsset } = window.zeaCad

const loadAsset = (parentItem, appData, data) => {
  const asset = new CADAsset()
  asset.getParameter('FilePath').setValue(data.url)
  // asset.on('loaded', () => {
  //   appData.renderer.frameAll()
  // })
  asset.getGeometryLibrary().on('loaded', () => {
    appData.renderer.frameAll()
  })

  parentItem.addChild(asset)
  return asset
}

export default loadAsset
