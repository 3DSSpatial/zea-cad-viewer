const { Xfo, EulerAngles } = window.zeaEngine
const { CADAsset } = window.zeaCad

const loadAsset = () => {
  const asset = new CADAsset()
  // const xfo = new Xfo()
  // xfo.sc.set(2);
  // xfo.ori.setFromEulerAngles(new EulerAngles(0.0, Math.PI * -0.5, 0, 'ZXY'))

  // asset.getParameter('GlobalXfo').setValue(xfo)
  asset.getParameter('FilePath').setValue('assets/servo_mestre-visu.zcad')

  return asset
}

export default loadAsset
