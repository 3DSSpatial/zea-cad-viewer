<script>
  import { onMount } from 'svelte';
  import { scene } from '../stores/scene.js'

  import {
    Color,
    Vec3,
    Box3,
    Xfo,
    TreeItem,
    Scene,
    GeomItem,
    CADAsset,
    CADBody,
    CADPart,
  } from '@zeainc/zea-engine'

  let asmExpansion = 0;
  let cmpInitialized = false;

  // ////////////////////////////////////////////
  // Create debug point
  let geomTreeItem;
  const addPoint = (iPt, iRadius, iColor) =>{
    // Create Tree node if not there
    if(!geomTreeItem){
      geomTreeItem = new TreeItem("Pts");
      $scene.getRoot().addChild(geomTreeItem);
    }

    // Create Sphere, green
    let sPt = new Sphere(iRadius, 4)
    const ptGeomMaterial = new Material("ptGeomMaterial", "SimpleSurfaceShader");
    const color = ptGeomMaterial.getParameter("BaseColor")
    if( color)
      color.setValue(iColor);
    const geomItem = new GeomItem("iPt", sPt , ptGeomMaterial);
  
    // Sphere position
    const targXfo = new Xfo();
    targXfo.tr= iPt
    geomItem.localXfoParam.value=targXfo;

    geomTreeItem.addChild(geomItem);
  }

  // ////////////////////////////////////////////
  // Assembly Explode
  $: applyAsmExplode(asmExpansion);

  const debugPoints = false
  let asmDiag = 0
  let asmXfo = new Xfo()
  let asmCenter = new Vec3()
  let asmBBox = new Box3()
  let itemsInfo = new Map()

  const applyAsmExplode = (asmExp) => {
    if( !cmpInitialized ) 
        return;

    $scene.getRoot().traverse((item) => {
      if (item instanceof CADPart) { 
        if(item.getName()=='M10X25g') return
        const itemInfo = itemsInfo.get(item)
        let iCenter = itemInfo.center 
        let tr = iCenter.subtract(asmCenter) //.normalize()
        tr = asmXfo.transformVec3(tr)
        // Using expans^2 so it moves slower when close
        let expans =  asmExp 
        tr.scaleInPlace(expans * expans / 100000 ) // 10 / (1000 * 1000)

        let igXfotr = new Xfo()
        igXfotr.setFromOther(itemInfo.gXfo)
        igXfotr.tr = itemInfo.gXfo.tr.add(tr)
        item.globalXfoParam.value = igXfotr
      }
    })
    //renderer.frameAll()
  }
  
  // ////////////////////////////////////////////
  // Init Asm Explode data
  onMount(async () => {
    console.log('Asm Explode onMount called;');
    initExplodeData();
    cmpInitialized = true;
	});

  const initExplodeData = () => {
    let p0 = new Vec3()
    let p1 = new Vec3()
    const root = $scene.getRoot()
    const rootBBox = root.boundingBoxParam.value
    let rootCenter = rootBBox.center()
    asmDiag = rootBBox.size()
    asmXfo.sc = rootBBox.diagonal()
    let minDist =  Number.MAX_SAFE_INTEGER
    root.traverse((item) => {
      if (item instanceof CADPart) {
        if(item.getName()=='M10X25g') return // hack for JYJ2#1460T***.zcad
        const iBBox = item.boundingBoxParam.value
        const iCenter = iBBox.center()
         // recomputing asmBBox since rootBBox sometimes has pb (see M10X25g in JYJ2#1460T***.zcad )
        asmBBox.addPoint(iCenter)
        let dist =  iCenter.distanceTo(rootCenter)
        if(dist < minDist ){
          minDist = dist
          asmCenter = iCenter
          p0 = iBBox.p0
          p1 = iBBox.p1
        }
        let igXfo = item.globalXfoParam.value
        itemsInfo.set(item, {gXfo:igXfo, center:iCenter} )
      }
    })
    asmXfo.sc = asmBBox.diagonal().normalize()
    if(asmXfo.sc.x>0.8) asmXfo.sc.x = 0.1 // for parts mostly cylindrical
    if(asmXfo.sc.y>0.8) asmXfo.sc.y = 0.1
    if(asmXfo.sc.z>0.8) asmXfo.sc.z = 0.1
    //console.log('asmXfo.sc x=' + asmXfo.sc.x + ' y=' + asmXfo.sc.y + ' z=' + asmXfo.sc.z + ' diag=' + asmDiag)
    //console.log('asmCenter x=' + asmCenter.x + ' y=' + asmCenter.y + ' z=' + asmCenter.z + ' diag=' + asmDiag)
    
    // Visualize debug BBox
    if (debugPoints) {
      let rad = asmDiag / 100
      let green = new Color(0, 1, 0)
      addPoint(asmBBox.center(), rad, green)
      addPoint(asmBBox.p0, rad, green)
      addPoint(asmBBox.p1, rad, green)
      let blue = new Color(0, 0, 1)
      addPoint(asmCenter, rad, blue)
      addPoint(p0, rad, blue)
      addPoint(p1, rad, blue)
    }
  }
  
</script>

<input type=range bind:value={asmExpansion} min=0 max=1000>

<style>
    input[type="range"] {
        width:90%;
        margin: auto;
    }
</style>