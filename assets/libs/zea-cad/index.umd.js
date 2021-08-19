(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@zeainc/zea-engine')) :
  typeof define === 'function' && define.amd ? define(['exports', '@zeainc/zea-engine'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.zeaCad = {}, global.zeaEngine));
}(this, (function (exports, zeaEngine) { 'use strict';

  const CADCurveTypes = {
    CURVE_TYPE_LINE: 20,
    CURVE_TYPE_CIRCLE: 21,
    CURVE_TYPE_ELIPSE: 22,
    //  CURVE_TYPE_HYPERBOLA: 23,
    //  CURVE_TYPE_PARABOLA: 24,
    //  CURVE_TYPE_BEZIERCURVE: 25,
    CURVE_TYPE_NURBS_CURVE: 26,
    //  CURVE_TYPE_OFFSET_CURVE: 27,
    //  CURVE_TYPE_TRIMMED_CURVE: 28
  };

  const CADSurfaceTypes = {
    SURFACE_TYPE_PLANE: 0,
    SURFACE_TYPE_CONE: 1,
    SURFACE_TYPE_CYLINDER: 2,
    SURFACE_TYPE_SPHERE: 3,
    SURFACE_TYPE_TORUS: 4,
    SURFACE_TYPE_LINEAR_EXTRUSION: 5,
    SURFACE_TYPE_REVOLUTION: 6,
    //  SURFACE_TYPE_BEZIER_SURFACE: 7,
    SURFACE_TYPE_NURBS_SURFACE: 8,
    SURFACE_TYPE_OFFSET_SURFACE: 9,
    SURFACE_TYPE_TRIMMED_RECT_SURFACE: 10,
    SURFACE_TYPE_POLY_PLANE: 14,
    SURFACE_TYPE_FAN: 15,
    SURFACE_TYPE_REVOLUTION_FLIPPED_DOMAIN: 16,
  };

  const getCurveTypeName = (id) => {
    switch (id) {
      case CADCurveTypes.CURVE_TYPE_LINE:
        return 'CURVE_TYPE_LINE'
      case CADCurveTypes.CURVE_TYPE_CIRCLE:
        return 'CURVE_TYPE_CIRCLE'
      case CADCurveTypes.CURVE_TYPE_ELIPSE:
        return 'CURVE_TYPE_ELIPSE'
      // case CADCurveTypes.CURVE_TYPE_HYPERBOLA: return 'CURVE_TYPE_HYPERBOLA';
      // case CADCurveTypes.CURVE_TYPE_PARABOLA: return 'CURVE_TYPE_PARABOLA';
      // case CADCurveTypes.CURVE_TYPE_BEZIERCURVE: return 'CURVE_TYPE_BEZIERCURVE';
      case CADCurveTypes.CURVE_TYPE_NURBS_CURVE:
        return 'CURVE_TYPE_NURBS_CURVE'
      // case CADCurveTypes.CURVE_TYPE_OFFSET_CURVE: return 'CURVE_TYPE_OFFSET_CURVE';
      // case CADCurveTypes.CURVE_TYPE_TRIMMED_CURVE: return 'CURVE_TYPE_TRIMMED_CURVE';
    }
  };

  const getSurfaceTypeName = (id) => {
    switch (id) {
      case CADSurfaceTypes.SURFACE_TYPE_PLANE:
        return 'SURFACE_TYPE_PLANE'
      case CADSurfaceTypes.SURFACE_TYPE_CONE:
        return 'SURFACE_TYPE_CONE'
      case CADSurfaceTypes.SURFACE_TYPE_CYLINDER:
        return 'SURFACE_TYPE_CYLINDER'
      case CADSurfaceTypes.SURFACE_TYPE_SPHERE:
        return 'SURFACE_TYPE_SPHERE'
      case CADSurfaceTypes.SURFACE_TYPE_TORUS:
        return 'SURFACE_TYPE_TORUS'
      case CADSurfaceTypes.SURFACE_TYPE_LINEAR_EXTRUSION:
        return 'SURFACE_TYPE_LINEAR_EXTRUSION'
      case CADSurfaceTypes.SURFACE_TYPE_REVOLUTION:
        return 'SURFACE_TYPE_REVOLUTION'
      //    case CADSurfaceTypes.SURFACE_TYPE_BEZIER_SURFACE: return 'SURFACE_TYPE_BEZIER_SURFACE';
      case CADSurfaceTypes.SURFACE_TYPE_NURBS_SURFACE:
        return 'SURFACE_TYPE_NURBS_SURFACE'
      case CADSurfaceTypes.SURFACE_TYPE_OFFSET_SURFACE:
        return 'SURFACE_TYPE_OFFSET_SURFACE'
      case CADSurfaceTypes.SURFACE_TYPE_TRIMMED_RECT_SURFACE:
        return 'SURFACE_TYPE_TRIMMED_RECT_SURFACE'
      case CADSurfaceTypes.SURFACE_TYPE_POLY_PLANE:
        return 'SURFACE_TYPE_POLY_PLANE'
      case CADSurfaceTypes.SURFACE_TYPE_FAN:
        return 'SURFACE_TYPE_FAN'
      case CADSurfaceTypes.SURFACE_TYPE_REVOLUTION_FLIPPED_DOMAIN:
        return 'SURFACE_TYPE_REVOLUTION_FLIPPED_DOMAIN'
    }
  };

  const geomLibraryHeaderSize = 8; // 2 FP16 pixels at the start of the GeomLibrary and CurveLibrary
  // const pixelsPerDrawItem = 10 // The number of RGBA pixels per draw item.
  const pixelsPerDrawItem = 3; // tr, ori, sc: number of RGBA pixels per draw item.
  const valuesPerCurveTocItem = 8;
  const valuesPerSurfaceTocItem = 9;
  const valuesPerCurveLibraryLayoutItem = 8;
  const valuesPerSurfaceLibraryLayoutItem = 8;
  //const valuesPerSurfaceRef = 11 // A surfaceRef within a BodyDesc// This is now different based on the version.
  const drawItemShaderAttribsStride = 8;
  const floatsPerSceneBody = 2;
  const drawShaderAttribsStride = 4; //drawCoords: body ID, Surface index in Body, Surface Id, TrimSet Id // + 2 drawItemTexAddr
  const numValuesPerTrimSetCurveRef = 14; //patchCoords.xyzw, tr.xy, ori.xy, ori.zy, addr.xy, flags, curveId, curveIndexWithinLoop
  const CURVE_FLAG_COST_IS_DETAIL = 1 << 3;

  const SURFACE_FLAG_PERIODIC_U = 1 << 0;
  const SURFACE_FLAG_PERIODIC_V = 1 << 1;
  const SURFACE_FLAG_FLIPPED_NORMAL = 1 << 4;
  const SURFACE_FLAG_FLIPPED_UV = 1 << 5;
  const SURFACE_FLAG_COST_IS_DETAIL_U = 1 << 6;
  const SURFACE_FLAG_COST_IS_DETAIL_V = 1 << 7;

  const BODY_FLAG_CUTAWAY = 1 << 8;
  const BODY_FLAG_INVISIBLE = 1 << 9;

  /** Class representing a hull.
   * @extends Lines
   * @ignore
   */
  class Hull extends zeaEngine.Lines {
    /**
     * Create a hull.
     * @param {number} numCPsU - The numCPsU value.
     * @param {number} numCPsV - The numCPsV value.
     */
    constructor(numCPsU = 1, numCPsV = 1) {
      super();
      this.__numSpansU = numCPsU - 1;
      this.__numSpansV = numCPsV - 1;
      this.__rebuild();
    }

    /**
     * The __rebuild method.
     * @private
     */
    __rebuild() {
      this.setNumVertices((this.__numSpansU + 1) * (this.__numSpansV + 1));
      this.setNumSegments(this.__numSpansU * (this.__numSpansV + 1) + (this.__numSpansU + 1) * this.__numSpansV);

      let idx = 0;
      for (let j = 0; j <= this.__numSpansV; j++) {
        for (let i = 0; i < this.__numSpansU; i++) {
          const v0 = (this.__numSpansU + 1) * j + i;
          const v1 = (this.__numSpansU + 1) * j + (i + 1);
          this.setSegmentVertexIndices(idx, v0, v1);
          idx++;
        }
      }
      for (let j = 0; j < this.__numSpansV; j++) {
        for (let i = 0; i <= this.__numSpansU; i++) {
          const v0 = (this.__numSpansU + 1) * j + i;
          const v1 = (this.__numSpansU + 1) * (j + 1) + i;
          this.setSegmentVertexIndices(idx, v0, v1);
          idx++;
        }
      }
    }
  }
  // export default Hull;

  /** Class representing a CAD surface library.
   * @ignore
   */
  class CADSurfaceLibrary {
    /**
     * Create a CAD surface library.
     * @param {any} cadAsset - The cadAsset value.
     * @param {any} trimSetLibrary - The trimSetLibrary value.
     */
    constructor(cadAsset, trimSetLibrary) {
      this.__cadAsset = cadAsset;
      this.__trimSetLibrary = trimSetLibrary;
      this.__curveLibraryBuffer = undefined;
      this.__meshes = [];
      this.__hulls = [];
      this.__formFactors = {};

      this.__maxNumKnots = 0;
    }

    /**
     * The setBinaryBuffers method.
     * @param {any} curveLibraryBuffer - The curveLibraryBuffer param.
     * @param {any} surfaceLibraryBuffer - The surfaceLibraryBuffer param.
     * @param {number} version - The version param.
     */
    setBinaryBuffers(curveLibraryBuffer, surfaceLibraryBuffer, cadDataVersion) {
      this.__surfaceLibraryBuffer = surfaceLibraryBuffer;
      this.cadDataVersion = cadDataVersion;
      this.__surfaceLibraryReader = new zeaEngine.BinReader(this.__surfaceLibraryBuffer);

      this.__surfaceLibrarySize = Math.sqrt(surfaceLibraryBuffer.byteLength / 8); // RGBA16 pixels
      this.__numSurfaces = this.__surfaceLibraryReader.loadUInt32();
      this.__totalSurfaceArea = this.__surfaceLibraryReader.loadFloat32();

      // this.__totalSurfaceCost = this.__surfaceLibraryReader.loadFloat32();

      // for (let i = 0; i < this.__numCurves; i++) {
      //   const dims = this.getCurveDims(i);
      //   console.log(this.getCurveTypeLabel(i), " length:", dims.length, " curvature:", dims.curvature);
      // }
      // for (let i = 0; i < this.__numSurfaces; i++) {
      //   const dims = this.getSurfaceDims(i);
      //   const area = dims.sizeU * dims.sizeV;

      //   console.log(this.getSurfaceTypeLabel(i), " sizeU:", dims.sizeU, " sizeV:", dims.sizeV, " curvatureU:", dims.curvatureU, " curvatureV:", dims.curvatureV);
      // }

      // if (this.__totalSurfaceArea == 0.0) {
      //   this.__totalSurfaceArea == 0.0;
      //   this.__totalSurfaceCost = 0.0;
      // for (let i = 0; i < this.__numSurfaces; i++) {
      //   const dims = this.getSurfaceDims(i);
      //   const area = dims.sizeU * dims.sizeV;

      //   console.log(this.getSurfaceTypeLabel(i), " sizeU:", dims.sizeU, " sizeV:", dims.sizeV, " curvatureU:", dims.curvatureU, " curvatureV:", dims.curvatureV);
      //   // this.__totalSurfaceArea += area;
      //   // this.__totalSurfaceCost += (1.0 + (dims.sizeU * dims.curvatureU)) * (1.0 + (dims.sizeV * dims.curvatureV));
      // }
      // }
      // console.log(this.__totalSurfaceCost);

      // this.__triCounts = [
      //   10,
      //   20,
      //   40,
      //   80,
      // ]

      if (this.__totalSurfaceArea == 0.0) {
        for (let i = 0; i < this.__numSurfaces; i++) {
          const dims = this.getSurfaceDims(i);
          const area = dims.sizeU * dims.sizeV;
          this.__totalSurfaceArea += area;
        }
      }

      this.__curveLibraryBuffer = curveLibraryBuffer;
      this.__curveLibraryReader = new zeaEngine.BinReader(this.__curveLibraryBuffer);
      this.__curveLibrarySize = Math.sqrt(curveLibraryBuffer.byteLength / 8); // RGBA16 pixels
      this.__numCurves = this.__curveLibraryReader.loadUInt32();

      // for (let i = 0; i < this.__numSurfaces; i++) {
      //   console.log(this.getSurfaceData(i, false));
      // }
      // for (let i = 0; i < this.__numCurves; i++) {
      //   console.log(this.getCurveData(i));
      // }
    }

    /**
     * The getCurveBuffer method.
     * @return {any} - The return value.
     */
    getCurveBuffer() {
      return this.__curveLibraryBuffer
    }

    /**
     * The getSurfaceBuffer method.
     * @return {any} - The return value.
     */
    getSurfaceBuffer() {
      return this.__surfaceLibraryBuffer
    }

    /**
     * The getNumSurfaces method.
     * @return {any} - The return value.
     */
    getNumSurfaces() {
      return this.__numSurfaces
    }

    /**
     * The getNumCurves method.
     * @return {any} - The return value.
     */
    getNumCurves() {
      return this.__numCurves
    }

    /**
     * The getDetailFactor method.
     * @param {any} lod - The lod param.
     * @return {any} - The return value.
     */
    getDetailFactor(lod) {
      // Given a target poly count, calculate the detail factor given the total surface cost.
      // const targetQuadCount = this.__triCounts[Math.clamp(0, lod, this.__triCounts.length-1)] * 1000;
      // return targetQuadCount / this.__totalSurfaceCost;
      const mult = Math.pow(2, lod);
      return mult * this.__cadAsset.curvatureToDetail
    }

    /**
     * The getCurveDataTexelCoords method.
     * @param {any} curveId - The curveId param.
     * @return {any} - The return value.
     */
    getCurveDataTexelCoords(curveId) {
      this.__curveLibraryReader.seek(geomLibraryHeaderSize + curveId * (valuesPerCurveTocItem * 2) /* bpc*/);
      const x = this.__curveLibraryReader.loadFloat16();
      const y = this.__curveLibraryReader.loadFloat16();
      return {
        x,
        y,
      }
    }

    /**
     * The __seekCurveData method.
     * @param {any} curveId - The curveId param.
     * @param {number} offsetInBytes - The offsetInBytes param.
     * @private
     */
    __seekCurveData(curveId, offsetInBytes = 0) {
      const addr = this.getCurveDataTexelCoords(curveId);
      // X, Y in pixels.

      const bytesPerPixel = 8; // RGBA16 pixel
      const byteOffset = addr.x * bytesPerPixel + addr.y * bytesPerPixel * this.__curveLibrarySize;
      // console.log("__seekSurfaceData:" + curveId + " byteOffset:" + (byteOffset +offset) + " pixel:" + ((byteOffset +offset)/8) + " x:" + addr.x + " y:" + addr.y);
      this.__curveLibraryReader.seek(byteOffset + offsetInBytes);
    }

    /**
     * The getCurveType method.
     * @param {any} curveId - The curveId param.
     * @return {any} - The return value.
     */
    getCurveType(curveId) {
      this.__seekCurveData(curveId);
      const curveType = this.__curveLibraryReader.loadFloat16();
      return curveType
    }

    /**
     * The getCurveTypeLabel method.
     * @param {any} curveId - The curveId param.
     * @return {any} - The return value.
     */
    getCurveTypeLabel(curveId) {
      const curveType = this.getCurveType(curveId);
      return getCurveTypeName(curveType)
    }

    /**
     * The getCurveTypeLabel method.
     * @param {any} curveId - The curveId param.
     * @return {any} - The return value.
     */
    getCurveDims(curveId) {
      this.__curveLibraryReader.seek(geomLibraryHeaderSize + curveId * (valuesPerCurveTocItem * 2) /* bpc*/);

      return {
        addrX: this.__curveLibraryReader.loadFloat16(),
        addrY: this.__curveLibraryReader.loadFloat16(),
        curvature: this.__curveLibraryReader.loadFloat16(),
        length: this.__curveLibraryReader.loadFloat16(),
        flags: this.__curveLibraryReader.loadFloat16(),
      }
    }

    /**
     * The getCurveTypeLabel method.
     * @param {any} curveId - The curveId param.
     * @return {any} - The return value.
     */
    getCurveData(curveId) {
      const dims = this.getCurveDims(curveId);
      const curveType = this.getCurveType(curveId);
      const domain = new zeaEngine.Vec2(this.__curveLibraryReader.loadFloat16(), this.__curveLibraryReader.loadFloat16());

      switch (curveType) {
        case CADCurveTypes.CURVE_TYPE_LINE: {
          return {
            curveId,
            dims,
            curveType: 'CURVE_TYPE_LINE',
            domain,
          }
        }
        case CADCurveTypes.CURVE_TYPE_CIRCLE: {
          const radius = this.__curveLibraryReader.loadFloat16();
          return {
            curveId,
            dims,
            curveType: 'CURVE_TYPE_CIRCLE',
            domain,
            radius,
          }
        }
        case CADCurveTypes.CURVE_TYPE_ELIPSE: {
          const majorRadius = this.__curveLibraryReader.loadFloat16();
          const minorRadius = this.__curveLibraryReader.loadFloat16();
          return {
            curveId,
            dims,
            curveType: 'SURFACE_TYPE_CYLINDER',
            domain,
            majorRadius,
            minorRadius,
          }
        }
        case CADCurveTypes.CURVE_TYPE_NURBS_CURVE: {
          const degree = this.__curveLibraryReader.loadFloat16();
          const numCPs = this.__curveLibraryReader.loadFloat16();
          const numKnots = this.__curveLibraryReader.loadFloat16();
          this.__curveLibraryReader.advance(4);

          const controlPoints = [];
          for (let j = 0; j < numCPs; j++) {
            const p = new zeaEngine.Vec4(
              this.__curveLibraryReader.loadFloat16(),
              this.__curveLibraryReader.loadFloat16(),
              this.__curveLibraryReader.loadFloat16(),
              this.__curveLibraryReader.loadFloat16()
            );
            controlPoints.push(p);
          }
          const knots = [];
          for (let j = 0; j < numKnots; j++) {
            knots.push(this.__curveLibraryReader.loadFloat16());
          }
          return {
            curveId,
            dims,
            curveType: 'CURVE_TYPE_NURBS_CURVE',
            domain,
            degree,
            numCPs,
            controlPoints,
            knots,
          }
        }
        default:
          console.warn('Invalid Curve Type:', curveType);
      }
    }

    /**
     * The getSurfaceDataTexelCoords method.
     * @param {any} surfaceId - The surfaceId param.
     * @return {any} - The return value.
     */
    getSurfaceDataTexelCoords(surfaceId) {
      this.__surfaceLibraryReader.seek(geomLibraryHeaderSize + surfaceId * (valuesPerSurfaceTocItem * 2) /* bpc*/);
      const x = this.__surfaceLibraryReader.loadUFloat16();
      const y = this.__surfaceLibraryReader.loadUFloat16();
      return {
        x,
        y,
      }
    }

    /**
     * The __seekSurfaceData method.
     * @param {any} surfaceId - The surfaceId param.
     * @param {number} offsetInBytes - The offsetInBytes param.
     * @private
     */
    __seekSurfaceData(surfaceId, offsetInBytes = 0) {
      const addr = this.getSurfaceDataTexelCoords(surfaceId);
      // X, Y in pixels.

      const bytesPerPixel = 8; // RGBA16 pixel
      const byteOffset = addr.x * bytesPerPixel + addr.y * bytesPerPixel * this.__surfaceLibrarySize;
      // console.log("__seekSurfaceData:" + surfaceId + " byteOffset:" + (byteOffset +offset) + " pixel:" + ((byteOffset +offset)/8) + " x:" + addr.x + " y:" + addr.y);
      this.__surfaceLibraryReader.seek(byteOffset + offsetInBytes);
    }

    /**
     * The getSurfaceType method.
     * @param {any} surfaceId - The surfaceId param.
     * @return {any} - The return value.
     */
    getSurfaceType(surfaceId) {
      this.__seekSurfaceData(surfaceId);
      const surfaceType = this.__surfaceLibraryReader.loadFloat16();
      return surfaceType
    }

    /**
     * The getSurfaceTypeLabel method.
     * @param {any} surfaceId - The surfaceId param.
     * @return {any} - The return value.
     */
    getSurfaceTypeLabel(surfaceId) {
      const surfaceType = this.getSurfaceType(surfaceId);
      return getSurfaceTypeName(surfaceType)
    }

    /**
     * The getSurfaceDims method.
     * @param {any} surfaceId - The surfaceId param.
     * @return {any} - The return value.
     */
    getSurfaceDims(surfaceId) {
      this.__surfaceLibraryReader.seek(geomLibraryHeaderSize + surfaceId * (valuesPerSurfaceTocItem * 2) /* bpc*/);

      const loadTrimSetId = () => {
        if (this.cadDataVersion.compare([0, 0, 27]) < 0) {
          // Note: -1 is a valid value for trimset id, so can't use an unsigned float value.
          const partA = this.__surfaceLibraryReader.loadFloat16();
          const partB = this.__surfaceLibraryReader.loadFloat16();
          return partA + (partB << 8)
        } else {
          return this.__surfaceLibraryReader.loadSInt32From2xFloat16()
        }
      };
      return {
        addrX: this.__surfaceLibraryReader.loadUFloat16(),
        addrY: this.__surfaceLibraryReader.loadUFloat16(),
        curvatureU: this.__surfaceLibraryReader.loadFloat16(),
        curvatureV: this.__surfaceLibraryReader.loadFloat16(),
        sizeU: this.__surfaceLibraryReader.loadFloat16(), // size U
        sizeV: this.__surfaceLibraryReader.loadFloat16(), // size V
        flags: this.__surfaceLibraryReader.loadFloat16(),
        trimSetId: loadTrimSetId(), // trimSetId
      }
    }

    /**
     * The getSurfaceData method.
     * @param {any} surfaceId - The surfaceId param.
     * @return {any} - The return value.
     */
    getSurfaceData(surfaceId, includeTrimSet = true) {
      const dims = this.getSurfaceDims(surfaceId);

      const surfaceType = this.getSurfaceType(surfaceId);
      const readDomain = () => {
        const domain = new zeaEngine.Box2();
        domain.p0.x = this.__surfaceLibraryReader.loadFloat16();
        domain.p0.y = this.__surfaceLibraryReader.loadFloat16();
        domain.p1.x = this.__surfaceLibraryReader.loadFloat16();
        domain.p1.y = this.__surfaceLibraryReader.loadFloat16();
        return domain
      };
      if (dims.trimSetId >= 0 && includeTrimSet) dims.trimSet = this.__trimSetLibrary.getTrimSetCurves(dims.trimSetId);

      switch (surfaceType) {
        case CADSurfaceTypes.SURFACE_TYPE_PLANE: {
          const domain = readDomain();
          return {
            surfaceId,
            dims,
            surfaceType: 'SURFACE_TYPE_PLANE',
            domain,
          }
        }
        case CADSurfaceTypes.SURFACE_TYPE_FAN: {
          const domain = readDomain();
          const points = [];
          const numPoints = dims.curvatureU + 1;
          for (let j = 0; j < numPoints; j++) {
            const p = new zeaEngine.Vec2(this.__surfaceLibraryReader.loadFloat16(), this.__surfaceLibraryReader.loadFloat16());
            points.push(p);
          }
          return {
            surfaceId,
            dims,
            surfaceType: 'SURFACE_TYPE_FAN',
            domain,
            points,
          }
        }
        case CADSurfaceTypes.SURFACE_TYPE_CONE: {
          const domain = readDomain();
          const radius = this.__surfaceLibraryReader.loadFloat16();
          const semiAngle = this.__surfaceLibraryReader.loadFloat16();
          return {
            surfaceId,
            dims,
            surfaceType: 'SURFACE_TYPE_CONE',
            domain,
            radius,
            semiAngle,
          }
        }
        case CADSurfaceTypes.SURFACE_TYPE_CYLINDER: {
          const domain = readDomain();
          const radius = this.__surfaceLibraryReader.loadFloat16();
          return {
            surfaceId,
            dims,
            surfaceType: 'SURFACE_TYPE_CYLINDER',
            domain,
            radius,
          }
        }
        case CADSurfaceTypes.SURFACE_TYPE_SPHERE: {
          const domain = readDomain();
          const radius = this.__surfaceLibraryReader.loadFloat16();
          return {
            surfaceId,
            dims,
            surfaceType: 'SURFACE_TYPE_SPHERE',
            domain,
            radius,
          }
        }
        case CADSurfaceTypes.SURFACE_TYPE_TORUS: {
          const domain = readDomain();
          const majorRadius = this.__surfaceLibraryReader.loadFloat16();
          const minorRadius = this.__surfaceLibraryReader.loadFloat16();
          return {
            surfaceId,
            dims,
            surfaceType: 'SURFACE_TYPE_TORUS',
            domain,
            majorRadius,
            minorRadius,
          }
        }
        case CADSurfaceTypes.SURFACE_TYPE_LINEAR_EXTRUSION: {
          const domain = readDomain();

          let curveIndex;
          // if (this.cadDataVersion.compare([0, 0, 27]) < 0) {
          //   // Note: -1 is a valid value for trimset id, so can't use an unsigned float value.
          //   const partA = this.__surfaceLibraryReader.loadFloat16()
          //   const partB = this.__surfaceLibraryReader.loadFloat16()
          //   curveIndex = partA + (partB << 8)
          // } else {
          // curveIndex = this.__surfaceLibraryReader.loadUInt32From2xUFloat16()

          const partA = this.__surfaceLibraryReader.loadUFloat16();
          const partB = this.__surfaceLibraryReader.loadUFloat16();
          curveIndex = partA + partB * 2048;
          // }

          const curveData = this.getCurveData(curveIndex);

          const curve_tr = new zeaEngine.Vec3(
            this.__surfaceLibraryReader.loadFloat16(),
            this.__surfaceLibraryReader.loadFloat16(),
            this.__surfaceLibraryReader.loadFloat16()
          );
          const curve_ori = new zeaEngine.Quat(
            this.__surfaceLibraryReader.loadFloat16(),
            this.__surfaceLibraryReader.loadFloat16(),
            this.__surfaceLibraryReader.loadFloat16(),
            this.__surfaceLibraryReader.loadFloat16()
          );

          return {
            surfaceId,
            dims,
            surfaceType: 'SURFACE_TYPE_LINEAR_EXTRUSION',
            domain,
            curve_tr,
            curve_ori,
            curveData,
            partA,
            partB,
          }
        }
        case CADSurfaceTypes.SURFACE_TYPE_REVOLUTION_FLIPPED_DOMAIN:
        case CADSurfaceTypes.SURFACE_TYPE_REVOLUTION: {
          const domain = readDomain();

          let curveIndex;
          if (this.cadDataVersion.compare([0, 0, 27]) < 0) {
            // Note: -1 is a valid value for trimset id, so can't use an unsigned float value.
            const partA = this.__surfaceLibraryReader.loadFloat16();
            const partB = this.__surfaceLibraryReader.loadFloat16();
            curveIndex = partA + (partB << 8);
          } else {
            curveIndex = this.__surfaceLibraryReader.loadUInt32From2xUFloat16();
          }

          const curve_tr = new zeaEngine.Vec3(
            this.__surfaceLibraryReader.loadFloat16(),
            this.__surfaceLibraryReader.loadFloat16(),
            this.__surfaceLibraryReader.loadFloat16()
          );
          const curve_ori = new zeaEngine.Quat(
            this.__surfaceLibraryReader.loadFloat16(),
            this.__surfaceLibraryReader.loadFloat16(),
            this.__surfaceLibraryReader.loadFloat16(),
            this.__surfaceLibraryReader.loadFloat16()
          );

          const curveData = this.getCurveData(curveIndex);

          return {
            surfaceId,
            dims,
            surfaceType: 'SURFACE_TYPE_REVOLUTION',
            domain,
            curve_tr,
            curve_ori,
            curveData,
          }
        }
        case CADSurfaceTypes.SURFACE_TYPE_NURBS_SURFACE: {
          const domain = readDomain();
          const degreeU = this.__surfaceLibraryReader.loadFloat16();
          const degreeV = this.__surfaceLibraryReader.loadFloat16();
          const numCPsU = this.__surfaceLibraryReader.loadFloat16();

          const numCPsV = this.__surfaceLibraryReader.loadFloat16();
          const numKnotsU = this.__surfaceLibraryReader.loadFloat16();
          const numKnotsV = this.__surfaceLibraryReader.loadFloat16();
          const flags = this.__surfaceLibraryReader.loadFloat16();
          const periodicU = (flags & SURFACE_FLAG_PERIODIC_U) != 0;
          const periodicV = (flags & SURFACE_FLAG_PERIODIC_V) != 0;
          // this.__surfaceLibraryReader.advance(2);

          const controlPoints = [];
          for (let j = 0; j < numCPsU * numCPsV; j++) {
            const p = new zeaEngine.Vec4(
              this.__surfaceLibraryReader.loadFloat16(),
              this.__surfaceLibraryReader.loadFloat16(),
              this.__surfaceLibraryReader.loadFloat16(),
              this.__surfaceLibraryReader.loadFloat16()
            );
            controlPoints.push(p);
          }
          const knotsU = [];
          for (let j = 0; j < numKnotsU; j++) {
            knotsU.push(this.__surfaceLibraryReader.loadFloat16());
          }
          const knotsV = [];
          for (let j = 0; j < numKnotsV; j++) {
            knotsV.push(this.__surfaceLibraryReader.loadFloat16());
          }
          return {
            surfaceId,
            dims,
            surfaceType: 'SURFACE_TYPE_NURBS_SURFACE',
            domain,
            periodicU,
            periodicV,
            degreeU,
            degreeV,
            numCPsU,
            numCPsV,
            controlPoints,
            knotsU,
            knotsV,
          }
        }
        case CADSurfaceTypes.SURFACE_TYPE_POLY_PLANE: {
          const p0 = this.__surfaceLibraryReader.loadFloat16Vec2();
          const p1 = this.__surfaceLibraryReader.loadFloat16Vec2();
          const p2 = this.__surfaceLibraryReader.loadFloat16Vec2();
          const p3 = this.__surfaceLibraryReader.loadFloat16Vec2();
          return {
            surfaceId,
            dims,
            surfaceType: 'SURFACE_TYPE_POLY_PLANE',
            points: [p0, p1, p2, p3],
          }
        }
        default: {
          const surfaceType = this.getSurfaceType(surfaceId);
          console.warn('Invalid Surface Type:', surfaceType, ' surfaceId:', surfaceId);
        }
      }
    }

    /** ************************************************************
     *  NURBS Utils
     **************************************************************/

    /**
     * Finds knot vector span.
     * @param {number} u - Parametric value.
     * @param {number} degree - Degree.
     * @param {array} knots - Knot vector.
     * @param {array} knotValues - The knotValues param.
     * @return {number} - Returns the span.
     */
    findSpan(u, degree, knots, knotValues) {
      if (this.cadDataVersion.compare([0, 0, 6]) >= 0) {
        this.cadDataVersion;
        // EXPORT_KNOTS_AS_DELTAS

        let nextKnot = knots[0];
        let knot = nextKnot;

        let span = 1;
        const n = knots.length - degree - 1;
        // Linear Search...
        for (; span < n; span++) {
          nextKnot += knots[span];
          if (span > degree && u < nextKnot) {
            span--;
            break
          }
          knot = nextKnot;
        }
        if (span == n) {
          span--;
        }

        // Calculate knot values
        knotValues[degree] = knot;
        let left = knot;
        let right = knot;
        for (let i = 1; i <= degree; i++) {
          left -= knots[span - i + 1];
          right += knots[span + i];
          knotValues[degree - i] = left;
          knotValues[degree + i] = right;
        }
        return span
      }
    }

    /**
     * Calculate basis functions.
     * See The NURBS Book, page 70, algorithm A2.2
     * span : span in which u lies
     * @param {any} u - Parametric point.
     * @param {any} degree - Degree.
     * @param {any} knots - Knot vector.
     * @param {any} bvD - The bvD param.
     * @return {any} - Returns array[degree+1] with basis functions values.
     */
    calcBasisValues(u, degree, knots, bvD) {
      const left = [];
      const right = [];
      // Basis[0] is always 1.0
      const basisValues = [1.0];
      bvD[0] = 0.0;

      for (let j = 1; j <= degree; ++j) {
        left[j] = u - knots[degree + 1 - j];
        right[j] = knots[degree + j] - u;

        let saved = 0.0;
        for (let r = 0; r < j; ++r) {
          const rv = right[r + 1];
          const lv = left[j - r];
          const temp = basisValues[r] / (rv + lv);
          basisValues[r] = saved + rv * temp;
          saved = lv * temp;
        }

        basisValues[j] = saved;

        // Calculate N' if on second to last iteration
        if (j == degree - 1 || degree == 1) {
          saved = 0.0;
          // Loop through all basis values
          for (let r = 0; r < degree; r++) {
            // Calculate a temp variable
            const jr_z = r + 1;
            // Calculate right side
            const kp_0 = knots[jr_z + degree];
            const kp_1 = knots[jr_z];
            const tmp = (degree * basisValues[r]) / (kp_0 - kp_1);
            // Calculate derivative value
            bvD[r] = saved - tmp;
            // Swap right side to left
            saved = tmp;
          }
          // Save the last der-basis
          bvD[degree] = saved;
        }
      }

      return basisValues
    }

    /**
     * Calculate basis function derivativess.
     * See The NURBS Book, page 70, algorithm A2.2
     * span : span in which u lies
     * https://github.com/pradeep-pyro/tinynurbs/blob/master/include/tinynurbs/core/basis.h#L163
     * @param {any} u - Parametric point.
     * @param {any} degree - Degree.
     * @param {any} knots - Knot vector.
     * @return {any} - Returns array[degree+1] with basis function derivative values.
     */
    calcBasisDerivatives(u, degree, knots) {
      const left = [];
      const right = [];
      let saved = 0.0;
      let temp = 0.0;

      const ndu = [];
      for (let j = 0; j <= degree; j++) {
        ndu.push([]);
      }
      ndu[0][0] = 1.0;

      for (let j = 1; j <= degree; j++) {
        left[j] = u - knots[degree + 1 - j];
        right[j] = knots[degree + j] - u;
        saved = 0.0;

        for (let r = 0; r < j; r++) {
          const rv = right[r + 1];
          const lv = left[j - r];
          const rvlv = rv + lv;

          // Lower triangle
          ndu[j][r] = rvlv;
          temp = ndu[r][j - 1] / rvlv;
          // Upper triangle
          ndu[r][j] = saved + rv * temp;
          saved = lv * temp;
        }

        ndu[j][j] = saved;
      }

      const ders = [[], []];
      for (let j = 0; j <= degree; j++) {
        ders[0][j] = ndu[j][degree];
      }

      const a = [[], []];
      for (let j = 0; j <= degree; j++) {
        a[0].push(0);
        a[1].push(0);
      }

      for (let r = 0; r <= degree; r++) {
        let s1 = 0;
        let s2 = 1;
        a[0][0] = 1.0;

        // for (int k = 1; k <= 1; k++)
        {
          const k = 1;
          let d = 0.0;
          const rk = r - k;
          const pk = degree - k;
          let j1 = 0;
          let j2 = 0;

          if (r >= k) {
            a[s2][0] = a[s1][0] / ndu[pk + 1][rk];
            d = a[s2][0] * ndu[rk][pk];
          }

          if (rk >= -1) {
            j1 = 1;
          } else {
            j1 = -rk;
          }

          if (r - 1 <= pk) {
            j2 = k - 1;
          } else {
            j2 = degree - r;
          }

          for (let j = j1; j <= j2; j++) {
            a[s2][j] = (a[s1][j] - a[s1][j - 1]) / ndu[pk + 1][rk + j];
            d += a[s2][j] * ndu[rk + j][pk];
          }

          if (r <= pk) {
            a[s2][k] = -a[s1][k - 1] / ndu[pk + 1][r];
            d += a[s2][k] * ndu[r][pk];
          }

          ders[k][r] = d;

          const temp = s1;
          s1 = s2;
          s2 = temp;
        }
      }

      let fac = degree;
      // for (int k = 1; k <= 1; k++)
      {
        const k = 1;
        for (let j = 0; j <= degree; j++) {
          ders[k][j] = ders[k][j] * fac;
        }
        fac *= degree - k;
      }

      return ders
    }

    // http://www.nar-associates.com/nurbs/programs/dbasisu.c
    /* Subroutine to generate B-spline basis functions and their derivatives for uniform open knot vectors. */

    /**
     * Calculate rational B-Spline surface point.
     * See The NURBS Book, page 134, algorithm A4.3
     *
     * p1, p2 : degrees of B-Spline surface
     * U1, U2 : knot vectors
     * P      : control points (x, y, z, w)
     * u, v   : parametric values
     *
     * returns point for given (u, v)
     *
     * @param {any} surfaceData - The surfaceData param.
     * @param {any} params - The params param.
     * @return {any} - The return value.
     */
    calcSurfacePoint(surfaceData, params) {
      const d = surfaceData;

      const u = Math.remap(params[0], 0, 1, d.domain.p0.x, d.domain.p1.x);
      const v = Math.remap(params[1], 0, 1, d.domain.p0.y, d.domain.p1.y);

      const knotValuesU = [];
      const spanU = this.findSpan(u, d.degreeU, d.knotsU, knotValuesU);
      const knotValuesV = [];
      const spanV = this.findSpan(v, d.degreeV, d.knotsV, knotValuesV);

      const bvdsU = [];
      const basisValuesU = this.calcBasisValues(u, d.degreeU, knotValuesU, bvdsU);
      const bvdsV = [];
      const basisValuesV = this.calcBasisValues(v, d.degreeV, knotValuesV, bvdsV);

      // const dersU = this.calcBasisDerivatives(u, d.degreeU, knotValuesU)
      // const dersV = this.calcBasisDerivatives(v, d.degreeV, knotValuesV)
      // const basisValuesU = dersU[0]
      // const basisValuesV = dersV[0]

      // console.log("knotValuesU:", knotValuesU)
      // console.log("basisValuesU:", basisValuesU)
      // console.log("knotValuesV:", knotValuesV)
      // console.log("basisValuesV:", basisValuesV)
      // }
      // else {

      // }

      const pos = new zeaEngine.Vec3(0, 0, 0);
      const tangentU = new zeaEngine.Vec3(0, 0, 0);
      const tangentV = new zeaEngine.Vec3(0, 0, 0);
      let w = 0.0;
      const cvU0 = spanU - d.degreeU;
      const cvV0 = spanV - d.degreeV;
      for (let y = 0; y <= d.degreeV; ++y) {
        // let vindex = (spanV - d.degreeV + y) % d.numCPsV;
        const vindex = cvV0 + y;
        for (let x = 0; x <= d.degreeU; ++x) {
          // const uindex = (spanU - d.degreeU + x) % d.numCPsU;
          const uindex = cvU0 + x;

          const pt = d.controlPoints[uindex + vindex * d.numCPsU];
          const weight = pt.t;

          const bvU = basisValuesU[x];
          const bvV = basisValuesV[y];
          // const bvU = dersU[0][x]
          // const bvV = dersV[0][y]

          const bvw = weight * bvU * bvV;
          pos.addInPlace(pt.scale(bvw));
          w += bvw;

          const bvdU = bvdsU[x];
          const bvdV = bvdsV[y];
          // const bvdU = dersU[1][x]
          // const bvdV = dersV[1][y]
          tangentU.addInPlace(pt.scale(bvdU * bvV));
          tangentV.addInPlace(pt.scale(bvU * bvdV));
        }
      }
      if (w == 0 || isNaN(w) || !isFinite(w)) console.warn('Unable to evaluate surface');

      // console.log('spanV:', spanV, ' v:', v, ' w:', w)
      pos.scaleInPlace(1 / w);

      ///////////////////////////////////////////////////////
      // Calculate normal.
      const spanRangeU = knotValuesU[d.degreeU + 1] - knotValuesU[d.degreeU];
      const spanRangeV = knotValuesV[d.degreeV + 1] - knotValuesV[d.degreeV];
      const eqKnotRangeU = (d.domain.p1.x - d.domain.p0.x) / d.knotsU.length;
      const eqKnotRangeV = (d.domain.p1.y - d.domain.p0.y) / d.knotsV.length;

      // console.log(v, 'spanRangeV:', spanRangeV, ' eqKnotRangeV:', eqKnotRangeV, spanRangeV / eqKnotRangeV)

      // Note: for COOLANT_INLET_PORT_01.ipt_faceWithBlackEdge.
      // this tollerance needed to be quite high. (bigger than 0.005)

      if (spanRangeU / eqKnotRangeU < 0.01) {
        // In some cases (COOLANT_INLET_PORT_01.ipt_faceWithBlackEdge.)
        // we have span segment which has close to zero delta, and
        // so the normals are broken. We want to advace along the
        // e.g. [0, 0, 0, 0.00001, 1, 3, 3, 3]
        // length of the span rather than when we have a pinched corner,
        // where we move along the toher direction.
        // console.log(v, 'spanRangeU:', spanRangeU, ' eqKnotRangeU:', eqKnotRangeU, spanRangeU / eqKnotRangeU)

        let cvU = cvU0;
        if (v > d.domain.p1.y - 0.0001) {
          // If at the end then we grab the end of the pevious row.
          cvU = cvU0 + d.degreeU - 2;
        } else {
          // if the broken normal is at the start of the U range, then
          // we will grab the next in the row.
          cvU = cvU0 + 1;
        }

        const spanLerpV = (u - knotValuesV[d.degreeV]) / spanRangeV;
        const cvV = cvV0 + Math.floor(spanLerpV * d.degreeV);

        const pt0 = d.controlPoints[cvU + cvV * d.numCPsU].toVec3();
        const pt1 = d.controlPoints[cvU + 1 + cvV * d.numCPsU].toVec3();

        tangentU.setFromOther(pt1.subtract(pt0));
      } else if (tangentU.length() < 0.05) {
        // The derivative in the V direction is zero,
        // so we calculate the linear derivative for the next control points along.

        let cvV;
        if (spanV > d.degreeV) {
          // If at the end then we grab the end of the pevious row.
          cvV = cvV0 + d.degreeV - 2;
        } else {
          // if the broken normal is at the start of the V range, then
          // we will grab the next in the row.
          cvV = cvV0 + 1;
        }

        const spanLerpU = (u - knotValuesU[d.degreeU]) / spanRangeU;
        const cvU = cvU0 + Math.floor(spanLerpU * d.degreeU);

        const pt0 = d.controlPoints[cvU + cvV * d.numCPsU].toVec3();
        const pt1 = d.controlPoints[cvU + 1 + cvV * d.numCPsU].toVec3();

        tangentU.setFromOther(pt1.subtract(pt0));
        // tangentU.setFromOther(pt0.subtract(pt1));
      }

      if (spanRangeV / eqKnotRangeV < 0.01) {
        // In some cases (COOLANT_INLET_PORT_01.ipt_faceWithBlackEdge.)
        // we have span segment which has close to zero delta, and
        // so the normals are broken. We want to advace along the
        // e.g. [0, 0, 0, 0.00001, 1, 3, 3, 3]
        // length of the span rather than when we have a pinched corner,
        // where we move along the toher direction.
        // console.log(v, 'spanRangeV:', spanRangeV, ' eqKnotRangeV:', eqKnotRangeV, spanRangeV / eqKnotRangeV)

        let cvV = cvV0;
        if (v > d.domain.p1.y - 0.0001) {
          // If at the end then we grab the end of the pevious row.
          cvV = cvV0 + d.degreeV - 2;
        } else {
          // if the broken normal is at the start of the V range, then
          // we will grab the next in the row.
          cvV = cvV0 + 1;
        }

        const spanLerpU = (u - knotValuesU[d.degreeU]) / spanRangeU;
        const cvU = cvU0 + Math.floor(spanLerpU * d.degreeU);

        const pt0 = d.controlPoints[cvU + cvV * d.numCPsU].toVec3();
        const pt1 = d.controlPoints[cvU + (cvV + 1) * d.numCPsU].toVec3();

        tangentV.setFromOther(pt1.subtract(pt0));
      } else if (tangentV.length() < 0.05) {
        // The derivative in the V direction is zero,
        // so we calculate the linear derivative for the next control points along.

        let cvU = cvU0;
        if (v > d.domain.p1.y - 0.0001) {
          // If at the end then we grab the end of the pevious row.
          cvU = cvU0 + d.degreeU - 2;
        } else {
          // if the broken normal is at the start of the U range, then
          // we will grab the next in the row.
          cvU = cvU0 + 1;
        }

        const spanLerpV = (u - knotValuesV[d.degreeV]) / spanRangeV;
        const cvV = cvV0 + Math.floor(spanLerpV * d.degreeV);

        const pt0 = d.controlPoints[cvU + cvV * d.numCPsU].toVec3();
        const pt1 = d.controlPoints[cvU + (cvV + 1) * d.numCPsU].toVec3();

        tangentV.setFromOther(pt1.subtract(pt0));
      }

      const normal = tangentU.cross(tangentV).normalize();

      return {
        pos,
        normal,
      }
    }

    // https://github.com/arennuit/libnurbs/blob/3f7daae483a615a13d21e5c674f412ccb8587b6e/nurbs%2B%2B-3.0.11/nurbs/nurbs.cpp

    /**
     * The generatePolygonSurface method.
     * @param {any} surfaceId - The surfaceId param.
     * @param {number} lod - The lod param.
     * @return {any} - The return value.
     */
    generatePolygonSurface(surfaceId, lod = 0) {
      if (this.__meshes[surfaceId]) {
        // const color = this.__meshes[surfaceId].mat.getParameter('BaseColor').getValue();
        // color.r = color.r + 0.2;
        // console.log("surface Instanced:" + surfaceId + ":" + color.r);
        return this.__meshes[surfaceId]
      }

      if (this.getSurfaceType(surfaceId) != CADSurfaceTypes.SURFACE_TYPE_NURBS_SURFACE) {
        return
      }
      const surfaceData = this.getSurfaceData(surfaceId);
      if (!surfaceData) {
        return
      }
      const M = surfaceData.numCPsU * Math.pow(2, lod);
      const N = surfaceData.numCPsV * Math.pow(2, lod);

      console.log('generatePolygonSurface:' + surfaceId + ' M:' + M + ' N:' + N);

      const quad = new zeaEngine.Plane(1.0, 1.0, M, N);
      const normalsGeom = new Lines();
      normalsGeom.setNumVertices((M + 1) * (N + 1) * 2);
      normalsGeom.setNumSegments((M + 1) * (N + 1));
      const normalsGeom_PosAttr = normalsGeom.getVertexAttribute('positions');
      const normalsLength = 0.2;

      let voff = 0;
      const positions = quad.getVertexAttribute('positions');
      const normals = quad.getVertexAttribute('normals');
      for (let j = 0; j <= N; j++) {
        const v = j / N;
        for (let i = 0; i <= M; i++) {
          const u = i / M;
          const pt = this.calcSurfacePoint(surfaceData, [u, v]);

          positions.getValueRef(voff).set(pt.pos.x, pt.pos.y, pt.pos.z);
          normals.getValueRef(voff).set(pt.normal.x, pt.normal.y, pt.normal.z);

          normalsGeom.setSegmentVertexIndices(voff, voff * 2, voff * 2 + 1);
          // if (v == 0.0)
          {
            normalsGeom_PosAttr.getValueRef(voff * 2).set(pt.pos.x, pt.pos.y, pt.pos.z);
            normalsGeom_PosAttr
              .getValueRef(voff * 2 + 1)
              .set(
                pt.pos.x + pt.normal.x * normalsLength,
                pt.pos.y + pt.normal.y * normalsLength,
                pt.pos.z + pt.normal.z * normalsLength
              );
          }

          voff++;
        }
      }

      // quad.computeVertexNormals();

      const material = new zeaEngine.Material('myMat', 'SimpleSurfaceShader');
      material.getParameter('BaseColor').setValue(zeaEngine.Color.random(0.15));
      quad.material = material;

      const normalsGeomMaterial = new zeaEngine.Material('myMat', 'FlatSurfaceShader');
      normalsGeomMaterial.getParameter('BaseColor').setValue(new zeaEngine.Color(1, 0, 0));
      normalsGeom.material = normalsGeomMaterial;

      this.__meshes[surfaceId] = quad;
      return { mesh: quad, normals: normalsGeom }
    }

    /**
     * The generateHullGeometry method.
     * @param {any} surfaceId - The surfaceId param.
     * @return {any} - The return value.
     */
    generateHullGeometry(surfaceId) {
      if (this.__hulls[surfaceId]) {
        // const color = this.__hulls[surfaceId].mat.getParameter('BaseColor').getValue();
        // color.r = color.r + 0.2;
        // console.log("surface Instanced:" + surfaceId + ":" + color.r);
        return this.__hulls[surfaceId]
      }

      if (this.getSurfaceType(surfaceId) != CADSurfaceTypes.SURFACE_TYPE_NURBS_SURFACE) {
        return
      }
      const surfaceData = this.getSurfaceData(surfaceId);
      if (!surfaceData) {
        return
      }
      console.log(
        'generateHullGeometry:' + surfaceId + ' numCPsU:' + surfaceData.numCPsU + ' numCPsV:' + surfaceData.numCPsV
      );
      const hull = new Hull(surfaceData.numCPsU, surfaceData.numCPsV);

      const positions = hull.getVertexAttribute('positions');
      let voff = 0;
      for (let j = 0; j < surfaceData.numCPsV; j++) {
        for (let i = 0; i < surfaceData.numCPsU; i++) {
          const index = i + j * surfaceData.numCPsU;
          const pt = surfaceData.controlPoints[index];
          positions.getValueRef(voff).set(pt.x, pt.y, pt.z);
          voff++;
        }
      }

      const material = new zeaEngine.Material('hullMaterial', 'FlatSurfaceShader');
      material.getParameter('BaseColor').setValue(zeaEngine.Color.random(-0.25));
      hull.material = material;

      this.__hulls[surfaceId] = hull;
      return hull
    }

    /**
     * The dumpDebugSurfaces method.
     */
    dumpDebugSurfaces() {
      const surfacesData = [];
      for (let i = 0; i < this.__numSurfaces; i++) {
        try {
          surfacesData.push(this.getSurfaceData(i, false));
        } catch (e) {
          console.warn('Error accessing Surface: ', i, e);
          surfacesData.push({});
        }
      }
      return surfacesData
    }

    /**
     * The dumpDebugCurves method.
     */
    dumpDebugCurves() {
      const curvesData = [];
      for (let i = 0; i < this.__numSurfaces; i++) {
        try {
          curvesData.push(this.getCurveData(i));
        } catch (e) {
          console.warn('Error accessing Curve: ', i, e);
          curvesData.push({});
        }
      }
      return curvesData
    }

    /**
     * The logFormfactors method.
     */
    logFormfactors() {
      for (const ff in this.__formFactors) console.log(ff + ':' + this.__formFactors[ff]);
    }
  }

  /** Class representing a CAD trim set library.
   * @ignore
   */
  class CADTrimSetLibrary {
    /**
     * Create a CAD trim set library.
     */
    constructor() {
      this.__reader = undefined;
    }

    /**
     * The setBinaryBuffer method.
     * @param {any} trimSetReader - The trimSetReader param.
     * @param {number} version - The version param.
     */
    setBinaryBuffer(trimSetReader, version) {
      this.__reader = trimSetReader;

      this.__numTrimSets = this.__reader.loadUInt32();
      if (version.compare([0, 0, 0]) > 0) {
        this.__totalTrimSurfaceArea = this.__reader.loadFloat32();
      } else {
        this.__totalTrimSurfaceArea = 0.0;
        for (let i = 0; i < this.__numTrimSets; i++) {
          const dims = this.getTrimSetDim(i);
          const area = dims[0] * dims[1];
          this.__totalTrimSurfaceArea += area;
        }
      }

      const sideLength = Math.sqrt(this.__totalTrimSurfaceArea);

      const maxTexSize = zeaEngine.SystemDesc.gpuDesc.maxTextureSize;
      // I'm not sure whats going on here.
      // The xlarge size should be at most maxTexSize >> 1 (e.g. 50% wasted space.)
      const xlargeTexSize = maxTexSize >> 1;
      const largeTexSize = maxTexSize >> 2;
      const medTexSize = maxTexSize >> 3;
      const smallTexSize = maxTexSize >> 4;

      // Note: on big scenes like the Spyder, the texels often fail
      // to pack when tex size is too small, causing artifacts in trimming.
      // Therefore the biggest texture size is half the maximum.
      this.__texelSizes = [
        sideLength / smallTexSize,
        sideLength / medTexSize,
        sideLength / largeTexSize,
        sideLength / xlargeTexSize,
      ];
      // console.log("sideLength:", sideLength, this.__texelSizes);

      ////////////////////////////
      // Debugging.
      // for (let i = 0; i < this.__numTrimSets; i++) {
      //   console.log({
      //     dims: this.getTrimSetDim(i),
      //     curves: this.getTrimSetCurves(i)
      //   })
      // }
    }

    /**
     * The getBinaryBuffer method.
     * @return {any} - The return value.
     */
    getBinaryBuffer() {
      if (!this.__reader) return null
      return this.__reader.data
    }

    /**
     * The getNumTrimSets method.
     * @return {any} - The return value.
     */
    getNumTrimSets() {
      return this.__numTrimSets
    }

    /**
     * The getTrimArea method.
     * @return {any} - The return value.
     */
    getTrimArea() {
      return this.__totalTrimSurfaceArea
    }

    /**
     * The getTexelSize method.
     * @param {any} lod - The lod param.
     * @param {any} numAssets - The numAssets param.
     * @return {any} - The return value.
     */
    getTexelSize(lod, numAssets) {
      // return 5
      // For scenes with many assets we drop down the texel detail
      // so they load without destroying the GPU.
      let lodId;
      if (numAssets < 2) lodId = 3;
      else if (numAssets < 6) lodId = 2;
      else {
        lodId = 1; // LOD 0 is just a mess.
      }
      // lodId = 1

      // return 4
      return this.__texelSizes[lodId]
      // return this.__texelSizes[Math.clamp(lod, 0, this.__texelSizes.length-1)];
    }

    /**
     * The getTrimSetDim method.
     * @param {any} trimSetId - The trimSetId param.
     * @return {any} - The return value.
     */
    getTrimSetDim(trimSetId) {
      this.__reader.seek(8 + trimSetId * 4);
      this.__reader.seek(this.__reader.loadUInt32());

      const size_x = this.__reader.loadFloat32(); // size in scene units
      const size_y = this.__reader.loadFloat32(); // size in scene units
      return [size_x, size_y]
    }

    /**
     * The getTrimSetCurves method.
     * @param {any} trimSetId - The trimSetId param.
     * @return {any} - The return value.
     */
    getTrimSetCurves(trimSetId) {
      this.__reader.seek(8 + trimSetId * 4);
      this.__reader.seek(this.__reader.loadUInt32());

      const size_x = this.__reader.loadFloat32(); // size in scene units
      const size_y = this.__reader.loadFloat32(); // size in scene units
      const numHoles = this.__reader.loadUInt32();
      const numPermiterCurves = this.__reader.loadUInt32();
      const loadCurveRef = () => {
        return {
          id: this.__reader.loadFloat32(),
          xfo_tr: [this.__reader.loadFloat32(), this.__reader.loadFloat32()],
          xfo_rot: [
            this.__reader.loadFloat32(),
            this.__reader.loadFloat32(),
            this.__reader.loadFloat32(),
            this.__reader.loadFloat32(),
          ],
          flags: this.__reader.loadFloat32(),
        }
      };
      const perimeter = [];
      for (let i = 0; i < numPermiterCurves; i++) {
        perimeter.push(loadCurveRef());
      }
      const holes = [];
      for (let i = 0; i < numHoles; i++) {
        const hole = [];
        const numHoleCurves = this.__reader.loadUInt32();
        for (let i = 0; i < numHoleCurves; i++) {
          hole.push(loadCurveRef());
        }
        holes.push(hole);
      }
      return {
        size: [size_x, size_y],
        perimeter,
        holes,
      }
    }

    /**
     * The dumpDebugTrimSets method.
     */
    dumpDebugTrimSets() {
      const trimSetsData = [];
      for (let i = 0; i < this.__numTrimSets; i++) {
        try {
          trimSetsData.push({
            dims: this.getTrimSetDim(i),
            curves: this.getTrimSetCurves(i),
          });
        } catch (e) {
          console.warn('Error accessing TrimSet: ', i, e);
          trimSetsData.push({});
        }
      }
      return trimSetsData
    }
  }

  const bytesPerValue = 4; // 32 bit floats

  /** Class representing a CAD body library.
   * @ignore
   */
  class CADBodyLibrary {
    /**
     * Create a CAD body library.
     * @param {any} buffer - The buffer value.
     */
    constructor(buffer) {
      if (buffer != undefined) {
        this.setBinaryBuffer(buffer);
      }
    }

    /**
     * The setBinaryBuffers method.
     * @param {any} tocBuffer - The tocBuffer param.
     * @param {any} buffer - The buffer param.
     */
    setBinaryBuffers(tocBuffer, buffer) {
      this.__buffer = buffer;
      this.__reader = new zeaEngine.BinReader(this.__buffer);
      this.__size = Math.sqrt(buffer.byteLength / (4 * bytesPerValue)); // RGBA32 pixels

      this.__toc = tocBuffer; // new Uint32Array(tocBuffer);
      this.__tocReader = new zeaEngine.BinReader(tocBuffer);
      this.__numBodies = this.__tocReader.loadUInt32();

      // for (let i = 0; i < this.__numBodies; i++) {
      //     // console.log(JSON.stringify(this.getBodyDescData(i)));
      //     console.log(this.getBodyDescData(i));
      // }
    }

    /**
     * The getToc method.
     * @return {any} - The return value.
     */
    getToc() {
      return this.__toc
    }

    /**
     * The getBinaryBuffer method.
     * @return {any} - The return value.
     */
    getBinaryBuffer() {
      return this.__buffer
    }

    /**
     * The getNumBodies method.
     * @return {any} - The return value.
     */
    getNumBodies() {
      return this.__numBodies
    }

    /**
     * The getBodyDataTexelCoords method.
     * @param {any} bodyDescId - The bodyDescId param.
     * @return {any} - The return value.
     */
    getBodyDataTexelCoords(bodyDescId) {
      this.__tocReader.seek(4 + bodyDescId * (3 * 4));
      const x = this.__tocReader.loadUInt32();
      const y = this.__tocReader.loadUInt32();
      return {
        x,
        y,
      }
    }

    // eslint-disable-next-line require-jsdoc
    __seekBodyData(bodyDescId, offsetInBytes = 0) {
      const addr = this.getBodyDataTexelCoords(bodyDescId);
      // X, Y in pixels.

      const bytesPerPixel = 16; // RGBA32 pixels == 16 bytes perpixel
      const byteOffset = addr.x * bytesPerPixel + addr.y * bytesPerPixel * this.__size;
      // console.log("__seekSurfaceData:" + bodyDescId + " byteOffset:" + (byteOffset +offset) + " pixel:" + ((byteOffset +offset)/8) + " x:" + addr.x + " y:" + addr.y);
      this.__reader.seek(byteOffset + offsetInBytes);
    }

    /**
     * The getNumSurfacesForBody method.
     * @param {any} bodyDescId - The bodyDescId param.
     * @return {any} - The return value.
     */
    getNumSurfacesForBody(bodyDescId) {
      this.__seekBodyData(bodyDescId, 6 /* bbox*/ * bytesPerValue);
      const numBodySurfaces = this.__reader.loadFloat32();
      return numBodySurfaces
    }

    /**
     * The getBodyBBox method.
     * @param {any} bodyDescId - The bodyDescId param.
     * @return {any} - The return value.
     */
    getBodyBBox(bodyDescId) {
      this.__seekBodyData(bodyDescId);
      const bbox = new zeaEngine.Box3();
      bbox.p0 = this.__reader.loadFloat32Vec3();
      bbox.p1 = this.__reader.loadFloat32Vec3();
      return bbox
    }

    /**
     * The getBodyDescData method.
     * @param {any} bodyDescId - The bodyDescId param.
     * @return {any} - The return value.
     */
    getBodyDescData(bodyDescId, includeXfosAndColors = true) {
      this.__seekBodyData(bodyDescId);
      // console.log(this.__reader.pos() / 8);

      const bbox = new zeaEngine.Box3();
      bbox.p0 = this.__reader.loadFloat32Vec3();
      bbox.p1 = this.__reader.loadFloat32Vec3();
      // console.log(this.__reader.pos() / 8);
      const numBodySurfaces = this.__reader.loadFloat32();
      const numBodyCurves = this.__reader.loadFloat32();
      const surfaceRefs = [];
      for (let j = 0; j < numBodySurfaces; j++) {
        if (includeXfosAndColors) {
          const surfaceRef = {
            surfaceId: this.__reader.loadFloat32(),
          };
          surfaceRef.xfo = new zeaEngine.Xfo(
            this.__reader.loadFloat32Vec3(),
            this.__reader.loadFloat32Quat(),
            this.__reader.loadFloat32Vec3()
          );
          surfaceRef.color = this.__reader.loadRGBAFloat32Color();
          surfaceRefs.push(surfaceRef);
        } else {
          surfaceRefs.push(this.__reader.loadFloat32());
          this.__reader.advance(14 * 4);
        }
      }

      const curveRefs = [];
      for (let j = 0; j < numBodyCurves; j++) {
        if (includeXfosAndColors) {
          const curveRef = {
            curveId: this.__reader.loadFloat32(),
          };
          curveRef.xfo = new zeaEngine.Xfo(
            this.__reader.loadFloat32Vec3(),
            this.__reader.loadFloat32Quat(),
            this.__reader.loadFloat32Vec3()
          );
          curveRef.color = this.__reader.loadRGBAFloat32Color();
          curveRefs.push(curveRef);
        } else {
          curveRefs.push(this.__reader.loadFloat32());
          this.__reader.advance(14 * 4);
        }
      }

      const bodyDescData = {
        bbox,
        surfaceRefs,
        curveRefs,
      };

      return bodyDescData
    }
  }

  /**
   * Represents a Body within a CAD Part. A Body is made up of either a single mesh or a collection of meshes, one for each surface.
   * When a zcad file is produced, the tool can  optimize bodies to contain only one mesh to speed up loading of large models, and support bigger models being loaded.
   *
   * **Parameters**
   * * **Material(`MaterialParameter`):** Specifies the material of the geometry item.
   * * **Color(`ColorParameter`):** Specifies the color of the geometry item.
   *
   * @extends BaseGeomItem
   */
  class CADBody extends zeaEngine.BaseGeomItem {
    /**
     * Creates an instance of CADBody setting up the initial configuration for Material and Color parameters.
     *
     * @param {string} name - The name value.
     * @param {CADAsset} cadAsset - The cadAsset value.
     */
    constructor(name, cadAsset) {
      super(name);
      this.__bodyDescId = -1;
      this.__id = -1;
      this.__bodyBBox = new zeaEngine.Box3();
      this.__cadAsset = cadAsset; // Note: used in testing scenes.
      if (this.__cadAsset) this.__cadAsset.incCADBodyCount();

      this.__materialParam = this.addParameter(new zeaEngine.MaterialParameter('Material'));
      this.__colorParam = this.addParameter(new zeaEngine.ColorParameter('Color', new zeaEngine.Color(1, 0, 0, 0)));
    }

    /**
     * Returns the `CADAsset` object in current `CADBody`
     *
     * @return {CADAsset} - The return value.
     */
    getCADAsset() {
      return this.__cadAsset
    }

    /**
     * The clone method constructs a new CADBody, copies its values
     * from this item and returns it.
     *
     * @param {number} flags - The flags param.
     * @return {CADBody} - The return value.
     */
    clone(flags) {
      const cloned = new CADBody();
      cloned.copyFrom(this, flags);
      return cloned
    }

    /**
     * The copyFrom method.
     * @param {CADBody} src - The src param.
     * @param {number} flags - The flags param.
     * @private
     */
    copyFrom(src, flags) {
      super.copyFrom(src, flags);
      this.__cadAsset = src.getCADAsset();
      this.__cadAsset.incCADBodyCount();

      this.setBodyDescId(src.getBodyDescId());
      this.setMaterial(src.getMaterial()); // clone?
    }

    // ////////////////////////////////////////
    // Geometry

    /**
     * The getBodyDataTexelCoords method.
     * @param {any} bodyDescId - The bodyDescId param.
     * @return {any} - The return value.
     */
    getBodyDataTexelCoords() {
      return this.__cadAsset.getBodyLibrary().getBodyDataTexelCoords(this.__bodyDescId)
    }

    /**
     * Returns an object that contains the bBox and all the SurfaceRefs of current object using the bodyDescId.
     * @private
     * @return {object} - The return value.
     */
    getBodyDescData() {
      const bodyDescData = this.__cadAsset.getBodyLibrary().getBodyDescData(this.__bodyDescId);
      for (const surfaceRef of bodyDescData.surfaceRefs) {
        surfaceRef.surfaceType = this.__cadAsset.getSurfaceLibrary().getSurfaceTypeLabel(surfaceRef.surfaceId);
        surfaceRef.dims = this.__cadAsset.getSurfaceLibrary().getSurfaceDims(surfaceRef.surfaceId);
      }
      return bodyDescData
    }

    /**
     * Returns a list of all SurfaceRefs of current `CADBody`.
     * <br>
     * Which contain the surfaceId, xfo object and the color.
     *
     * @return {array} - The return value.
     */
    getSurfaceRefs() {
      const bodyData = this.getBodyDescData();
      return bodyData.surfaceRefs
    }

    /**
     * Returns the bodyDescId of current `CADBody`
     *
     * @return {number} - The return value.
     */
    getBodyDescId() {
      return this.__bodyDescId
    }

    /**
     * Sets bodyDescId to current `CADBody`, but also calculates a new bBox.
     * @private
     * @param {number} bodyId - The bodyId param.
     */
    setBodyDescId(bodyId) {
      this.__bodyDescId = bodyId;
      if (bodyId >= 0) {
        this.__bodyBBox = this.__cadAsset.getBodyLibrary().getBodyBBox(this.__bodyDescId);
        this._setBoundingBoxDirty();
      }
    }

    /**
     * Returns current Material parameter value.
     * @deprecated
     * @return {MaterialParameter} - The return value.
     */
    getMaterial() {
      return this.__materialParam.getValue()
    }

    /**
     * Sets Material parameter value.
     * <br>
     * For `mode` possible values check `Parameter` Class documentation.
     * @see [Zea Engine]()
     *
     * @deprecated
     * @param {MaterialParameter} material - The material param.
     * @param {number} mode - The mode param.
     */
    setMaterial(material, mode) {
      this.__materialParam.setValue(material, mode);
    }

    /**
     * The _cleanBoundingBox method.
     * @param {any} bbox - The bbox param.
     * @return {any} - The return value.
     * @private
     */
    _cleanBoundingBox(bbox) {
      bbox = super._cleanBoundingBox(bbox);
      if (this.__bodyDescId != -1) {
        bbox.addBox3(this.__bodyBBox, this.getParameter('GlobalXfo').getValue());
      }
      return bbox
    }

    // ///////////////////////////
    // Persistence

    /**
     * Initializes CADBody's asset, material, version and layers; adding current `CADBody` Geometry Item toall the layers in reader
     *
     * @param {BinReader} reader - The reader param.
     * @param {object} context - The context param.
     */
    readBinary(reader, context) {
      super.readBinary(reader, context);

      // Cache only in debug mode.
      this.__cadAsset = context.assetItem;
      this.__cadAsset.incCADBodyCount();

      const bodyDescId = reader.loadSInt32();
      if (bodyDescId >= 0) {
        this.setBodyDescId(bodyDescId);
      }

      if (context.versions['zea-cad'].compare([0, 0, 4]) < 0) {
        const materialName = reader.loadStr();
        // const materialName = 'Mat' + this.__bodyDescId;

        const materialLibrary = context.assetItem.getMaterialLibrary();
        let material = materialLibrary.getMaterial(materialName, false);
        if (!material) {
          // console.warn("Body :'" + this.name + "' Material not found:" + materialName);
          // material = materialLibrary.getMaterial('DefaultMaterial');

          material = new zeaEngine.Material(materialName, 'SimpleSurfaceShader');
          material.getParameter('BaseColor').setValue(zeaEngine.Color.random(0.25));
          context.assetItem.getMaterialLibrary().addMaterial(material);
        }
        this.getParameter('Material').setValue(material);
      }

      if (context.versions['zea-cad'].compare([0, 0, 2]) >= 0 && context.versions['zea-cad'].compare([0, 0, 4]) < 0) {
        this.__layers = reader.loadStrArray();
        // console.log("Layers:", this.__layers)
        for (const layer of this.__layers) context.addGeomToLayer(this, layer);
      }
    }

    /**
     * The generatePolygonMeshSurfaces method.
     * @param {number} lod - The lod param.
     * @return {any} - The return value.
     * @private
     */
    generatePolygonMeshSurfaces(lod = 0) {
      const treeItem = new zeaEngine.TreeItem(this.getName());

      // const standardMaterial = new Material('surfaces', 'SimpleSurfaceShader');
      // standardMaterial.getParameter('BaseColor').setValue(Color.random(0.4));

      const bodyData = this.getBodyDescData();
      bodyData.surfaceRefs.forEach((surfaceRef, surfaceIndex) => {
        const mesh = this.__cadAsset.getSurfaceLibrary().generatePolygonSurface(surfaceRef.surfaceId, lod);
        if (mesh) {
          const geomItem = new zeaEngine.GeomItem('Surface' + surfaceIndex + ':' + surfaceRef.surfaceId, mesh, mesh.material); // this.__material);// mesh.mat);
          geomItem.getParameter('LocalXfo').setValue(surfaceRef.xfo);
          treeItem.addChild(geomItem);
        }
      });
      return treeItem
    }

    /**
     * The generateHullGeometry method.
     * @return {any} - The return value.
     * @private
     */
    generateHullGeometry() {
      const treeItem = new zeaEngine.TreeItem(this.getName());
      const bodyData = this.getBodyDescData();
      bodyData.surfaceRefs.forEach((surfaceRef, surfaceIndex) => {
        const hull = this.__cadAsset.getSurfaceLibrary().generateHullGeometry(surfaceRef.surfaceId);
        if (hull) {
          const geomItem = new zeaEngine.GeomItem('Hull' + surfaceIndex + ':' + surfaceRef.surfaceId, hull, hull.material);
          geomItem.getParameter('LocalXfo').setValue(surfaceRef.xfo);
          treeItem.addChild(geomItem);
          return false
        }
      });
      return treeItem
    }

    // ////////////////////////////////////////
    // Persistence

    /**
     * The toJSON method encodes this type as a json object for persistences.
     *
     * @param {number} flags - The flags param.
     * @return {object} - The return value.
     */
    toJSON(flags = 0) {
      const j = super.toJSON(flags);
      return j
    }

    /**
     * The fromJSON method decodes a json object for this type.
     *
     * @param {object} j - The j param.
     * @param {number} flags - The flags param.
     */
    fromJSON(j, flags = 0) {
      super.fromJSON(j, flags);
    }
  }

  zeaEngine.Registry.register('CADBody', CADBody);

  /* eslint-disable no-unused-vars */

  const cadFileExts = new RegExp('\\.(stp|step|jt|3dm|ifc|vlcad|zcad)$', 'i');

  // eslint-disable-next-line require-jsdoc
  function getLOD() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('lod')) {
      return Number.parseInt(urlParams.get('lod'))
    }
    switch (zeaEngine.SystemDesc.deviceCategory) {
      case 'Low':
        return 1
      case 'Medium':
        return 2
      case 'High':
        return 3
    }
    return 1
  }

  /**
   * Class representing a CAD asset.
   *
   * **Parameters**
   * * **DataFilePath(`FilePathParameter`):** Hosts file information used to load the asset(Like the URL).
   * * **DisplayEdges(`BooleanParameter`):** Hides/Shows edges of the asset(Like a border).
   * * **EdgeColor(`ColorParameter`):** Specifies the color of the edge(border-color).
   *
   * **Events**
   * * **loaded:** Triggered when the  asset is loaded
   * @extends AssetItem
   */
  class CADAsset extends zeaEngine.AssetItem {
    /**
     * Create a CAD asset.
     * @param {string} name - The name value.
     */
    constructor(name) {
      super(name);

      this.__trimSetLibrary = new CADTrimSetLibrary();
      this.__surfaceLibrary = new CADSurfaceLibrary(this, this.__trimSetLibrary);
      this.__bodyLibrary = new CADBodyLibrary();
      this.__atlasSize = new zeaEngine.Vec2();
      this.__numCADBodyItems = 0;
      this.__loaded = false;

      this.__datafileParam = this.addParameter(new zeaEngine.FilePathParameter('FilePath'));
      this.addParameterDeprecationMapping('DataFilePath', 'FilePath');
      this.__datafileParam.on('valueChanged', () => {
        let url;
        const file = this.__datafileParam.getFileDesc();
        if (file.metadata && file.metadata.ConvertFile) {
          let zcadFile;
          const zcadfileext = new RegExp('\\.(vlcad|zcad)$', 'i');
          file.metadata.ConvertFile.map((metadataFile) => {
            if (zcadfileext.test(metadataFile.filename)) zcadFile = metadataFile;
          });
          if (zcadFile) {
            url = zcadFile.url;
          } else {
            console.warn('ConvertFile metadata contains no vla file.');
          }
        } else if (file.url) {
          url = file.url;
        } else {
          console.warn('CADAsset unable to load file:', file);
        }

        this.load(url);
      });

      this.addParameter(new zeaEngine.BooleanParameter('DisplayEdges', true));
      this.addParameter(new zeaEngine.ColorParameter('EdgeColor', new zeaEngine.Color(0.1, 0.1, 0.1, 0.75)));

      this.lod = getLOD();
      this.curvatureToDetail = 0.5;
    }

    /**
     * Returns the loaded status of the AssetItem.
     *
     * @return {boolean} - Returns true if the asset has already loaded its data.
     */
    isLoaded() {
      return this.__loaded
    }

    /**
     * Returns `LOD` parameter value.
     *
     * @return {number} - The return value.
     */
    getLOD() {
      return Math.max(0, this.lod)
    }

    /**
     * The incCADBodyCount method.
     * @private
     */
    incCADBodyCount() {
      this.__numCADBodyItems++;
    }

    /**
     * Returns the value of number CADBody items in the asset.
     *
     * @return {number} - The return value.
     */
    getNumBodyItems() {
      return this.__numCADBodyItems
    }

    /**
     * Returns the instantiated `CADSurfaceLibrary` object on current Asset
     *
     * @return {CADSurfaceLibrary} - The return value.
     */
    getSurfaceLibrary() {
      return this.__surfaceLibrary
    }

    /**
     * Returns the instantiated `CADTrimSetLibrary` object of current Asset
     *
     * @return {CADTrimSetLibrary} - The return value.
     */
    getTrimSetLibrary() {
      return this.__trimSetLibrary
    }

    /**
     * Returns the instantiated `CADBodyLibrary` object of current Asset
     *
     * @return {CADBodyLibrary} - The return value.
     */
    getBodyLibrary() {
      return this.__bodyLibrary
    }

    /**
     * Returns the instantiated `MaterialLibrary` object of current Asset
     *
     * @return {MaterialLibrary} - The return value.
     */
    getMaterialLibrary() {
      return this.__materials
    }

    // ////////////////////////////////////////
    // Persistence

    /**
     * Returns the versioon of the data loaded by thie CADAsset.
     *
     * @return {string} - The return value.
     */
    getVersion() {
      return this.cadfileversion
    }

    /**
     * Initializes CADAsset's asset, material, version and layers; adding current `CADAsset` Geometry Item toall the layers in reader
     *
     * @param {BinReader} reader - The reader param.
     * @param {AssetLoadContext} context - The load context object that provides additional data such as the units of the scene we are loading into.
     */
    readRootLevelBinary(reader, context) {
      this.__numCADBodyItems = 0;

      context.versions['zea-cad'] = new zeaEngine.Version(reader.loadStr());
      context.sdk = reader.loadStr();
      this.cadfileversion = context.versions['zea-cad'];
      // console.log('Loading CAD File version:', this.cadfileversion, ' exported using SDK:', context.cadSDK)

      super.readBinary(reader, context);
    }

    /**
     * Loads all the geometries and metadata from the asset file.
     * @param {string} url - The URL of the asset to load
     * @param {AssetLoadContext} context - The load context object that provides additional data such as paths to external references.
     * @return {Promise} - Returns a promise that resolves once the load of the tree is complete. Geometries, textures and other resources might still be loading.
     */
    load(url, context = new zeaEngine.AssetLoadContext()) {
      if (this.__loadPromise) return this.__loadPromise
      this.__loadPromise = new Promise((resolve, reject) => {
        const folder = url.lastIndexOf('/') > -1 ? url.substring(0, url.lastIndexOf('/')) + '/' : '';
        const filename = url.lastIndexOf('/') > -1 ? url.substring(url.lastIndexOf('/') + 1) : '';
        const stem = filename.substring(0, filename.lastIndexOf('.'));

        this.url = url;

        // These values are used by XRef to generate URLS.
        context.assetItem = this;
        context.url = url;
        context.folder = folder;
        context.xrefs = {};

        context.on('done', () => {
          this.__loaded = true;
          resolve();
          this.emit('loaded');
        });

        context.incrementAsync();

        // Increment the resource loader counter to provided an update to the progress bar.
        // preload in case we don't have embedded geoms.
        // completed by geomLibrary.on('loaded' ..
        zeaEngine.resourceLoader.incrementWorkload(1);
        this.__geomLibrary.once('loaded', () => {
          // A chunk of geoms are now parsed, so update the resource loader.
          zeaEngine.resourceLoader.incrementWorkDone(1);
        });

        zeaEngine.resourceLoader.loadFile('archive', url).then(
          (entries) => {
            // const desc = entries['desc.json']
            //   ? JSON.parse(new TextDecoder('utf-8').decode(entries['desc.json']))
            //   : { numGeomFiles: 0 }

            const treeReader = new zeaEngine.BinReader((entries.tree2 || entries.tree).buffer, 0, zeaEngine.SystemDesc.isMobileDevice);

            if (entries.bodies) {
              this.__bodyLibrary.setBinaryBuffers(entries.bodiestoc.buffer, entries.bodies.buffer);
            }

            const name = this.getName();
            this.readRootLevelBinary(treeReader, context);

            // Maintain the name provided by the user before loading.
            if (name != '') this.setName(name);

            context.versions['zea-cad'] = this.getVersion();
            context.versions['zea-engine'] = this.getEngineDataVersion();

            if (entries.geoms) {
              this.__geomLibrary.readBinaryBuffer(filename, entries.geoms.buffer, context);
            } else if (entries['geomLibrary.json']) {
              entries['desc.json'];
              const geomLibraryJSON = JSON.parse(new TextDecoder('utf-8').decode(entries['geomLibrary.json']));
              const basePath = folder + stem;
              this.__geomLibrary.loadGeomFilesStream(geomLibraryJSON, basePath, context);
            } else {
              // No geoms in this file, so we won't wait for the 'done' event in the GeomLibrary.
              zeaEngine.resourceLoader.incrementWorkDone(1);
            }

            if (entries.trimSets) {
              const trimSets = entries.trimSets || entries.trimsets || entries.trimSets2;
              const trimSetReader = new zeaEngine.BinReader(trimSets.buffer, 0, zeaEngine.SystemDesc.isMobileDevice);

              this.__trimSetLibrary.setBinaryBuffer(trimSetReader, this.getVersion());
            }

            if (entries.curves) {
              this.__surfaceLibrary.setBinaryBuffers(entries.curves.buffer, entries.surfaces.buffer, this.getVersion());
            }

            // console.log(this.__name, " NumBaseItems:", this.getNumBaseItems(), " NumCADBodyItems:", this.__numCADBodyItems)
            context.decrementAsync();
          },
          (error) => {
            zeaEngine.resourceLoader.incrementWorkDone(1);
            this.emit('error', error);
            reject(error);
          }
        );
      });

      return this.__loadPromise
    }

    // ////////////////////////////////////////
    // Persistence

    /**
     * The toJSON method encodes this type as a json object for persistences.
     *
     * @param {object} context - The context param.
     * @param {number} flags - The flags param.
     * @return {object} - The return value.
     */
    toJSON(context, flags) {
      const j = super.toJSON(context, flags);
      return j
    }

    /**
     * The fromJSON method decodes a json object for this type.
     *
     * @param {object} j - The json object this item must decode.
     * @param {object} context - The context param.
     * @param {callback} onDone - The onDone param.
     */
    fromJSON(j, context, onDone) {
      const loadAssetJSON = () => {
        const flags = zeaEngine.TreeItem.LoadFlags.LOAD_FLAG_LOADING_BIN_TREE_VALUES;
        super.fromJSON(j, context, flags, onDone);
        context.decAsyncCount();

        // If the asset is nested within a bigger asset, then
        // this subtree can noow be flagged as loded(and added to the renderer);
        if (!this.__loaded) {
          this.emit('loaded');
          this.__loaded = true;
        }
      };

      if (j.params && j.params.DataFilePath) {
        this.__datafileLoaded = loadAssetJSON;
        context.incAsyncCount();
        const filePathJSON = j.params.DataFilePath;
        delete j.params.DataFilePath;
        this.__datafileParam.fromJSON(filePathJSON, context);
      } else {
        loadAssetJSON();
      }
    }

    // ////////////////////////////////////////////////////
    // Debugging

    /**
     * The generatePolygonMeshSurfaces method.
     * @param {number} lod - The lod param.
     * @return {any} - The return value.
     * @private
     */
    generatePolygonMeshSurfaces(lod = 0) {
      // Traverse the tree adding items till we hit the leaves(which are usually GeomItems.)
      // let count = 0
      const surfacesTreeItem = new zeaEngine.TreeItem('surfaces');
      const traverse = (treeItem) => {
        treeItem.getChildren().forEach((childItem) => {
          if (childItem instanceof CADBody) {
            const cadBodySurfaces = childItem.generatePolygonMeshSurfaces(lod);
            const globalXfo = childItem.getParameter('GlobalXfo').getValue();
            cadBodySurfaces.getParameter('GlobalXfo').setValue(globalXfo);
            surfacesTreeItem.addChild(cadBodySurfaces);
          } else traverse(childItem);
        });
      };
      traverse(this);

      surfaceLibrary.logFormfactors();
      return surfacesTreeItem
    }

    /**
     * The generateHullGeometry method.
     * @return {any} - The return value.
     * @private
     */
    generateHullGeometry() {
      // Traverse the tree adding items till we hit the leaves(which are usually GeomItems.)
      // let count = 0
      const hullTreeItem = new zeaEngine.TreeItem('hull');
      const traverse = (treeItem) => {
        treeItem.getChildren().forEach((childItem) => {
          if (childItem instanceof CADBody) {
            const cadBodyHulls = childItem.generateHullGeometry();
            const globalXfo = childItem.getParameter('GlobalXfo').getValue();
            hullTreeItem.getParameter('GlobalXfo').setValue(globalXfo);
            hullTreeItem.addChild(cadBodyHulls);
          } else traverse(childItem);
        });
      };
      traverse(this);

      surfaceLibrary.logFormfactors();
      return hullTreeItem
    }

    // ////////////////////////////////////////
    // Static Methods

    /**
     * Getter for LOADSTATE.
     * @return {any} - The return value.
     * @private
     */
    static get LOADSTATE() {
      return LOADSTATE
    }

    /**
     * The supportsExt method.
     * @param {any} filename - The filename param.
     * @return {any} - The return value.
     * @private
     */
    static supportsExt(filename) {
      return cadFileExts.test(filename)
    }
  }

  zeaEngine.Registry.register('CADAsset', CADAsset);

  /**
   * Represents a Tree Item of an Assembly modeling. Brings together components to define a larger product.
   *
   * @extends TreeItem
   */
  class CADAssembly extends zeaEngine.TreeItem {
    /**
     * Create a CAD assembly.
     *
     * @param {string} name - The name of the tree item.
     */
    constructor(name) {
      super(name);
    }

    /**
     * The clone method constructs a new CADAssembly item, copies its values
     * from this item and returns it.
     *
     * @param {number} flags - The flags param.
     * @return {CADAssembly} - The return value.
     */
    clone(flags) {
      const cloned = new CADAssembly();
      cloned.copyFrom(this, flags);
      return cloned
    }

    // ////////////////////////////////////////
    // Persistence

    /**
     * The toJSON method encodes this type as a json object for persistences.
     *
     * @param {object} context - The context param.
     * @param {number} flags - The flags param.
     * @return {object} - Returns the json object.
     */
    toJSON(context, flags = 0) {
      const j = super.toJSON(context, flags);
      return j
    }

    /**
     * The fromJSON method decodes a json object for this type.
     *
     * @param {object} j - The json object this item must decode.
     * @param {object} context - The context param.
     * @param {number} flags - The flags param.
     */
    fromJSON(j, context, flags = 0) {
      super.fromJSON(j, context, flags);
    }
  }

  zeaEngine.Registry.register('CADAssembly', CADAssembly);

  /**
   * Represents a Part within a CAD assembly.
   *
   * @extends TreeItem
   */
  class CADPart extends zeaEngine.TreeItem {
    /**
     * Creates an instance of CADPart setting up the initial configuration for Material and Color parameters.
     *
     * @param {string} name - The name value.
     */
    constructor(name) {
      super(name);
    }

    /**
     * The clone method constructs a new CADPart, copies its values
     * from this item and returns it.
     *
     * @param {number} flags - The flags param.
     * @return {CADPart} - The return value.
     */
    clone(flags) {
      const cloned = new CADPart();
      cloned.copyFrom(this, flags);
      return cloned
    }

    /**
     * The copyFrom method.
     * @param {CADPart} src - The src param.
     * @param {number} flags - The flags param.
     * @private
     */
    copyFrom(src, flags) {
      super.copyFrom(src, flags);
    }

    // ///////////////////////////
    // Persistence

    /**
     * Initializes CADPart's asset, material, version and layers; adding current `CADPart` Geometry Item toall the layers in reader
     *
     * @param {BinReader} reader - The reader param.
     * @param {object} context - The context param.
     */
    readBinary(reader, context) {
      super.readBinary(reader, context);
    }

    /**
     * The toJSON method encodes this type as a json object for persistences.
     *
     * @param {number} flags - The flags param.
     * @return {object} - The return value.
     */
    toJSON(flags = 0) {
      const j = super.toJSON(flags);
      return j
    }

    /**
     * The fromJSON method decodes a json object for this type.
     *
     * @param {object} j - The j param.
     * @param {number} flags - The flags param.
     */
    fromJSON(j, flags = 0) {
      super.fromJSON(j, flags);
    }
  }

  zeaEngine.Registry.register('CADPart', CADPart);

  /**
   * A parameter for storing an array of string values.
   *
   * @extends Parameter
   */
  class StringListParameter extends zeaEngine.Parameter {
    /**
     * Create a string parameter.
     * @param {string} name - The name of the material color parameter.
     * @param {string} value - The value of the parameter.
     */
    constructor(name, value = []) {
      super(name, value, 'String[]');
      this.multiLine = false;
    }

    /**
     * Extracts the string value from a buffer, updating current parameter state.
     *
     * @param {BinReader} reader - The reader value.
     * @param {object} context - The context value.
     */
    readBinary(reader, context) {
      this.__value = reader.loadStrArray();
    }

    /**
     * The clone method constructs a new string parameter, copies its values
     * from this parameter and returns it.
     *
     * @return {StringListParameter} - Returns a new string parameter.
     */
    clone() {
      const clonedParam = new StringListParameter(this.__name, this.__value);
      return clonedParam
    }
  }

  zeaEngine.Registry.register('StringListParameter', StringListParameter);
  zeaEngine.Registry.register('Property_StringList', StringListParameter);
  zeaEngine.Registry.register('Property_Vec3_32f', zeaEngine.Vec3Parameter);

  /**
   * Represents a view of PMI data. within a CAD assembly.
   *
   * @extends TreeItem
   */
  class PMIView extends zeaEngine.TreeItem {
    /**
     * Creates an instance of PMIView setting up the initial configuration for Material and Color parameters.
     *
     * @param {string} name - The name value.
     */
    constructor(name) {
      super(name);
      this.addParameter(new StringListParameter('GraphicalElements'));
    }

    /**
     * The clone method constructs a new PMIView, copies its values
     * from this item and returns it.
     *
     * @param {number} flags - The flags param.
     * @return {PMIView} - The return value.
     */
    clone(flags) {
      const cloned = new PMIView();
      cloned.copyFrom(this, flags);
      return cloned
    }

    /**
     * The copyFrom method.
     * @param {PMIView} src - The src param.
     * @param {number} flags - The flags param.
     * @private
     */
    copyFrom(src, flags) {
      super.copyFrom(src, flags);
    }

    /**
     * Changes the current state of the selection of this item.
     *
     * @emits `selectedChanged` with selected state
     * @param {boolean} sel - Boolean indicating the new selection state.
     */
    setSelected(sel) {
      super.setSelected(sel);
    }

    /**
     * Activates the PMIView, adjusting visibility of the PMI items and the camera Xfo
     *
     * @param {Camera} camera - Boolean indicating the new selection state.
     */
    activate(camera) {
      const pmiItems = this.getOwner().getOwner().getChildByName('PMI');
      const graphicalItems = this.getParameter('GraphicalElements').getValue();
      pmiItems.getChildren().forEach((pmiItem) => {
        const visible = graphicalItems.includes(pmiItem.getName());
        pmiItem.setVisible(visible);
      });

      if (camera) {
        const cameraXfo = this.getParameter('GlobalXfo').getValue().clone();
        const TargetPoint = this.getParameter('TargetPoint').getValue();
        // const UpDirection = this.getParameter('UpDirection').getValue()
        TargetPoint.scaleInPlace(cameraXfo.sc.z);
        const dist = cameraXfo.tr.distanceTo(TargetPoint); // * cameraXfo.sc.z
        cameraXfo.sc.set(1.0, 1.0, 1.0);

        camera.getParameter('GlobalXfo').setValue(cameraXfo);
        camera.setFocalDistance(dist);
      }
    }

    // ///////////////////////////
    // Persistence

    /**
     * Initializes PMIView's asset, material, version and layers; adding current `PMIView` Geometry Item toall the layers in reader
     *
     * @param {BinReader} reader - The reader param.
     * @param {object} context - The context param.
     */
    readBinary(reader, context) {
      super.readBinary(reader, context);
    }

    /**
     * The toJSON method encodes this type as a json object for persistences.
     *
     * @param {number} flags - The flags param.
     * @return {object} - The return value.
     */
    toJSON(flags = 0) {
      const j = super.toJSON(flags);
      return j
    }

    /**
     * The fromJSON method decodes a json object for this type.
     *
     * @param {object} j - The j param.
     * @param {number} flags - The flags param.
     */
    fromJSON(j, flags = 0) {
      super.fromJSON(j, flags);
    }
  }

  zeaEngine.Registry.register('PMIView', PMIView);

  /**
   * Represents a view of PMI data. within a CAD assembly.
   *
   * @extends TreeItem
   */
  class XRef extends CADAsset {
    /**
     * Creates an instance of XRef setting up the initial configuration for Material and Color parameters.
     *
     * @param {string} name - The name value.
     */
    constructor(name) {
      super(name);
    }

    /**
     * The clone method constructs a new XRef, copies its values
     * from this item and returns it.
     *
     * @param {number} flags - The flags param.
     * @return {XRef} - The return value.
     */
    clone(flags) {
      const cloned = new XRef();
      cloned.copyFrom(this, flags);
      return cloned
    }

    // ///////////////////////////
    // Persistence

    /**
     * Initializes XRef's asset, material, version and layers; adding current `XRef` Geometry Item toall the layers in reader
     *
     * @param {BinReader} reader - The reader param.
     * @param {object} context - The context param.
     */
    readBinary(reader, context) {
      reader.loadStr(); // read type
      reader.loadStr(); // read name
      const relativePath = reader.loadStr();

      if (context.assets[relativePath]) {
        const srcAsset = context.assets[relativePath];
        if (srcAsset.isLoaded()) {
          this.copyFrom(srcAsset, 0);
        } else {
          srcAsset.on('loaded', () => {
            this.copyFrom(srcAsset, 0);
          });
        }
      } else {
        context.assets[relativePath] = this;

        this.setName(relativePath);

        if (!context.resources[relativePath]) {
          // Generate a path based on the path of the parent CADAsset.
          // const stem = relativePath.substring(0, relativePath.lastIndexOf('.'))
          // context.resources[relativePath] = context.folder + stem + '.zcad'
          context.resources[relativePath] = context.folder + relativePath + '.zcad';
        }

        if (context.resources[relativePath]) {
          console.log('resolving XRef:', relativePath, ' > ', context.resources[relativePath]);
          const url = context.resources[relativePath];
          context.incrementAsync();

          if (context.xrefs[relativePath]) {
            const xref = context.xrefs[relativePath];
            if (!xref.isLoaded()) {
              xref.on('loaded', () => {
                this.copyFrom(xref);
              });
            } else {
              this.copyFrom(xref);
            }
          } else {
            context.xrefs[relativePath] = this;
            this.on('loaded', () => {
              context.decrementAsync();
            });
            this.load(
              url,
              new zeaEngine.AssetLoadContext(context)
            ); /*.then(
            () => {
              context.decrementAsync()
            },
            (error) => {
              context.decrementAsync()
            }
          )*/
          }
        }
      }
    }
  }

  zeaEngine.Registry.register('XRef', XRef);

  /** This class abstracts the rendering of a collection of geometries to screen.
   * @extends Lines
   * @ignore
   */
  class SurfaceNormals extends zeaEngine.Lines {
    /**
     * Create surface normals.
     * @param {number} u - The u value.
     * @param {number} v - The v value.
     */
    constructor(u, v) {
      super();
      this.setNumSegments(u * v);
      this.setNumVertices(u * v * 2);
      const positions = this.getVertexAttribute('positions');
      for (let i = 0; i < v; i++) {
        const y = i / (v - 1) - 0.5;
        for (let j = 0; j < u; j++) {
          const x = j / (u - 1) - 0.5;
          const id = i * u + j;
          positions.getValueRef(id * 2).set(x, y, 0.0);
          positions.getValueRef(id * 2 + 1).set(x, y, 1.0);
          this.setSegmentVertexIndices(id, id * 2, id * 2 + 1);
        }
      }
    }
  }

  /** Class representing a fan.
   * @extends Mesh
   * @ignore
   */
  class Fan extends zeaEngine.Mesh {
    /**
     * Create a fan.
     * @param {any} vertexCount - The vertexCount value.
     */
    constructor(vertexCount) {
      super();
      this.setNumVertices(vertexCount);
      const faceCount = vertexCount - 2;
      this.setFaceCounts([faceCount]);

      // ////////////////////////////
      // build the topology
      for (let j = 0; j < faceCount; j++) {
        this.setFaceVertexIndices(j, [0, j + 1, j + 2]);
      }
      const positions = this.getVertexAttribute('positions');
      for (let i = 0; i < vertexCount; i++) {
        // Note: the 'x,y' values are used as uv coords
        // to look up the actual vertex values in the texture.
        // (with a 0.5, 0.5 offset)
        positions.getValueRef(i).set(i / vertexCount - 0.5, -0.5, 0.0);
      }
    }
  }

  /** Class representing a sub set.
   * @ignore
   */
  class SubSet {
    /**
     * Create a sub set.
     * @param {any} gl - The gl value.
     */
    constructor(gl) {
      this.__gl = gl;
      this.__drawCoordsArray = null;
      this.__drawCoordsBuffer = null;
      this.__drawCount = 0; // The number of visible drawn geoms.

      this.__bindAttr = (location, channels, type, stride, offset, instanced = true) => {
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, channels, type, false, stride, offset);
        if (instanced) gl.vertexAttribDivisor(location, 1); // This makes it instanced
      };
    }

    /**
     * The setDrawItems method.
     * @param {any} itemsArray - The itemsArray param.
     */
    setDrawItems(itemsArray) {
      if (this.__drawCoordsBuffer) {
        this.__gl.deleteBuffer(this.__drawCoordsBuffer);
        this.__drawCoordsBuffer = null;
      }
      const gl = this.__gl;
      this.__drawCoordsBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.__drawCoordsBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, itemsArray, gl.STATIC_DRAW);
      this.__drawCount = itemsArray.length / drawShaderAttribsStride;
      return this.__drawCount
    }

    /**
     * The addDrawItems method.
     * @param {any} itemsArray - The itemsArray param.
     */
    addDrawItems(itemsArray) {
      // console.log("addDrawItems:" + itemsArray);
      if (!this.__drawCoordsArray) {
        this.__drawCoordsArray = itemsArray;
      } else {
        const new_Array = new Float32Array(this.__drawCoordsArray.length + itemsArray.length);
        new_Array.set(this.__drawCoordsArray);
        new_Array.set(itemsArray, this.__drawCoordsArray.length);
        this.__drawCoordsArray = new_Array;
      }

      if (this.__drawCoordsBuffer) {
        this.__gl.deleteBuffer(this.__drawCoordsBuffer);
        this.__drawCoordsBuffer = null;
      }

      const gl = this.__gl;
      this.__drawCoordsBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.__drawCoordsBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.__drawCoordsArray, gl.STATIC_DRAW);

      this.__drawCount += itemsArray.length / drawShaderAttribsStride;
      return this.__drawCount
    }

    /**
     * The getDrawCount method.
     * @return {any} - The return value.
     */
    getDrawCount() {
      return this.__drawCount
    }

    // ////////////////////////////////////
    // Drawing

    /**
     * The bind method.
     * @param {any} renderstate - The renderstate param.
     * @return {any} - The return value.
     */
    bind(renderstate) {
      if (this.__drawCount == 0) {
        return 0
      }

      const gl = this.__gl;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.__drawCoordsBuffer);

      const attrs = renderstate.attrs;
      this.__bindAttr(attrs.drawCoords.location, 4, gl.FLOAT, drawShaderAttribsStride * 4, 0);
      // this.__bindAttr(attrs.drawItemTexAddr.location, 2, gl.FLOAT, drawShaderAttribsStride * 4, 4 * 4)

      return this.__drawCount
    }

    destroy() {
      const gl = this.__gl;
      gl.deleteBuffer(this.__drawCoordsBuffer);
      this.__drawCoordsBuffer = null;
    }
  }

  const __cache = {};

  /** Class representing a GL surface draw set.
   * @ignore
   */
  class GLSurfaceDrawSet {
    /**
     * Create a GL surface draw set.
     * @param {any} gl - The gl value.
     * @param {number} x - The x value.
     * @param {number} y - The y value.
     */
    constructor(gl, x, y) {
      // console.log("GLSurfaceDrawSet:" + x + "," + y)
      this.__gl = gl;

      if (x == 0 || y == 0) console.error('invalid GLSurfaceDrawSet:' + x + ',' + y);

      if (y == 1) {
        const key = x;
        if (!__cache[key]) {
          __cache[key] = new zeaEngine.GLMesh(gl, new Fan(x));
        }
        this.__glgeom = __cache[key];
        this.__numTris = x - 2;
        this.__glnormalsgeom = new zeaEngine.GLLines(gl, new SurfaceNormals(x, y));

        this.key = key;
      } else {
        const key = x + 'x' + y;
        if (!__cache[key]) {
          __cache[key] = new zeaEngine.GLMesh(gl, new zeaEngine.Plane(1.0, 1.0, x - 1, y - 1));
        }
        this.__glgeom = __cache[key];
        this.__numTris = (x - 1) * (y - 1) * 2;
        this.__glnormalsgeom = new zeaEngine.GLLines(gl, new SurfaceNormals(x, y));

        this.key = key;
      }
      this.__quadDetail = [x - 1, y - 1];
      this.__freeIndices = [];
      this.__subSets = {};
    }

    /**
     * The setDrawItems method.
     * @param {any} itemsArray - The itemsArray param.
     * @param {any} key - The key param.
     * @return {any} - The return value.
     */
    setDrawItems(itemsArray, key) {
      if (!this.__subSets[key]) {
        this.__subSets[key] = new SubSet(this.__gl);
      }
      const drawCount = this.__subSets[key].setDrawItems(itemsArray);
      return this.__numTris * drawCount
    }

    /**
     * The addDrawItems method.
     * @param {any} itemsArray - The itemsArray param.
     * @param {any} key - The key param.
     * @return {any} - The return value.
     */
    addDrawItems(itemsArray, key) {
      if (!this.__subSets[key]) {
        this.__subSets[key] = new SubSet(this.__gl);
      }
      const drawCount = this.__subSets[key].addDrawItems(itemsArray);
      // console.log(this.key, "key:", key, drawCount)

      return this.__numTris * drawCount
    }

    /**
     * The getDrawCount method.
     * @param {any} key - The key param.
     * @return {number} - The return value.
     */
    getDrawCount(key) {
      if (this.__subSets[key]) return this.__subSets[key].getDrawCount()
      return 0
    }

    // ////////////////////////////////////
    // Drawing

    /**
     * The draw method.
     * @param {any} renderstate - The renderstate param.
     * @param {any} key - The key param.
     */
    draw(renderstate, key) {
      const subSet = this.__subSets[key];
      if (!subSet) return

      const gl = this.__gl;
      const unifs = renderstate.unifs;

      if (unifs.quadDetail) {
        gl.uniform2i(unifs.quadDetail.location, this.__quadDetail[0], this.__quadDetail[1]);
      }

      this.__glgeom.bind(renderstate);

      const drawCount = subSet.bind(renderstate);

      renderstate.bindViewports(renderstate.unifs, () => {
        this.__glgeom.drawInstanced(drawCount);

        // To debug the mesh topology we can render as lines instead.
        // gl.drawElementsInstanced(
        //   this.__glgeom.__gl.LINES,
        //   this.__glgeom.__numTriIndices,
        //   this.__glgeom.__indexDataType,
        //   0,
        //   drawCount
        // )
      });
    }

    /**
     * The drawNormals method.
     * @param {any} renderstate - The renderstate param.
     * @param {any} key - The key param.
     */
    drawNormals(renderstate, key) {
      if (!this.__glnormalsgeom) return

      const subSet = this.__subSets[key];
      if (!subSet) return
      const gl = this.__gl;
      const unifs = renderstate.unifs;

      if (unifs.quadDetail) {
        gl.uniform2i(unifs.quadDetail.location, this.__quadDetail[0], this.__quadDetail[1]);
      }

      this.__glnormalsgeom.bind(renderstate);

      const drawCount = subSet.bind(renderstate);

      renderstate.bindViewports(renderstate.unifs, () => {
        this.__glnormalsgeom.drawInstanced(drawCount);
      });
    }

    destroy() {
      // Note:  this.__glgeom is shared between all GLCADAssets using a global cache. See above
      // this.__glgeom.destroy()

      if (this.__glnormalsgeom) this.__glnormalsgeom.destroy();

      for (const key in this.__subSets) {
        let subSet = this.__subSets[key];
        subSet.destroy();
      }
    }
  }

  /** Class representing an Edge
   * @private
   */
  class Edge extends zeaEngine.Lines {
    /**
     * Create a strip.
     * @param {number} detail - The detail value.
     */
    constructor(detail = 1) {
      super();
      this.setNumVertices(detail + 1);
      this.setNumSegments(detail);
      const positions = this.getVertexAttribute('positions');
      for (let i = 0; i <= detail; i++) {
        if (i < detail) this.setSegmentVertexIndices(i, i, i + 1);
        // Note: the 'x,y' values are used as uv coords
        // to look up the actual vertex values in the texture.
        // (with a 0.5, 0.5 offset)
        positions.getValueRef(i).set(i / detail, 0.0, 0.0);
      }
      this.emit('geomDataTopologyChanged');
    }
  }

  /** Class representing a sub set.
   * @private
   */
  class SubSet$1 {
    /**
     * Create a sub set.
     * @param {any} gl - The gl value.
     */
    constructor(gl) {
      this.__gl = gl;
      this.__drawCoordsArray = null;
      this.__drawCoordsBuffer = null;
      this.__drawCount = 0; // The number of visible drawn geoms.

      this.__bindAttr = (location, channels, type, stride, offset, instanced = true) => {
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, channels, type, false, stride, offset);
        if (instanced) gl.vertexAttribDivisor(location, 1); // This makes it instanced
      };
    }

    /**
     * The setDrawItems method.
     * @param {any} itemsArray - The itemsArray param.
     */
    setDrawItems(itemsArray) {
      if (this.__drawCoordsBuffer) {
        this.__gl.deleteBuffer(this.__drawCoordsBuffer);
        this.__drawCoordsBuffer = null;
      }
      const gl = this.__gl;
      this.__drawCoordsBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.__drawCoordsBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, itemsArray, gl.STATIC_DRAW);
      this.__drawCount = itemsArray.length / drawShaderAttribsStride;
      return this.__drawCount
    }

    /**
     * The addDrawItems method.
     * @param {any} itemsArray - The itemsArray param.
     */
    addDrawItems(itemsArray) {
      // console.log("addDrawItems:" + itemsArray);
      if (!this.__drawCoordsArray) {
        this.__drawCoordsArray = itemsArray;
      } else {
        const new_Array = new Float32Array(this.__drawCoordsArray.length + itemsArray.length);
        new_Array.set(this.__drawCoordsArray);
        new_Array.set(itemsArray, this.__drawCoordsArray.length);
        this.__drawCoordsArray = new_Array;
      }

      if (this.__drawCoordsBuffer) {
        this.__gl.deleteBuffer(this.__drawCoordsBuffer);
        this.__drawCoordsBuffer = null;
      }

      const gl = this.__gl;
      this.__drawCoordsBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.__drawCoordsBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.__drawCoordsArray, gl.STATIC_DRAW);

      this.__drawCount += itemsArray.length / drawShaderAttribsStride;
      return this.__drawCount
    }

    /**
     * The getDrawCount method.
     * @return {any} - The return value.
     */
    getDrawCount() {
      return this.__drawCount
    }

    // ////////////////////////////////////
    // Drawing

    /**
     * The bind method.
     * @param {any} renderstate - The renderstate param.
     * @return {any} - The return value.
     */
    bind(renderstate) {
      if (this.__drawCount == 0) {
        return 0
      }
      const gl = this.__gl;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.__drawCoordsBuffer);

      const attrs = renderstate.attrs;
      this.__bindAttr(attrs.drawCoords.location, 4, gl.FLOAT, drawShaderAttribsStride * 4, 0);
      // this.__bindAttr(attrs.drawItemTexAddr.location, 2, gl.FLOAT, drawShaderAttribsStride * 4, 4 * 4)

      return this.__drawCount
    }

    destroy() {
      const gl = this.__gl;
      gl.deleteBuffer(this.__drawCoordsBuffer);
      this.__drawCoordsBuffer = null;
    }
  }

  const __cache$1 = {};

  /** Class representing a GL surface draw set.
   * @private
   */
  class GLCurveDrawSet {
    /**
     * Create a GL surface draw set.
     * @param {any} gl - The gl value.
     * @param {number} x - The x value.
     * @param {number} y - The y value.
     */
    constructor(gl, detail) {
      // console.log("GLCurveDrawSet:" + x + "," + y)
      this.__gl = gl;

      if (detail == 0) console.error('invalid GLCurveDrawSet:' + detail);

      if (!__cache$1[detail]) {
        __cache$1[detail] = new zeaEngine.GLLines(gl, new Edge(detail));
      }
      this.key = detail;
      this.__glgeom = __cache$1[detail];
      this.__edgeDetail = detail;
      this.__freeIndices = [];
      this.__subSets = {};
      this.__numDrawItems = 0;
    }

    /**
     * The setDrawItems method.
     * @param {any} itemsArray - The itemsArray param.
     * @param {any} key - The key param.
     * @return {any} - The return value.
     */
    setDrawItems(itemsArray, key) {
      if (!this.__subSets[key]) {
        this.__subSets[key] = new SubSet$1(this.__gl);
      }
      this.__subSets[key].setDrawItems(itemsArray);

      this.__numDrawItems += itemsArray.length / 2;
      return this.__numDrawItems
    }

    /**
     * The addDrawItems method.
     * @param {any} itemsArray - The itemsArray param.
     * @param {any} key - The key param.
     * @return {any} - The return value.
     */
    addDrawItems(itemsArray, key) {
      if (!this.__subSets[key]) {
        this.__subSets[key] = new SubSet$1(this.__gl);
      }
      this.__numDrawItems += this.__subSets[key].addDrawItems(itemsArray);
      // console.log(this.key, "key:", key, this.__numDrawItems)
    }

    /**
     * The getDrawCount method.
     * @param {any} key - The key param.
     * @return {number} - The return value.
     */
    getDrawCount(key) {
      if (this.__subSets[key]) return this.__subSets[key].getDrawCount()
      return 0
    }

    // ////////////////////////////////////
    // Drawing

    /**
     * The draw method.
     * @param {any} renderstate - The renderstate param.
     * @param {any} key - The key param.
     */
    draw(renderstate, key) {
      const subSet = this.__subSets[key];
      if (!subSet) return

      const gl = this.__gl;
      const unifs = renderstate.unifs;

      if (unifs.edgeDetail) {
        gl.uniform1i(unifs.edgeDetail.location, this.__edgeDetail);
      }

      this.__glgeom.bind(renderstate);

      const drawCount = subSet.bind(renderstate);
      renderstate.bindViewports(renderstate.unifs, () => {
        this.__glgeom.drawInstanced(drawCount);
      });
    }

    destroy() {
      // Note:  this.__glgeom is shared between all GLCADAssets using a global cache. See above
      // this.__glgeom.destroy()

      if (this.__glnormalsgeom) this.__glnormalsgeom.destroy();

      for (const key in this.__subSets) {
        let subSet = this.__subSets[key];
        subSet.destroy();
      }
    }
  }

  /* eslint-disable camelcase */

  /** Class representing a GL evaluate CAD curve shader.
   * @extends GLShader
   * @ignore
   */
  class GLEvaluateCADCurveShader extends zeaEngine.GLShader {
    /**
     * Create a GL evaluate CAD curve shader.
     * @param {any} gl - The gl value.
     * @ignore
     */
    constructor(gl) {
      super(gl);

      this.__shaderStages['VERTEX_SHADER'] = zeaEngine.shaderLibrary.parseShader(
        'GLEvaluateCADCurveShader.vertexShader',
        `
precision highp float;

attribute vec3 positions;
instancedattribute vec4 patchCoords;         // where the values will be written to in the target texture.
instancedattribute vec2 curveDataCoords;     // where the data will come from in the source texture

uniform ivec2 curvesAtlasTextureSize;

/* VS Outputs */
varying vec2 v_geomDataCoords;
varying vec2 v_patchSize;
varying vec2 v_vertexCoord;



void main(void) {

  vec2 patchPos = patchCoords.xy;
  v_patchSize = patchCoords.zw;

  v_geomDataCoords = curveDataCoords;
  v_vertexCoord = (positions.xy + 0.5) * v_patchSize;

  vec2 pos = (patchPos + v_vertexCoord) / vec2(curvesAtlasTextureSize);
  gl_Position =  vec4((pos - 0.5) * 2.0, 0.0, 1.0);
}
`
      );

      this.__shaderStages['FRAGMENT_SHADER'] = zeaEngine.shaderLibrary.parseShader(
        'GLEvaluateCADCurveShader.fragmentShader',
        `
// #extension GL_EXT_draw_buffers : require
precision highp float;

/* VS Outputs */
varying vec2 v_geomDataCoords;
varying vec2 v_patchSize;
varying vec2 v_vertexCoord;


struct PosNorm {
  vec3 pos;
  vec3 normal;
  int geomType;
};


<%include file="GLSLUtils.glsl"/>
<%include file="GLSLMath.glsl"/>
<%include file="GLSLBinReader.glsl"/>

<%include file="GLSLCADConstants.glsl"/>
<%include file="GLSLCADCurves.glsl"/>
<%include file="GLSLNURBS.glsl"/>
<%include file="GLSLNURBSCurves.glsl"/>

uniform sampler2D curveDataTexture;
uniform ivec2 curveDataTextureSize;
uniform int writeTangents;

PosNorm evalCADCurves(vec2 params, inout GLSLBinReader reader, sampler2D texture) {
  int geomType = GLSLBinReader_readInt(reader, texture);

  // PosNorm result;
  // result.pos = vec3(float(geomType));
  // // fragColor = reader.buffer;
  // // fragColor = vec4(float(reader.textureSize.x), float(reader.textureSize.y), float(geomType), 1.0);
  // return result;


  if(geomType == CURVE_TYPE_LINE) {
      return calcLinePoint(params.x, reader, texture);
  } 
  if(geomType == CURVE_TYPE_CIRCLE) {
      return calcCirclePoint(params.x, reader, texture);
  } 
  if(geomType == CURVE_TYPE_ELIPSE) {
      return calcElipsePoint(params.x, reader, texture);
  }
  if(geomType == CURVE_TYPE_NURBS_CURVE) {
      return calcNURBSCurve3dPoint(params.x, reader, texture);
  } 
  
  PosNorm detault;
  return detault;
}

#ifdef ENABLE_ES3
out vec4 fragColor;
#endif

void main(void) {

#ifndef ENABLE_ES3
  vec4 fragColor;
#endif


  // Evaluate the curve per vertex

  // compute exact xy coords per pixel by rounding the vertex coord to the nearest integer and then dividing my patch size.
  // The interpollated xy coords from the quad are not exact because the quad must cover the pixels with some margin.

  // The quad overlaps the pixels by half a pixel, so 
  vec2 params = vec2(floor(v_vertexCoord.x), floor(v_vertexCoord.y));
  if(v_patchSize.x > 1.0)
      params.x /= v_patchSize.x - 1.0;
  // if(v_patchSize.y > 1.0)
  //     params.y /= v_patchSize.y - 1.0;

  ivec4 region = ivec4(0, 0, curveDataTextureSize.x, curveDataTextureSize.y);
  ivec2 start = ivec2(int(v_geomDataCoords.x), int(v_geomDataCoords.y));

  GLSLBinReader reader;
  GLSLBinReader_init(reader, curveDataTextureSize, region, start, 32);
  PosNorm posNorm = evalCADCurves(params, reader, curveDataTexture);

  if(writeTangents == 1) {
      fragColor = vec4(posNorm.normal, 1.0);
  }
  else {
      fragColor = vec4(posNorm.pos, 1.0);
  }
  // fragColor = vec4(params.x, params.y, 0.0, 1.0);
  // gl_FragData[0] = vec4(posNorm.pos, 1.0);
  // gl_FragData[1] = vec4(posNorm.normal, 1.0);

  // fragColor.r = v_geomDataCoords.x;
  // fragColor.g = v_geomDataCoords.y;
  // fragColor.b = float(curveDataTextureSize.x);
  // fragColor.a = float(curveDataTextureSize.y);

#ifndef ENABLE_ES3
  gl_FragColor = fragColor;
#endif
}
`
      );
    }
  }

  zeaEngine.Registry.register('GLEvaluateCADCurveShader', GLEvaluateCADCurveShader);

  /** Class representing a GL curve library.
   * @ignore
   */
  class GLCurveLibrary {
    /**
     * Create a GL curve library.
     * @param {any} gl - The gl value.
     * @param {any} cadpassdata - The cadpassdata value.
     * @param {any} surfacesLibrary - The surfacesLibrary value.
     * @param {any} version - The version object.
     */
    constructor(gl, cadpassdata, surfacesLibrary, version) {
      this.__gl = gl;
      this.__cadpassdata = cadpassdata;
      this.__surfacesLibrary = surfacesLibrary;
      this.cadDataVersion = version;

      const curvesDataBuffer = this.__surfacesLibrary.getCurveBuffer();
      const curveTexSize = Math.sqrt(curvesDataBuffer.byteLength / 8);

      this.__curveDataTexture = new zeaEngine.GLTexture2D(gl, {
        format: 'RGBA',
        type: 'HALF_FLOAT',
        width: curveTexSize,
        height: curveTexSize,
        filter: 'NEAREST',
        wrap: 'CLAMP_TO_EDGE',
        mipMapped: false,
        data: new Uint16Array(curvesDataBuffer),
      });

      this.__bindAttr = (location, channels, type, stride, offset, instanced = true) => {
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, channels, gl.FLOAT, false, stride, offset);
        if (instanced) gl.vertexAttribDivisor(location, 1); // This makes it instanced
      };
    }

    // /////////////////////////////////////////////////////////////
    // Curves

    /**
     * The evaluateCurves method.
     * @param {any} curvesAtlasLayout - The curvesAtlasLayout param.
     * @param {any} numCurves - The numCurves param.
     * @param {any} curvesAtlasLayoutTextureSize - The curvesAtlasLayoutTextureSize param.
     * @param {any} curvesAtlasTextureDim - The curvesAtlasTextureDim param.
     */
    evaluateCurves(curvesAtlasLayout, numCurves, curvesAtlasLayoutTextureSize, curvesAtlasTextureDim) {
      // console.log("evaluateCurves:" + assetId + ":" + curvesAtlasTextureDim);

      const count = numCurves;
      if (count == 0) return

      const gl = this.__gl;
      {
        this.__curveAtlasLayoutTexture = new zeaEngine.GLTexture2D(this.__gl, {
          format: 'RGBA',
          type: 'FLOAT',
          width: curvesAtlasLayoutTextureSize[0],
          height: curvesAtlasLayoutTextureSize[1],
          filter: 'NEAREST',
          wrap: 'CLAMP_TO_EDGE',
          mipMapped: false,
          data: curvesAtlasLayout,
        });
      }

      if (!this.__curvesAtlasRenderTarget) {
        this.__curvesAtlasRenderTarget = new zeaEngine.GLRenderTarget(gl, {
          format: 'RGBA',
          type: 'FLOAT',
          width: curvesAtlasTextureDim[0],
          height: curvesAtlasTextureDim[1],
          filter: 'NEAREST',
          wrap: 'CLAMP_TO_EDGE',
          mipMapped: false,
        });
        this.__curvesTangentAtlasRenderTarget = new zeaEngine.GLRenderTarget(gl, {
          format: 'RGBA',
          type: 'FLOAT',
          width: curvesAtlasTextureDim[0],
          height: curvesAtlasTextureDim[1],
          filter: 'NEAREST',
          wrap: 'CLAMP_TO_EDGE',
          mipMapped: false,
        });
      } else if (
        this.__curvesAtlasRenderTarget.width != curvesAtlasTextureDim[0] ||
        this.__curvesAtlasRenderTarget.height != curvesAtlasTextureDim[1]
      ) {
        // Copy the previous image into a new one, and then destroy the prvious.
        this.__curvesAtlasRenderTarget.resize(curvesAtlasTextureDim[0], curvesAtlasTextureDim[1], true);
      }

      const renderstate = {
        shaderopts: {
          directives: [...gl.shaderopts.directives],
        },
      };
      this.__curvesAtlasRenderTarget.bindForWriting(renderstate, true);

      if (this.cadDataVersion.compare([0, 0, 0]) > 0) {
        renderstate.shaderopts.directives.push('#define EXPORT_KNOTS_AS_DELTAS 1');
      }
      if (this.cadDataVersion.compare([0, 0, 26]) > 0) {
        renderstate.shaderopts.directives.push('#define INTS_PACKED_AS_2FLOAT16 1');
      }

      if (!this.evaluateCurveShader) {
        this.evaluateCurveShader = new GLEvaluateCADCurveShader(gl);
      }

      this.evaluateCurveShader.bind(renderstate);
      this.__cadpassdata.glplanegeom.bind(renderstate);

      const unifs = renderstate.unifs;
      const attrs = renderstate.attrs;

      gl.uniform2i(
        unifs.curvesAtlasTextureSize.location,
        this.__curvesAtlasRenderTarget.width,
        this.__curvesAtlasRenderTarget.height
      );

      this.__curveDataTexture.bindToUniform(renderstate, unifs.curveDataTexture);
      gl.uniform2i(unifs.curveDataTextureSize.location, this.__curveDataTexture.width, this.__curveDataTexture.height);

      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, curvesAtlasLayout, gl.STATIC_DRAW);

      this.__bindAttr(attrs.patchCoords.location, 4, gl.FLOAT, valuesPerCurveLibraryLayoutItem * 4, 0);
      this.__bindAttr(attrs.curveDataCoords.location, 2, gl.FLOAT, valuesPerCurveLibraryLayoutItem * 4, 4 * 4);

      // //////////////////////////////////////////////
      // Bind each Fbo and render separately.
      // Bizzarly, this has turned out to be much faster
      // than using mutiple render targets...
      gl.uniform1i(unifs.writeTangents.location, 0);

      this.__cadpassdata.glplanegeom.drawInstanced(count);

      this.__curvesTangentAtlasRenderTarget.bindForWriting(renderstate, true);

      gl.uniform1i(unifs.writeTangents.location, 1);
      this.__cadpassdata.glplanegeom.drawInstanced(count);
      // //////////////////////////////////////////////

      gl.deleteBuffer(buffer);
      // console.log("----------------------------------");
      // logCurveData(35799)
      // logCurveData(1)
      // console.log("----------------------------------");

      this.__curvesTangentAtlasRenderTarget.unbind();
      gl.finish();
    }

    /**
     * The bindCurvesAtlas method.
     * @param {any} renderstate - The renderstate param.
     */
    bindCurvesAtlasLayout(renderstate) {
      const gl = this.__gl;
      const unifs = renderstate.unifs;
      if (this.__curvesAtlasRenderTarget) {
        if (unifs.curvesAtlasLayoutTexture) {
          this.__curveAtlasLayoutTexture.bindToUniform(renderstate, unifs.curvesAtlasLayoutTexture);
          gl.uniform2i(
            unifs.curvesAtlasLayoutTextureSize.location,
            this.__curveAtlasLayoutTexture.width,
            this.__curveAtlasLayoutTexture.height
          );
        }
      }
    }

    /**
     * The bindCurvesAtlas method.
     * @param {any} renderstate - The renderstate param.
     */
    bindCurvesAtlas(renderstate) {
      const gl = this.__gl;
      const unifs = renderstate.unifs;
      if (this.__curvesAtlasRenderTarget) {
        this.__curvesAtlasRenderTarget.bindColorTexture(renderstate, unifs.curvesAtlasTexture);

        if (unifs.curveTangentsTexture) {
          this.__curvesTangentAtlasRenderTarget.bindColorTexture(renderstate, unifs.curveTangentsTexture);
        }
        if (unifs.curvesAtlasTextureSize) {
          gl.uniform2i(
            unifs.curvesAtlasTextureSize.location,
            this.__curvesAtlasRenderTarget.width,
            this.__curvesAtlasRenderTarget.height
          );
        }

        if (unifs.curvesAtlasLayoutTexture) {
          this.__curveAtlasLayoutTexture.bindToUniform(renderstate, unifs.curvesAtlasLayoutTexture);
          gl.uniform2i(
            unifs.curvesAtlasLayoutTextureSize.location,
            this.__curveAtlasLayoutTexture.width,
            this.__curveAtlasLayoutTexture.height
          );
        }
      }
    }

    /**
     * The destroy method.
     */
    destroy() {
      this.__curveDataTexture.destroy();
      if (this.__curveAtlasLayoutTexture) {
        this.__curveAtlasLayoutTexture.destroy();
        this.__curvesAtlasRenderTarget.destroy();
        this.__curvesTangentAtlasRenderTarget.destroy();
      }
    }
  }

  // import {
  //     Vec2,
  //     Vec3,
  //     Quat,
  //     Color,
  //     Box2,
  //     Box3
  // } from '../Math';

  const decode16BitFloat = (h) => {
    const s = (h & 0x8000) >> 15;
    const e = (h & 0x7c00) >> 10;
    const f = h & 0x03ff;

    if (e == 0) {
      return (s ? -1 : 1) * Math.pow(2, -14) * (f / Math.pow(2, 10))
    } else if (e == 0x1f) {
      return f ? NaN : (s ? -1 : 1) * Infinity
    }

    return (s ? -1 : 1) * Math.pow(2, e - 15) * (1 + f / Math.pow(2, 10))
  };

  /** Class representing a bin reader.
   * @ignore
   */
  class BinReader {
    /**
     * Create a bin reader.
     * @param {Buffer} data - The data buffer.
     * @param {number} byteOffset - The byte offset value to start reading the buffer.
     * @param {boolean} isMobileDevice - The isMobileDevice value.
     */
    constructor(data, byteOffset = 0, isMobileDevice = true) {
      this.__data = data;
      this.__byteOffset = byteOffset;
      this.__dataView = new DataView(this.__data);
      this.__isMobileDevice = isMobileDevice;
      this.utf8decoder = new TextDecoder();
    }

    /**
     * Getter for isMobileDevice.
     * @return {Boolean} - Returns true is a mobile device is detected.
     */
    get isMobileDevice() {
      return this.__isMobileDevice
    }

    /**
     * Getter for data.
     * @return {Buffer} - The data buffer we are reading from,
     */
    get data() {
      return this.__data
    }

    /**
     * Getter for byteLength.
     * @return {number} - The total length of the buffer
     */
    get byteLength() {
      return this.__dataView.byteLength
    }

    /**
     * Getter for remainingByteLength.
     * @return {number} - The reemaining length of the buffer to read.
     */
    get remainingByteLength() {
      return this.__dataView.byteLength - this.__byteOffset
    }

    /**
     * The pos method.
     * @return {number} - The current offset in the binary buffer
     */
    pos() {
      return this.__byteOffset
    }

    /**
     * The seek method.
     * @param {number} byteOffset - The byteOffset param.
     */
    seek(byteOffset) {
      this.__byteOffset = byteOffset;
    }

    /**
     * The advance method.
     * @param {number} byteOffset - The byte Offset amount.
     */
    advance(byteOffset) {
      this.__byteOffset += byteOffset;
    }

    /**
     * The loadUInt8 method.
     * @return {number} - The return value.
     */
    loadUInt8() {
      const result = this.__dataView.getUint8(this.__byteOffset);
      this.__byteOffset += 1;
      return result
    }

    /**
     * The loadUInt16 method.
     * @return {number} - The return value.
     */
    loadUInt16() {
      const result = this.__dataView.getUint16(this.__byteOffset, true);
      this.__byteOffset += 2;
      return result
    }

    /**
     * The loadUInt32 method.
     * @return {number} - The return value.
     */
    loadUInt32() {
      const result = this.__dataView.getUint32(this.__byteOffset, true);
      this.__byteOffset += 4;
      return result
    }

    /**
     * The loadSInt32 method.
     * @return {number} - The return value.
     */
    loadSInt32() {
      const result = this.__dataView.getInt32(this.__byteOffset, true);
      this.__byteOffset += 4;
      return result
    }

    /**
     * The loadFloat16 method.
     * @return {number} - The return value.
     */
    loadFloat16() {
      const uint16 = this.loadUInt16();
      return decode16BitFloat(uint16)
    }

    /**
     * The loadUFloat16 returns a float where the sign big indicates it is > 201.
     * @return {number} - The return value.
     */
    loadUFloat16() {
      const result = this.loadFloat16();
      if (result < 0.0) {
        return 2048.0 - result // Note: subtract a negative number to add it.
      } else {
        return result
      }
    }

    /**
     * The loadFloat16From2xUInt8 method.
     * @return {number} - The return value.
     */
    loadFloat16From2xUInt8() {
      const result = this.__dataView.getFloat16(this.__byteOffset, true);
      // const uint8s = this.loadUInt8Array(2);
      // return decode16BitFloat(uint8s);
      this.__byteOffset += 2;
      return result
    }

    /**
     * The loadUInt32From2xUFloat16 loads a single Signed integer value from 2 Unsigned Float16 values.
     * @return {number} - The return value.
     */
    loadUInt32From2xUFloat16() {
      const partA = this.loadUFloat16();
      const partB = this.loadUFloat16();
      return partA + partB * 4096
    }

    /**
     * The loadSInt32From2xFloat16 loads a single Signed integer value from 2 signed Float16 values.
     * @return {number} - The return value.
     */
    loadSInt32From2xFloat16() {
      const partA = this.loadFloat16();
      const partB = this.loadFloat16();
      return partA + partB * 2048
    }

    /**
     * The loadFloat32 method.
     * @return {any} - The return value.
     */
    loadFloat32() {
      const result = this.__dataView.getFloat32(this.__byteOffset, true);
      this.__byteOffset += 4;
      return result
    }

    /**
     * The loadFloat32 method.
     * @param {any} size - The size param.
     * @param {boolean} clone - The clone param.
     * @return {any} - The return value.
     */
    loadUInt8Array(size = undefined, clone = false) {
      if (size == undefined) size = this.loadUInt32();
      const result = new Uint8Array(this.__data, this.__byteOffset, size);
      this.__byteOffset += size;
      const padd = this.__byteOffset % 4;
      // this.readPadd();
      return result
    }

    /**
     * The loadUInt16Array method.
     * @param {any} size - The size param.
     * @param {boolean} clone - The clone param.
     * @return {any} - The return value.
     */
    loadUInt16Array(size = undefined, clone = false) {
      if (size == undefined) size = this.loadUInt32();
      if (size == 0) return new Uint16Array()
      this.readPadd(2);
      let result;
      if (this.__isMobileDevice) {
        result = new Uint16Array(size);
        for (let i = 0; i < size; i++) {
          result[i] = this.__dataView.getUint16(this.__byteOffset, true);
          this.__byteOffset += 2;
        }
      } else {
        result = new Uint16Array(this.__data, this.__byteOffset, size);
        this.__byteOffset += size * 2;
      }
      // this.readPadd();
      return result
    }

    /**
     * The loadUInt32Array method.
     * @param {any} size - The size param.
     * @param {boolean} clone - The clone param.
     * @return {any} - The return value.
     */
    loadUInt32Array(size = undefined, clone = false) {
      if (size == undefined) size = this.loadUInt32();
      if (size == 0) return new Uint32Array()
      this.readPadd(4);
      let result;
      if (this.__isMobileDevice) {
        result = new Uint32Array(size);
        for (let i = 0; i < size; i++) {
          result[i] = this.__dataView.getUint32(this.__byteOffset, true);
          this.__byteOffset += 4;
        }
      } else {
        result = new Uint32Array(this.__data, this.__byteOffset, size);
        this.__byteOffset += size * 4;
      }
      return result
    }

    /**
     * The loadFloat32Array method.
     * @param {any} size - The size param.
     * @param {boolean} clone - The clone param.
     * @return {any} - The return value.
     */
    loadFloat32Array(size = undefined, clone = false) {
      if (size == undefined) size = this.loadUInt32();
      if (size == 0) return new Float32Array()
      this.readPadd(4);
      let result;
      if (this.__isMobileDevice) {
        result = new Float32Array(size);
        for (let i = 0; i < size; i++) {
          result[i] = this.__dataView.getFloat32(this.__byteOffset, true);
          this.__byteOffset += 4;
        }
      } else {
        result = new Float32Array(this.__data, this.__byteOffset, size);
        this.__byteOffset += size * 4;
      }
      return result
    }

    /**
     * The loadStr method.
     * @return {string} - The return value.
     */
    loadStr() {
      const numChars = this.loadUInt32();
      const chars = new Uint8Array(this.__data, this.__byteOffset, numChars);
      this.__byteOffset += numChars;
      let result = '';
      for (let i = 0; i < numChars; i++) result = result + String.fromCharCode(chars[i]);
      return result
    }

    /**
     * The loadStrArray method.
     * @return {array} - The return value.
     */
    loadStrArray() {
      const size = this.loadUInt32();
      const result = [];
      for (let i = 0; i < size; i++) {
        result[i] = this.loadStr();
      }
      return result
    }

    // loadSInt32Vec2() {
    //     const x = this.loadSInt32();
    //     const y = this.loadSInt32();
    //     return new Vec2(x, y);
    // }

    // loadUInt32Vec2() {
    //     const x = this.loadUInt32();
    //     const y = this.loadUInt32();
    //     return new Vec2(x, y);
    // }

    // loadFloat16Vec2() {
    //     const x = this.loadFloat16();
    //     const y = this.loadFloat16();
    //     return new Vec2(x, y);
    // }

    // loadFloat32Vec2() {
    //     const x = this.loadFloat32();
    //     const y = this.loadFloat32();
    //     return new Vec2(x, y);
    // }

    // loadFloat16Vec3() {
    //     const x = this.loadFloat16();
    //     const y = this.loadFloat16();
    //     const z = this.loadFloat16();
    //     return new Vec3(x, y, z);
    // }

    // loadFloat32Vec3() {
    //     const x = this.loadFloat32();
    //     const y = this.loadFloat32();
    //     const z = this.loadFloat32();
    //     return new Vec3(x, y, z);
    // }

    // loadFloat16Quat() {
    //     const x = this.loadFloat16();
    //     const y = this.loadFloat16();
    //     const z = this.loadFloat16();
    //     const w = this.loadFloat16();
    //     return new Quat(x, y, z, w);
    // }

    // loadFloat32Quat() {
    //     const x = this.loadFloat32();
    //     const y = this.loadFloat32();
    //     const z = this.loadFloat32();
    //     const w = this.loadFloat32();
    //     return new Quat(x, y, z, w);
    // }

    // loadRGBFloat32Color() {
    //     const r = this.loadFloat32();
    //     const g = this.loadFloat32();
    //     const b = this.loadFloat32();
    //     return new Color(r, g, b);
    // }

    // loadRGBAFloat32Color() {
    //     const r = this.loadFloat32();
    //     const g = this.loadFloat32();
    //     const b = this.loadFloat32();
    //     const a = this.loadFloat32();
    //     return new Color(r, g, b, a);
    // }

    // loadRGBUInt8Color() {
    //     const r = this.loadUInt8();
    //     const g = this.loadUInt8();
    //     const b = this.loadUInt8();
    //     return new Color(r / 255, g / 255, b / 255);
    // }

    // loadRGBAUInt8Color() {
    //     const r = this.loadUInt8();
    //     const g = this.loadUInt8();
    //     const b = this.loadUInt8();
    //     const a = this.loadUInt8();
    //     return new Color(r / 255, g / 255, b / 255, a / 255);
    // }

    // loadBox2() {
    //     return new Box2(this.loadFloat32Vec2(), this.loadFloat32Vec2());
    // }

    // loadBox3() {
    //     return new Box3(this.loadFloat32Vec3(), this.loadFloat32Vec3());
    // }

    /**
     * The loadStr method.
     * @param {any} stride - The stride param.
     */
    readPadd(stride) {
      const padd = this.__byteOffset % stride;
      if (padd != 0) this.__byteOffset += stride - padd;
    }
  }

  zeaEngine.shaderLibrary.setShaderModule(
    'GLSLBinReader.glsl',
    `

#ifdef DECODE_16BIT_FLOAT_FROM_8BIT_INT

/////////////////////////////////////////////////////////////////
// http://concord-consortium.github.io/lab/experiments/webgl-gpgpu/script.js
// Note: modulo on some GPUS. (e.g. iPhone)
// often incur errors in modulo, leaving a result
// that appears to boe the y param. in this use case
// we are only interested in integer moduos anyway
// so we just trim off erronious values. .Seems to work. 
float fixed_mod(float x, float y) {
  float res = mod(x, y);
  return (abs(y - res) < 0.5) ? 0.0 : res;
}

float shift_right(float v, float amt) {
  v = floor(v) + 0.5;
  return floor(v / exp2(amt));
}

float shift_left(float v, float amt) {
  return floor(v * exp2(amt) + 0.5);
}

float mask_last(float v, float bits) {
  return fixed_mod(v, shift_left(1.0, bits));
}

float extract_bits(float num, float from, float to) {
  from = floor(from + 0.5);
  to = floor(to + 0.5);
  return mask_last(shift_right(num, from), to - from);
}


/////////////////////////////////////////////////////////////////

float decode16BitFloatFrom2xUInt8_IEEE(vec2 c){
  float v = 0.;

  // int h = c.x + c.y * 256;
  // const s = (h & 0x8000) >> 15;
  // const e = (h & 0x7C00) >> 10;
  // const f = h & 0x03FF;


  // float h = c.x + c.y * 256.0;
  // float s = extract_bits(h, 15.0, 16.0);
  // float e = extract_bits(h, 10.0, 15.0);
  // float f = extract_bits(h, 0.0, 10.0);

  // float s = extract_bits(c.y, 7.0, 8.0);
  // float e = extract_bits(c.y, 2.0, 7.0);

  int s = (c.y >= 127.5) ? 1 : 0;
  float e = shift_right(c.y - ((s == 1) ? 128.0 : 0.0), 2.0);
  float f = c.x + mask_last(c.y, 2.0) * 256.0;
  // return float(s);

  if(e < 0.5) {
    return ((s!=0)?-1.0:1.0) * exp2(-14.0) * (f/exp2(10.0));
  } else if (int(e) == 0x1F) {
    float NaN = 0.0;
    float Inf = 0.0;
    return (f==0.0)?(NaN):(((s!=0)?-1.0:1.0)*Inf);
  }

  return ((s!=0)?-1.0:1.0) * exp2(e-15.0) * (1.0+(f/exp2(10.0)));
}

#endif

// RGBA16 textures
vec4 GLSLBinReader_texelFetch2D(sampler2D texture, ivec2 textureSize, ivec2 address) {
  return fetchTexel(texture, textureSize, address);
}

struct GLSLBinReader {
  ivec2 textureSize; 
  ivec4 region;
  ivec2 start; /* the base address from which we base the offsets */
  int offset; /* how far we have read into the buffer . Note: value is in channels. so 4 == 1 pixel.*/
  vec4 buffer; 
  ivec2 bufferaddress;
  int bpc; // bits per channel. (e.g. 8, 16, 32)
};

void GLSLBinReader_init(inout GLSLBinReader reader, ivec2 textureSize, ivec4 region, ivec2 start, int bpc) {
  reader.textureSize = textureSize;
  reader.region = region;
  reader.start = start;
#ifdef DECODE_16BIT_FLOAT_FROM_8BIT_INT
  reader.start = ivec2(start.x * 2, start.y);
#else
  reader.start = start;
#endif
  reader.bpc = bpc;
  reader.bufferaddress = ivec2(-1, -1);
}

void GLSLBinReader_init(inout GLSLBinReader reader, ivec2 textureSize, int bpc) {
  reader.textureSize = textureSize;
  reader.region = ivec4(0, 0, textureSize.x, textureSize.y);
  reader.start = ivec2(0,0);
  reader.bpc = bpc;
  reader.bufferaddress = ivec2(-1, -1);
}


ivec2 GLSLBinReader_getAddress(in GLSLBinReader reader, int offset) {
#ifdef DECODE_16BIT_FLOAT_FROM_8BIT_INT
  ivec2 address = ivec2(reader.start.x + (offset/2), reader.start.y);
#else
  ivec2 address = ivec2(reader.start.x + (offset/4), reader.start.y);
#endif
  address.y += address.x / reader.region.z;
  address.x = imod(address.x, reader.region.z);
  return address;
}


float GLSLBinReader_readFloat(inout GLSLBinReader reader, sampler2D texture, int offset) {

  ivec2 address = GLSLBinReader_getAddress(reader, offset);

  if(address != reader.bufferaddress){
    reader.buffer = GLSLBinReader_texelFetch2D(texture, reader.textureSize, reader.region.xy + address);
    reader.bufferaddress = address;
  }

#ifdef DECODE_16BIT_FLOAT_FROM_8BIT_INT

  int swizelIndex = imod(offset, 2);
  if(swizelIndex == 0)
    return decode16BitFloatFrom2xUInt8_IEEE(reader.buffer.xy * 255.0);
  return decode16BitFloatFrom2xUInt8_IEEE(reader.buffer.zw * 255.0);

#else

  int swizelIndex = imod(offset, 4);
  if(swizelIndex == 0)
    return reader.buffer.x;
  if(swizelIndex == 1)
    return reader.buffer.y;
  if(swizelIndex == 2)
    return reader.buffer.z;
  return reader.buffer.w;
  
#endif
}


int GLSLBinReader_readInt(inout GLSLBinReader reader, sampler2D texture, int offset) {
  if(reader.bpc == 8)
    return int(GLSLBinReader_readFloat(reader, texture, offset) * 255.0);
  else {
    float flt = GLSLBinReader_readFloat(reader, texture, offset);
    return int(flt);
  }
}

int GLSLBinReader_readUInt(inout GLSLBinReader reader, sampler2D texture, int offset) {
  if(reader.bpc == 8)
    return int(GLSLBinReader_readFloat(reader, texture, offset) * 255.0);
  else {
    float flt = GLSLBinReader_readFloat(reader, texture, offset);
    if (flt < 0.0) {
      return int(2048.0 - flt);
    }
    else {
      return int(flt);
    }
  }
}

vec4 GLSLBinReader_readVec4(inout GLSLBinReader reader, sampler2D texture, int offset) {
  ivec2 address = GLSLBinReader_getAddress(reader, offset);
  return GLSLBinReader_texelFetch2D(texture, reader.textureSize, reader.region.xy + address);
}


vec3 GLSLBinReader_readVec3(inout GLSLBinReader reader, sampler2D texture, int offset) {
  return GLSLBinReader_readVec4(reader, texture, offset).rgb;
}

vec2 GLSLBinReader_readVec2(inout GLSLBinReader reader, sampler2D texture, int offset) {
  return vec2(
    GLSLBinReader_readFloat(reader, texture, offset),
    GLSLBinReader_readFloat(reader, texture, offset+1)
  );
}



float GLSLBinReader_readFloat(inout GLSLBinReader reader, sampler2D texture) {
  float result = GLSLBinReader_readFloat( reader,  texture, reader.offset);
  reader.offset++;
  return result;
}

int GLSLBinReader_readInt(inout GLSLBinReader reader, sampler2D texture) {
  if(reader.bpc == 8)
    return int(GLSLBinReader_readFloat(reader, texture) * 255.0);
  else
    return int(GLSLBinReader_readFloat(reader, texture));
}

int GLSLBinReader_readUInt(inout GLSLBinReader reader, sampler2D texture) {
  if(reader.bpc == 8)
    return int(GLSLBinReader_readFloat(reader, texture) * 255.0);
  else {
    float flt = GLSLBinReader_readFloat(reader, texture);
    if (flt < 0.0) {
      return int(2048.0 - flt);
    }
    else {
      return int(flt);
    }
  }
}

int GLSLBinReader_readUIntFrom2xUFloat16(inout GLSLBinReader reader, sampler2D texture) {
  int partA = GLSLBinReader_readUInt(reader, texture);
  int partB = GLSLBinReader_readUInt(reader, texture);
  
#ifdef INTS_PACKED_AS_2FLOAT16
  // Changed on version 0.0.28
  return partA + (partB * 4096);
#else
  return partA + (partB * 256);
#endif
}

vec4 GLSLBinReader_readVec4(inout GLSLBinReader reader, sampler2D texture) {
  vec4 result = GLSLBinReader_readVec4( reader, texture, reader.offset);
  reader.offset += 4;
  return result;
}


vec3 GLSLBinReader_readVec3(inout GLSLBinReader reader, sampler2D texture) {
  return GLSLBinReader_readVec4(reader, texture).rgb;
}

vec2 GLSLBinReader_readVec2(inout GLSLBinReader reader, sampler2D texture) {
  return vec2(
    GLSLBinReader_readFloat(reader, texture),
    GLSLBinReader_readFloat(reader, texture)
  );
}



`
  );

  zeaEngine.shaderLibrary.setShaderModule(
    'GLSLMath.glsl',
    `

<%include file="stack-gl/transpose.glsl"/>

  ////////////////////////////////////////
  
  struct Xfo2d {
    vec2 tr;
    float rot;
    vec2 sc;
  };

  vec2 rotateVec2(float rot, vec2 vec){
    float cosa = cos(rot);
    float sina = sin(rot);
    return vec2(vec.x * cosa - vec.y * sina, vec.x * sina + vec.y * cosa);
  }

  vec2 Xfo2D_transformVec2(Xfo2d xfo2d, vec2 pos){
    return xfo2d.tr + rotateVec2(xfo2d.rot, pos * xfo2d.sc);
  }

  ////////////////////////////////////////


  vec4 quat_fromAxisAndAngle(vec3 axis, float angle) {
    float halfAngle = angle / 2.0;
    vec3 vec = axis* sin(halfAngle);
    return vec4(vec.x, vec.y, vec.z, cos(halfAngle));
  }

  vec4 quat_conjugate(vec4 quat) {
    return vec4(-quat.x, -quat.y, -quat.z, quat.w);
  }

  vec4 quat_multiply(vec4 lhs, vec4 rhs) {
    float ax = lhs.x;
    float ay = lhs.y;
    float az = lhs.z;
    float aw = lhs.w;
    float bx = rhs.x;
    float by = rhs.y;
    float bz = rhs.z;
    float bw = rhs.w;
    return vec4(
      ax * bw + aw * bx + ay * bz - az * by,
      ay * bw + aw * by + az * bx - ax * bz,
      az * bw + aw * bz + ax * by - ay * bx,
      aw * bw - ax * bx - ay * by - az * bz
    );
  }

  vec3 quat_rotateVec3(vec4 quat, vec3 rhs) {
    vec4 vq = vec4(rhs.x, rhs.y, rhs.z, 0.0);
    vec4 pq = quat_multiply(quat_multiply(quat, vq), quat_conjugate(quat));
    return vec3(pq.x, pq.y, pq.z);
  }


  mat4 tr_toMat4(vec3 tr) {
    // Note: GLSL matrices are transposed compared to the matrices in ZeaEngine
    vec4 col0 = vec4(1.0, 0.0, 0.0, 0.0);
    vec4 col1 = vec4(0.0, 1.0, 0.0, 0.0);
    vec4 col2 = vec4(0.0, 0.0, 1.0, 0.0);
    vec4 col3 = vec4(tr, 1.0);
    return mat4(col0, col1, col2, col3);
  }

  mat4 quat_toMat4(vec4 quat) {

    float x2 = quat.x + quat.x;
    float y2 = quat.y + quat.y;
    float z2 = quat.z + quat.z;

    float xx = quat.x * x2;
    float yx = quat.y * x2;
    float yy = quat.y * y2;
    float zx = quat.z * x2;
    float zy = quat.z * y2;
    float zz = quat.z * z2;
    float wx = quat.w * x2;
    float wy = quat.w * y2;
    float wz = quat.w * z2;


    // Note: GLSL matrices are transposed compared to the matrices in ZeaEngine
    vec4 col0 = vec4(
      1.0 - yy - zz,
      yx - wz,
      zx + wy,
      0.0);

    vec4 col1 = vec4(
      yx + wz,
      1.0 - xx - zz,
      zy - wx,
      0.0);

    vec4 col2 = vec4(
      zx - wy,
      zy + wx,
      1.0 - xx - yy,
      0.0);

    vec4 col3 = vec4(
      0.0,
      0.0,
      0.0,
      1.0);

    // return mat4(col0, col1, col2, col3);
    return transpose(mat4(col0, col1, col2, col3));
  }

  mat4 sc_toMat4(vec3 sc) {
    // Note: GLSL matrices are transposed compared to the matrices in ZeaEngine
    return mat4(
      sc.x, 0.0,  0.0,  0.0,
      0.0,  sc.y, 0.0,  0.0,
      0.0,  0.0,  sc.z, 0.0,
      0.0,  0.0,  0.0,  1.0);
  }

  struct Xfo {
    vec3 tr;
    vec4 ori;
    vec3 sc;
  };

  Xfo xfo_multiply(Xfo xfo, Xfo other){
    return Xfo(
      xfo.tr + quat_rotateVec3(xfo.ori, xfo.sc * other.tr),
      quat_multiply(xfo.ori, other.ori),
      xfo.sc * other.sc
    );
  }

  mat4 xfo_toMat4(Xfo xfo){
    mat4 sc_mat4 = sc_toMat4(xfo.sc);
    mat4 ori_mat4  = quat_toMat4(xfo.ori);
    mat4 tr_mat4  = tr_toMat4(xfo.tr);
    mat4 result = tr_mat4 * ori_mat4 * sc_mat4;
    return result;
  }

`
  );

  zeaEngine.shaderLibrary.setShaderModule(
    'GLSLCADCurves.glsl',
    `

  // http://cadexchanger.com/download/sdk/doc/dev/html/sdk_data_model_geometry_topology.html#sdk_data_model_geometry_curves



// http://cadexchanger.com/download/sdk/doc/dev/html/sdk_data_model_geometry_topology.html#sdk_data_model_geometry_surfaces


vec2 loadVec2(inout GLSLBinReader reader, sampler2D texture) {
  return vec2(GLSLBinReader_readFloat(reader, texture),  GLSLBinReader_readFloat(reader, texture));
}

float mapDomain1d(vec2 domain, float param) {
  float u = domain.x + param * ( domain.y - domain.x );
  return u;
}

/////////////////////////////////////////
// Line

PosNorm calcLinePoint(float param, inout GLSLBinReader reader, sampler2D texture) {
  vec2 domain = loadVec2(reader, texture);
  float u = mapDomain1d( domain, param );
  vec3 pos = vec3(u, 0.0, 0.0);
  vec3 norm = vec3(1.0, 0.0, 0.0);
  return PosNorm(pos, norm, CURVE_TYPE_LINE);
}


/////////////////////////////////////////
// Circle

PosNorm calcCirclePoint(float param, inout GLSLBinReader reader, sampler2D texture) {
  vec2 domain = loadVec2(reader, texture);
  float radius = GLSLBinReader_readFloat(reader, texture);

  float u = mapDomain1d( domain, param );
  vec3 pos = vec3(cos(u) * radius, sin(u) * radius, 0.0);
  vec3 norm = vec3(-sin(u), cos(u), 0.0);
  return PosNorm(pos, norm, CURVE_TYPE_CIRCLE);
}



/////////////////////////////////////////
// Elipse3d
// An ellipse is a periodic curve parametrized as follows: C(t) = P + X * R_major * cos(t) + Y * R_minor * sin(t), where

// P is an origin point,
// X and Y are directions,
// R_major and R_minor are major and minor radii,
// t belongs to [0, 2 * PI].
// Note that major radius is always along the X-axis and minor radius - along the Y-axis, and that with t=0 the point corresponds to a major radius.


PosNorm calcElipsePoint(float param, inout GLSLBinReader reader, sampler2D texture) {
  vec2 domain = loadVec2(reader, texture);
  float u = mapDomain1d( domain, param );
  float minorRadius = GLSLBinReader_readFloat(reader, texture);
  float majorRadius = GLSLBinReader_readFloat(reader, texture);
  vec3 pos = vec3(cos(u) * majorRadius, sin(u) * minorRadius, 0.0);
  vec3 norm = normalize(vec3(-sin(u) * majorRadius, cos(u) * minorRadius, 0.0)); // TODO: fix this broken line.

  // pos = vec3(float(minorRadius));

  return PosNorm(pos, norm, CURVE_TYPE_ELIPSE);
}

`
  );

  zeaEngine.shaderLibrary.setShaderModule(
    'GLSLCADSimpleSurfaces.glsl',
    `

  // http://cadexchanger.com/download/sdk/doc/dev/html/sdk_data_model_geometry_topology.html#sdk_data_model_geometry_surfaces


/////////////////////////////////////////
// Plane
// A plane is parametrized as follows: S(u,v) = P + u * dX + v * dY, where

// P is an origin point,
// dX and dY are directions (unit vectors) of X and Y axes respectively,
// u, v belongs to (-Infinity, +Infinity).

PosNorm calcPlaneSurfacePoint(vec2 params, inout GLSLBinReader reader, sampler2D texture) {
  box2 domain = loadBox2(reader, texture);
  vec2 uv = mapDomain(domain, params);

  vec3 pos = vec3(uv.x, uv.y, 0.0);
  vec3 normal = vec3(0.0, 0.0, 1.0);

  return PosNorm(pos, normal, SURFACE_TYPE_PLANE);
}

/////////////////////////////////////////
// Poly Plane
// A plane is parametrized as follows: S(u,v) = P + u * dX + v * dY, where

// P is an origin point,
// dX and dY are directions (unit vectors) of X and Y axes respectively,
// u, v belongs to (-Infinity, +Infinity).

PosNorm calcPolyPlaneSurfacePoint(vec2 params, inout GLSLBinReader reader, sampler2D texture) {
  // Domain does not need to be mapped in this case.
  vec2 uv = params;
  vec2 p0 = GLSLBinReader_readVec2(reader, texture);
  vec2 p1 = GLSLBinReader_readVec2(reader, texture);
  vec2 p2 = GLSLBinReader_readVec2(reader, texture);
  vec2 p3 = GLSLBinReader_readVec2(reader, texture);

  vec2 pos = mix(mix(p0, p1, uv.x), mix(p3, p2, uv.x), uv.y);
  vec3 normal = vec3(0.0, 0.0, 1.0);

  return PosNorm(vec3(pos, 0.0), normal, SURFACE_TYPE_POLY_PLANE);
}


/////////////////////////////////////////
// Fan
// A plane is parametrized as follows: S(u,v) = P + u * dX + v * dY, where

// P is an origin point,
// dX and dY are directions (unit vectors) of X and Y axes respectively,
// u, v belongs to (-Infinity, +Infinity).

PosNorm calcFanSurfacePoint(vec2 params, inout GLSLBinReader reader, sampler2D texture) {
  // Domain does not need to be mapped in this case.
  vec2 uv = params;
  // Skip forward 2 values for each vertex.
  reader.offset += int(2.0 * floor(v_vertexCoord.x));
  vec2 pos = GLSLBinReader_readVec2(reader, texture);
  vec3 normal = vec3(0.0, 0.0, 1.0);

  return PosNorm(vec3(pos, 0.0), normal, SURFACE_TYPE_FAN);
}



/////////////////////////////////////////
// Cone
// A conical surface is parametrized as follows: S(u,v) = P + r * cos(u) * Dx + r * sin(u) * Dy + v * cos(φ) * Dz, where

// P is an origin point,
// Dx, Dy and Dz are directions (unit vectors) of X, Y and Z axes respectively,
// φ - semi-angle, i.e. an angle between Dz and any generatrix,
// r = R + v * sin(φ), i.e. a radius of a circle at respective parameter v,
// u belongs to [0, 2 * PI],
// v belongs to (-infinity, +infinity).
// U-parameter is an angle along the circle at a given parameter V and V-parameter is a length along the cone. Thus, U-isolines are lines and V-isoline are circles.

// V-isoline at V=0 is a circle of radius R in the plane defined by an axis placement.

// Conical surface contains both halfs of mathematical cone.

// Conical surface is U-periodical with period 2 * PI. At a cone apex, r equals 0, hence V-parameter of an apex equals -R / sin(φ)


PosNorm calcConeSurfacePoint(vec2 params, inout GLSLBinReader reader, sampler2D texture) {
  box2 domain = loadBox2(reader, texture);
  float r = GLSLBinReader_readFloat(reader, texture);
  float semiAngle = GLSLBinReader_readFloat(reader, texture);
  vec2 uv = mapDomain(domain, params);

  float u = uv.x;
  float v = uv.y;
  float r_at_v = r + v * sin(semiAngle);
  vec3 pos = vec3(r_at_v * cos(u), r_at_v * sin(u), v * cos(semiAngle));
  vec3 normal = normalize(vec3(cos(u)*cos(semiAngle), sin(u)*cos(semiAngle), -sin(semiAngle)));
  return PosNorm(pos, normal, SURFACE_TYPE_CONE);
}


/////////////////////////////////////////
// Cylinder
// A cylindrical surface is parametrized as follows: S(u,v) = P + R * cos(u) * dX + R * sin(u) * dY + v * dZ, where

// P is an origin point,
// dX, dY and dZ are directions (unit vectors) of X, Y and Z axes respectively,
// R is a radius,
// u belongs to [0, 2 * PI],
// v belongs to (-infinity, +infinity).


PosNorm calcCylinderSurfacePoint(vec2 params, inout GLSLBinReader reader, sampler2D texture) {
  box2 domain = loadBox2(reader, texture);
  float r = GLSLBinReader_readFloat(reader, texture);
  vec2 uv = mapDomain(domain, params);

  vec3 normal = vec3(cos(uv.x), sin(uv.x), 0.0);
  vec3 pos = r * normal + vec3(0.0, 0.0, uv.y);

  return PosNorm(pos, normal, SURFACE_TYPE_CYLINDER);
}


/////////////////////////////////////////
// Sphere
// A spherical surface is parametrized as follows: S(u,v) = P + R * cos(v) * (cos(u) * Dx + sin(u) * Dy) + R * sin(v) * Dz, where

// P is an origin point,
// Dx, Dy and Dz are directions (unit vectors) of X, Y and Z axes respectively,
// R is a radius,
// u belongs to [0, 2 * PI],
// v belongs to [-PI/2, +PI/2].
// U-parameter is an angle of rotation around the Dz axis counterclockwise (i.e. similar to longitude on the Earth), and V-parameter is an angle between plane defined by an axis placement and line from P to a point on a sphere (i.e. latitude). Thus, U-isolines are semi-circles and V-isoline are circles.

// V-isoline at V=0 is a circle of radius R in the plane defined by an axis placement. U-isoline at U=0 corresponds to a semi-circle from south to north pole.

// Spherical surface is U-periodical with period 2 * PI.

// If a face lies on a full spherical surface its boundary wire will contain two a degenerated edges corresponding to the south and north poles (V equals -PI/2 and PI/2 respectively), and a seam-edge.


PosNorm calcSphereSurfacePoint(vec2 params, inout GLSLBinReader reader, sampler2D texture) {
  box2 domain = loadBox2(reader, texture);
  vec2 uv = mapDomain(domain, params);

  float r = GLSLBinReader_readFloat(reader, texture);

  float u = uv.x;
  float v = uv.y;
  vec3 normal = vec3(cos(v) * cos(u), cos(v) * sin(u), sin(v));
  vec3 pos = r * normal;

  return PosNorm(pos, normal, SURFACE_TYPE_SPHERE);
}

/////////////////////////////////////////
// Torus

// A toroidal surface is parametrized as follows: S(u,v) = (R1 + R2 * cos(v)) * (cos(u) * Dx + sin(u) * Dy) + R2 * sin(v) * Dz, where

// R1 is a major radius,
// R2 is a minor radius,
// u belongs to [0, 2 * PI],
// v belongs to [0, 2 * PI],
// U-parameter is an angle when rotating around the Dz axis counterclockwise, and V-parameter is an angle in circular section at a given parameter U. Thus, U-isolines circles lying in the plane containing Z axis and V-isolines are circles in the planes perpendicular to Z axis.

// V-isoline at V=0 is a circle of radius (R1 + R2) in the plane defined by an axis placement. U-isoline at U=0 is a circle of radius R2 in the plane containing Z and X axes.

// Radii R1 and R2 must be positive. If R2 > R1 then toroidal surface will be self-intersecting.

// Toroidal surface is both U- and V-periodical with periods 2 * PI.

// If a face lies on a full toroidal surface its boundary wire will contain two seam-edges, corresponding to U=0 and U=2*PI, and V=0 and V=2*PI respectively.


PosNorm calcTorusSurfacePoint(vec2 params, inout GLSLBinReader reader, sampler2D texture) {
  box2 domain = loadBox2(reader, texture);
  vec2 uv = mapDomain(domain, params);

  float majorRadius = GLSLBinReader_readFloat(reader, texture);
  float minorRadius = GLSLBinReader_readFloat(reader, texture);
  float u = uv.x;
  float v = uv.y;
  vec3 pos = (majorRadius + minorRadius * cos(v)) * vec3(cos(u), sin(u), 0.0) + vec3(0.0, 0.0, minorRadius * sin(v));

  vec3 normal = vec3(cos(v) * cos(u), cos(v) * sin(u), sin(v));
  // vec3 pos = majorRadius * normal;

  return PosNorm(pos, normal, SURFACE_TYPE_TORUS);
}

`
  );

  zeaEngine.shaderLibrary.setShaderModule(
    'GLSLCADCompoundSurfaces.glsl',
    `

/////////////////////////////////////////
// LinearExtrusion

PosNorm calcLinearExtrusionSurfacePoint(vec2 params, inout GLSLBinReader reader, sampler2D texture) {
  box2 domain = loadBox2(reader, texture);
  
  int curve_index = GLSLBinReader_readUIntFrom2xUFloat16(reader, texture);

  vec3 curve_tr = vec3(
    GLSLBinReader_readFloat(reader, texture),
    GLSLBinReader_readFloat(reader, texture),
    GLSLBinReader_readFloat(reader, texture)
  );
  vec4 curve_ori = vec4(
    GLSLBinReader_readFloat(reader, texture),
    GLSLBinReader_readFloat(reader, texture),
    GLSLBinReader_readFloat(reader, texture),
    GLSLBinReader_readFloat(reader, texture)
    );
  vec3 curve_sc = vec3(
    GLSLBinReader_readFloat(reader, texture),
    GLSLBinReader_readFloat(reader, texture),
    GLSLBinReader_readFloat(reader, texture)
  );
  vec2 uv = mapDomain(domain, params);

  PosNorm curveResult = evalCADCurve3d(curve_index, uv.x);
  
  vec3 pos = quat_rotateVec3(curve_ori, curveResult.pos * curve_sc) + curve_tr;
  pos.z += uv.y;

  vec3 normal = normalize(cross(vec3(0.0, 0.0, 1.0), quat_rotateVec3(curve_ori, curveResult.normal)));

  return PosNorm(pos, normal, SURFACE_TYPE_LINEAR_EXTRUSION);
}


/////////////////////////////////////////
// Revolution
PosNorm calcRevolutionSurfacePoint(vec2 params, inout GLSLBinReader reader, sampler2D texture, bool flipDomain) {
  box2 domain = loadBox2(reader, texture);

  int curve_index = GLSLBinReader_readUIntFrom2xUFloat16(reader, texture);

  vec3 curve_tr = vec3(
    GLSLBinReader_readFloat(reader, texture),
    GLSLBinReader_readFloat(reader, texture),
    GLSLBinReader_readFloat(reader, texture)
  );
  vec4 curve_ori = vec4(
    GLSLBinReader_readFloat(reader, texture),
    GLSLBinReader_readFloat(reader, texture),
    GLSLBinReader_readFloat(reader, texture),
    GLSLBinReader_readFloat(reader, texture)
    );
  vec3 curve_sc = vec3(
    GLSLBinReader_readFloat(reader, texture),
    GLSLBinReader_readFloat(reader, texture),
    GLSLBinReader_readFloat(reader, texture)
  );
  vec2 uv = mapDomain(domain, params);

  vec3 axis = vec3(0.0, 0.0, 1.0);
  PosNorm curveResult;
  vec4 rev;
  if (flipDomain) {
    curveResult = evalCADCurve3d(curve_index, uv.x);
    rev = quat_fromAxisAndAngle(axis, uv.y);
  } else {
    curveResult = evalCADCurve3d(curve_index, uv.y);
    rev = quat_fromAxisAndAngle(axis, uv.x);
  }

  vec3 p_t = quat_rotateVec3(curve_ori, curveResult.pos * curve_sc) + curve_tr;
  vec3 pos = quat_rotateVec3(rev, p_t);

  vec3 p_n = quat_rotateVec3(rev, quat_rotateVec3(curve_ori, curveResult.normal));
  
  vec3 tangent;
  if (abs(1.0 - dot(p_n, axis)) > 0.001) {
    tangent = cross(p_n, axis);
  } else {
    tangent = cross(pos, axis);
  }
  // TODO: Find a conclusive test file that demonstrates this as correct.
  // I think it is the master cylinder sample.
  // vec3 normal = normalize(cross(p_n, tangent));
  vec3 normal = normalize(cross(tangent, p_n));

  // vec3 pos;
  // vec3 normal;
  // pos.x = float(partA);
  // pos.y = float(partB);
  // pos.z = float(curve_index);
  return PosNorm(pos, normal, SURFACE_TYPE_REVOLUTION);
}


/////////////////////////////////////////
// OffsetSurface

PosNorm calcOffsetSurfaceSurfacePoint(vec2 params, inout GLSLBinReader reader, sampler2D texture) {
  box2 domain = loadBox2(reader, texture);
  int surfaceId = GLSLBinReader_readUInt(reader, texture);
  float offset = GLSLBinReader_readFloat(reader, texture);
  vec2 uv = mapDomain(domain, params);

/*
  GLSLBinReader subSurfaceReader = reader;
  subSurfaceReader.start = 
  GLSLBinReader_init(reader, surfaceDataTextureSize, region, start, 32);

  vec3 p = calcCurvePoint(uv.x);
  vec3 pos = p + dir * (dist * uv.y);
  
*/
  vec3 pos;
  vec3 normal;
  return PosNorm(pos, normal, SURFACE_TYPE_OFFSET_SURFACE);
}



`
  );

  zeaEngine.shaderLibrary.setShaderModule(
    'GLSLNURBS.glsl',
    `

#define MAX_KNOTS 256
// Note: The BRP motorcycle features many surfaces of degree 15.
#define MAX_DEGREE 16

float kp(int index, inout GLSLBinReader r, sampler2D t, int offset) {
  return GLSLBinReader_readFloat(r, t, offset+index);
}

#ifdef EXPORT_KNOTS_AS_DELTAS

int findSpan(float u, in int degree, in int numKnots, int kpOff, inout GLSLBinReader r, sampler2D t, out highp float knots[MAX_DEGREE*2+1]) {
  
  float nextKnot = kp(0, r, t, kpOff);
  float knot = nextKnot;

  int span = 1;
  int n = numKnots - degree - 1;
  // Linear Search...
  for (; span<n; span++){
    nextKnot += kp(span, r, t, kpOff);
    if (span > degree && u < nextKnot){
      span--;
      break;
    }
    knot = nextKnot;
  }
  if (span == n) {
    span--;
  }


  //Calculate knot values
  knots[degree] = knot;
  float left = knot;
  float right = knot; 
  for (int i=1; i<=degree; i++) {
    left -= kp(span-i+1, r, t, kpOff);
    right += kp(span+i, r, t, kpOff);
    knots[degree-i] = left;
    knots[degree+i] = right;
  }

  return span;
}

void calcBasisValues(in float u, in int degree, in highp float knots[MAX_DEGREE*2+1], out highp float basisValues[MAX_DEGREE+1], out highp float bvD[MAX_DEGREE+1]) {
  
  highp vec2 savedTemp;
  highp float left[MAX_DEGREE+1];
  highp float right[MAX_DEGREE+1];

  //Basis[0] is always 1.0
  basisValues[0] = 1.0;
  // Calculate basis values
  for (int i=1; i<=degree; i++) {
    left[i] = u - knots[degree+1-i];
    right[i] = knots[degree+i] - u;

    savedTemp.x = 0.0;
    for (int j=0; j<i; j++) {
      float rv = right[j+1];
      float lv = left[i-j];
      savedTemp.y = basisValues[j] / (rv + lv);
      basisValues[j] = savedTemp.x + rv * savedTemp.y;
      savedTemp.x = lv * savedTemp.y;
    }
    basisValues[i] = savedTemp.x;

    // Calculate N' if on second to last iteration
    if (i == degree-1 || degree == 1) {
      savedTemp.x = 0.0;
      //Loop through all basis values
      for (int j=0; j<degree; j++) {
        // Calculate a temp variable
        int jr_z = j + 1;
        //Calculate right side
        float kp_0 = knots[jr_z + degree];
        float kp_1 = knots[jr_z];
        savedTemp.y = (float(degree) * basisValues[j]) / (kp_0 - kp_1);
        // Calculate derivative value
        bvD[j] = savedTemp.x - savedTemp.y;
        // Swap right side to left
        savedTemp.x = savedTemp.y;
      }
      //Save the last der-basis
      bvD[degree] = savedTemp.x;
    }
  }
}

#else

// http://read.pudn.com/downloads134/sourcecode/math/569665/nurbsR2006b/findspan.c__.htm
// Note: I have found the 'early outs' in the Three code to be more correct
// https://github.com/mrdoob/three.js/blob/b8d8a8625465bd634aa68e5846354d69f34d2ff5/examples/js/curves/NURBSUtils.js
int findSpan(float u, in int degree, in int numKnots, int kpOff, inout GLSLBinReader r, sampler2D t, bool periodic) {
  
  // early outs
  int n = numKnots - degree - 1;
  if(u >= kp(n, r, t, kpOff))
    return n-1;
  if(u <= kp(degree, r, t, kpOff)) {
    return degree;
  }

  // Linear Search...
#ifdef ENABLE_ES3
  int i = degree; 
  for (; i<n; i++){
#else
  // Note: loop values must be constant.
  // Loops start at 1 because that is the minimum degree for a curve.
  for (int i = 1; i<MAX_KNOTS; i++){
    if(i >= degree && i < numKnots-1){
#endif
    if (u < kp(i+1, r, t, kpOff)){
      return i;
    }
#ifndef ENABLE_ES3
  }
#endif
  }

  return i;
}


void calcBasisValues(in float u, in int span, int degree, int kpOff, int numKnots, inout GLSLBinReader r, sampler2D t, out highp float basisValues[MAX_DEGREE+1], out highp float bvD[MAX_DEGREE+1]) {
  
  highp vec2 savedTemp;
  highp float left[MAX_DEGREE+1];
  highp float right[MAX_DEGREE+1];

  // Basis[0] is always 1.0
  basisValues[0] = 1.0;
  // Calculate basis values
#ifdef ENABLE_ES3
  for (int i=1; i<=degree; i++) {
#else
  for (int i=1; i<MAX_DEGREE; i++) {
    if(i > degree) // i<=degree
      break;
#endif
    left[i] = u - kp(span+1-i, r, t, kpOff);
    right[i] = kp(span+i, r, t, kpOff) - u;

    savedTemp.x = 0.0;
#ifdef ENABLE_ES3
    for (int j=0; j<i; j++) {
#else
    for (int j=0; j<MAX_DEGREE; j++) {
      if(j >= i) // j < i
        break;
#endif
      float rv = right[j+1];
      float lv = left[i-j];
      savedTemp.y = basisValues[j] / (rv + lv);
      basisValues[j] = savedTemp.x + rv * savedTemp.y;
      savedTemp.x = lv * savedTemp.y;
    }
    basisValues[i] = savedTemp.x;
    
    // Calculate N' if on second to last iteration
    if (i == degree-1 || degree == 1) {
      savedTemp.x = 0.0;
      // Loop through all basis values
#ifdef ENABLE_ES3
      for (int j=0; j<degree; j++) {
#else
      for (int j=0; j<MAX_DEGREE; j++) {
        if(j >= degree) // j < degree
          break;
#endif
        // Calculate a temp variable
        int jr_z = span - degree + j + 1;
        // Calculate right side
        float kp_0 = kp(jr_z + degree, r, t, kpOff);
        float kp_1 = kp(jr_z, r, t, kpOff);
        savedTemp.y = (float(degree) * basisValues[j]) / (kp_0 - kp_1);
        // Calculate derivative value
        bvD[j] = savedTemp.x - savedTemp.y;
        // Swap right side to left
        savedTemp.x = savedTemp.y;
      }
      // Save the last der-basis
#ifdef ENABLE_ES3
      bvD[degree] = savedTemp.x;
#else
      if(degree == 1)
        bvD[1] = savedTemp.x;
      else if(degree == 2)
        bvD[2] = savedTemp.x;
      else if(degree == 3)
        bvD[3] = savedTemp.x;
      else if(degree == 4)
        bvD[4] = savedTemp.x;
      else if(degree == 5)
        bvD[5] = savedTemp.x;
      else if(degree == 6)
        bvD[6] = savedTemp.x;
      else if(degree == 7)
        bvD[7] = savedTemp.x;
      else if(degree == 8)
        bvD[8] = savedTemp.x;
      else if(degree == 9)
        bvD[9] = savedTemp.x;
      else if(degree == 10)
        bvD[10] = savedTemp.x;
      else if(degree == 11)
        bvD[11] = savedTemp.x;
      else if(degree == 12)
        bvD[12] = savedTemp.x;
      else if(degree == 13)
        bvD[13] = savedTemp.x;
      else if(degree == 14)
        bvD[14] = savedTemp.x;
      else if(degree == 15)
        bvD[15] = savedTemp.x;
#endif
    }
  }
}


#endif

`
  );

  zeaEngine.shaderLibrary.setShaderModule(
    'GLSLNURBSCurves.glsl',
    `

struct NURBSCurveData {
  vec2 domain;
  bool periodic;
  int degree;
  int numCPs;
  int numKnots;

  int cpStart;
  int kpStart;
};

void loadNURBSCurve3dData(inout GLSLBinReader reader, sampler2D texture, out NURBSCurveData result) {

  result.domain.x = GLSLBinReader_readFloat(reader, texture);
  result.domain.y = GLSLBinReader_readFloat(reader, texture);
  result.degree = GLSLBinReader_readUInt(reader, texture);

  result.numCPs = GLSLBinReader_readUInt(reader, texture);
  result.numKnots = GLSLBinReader_readUInt(reader, texture);
  int flags = GLSLBinReader_readUInt(reader, texture);
  result.periodic = testFlag(flags, CURVE_FLAG_PERIODIC);

  result.cpStart = 2*4; // 2 RGBA pixels of data before the knot values start.
  result.kpStart = result.cpStart + (result.numCPs*4);
}

vec4 curve_cp3d(int u, inout GLSLBinReader r, NURBSCurveData d, sampler2D t) {
  int index = u * 4;
  return GLSLBinReader_readVec4(r, t, d.cpStart + index);
}

// https://github.com/akshatamohanty/wildcat-cad/blob/650e18d665ccde3dbc4c78029e35c38951581c92/Source/Geometry/Shaders/ns23_default_plM.fsh
// https://github.com/mrdoob/three.js/blob/6c7f000734f8579da37fb39e5c2e9e5e2dfb14f8/examples/js/curves/NURBSUtils.js

/*
  Calculate rational B-Spline curve point. See The NURBS Book, page 134, algorithm A4.3.
*/
PosNorm calcNURBSCurve3dPoint(float param, inout GLSLBinReader r, sampler2D t) {

  NURBSCurveData d;
  loadNURBSCurve3dData(r, t, d);

  float u = d.domain.x + param * ( d.domain.y - d.domain.x ); // linear mapping param->u
  //if(d.periodic)
  //    u = wrap(u, kp(0, r, t, d.kpStart), kp(d.numKnots-1, r, t, d.kpStart));
 
  float bv[MAX_DEGREE+1];
  float bvds[MAX_DEGREE+1];

#ifdef EXPORT_KNOTS_AS_DELTAS
  highp float knots[MAX_DEGREE*2+1];
  int span = findSpan(u, d.degree, d.numKnots, d.kpStart, r, t, knots);
  //return PosNorm(vec3(span, knots[d.degree], knots[d.degree+1]), vec3(1.0), CURVE_TYPE_NURBS_CURVE);
  //return PosNorm(vec3(knots[d.degree-1], knots[d.degree], knots[d.degree+1]), vec3(1.0), CURVE_TYPE_NURBS_CURVE);
  //return PosNorm(vec3(knots[d.degree+1], knots[d.degree+2], knots[d.degree+3]), vec3(1.0), CURVE_TYPE_NURBS_CURVE);

  calcBasisValues(u, d.degree, knots, bv, bvds);
  // return PosNorm(vec3(bv[0], bv[1], bv[2]), vec3(bv[3], bv[4], bv[5]), CURVE_TYPE_NURBS_CURVE);
#else
  int span = findSpan(u, d.degree, d.numKnots, d.kpStart, r, t, d.periodic);
  // return PosNorm(vec3(float(span)), vec3(1.0), CURVE_TYPE_NURBS_CURVE);
  // return PosNorm(vec3(kp(span-1, r, t, d.kpStart), kp(span-0, r, t, d.kpStart), kp(span+1, r, t, d.kpStart)), vec3(0.0), CURVE_TYPE_NURBS_CURVE);

  // Invalid knot vectors exist where all the values are identical.
  if (kp(span, r, t, d.kpStart) == kp(span+1, r, t, d.kpStart)) {
    for(int x=0; x <= d.degree; x++)
      bv[x] = 0.0;
    bv[d.degree] = 1.0;
  }
  else {
    calcBasisValues(u, span, d.degree, d.kpStart, d.numKnots, r, t, bv, bvds);
  }
  // return PosNorm(vec3(bv[0], bv[1], bv[2]), vec3(bv[3], bv[4], bv[5]), CURVE_TYPE_NURBS_CURVE);
#endif


  float w = 0.0;
  vec3 pos = vec3(0.0);
  vec3 tangent = vec3(0.0);

  int cv0 = (span - d.degree);
#ifdef ENABLE_ES3
  for(int x=0; x <= d.degree; x++) {
#else
  for(int x=0; x < MAX_DEGREE; x++) {
    if(x > d.degree) // x<=degree
      break;
#endif
    int index = cv0 + x;
    vec4 pt = curve_cp3d(index, r, d, t);

    if(d.degree < 3) {
      // Rhino style evaluation....
      highp float bvw = bv[x];
      pos += pt.xyz * bvw;
      w += pt.w * bvw;
    }
    else {
      // Tiny NURBS/CADEx style evaluation....
      highp float bvw = pt.w * bv[x];
      pos += pt.xyz * bvw;
      w += bvw;
    }

    tangent += pt.xyz * bvds[x];
  }

  pos /= w;


  // Calc tangent
  if(d.degree == 1){
    vec3 pt0 = curve_cp3d(cv0, r, d, t).xyz;
    vec3 pt1 = curve_cp3d(cv0+1, r, d, t).xyz;
    tangent = pt1 - pt0;
  }
  else {
    if (length(tangent) < 0.05) {

      float spanLerp = u - knots[span];
      float spanRange = knots[span+1] - knots[span];
      int cv = int(floor((spanLerp / spanRange) * float(d.degree-1)));

      vec3 pt0 = curve_cp3d(cv, r, d, t).xyz;
      vec3 pt1 = curve_cp3d(cv+1, r, d, t).xyz;
      tangent = pt1 - pt0;
    }
  }

  return PosNorm(pos, normalize(tangent), CURVE_TYPE_NURBS_CURVE);
}



`
  );

  zeaEngine.shaderLibrary.setShaderModule(
    'GLSLNURBSSurfaces.glsl',
    `

struct NURBSSurfaceData {
  box2 domain;
  bool periodicU;
  bool periodicV;
  int degreeU;
  int degreeV;
  int numCPsU;
  int numCPsV;
  int numKnotsU;
  int numKnotsV;

  int cpStart;
  int kpUStart;
  int kpVStart;
};

void loadNURBSSurfaceData(inout GLSLBinReader reader, sampler2D texture, out NURBSSurfaceData result) {

  result.domain.p0.x = GLSLBinReader_readFloat(reader, texture);
  result.domain.p0.y = GLSLBinReader_readFloat(reader, texture);
  result.domain.p1.x = GLSLBinReader_readFloat(reader, texture);

  result.domain.p1.y = GLSLBinReader_readFloat(reader, texture);
  result.degreeU = GLSLBinReader_readInt(reader, texture);
  if(result.degreeU > MAX_DEGREE)
    result.degreeU = MAX_DEGREE;
  result.degreeV = GLSLBinReader_readInt(reader, texture);
  if(result.degreeV > MAX_DEGREE)
    result.degreeV = MAX_DEGREE;
  result.numCPsU = GLSLBinReader_readInt(reader, texture);

  result.numCPsV = GLSLBinReader_readInt(reader, texture);
  result.numKnotsU = GLSLBinReader_readInt(reader, texture);
  result.numKnotsV = GLSLBinReader_readInt(reader, texture);
  int flags = GLSLBinReader_readInt(reader, texture);
  result.periodicU = testFlag(flags, SURFACE_FLAG_PERIODIC_U);
  result.periodicV = testFlag(flags, SURFACE_FLAG_PERIODIC_V);

  result.cpStart  = 3*4; // 3 RGBA pixels of data before the knot values start.
  result.kpUStart = result.cpStart + (result.numCPsU*result.numCPsV*4);
  result.kpVStart = result.kpUStart + result.numKnotsU;
}

vec4 surface_cp(int u, int v, inout GLSLBinReader r, NURBSSurfaceData d, sampler2D t) {
  int index = (u + (v * d.numCPsU)) * 4;
  return GLSLBinReader_readVec4(r, t, d.cpStart + index);
}

/*
  Calculate rational B-Spline surface point. See The NURBS Book, page 134, algorithm A4.3.
*/
PosNorm calcNURBSSurfacePoint(vec2 params, inout GLSLBinReader r, sampler2D t) {

  vec3 tmp;
  NURBSSurfaceData d;
  loadNURBSSurfaceData(r, t, d);

  // ///////////////////////////////////////
  // // vec3 cp_pos = vec3(params.x + float(d.degreeU), params.y + float(d.degreeV), 0.0 );
  // vec3 cp_pos = vec3(params.x + float(d.numCPsU), params.y + float(d.numCPsV), 0.0 );
  // return PosNorm(cp_pos, tmp);
  // ///////////////////////////////////////

  // ///////////////////////////////////////
  // int knot_x = int(params.x * float(d.numCPsU-1));
  // int knot_y = int(params.y * float(d.numCPsV-1));
  // vec4 cp_pos = surface_cp(knot_x, knot_y, r, d, t);
  // return PosNorm(cp_pos.xyz, tmp);
  // ///////////////////////////////////////

  vec2 uv = mapDomain(d.domain, params); // linear mapping params -> uv
  float u = uv.x;
  float v = uv.y;

  highp float basisValuesU[MAX_DEGREE+1];
  highp float basisValuesV[MAX_DEGREE+1];
  highp float bvdsU[MAX_DEGREE+1];
  highp float bvdsV[MAX_DEGREE+1];
  
#ifdef EXPORT_KNOTS_AS_DELTAS
  highp float knotsU[MAX_DEGREE*2+1];
  highp float knotsV[MAX_DEGREE*2+1];
  int spanU = findSpan(u, d.degreeU, d.numKnotsU, d.kpUStart, r, t, knotsU);
  int spanV = findSpan(v, d.degreeV, d.numKnotsV, d.kpVStart, r, t, knotsV);
  calcBasisValues(u, d.degreeU, knotsU, basisValuesU, bvdsU);
  calcBasisValues(v, d.degreeV, knotsV, basisValuesV, bvdsV);

#else
  int spanU = findSpan(u, d.degreeU, d.numKnotsU, d.kpUStart, r, t, d.periodicU);
  int spanV = findSpan(v, d.degreeV, d.numKnotsV, d.kpVStart, r, t, d.periodicV);

  calcBasisValues(u, spanU, d.degreeU, d.kpUStart, d.numKnotsU, r, t, basisValuesU, bvdsU);
  calcBasisValues(v, spanV, d.degreeV, d.kpVStart, d.numKnotsV, r, t, basisValuesV, bvdsV);
#endif

  // ///////////////////////////////////////
  // return PosNorm(vec3(knotsV[11], knotsV[12], knotsV[13]), tmp, SURFACE_TYPE_NURBS_SURFACE);
  // return PosNorm(vec3(knotsV[14], knotsV[15], knotsV[16]), tmp, SURFACE_TYPE_NURBS_SURFACE);
  // return PosNorm(vec3(knotsV[17], knotsV[18], knotsV[19]), tmp, SURFACE_TYPE_NURBS_SURFACE);
  // return PosNorm(vec3(basisValuesU[0], basisValuesU[1], basisValuesU[2]), tmp, SURFACE_TYPE_NURBS_SURFACE);
  // ///////////////////////////////////////

  ivec2 indices;
  highp float w = 0.0;
  highp vec3 pos = vec3(0.0);
  highp vec3 tangentU = vec3(0.0);
  highp vec3 tangentV = vec3(0.0);
  int cvU0 = (spanU - d.degreeU);
  int cvV0 = (spanV - d.degreeV);
#ifdef ENABLE_ES3
  for(int y=0; y <= d.degreeV; y++) {
#else
  for(int y=0; y < MAX_DEGREE; y++) {
     if(y > d.degreeV) // y<=degree
         break;
#endif
    indices.y = cvV0 + y;

#ifdef ENABLE_ES3
    for(int x=0; x <= d.degreeU; x++) {
#else
    for(int x=0; x < MAX_DEGREE; x++) {
      if(x > d.degreeU) // x<=degree
        break;
#endif
      indices.x = cvU0 + x;
      
      vec4 cv = surface_cp(indices.x, indices.y, r, d, t);
      vec3 pt = cv.xyz;
      float weight = cv.w;

      float bvU = basisValuesU[x];
      float bvV = basisValuesV[y];

// #define USE_RHNIO_EVALUATION_MATH 1
#ifdef USE_RHNIO_EVALUATION_MATH
      // Rhino style evaluation....
      float bvw = bvU * bvV;
      pos += pt * bvw;
      w += weight * bvw;
#else
      // Tiny NURBS/CADEx style evaluation....
      highp float bvw = weight * bvU * bvV;
      pos += pt * bvw;
      w += bvw;
#endif
        
      float bvdU = bvdsU[x];
      float bvdV = bvdsV[y];

      tangentU += pt * bvdU * bvV;
      tangentV += pt * bvU * bvdV;
    }
  }

  pos /= w;

  ///////////////////////////////////////////////////////
  // Calculate normal.
  float spanRangeU = knotsU[d.degreeU + 1] - knotsU[d.degreeU];
  float spanRangeV = knotsV[d.degreeV + 1] - knotsV[d.degreeV];
  float eqKnotRangeU = ( d.domain.p1.x - d.domain.p0.x ) / float(d.numKnotsU);
  float eqKnotRangeV = ( d.domain.p1.y - d.domain.p0.y ) / float(d.numKnotsV);
  
  
  if (spanRangeU / eqKnotRangeU < 0.01) { 
    // In some cases (COOLANT_INLET_PORT_01.ipt_faceWithBlackEdge.)
    // we have span segment which has close to zero delta, and 
    // so the normals are broken. We want to advace along the 
    // e.g. [0, 0, 0, 0.00001, 1, 3, 3, 3]
    // length of the span rather than when we have a pinched corner, 
    // where we move along the toher direction.
    // console.log(v, 'spanRangeU:', spanRangeU, ' eqKnotRangeU:', eqKnotRangeU, spanRangeU / eqKnotRangeU)

    int cvU = cvU0;
    if (v > d.domain.p1.y - 0.0001) {
      // If at the end then we grab the end of the pevious row.
      cvU = cvU0 + d.degreeU - 2;
    } else {
      // if the broken normal is at the start of the U range, then 
      // we will grab the next in the row. 
      cvU = cvU0 + 1;
    }

    float spanLerpV = (u - knotsV[d.degreeV]) / spanRangeV;
    int cvV = cvV0 + int(floor(spanLerpV * float(d.degreeV)));

    vec3 pt0 = surface_cp(cvU, cvV, r, d, t).xyz;
    vec3 pt1 = surface_cp(cvU+1, cvV, r, d, t).xyz;

    tangentU = pt1 - pt0;
  } else if (length(tangentU) < 0.001) {
    // Note: on values to big, we get false positives.
    // See: 2_SR00404681_1_RI510090.CATPart.zcad
    // long narrow nurbs surface above the tail light.
    // Reduced from 0.05 to 0.001 fixed it.

    // The derivative in the V direction is zero, 
    // so we calculate the linear derivative for the next control points along.
    
    int cvV;
    if (spanV > d.degreeV) {
      // If at the end then we grab the end of the pevious row.
      cvV = cvV0 + d.degreeV - 2;
    } else {
      // if the broken normal is at the start of the V range, then 
      // we will grab the next in the row. 
      cvV = cvV0 + 1;
    }
    
    float spanLerpU = (u - knotsU[d.degreeU]) / spanRangeU;
    int cvU = cvU0 + int(floor(spanLerpU * float(d.degreeU)));
    
    vec3 pt0 = surface_cp(cvU, cvV, r, d, t).xyz;
    vec3 pt1 = surface_cp(cvU+1, cvV, r, d, t).xyz;

    tangentU = pt1 - pt0;
  }

  if (spanRangeV / eqKnotRangeV < 0.01) {
    // In some cases (COOLANT_INLET_PORT_01.ipt_faceWithBlackEdge.)
    // we have span segment which has close to zero delta, and 
    // so the normals are broken. We want to advace along the 
    // e.g. [0, 0, 0, 0.00001, 1, 3, 3, 3]
    // length of the span rather than when we have a pinched corner, 
    // where we move along the toher direction.
    // console.log(v, 'spanRangeV:', spanRangeV, ' eqKnotRangeV:', eqKnotRangeV, spanRangeV / eqKnotRangeV)

    int cvV = cvV0;
    if (v > d.domain.p1.y - 0.0001) {
      // If at the end then we grab the end of the pevious row.
      cvV = cvV0 + d.degreeV - 2;
    } else {
      // if the broken normal is at the start of the V range, then 
      // we will grab the next in the row. 
      cvV = cvV0 + 1;
    }

    float spanLerpU = (u - knotsU[d.degreeU]) / spanRangeU;
    int cvU = cvU0 + int(floor(spanLerpU * float(d.degreeU)));

    vec3 pt0 = surface_cp(cvU, cvV, r, d, t).xyz;
    vec3 pt1 = surface_cp(cvU, cvV+1, r, d, t).xyz;

    tangentV = pt1 - pt0;
    
  } else if (length(tangentV) < 0.001) { 
    // Note: on values to big, we get false positives.
    // See: 2_SR00404681_1_RI510090.CATPart.zcad
    // long narrow nurbs surface above the tail light.
    // Reduced from 0.05 to 0.001 fixed it.

    // The derivative in the V direction is close to zero, 
    // so we calculate the linear derivative for the next control points along.

    int cvU = cvU0;
    if (v > d.domain.p1.y - 0.0001) {
      // If at the end then we grab the end of the pevious row.
      cvU = cvU0 + d.degreeU - 2;
    } else {
      // if the broken normal is at the start of the U range, then
      // we will grab the next in the row.
      cvU = cvU0 + 1;
    }

    float spanLerpV = (u - knotsV[d.degreeV]) / spanRangeV;
    int cvV = cvV0 + int(floor(spanLerpV * float(d.degreeV)));

    vec3 pt0 = surface_cp(cvU, cvV, r, d, t).xyz;
    vec3 pt1 = surface_cp(cvU, cvV+1, r, d, t).xyz;

    tangentV = pt1 - pt0;
  }

  // vec3 normal = tangentV;
  // Note: in the gear_box_final_asm.zcad. the nurbs surfaces were all flipped
  // This is only apparent in cut-away scenes, which the gearbox demo is.
  // vec3 normal = normalize(cross(tangentV, tangentU));
  vec3 normal = normalize(cross(tangentU, tangentV));

  return PosNorm(pos, normal, SURFACE_TYPE_NURBS_SURFACE);
}

`
  );

  /* eslint-disable camelcase */

  const GLEvaluateCADSurfaceShader_VERTEX_SHADER = zeaEngine.shaderLibrary.parseShader(
    'GLEvaluateCADSurfaceShader.vertexShader',
    `
precision highp float;

attribute vec3 positions;
instancedattribute float surfaceId;

uniform sampler2D surfaceAtlasLayoutTexture;
uniform ivec2 surfaceAtlasLayoutTextureSize;

uniform ivec2 surfacesAtlasTextureSize;

<%include file="GLSLUtils.glsl"/>
<%include file="GLSLBinReader.glsl"/>

/* VS Outputs */
varying float v_surfaceId;      // flat
varying vec3 v_geomDataCoords;  // flat
varying vec2 v_patchSize;       // flat
varying vec2 v_vertexCoord;



void main(void) {

  GLSLBinReader reader;
  GLSLBinReader_init(reader, surfaceAtlasLayoutTextureSize, 32);
  vec4 patchCoords = GLSLBinReader_readVec4(reader, surfaceAtlasLayoutTexture, int(surfaceId)*8);
  vec4 surfaceDataCoords = GLSLBinReader_readVec4(reader, surfaceAtlasLayoutTexture, (int(surfaceId)*8)+4);

  vec2 patchPos = patchCoords.xy;
  v_patchSize = patchCoords.zw;

  v_surfaceId = surfaceId;
  v_geomDataCoords = surfaceDataCoords.xyz;
  v_vertexCoord = (positions.xy + 0.5) * v_patchSize;

  vec2 pos = (patchPos + v_vertexCoord) / vec2(surfacesAtlasTextureSize);
  gl_Position = vec4((pos - 0.5) * 2.0, 0.0, 1.0);
}
`
  );

  zeaEngine.shaderLibrary.setShaderModule(
    'GLSLCADSurfaceFragmentShader.glsl',
    `

struct PosNorm {
  vec3 pos;
  vec3 normal;
  int geomType;
};

/* VS Outputs */
varying float v_surfaceId;      // flat
varying vec3 v_geomDataCoords;  // flat
varying vec2 v_patchSize;       // flat
varying vec2 v_vertexCoord;

uniform sampler2D surfaceDataTexture;
uniform ivec2 surfaceDataTextureSize;
uniform int writeNormals;

vec2 initReader(inout GLSLBinReader reader) {

  // compute exact xy coords per pixel by rounding the vertex coord to the nearest integer and then dividing my patch size.
  // The interpollated xy coords from the quad are not exact because the quad must cover the pixels with some margin.

  vec2 params = vec2(floor(v_vertexCoord.x), floor(v_vertexCoord.y));
  if(v_patchSize.x > 1.0)
    params.x /= v_patchSize.x - 1.0;
  if(v_patchSize.y > 1.0)
    params.y /= v_patchSize.y - 1.0;

  ivec4 region = ivec4(0, 0, surfaceDataTextureSize.x, surfaceDataTextureSize.y);
  ivec2 start = ivec2(v_geomDataCoords.xy);
  int flags = int(v_geomDataCoords.z);
  if(testFlag(flags, SURFACE_FLAG_FLIPPED_UV))  {
    float tmp = params.x;
    params.x = params.y;
    params.y = tmp;
  }

  GLSLBinReader_init(reader, surfaceDataTextureSize, region, start, 32);

  return params;
}


struct box2 {
  vec2 p0;
  vec2 p1;
};

box2 loadBox2(inout GLSLBinReader reader, sampler2D texture) {
  box2 domain;
  domain.p0.x = GLSLBinReader_readFloat(reader, texture);
  domain.p0.y = GLSLBinReader_readFloat(reader, texture);
  domain.p1.x = GLSLBinReader_readFloat(reader, texture);
  domain.p1.y = GLSLBinReader_readFloat(reader, texture);
  return domain;
}

vec2 mapDomain(box2 domain, vec2 params) {
  return domain.p0 + params * ( domain.p1 - domain.p0 );
}


`
  );

  /** Class representing a GL evaluate simple CAD surface shader.
   * @extends GLShader
   * @ignore
   */
  class GLEvaluateSimpleCADSurfaceShader extends zeaEngine.GLShader {
    /**
     * Create a GL evaluate simple CAD surface shader.
     * @param {any} gl - The gl value.
     */
    constructor(gl) {
      super(gl);

      this.__shaderStages['VERTEX_SHADER'] = GLEvaluateCADSurfaceShader_VERTEX_SHADER;

      this.__shaderStages['FRAGMENT_SHADER'] = zeaEngine.shaderLibrary.parseShader(
        'GLEvaluateSimpleCADSurfaceShader.fragmentShader',
        `
// #extension GL_EXT_draw_buffers : require
precision highp float;

<%include file="GLSLUtils.glsl"/>
<%include file="GLSLBinReader.glsl"/>
<%include file="GLSLCADConstants.glsl"/>
<%include file="GLSLCADSurfaceFragmentShader.glsl"/>

<%include file="GLSLCADSimpleSurfaces.glsl"/>

PosNorm evalCADSurfaces(vec2 params, inout GLSLBinReader reader, sampler2D texture) {
  // Evaluate the surface per vertex
  int geomType = GLSLBinReader_readInt(reader, texture);

  PosNorm posNorm;
  if(geomType == SURFACE_TYPE_PLANE) {
    posNorm = calcPlaneSurfacePoint(params, reader, texture);
  } else if(geomType == SURFACE_TYPE_POLY_PLANE) {
    posNorm = calcPolyPlaneSurfacePoint(params, reader, texture);
  } else if(geomType == SURFACE_TYPE_FAN) {
    posNorm = calcFanSurfacePoint(params, reader, texture);
  } else if(geomType == SURFACE_TYPE_CONE) {
    posNorm = calcConeSurfacePoint(params, reader, texture);
  } else if(geomType == SURFACE_TYPE_CYLINDER) {
    posNorm = calcCylinderSurfacePoint(params, reader, texture);
  } else if(geomType == SURFACE_TYPE_SPHERE) {
    posNorm = calcSphereSurfacePoint(params, reader, texture);
  } else if(geomType == SURFACE_TYPE_TORUS) {
    posNorm = calcTorusSurfacePoint(params, reader, texture);
  }
  return posNorm;
}

#ifdef ENABLE_ES3
out vec4 fragColor;
#endif

void main(void) {

#ifndef ENABLE_ES3
  vec4 fragColor;
#endif
  
  GLSLBinReader reader;
  vec2 xy = initReader(reader);
  PosNorm posNorm = evalCADSurfaces(xy, reader, surfaceDataTexture);

  if(writeNormals == 1) {
    fragColor = vec4(posNorm.normal, float(posNorm.geomType));
  }
  else {
    fragColor = vec4(posNorm.pos, float(posNorm.geomType));
  }
  // gl_FragData[0] = vec4(posNorm.pos, 1.0);
  // gl_FragData[1] = vec4(posNorm.normal, 1.0);

  // fragColor.r = v_geomDataCoords.x;
  // fragColor.g = v_geomDataCoords.y;
  // fragColor.r = floor(v_vertexCoord.x);
  // fragColor.g = floor(v_vertexCoord.y);
  // fragColor.b = v_patchSize.x;
  // fragColor.a = v_patchSize.y;

#ifndef ENABLE_ES3
  gl_FragColor = fragColor;
#endif
}
`
      );
    }
  }

  /** Class representing a GL evaluate compound CAD surface shader.
   * @extends GLShader
   * @ignore
   */
  class GLEvaluateCompoundCADSurfaceShader extends zeaEngine.GLShader {
    /**
     * Create a GL evaluate compound CAD surface shader.
     * @param {any} gl - The gl value.
     */
    constructor(gl) {
      super(gl);

      this.__shaderStages['VERTEX_SHADER'] = GLEvaluateCADSurfaceShader_VERTEX_SHADER;

      this.__shaderStages['FRAGMENT_SHADER'] = zeaEngine.shaderLibrary.parseShader(
        'GLEvaluateCompoundCADSurfaceShader.fragmentShader',
        `
// #extension GL_EXT_draw_buffers : require
precision highp float;

<%include file="GLSLCADConstants.glsl"/>
<%include file="GLSLUtils.glsl"/>
<%include file="GLSLBinReader.glsl"/>
<%include file="GLSLCADSurfaceFragmentShader.glsl"/>

<%include file="GLSLMath.glsl"/>

uniform sampler2D curvesAtlasTexture;
uniform ivec2 curvesAtlasTextureSize;
uniform sampler2D curveTangentsTexture;
uniform sampler2D curvesAtlasLayoutTexture;
uniform ivec2 curvesAtlasLayoutTextureSize;

vec3 getCurveVertex(ivec2 curvePatchCoords, int vertexCoord) {
  return fetchTexel(curvesAtlasTexture, curvesAtlasTextureSize, ivec2(curvePatchCoords.x + vertexCoord, curvePatchCoords.y)).rgb;
}

vec3 getCurveTangent(ivec2 curvePatchCoords, int vertexCoord) {
  return fetchTexel(curveTangentsTexture, curvesAtlasTextureSize, ivec2(curvePatchCoords.x + vertexCoord, curvePatchCoords.y)).rgb;
}

PosNorm evalCADCurve3d(int curveId, float u) {

  GLSLBinReader curveLayoutDataReader;
  GLSLBinReader_init(curveLayoutDataReader, curvesAtlasLayoutTextureSize, 32);
  ivec4 curvePatch = ivec4(GLSLBinReader_readVec4(curveLayoutDataReader, curvesAtlasLayoutTexture, curveId * 8));

  float t = float(curvePatch.z - 1) * u;
  int vertexId0 = min(int(floor(t + 0.5)), curvePatch.z - 1);
  // int vertexId1 = floor(t) + 1.0;
  // float lerp = t - floor(t);

  vec3 p0 = getCurveVertex(curvePatch.xy, vertexId0);
  // vec3 p1 = getCurveVertex(curvePatch.xy, vertexId1);
  vec3 t0 = getCurveTangent(curvePatch.xy, vertexId0);
  // vec3 t1 = getCurveTangent(curvePatch.xy, vertexId1);

  PosNorm res;
  res.pos = p0;//mix(p0, p1, lerp);
  res.normal = normalize(t0);//mix(t0, t1, lerp));
  res.geomType = 0;

  // res.pos.x = u;
  // res.pos.y = float(curveId);
  // res.pos.x = float(curvePatch.x);
  // res.pos.y = float(curvePatch.y);
  // res.pos.z = float(curvePatch.z);
  return res;
}


<%include file="GLSLCADCompoundSurfaces.glsl"/>

PosNorm evalCADSurfaces(vec2 params, inout GLSLBinReader reader, sampler2D texture) {
  // Evaluate the surface per vertex
  int geomType = GLSLBinReader_readInt(reader, texture);

  PosNorm posNorm;
  if(geomType == SURFACE_TYPE_LINEAR_EXTRUSION) {
    posNorm = calcLinearExtrusionSurfacePoint(params, reader, texture);
  } else if(geomType == SURFACE_TYPE_REVOLUTION) {
    posNorm = calcRevolutionSurfacePoint(params, reader, texture, false);
  } else if(geomType == SURFACE_TYPE_REVOLUTION_FLIPPED_DOMAIN) {
    posNorm = calcRevolutionSurfacePoint(params, reader, texture, true);
  } 
  
  return posNorm;
}

#ifdef ENABLE_ES3
out vec4 fragColor;
#endif

void main(void) {

#ifndef ENABLE_ES3
  vec4 fragColor;
#endif
  
  GLSLBinReader reader;
  vec2 xy = initReader(reader);
  PosNorm posNorm = evalCADSurfaces(xy, reader, surfaceDataTexture);

  if(writeNormals == 1) {
    fragColor = vec4(posNorm.normal, float(posNorm.geomType));
  }
  else {
    fragColor = vec4(posNorm.pos, float(posNorm.geomType));
  }

#ifndef ENABLE_ES3
  gl_FragColor = fragColor;
#endif
}
`
      );
    }
  }

  /** Class representing a GL evaluate NURBS CAD surface shader.
   * @extends GLShader
   * @ignore
   */
  class GLEvaluateNURBSCADSurfaceShader extends zeaEngine.GLShader {
    /**
     * Create a GL evaluate NURBS CAD surface shader.
     * @param {any} gl - The gl value.
     */
    constructor(gl) {
      super(gl);

      this.__shaderStages['VERTEX_SHADER'] = GLEvaluateCADSurfaceShader_VERTEX_SHADER;

      this.__shaderStages['FRAGMENT_SHADER'] = zeaEngine.shaderLibrary.parseShader(
        'GLEvaluateNURBSCADSurfaceShader.fragmentShader',
        `
// #extension GL_EXT_draw_buffers : require
precision highp float;

<%include file="GLSLCADConstants.glsl"/>
<%include file="GLSLUtils.glsl"/>
<%include file="GLSLBinReader.glsl"/>
<%include file="GLSLCADSurfaceFragmentShader.glsl"/>

<%include file="GLSLNURBS.glsl"/>
<%include file="GLSLNURBSSurfaces.glsl"/>

PosNorm evalCADSurfaces(vec2 params, inout GLSLBinReader reader, sampler2D texture) {
  // Evaluate the surface per vertex
  int geomType = GLSLBinReader_readInt(reader, texture);

  PosNorm posNorm;
  if(geomType == SURFACE_TYPE_NURBS_SURFACE) {
    posNorm = calcNURBSSurfacePoint(params, reader, texture);
  }
  
  return posNorm;
}

#ifdef ENABLE_ES3
out vec4 fragColor;
#endif

void main(void) {

#ifndef ENABLE_ES3
  vec4 fragColor;
#endif
  
  GLSLBinReader reader;
  vec2 xy = initReader(reader);
  PosNorm posNorm = evalCADSurfaces(xy, reader, surfaceDataTexture);

  if(writeNormals == 1) {
    fragColor = vec4(posNorm.normal, float(posNorm.geomType));
  }
  else {
    fragColor = vec4(posNorm.pos, float(posNorm.geomType));
  }

#ifndef ENABLE_ES3
  gl_FragColor = fragColor;
#endif
}
`
      );
    }
  }

  /** Class representing a GL surface library.
   * @ignore
   */
  class GLSurfaceLibrary extends zeaEngine.EventEmitter {
    /**
     * Create a GL surface library.
     * @param {any} gl - The gl value.
     * @param {any} cadpassdata - The cadpassdata value.
     * @param {any} surfacesLibrary - The surfacesLibrary value.
     * @param {any} glCurveLibrary - The glCurveLibrary value.
     */
    constructor(gl, cadpassdata, surfacesLibrary, glCurveLibrary, version) {
      super();
      this.__gl = gl;
      this.__cadpassdata = cadpassdata;
      this.__surfacesLibrary = surfacesLibrary;
      this.__glCurveLibrary = glCurveLibrary;
      this.cadDataVersion = version;

      const surfacesDataBuffer = this.__surfacesLibrary.getSurfaceBuffer();
      const surfaceTexSize = Math.sqrt(surfacesDataBuffer.byteLength / 8);

      this.__surfaceDataTexture = new zeaEngine.GLTexture2D(gl, {
        format: 'RGBA',
        type: 'HALF_FLOAT',
        width: surfaceTexSize,
        height: surfaceTexSize,
        filter: 'NEAREST',
        wrap: 'CLAMP_TO_EDGE',
        mipMapped: false,
        data: new Uint16Array(surfacesDataBuffer),
      });

      this.__bindAttr = (location, channels, type, stride, offset, instanced = true) => {
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, channels, gl.FLOAT, false, stride, offset);
        if (instanced) gl.vertexAttribDivisor(location, 1); // This makes it instanced
      };

      this.evaluateSurfaceShaders = [];
      this.__surfaceDrawSets = {};
    }

    // /////////////////////////////////////////////////////////////
    // Surfaces

    /**
     * The drawSurfaceData method.
     * @return {boolean} - The return value.
     */
    drawSurfaceData() {
      const renderstate = {};
      if (!this.__surfaceDataTexture || !this.__cadpassdata.debugTrimSetsShader.bind(renderstate)) return false
      // this.bindTrimSetAtlas(renderstate);

      this.__surfaceDataTexture.bindToUniform(renderstate, renderstate.unifs.trimSetAtlasTexture);
      this.__cadpassdata.glplanegeom.bind(renderstate);
      this.__cadpassdata.glplanegeom.draw();
    }

    /**
     * The evaluateSurfaces method.
     * @param {any} surfacesEvalAttrs - The surfacesEvalAttrs param.
     * @param {any} surfacesAtlasLayout - The surfacesAtlasLayout param.
     * @param {any} surfaceAtlasLayoutTextureSize - The surfaceAtlasLayoutTextureSize param.
     * @param {any} surfacesAtlasTextureDim - The surfacesAtlasTextureDim param.
     * @return {any} - The return value.
     */
    evaluateSurfaces(surfacesEvalAttrs, surfacesAtlasLayout, surfaceAtlasLayoutTextureSize, surfacesAtlasTextureDim) {
      // console.log("evaluateSurfaces");
      const t0 = performance.now();

      const totalSurfaceCount = surfacesAtlasLayout.length / valuesPerSurfaceLibraryLayoutItem;
      if (totalSurfaceCount == 0) return
      const gl = this.__gl;

      {
        this.__surfaceAtlasLayoutTexture = new zeaEngine.GLTexture2D(gl, {
          format: 'RGBA',
          type: 'FLOAT',
          width: surfaceAtlasLayoutTextureSize[0],
          height: surfaceAtlasLayoutTextureSize[1],
          filter: 'NEAREST',
          wrap: 'CLAMP_TO_EDGE',
          mipMapped: false,
          data: surfacesAtlasLayout,
        });
      }

      if (!this.__surfacesAtlasTexture) {
        this.__surfacesAtlasTexture = new zeaEngine.GLTexture2D(gl, {
          format: 'RGBA',
          type: 'FLOAT',
          width: surfacesAtlasTextureDim[0],
          height: surfacesAtlasTextureDim[1],
          filter: 'NEAREST',
          wrap: 'CLAMP_TO_EDGE',
          mipMapped: false,
        });
        this.__surfacesFbo = new zeaEngine.GLFbo(gl, this.__surfacesAtlasTexture);
        this.__surfacesFbo.setClearColor([0, 0, 0, 0]);
        this.__surfacesFbo.bindAndClear();

        this.__normalsTexture = new zeaEngine.GLTexture2D(gl, {
          format: 'RGBA',
          type: 'FLOAT',
          width: surfacesAtlasTextureDim[0],
          height: surfacesAtlasTextureDim[1],
          filter: 'NEAREST',
          wrap: 'CLAMP_TO_EDGE',
          mipMapped: false,
        });
        this.__normalsFbo = new zeaEngine.GLFbo(gl, this.__normalsTexture);
        this.__normalsFbo.setClearColor([0, 0, 0, 0]);
        this.__normalsFbo.bindAndClear();
      } else if (
        this.__surfacesAtlasTexture.width != surfacesAtlasTextureDim[0] ||
        this.__surfacesAtlasTexture.height != surfacesAtlasTextureDim[1]
      ) {
        // Copy the previous image into a new one, and then destroy the prvious.
        this.__surfacesAtlasTexture.resize(surfacesAtlasTextureDim[0], surfacesAtlasTextureDim[1], true);
        this.__surfacesFbo.resize(); // hack to rebind the texture. Refactor the way textures are resized.
      }

      const renderstate = {};

      // /////////////////////////////////////////////
      // Precompile shaders.
      const shaderopts = { directives: [...gl.shaderopts.directives] };

      if (this.cadDataVersion.compare([0, 0, 6]) >= 0) {
        shaderopts.directives.push('#define EXPORT_KNOTS_AS_DELTAS 1');
      }
      if (this.cadDataVersion.compare([0, 0, 26]) > 0) {
        shaderopts.directives.push('#define INTS_PACKED_AS_2FLOAT16 1');
      }

      surfacesEvalAttrs.forEach((attr, category) => {
        if (!this.evaluateSurfaceShaders[category]) {
          let shader;
          switch (category) {
            case 0:
              shader = new GLEvaluateSimpleCADSurfaceShader(gl);
              break
            case 1:
              shader = new GLEvaluateCompoundCADSurfaceShader(gl);
              break
            case 2:
              shader = new GLEvaluateNURBSCADSurfaceShader(gl);
              break
          }
          shader.compileForTarget(undefined, shaderopts);
          this.evaluateSurfaceShaders[category] = shader;
        }
        this.evaluateSurfaceShaders[category].bind(renderstate);
        this.__cadpassdata.glplanegeom.bind(renderstate);

        const unifs = renderstate.unifs;
        const attrs = renderstate.attrs;

        this.__surfaceAtlasLayoutTexture.bindToUniform(renderstate, unifs.surfaceAtlasLayoutTexture);
        gl.uniform2i(
          unifs.surfaceAtlasLayoutTextureSize.location,
          this.__surfaceAtlasLayoutTexture.width,
          this.__surfaceAtlasLayoutTexture.height
        );

        gl.uniform2i(
          unifs.surfacesAtlasTextureSize.location,
          this.__surfacesAtlasTexture.width,
          this.__surfacesAtlasTexture.height
        );

        this.__surfaceDataTexture.bindToUniform(renderstate, unifs.surfaceDataTexture);
        gl.uniform2i(
          unifs.surfaceDataTextureSize.location,
          this.__surfaceDataTexture.width,
          this.__surfaceDataTexture.height
        );

        // For the linear and radial loft.
        if (unifs.curveTangentsTexture) this.__glCurveLibrary.bindCurvesAtlas(renderstate);

        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, attr, gl.STATIC_DRAW);

        this.__bindAttr(attrs.surfaceId.location, 1, gl.FLOAT, 4, 0);

        // //////////////////////////////////////////////
        // Bind each Fbo and render separately.
        // Bizzarly, this has turned out to be much faster
        // than using mutiple render targets...
        this.__surfacesFbo.bind();
        gl.uniform1i(unifs.writeNormals.location, 0);
        this.__cadpassdata.glplanegeom.drawInstanced(attr.length);

        this.__normalsFbo.bind();
        gl.uniform1i(unifs.writeNormals.location, 1);
        this.__cadpassdata.glplanegeom.drawInstanced(attr.length);
        // //////////////////////////////////////////////

        gl.deleteBuffer(buffer);
      });
      this.__surfacesFbo.unbind();

      this.__surfacesAtlasLayout = surfacesAtlasLayout;
      // logSurfaceData(9628)
      // console.log("----------------------------------");

      const t = performance.now() - t0;
      // console.log("evaluateSurfaces - Done:", t);

      return t
    }

    /**
     * The logSurfaceData method.
     * @param {any} surfaceId - The surfaceId param.
     */
    logSurfaceData(surfaceId) {
      // const layout = [
      //   this.__surfacesAtlasLayout[(surfaceId * valuesPerSurfaceLibraryLayoutItem) + 0],
      //   this.__surfacesAtlasLayout[(surfaceId * valuesPerSurfaceLibraryLayoutItem) + 1],
      //   this.__surfacesAtlasLayout[(surfaceId * valuesPerSurfaceLibraryLayoutItem) + 2],
      //   this.__surfacesAtlasLayout[(surfaceId * valuesPerSurfaceLibraryLayoutItem) + 3]];

      // console.log("logGeomData " + surfaceId + ":[" + layout[0] +","+ layout[1] + "] detail :" + layout[2] +"x"+ layout[3]);

      const surfacesDataBuffer = this.__surfacesLibrary.getSurfaceBuffer();
      const surfacesDataReader = new BinReader(surfacesDataBuffer);
      surfacesDataReader.seek(8 + surfaceId * (8 /* num values per item*/ * 2) /* bpc*/ + 2 /* addr*/ * 2 /* bpc*/);

      const detailU = surfacesDataReader.loadFloat16();
      const detailV = surfacesDataReader.loadFloat16();
      const sizeU = surfacesDataReader.loadFloat16();
      const sizeV = surfacesDataReader.loadFloat16();
      const trimSetIndex = surfacesDataReader.loadFloat16();
      console.log(
        'logGeomData ' +
          surfaceId +
          ' detailU:[' +
          detailU +
          ',' +
          detailV +
          '] sizeU [' +
          sizeU +
          ',' +
          sizeV +
          '] trimSetIndex:' +
          trimSetIndex
      );
    }

    /**
     * The drawSurfaceAtlas method.
     * @param {any} renderstate - The renderstate param.
     * @return {boolean} - The return value.
     */
    drawSurfaceAtlas(renderstate) {
      if (!this.__normalsTexture || !this.__cadpassdata.debugTrimSetsShader.bind(renderstate)) return false
      // this.bindTrimSetAtlas(renderstate);

      this.__normalsTexture.bindToUniform(renderstate, renderstate.unifs.trimSetAtlasTexture);
      this.__cadpassdata.glplanegeom.bind(renderstate);
      this.__cadpassdata.glplanegeom.draw();
    }

    /**
     * The bindSurfacesData method.
     * @param {any} renderstate - The renderstate param.
     */
    bindSurfacesData(renderstate) {
      const gl = this.__gl;
      const unifs = renderstate.unifs;
      this.__surfaceDataTexture.bindToUniform(renderstate, unifs.surfaceDataTexture);
      gl.uniform2i(
        unifs.surfaceDataTextureSize.location,
        this.__surfaceDataTexture.width,
        this.__surfaceDataTexture.height
      );
    }

    /**
     * The bindSurfacesAtlas method.
     * @param {any} renderstate - The renderstate param.
     * @return {boolean} - returns true if the atlass was bound.
     */
    bindSurfacesAtlas(renderstate) {
      if (!this.__surfacesAtlasTexture) return false
      const unifs = renderstate.unifs;
      this.__surfacesAtlasTexture.bindToUniform(renderstate, unifs.surfacesAtlasTexture);
      const gl = this.__gl;
      if (unifs.normalsTexture) this.__normalsTexture.bindToUniform(renderstate, unifs.normalsTexture);
      if (unifs.surfacesAtlasTextureSize)
        gl.uniform2i(
          unifs.surfacesAtlasTextureSize.location,
          this.__surfacesAtlasTexture.width,
          this.__surfacesAtlasTexture.height
        );

      if (unifs.numSurfacesInLibrary) {
        gl.uniform1i(unifs.numSurfacesInLibrary.location, this.__surfacesLibrary.getNumSurfaces());
      }

      if (unifs.surfaceAtlasLayoutTexture) {
        this.__surfaceAtlasLayoutTexture.bindToUniform(renderstate, unifs.surfaceAtlasLayoutTexture);
        gl.uniform2i(
          unifs.surfaceAtlasLayoutTextureSize.location,
          this.__surfaceAtlasLayoutTexture.width,
          this.__surfaceAtlasLayoutTexture.height
        );
      }
      return true
    }

    /**
     * The getSurfaceData method.
     * @param {any} surfaceId - The surfaceId param.
     * @return {any} - The return value.
     */
    getSurfaceData(surfaceId) {
      return this.__surfacesLibrary.getSurfaceData(surfaceId)
    }

    /**
     * The destroy method.
     */
    destroy() {
      this.__surfaceDataTexture.destroy();
      if (this.__surfacesAtlasTexture) {
        this.__surfacesAtlasTexture.destroy();
        this.__normalsTexture.destroy();
        this.__surfacesFbo.destroy();
        this.__normalsFbo.destroy();
      }
    }
  }

  /** This class abstracts the rendering of a collection of geometries to screen.
   * @extends Mesh
   * @ignore
   */
  class Fan$1 extends zeaEngine.Mesh {
    /**
     * Create a fan.
     * @param {number} detail - The detail value.
     */
    constructor(detail = 1) {
      super();
      this.__detail = detail;
      this.addVertexAttribute('vertexIds', zeaEngine.Float32);
      this.__rebuild();
    }

    /**
     * The __rebuild method.
     * @private
     */
    __rebuild() {
      this.setNumVertices(this.__detail + 2);
      this.setFaceCounts([this.__detail]);

      for (let i = 0; i < this.__detail; i++) {
        this.setFaceVertexIndices(i, [0, i + 1, i + 2]);
      }
      const vertexIds = this.getVertexAttribute('vertexIds');
      for (let i = 0; i <= vertexIds.length; i++) {
        vertexIds.setFloat32Value(i, i);
      }
    }
  }

  /** Class representing a strip.
   * @extends Plane
   * @ignore
   */
  class Strip extends zeaEngine.Plane {
    /**
     * Create a strip.
     * @param {number} detail - The detail value.
     */
    constructor(detail = 1) {
      super(1, 2, detail, 1, false, false);
    }

    /**
     * The __resize method.
     * @private
     */
    __resize() {
      const sizeX = this.__sizeXParam.getValue();
      const sizeY = this.__sizeYParam.getValue();
      const detailX = this.__detailXParam.getValue();
      const detailY = this.__detailYParam.getValue();
      const positions = this.getVertexAttribute('positions');
      let voff = 0;
      for (let i = 0; i <= detailY; i++) {
        const y = (i / detailY - 0.5) * sizeY;
        for (let j = 0; j <= detailX; j++) {
          const x = j;
          positions.getValueRef(voff).set(x, y, 0.0);
          voff++;
        }
      }
      this.setBoundingBoxDirty();
    }
  }

  const __cache$2 = {};

  /** Class representing a GL trim curve draw set.
   * @ignore
   */
  class GLTrimCurveDrawSet {
    /**
     * Create a GL trim curve draw set.
     * @param {any} gl - The gl value.
     * @param {any} detail - The detail value.
     * @param {any} trimCurvesDataArray - The trimCurvesDataArray value.
     */
    constructor(gl, detail, trimCurvesDataArray) {
      this.__gl = gl;
      this.__detail = detail;

      if (!__cache$2[detail]) {
        __cache$2[detail] = {
          glfangeom: new zeaEngine.GLMesh(gl, new Fan$1(detail)),
          glstripgeom: new zeaEngine.GLMesh(gl, new Strip(detail)),
        };
      }
      this.__glfangeom = __cache$2[detail].glfangeom;
      this.__glstripgeom = __cache$2[detail].glstripgeom;

      this.__buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.__buffer);
      gl.bufferData(gl.ARRAY_BUFFER, trimCurvesDataArray, gl.STATIC_DRAW);

      this.__drawCount = trimCurvesDataArray.length / numValuesPerTrimSetCurveRef;
    }

    /**
     * The bindAttr method.
     * @param {any} location - The location param.
     * @param {any} channels - The channels param.
     * @param {any} type - The type param.
     * @param {any} stride - The stride param.
     * @param {any} offset - The offset param.
     */
    bindAttr(location, channels, type, stride, offset) {
      if (location < 0) return
      const gl = this.__gl;
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, channels, gl.FLOAT, false, stride, offset);
      gl.vertexAttribDivisor(location, 1); // This makes it instanced
    }

    // ////////////////////////////////////
    // Drawing

    /**
     * The setBuffer method.
     */
    setBuffer() {}

    /**
     * The drawFans method.
     * @param {any} renderstate - The renderstate param.
     */
    drawFans(renderstate) {
      const gl = this.__gl;

      this.__glfangeom.bind(renderstate);

      const unifs = renderstate.unifs;
      const attrs = renderstate.attrs;

      gl.bindBuffer(gl.ARRAY_BUFFER, this.__buffer);
      this.bindAttr(attrs.patchCoords.location, 4, gl.FLOAT, numValuesPerTrimSetCurveRef * 4, 0);
      this.bindAttr(attrs.data0.location, 4, gl.FLOAT, numValuesPerTrimSetCurveRef * 4, 4 * 4);
      this.bindAttr(attrs.data1.location, 4, gl.FLOAT, numValuesPerTrimSetCurveRef * 4, 4 * 8);
      this.bindAttr(attrs.data2.location, 2, gl.FLOAT, numValuesPerTrimSetCurveRef * 4, 4 * 12);

      gl.uniform1i(unifs.numCurveVertices.location, this.__detail + 1);

      this.__glfangeom.drawInstanced(this.__drawCount);
    }

    /**
     * The drawStrips method.
     * @param {any} renderstate - The renderstate param.
     */
    drawStrips(renderstate) {
      const gl = this.__gl;

      this.__glstripgeom.bind(renderstate);

      const unifs = renderstate.unifs;
      const attrs = renderstate.attrs;

      gl.bindBuffer(gl.ARRAY_BUFFER, this.__buffer);
      this.bindAttr(attrs.patchCoords.location, 4, gl.FLOAT, numValuesPerTrimSetCurveRef * 4, 0);
      this.bindAttr(attrs.data0.location, 4, gl.FLOAT, numValuesPerTrimSetCurveRef * 4, 4 * 4);
      this.bindAttr(attrs.data1.location, 4, gl.FLOAT, numValuesPerTrimSetCurveRef * 4, 4 * 8);
      this.bindAttr(attrs.data2.location, 2, gl.FLOAT, numValuesPerTrimSetCurveRef * 4, 4 * 12);

      gl.uniform1i(unifs.numCurveVertices.location, this.__detail + 1);

      this.__glstripgeom.drawInstanced(this.__drawCount);
    }

    /**
     * The cleanup method.
     */
    cleanup() {
      // this.__gl.deleteBuffer(this.__buffer);
    }
  }

  /* eslint-disable camelcase */

  /** Class representing a GL draw trim curve fans shader.
   * @extends GLShader
   * @ignore
   */
  class GLDrawTrimCurveFansShader extends zeaEngine.GLShader {
    /**
     * Create a GL draw trim curve fans shader.
     * @param {any} gl - The gl value.
     */
    constructor(gl) {
      super(gl);

      this.__shaderStages['VERTEX_SHADER'] = zeaEngine.shaderLibrary.parseShader(
        'GLDrawTrimCurveFansShader.vertexShader',
        `
precision highp float;

attribute float vertexIds;
instancedattribute vec4 patchCoords;         // instanced attribute..
instancedattribute vec4 data0;     // instanced attribute..
instancedattribute vec4 data1;     // instanced attribute..
instancedattribute vec2 data2;     // instanced attribute..

<%include file="GLSLUtils.glsl"/>
<%include file="GLSLMath.glsl"/>

uniform sampler2D curvesAtlasTexture;
uniform ivec2 curvesAtlasTextureSize;

uniform ivec2 trimSetAtlasTextureSize;

uniform int numCurveVertices;

struct CurveRef {
  int curveId;
  vec2 tr;
  mat2 mat;
  int flags;

  ivec2 addr;
  int numCurveVertices;

};

vec2 getCurveVertex(in CurveRef curveRef, int vertexId) {
    if(curveRef.flags != 0)
      vertexId = curveRef.numCurveVertices - vertexId - 1;
    return curveRef.tr + curveRef.mat * fetchTexel(curvesAtlasTexture, curvesAtlasTextureSize, ivec2(curveRef.addr.x + vertexId, curveRef.addr.y)).rg;
}


uniform sampler2D curvesAtlasLayoutTexture;
uniform ivec2 curvesAtlasLayoutTextureSize;

uniform sampler2D trimSetTexture;
uniform ivec2 trimSetTextureSize;


<%include file="GLSLBinReader.glsl"/>

CurveRef getCurveRef(inout GLSLBinReader trimsetDataReader, in int curveRefStart, inout GLSLBinReader curvesAtlasLayoutDataReader) {

  CurveRef curveRef;

  // Get the Curve Id from the trimSet Atlas
  curveRef.curveId = GLSLBinReader_readInt(trimsetDataReader, trimSetTexture, curveRefStart + 0);

  // Get the Xfo for the curve
  curveRef.tr = vec2(
    GLSLBinReader_readFloat(trimsetDataReader, trimSetTexture, curveRefStart + 1), 
    GLSLBinReader_readFloat(trimsetDataReader, trimSetTexture, curveRefStart + 2)
    );
  curveRef.mat = mat2(
    vec2(
      GLSLBinReader_readFloat(trimsetDataReader, trimSetTexture, curveRefStart + 3), 
      GLSLBinReader_readFloat(trimsetDataReader, trimSetTexture, curveRefStart + 4)
    ),
    vec2(
      GLSLBinReader_readFloat(trimsetDataReader, trimSetTexture, curveRefStart + 5), 
      GLSLBinReader_readFloat(trimsetDataReader, trimSetTexture, curveRefStart + 6)
    ));

  // Get the flags for the curve
  curveRef.flags = GLSLBinReader_readInt(trimsetDataReader, trimSetTexture, curveRefStart + 7);


  curveRef.addr = ivec2(
    GLSLBinReader_readInt(curvesAtlasLayoutDataReader, curvesAtlasLayoutTexture, (curveRef.curveId * 8) + 0), 
    GLSLBinReader_readInt(curvesAtlasLayoutDataReader, curvesAtlasLayoutTexture, (curveRef.curveId * 8) + 1)
    );
  curveRef.numCurveVertices = GLSLBinReader_readInt(curvesAtlasLayoutDataReader, curvesAtlasLayoutTexture, (curveRef.curveId * 8) + 2);

  return curveRef;
}



void main(void) {

  vec2 pos;
  int vertexId = ftoi(vertexIds);
  if(vertexId == 0) {
    pos = (patchCoords.xy + patchCoords.zw * 0.5) / vec2(trimSetAtlasTextureSize);
  }
  else {
    vertexId--;

    CurveRef curveRef;
    curveRef.tr = data0.xy;
    curveRef.mat = mat2(data0.zw, data1.xy);
    curveRef.flags = ftoi(data2.x);

    curveRef.addr = ivec2(ftoi(data1.z), ftoi(data1.w));
    curveRef.numCurveVertices = numCurveVertices;

    //////////////////////////////////////////////
    pos = getCurveVertex(curveRef, vertexId);

    /*
    //////////////////////////////////////////////
    
    int loopStartPos = ftoi(data0.x);
    int curveIndexWithLoop = ftoi(data0.y);

    GLSLBinReader trimsetDataReader;
    GLSLBinReader_init(trimsetDataReader, trimSetTextureSize, 16);
    int numCurves = GLSLBinReader_readInt(trimsetDataReader, trimSetTexture, loopStartPos);

    GLSLBinReader curvesAtlasLayoutDataReader;
    GLSLBinReader_init(curvesAtlasLayoutDataReader, curvesAtlasLayoutTextureSize, 32);

    CurveRef curveRef = getCurveRef(trimsetDataReader, loopStartPos + 1 + (curveIndexWithLoop * 8), curvesAtlasLayoutDataReader);
    pos = getCurveVertex( curveRef, vertexId );


    // Tranform the curve points by the xfo2d to put it into the coords of the trim set.
    Xfo2d xfo2d = Xfo2d(data0.xy, data1.x, data0.zw);
    pos = Xfo2D_transformVec2(xfo2d, pos);


    //////////////////////////////////
    // Due to the reduced precision we use to store our data
    // we get cracks in the trim textures. To fix this we weld
    // the end points of the trim curves here.
    // For each end point of a curve, we find the joining end point 
    // and average their positions.

    if(vertexId == 0) {
      // Lookup the vertex of the previous curve.
      int prevCurveIndexWithinLoop = curveIndexWithLoop - 1;
      if(prevCurveIndexWithinLoop < 0)
        prevCurveIndexWithinLoop += numCurves;
      CurveRef prevCurveRef = getCurveRef(trimsetDataReader, loopStartPos + 1 + (prevCurveIndexWithinLoop * 8), curvesAtlasLayoutDataReader);

      // Get the end of the previous curve.
      vec2 prevCurveEndPos = getCurveVertex( prevCurveRef, prevCurveRef.numCurveVertices-1 );

      pos = (pos + prevCurveEndPos) * 0.5;
    }
    else if(vertexId == numCurveVertices-1) {
      // Lookup the vertex of the next curve.
      int nextCurveIndexWithinLoop = curveIndexWithLoop + 1;
      if(nextCurveIndexWithinLoop >= numCurves)
        nextCurveIndexWithinLoop = 0;
      CurveRef nextCurveRef = getCurveRef(trimsetDataReader, loopStartPos + 1 + (nextCurveIndexWithinLoop * 8), curvesAtlasLayoutDataReader);

      // Get the start of the next curve.
      vec2 nextCurveEndPos = getCurveVertex( nextCurveRef, 0 );
      pos = (pos + nextCurveEndPos) * 0.5;
    }

    */
    //////////////////////////////////////////////


    // Now transform the trim set into the coords of the full texture.
    pos = (patchCoords.xy + (pos * patchCoords.zw));
    pos /= vec2(trimSetAtlasTextureSize);
  }

  // transform the position into clip space.
  gl_Position = vec4(vec2(-1.0, -1.0) + (pos * 2.0), 0.0, 1.0);
}
`
      );

      this.__shaderStages['FRAGMENT_SHADER'] = zeaEngine.shaderLibrary.parseShader(
        'GLDrawTrimCurveFansShader.fragmentShader',
        `
precision highp float;

#ifdef ENABLE_ES3
out vec4 fragColor;
#endif

void main(void) {

#ifndef ENABLE_ES3
    vec4 fragColor;
#endif

    fragColor = vec4(1.0/255.0,0.0,0.0,1.0);
    
#ifndef ENABLE_ES3
    gl_FragColor = fragColor;
#endif
}
`
      );
    }
  }

  zeaEngine.Registry.register('GLDrawTrimCurveFansShader', GLDrawTrimCurveFansShader);

  /* eslint-disable camelcase */

  /** Class representing a GL flatten trim sets shader.
   * @extends GLShader
   * @ignore
   */
  class GLFlattenTrimSetsShader extends zeaEngine.GLShader {
    /**
     * Create a GL flatten trim sets shader.
     * @param {any} gl - The gl value.
     */
    constructor(gl) {
      super(gl);

      this.__shaderStages['VERTEX_SHADER'] = zeaEngine.shaderLibrary.parseShader(
        'GLFlattenTrimSetsShader.vertexShader',
        `
precision highp float;

attribute vec4 positions;

/* VS Outputs */
varying vec2 v_texCoord;
 
void main()
{
    v_texCoord = (positions.xy + 0.5);
    gl_Position =  vec4(positions.xy * 2.0, 0.0, 1.0);
}
`
      );

      this.__shaderStages['FRAGMENT_SHADER'] = zeaEngine.shaderLibrary.parseShader(
        'GLFlattenTrimSetsShader.fragmentShader',
        `
precision highp float;

uniform sampler2D trimSetAtlasTexture;
uniform ivec2 trimSetAtlasTextureSize;


/* VS Outputs */
varying vec2 v_texCoord;

// returns true if the texel will be kept
// When the fans are rendered, the pixels are acumulated. 
// An even number means that the pixel should be discarded
// and an odd number mean the pixel should be kept.
bool sampleAtlas(vec2 offset){
    return mod(texture2D(trimSetAtlasTexture, v_texCoord + (offset / vec2(trimSetAtlasTextureSize))).r * 255.0, 2.0) > 0.5;
}

int scoreAtlas(vec2 offset){
  if(sampleAtlas(offset))
    return 1;
  else
    return 0;
}

#ifdef ENABLE_ES3
out vec4 fragColor;
#endif

void main(void) {

#ifndef ENABLE_ES3
    vec4 fragColor;
#endif

  // if(sampleAtlas(vec2(0.0, 0.0))){
  //   fragColor = vec4(1.0, 0.5, 0.5, 1.0);
  // }
  // else{
  //   fragColor = vec4(0.0, 0.5, 0.5, 1.0);
  // }
  
  // Smoothing. Look at neighboring pixels to see
  // if we should fill in the gaps. Due to floating
  // point issues, we see random pixels floating
  // in the air that shold have been trimmed by the
  // fan. If a point 
  int score = scoreAtlas(vec2(-1.0, 0.0)) + 
              scoreAtlas(vec2(-1.0,-1.0)) + 
              scoreAtlas(vec2( 0.0,-1.0)) + 
              scoreAtlas(vec2( 1.0,-1.0)) + 
              scoreAtlas(vec2( 1.0, 0.0)) + 
              scoreAtlas(vec2( 1.0, 1.0)) + 
              scoreAtlas(vec2( 0.0, 1.0)) + 
              scoreAtlas(vec2(-1.0, 1.0));

  float r = 0.0;
  if(sampleAtlas(vec2(0.0, 0.0))){
    if(score >= 4) // corner verts have a score of 3
      r = 1.0;
    else
      r = 0.0;
  }
  else{
    if(score < 4) 
      r = 0.0;
    else
      r = 1.0;
  }
  fragColor = vec4(r, r, 0.0, 0.0);
  
#ifndef ENABLE_ES3
    gl_FragColor = fragColor;
#endif
}
`
      );
    }
  }

  zeaEngine.Registry.register('GLFlattenTrimSetsShader', GLFlattenTrimSetsShader);

  /* eslint-disable camelcase */

  /** Class representing a GL draw trim curve strips shader.
   * @extends GLShader
   * @ignore
   */
  class GLDrawTrimCurveStripsShader extends zeaEngine.GLShader {
    /**
     * Create a GL draw trim curve strips shader.
     * @param {any} gl - The gl value.
     */
    constructor(gl) {
      super(gl);

      this.__shaderStages['VERTEX_SHADER'] = zeaEngine.shaderLibrary.parseShader(
        'GLDrawTrimCurveStripsShader.vertexShader',
        `
precision highp float;

attribute vec4 positions;
instancedattribute vec4 patchCoords;         // instanced attribute..
instancedattribute vec4 data0;     // instanced attribute..
instancedattribute vec4 data1;     // instanced attribute..
instancedattribute vec3 data2;     // instanced attribute..

<%include file="GLSLUtils.glsl"/>
<%include file="GLSLMath.glsl"/>

uniform sampler2D curvesAtlasTexture;
uniform ivec2 trimSetAtlasTextureSize;

uniform int numCurveVertices;
uniform float stripWidth;

vec2 getCurveVertex(int vertexId, int flags) {
  if(flags != 0)
    vertexId = numCurveVertices - vertexId - 1;
  return fetchTexel(curvesAtlasTexture, trimSetAtlasTextureSize, ivec2(int(data1.z) + vertexId, int(data1.w))).rg;
}

#define M_PI 3.1415926535897932384626433832795

/* VS Outputs */
varying float v_curveIndexWithinLoop;
varying float v_gradient;

void main(void) {

  int vertexId = ftoi(positions.x);
  float side = positions.y < 0.0 ? -1.0 : 1.0;
  mat2 rot = mat2(data0.zw, data1.xy);
  int curveRefFlags = ftoi(data2.x);
  int curveIndexWithinLoop = ftoi(data2.y);
  v_curveIndexWithinLoop = float(curveIndexWithinLoop);

  // Tranform the curve points by the mat2 to put it into the coords of the trim set.
  vec2 pos = data0.xy + (rot * getCurveVertex(vertexId, curveRefFlags));

  //////////////////////////////////////////////
  vec2 curveTangent;
  if(vertexId > 0) {
    vec2 posPrev = data0.xy + (rot * getCurveVertex(vertexId-1, curveRefFlags));
    curveTangent += pos - posPrev;
  }
  if(vertexId < numCurveVertices-1) {
    vec2 posNext = data0.xy + (rot * getCurveVertex(vertexId+1, curveRefFlags));
    curveTangent += posNext - pos;
  }
  curveTangent = normalize(curveTangent);
  vec2 curveNormal = vec2(-curveTangent.y, curveTangent.x);

  // Fatten the strip
  pos += (curveNormal * side * stripWidth) / patchCoords.zw;

  //////////////////////////////////////////////
  // Extend the strip by one pixel at each end.
  if(vertexId == 0) {
    pos -= curveTangent * (stripWidth / patchCoords.zw) * 0.5;
  }
  else if(vertexId == numCurveVertices-1) {
    pos += curveTangent * (stripWidth / patchCoords.zw) * 0.5;
  }
  //////////////////////////////////////////////

  // Now transform the trim set into the coords of the full texture.
  pos = (patchCoords.xy + (pos * patchCoords.zw));
  pos /= vec2(trimSetAtlasTextureSize);

  // transform the position into clip space.
  gl_Position = vec4((pos * 2.0) - 1.0, 0.0, 1.0);
  

  // The gradient should run 0.0 ... 1.0 from one side of the strip to the other.
  // The side value ranges from -1.0 to +1.0

  v_gradient = (side + 1.0) / 2.0;
  // v_gradient = 1.0;

  // Note: this causes the trim edge to move slightly to grow.
  // This fills in slight gaps betwen trimmed surfaces.
  // This causes lots of atrifacts on some thin surfaces
  // On Mordacious, this causese many artifacts at the border of surfaces.
  // v_gradient = (v_gradient * 1.1) + 0.05;
  // v_gradient = (v_gradient * 1.2) + 0.1;
  // v_gradient = (v_gradient * 1.5) + 0.25;
  // v_gradient = (v_gradient * 2.0) + 0.5;
  // v_gradient = (v_gradient * 2.0) + 1.0;
}
`
      );

      this.__shaderStages['FRAGMENT_SHADER'] = zeaEngine.shaderLibrary.parseShader(
        'GLDrawTrimCurveStripsShader.fragmentShader',
        `
precision highp float;

<%include file="GLSLUtils.glsl"/>

uniform int flatten;

/* VS Outputs */
varying float v_curveIndexWithinLoop;
varying float v_gradient;

#ifdef ENABLE_ES3
out vec4 fragColor;
#endif

void main(void) {

#ifndef ENABLE_ES3
  vec4 fragColor;
#endif

  // Initially a build up the data around the edges by rasterizing a full color pixel,
  // followed by a subtractive pass that cuts down the borders
  //
  // Initially, after the fans are rasterized 
  //     ----
  //  .  |  .
  //  .  |  .
  //     ----
  //
  // Becomes 
  //  -------
  //  .     .
  //  .     .
  //  -------
  //
  // Becomes 
  //    . ---
  //    ./     
  //   /. 
  //  -------
  // After the subtraction pass


  
  if (flatten > 0) {
    fragColor = vec4(1.0, 1.0, 1.0, 1.0);
  } else {
    int curveIndexWithinLoop = ftoi(v_curveIndexWithinLoop);
    if (curveIndexWithinLoop % 2 == 0) {
      fragColor = vec4(v_gradient, 1.0, 1.0, 1.0);
    }
    else {
      fragColor = vec4(1.0, v_gradient, 1.0, 1.0);
    }
  }
    
#ifndef ENABLE_ES3
  gl_FragColor = fragColor;
#endif
}
`
      );
    }
  }

  zeaEngine.Registry.register('GLDrawTrimCurveStripsShader', GLDrawTrimCurveStripsShader);

  /* eslint-disable camelcase */

  /** Class representing a GL debug trim sets shader.
   * @extends GLShader
   * @ignore
   */
  class GLDebugTrimSetsShader extends zeaEngine.GLShader {
    /**
     * Create a GL debug trim sets shader.
     * @param {any} gl - The gl value.
     */
    constructor(gl) {
      super(gl);

      this.setShaderStage(
        'VERTEX_SHADER',
        `
precision highp float;

attribute vec4 positions;

/* VS Outputs */
varying vec2 v_texCoord;
 
void main()
{
    v_texCoord = (positions.xy + 0.5);
    gl_Position =  vec4(positions.xy * 2.0, 0.0, 1.0);
    // gl_Position =  vec4(positions.xy + vec2(-0.5, 0.5), 0.0, 1.0);
}
`
      );
      this.setShaderStage(
        'FRAGMENT_SHADER',
        `
precision highp float;

uniform sampler2D trimSetAtlasTexture;

/* VS Outputs */
varying vec2 v_texCoord;
 
#ifdef ENABLE_ES3
out vec4 fragColor;
#endif

void main(void) {

#ifndef ENABLE_ES3
  vec4 fragColor;
#endif

  vec4 col = texture2D(trimSetAtlasTexture, v_texCoord);
  vec3 rgb = col.rgb / col.a;
  fragColor = vec4(rgb,1.0);
  
#ifndef ENABLE_ES3
  gl_FragColor = fragColor;
#endif
}
`
      );
    }
  }

  /** Class representing a GL trim set library.
   * @ignore
   */
  class GLTrimSetLibrary {
    /**
     * Create a GL trim set library.
     * @param {any} gl - The gl value.
     * @param {any} cadpassdata - The cadpassdata value.
     * @param {any} trimSetLibrary - The trimSetLibrary value.
     * @param {any} glCurvesLibrary - The glCurvesLibrary value.
     */
    constructor(gl, cadpassdata, trimSetLibrary, glCurvesLibrary) {
      this.__gl = gl;
      this.__cadpassdata = cadpassdata;
      this.__trimSetLibrary = trimSetLibrary;
      this.__glCurvesLibrary = glCurvesLibrary;

      const trimSetsBuffer = this.__trimSetLibrary.getBinaryBuffer();
      const trimSetsTexSize = Math.sqrt(trimSetsBuffer.byteLength / 8);
      this.__trimSetsTexture = new zeaEngine.GLTexture2D(gl, {
        format: 'RGBA',
        type: 'HALF_FLOAT',
        width: trimSetsTexSize,
        height: trimSetsTexSize,
        filter: 'NEAREST',
        wrap: 'CLAMP_TO_EDGE',
        mipMapped: false,
        data: new Uint16Array(trimSetsBuffer)
      });

      this.__bindAttr = (location, channels, type, stride, offset, instanced = true) => {
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, channels, gl.FLOAT, false, stride, offset);
        if (instanced) gl.vertexAttribDivisor(location, 1); // This makes it instanced
      };

      this.__trimCurveDrawSets = {};
    }

    // /////////////////////////////////////////////////////////////
    // Trim Sets

    /**
     * The evaluateTrimSets method.
     * @param {any} trimCurveDrawSets - The trimCurveDrawSets param.
     * @param {any} trimSetAtlasTextureSize - The trimSetAtlasTextureSize param.
     * @param {any} trimSetsAtlasLayoutData - The trimSetsAtlasLayoutData param.
     * @param {any} trimSetsAtlasLayoutTextureSize - The trimSetsAtlasLayoutTextureSize param.
     */
    evaluateTrimSets(
      trimCurveDrawSets,
      trimSetAtlasTextureSize,
      trimSetsAtlasLayoutData,
      trimSetsAtlasLayoutTextureSize
    ) {
      // console.log("evaluateTrimSets:" + trimSetAtlasTextureSize);
      const gl = this.__gl;

      {
        this.__trimSetsAtlasLayoutTexture = new zeaEngine.GLTexture2D(this.__gl, {
          format: 'RGBA',
          type: 'FLOAT',
          width: trimSetsAtlasLayoutTextureSize[0],
          height: trimSetsAtlasLayoutTextureSize[1],
          filter: 'NEAREST',
          wrap: 'CLAMP_TO_EDGE',
          mipMapped: false,
          data: trimSetsAtlasLayoutData
        });
      }

      if (!this.__trimSetAtlasTexture) {
        this.__trimSetAtlasTextureSize = trimSetAtlasTextureSize;

        if (
          this.__trimSetAtlasTextureSize[0] > this.__cadpassdata.maxTexSize ||
          this.__trimSetAtlasTextureSize[1] > this.__cadpassdata.maxTexSize
        ) {
          console.warn(
            'trimSetAtlas  is too big to fit in a texture. The image will be downsized:' +
              this.__trimSetAtlasTextureSize +
              ' maxTexSize:' +
              this.__cadpassdata.maxTexSize
          );
        }

        this.__trimSetAtlasMaskTexture = new zeaEngine.GLTexture2D(gl, {
          format: gl.name == 'webgl2' ? 'RG' : 'RGBA',
          type: 'UNSIGNED_BYTE',
          width: Math.min(this.__trimSetAtlasTextureSize[0], this.__cadpassdata.maxTexSize),
          height: Math.min(this.__trimSetAtlasTextureSize[1], this.__cadpassdata.maxTexSize),
          filter: 'NEAREST'
        });
        this.__trimSetAtlasMaskFbo = new zeaEngine.GLFbo(gl, this.__trimSetAtlasMaskTexture);
        this.__trimSetAtlasMaskFbo.setClearColor([0, 0, 0, 0]);

        // Multi-channel signed distance field
        // https://steamcdn-a.akamaihd.net/apps/valve/2007/SIGGRAPH2007_AlphaTestedMagnification.pdf
        // See: 4.3
        const format = gl.name == 'webgl2' ? 'RG' : 'RGBA';
        const filter = 'LINEAR';

        this.__trimSetAtlasTexture = new zeaEngine.GLTexture2D(gl, {
          format,
          type: 'UNSIGNED_BYTE',
          width: Math.min(this.__cadpassdata.maxTexSize, this.__trimSetAtlasTextureSize[0]),
          height: Math.min(this.__cadpassdata.maxTexSize, this.__trimSetAtlasTextureSize[1]),
          magFilter: filter,
          minFilter: filter
        });

        this.__trimSetAtlasFbo = new zeaEngine.GLFbo(gl, this.__trimSetAtlasTexture);
        this.__trimSetAtlasFbo.setClearColor([0, 0, 0, 0]);
      } else if (
        this.__trimSetAtlasTexture.width != trimSetAtlasTextureSize[0] ||
        this.__trimSetAtlasTexture.height != trimSetAtlasTextureSize[1]
      ) {
        this.__trimSetAtlasTextureSize = trimSetAtlasTextureSize;

        // Copy the previous image into a new one, and then destroy the prvious.
        this.__trimSetAtlasTexture.resize(trimSetAtlasTextureSize[0], trimSetAtlasTextureSize[1], true);
        this.__trimSetAtlasFbo.resize(); // hack to rebind the texture. Refactor the way textures are resized.

        // this.__trimSetAtlasFbo.bind();
      }

      const renderstate = {};

      // ////////////////////////////////////////////////
      // Render the mask aread using fans

      if (!this.trimCurveFansShader) {
        this.trimCurveFansShader = new GLDrawTrimCurveFansShader(gl);
        this.flattenTrimSetsShader = new GLFlattenTrimSetsShader(gl);
        this.trimCurveStripsShader = new GLDrawTrimCurveStripsShader(gl);
        this.debugTrimSetsShader = new GLDebugTrimSetsShader(gl);
      }

      this.__trimSetAtlasMaskFbo.bindAndClear();

      {
        // / Setup additive blending so that all rendering passes accumulate into the same Fbo.
        gl.enable(gl.BLEND);
        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFunc(gl.ONE, gl.ONE);

        this.trimCurveFansShader.bind(renderstate);
        const unifs = renderstate.unifs;

        this.__glCurvesLibrary.bindCurvesAtlas(renderstate);

        gl.uniform2i(
          unifs.trimSetAtlasTextureSize.location,
          this.__trimSetAtlasTextureSize[0],
          this.__trimSetAtlasTextureSize[1]
        );

        // For vertex welding (Not yet implemented)
        if (unifs.trimSetTexture) {
          this.__trimSetsTexture.bindToUniform(renderstate, unifs.trimSetTexture);
          if (unifs.trimSetTextureSize)
            gl.uniform2i(unifs.trimSetTextureSize.location, this.__trimSetsTexture.width, this.__trimSetsTexture.height);

          this.__trimSetsAtlasLayoutTexture.bindToUniform(renderstate, unifs.curvesAtlasLayoutTexture);
          if (unifs.curvesAtlasLayoutTextureSize)
            gl.uniform2i(
              unifs.curvesAtlasLayoutTextureSize.location,
              this.__trimSetsAtlasLayoutTexture.width,
              this.__trimSetsAtlasLayoutTexture.height
            );
        }

        for (const key in trimCurveDrawSets) {
          const detail = parseInt(key);
          if (detail < 0) continue
          let trimCurveDrawSet = this.__trimCurveDrawSets[key];
          if (!trimCurveDrawSet) {
            trimCurveDrawSet = new GLTrimCurveDrawSet(this.__gl, detail, trimCurveDrawSets[key]);
            this.__trimCurveDrawSets[key] = trimCurveDrawSet;
          }
          trimCurveDrawSet.drawFans(renderstate);
        }

        gl.disable(gl.BLEND);
      }

      // ////////////////////////////////////////////////////
      // Render the float texture as a signed distance field

      this.__trimSetAtlasFbo.bindAndClear();

      // if(false)
      {
        // /////////////////////////
        // Flatten the fans texture
        this.flattenTrimSetsShader.bind(renderstate);
        const unifs = renderstate.unifs;
        this.__trimSetAtlasMaskTexture.bindToUniform(renderstate, unifs.trimSetAtlasTexture);
        if (unifs.trimSetAtlasTextureSize)
          this.__gl.uniform2i(
            unifs.trimSetAtlasTextureSize.location,
            this.__trimSetAtlasTextureSize[0],
            this.__trimSetAtlasTextureSize[1]
          );
        this.__cadpassdata.glplanegeom.bind(renderstate);
        this.__cadpassdata.glplanegeom.draw();
      }

      // //////////////////////////////////////
      // Draw the Strips to clean up the edges
      // if(false)
      {
        this.trimCurveStripsShader.bind(renderstate);
        const unifs = renderstate.unifs;

        this.__glCurvesLibrary.bindCurvesAtlas(renderstate);

        gl.uniform2i(
          unifs.trimSetAtlasTextureSize.location,
          this.__trimSetAtlasTextureSize[0],
          this.__trimSetAtlasTextureSize[1]
        );
        gl.uniform1f(unifs.stripWidth.location, 1.25);

        // Initially a build up the data around the edges by rasterizing a full color pixel,
        // followed by a subtractive pass that cuts down the borders
        //
        // Initially, after the fans are rasterized.
        //     ----
        //  .  |  .
        //  .  |  .
        //     ----
        //
        // Becomes
        //  -------
        //  .     .
        //  .     .
        //  -------
        //
        // Becomes
        //    . ---
        //    ./
        //   /.
        //  -------
        // After the subtraction pass
        gl.uniform1i(unifs.flatten.location, 1);
        gl.disable(gl.BLEND);

        for (const key in trimCurveDrawSets) {
          const detail = parseInt(key);
          if (detail < 0) continue
          let trimCurveDrawSet = this.__trimCurveDrawSets[key];
          if (!trimCurveDrawSet) {
            trimCurveDrawSet = new GLTrimCurveDrawSet(this.__gl, detail, trimCurveDrawSets[key]);
            this.__trimCurveDrawSets[key] = trimCurveDrawSet;
          }
          trimCurveDrawSet.drawStrips(renderstate);
        }

        // Now subtract the gradient.
        gl.uniform1i(unifs.flatten.location, 0);
        gl.enable(gl.BLEND);
        gl.blendEquation(gl.MIN);
        gl.blendFunc(gl.ONE, gl.ONE);

        for (const key in trimCurveDrawSets) {
          const detail = parseInt(key);
          if (detail < 0) continue
          let trimCurveDrawSet = this.__trimCurveDrawSets[key];
          if (!trimCurveDrawSet) {
            trimCurveDrawSet = new GLTrimCurveDrawSet(this.__gl, detail, trimCurveDrawSets[key]);
            this.__trimCurveDrawSets[key] = trimCurveDrawSet;
          }
          trimCurveDrawSet.drawStrips(renderstate);
        }

        gl.disable(gl.BLEND);
      }

      for (const key in trimCurveDrawSets) {
        const trimCurveDrawSet = this.__trimCurveDrawSets[key];
        if (trimCurveDrawSet) trimCurveDrawSet.cleanup();
      }

      this.__trimSetsAtlasLayoutData = trimSetsAtlasLayoutData;
      // console.log("----------------------------------");
      // const st_x = Math.round(trimSetAtlasTextureSize[0] / 2)
      // const st_y = trimSetAtlasTextureSize[0] - 4;; //Math.round(trimSetAtlasTextureSize[1] / 2)
      // gl.finish();
      // this.logTrimSet(0);

      gl.finish();
    }

    /**
     * The logTrimSetMask method.
     * @param {any} trimSetId - The trimSetId param.
     */
    logTrimSetMask(trimSetId) {
      const gl = this.__gl;
      this.__trimSetAtlasMaskFbo.bind();
      const layout = [
        this.__trimSetsAtlasLayoutData[trimSetId * 4 + 0],
        this.__trimSetsAtlasLayoutData[trimSetId * 4 + 1],
        this.__trimSetsAtlasLayoutData[trimSetId * 4 + 2],
        this.__trimSetsAtlasLayoutData[trimSetId * 4 + 3]
      ];
      console.log('logTrimSetMask ' + trimSetId + ':[' + layout[0] + ',' + layout[1] + ']:' + layout[2] + 'x' + layout[3]);
      const pixels = new Uint8Array(layout[2] * 4);
      for (let i = 0; i < layout[3]; i++) {
        gl.readPixels(
          layout[0],
          layout[1] + i,
          layout[2],
          1,
          gl.name == 'webgl2' ? gl.RED : gl.RGBA,
          gl.UNSIGNED_BYTE,
          pixels
        );
        let line = i + ' ';
        for (let j = 0; j < layout[2]; j++) {
          // line += (pixels[j * 4] % 2 == 0 ? '-' : '*');
          line += pixels[j * 4];
        }
        console.log(line);
      }
    }

    /**
     * The logTrimSet method.
     * @param {any} trimSetId - The trimSetId param.
     */
    logTrimSet(trimSetId) {
      const gl = this.__gl;
      this.__trimSetAtlasFbo.bind();
      const layout = [
        this.__trimSetsAtlasLayoutData[trimSetId * 4 + 0],
        this.__trimSetsAtlasLayoutData[trimSetId * 4 + 1],
        this.__trimSetsAtlasLayoutData[trimSetId * 4 + 2],
        this.__trimSetsAtlasLayoutData[trimSetId * 4 + 3]
      ];
      console.log('logTrimSet ' + trimSetId + ':[' + layout[0] + ',' + layout[1] + ']:' + layout[2] + 'x' + layout[3]);
      const pixels = new Uint16Array(layout[2] * 4);
      for (let i = 0; i < layout[3]; i++) {
        gl.readPixels(layout[0], layout[1] + i, layout[2], 1, gl.RGBA, gl.HALF_FLOAT, pixels);
        let line = i + ' ';
        for (let j = 0; j < layout[2]; j++) {
          // line += (pixels[j * 4] % 2 == 0 ? '-' : '*');
          line += pixels[j * 4];
        }
        console.log(line);
      }
    }

    /**
     * The bindTrimSetAtlas method.
     * @param {any} renderstate - The renderstate param.
     */
    bindTrimSetAtlas(renderstate) {
      const gl = this.__gl;
      const unifs = renderstate.unifs;
      const { trimSetAtlasTexture, trimSetAtlasTextureSize } = unifs;
      if (this.__trimSetAtlasTexture && trimSetAtlasTexture) {
        this.__trimSetAtlasTexture.bindToUniform(renderstate, trimSetAtlasTexture);
        if (trimSetAtlasTextureSize) {
          gl.uniform2i(
            trimSetAtlasTextureSize.location,
            this.__trimSetAtlasTextureSize[0],
            this.__trimSetAtlasTextureSize[1]
          );
        }

        if (this.ext_filter_anisotropic) {
          // Disable anisotropic filtering on this texture.
          gl.texParameterf(gl.TEXTURE_2D, this.ext_filter_anisotropic.TEXTURE_MAX_ANISOTROPY_EXT, 1.0);
        }
      }
    }

    /**
     * The bindTrimSetAtlasLayout method.
     * @param {any} renderstate - The renderstate param.
     */
    bindTrimSetAtlasLayout(renderstate) {
      // During debugging, we disable trim sets.
      if (!this.__trimSetsAtlasLayoutTexture) return
      const gl = this.__gl;
      const unifs = renderstate.unifs;
      this.__trimSetsAtlasLayoutTexture.bindToUniform(renderstate, unifs.trimSetsAtlasLayoutTexture);
      gl.uniform2i(
        unifs.trimSetsAtlasLayoutTextureSize.location,
        this.__trimSetsAtlasLayoutTexture.width,
        this.__trimSetsAtlasLayoutTexture.height
      );
    }

    /**
     * The drawTrimSets method.
     * @param {any} renderstate - The renderstate param.
     * @return {boolean} - The return value.
     */
    drawTrimSets(renderstate) {
      if (!this.__trimSetAtlasTexture || !this.debugTrimSetsShader.bind(renderstate)) return false
      // this.bindTrimSetAtlas(renderstate);

      this.__trimSetAtlasTexture.bindToUniform(renderstate, renderstate.unifs.trimSetAtlasTexture);
      this.__cadpassdata.glplanegeom.bind(renderstate);
      this.__cadpassdata.glplanegeom.draw();
    }

    /**
     * The destroy method.
     */
    destroy() {
      this.__trimSetsTexture.destroy();
      if (this.__trimSetsAtlasLayoutTexture) {
        this.__trimSetsAtlasLayoutTexture.destroy();
        this.__trimSetAtlasMaskTexture.destroy();
        this.__trimSetAtlasMaskFbo.destroy();
        this.__trimSetAtlasTexture.destroy();
        this.__trimSetAtlasFbo.destroy();
      }
    }
  }

  /* eslint-disable require-jsdoc */

  /** Class representing a GLCADBody.
   * @ignore
   */
  class GLCADBody extends zeaEngine.EventEmitter {
    constructor(cadBody, bodyId) {
      super();
      this.cadBody = cadBody;
      this.bodyId = bodyId;
      this.flags = 0;

      this.dirtyValues = new Set();
    }

    bind(
      cadpassdata,
      sceneBodyItemData,
      cadBodyTextureData,
      bodyItemDataChanged,
      highlightedBodies,
      highlightChangeBatch,
      pushhighlightChangeBatchToWorker
    ) {
      this.cadBodyTextureData = cadBodyTextureData;

      const cadBodyDescAddr = this.cadBody.getBodyDataTexelCoords();

      // const offset = bodyId * floatsPerSceneBody
      if (!this.cadBody.isVisible()) this.flags |= BODY_FLAG_INVISIBLE;

      if (this.cadBody.isCutawayEnabled && this.cadBody.isCutawayEnabled()) {
        this.flags |= BODY_FLAG_CUTAWAY;
      }

      const material = this.cadBody.getMaterial();

      const shaderId = cadpassdata.genShaderID(material.getShaderName());
      // console.log('Shader:' + material.getShaderName() + ':' + shaderId);
      let glmaterialcoords = material.getMetadata('glmaterialcoords');
      if (!glmaterialcoords) {
        glmaterialcoords = cadpassdata.materialLibrary.addMaterial(material);
      }

      sceneBodyItemData[0] = this.cadBody.getBodyDescId();
      sceneBodyItemData[1] = shaderId;

      cadBodyTextureData[0] = this.cadBody.getBodyDescId();
      cadBodyTextureData[1] = this.flags;
      cadBodyTextureData[2] = cadBodyDescAddr.x;
      cadBodyTextureData[3] = cadBodyDescAddr.y;

      cadBodyTextureData[4] = glmaterialcoords.x;
      cadBodyTextureData[5] = glmaterialcoords.y;

      this.visibilityChanged = () => {
        // TODO: Actually modify the draw sets for each visibility chage.
        // It should be similar to hilight changes.
        const visibile = this.cadBody.isVisible();
        if (!visibile) {
          if ((this.flags & BODY_FLAG_INVISIBLE) == 0) {
            this.flags |= BODY_FLAG_INVISIBLE;
            this.cadBodyTextureData[1] = this.flags;
            bodyItemDataChanged(this.bodyId);
          }
        } else {
          if ((this.flags & BODY_FLAG_INVISIBLE) != 0) {
            this.flags &= ~BODY_FLAG_INVISIBLE;
            this.cadBodyTextureData[1] = this.flags;
            bodyItemDataChanged(this.bodyId);
          }
        }
      };
      this.cadBody.on('visibilityChanged', this.visibilityChanged);

      this.materialChanged = () => {
        const material = this.cadBody.getMaterial();
        let glmaterialcoords = material.getMetadata('glmaterialcoords');
        if (!glmaterialcoords) {
          glmaterialcoords = cadpassdata.materialLibrary.addMaterial(material);
        }
        cadBodyTextureData[4] = glmaterialcoords.x;
        cadBodyTextureData[5] = glmaterialcoords.y;
        bodyItemDataChanged(this.bodyId);
      };
      this.cadBody.getParameter('Material').on('valueChanged', this.materialChanged);

      // /////////////////////////////////
      // Body Xfo
      this.globalXfoParam = this.cadBody.getParameter('GlobalXfo');
      this.updateXfo();
      this.globalXfoChanged = () => {
        bodyItemDataChanged(this.bodyId);
        this.dirtyValues.add('Xfo');
      };
      this.globalXfoParam.on('valueChanged', this.globalXfoChanged);

      // /////////////////////////////////
      // Highlight
      if (this.cadBody.isHighlighted()) {
        this.updateHighlightColor();
        highlightedBodies.push(this.bodyId);
      }

      this.highlightChanged = () => {
        if (!highlightChangeBatch.dirty) {
          setTimeout(pushhighlightChangeBatchToWorker, 1);
          highlightChangeBatch.dirty = true;
        }
        const highlighted = this.cadBody.isHighlighted();
        if (highlighted) {
          this.dirtyValues.add('Highlight');
          bodyItemDataChanged(this.bodyId);
          if (highlightedBodies.indexOf(this.bodyId) == -1) {
            highlightedBodies.push(this.bodyId);

            // Note: filter out highlight/unhighlight in a single update.
            const indexInSelChangeSet = highlightChangeBatch.unhighlightedBodyIds.indexOf(this.bodyId);
            if (indexInSelChangeSet != -1) {
              highlightChangeBatch.unhighlightedBodyIds.splice(indexInSelChangeSet, 1);
            } else {
              highlightChangeBatch.highlightedBodyIds.push(this.bodyId);
            }
          }
        } else {
          const index = highlightedBodies.indexOf(this.bodyId);
          if (index != -1) {
            highlightedBodies.splice(index, 1);

            // Note: filter out highlight/unhighlight in a single update.
            const indexInSelChangeSet = highlightChangeBatch.highlightedBodyIds.indexOf(this.bodyId);
            if (indexInSelChangeSet != -1) {
              highlightChangeBatch.highlightedBodyIds.splice(indexInSelChangeSet, 1);
            } else {
              highlightChangeBatch.unhighlightedBodyIds.push(this.bodyId);
            }
          }
        }
      };
      this.cadBody.on('highlightChanged', this.highlightChanged);

      // /////////////////////////////////
      // Body Cut Plane
      this.updateCutaway();
      this.cutAwayChangedId = this.cadBody.on('cutAwayChanged', () => {
        bodyItemDataChanged(this.bodyId);
        this.dirtyValues.add('Cutaway');
      });
    }

    updateCutaway() {
      const cpoff = 24;
      if (this.cadBody.isCutawayEnabled()) {
        if (!(this.flags & BODY_FLAG_CUTAWAY)) {
          this.flags |= BODY_FLAG_CUTAWAY;
          this.cadBodyTextureData[1] = this.flags;
        }

        const cutPlane = this.cadBody.getCutVector();
        const cutPlaneDist = this.cadBody.getCutDist();
        this.cadBodyTextureData[cpoff + 0] = cutPlane.x;
        this.cadBodyTextureData[cpoff + 1] = cutPlane.y;
        this.cadBodyTextureData[cpoff + 2] = cutPlane.z;
        this.cadBodyTextureData[cpoff + 3] = cutPlaneDist;
      } else {
        if (this.flags & BODY_FLAG_CUTAWAY) {
          this.flags &= ~BODY_FLAG_CUTAWAY;
          this.cadBodyTextureData[1] = this.flags;
        }
      }
    }

    updateHighlightColor() {
      const highlight = this.cadBody.getHighlight();
      if (highlight) {
        const hoff = 20;
        this.cadBodyTextureData[hoff + 0] = highlight.r;
        this.cadBodyTextureData[hoff + 1] = highlight.g;
        this.cadBodyTextureData[hoff + 2] = highlight.b;
        this.cadBodyTextureData[hoff + 3] = highlight.a;
      }
    }

    updateXfo() {
      const bodyXfo = this.globalXfoParam.getValue();

      const off = 8;
      this.cadBodyTextureData[off + 0] = bodyXfo.tr.x;
      this.cadBodyTextureData[off + 1] = bodyXfo.tr.y;
      this.cadBodyTextureData[off + 2] = bodyXfo.tr.z;
      // this.cadBodyTextureData[off + 3]
      this.cadBodyTextureData[off + 4] = bodyXfo.ori.x;
      this.cadBodyTextureData[off + 5] = bodyXfo.ori.y;
      this.cadBodyTextureData[off + 6] = bodyXfo.ori.z;
      this.cadBodyTextureData[off + 7] = bodyXfo.ori.w;
      this.cadBodyTextureData[off + 8] = bodyXfo.sc.x;
      this.cadBodyTextureData[off + 9] = bodyXfo.sc.y;
      this.cadBodyTextureData[off + 10] = bodyXfo.sc.z;
    }

    updateCadBodyTex() {
      this.dirtyValues.forEach((key) => {
        if (key == 'Xfo') this.updateXfo();
        else if (key == 'Highlight') this.updateHighlightColor();
        else if (key == 'Cutaway') this.updateCutaway();
      });
      this.dirtyValues.clear();
    }

    destroy() {
      this.cadBody.off('visibilityChanged', this.visibilityChanged);
      if (this.cadBody.cutAwayChanged) {
        this.cadBody.off('cutAwayChanged', this.cutAwayChangedId);
      } else {
        const cutParam = this.cadBody.getParameter('CutawayEnabled');
        if (cutParam) {
          cutParam.off('valueChanged', this.cutAwayEnabledId);
        }
      }
      this.cadBody.getParameter('Material').off('valueChanged', this.materialChanged);
      this.cadBody.getParameter('GlobalXfo').off('valueChanged', this.globalXfoChanged);
      this.cadBody.off('highlightChanged', this.highlightChanged);
    }
  }

  const kIsNodeJS = Object.prototype.toString.call(typeof process !== 'undefined' ? process : 0) === '[object process]';
  const kRequire = kIsNodeJS && typeof module.require === 'function' ? module.require : null; // eslint-disable-line

  function browserDecodeBase64(base64, enableUnicode) {
      const binaryString = atob(base64);
      if (enableUnicode) {
          const binaryView = new Uint8Array(binaryString.length);
          Array.prototype.forEach.call(binaryView, (el, idx, arr) => {
              arr[idx] = binaryString.charCodeAt(idx);
          });
          return String.fromCharCode.apply(null, new Uint16Array(binaryView.buffer));
      }
      return binaryString;
  }

  function nodeDecodeBase64(base64, enableUnicode) {
      return Buffer.from(base64, 'base64').toString(enableUnicode ? 'utf16' : 'utf8');
  }

  function createBase64WorkerFactory(base64, sourcemap = null, enableUnicode = false) {
      const source = kIsNodeJS ? nodeDecodeBase64(base64, enableUnicode) : browserDecodeBase64(base64, enableUnicode);
      const start = source.indexOf('\n', 10) + 1;
      const body = source.substring(start) + (sourcemap ? `\/\/# sourceMappingURL=${sourcemap}` : '');

      if (kRequire) {
          /* node.js */
          const Worker = kRequire('worker_threads').Worker; // eslint-disable-line
          return function WorkerFactory(options) {
              return new Worker(body, Object.assign({}, options, { eval: true }));
          };
      }

      /* browser */
      const blob = new Blob([body], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      return function WorkerFactory(options) {
          return new Worker(url, options);
      };
  }

  /* eslint-disable */
  var WorkerFactory = createBase64WorkerFactory('Lyogcm9sbHVwLXBsdWdpbi13ZWItd29ya2VyLWxvYWRlciAqLwovLyBUYWtlbiBmcm9tIGhlcmU6IGh0dHBzOi8vZ2l0aHViLmNvbS9qYWtlc2dvcmRvbi9iaW4tcGFja2luZy9ibG9iL21hc3Rlci9qcy9wYWNrZXIuZ3Jvd2luZy5qcw0KDQovKiogKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKg0KDQpUaGlzIGlzIGEgYmluYXJ5IHRyZWUgYmFzZWQgYmluIHBhY2tpbmcgYWxnb3JpdGhtIHRoYXQgaXMgbW9yZSBjb21wbGV4IHRoYW4NCnRoZSBzaW1wbGUgUGFja2VyIChwYWNrZXIuanMpLiBJbnN0ZWFkIG9mIHN0YXJ0aW5nIG9mZiB3aXRoIGEgZml4ZWQgd2lkdGggYW5kDQpoZWlnaHQsIGl0IHN0YXJ0cyB3aXRoIHRoZSB3aWR0aCBhbmQgaGVpZ2h0IG9mIHRoZSBmaXJzdCBibG9jayBwYXNzZWQgYW5kIHRoZW4NCmdyb3dzIGFzIG5lY2Vzc2FyeSB0byBhY2NvbW9kYXRlIGVhY2ggc3Vic2VxdWVudCBibG9jay4gQXMgaXQgZ3Jvd3MgaXQgYXR0ZW1wdHMNCnRvIG1haW50YWluIGEgcm91Z2hseSBzcXVhcmUgcmF0aW8gYnkgbWFraW5nICdzbWFydCcgY2hvaWNlcyBhYm91dCB3aGV0aGVyIHRvDQpncm93IHJpZ2h0IG9yIGRvd24uDQoNCldoZW4gZ3Jvd2luZywgdGhlIGFsZ29yaXRobSBjYW4gb25seSBncm93IHRvIHRoZSByaWdodCBPUiBkb3duLiBUaGVyZWZvcmUsIGlmDQp0aGUgbmV3IGJsb2NrIGlzIEJPVEggd2lkZXIgYW5kIHRhbGxlciB0aGFuIHRoZSBjdXJyZW50IHRhcmdldCB0aGVuIGl0IHdpbGwgYmUNCnJlamVjdGVkLiBUaGlzIG1ha2VzIGl0IHZlcnkgaW1wb3J0YW50IHRvIGluaXRpYWxpemUgd2l0aCBhIHNlbnNpYmxlIHN0YXJ0aW5nDQp3aWR0aCBhbmQgaGVpZ2h0LiBJZiB5b3UgYXJlIHByb3ZpZGluZyBzb3J0ZWQgaW5wdXQgKGxhcmdlc3QgZmlyc3QpIHRoZW4gdGhpcw0Kd2lsbCBub3QgYmUgYW4gaXNzdWUuDQoNCkEgcG90ZW50aWFsIHdheSB0byBzb2x2ZSB0aGlzIGxpbWl0YXRpb24gd291bGQgYmUgdG8gYWxsb3cgZ3Jvd3RoIGluIEJPVEgNCmRpcmVjdGlvbnMgYXQgb25jZSwgYnV0IHRoaXMgcmVxdWlyZXMgbWFpbnRhaW5pbmcgYSBtb3JlIGNvbXBsZXggdHJlZQ0Kd2l0aCAzIGNoaWxkcmVuIChkb3duLCByaWdodCBhbmQgY2VudGVyKSBhbmQgdGhhdCBjb21wbGV4aXR5IGNhbiBiZSBhdm9pZGVkDQpieSBzaW1wbHkgY2hvc2luZyBhIHNlbnNpYmxlIHN0YXJ0aW5nIGJsb2NrLg0KDQpCZXN0IHJlc3VsdHMgb2NjdXIgd2hlbiB0aGUgaW5wdXQgYmxvY2tzIGFyZSBzb3J0ZWQgYnkgaGVpZ2h0LCBvciBldmVuIGJldHRlcg0Kd2hlbiBzb3J0ZWQgYnkgbWF4KHdpZHRoLGhlaWdodCkuDQoNCklucHV0czoNCi0tLS0tLQ0KDQogIGJsb2NrczogYXJyYXkgb2YgYW55IG9iamVjdHMgdGhhdCBoYXZlIC53IGFuZCAuaCBhdHRyaWJ1dGVzDQoNCk91dHB1dHM6DQotLS0tLS0tDQoNCiAgbWFya3MgZWFjaCBibG9jayB0aGF0IGZpdHMgd2l0aCBhIC5maXQgYXR0cmlidXRlIHBvaW50aW5nIHRvIGENCiAgbm9kZSB3aXRoIC54IGFuZCAueSBjb29yZGluYXRlcw0KDQpFeGFtcGxlOg0KLS0tLS0tLQ0KDQogIHZhciBibG9ja3MgPSBbDQogICAgeyB3OiAxMDAsIGg6IDEwMCB9LA0KICAgIHsgdzogMTAwLCBoOiAxMDAgfSwNCiAgICB7IHc6ICA4MCwgaDogIDgwIH0sDQogICAgeyB3OiAgODAsIGg6ICA4MCB9LA0KICAgIGV0Yw0KICAgIGV0Yw0KICBdOw0KDQogIHZhciBwYWNrZXIgPSBuZXcgR3Jvd2luZ1BhY2tlcigpOw0KICBwYWNrZXIuZml0KGJsb2Nrcyk7DQoNCiAgZm9yKHZhciBuID0gMCA7IG4gPCBibG9ja3MubGVuZ3RoIDsgbisrKSB7DQogICAgdmFyIGJsb2NrID0gYmxvY2tzW25dOw0KICAgIGlmIChibG9jay5maXQpIHsNCiAgICAgIERyYXcoYmxvY2suZml0LngsIGJsb2NrLmZpdC55LCBibG9jay53LCBibG9jay5oKTsNCiAgICB9DQogIH0NCg0KDQoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovDQoNCi8qKiBDbGFzcyByZXByZXNlbnRpbmcgYSBncm93aW5nIHBhY2tlci4NCiAqIEBpZ25vcmUNCiAqLw0KY2xhc3MgR3Jvd2luZ1BhY2tlciB7DQogIC8qKg0KICAgKiBDcmVhdGUgYSBncm93aW5nIHBhY2tlci4NCiAgICogQHBhcmFtIHtudW1iZXJ9IHcgLSBUaGUgdyB2YWx1ZS4NCiAgICogQHBhcmFtIHtudW1iZXJ9IGggLSBUaGUgaCB2YWx1ZS4NCiAgICovDQogIGNvbnN0cnVjdG9yKHcgPSAwLCBoID0gMCkgew0KICAgIHRoaXMucm9vdCA9IHsNCiAgICAgIHg6IDAsDQogICAgICB5OiAwLA0KICAgICAgdzogdywNCiAgICAgIGg6IGgsDQogICAgfTsNCiAgfQ0KDQogIC8qKg0KICAgKiBUaGUgZml0IG1ldGhvZC4NCiAgICogQHBhcmFtIHthbnl9IGJsb2NrcyAtIFRoZSBibG9ja3MgcGFyYW0uDQogICAqLw0KICBmaXQoYmxvY2tzKSB7DQogICAgY29uc3QgbGVuID0gYmxvY2tzLmxlbmd0aDsNCiAgICBpZiAobGVuID09IDApIHJldHVybg0KICAgIGlmICh0aGlzLnJvb3QudyA8IGJsb2Nrc1swXS53KSB7DQogICAgICB0aGlzLnJvb3QudyA9IGJsb2Nrc1swXS53Ow0KICAgIH0NCiAgICBpZiAodGhpcy5yb290LmggPCBibG9ja3NbMF0uaCkgew0KICAgICAgdGhpcy5yb290LmggPSBibG9ja3NbMF0uaDsNCiAgICB9DQogICAgY29uc3QgZWFjaEJsb2NrID0gKGJsb2NrKSA9PiB7DQogICAgICBibG9jay5maXQgPSB0aGlzLl9fYWRkQmxvY2soYmxvY2spOw0KICAgIH07DQogICAgYmxvY2tzLmZvckVhY2goZWFjaEJsb2NrKTsNCiAgfQ0KDQogIC8qKg0KICAgKiBUaGUgX19hZGRCbG9jayBtZXRob2QuDQogICAqIEBwYXJhbSB7YW55fSBibG9jayAtIFRoZSBibG9ja3MgcGFyYW0uDQogICAqIEByZXR1cm4ge2FueX0gLSBUaGUgcmV0dXJuIHZhbHVlLg0KICAgKiBAcHJpdmF0ZQ0KICAgKi8NCiAgX19hZGRCbG9jayhibG9jaykgew0KICAgIGNvbnN0IG5vZGUgPSB0aGlzLmZpbmROb2RlKHRoaXMucm9vdCwgYmxvY2sudywgYmxvY2suaCk7DQogICAgaWYgKG5vZGUpIHJldHVybiB0aGlzLnNwbGl0Tm9kZShub2RlLCBibG9jay53LCBibG9jay5oKQ0KICAgIGVsc2UgcmV0dXJuIHRoaXMuZ3Jvd05vZGUoYmxvY2sudywgYmxvY2suaCkNCiAgfQ0KDQogIC8qKg0KICAgKiBUaGUgYWRkQmxvY2sgbWV0aG9kLg0KICAgKiBAcGFyYW0ge2FueX0gYmxvY2sgLSBUaGUgYmxvY2tzIHBhcmFtLg0KICAgKiBAcmV0dXJuIHthbnl9IC0gVGhlIHJldHVybiB2YWx1ZS4NCiAgICovDQogIGFkZEJsb2NrKGJsb2NrKSB7DQogICAgLy8gSW5pdGlhbGlzZSB0aGUgdHJlZSBpZiBhZGRpbmcgZmlyc3QgYmxvY2suDQogICAgaWYgKCF0aGlzLnJvb3QudXNlZCkgew0KICAgICAgaWYgKHRoaXMucm9vdC53IDwgYmxvY2sudykgdGhpcy5yb290LncgPSBibG9jay53Ow0KICAgICAgaWYgKHRoaXMucm9vdC5oIDwgYmxvY2suaCkgdGhpcy5yb290LmggPSBibG9jay5oOw0KICAgIH0NCiAgICBjb25zdCBub2RlID0gdGhpcy5maW5kTm9kZSh0aGlzLnJvb3QsIGJsb2NrLncsIGJsb2NrLmgpOw0KICAgIGlmIChub2RlKSByZXR1cm4gdGhpcy5zcGxpdE5vZGUobm9kZSwgYmxvY2sudywgYmxvY2suaCkNCiAgICBlbHNlIHJldHVybiB0aGlzLmdyb3dOb2RlKGJsb2NrLncsIGJsb2NrLmgpDQogIH0NCg0KICAvKioNCiAgICogVGhlIGZpbmROb2RlIG1ldGhvZC4NCiAgICogQHBhcmFtIHthbnl9IHJvb3QgLSBUaGUgcm9vdCBwYXJhbS4NCiAgICogQHBhcmFtIHtudW1iZXJ9IHcgLSBUaGUgdyBwYXJhbS4NCiAgICogQHBhcmFtIHtudW1iZXJ9IGggLSBUaGUgaCBwYXJhbS4NCiAgICogQHJldHVybiB7YW55fSAtIFRoZSByZXR1cm4gdmFsdWUuDQogICAqLw0KICBmaW5kTm9kZShyb290LCB3LCBoKSB7DQogICAgaWYgKHJvb3QudXNlZCkgcmV0dXJuIHRoaXMuZmluZE5vZGUocm9vdC5yaWdodCwgdywgaCkgfHwgdGhpcy5maW5kTm9kZShyb290LmRvd24sIHcsIGgpDQogICAgZWxzZSBpZiAodyA8PSByb290LncgJiYgaCA8PSByb290LmgpIHJldHVybiByb290DQogICAgZWxzZSByZXR1cm4gbnVsbA0KICB9DQoNCiAgLyoqDQogICAqIFRoZSBzcGxpdE5vZGUgbWV0aG9kLg0KICAgKiBAcGFyYW0ge2FueX0gbm9kZSAtIFRoZSBub2RlIHBhcmFtLg0KICAgKiBAcGFyYW0ge251bWJlcn0gdyAtIFRoZSB3IHBhcmFtLg0KICAgKiBAcGFyYW0ge251bWJlcn0gaCAtIFRoZSBoIHBhcmFtLg0KICAgKiBAcmV0dXJuIHthbnl9IC0gVGhlIHJldHVybiB2YWx1ZS4NCiAgICovDQogIHNwbGl0Tm9kZShub2RlLCB3LCBoKSB7DQogICAgbm9kZS51c2VkID0gdHJ1ZTsNCiAgICBub2RlLmRvd24gPSB7DQogICAgICB4OiBub2RlLngsDQogICAgICB5OiBub2RlLnkgKyBoLA0KICAgICAgdzogbm9kZS53LA0KICAgICAgaDogbm9kZS5oIC0gaCwNCiAgICB9Ow0KICAgIG5vZGUucmlnaHQgPSB7DQogICAgICB4OiBub2RlLnggKyB3LA0KICAgICAgeTogbm9kZS55LA0KICAgICAgdzogbm9kZS53IC0gdywNCiAgICAgIGg6IGgsDQogICAgfTsNCiAgICByZXR1cm4gbm9kZQ0KICB9DQoNCiAgLyoqDQogICAqIFRoZSBncm93Tm9kZSBtZXRob2QuDQogICAqIEBwYXJhbSB7bnVtYmVyfSB3IC0gVGhlIHcgcGFyYW0uDQogICAqIEBwYXJhbSB7bnVtYmVyfSBoIC0gVGhlIGggcGFyYW0uDQogICAqIEByZXR1cm4ge2FueX0gLSBUaGUgcmV0dXJuIHZhbHVlLg0KICAgKi8NCiAgZ3Jvd05vZGUodywgaCkgew0KICAgIGNvbnN0IGNhbkdyb3dEb3duID0gdyA8PSB0aGlzLnJvb3QudzsNCiAgICBjb25zdCBjYW5Hcm93UmlnaHQgPSBoIDw9IHRoaXMucm9vdC5oOw0KDQogICAgY29uc3Qgc2hvdWxkR3Jvd1JpZ2h0ID0gY2FuR3Jvd1JpZ2h0ICYmIHRoaXMucm9vdC5oID49IHRoaXMucm9vdC53ICsgdzsgLy8gYXR0ZW1wdCB0byBrZWVwIHNxdWFyZS1pc2ggYnkgZ3Jvd2luZyByaWdodCB3aGVuIGhlaWdodCBpcyBtdWNoIGdyZWF0ZXIgdGhhbiB3aWR0aA0KICAgIGNvbnN0IHNob3VsZEdyb3dEb3duID0gY2FuR3Jvd0Rvd24gJiYgdGhpcy5yb290LncgPj0gdGhpcy5yb290LmggKyBoOyAvLyBhdHRlbXB0IHRvIGtlZXAgc3F1YXJlLWlzaCBieSBncm93aW5nIGRvd24gIHdoZW4gd2lkdGggIGlzIG11Y2ggZ3JlYXRlciB0aGFuIGhlaWdodA0KDQogICAgaWYgKHNob3VsZEdyb3dSaWdodCkgcmV0dXJuIHRoaXMuZ3Jvd1JpZ2h0KHcsIGgpDQogICAgZWxzZSBpZiAoc2hvdWxkR3Jvd0Rvd24pIHJldHVybiB0aGlzLmdyb3dEb3duKHcsIGgpDQogICAgZWxzZSBpZiAoY2FuR3Jvd1JpZ2h0KSByZXR1cm4gdGhpcy5ncm93UmlnaHQodywgaCkNCiAgICBlbHNlIGlmIChjYW5Hcm93RG93bikgcmV0dXJuIHRoaXMuZ3Jvd0Rvd24odywgaCkNCiAgICBlbHNlIHJldHVybiBudWxsIC8vIG5lZWQgdG8gZW5zdXJlIHNlbnNpYmxlIHJvb3Qgc3RhcnRpbmcgc2l6ZSB0byBhdm9pZCB0aGlzIGhhcHBlbmluZw0KICB9DQoNCiAgLyoqDQogICAqIFRoZSBncm93UmlnaHQgbWV0aG9kLg0KICAgKiBAcGFyYW0ge251bWJlcn0gdyAtIFRoZSB3IHBhcmFtLg0KICAgKiBAcGFyYW0ge251bWJlcn0gaCAtIFRoZSBoIHBhcmFtLg0KICAgKiBAcmV0dXJuIHthbnl9IC0gVGhlIHJldHVybiB2YWx1ZS4NCiAgICovDQogIGdyb3dSaWdodCh3LCBoKSB7DQogICAgdGhpcy5yb290ID0gew0KICAgICAgdXNlZDogdHJ1ZSwNCiAgICAgIHg6IDAsDQogICAgICB5OiAwLA0KICAgICAgdzogdGhpcy5yb290LncgKyB3LA0KICAgICAgaDogdGhpcy5yb290LmgsDQogICAgICBkb3duOiB0aGlzLnJvb3QsDQogICAgICByaWdodDogew0KICAgICAgICB4OiB0aGlzLnJvb3QudywNCiAgICAgICAgeTogMCwNCiAgICAgICAgdzogdywNCiAgICAgICAgaDogdGhpcy5yb290LmgsDQogICAgICB9LA0KICAgIH07DQogICAgY29uc3Qgbm9kZSA9IHRoaXMuZmluZE5vZGUodGhpcy5yb290LCB3LCBoKTsNCiAgICBsZXQgcmVzOw0KICAgIGlmIChub2RlKSByZXMgPSB0aGlzLnNwbGl0Tm9kZShub2RlLCB3LCBoKTsNCiAgICByZXR1cm4gcmVzDQogIH0NCg0KICAvKioNCiAgICogVGhlIGdyb3dEb3duIG1ldGhvZC4NCiAgICogQHBhcmFtIHtudW1iZXJ9IHcgLSBUaGUgdyBwYXJhbS4NCiAgICogQHBhcmFtIHtudW1iZXJ9IGggLSBUaGUgaCBwYXJhbS4NCiAgICogQHJldHVybiB7YW55fSAtIFRoZSByZXR1cm4gdmFsdWUuDQogICAqLw0KICBncm93RG93bih3LCBoKSB7DQogICAgdGhpcy5yb290ID0gew0KICAgICAgdXNlZDogdHJ1ZSwNCiAgICAgIHg6IDAsDQogICAgICB5OiAwLA0KICAgICAgdzogdGhpcy5yb290LncsDQogICAgICBoOiB0aGlzLnJvb3QuaCArIGgsDQogICAgICBkb3duOiB7DQogICAgICAgIHg6IDAsDQogICAgICAgIHk6IHRoaXMucm9vdC5oLA0KICAgICAgICB3OiB0aGlzLnJvb3QudywNCiAgICAgICAgaDogaCwNCiAgICAgIH0sDQogICAgICByaWdodDogdGhpcy5yb290LA0KICAgIH07DQogICAgY29uc3Qgbm9kZSA9IHRoaXMuZmluZE5vZGUodGhpcy5yb290LCB3LCBoKTsNCiAgICBsZXQgcmVzOw0KICAgIGlmIChub2RlKSByZXMgPSB0aGlzLnNwbGl0Tm9kZShub2RlLCB3LCBoKTsNCiAgICByZXR1cm4gcmVzDQogIH0NCn0KCi8vIGltcG9ydCB7DQovLyAgICAgVmVjMiwNCi8vICAgICBWZWMzLA0KLy8gICAgIFF1YXQsDQovLyAgICAgQ29sb3IsDQovLyAgICAgQm94MiwNCi8vICAgICBCb3gzDQovLyB9IGZyb20gJy4uL01hdGgnOw0KDQpjb25zdCBkZWNvZGUxNkJpdEZsb2F0ID0gKGgpID0+IHsNCiAgY29uc3QgcyA9IChoICYgMHg4MDAwKSA+PiAxNTsNCiAgY29uc3QgZSA9IChoICYgMHg3YzAwKSA+PiAxMDsNCiAgY29uc3QgZiA9IGggJiAweDAzZmY7DQoNCiAgaWYgKGUgPT0gMCkgew0KICAgIHJldHVybiAocyA/IC0xIDogMSkgKiBNYXRoLnBvdygyLCAtMTQpICogKGYgLyBNYXRoLnBvdygyLCAxMCkpDQogIH0gZWxzZSBpZiAoZSA9PSAweDFmKSB7DQogICAgcmV0dXJuIGYgPyBOYU4gOiAocyA/IC0xIDogMSkgKiBJbmZpbml0eQ0KICB9DQoNCiAgcmV0dXJuIChzID8gLTEgOiAxKSAqIE1hdGgucG93KDIsIGUgLSAxNSkgKiAoMSArIGYgLyBNYXRoLnBvdygyLCAxMCkpDQp9Ow0KDQovKiogQ2xhc3MgcmVwcmVzZW50aW5nIGEgYmluIHJlYWRlci4NCiAqIEBpZ25vcmUNCiAqLw0KY2xhc3MgQmluUmVhZGVyIHsNCiAgLyoqDQogICAqIENyZWF0ZSBhIGJpbiByZWFkZXIuDQogICAqIEBwYXJhbSB7QnVmZmVyfSBkYXRhIC0gVGhlIGRhdGEgYnVmZmVyLg0KICAgKiBAcGFyYW0ge251bWJlcn0gYnl0ZU9mZnNldCAtIFRoZSBieXRlIG9mZnNldCB2YWx1ZSB0byBzdGFydCByZWFkaW5nIHRoZSBidWZmZXIuDQogICAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNNb2JpbGVEZXZpY2UgLSBUaGUgaXNNb2JpbGVEZXZpY2UgdmFsdWUuDQogICAqLw0KICBjb25zdHJ1Y3RvcihkYXRhLCBieXRlT2Zmc2V0ID0gMCwgaXNNb2JpbGVEZXZpY2UgPSB0cnVlKSB7DQogICAgdGhpcy5fX2RhdGEgPSBkYXRhOw0KICAgIHRoaXMuX19ieXRlT2Zmc2V0ID0gYnl0ZU9mZnNldDsNCiAgICB0aGlzLl9fZGF0YVZpZXcgPSBuZXcgRGF0YVZpZXcodGhpcy5fX2RhdGEpOw0KICAgIHRoaXMuX19pc01vYmlsZURldmljZSA9IGlzTW9iaWxlRGV2aWNlOw0KICAgIHRoaXMudXRmOGRlY29kZXIgPSBuZXcgVGV4dERlY29kZXIoKTsNCiAgfQ0KDQogIC8qKg0KICAgKiBHZXR0ZXIgZm9yIGlzTW9iaWxlRGV2aWNlLg0KICAgKiBAcmV0dXJuIHtCb29sZWFufSAtIFJldHVybnMgdHJ1ZSBpcyBhIG1vYmlsZSBkZXZpY2UgaXMgZGV0ZWN0ZWQuDQogICAqLw0KICBnZXQgaXNNb2JpbGVEZXZpY2UoKSB7DQogICAgcmV0dXJuIHRoaXMuX19pc01vYmlsZURldmljZQ0KICB9DQoNCiAgLyoqDQogICAqIEdldHRlciBmb3IgZGF0YS4NCiAgICogQHJldHVybiB7QnVmZmVyfSAtIFRoZSBkYXRhIGJ1ZmZlciB3ZSBhcmUgcmVhZGluZyBmcm9tLA0KICAgKi8NCiAgZ2V0IGRhdGEoKSB7DQogICAgcmV0dXJuIHRoaXMuX19kYXRhDQogIH0NCg0KICAvKioNCiAgICogR2V0dGVyIGZvciBieXRlTGVuZ3RoLg0KICAgKiBAcmV0dXJuIHtudW1iZXJ9IC0gVGhlIHRvdGFsIGxlbmd0aCBvZiB0aGUgYnVmZmVyDQogICAqLw0KICBnZXQgYnl0ZUxlbmd0aCgpIHsNCiAgICByZXR1cm4gdGhpcy5fX2RhdGFWaWV3LmJ5dGVMZW5ndGgNCiAgfQ0KDQogIC8qKg0KICAgKiBHZXR0ZXIgZm9yIHJlbWFpbmluZ0J5dGVMZW5ndGguDQogICAqIEByZXR1cm4ge251bWJlcn0gLSBUaGUgcmVlbWFpbmluZyBsZW5ndGggb2YgdGhlIGJ1ZmZlciB0byByZWFkLg0KICAgKi8NCiAgZ2V0IHJlbWFpbmluZ0J5dGVMZW5ndGgoKSB7DQogICAgcmV0dXJuIHRoaXMuX19kYXRhVmlldy5ieXRlTGVuZ3RoIC0gdGhpcy5fX2J5dGVPZmZzZXQNCiAgfQ0KDQogIC8qKg0KICAgKiBUaGUgcG9zIG1ldGhvZC4NCiAgICogQHJldHVybiB7bnVtYmVyfSAtIFRoZSBjdXJyZW50IG9mZnNldCBpbiB0aGUgYmluYXJ5IGJ1ZmZlcg0KICAgKi8NCiAgcG9zKCkgew0KICAgIHJldHVybiB0aGlzLl9fYnl0ZU9mZnNldA0KICB9DQoNCiAgLyoqDQogICAqIFRoZSBzZWVrIG1ldGhvZC4NCiAgICogQHBhcmFtIHtudW1iZXJ9IGJ5dGVPZmZzZXQgLSBUaGUgYnl0ZU9mZnNldCBwYXJhbS4NCiAgICovDQogIHNlZWsoYnl0ZU9mZnNldCkgew0KICAgIHRoaXMuX19ieXRlT2Zmc2V0ID0gYnl0ZU9mZnNldDsNCiAgfQ0KDQogIC8qKg0KICAgKiBUaGUgYWR2YW5jZSBtZXRob2QuDQogICAqIEBwYXJhbSB7bnVtYmVyfSBieXRlT2Zmc2V0IC0gVGhlIGJ5dGUgT2Zmc2V0IGFtb3VudC4NCiAgICovDQogIGFkdmFuY2UoYnl0ZU9mZnNldCkgew0KICAgIHRoaXMuX19ieXRlT2Zmc2V0ICs9IGJ5dGVPZmZzZXQ7DQogIH0NCg0KICAvKioNCiAgICogVGhlIGxvYWRVSW50OCBtZXRob2QuDQogICAqIEByZXR1cm4ge251bWJlcn0gLSBUaGUgcmV0dXJuIHZhbHVlLg0KICAgKi8NCiAgbG9hZFVJbnQ4KCkgew0KICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuX19kYXRhVmlldy5nZXRVaW50OCh0aGlzLl9fYnl0ZU9mZnNldCk7DQogICAgdGhpcy5fX2J5dGVPZmZzZXQgKz0gMTsNCiAgICByZXR1cm4gcmVzdWx0DQogIH0NCg0KICAvKioNCiAgICogVGhlIGxvYWRVSW50MTYgbWV0aG9kLg0KICAgKiBAcmV0dXJuIHtudW1iZXJ9IC0gVGhlIHJldHVybiB2YWx1ZS4NCiAgICovDQogIGxvYWRVSW50MTYoKSB7DQogICAgY29uc3QgcmVzdWx0ID0gdGhpcy5fX2RhdGFWaWV3LmdldFVpbnQxNih0aGlzLl9fYnl0ZU9mZnNldCwgdHJ1ZSk7DQogICAgdGhpcy5fX2J5dGVPZmZzZXQgKz0gMjsNCiAgICByZXR1cm4gcmVzdWx0DQogIH0NCg0KICAvKioNCiAgICogVGhlIGxvYWRVSW50MzIgbWV0aG9kLg0KICAgKiBAcmV0dXJuIHtudW1iZXJ9IC0gVGhlIHJldHVybiB2YWx1ZS4NCiAgICovDQogIGxvYWRVSW50MzIoKSB7DQogICAgY29uc3QgcmVzdWx0ID0gdGhpcy5fX2RhdGFWaWV3LmdldFVpbnQzMih0aGlzLl9fYnl0ZU9mZnNldCwgdHJ1ZSk7DQogICAgdGhpcy5fX2J5dGVPZmZzZXQgKz0gNDsNCiAgICByZXR1cm4gcmVzdWx0DQogIH0NCg0KICAvKioNCiAgICogVGhlIGxvYWRTSW50MzIgbWV0aG9kLg0KICAgKiBAcmV0dXJuIHtudW1iZXJ9IC0gVGhlIHJldHVybiB2YWx1ZS4NCiAgICovDQogIGxvYWRTSW50MzIoKSB7DQogICAgY29uc3QgcmVzdWx0ID0gdGhpcy5fX2RhdGFWaWV3LmdldEludDMyKHRoaXMuX19ieXRlT2Zmc2V0LCB0cnVlKTsNCiAgICB0aGlzLl9fYnl0ZU9mZnNldCArPSA0Ow0KICAgIHJldHVybiByZXN1bHQNCiAgfQ0KDQogIC8qKg0KICAgKiBUaGUgbG9hZEZsb2F0MTYgbWV0aG9kLg0KICAgKiBAcmV0dXJuIHtudW1iZXJ9IC0gVGhlIHJldHVybiB2YWx1ZS4NCiAgICovDQogIGxvYWRGbG9hdDE2KCkgew0KICAgIGNvbnN0IHVpbnQxNiA9IHRoaXMubG9hZFVJbnQxNigpOw0KICAgIHJldHVybiBkZWNvZGUxNkJpdEZsb2F0KHVpbnQxNikNCiAgfQ0KDQogIC8qKg0KICAgKiBUaGUgbG9hZFVGbG9hdDE2IHJldHVybnMgYSBmbG9hdCB3aGVyZSB0aGUgc2lnbiBiaWcgaW5kaWNhdGVzIGl0IGlzID4gMjAxLg0KICAgKiBAcmV0dXJuIHtudW1iZXJ9IC0gVGhlIHJldHVybiB2YWx1ZS4NCiAgICovDQogIGxvYWRVRmxvYXQxNigpIHsNCiAgICBjb25zdCByZXN1bHQgPSB0aGlzLmxvYWRGbG9hdDE2KCk7DQogICAgaWYgKHJlc3VsdCA8IDAuMCkgew0KICAgICAgcmV0dXJuIDIwNDguMCAtIHJlc3VsdCAvLyBOb3RlOiBzdWJ0cmFjdCBhIG5lZ2F0aXZlIG51bWJlciB0byBhZGQgaXQuDQogICAgfSBlbHNlIHsNCiAgICAgIHJldHVybiByZXN1bHQNCiAgICB9DQogIH0NCg0KICAvKioNCiAgICogVGhlIGxvYWRGbG9hdDE2RnJvbTJ4VUludDggbWV0aG9kLg0KICAgKiBAcmV0dXJuIHtudW1iZXJ9IC0gVGhlIHJldHVybiB2YWx1ZS4NCiAgICovDQogIGxvYWRGbG9hdDE2RnJvbTJ4VUludDgoKSB7DQogICAgY29uc3QgcmVzdWx0ID0gdGhpcy5fX2RhdGFWaWV3LmdldEZsb2F0MTYodGhpcy5fX2J5dGVPZmZzZXQsIHRydWUpOw0KICAgIC8vIGNvbnN0IHVpbnQ4cyA9IHRoaXMubG9hZFVJbnQ4QXJyYXkoMik7DQogICAgLy8gcmV0dXJuIGRlY29kZTE2Qml0RmxvYXQodWludDhzKTsNCiAgICB0aGlzLl9fYnl0ZU9mZnNldCArPSAyOw0KICAgIHJldHVybiByZXN1bHQNCiAgfQ0KDQogIC8qKg0KICAgKiBUaGUgbG9hZFVJbnQzMkZyb20yeFVGbG9hdDE2IGxvYWRzIGEgc2luZ2xlIFNpZ25lZCBpbnRlZ2VyIHZhbHVlIGZyb20gMiBVbnNpZ25lZCBGbG9hdDE2IHZhbHVlcy4NCiAgICogQHJldHVybiB7bnVtYmVyfSAtIFRoZSByZXR1cm4gdmFsdWUuDQogICAqLw0KICBsb2FkVUludDMyRnJvbTJ4VUZsb2F0MTYoKSB7DQogICAgY29uc3QgcGFydEEgPSB0aGlzLmxvYWRVRmxvYXQxNigpOw0KICAgIGNvbnN0IHBhcnRCID0gdGhpcy5sb2FkVUZsb2F0MTYoKTsNCiAgICByZXR1cm4gcGFydEEgKyBwYXJ0QiAqIDQwOTYNCiAgfQ0KDQogIC8qKg0KICAgKiBUaGUgbG9hZFNJbnQzMkZyb20yeEZsb2F0MTYgbG9hZHMgYSBzaW5nbGUgU2lnbmVkIGludGVnZXIgdmFsdWUgZnJvbSAyIHNpZ25lZCBGbG9hdDE2IHZhbHVlcy4NCiAgICogQHJldHVybiB7bnVtYmVyfSAtIFRoZSByZXR1cm4gdmFsdWUuDQogICAqLw0KICBsb2FkU0ludDMyRnJvbTJ4RmxvYXQxNigpIHsNCiAgICBjb25zdCBwYXJ0QSA9IHRoaXMubG9hZEZsb2F0MTYoKTsNCiAgICBjb25zdCBwYXJ0QiA9IHRoaXMubG9hZEZsb2F0MTYoKTsNCiAgICByZXR1cm4gcGFydEEgKyBwYXJ0QiAqIDIwNDgNCiAgfQ0KDQogIC8qKg0KICAgKiBUaGUgbG9hZEZsb2F0MzIgbWV0aG9kLg0KICAgKiBAcmV0dXJuIHthbnl9IC0gVGhlIHJldHVybiB2YWx1ZS4NCiAgICovDQogIGxvYWRGbG9hdDMyKCkgew0KICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuX19kYXRhVmlldy5nZXRGbG9hdDMyKHRoaXMuX19ieXRlT2Zmc2V0LCB0cnVlKTsNCiAgICB0aGlzLl9fYnl0ZU9mZnNldCArPSA0Ow0KICAgIHJldHVybiByZXN1bHQNCiAgfQ0KDQogIC8qKg0KICAgKiBUaGUgbG9hZEZsb2F0MzIgbWV0aG9kLg0KICAgKiBAcGFyYW0ge2FueX0gc2l6ZSAtIFRoZSBzaXplIHBhcmFtLg0KICAgKiBAcGFyYW0ge2Jvb2xlYW59IGNsb25lIC0gVGhlIGNsb25lIHBhcmFtLg0KICAgKiBAcmV0dXJuIHthbnl9IC0gVGhlIHJldHVybiB2YWx1ZS4NCiAgICovDQogIGxvYWRVSW50OEFycmF5KHNpemUgPSB1bmRlZmluZWQsIGNsb25lID0gZmFsc2UpIHsNCiAgICBpZiAoc2l6ZSA9PSB1bmRlZmluZWQpIHNpemUgPSB0aGlzLmxvYWRVSW50MzIoKTsNCiAgICBjb25zdCByZXN1bHQgPSBuZXcgVWludDhBcnJheSh0aGlzLl9fZGF0YSwgdGhpcy5fX2J5dGVPZmZzZXQsIHNpemUpOw0KICAgIHRoaXMuX19ieXRlT2Zmc2V0ICs9IHNpemU7DQogICAgY29uc3QgcGFkZCA9IHRoaXMuX19ieXRlT2Zmc2V0ICUgNDsNCiAgICAvLyB0aGlzLnJlYWRQYWRkKCk7DQogICAgcmV0dXJuIHJlc3VsdA0KICB9DQoNCiAgLyoqDQogICAqIFRoZSBsb2FkVUludDE2QXJyYXkgbWV0aG9kLg0KICAgKiBAcGFyYW0ge2FueX0gc2l6ZSAtIFRoZSBzaXplIHBhcmFtLg0KICAgKiBAcGFyYW0ge2Jvb2xlYW59IGNsb25lIC0gVGhlIGNsb25lIHBhcmFtLg0KICAgKiBAcmV0dXJuIHthbnl9IC0gVGhlIHJldHVybiB2YWx1ZS4NCiAgICovDQogIGxvYWRVSW50MTZBcnJheShzaXplID0gdW5kZWZpbmVkLCBjbG9uZSA9IGZhbHNlKSB7DQogICAgaWYgKHNpemUgPT0gdW5kZWZpbmVkKSBzaXplID0gdGhpcy5sb2FkVUludDMyKCk7DQogICAgaWYgKHNpemUgPT0gMCkgcmV0dXJuIG5ldyBVaW50MTZBcnJheSgpDQogICAgdGhpcy5yZWFkUGFkZCgyKTsNCiAgICBsZXQgcmVzdWx0Ow0KICAgIGlmICh0aGlzLl9faXNNb2JpbGVEZXZpY2UpIHsNCiAgICAgIHJlc3VsdCA9IG5ldyBVaW50MTZBcnJheShzaXplKTsNCiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2l6ZTsgaSsrKSB7DQogICAgICAgIHJlc3VsdFtpXSA9IHRoaXMuX19kYXRhVmlldy5nZXRVaW50MTYodGhpcy5fX2J5dGVPZmZzZXQsIHRydWUpOw0KICAgICAgICB0aGlzLl9fYnl0ZU9mZnNldCArPSAyOw0KICAgICAgfQ0KICAgIH0gZWxzZSB7DQogICAgICByZXN1bHQgPSBuZXcgVWludDE2QXJyYXkodGhpcy5fX2RhdGEsIHRoaXMuX19ieXRlT2Zmc2V0LCBzaXplKTsNCiAgICAgIHRoaXMuX19ieXRlT2Zmc2V0ICs9IHNpemUgKiAyOw0KICAgIH0NCiAgICAvLyB0aGlzLnJlYWRQYWRkKCk7DQogICAgcmV0dXJuIHJlc3VsdA0KICB9DQoNCiAgLyoqDQogICAqIFRoZSBsb2FkVUludDMyQXJyYXkgbWV0aG9kLg0KICAgKiBAcGFyYW0ge2FueX0gc2l6ZSAtIFRoZSBzaXplIHBhcmFtLg0KICAgKiBAcGFyYW0ge2Jvb2xlYW59IGNsb25lIC0gVGhlIGNsb25lIHBhcmFtLg0KICAgKiBAcmV0dXJuIHthbnl9IC0gVGhlIHJldHVybiB2YWx1ZS4NCiAgICovDQogIGxvYWRVSW50MzJBcnJheShzaXplID0gdW5kZWZpbmVkLCBjbG9uZSA9IGZhbHNlKSB7DQogICAgaWYgKHNpemUgPT0gdW5kZWZpbmVkKSBzaXplID0gdGhpcy5sb2FkVUludDMyKCk7DQogICAgaWYgKHNpemUgPT0gMCkgcmV0dXJuIG5ldyBVaW50MzJBcnJheSgpDQogICAgdGhpcy5yZWFkUGFkZCg0KTsNCiAgICBsZXQgcmVzdWx0Ow0KICAgIGlmICh0aGlzLl9faXNNb2JpbGVEZXZpY2UpIHsNCiAgICAgIHJlc3VsdCA9IG5ldyBVaW50MzJBcnJheShzaXplKTsNCiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2l6ZTsgaSsrKSB7DQogICAgICAgIHJlc3VsdFtpXSA9IHRoaXMuX19kYXRhVmlldy5nZXRVaW50MzIodGhpcy5fX2J5dGVPZmZzZXQsIHRydWUpOw0KICAgICAgICB0aGlzLl9fYnl0ZU9mZnNldCArPSA0Ow0KICAgICAgfQ0KICAgIH0gZWxzZSB7DQogICAgICByZXN1bHQgPSBuZXcgVWludDMyQXJyYXkodGhpcy5fX2RhdGEsIHRoaXMuX19ieXRlT2Zmc2V0LCBzaXplKTsNCiAgICAgIHRoaXMuX19ieXRlT2Zmc2V0ICs9IHNpemUgKiA0Ow0KICAgIH0NCiAgICByZXR1cm4gcmVzdWx0DQogIH0NCg0KICAvKioNCiAgICogVGhlIGxvYWRGbG9hdDMyQXJyYXkgbWV0aG9kLg0KICAgKiBAcGFyYW0ge2FueX0gc2l6ZSAtIFRoZSBzaXplIHBhcmFtLg0KICAgKiBAcGFyYW0ge2Jvb2xlYW59IGNsb25lIC0gVGhlIGNsb25lIHBhcmFtLg0KICAgKiBAcmV0dXJuIHthbnl9IC0gVGhlIHJldHVybiB2YWx1ZS4NCiAgICovDQogIGxvYWRGbG9hdDMyQXJyYXkoc2l6ZSA9IHVuZGVmaW5lZCwgY2xvbmUgPSBmYWxzZSkgew0KICAgIGlmIChzaXplID09IHVuZGVmaW5lZCkgc2l6ZSA9IHRoaXMubG9hZFVJbnQzMigpOw0KICAgIGlmIChzaXplID09IDApIHJldHVybiBuZXcgRmxvYXQzMkFycmF5KCkNCiAgICB0aGlzLnJlYWRQYWRkKDQpOw0KICAgIGxldCByZXN1bHQ7DQogICAgaWYgKHRoaXMuX19pc01vYmlsZURldmljZSkgew0KICAgICAgcmVzdWx0ID0gbmV3IEZsb2F0MzJBcnJheShzaXplKTsNCiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2l6ZTsgaSsrKSB7DQogICAgICAgIHJlc3VsdFtpXSA9IHRoaXMuX19kYXRhVmlldy5nZXRGbG9hdDMyKHRoaXMuX19ieXRlT2Zmc2V0LCB0cnVlKTsNCiAgICAgICAgdGhpcy5fX2J5dGVPZmZzZXQgKz0gNDsNCiAgICAgIH0NCiAgICB9IGVsc2Ugew0KICAgICAgcmVzdWx0ID0gbmV3IEZsb2F0MzJBcnJheSh0aGlzLl9fZGF0YSwgdGhpcy5fX2J5dGVPZmZzZXQsIHNpemUpOw0KICAgICAgdGhpcy5fX2J5dGVPZmZzZXQgKz0gc2l6ZSAqIDQ7DQogICAgfQ0KICAgIHJldHVybiByZXN1bHQNCiAgfQ0KDQogIC8qKg0KICAgKiBUaGUgbG9hZFN0ciBtZXRob2QuDQogICAqIEByZXR1cm4ge3N0cmluZ30gLSBUaGUgcmV0dXJuIHZhbHVlLg0KICAgKi8NCiAgbG9hZFN0cigpIHsNCiAgICBjb25zdCBudW1DaGFycyA9IHRoaXMubG9hZFVJbnQzMigpOw0KICAgIGNvbnN0IGNoYXJzID0gbmV3IFVpbnQ4QXJyYXkodGhpcy5fX2RhdGEsIHRoaXMuX19ieXRlT2Zmc2V0LCBudW1DaGFycyk7DQogICAgdGhpcy5fX2J5dGVPZmZzZXQgKz0gbnVtQ2hhcnM7DQogICAgbGV0IHJlc3VsdCA9ICcnOw0KICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbnVtQ2hhcnM7IGkrKykgcmVzdWx0ID0gcmVzdWx0ICsgU3RyaW5nLmZyb21DaGFyQ29kZShjaGFyc1tpXSk7DQogICAgcmV0dXJuIHJlc3VsdA0KICB9DQoNCiAgLyoqDQogICAqIFRoZSBsb2FkU3RyQXJyYXkgbWV0aG9kLg0KICAgKiBAcmV0dXJuIHthcnJheX0gLSBUaGUgcmV0dXJuIHZhbHVlLg0KICAgKi8NCiAgbG9hZFN0ckFycmF5KCkgew0KICAgIGNvbnN0IHNpemUgPSB0aGlzLmxvYWRVSW50MzIoKTsNCiAgICBjb25zdCByZXN1bHQgPSBbXTsNCiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNpemU7IGkrKykgew0KICAgICAgcmVzdWx0W2ldID0gdGhpcy5sb2FkU3RyKCk7DQogICAgfQ0KICAgIHJldHVybiByZXN1bHQNCiAgfQ0KDQogIC8vIGxvYWRTSW50MzJWZWMyKCkgew0KICAvLyAgICAgY29uc3QgeCA9IHRoaXMubG9hZFNJbnQzMigpOw0KICAvLyAgICAgY29uc3QgeSA9IHRoaXMubG9hZFNJbnQzMigpOw0KICAvLyAgICAgcmV0dXJuIG5ldyBWZWMyKHgsIHkpOw0KICAvLyB9DQoNCiAgLy8gbG9hZFVJbnQzMlZlYzIoKSB7DQogIC8vICAgICBjb25zdCB4ID0gdGhpcy5sb2FkVUludDMyKCk7DQogIC8vICAgICBjb25zdCB5ID0gdGhpcy5sb2FkVUludDMyKCk7DQogIC8vICAgICByZXR1cm4gbmV3IFZlYzIoeCwgeSk7DQogIC8vIH0NCg0KICAvLyBsb2FkRmxvYXQxNlZlYzIoKSB7DQogIC8vICAgICBjb25zdCB4ID0gdGhpcy5sb2FkRmxvYXQxNigpOw0KICAvLyAgICAgY29uc3QgeSA9IHRoaXMubG9hZEZsb2F0MTYoKTsNCiAgLy8gICAgIHJldHVybiBuZXcgVmVjMih4LCB5KTsNCiAgLy8gfQ0KDQogIC8vIGxvYWRGbG9hdDMyVmVjMigpIHsNCiAgLy8gICAgIGNvbnN0IHggPSB0aGlzLmxvYWRGbG9hdDMyKCk7DQogIC8vICAgICBjb25zdCB5ID0gdGhpcy5sb2FkRmxvYXQzMigpOw0KICAvLyAgICAgcmV0dXJuIG5ldyBWZWMyKHgsIHkpOw0KICAvLyB9DQoNCiAgLy8gbG9hZEZsb2F0MTZWZWMzKCkgew0KICAvLyAgICAgY29uc3QgeCA9IHRoaXMubG9hZEZsb2F0MTYoKTsNCiAgLy8gICAgIGNvbnN0IHkgPSB0aGlzLmxvYWRGbG9hdDE2KCk7DQogIC8vICAgICBjb25zdCB6ID0gdGhpcy5sb2FkRmxvYXQxNigpOw0KICAvLyAgICAgcmV0dXJuIG5ldyBWZWMzKHgsIHksIHopOw0KICAvLyB9DQoNCiAgLy8gbG9hZEZsb2F0MzJWZWMzKCkgew0KICAvLyAgICAgY29uc3QgeCA9IHRoaXMubG9hZEZsb2F0MzIoKTsNCiAgLy8gICAgIGNvbnN0IHkgPSB0aGlzLmxvYWRGbG9hdDMyKCk7DQogIC8vICAgICBjb25zdCB6ID0gdGhpcy5sb2FkRmxvYXQzMigpOw0KICAvLyAgICAgcmV0dXJuIG5ldyBWZWMzKHgsIHksIHopOw0KICAvLyB9DQoNCiAgLy8gbG9hZEZsb2F0MTZRdWF0KCkgew0KICAvLyAgICAgY29uc3QgeCA9IHRoaXMubG9hZEZsb2F0MTYoKTsNCiAgLy8gICAgIGNvbnN0IHkgPSB0aGlzLmxvYWRGbG9hdDE2KCk7DQogIC8vICAgICBjb25zdCB6ID0gdGhpcy5sb2FkRmxvYXQxNigpOw0KICAvLyAgICAgY29uc3QgdyA9IHRoaXMubG9hZEZsb2F0MTYoKTsNCiAgLy8gICAgIHJldHVybiBuZXcgUXVhdCh4LCB5LCB6LCB3KTsNCiAgLy8gfQ0KDQogIC8vIGxvYWRGbG9hdDMyUXVhdCgpIHsNCiAgLy8gICAgIGNvbnN0IHggPSB0aGlzLmxvYWRGbG9hdDMyKCk7DQogIC8vICAgICBjb25zdCB5ID0gdGhpcy5sb2FkRmxvYXQzMigpOw0KICAvLyAgICAgY29uc3QgeiA9IHRoaXMubG9hZEZsb2F0MzIoKTsNCiAgLy8gICAgIGNvbnN0IHcgPSB0aGlzLmxvYWRGbG9hdDMyKCk7DQogIC8vICAgICByZXR1cm4gbmV3IFF1YXQoeCwgeSwgeiwgdyk7DQogIC8vIH0NCg0KICAvLyBsb2FkUkdCRmxvYXQzMkNvbG9yKCkgew0KICAvLyAgICAgY29uc3QgciA9IHRoaXMubG9hZEZsb2F0MzIoKTsNCiAgLy8gICAgIGNvbnN0IGcgPSB0aGlzLmxvYWRGbG9hdDMyKCk7DQogIC8vICAgICBjb25zdCBiID0gdGhpcy5sb2FkRmxvYXQzMigpOw0KICAvLyAgICAgcmV0dXJuIG5ldyBDb2xvcihyLCBnLCBiKTsNCiAgLy8gfQ0KDQogIC8vIGxvYWRSR0JBRmxvYXQzMkNvbG9yKCkgew0KICAvLyAgICAgY29uc3QgciA9IHRoaXMubG9hZEZsb2F0MzIoKTsNCiAgLy8gICAgIGNvbnN0IGcgPSB0aGlzLmxvYWRGbG9hdDMyKCk7DQogIC8vICAgICBjb25zdCBiID0gdGhpcy5sb2FkRmxvYXQzMigpOw0KICAvLyAgICAgY29uc3QgYSA9IHRoaXMubG9hZEZsb2F0MzIoKTsNCiAgLy8gICAgIHJldHVybiBuZXcgQ29sb3IociwgZywgYiwgYSk7DQogIC8vIH0NCg0KICAvLyBsb2FkUkdCVUludDhDb2xvcigpIHsNCiAgLy8gICAgIGNvbnN0IHIgPSB0aGlzLmxvYWRVSW50OCgpOw0KICAvLyAgICAgY29uc3QgZyA9IHRoaXMubG9hZFVJbnQ4KCk7DQogIC8vICAgICBjb25zdCBiID0gdGhpcy5sb2FkVUludDgoKTsNCiAgLy8gICAgIHJldHVybiBuZXcgQ29sb3IociAvIDI1NSwgZyAvIDI1NSwgYiAvIDI1NSk7DQogIC8vIH0NCg0KICAvLyBsb2FkUkdCQVVJbnQ4Q29sb3IoKSB7DQogIC8vICAgICBjb25zdCByID0gdGhpcy5sb2FkVUludDgoKTsNCiAgLy8gICAgIGNvbnN0IGcgPSB0aGlzLmxvYWRVSW50OCgpOw0KICAvLyAgICAgY29uc3QgYiA9IHRoaXMubG9hZFVJbnQ4KCk7DQogIC8vICAgICBjb25zdCBhID0gdGhpcy5sb2FkVUludDgoKTsNCiAgLy8gICAgIHJldHVybiBuZXcgQ29sb3IociAvIDI1NSwgZyAvIDI1NSwgYiAvIDI1NSwgYSAvIDI1NSk7DQogIC8vIH0NCg0KICAvLyBsb2FkQm94MigpIHsNCiAgLy8gICAgIHJldHVybiBuZXcgQm94Mih0aGlzLmxvYWRGbG9hdDMyVmVjMigpLCB0aGlzLmxvYWRGbG9hdDMyVmVjMigpKTsNCiAgLy8gfQ0KDQogIC8vIGxvYWRCb3gzKCkgew0KICAvLyAgICAgcmV0dXJuIG5ldyBCb3gzKHRoaXMubG9hZEZsb2F0MzJWZWMzKCksIHRoaXMubG9hZEZsb2F0MzJWZWMzKCkpOw0KICAvLyB9DQoNCiAgLyoqDQogICAqIFRoZSBsb2FkU3RyIG1ldGhvZC4NCiAgICogQHBhcmFtIHthbnl9IHN0cmlkZSAtIFRoZSBzdHJpZGUgcGFyYW0uDQogICAqLw0KICByZWFkUGFkZChzdHJpZGUpIHsNCiAgICBjb25zdCBwYWRkID0gdGhpcy5fX2J5dGVPZmZzZXQgJSBzdHJpZGU7DQogICAgaWYgKHBhZGQgIT0gMCkgdGhpcy5fX2J5dGVPZmZzZXQgKz0gc3RyaWRlIC0gcGFkZDsNCiAgfQ0KfQoKY29uc3QgQ0FEU3VyZmFjZVR5cGVzID0gew0KICBTVVJGQUNFX1RZUEVfUExBTkU6IDAsDQogIFNVUkZBQ0VfVFlQRV9DT05FOiAxLA0KICBTVVJGQUNFX1RZUEVfQ1lMSU5ERVI6IDIsDQogIFNVUkZBQ0VfVFlQRV9TUEhFUkU6IDMsDQogIFNVUkZBQ0VfVFlQRV9UT1JVUzogNCwNCiAgU1VSRkFDRV9UWVBFX0xJTkVBUl9FWFRSVVNJT046IDUsDQogIFNVUkZBQ0VfVFlQRV9SRVZPTFVUSU9OOiA2LA0KICAvLyAgU1VSRkFDRV9UWVBFX0JFWklFUl9TVVJGQUNFOiA3LA0KICBTVVJGQUNFX1RZUEVfTlVSQlNfU1VSRkFDRTogOCwNCiAgU1VSRkFDRV9UWVBFX09GRlNFVF9TVVJGQUNFOiA5LA0KICBTVVJGQUNFX1RZUEVfVFJJTU1FRF9SRUNUX1NVUkZBQ0U6IDEwLA0KICBTVVJGQUNFX1RZUEVfUE9MWV9QTEFORTogMTQsDQogIFNVUkZBQ0VfVFlQRV9GQU46IDE1LA0KICBTVVJGQUNFX1RZUEVfUkVWT0xVVElPTl9GTElQUEVEX0RPTUFJTjogMTYsDQp9Ow0KDQpjb25zdCBnZXRTdXJmYWNlVHlwZU5hbWUgPSAoaWQpID0+IHsNCiAgc3dpdGNoIChpZCkgew0KICAgIGNhc2UgQ0FEU3VyZmFjZVR5cGVzLlNVUkZBQ0VfVFlQRV9QTEFORToNCiAgICAgIHJldHVybiAnU1VSRkFDRV9UWVBFX1BMQU5FJw0KICAgIGNhc2UgQ0FEU3VyZmFjZVR5cGVzLlNVUkZBQ0VfVFlQRV9DT05FOg0KICAgICAgcmV0dXJuICdTVVJGQUNFX1RZUEVfQ09ORScNCiAgICBjYXNlIENBRFN1cmZhY2VUeXBlcy5TVVJGQUNFX1RZUEVfQ1lMSU5ERVI6DQogICAgICByZXR1cm4gJ1NVUkZBQ0VfVFlQRV9DWUxJTkRFUicNCiAgICBjYXNlIENBRFN1cmZhY2VUeXBlcy5TVVJGQUNFX1RZUEVfU1BIRVJFOg0KICAgICAgcmV0dXJuICdTVVJGQUNFX1RZUEVfU1BIRVJFJw0KICAgIGNhc2UgQ0FEU3VyZmFjZVR5cGVzLlNVUkZBQ0VfVFlQRV9UT1JVUzoNCiAgICAgIHJldHVybiAnU1VSRkFDRV9UWVBFX1RPUlVTJw0KICAgIGNhc2UgQ0FEU3VyZmFjZVR5cGVzLlNVUkZBQ0VfVFlQRV9MSU5FQVJfRVhUUlVTSU9OOg0KICAgICAgcmV0dXJuICdTVVJGQUNFX1RZUEVfTElORUFSX0VYVFJVU0lPTicNCiAgICBjYXNlIENBRFN1cmZhY2VUeXBlcy5TVVJGQUNFX1RZUEVfUkVWT0xVVElPTjoNCiAgICAgIHJldHVybiAnU1VSRkFDRV9UWVBFX1JFVk9MVVRJT04nDQogICAgLy8gICAgY2FzZSBDQURTdXJmYWNlVHlwZXMuU1VSRkFDRV9UWVBFX0JFWklFUl9TVVJGQUNFOiByZXR1cm4gJ1NVUkZBQ0VfVFlQRV9CRVpJRVJfU1VSRkFDRSc7DQogICAgY2FzZSBDQURTdXJmYWNlVHlwZXMuU1VSRkFDRV9UWVBFX05VUkJTX1NVUkZBQ0U6DQogICAgICByZXR1cm4gJ1NVUkZBQ0VfVFlQRV9OVVJCU19TVVJGQUNFJw0KICAgIGNhc2UgQ0FEU3VyZmFjZVR5cGVzLlNVUkZBQ0VfVFlQRV9PRkZTRVRfU1VSRkFDRToNCiAgICAgIHJldHVybiAnU1VSRkFDRV9UWVBFX09GRlNFVF9TVVJGQUNFJw0KICAgIGNhc2UgQ0FEU3VyZmFjZVR5cGVzLlNVUkZBQ0VfVFlQRV9UUklNTUVEX1JFQ1RfU1VSRkFDRToNCiAgICAgIHJldHVybiAnU1VSRkFDRV9UWVBFX1RSSU1NRURfUkVDVF9TVVJGQUNFJw0KICAgIGNhc2UgQ0FEU3VyZmFjZVR5cGVzLlNVUkZBQ0VfVFlQRV9QT0xZX1BMQU5FOg0KICAgICAgcmV0dXJuICdTVVJGQUNFX1RZUEVfUE9MWV9QTEFORScNCiAgICBjYXNlIENBRFN1cmZhY2VUeXBlcy5TVVJGQUNFX1RZUEVfRkFOOg0KICAgICAgcmV0dXJuICdTVVJGQUNFX1RZUEVfRkFOJw0KICAgIGNhc2UgQ0FEU3VyZmFjZVR5cGVzLlNVUkZBQ0VfVFlQRV9SRVZPTFVUSU9OX0ZMSVBQRURfRE9NQUlOOg0KICAgICAgcmV0dXJuICdTVVJGQUNFX1RZUEVfUkVWT0xVVElPTl9GTElQUEVEX0RPTUFJTicNCiAgfQ0KfTsNCg0KY29uc3QgZ2VvbUxpYnJhcnlIZWFkZXJTaXplID0gODsgLy8gMiBGUDE2IHBpeGVscyBhdCB0aGUgc3RhcnQgb2YgdGhlIEdlb21MaWJyYXJ5IGFuZCBDdXJ2ZUxpYnJhcnkNCmNvbnN0IHZhbHVlc1BlckN1cnZlVG9jSXRlbSA9IDg7DQpjb25zdCB2YWx1ZXNQZXJTdXJmYWNlVG9jSXRlbSA9IDk7DQpjb25zdCB2YWx1ZXNQZXJDdXJ2ZUxpYnJhcnlMYXlvdXRJdGVtID0gODsNCmNvbnN0IHZhbHVlc1BlclN1cmZhY2VMaWJyYXJ5TGF5b3V0SXRlbSA9IDg7DQpjb25zdCBmbG9hdHNQZXJTY2VuZUJvZHkgPSAyOw0KY29uc3QgZHJhd1NoYWRlckF0dHJpYnNTdHJpZGUgPSA0OyAvL2RyYXdDb29yZHM6IGJvZHkgSUQsIFN1cmZhY2UgaW5kZXggaW4gQm9keSwgU3VyZmFjZSBJZCwgVHJpbVNldCBJZCAvLyArIDIgZHJhd0l0ZW1UZXhBZGRyDQpjb25zdCBDVVJWRV9GTEFHX0NPU1RfSVNfREVUQUlMID0gMSA8PCAzOw0KY29uc3QgU1VSRkFDRV9GTEFHX0ZMSVBQRURfVVYgPSAxIDw8IDU7DQpjb25zdCBTVVJGQUNFX0ZMQUdfQ09TVF9JU19ERVRBSUxfVSA9IDEgPDwgNjsNCmNvbnN0IFNVUkZBQ0VfRkxBR19DT1NUX0lTX0RFVEFJTF9WID0gMSA8PCA3OwoKY29uc3QgX19jdXJ2ZXNQYWNrZXIgPSBuZXcgR3Jvd2luZ1BhY2tlcigpOw0KY29uc3QgX19zdXJmYWNlUGFja2VyID0gbmV3IEdyb3dpbmdQYWNrZXIoKTsNCmNvbnN0IF9fdHJpbVNldFBhY2tlciA9IG5ldyBHcm93aW5nUGFja2VyKCk7DQovLyBjb25zdCBfX2JvZHlBdGxhc1BhY2tlciA9IG5ldyBHcm93aW5nUGFja2VyKCkNCg0KY29uc3Qgd29ya2VyU3RhdGUgPSB7fTsNCg0KLy8gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNjgzMjU5Ni9ob3ctdG8tY29tcGFyZS1zb2Z0d2FyZS12ZXJzaW9uLW51bWJlci11c2luZy1qcy1vbmx5LW51bWJlcg0KLy8gMm5kIGFuc3dlci4NCi8vIHJldHVybiBwb3NpdGl2ZTogdjEgPiB2MiwgemVybzp2MSA9PSB2MiwgbmVnYXRpdmU6IHYxIDwgdjINCmZ1bmN0aW9uIGNvbXBhcmVWZXJzaW9ucyh2MSwgdjIpIHsNCiAgLypkZWZhdWx0IGlzIHRydWUqLw0KICBmb3IgKGxldCBpID0gMDsgaSA8IDM7IGkrKykgew0KICAgIGlmICh2MVtpXSAhPT0gdjJbaV0pIHJldHVybiB2MVtpXSAtIHYyW2ldDQogIH0NCiAgcmV0dXJuIDANCn0NCg0KY29uc3QgbmVhcmVzdFBvdzIgPSAodmFsdWUpID0+IHsNCiAgcmV0dXJuIE1hdGgucG93KDIsIE1hdGgucm91bmQoTWF0aC5sb2codmFsdWUpIC8gTWF0aC5sb2coMikpKQ0KfTsNCg0KZnVuY3Rpb24gY2FsY0NvbnRhaW5lclNpemUobnVtSXRlbXMsIGl0ZW1XaWR0aCA9IDEsIGl0ZW1IZWlnaHQgPSAxKSB7DQogIGNvbnN0IHNpZGVMZW5ndGggPSBNYXRoLnNxcnQobnVtSXRlbXMgKiBpdGVtV2lkdGggKiBpdGVtSGVpZ2h0KTsNCiAgbGV0IHc7DQogIGxldCBoOw0KICBpZiAoaXRlbVdpZHRoID49IGl0ZW1IZWlnaHQpIHsNCiAgICB3ID0gc2lkZUxlbmd0aCAvIGl0ZW1XaWR0aDsNCiAgICBjb25zdCBmcmFjdFcgPSB3IC0gTWF0aC5mbG9vcih3KTsNCiAgICBpZiAoZnJhY3RXID4gMC41ICYmIGZyYWN0VyA8IDEuMCkgdyArPSAxLjAgLSBmcmFjdFc7DQogICAgZWxzZSB3ID0gTWF0aC5tYXgoMSwgTWF0aC5mbG9vcih3KSk7DQogICAgaCA9IG51bUl0ZW1zIC8gdzsNCiAgICBjb25zdCBmcmFjdEggPSBoIC0gTWF0aC5mbG9vcihoKTsNCiAgICBpZiAoZnJhY3RIID4gMC4wICYmIGZyYWN0SCA8IDEuMCkgew0KICAgICAgaCArPSAxLjAgLSBmcmFjdEg7DQogICAgfQ0KICB9IGVsc2Ugew0KICAgIGggPSBzaWRlTGVuZ3RoIC8gaXRlbUhlaWdodDsNCiAgICBjb25zdCBmcmFjdEggPSBoIC0gTWF0aC5mbG9vcihoKTsNCiAgICBpZiAoZnJhY3RIID4gMC41ICYmIGZyYWN0SCA8IDEuMCkgaCArPSAxLjAgLSBmcmFjdEg7DQogICAgZWxzZSBoID0gTWF0aC5tYXgoMSwgTWF0aC5mbG9vcihoKSk7DQogICAgdyA9IG51bUl0ZW1zIC8gaDsNCiAgICBjb25zdCBmcmFjdFcgPSB3IC0gTWF0aC5mbG9vcih3KTsNCiAgICBpZiAoZnJhY3RXID4gMC4wICYmIGZyYWN0VyA8IDEuMCkgew0KICAgICAgdyArPSAxLjAgLSBmcmFjdFc7DQogICAgfQ0KICB9DQogIGlmICh3ICogaCA8IG51bUl0ZW1zKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY29udGFpbmVyIHNpemUnKQ0KICByZXR1cm4gW3csIGhdDQp9DQoNCmZ1bmN0aW9uIGFkZFRvQmluKHZhbHVlLCBpdGVtV2lkdGgsIGl0ZW1IZWlnaHQsIGJpbnMsIGJpbnNEaWN0KSB7DQogIGNvbnN0IGtleSA9IGl0ZW1XaWR0aCArICd4JyArIGl0ZW1IZWlnaHQ7DQogIGNvbnN0IGJpbklkID0gYmluc0RpY3Rba2V5XTsNCiAgaWYgKGJpbklkICE9IHVuZGVmaW5lZCkgew0KICAgIGJpbnNbYmluSWRdLmlkcy5wdXNoKHZhbHVlKTsNCiAgfSBlbHNlIHsNCiAgICBiaW5zRGljdFtrZXldID0gYmlucy5sZW5ndGg7DQogICAgYmlucy5wdXNoKHsNCiAgICAgIGl0ZW1XaWR0aCwNCiAgICAgIGl0ZW1IZWlnaHQsDQogICAgICBpZHM6IFt2YWx1ZV0sDQogICAgfSk7DQogIH0NCn0NCg0KZnVuY3Rpb24gc29ydEJpbnMoYmlucykgew0KICBjb25zdCBpbmRleEFycmF5ID0gbmV3IFVpbnQxNkFycmF5KGJpbnMubGVuZ3RoKTsNCiAgZm9yIChsZXQgaSA9IDA7IGkgPCBiaW5zLmxlbmd0aDsgaSsrKSB7DQogICAgaW5kZXhBcnJheVtpXSA9IGk7DQogICAgY29uc3QgYmluID0gYmluc1tpXTsNCiAgICBjb25zdCBpdGVtQ291bnRVViA9IGNhbGNDb250YWluZXJTaXplKGJpbi5pZHMubGVuZ3RoLCBiaW4uaXRlbVdpZHRoLCBiaW4uaXRlbUhlaWdodCk7DQogICAgYmluLml0ZW1Db3VudFVWID0gaXRlbUNvdW50VVY7DQogICAgYmluLncgPSBpdGVtQ291bnRVVlswXSAqIGJpbi5pdGVtV2lkdGg7DQogICAgYmluLmggPSBpdGVtQ291bnRVVlsxXSAqIGJpbi5pdGVtSGVpZ2h0Ow0KICAgIGJpbi5sID0gTWF0aC5tYXgoYmluLncsIGJpbi5oKTsNCiAgfQ0KDQogIGluZGV4QXJyYXkuc29ydCgoYSwgYikgPT4gKGJpbnNbYV0ubCA+IGJpbnNbYl0ubCA/IC0xIDogYmluc1thXS5sIDwgYmluc1tiXS5sID8gMSA6IDApKTsNCiAgcmV0dXJuIGluZGV4QXJyYXkNCn0NCg0KZnVuY3Rpb24gbGF5b3V0QmlucyhiaW5zLCBwYWNrZXIsIGl0ZW1DYiwgYmluQ2IpIHsNCiAgLy8gLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLw0KICAvLyBTb3J0IHRoZSBiaW5zIGludG8gYmlnZ2VzdCB0byBzbWFsbGVzdCBzbyB3ZSBwYWNrIHRoZSBiaWdnZXIgb25lcyBmaXJzdC4NCiAgY29uc3QgaW5kZXhBcnJheSA9IHNvcnRCaW5zKGJpbnMpOw0KDQogIGZvciAoY29uc3QgYmluSWQgb2YgaW5kZXhBcnJheSkgew0KICAgIGNvbnN0IGJpbiA9IGJpbnNbYmluSWRdOw0KICAgIC8vIGNvbnNvbGUubG9nKCJiaW46IiArICBiaW4uaXRlbVdpZHRoKyAiIHggIiArYmluLml0ZW1IZWlnaHQpDQogICAgY29uc3QgYmxvY2sgPSBwYWNrZXIuYWRkQmxvY2soew0KICAgICAgdzogYmluLncsDQogICAgICBoOiBiaW4uaCwNCiAgICB9KTsNCiAgICBpZiAoIWJsb2NrKSB0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byBsYXlvdXQgYmluOicgKyBiaW4udyArICcgeCAnICsgYmluLmgpDQoNCiAgICBpZiAoYmluQ2IpIGJpbkNiKGJpbiwgYmxvY2spOw0KDQogICAgZm9yIChsZXQgaSA9IDA7IGkgPCBiaW4uaWRzLmxlbmd0aDsgaSsrKSB7DQogICAgICBjb25zdCB1ID0gYmxvY2sueCArIChpICUgYmluLml0ZW1Db3VudFVWWzBdKSAqIGJpbi5pdGVtV2lkdGg7DQogICAgICBjb25zdCB2ID0gYmxvY2sueSArIE1hdGguZmxvb3IoaSAvIGJpbi5pdGVtQ291bnRVVlswXSkgKiBiaW4uaXRlbUhlaWdodDsNCiAgICAgIGl0ZW1DYihiaW4sIGksIHUsIHYpOw0KICAgIH0NCiAgfQ0KfQ0KDQpjb25zdCBsYXlvdXRDdXJ2ZXMgPSAoY3VydmVzRGF0YVJlYWRlciwgZXJyb3JUb2xlcmFuY2UsIG1heFRleFNpemUpID0+IHsNCiAgLy8gY29uc3QgbnVtQ3VydmVzID0gY3VydmVzRGF0YVJlYWRlci5sZW5ndGggLyA4Ow0KICBjb25zdCBudW1DdXJ2ZXMgPSBjdXJ2ZXNEYXRhUmVhZGVyLmxvYWRVSW50MzIoKTsNCiAgaWYgKG51bUN1cnZlcyA9PSAwKSByZXR1cm4NCiAgY29uc29sZS5sb2coJ251bUN1cnZlcyA6JywgbnVtQ3VydmVzKTsNCg0KICBjb25zdCBjdXJ2ZUxpYnJhcnlTaXplID0gTWF0aC5zcXJ0KGN1cnZlc0RhdGFSZWFkZXIuZGF0YS5ieXRlTGVuZ3RoIC8gOCk7IC8vIFJHQkExNiBwaXhlbHMNCg0KICBjb25zdCBjdXJ2ZURldGFpbHMgPSBuZXcgVWludDMyQXJyYXkobnVtQ3VydmVzKTsgLy9kZXRhaWw7DQogIGNvbnN0IGJpbnNMaXN0ID0gW107DQogIGNvbnN0IGJpbnNEaWN0ID0ge307DQogIGZvciAobGV0IGN1cnZlSWQgPSAwOyBjdXJ2ZUlkIDwgbnVtQ3VydmVzOyBjdXJ2ZUlkKyspIHsNCiAgICB0cnkgew0KICAgICAgY3VydmVzRGF0YVJlYWRlci5zZWVrKGdlb21MaWJyYXJ5SGVhZGVyU2l6ZSArIGN1cnZlSWQgKiAodmFsdWVzUGVyQ3VydmVUb2NJdGVtICogMikgLyogYnBjKi8gKyAyICogMiAvKiBicGMqLyk7DQoNCiAgICAgIGxldCBwYXJhbSA9IGN1cnZlc0RhdGFSZWFkZXIubG9hZEZsb2F0MTYoKTsNCiAgICAgIGxldCBsZW5ndGggPSBjdXJ2ZXNEYXRhUmVhZGVyLmxvYWRGbG9hdDE2KCk7DQogICAgICBjb25zdCBmbGFncyA9IGN1cnZlc0RhdGFSZWFkZXIubG9hZEZsb2F0MTYoKTsNCg0KICAgICAgaWYgKCFOdW1iZXIuaXNGaW5pdGUocGFyYW0pKSBwYXJhbSA9IDY1NTM2Ow0KICAgICAgaWYgKCFOdW1iZXIuaXNGaW5pdGUobGVuZ3RoKSkgbGVuZ3RoID0gNjU1MzY7DQoNCiAgICAgIGxldCBkZXRhaWw7DQogICAgICBpZiAoZmxhZ3MgJiBDVVJWRV9GTEFHX0NPU1RfSVNfREVUQUlMKSB7DQogICAgICAgIGRldGFpbCA9IHBhcmFtOw0KICAgICAgfSBlbHNlIHsNCiAgICAgICAgaWYgKHBhcmFtID09IDAuMCkgew0KICAgICAgICAgIGRldGFpbCA9IDE7DQogICAgICAgIH0gZWxzZSB7DQogICAgICAgICAgY29uc3QgY3VydmF0dXJlID0gcGFyYW0gLyBsZW5ndGg7DQogICAgICAgICAgY29uc3QgcmFkaXVzID0gMSAvIGN1cnZhdHVyZTsNCiAgICAgICAgICBpZiAocmFkaXVzIDwgZXJyb3JUb2xlcmFuY2UpIHsNCiAgICAgICAgICAgIGRldGFpbCA9IDY7DQogICAgICAgICAgfSBlbHNlIHsNCiAgICAgICAgICAgIGNvbnN0IGEgPSByYWRpdXMgLSBlcnJvclRvbGVyYW5jZTsNCiAgICAgICAgICAgIGNvbnN0IGFyY0FuZ2xlID0gTWF0aC5hY29zKGEgLyByYWRpdXMpICogMjsNCiAgICAgICAgICAgIGRldGFpbCA9IHBhcmFtIC8gYXJjQW5nbGU7DQogICAgICAgICAgICBkZXRhaWwgPSBNYXRoLm1heCgxLCBNYXRoLnJvdW5kKG5lYXJlc3RQb3cyKGRldGFpbCkpKTsNCiAgICAgICAgICAgIGlmIChkZXRhaWwgPiAxMDI1KSB7DQogICAgICAgICAgICAgIGNvbnNvbGUud2FybignQ3VydmUgZGV0YWlsOicgKyBkZXRhaWwpOw0KICAgICAgICAgICAgICBkZXRhaWwgPSBNYXRoLm1pbihkZXRhaWwsIDEwMjUpOw0KICAgICAgICAgICAgfQ0KICAgICAgICAgICAgaWYgKGlzTmFOKGRldGFpbCkpIHsNCiAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdVbmFibGUgdG8gbGF5b3V0IEN1cnZlOicgKyBkZXRhaWwpOw0KICAgICAgICAgICAgICBjb250aW51ZQ0KICAgICAgICAgICAgfQ0KICAgICAgICAgIH0NCiAgICAgICAgfQ0KICAgICAgfQ0KDQogICAgICAvLyBjb25zb2xlLmxvZygiQ3VydmUgOiIsIGN1cnZlSWQsIGdldEN1cnZlVHlwZU5hbWUoY3VydmVUeXBlKSwgIiBmbGFnczoiLCBmbGFncywgIiBwYXJhbToiLCBwYXJhbSwgIiBkZXRhaWw6IiwgZGV0YWlsKTsNCiAgICAgIC8vIGNvbnNvbGUubG9nKCJDdXJ2ZSA6IiwgY3VydmVJZCwgIiBmbGFnczoiLCBmbGFncywgIiBwYXJhbToiLCBwYXJhbSwgIiBkZXRhaWw6IiwgZGV0YWlsKTsNCg0KICAgICAgLy8gTm90ZTogdGhlIGRldGFpbCB2YWx1ZSBpcyBhbHdheXMgYSBwb3dlciBvZiAyLCBhbmQgdGhlIG51bSB2ZXJ0aWNlcyBhcmUgYWx3YXlzIG9kZC4NCiAgICAgIC8vIGUuZy4gZGV0YWlsID0gNCwgbnVtVmVydHMgPSA1Lg0KICAgICAgYWRkVG9CaW4oY3VydmVJZCwgZGV0YWlsICsgMSwgMSwgYmluc0xpc3QsIGJpbnNEaWN0KTsNCg0KICAgICAgY3VydmVEZXRhaWxzW2N1cnZlSWRdID0gZGV0YWlsOw0KICAgIH0gY2F0Y2ggKGUpIHsNCiAgICAgIGNvbnNvbGUud2FybignRXJyb3Igd2hpbGUgcmVhZGluZyBDQURDdXJ2ZSBkYXRhIGluIHdlYiB3b3JrZXI6ICcsIGN1cnZlSWQsIGUpOw0KICAgIH0NCiAgfQ0KDQogIC8vIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8NCiAgLy8gTm93IGxheW91dCB0aGUgY3VydmVzIGluIGJhdGNoZXMuIEJpZ2dlc3QgdG8gc21hbGxlc3QNCiAgY29uc3QgY3VydmVzQXRsYXNMYXlvdXRUZXh0dXJlU2l6ZSA9IGNhbGNDb250YWluZXJTaXplKG51bUN1cnZlcyAqIDIpOyAvLyAsIDIvKiBwaXhlbHMgcGVyIGl0ZW0gKi8sIDEpOw0KICBjb25zdCBjdXJ2ZXNBdGxhc0xheW91dCA9IG5ldyBGbG9hdDMyQXJyYXkoY3VydmVzQXRsYXNMYXlvdXRUZXh0dXJlU2l6ZVswXSAqIGN1cnZlc0F0bGFzTGF5b3V0VGV4dHVyZVNpemVbMV0gKiA0KTsNCg0KICBsYXlvdXRCaW5zKGJpbnNMaXN0LCBfX2N1cnZlc1BhY2tlciwgKGJpbiwgaSwgdSwgdikgPT4gew0KICAgIGNvbnN0IGN1cnZlSWQgPSBiaW4uaWRzW2ldOw0KDQogICAgY29uc3Qgb2Zmc2V0ID0gY3VydmVJZCAqIHZhbHVlc1BlckN1cnZlTGlicmFyeUxheW91dEl0ZW07DQogICAgY3VydmVzQXRsYXNMYXlvdXRbb2Zmc2V0ICsgMF0gPSB1Ow0KICAgIGN1cnZlc0F0bGFzTGF5b3V0W29mZnNldCArIDFdID0gdjsNCiAgICBjdXJ2ZXNBdGxhc0xheW91dFtvZmZzZXQgKyAyXSA9IGJpbi5pdGVtV2lkdGg7DQogICAgY3VydmVzQXRsYXNMYXlvdXRbb2Zmc2V0ICsgM10gPSBiaW4uaXRlbUhlaWdodDsNCg0KICAgIC8vIGNvbnN0IGxheW91dCA9IFsNCiAgICAvLyAgIGN1cnZlc0F0bGFzTGF5b3V0WyhvZmZzZXQpICsgMF0sDQogICAgLy8gICBjdXJ2ZXNBdGxhc0xheW91dFsob2Zmc2V0KSArIDFdLA0KICAgIC8vICAgY3VydmVzQXRsYXNMYXlvdXRbKG9mZnNldCkgKyAyXSwNCiAgICAvLyAgIGN1cnZlc0F0bGFzTGF5b3V0WyhvZmZzZXQpICsgM11dOw0KICAgIC8vIGNvbnNvbGUubG9nKCJSZW5kZXIgQ3VydmUgSWQgIiArIGN1cnZlSWQgKyAiOlsiICsgbGF5b3V0ICsgIl0iKQ0KDQogICAgLy8gVE9ETzoganVzdCB3cml0ZSB0aGUgY3VydmVJRCBoZXJlIGluc3RlYWQgYW5kIHdlIGNhbiBsb29rdXAgdGhlIGNvb3JkcyBpbiB0aGUgc2hhZGVyDQogICAgY3VydmVzRGF0YVJlYWRlci5zZWVrKGdlb21MaWJyYXJ5SGVhZGVyU2l6ZSArIGN1cnZlSWQgKiAodmFsdWVzUGVyQ3VydmVUb2NJdGVtICogMikgLyogYnBjKi8pOw0KICAgIGNvbnN0IGNvb3Jkc1ggPSBjdXJ2ZXNEYXRhUmVhZGVyLmxvYWRVRmxvYXQxNigpOw0KICAgIGNvbnN0IGNvb3Jkc1kgPSBjdXJ2ZXNEYXRhUmVhZGVyLmxvYWRVRmxvYXQxNigpOw0KICAgIC8vIGNvbnNvbGUubG9nKCJDdXJ2ZSBJZCAiLCBjdXJ2ZUlkLCAiOlsiLCBjb29yZHNYLCAiLCAiLCBjb29yZHNZLCAiXSIpDQogICAgY3VydmVzQXRsYXNMYXlvdXRbb2Zmc2V0ICsgNF0gPSBjb29yZHNYOw0KICAgIGN1cnZlc0F0bGFzTGF5b3V0W29mZnNldCArIDVdID0gY29vcmRzWTsNCg0KICAgIC8vIGNvbnNvbGUubG9nKCJDdXJ2ZSA6IiwgY3VydmVJZCwgIjoiLCB1LCB2LCBiaW4uaXRlbVdpZHRoLCBiaW4uaXRlbUhlaWdodCk7DQogIH0pOw0KDQogIHdvcmtlclN0YXRlLmN1cnZlRGV0YWlscyA9IGN1cnZlRGV0YWlsczsNCg0KICByZXR1cm4gew0KICAgIG51bUN1cnZlcywNCiAgICBjdXJ2ZXNBdGxhc0xheW91dCwNCiAgICBjdXJ2ZXNBdGxhc0xheW91dFRleHR1cmVTaXplLA0KICB9DQp9Ow0KDQpjb25zdCBsYXlvdXRTdXJmYWNlcyA9IChzdXJmYWNlc0RhdGFSZWFkZXIsIGVycm9yVG9sZXJhbmNlLCBtYXhUZXhTaXplLCBzdXJmYWNlQXJlYVRocmVzaG9sZCwgY2FkRGF0YVZlcnNpb24pID0+IHsNCiAgY29uc3Qgc3VyZmFjZUxpYnJhcnlTaXplID0gTWF0aC5zcXJ0KHN1cmZhY2VzRGF0YVJlYWRlci5kYXRhLmJ5dGVMZW5ndGggLyA4KTsgLy8gUkdCQTE2IHBpeGVscw0KICBjb25zdCBudW1TdXJmYWNlcyA9IHN1cmZhY2VzRGF0YVJlYWRlci5sb2FkVUludDMyKCk7DQogIGNvbnNvbGUubG9nKCdudW1TdXJmYWNlcyA6JywgbnVtU3VyZmFjZXMpOw0KICBpZiAobnVtU3VyZmFjZXMgPT0gMCkgcmV0dXJuDQoNCiAgY29uc3QgdG90YWxTdXJmYWNlQXJlYSA9IHN1cmZhY2VzRGF0YVJlYWRlci5sb2FkRmxvYXQzMigpOw0KICBjb25zdCB0b3RhbFN1cmZhY2VDb3N0ID0gc3VyZmFjZXNEYXRhUmVhZGVyLmxvYWRGbG9hdDMyKCk7DQogIGNvbnN0IHN1cmZhY2VEZXRhaWxzID0gbmV3IEludDMyQXJyYXkobnVtU3VyZmFjZXMgKiA3KTsgLy8gZmxhZ3MsIGFkZHJYLCBhZGRyWSwgc3VyZmFjZVR5cGUsIGRldGFpbFgsIGRldGFpbFksIHRyaW1TZXRJZDsNCiAgY29uc3Qgc2Vla1N1cmZhY2VEYXRhID0gKGFkZHIpID0+IHsNCiAgICAvLyBYLCBZIGluIHBpeGVscy4NCiAgICBjb25zdCBieXRlc1BlclBpeGVsID0gODsgLy8gUkdCQTE2IHBpeGVsDQogICAgY29uc3QgYnl0ZU9mZnNldCA9IGFkZHIueCAqIGJ5dGVzUGVyUGl4ZWwgKyBhZGRyLnkgKiBieXRlc1BlclBpeGVsICogc3VyZmFjZUxpYnJhcnlTaXplOw0KICAgIC8vIGNvbnNvbGUubG9nKCJfX3NlZWtTdXJmYWNlRGF0YToiICsgc3VyZmFjZUlkICsgIiBieXRlT2Zmc2V0OiIgKyAoYnl0ZU9mZnNldCArb2Zmc2V0KSArICIgcGl4ZWw6IiArICgoYnl0ZU9mZnNldCArb2Zmc2V0KS84KSArICIgeDoiICsgYWRkci54ICsgIiB5OiIgKyBhZGRyLnkpOw0KICAgIHN1cmZhY2VzRGF0YVJlYWRlci5zZWVrKGJ5dGVPZmZzZXQpOw0KICB9Ow0KDQogIGNvbnN0IGJpbnNMaXN0ID0gW107DQogIGNvbnN0IGJpbnNEaWN0ID0ge307DQogIGNvbnN0IGNvdW50cyA9IHt9Ow0KICBsZXQgdG90YWxEZXRhaWwgPSAwOw0KICBjb25zdCBsb2FkMnhGbG9hdDE2VHJpbVNldElkID0NCiAgICBjb21wYXJlVmVyc2lvbnMoW2NhZERhdGFWZXJzaW9uLm1ham9yLCBjYWREYXRhVmVyc2lvbi5taW5vciwgY2FkRGF0YVZlcnNpb24ucGF0Y2hdLCBbMCwgMCwgMjddKSA+PSAwOw0KICBmb3IgKGxldCBzdXJmYWNlSWQgPSAwOyBzdXJmYWNlSWQgPCBudW1TdXJmYWNlczsgc3VyZmFjZUlkKyspIHsNCiAgICB0cnkgew0KICAgICAgLy8gaWYoc3VyZmFjZUlkICE9IDk2MjgpIHsNCiAgICAgIC8vICAgY29udGludWU7DQogICAgICAvLyB9DQoNCiAgICAgIHN1cmZhY2VzRGF0YVJlYWRlci5zZWVrKGdlb21MaWJyYXJ5SGVhZGVyU2l6ZSArIHN1cmZhY2VJZCAqICh2YWx1ZXNQZXJTdXJmYWNlVG9jSXRlbSAqIDIpIC8qIGJwYyovKTsNCg0KICAgICAgY29uc3QgYWRkclggPSBzdXJmYWNlc0RhdGFSZWFkZXIubG9hZFVGbG9hdDE2KCk7DQogICAgICBjb25zdCBhZGRyWSA9IHN1cmZhY2VzRGF0YVJlYWRlci5sb2FkVUZsb2F0MTYoKTsNCiAgICAgIGxldCBwYXJhbVUgPSBzdXJmYWNlc0RhdGFSZWFkZXIubG9hZEZsb2F0MTYoKTsNCiAgICAgIGxldCBwYXJhbVYgPSBzdXJmYWNlc0RhdGFSZWFkZXIubG9hZEZsb2F0MTYoKTsNCiAgICAgIGxldCBzaXplVSA9IHN1cmZhY2VzRGF0YVJlYWRlci5sb2FkRmxvYXQxNigpOw0KICAgICAgbGV0IHNpemVWID0gc3VyZmFjZXNEYXRhUmVhZGVyLmxvYWRGbG9hdDE2KCk7DQogICAgICBjb25zdCBmbGFncyA9IHN1cmZhY2VzRGF0YVJlYWRlci5sb2FkRmxvYXQxNigpOw0KDQogICAgICBpZiAoIU51bWJlci5pc0Zpbml0ZShzaXplVSkpIHNpemVVID0gNjU1MzY7DQogICAgICBpZiAoIU51bWJlci5pc0Zpbml0ZShzaXplVikpIHNpemVWID0gNjU1MzY7DQoNCiAgICAgIC8vIGRlYnVnIHRyaW0gc2V0IElkDQogICAgICBsZXQgdHJpbVNldElkOw0KICAgICAgew0KICAgICAgICBpZiAobG9hZDJ4RmxvYXQxNlRyaW1TZXRJZCkgew0KICAgICAgICAgIHRyaW1TZXRJZCA9IHN1cmZhY2VzRGF0YVJlYWRlci5sb2FkU0ludDMyRnJvbTJ4RmxvYXQxNigpOw0KICAgICAgICB9IGVsc2Ugew0KICAgICAgICAgIGNvbnN0IHBhcnRBID0gc3VyZmFjZXNEYXRhUmVhZGVyLmxvYWRGbG9hdDE2KCk7DQogICAgICAgICAgY29uc3QgcGFydEIgPSBzdXJmYWNlc0RhdGFSZWFkZXIubG9hZEZsb2F0MTYoKTsNCiAgICAgICAgICB0cmltU2V0SWQgPSBwYXJ0QSArIChwYXJ0QiA8PCA4KTsNCiAgICAgICAgfQ0KICAgICAgICAvLyBjb25zb2xlLmxvZyhzdXJmYWNlSWQsICIgdHJpbVNldElkOiIsIHRyaW1TZXRJZCk7DQogICAgICAgIC8vIGlmKHRyaW1TZXRJZCA+PSAwKSB7DQogICAgICAgIC8vICAgY29uc29sZS5sb2coc3VyZmFjZUlkICsiIHRyaW1TZXRJZDoiICsgdHJpbVNldElkKTsNCiAgICAgICAgLy8gfQ0KICAgICAgICAvLyBlbHNlIHsNCiAgICAgICAgLy8gICBjb250aW51ZTsNCiAgICAgICAgLy8gfQ0KICAgICAgfQ0KDQogICAgICBzZWVrU3VyZmFjZURhdGEoeyB4OiBhZGRyWCwgeTogYWRkclkgfSk7DQogICAgICBsZXQgc3VyZmFjZVR5cGU7DQogICAgICB0cnkgew0KICAgICAgICBzdXJmYWNlVHlwZSA9IHN1cmZhY2VzRGF0YVJlYWRlci5sb2FkRmxvYXQxNigpOw0KICAgICAgfSBjYXRjaCAoZSkgew0KICAgICAgICBjb25zb2xlLndhcm4oJ0Vycm9yIHdoaWxlIHJlYWRpbmcgU3VyZmFjZSBkYXRhIGluIHdlYiB3b3JrZXI6ICcsIHN1cmZhY2VJZCwgZSk7DQogICAgICAgIGNvbnRpbnVlDQogICAgICB9DQoNCiAgICAgIC8vIGlmKHRyaW1TZXRJZCA9PSA5Mikgew0KICAgICAgLy8gICBjb25zb2xlLmxvZygnc3VyZmFjZVR5cGU6JywgZ2V0U3VyZmFjZVR5cGVOYW1lKHN1cmZhY2VUeXBlKSwgIiBzdXJmYWNlSWQ6Iiwgc3VyZmFjZUlkLCAiIHRyaW1TZXRJZDoiLCB0cmltU2V0SWQsICIgc2l6ZToiLHNpemVVLCAieCIsIHNpemVWKTsNCiAgICAgIC8vIH0NCiAgICAgIC8vIGNvbnNvbGUubG9nKCdzdXJmYWNlVHlwZTonLCBnZXRTdXJmYWNlVHlwZU5hbWUoc3VyZmFjZVR5cGUpLCAiIHN1cmZhY2VJZDoiLCBzdXJmYWNlSWQsICIgdHJpbVNldElkOiIsIHRyaW1TZXRJZCwgIiBzaXplOiIsc2l6ZVUsICJ4Iiwgc2l6ZVYpOw0KICAgICAgLy8gY29uc29sZS5sb2coJ3N1cmZhY2VUeXBlOicsIGdldFN1cmZhY2VUeXBlTmFtZShzdXJmYWNlVHlwZSksICIgc3VyZmFjZUlkOiIsIHN1cmZhY2VJZCwgIiBhZGRyWDoiLCBhZGRyWCwgIiwiLCBhZGRyWSk7DQoNCiAgICAgIC8vIGlmIChzdXJmYWNlVHlwZSAhPSBDQURTdXJmYWNlVHlwZXMuU1VSRkFDRV9UWVBFX0xJTkVBUl9FWFRSVVNJT04pIHsNCiAgICAgIC8vICAgLy8gY29uc29sZS5sb2coJ3N1cmZhY2VUeXBlOicsIGdldFN1cmZhY2VUeXBlTmFtZShzdXJmYWNlVHlwZSksICIgc3VyZmFjZUlkOiIsIHN1cmZhY2VJZCwgIiBhZGRyWDoiLCBhZGRyWCwgIiwiLCBhZGRyWSkNCiAgICAgIC8vICAgY29udGludWU7DQogICAgICAvLyB9DQogICAgICAvLyBpZiAoc3VyZmFjZVR5cGUgIT0gQ0FEU3VyZmFjZVR5cGVzLlNVUkZBQ0VfVFlQRV9OVVJCU19TVVJGQUNFKSB7DQogICAgICAvLyAgIC8vIGNvbnNvbGUubG9nKCdzdXJmYWNlVHlwZTonLCBnZXRTdXJmYWNlVHlwZU5hbWUoc3VyZmFjZVR5cGUpLCAiIHN1cmZhY2VJZDoiLCBzdXJmYWNlSWQsICIgYWRkclg6IiwgYWRkclgsICIsIiwgYWRkclkpDQogICAgICAvLyAgIGNvbnRpbnVlOw0KICAgICAgLy8gfQ0KICAgICAgLy8gaWYoc3VyZmFjZVR5cGUgIT0gQ0FEU3VyZmFjZVR5cGVzLlNVUkZBQ0VfVFlQRV9SRVZPTFVUSU9OICYmIHN1cmZhY2VUeXBlICE9IENBRFN1cmZhY2VUeXBlcy5TVVJGQUNFX1RZUEVfUkVWT0xVVElPTl9GTElQUEVEX0RPTUFJTiApIHsNCiAgICAgIC8vICAgY29udGludWU7DQogICAgICAvLyB9DQogICAgICAvLyBpZihzaXplViA8IDAuNykgew0KICAgICAgLy8gLy8gICAvLyBsZXQgYnJlYWtoZXJlID0gMzs7DQogICAgICAvLyAgIGNvbnRpbnVlOw0KICAgICAgLy8gfQ0KDQogICAgICBsZXQgZGV0YWlsVTsNCiAgICAgIGxldCBkZXRhaWxWOw0KICAgICAgbGV0IGV2YWxmbGFncyA9IDA7DQogICAgICBpZiAoc3VyZmFjZVR5cGUgPT0gQ0FEU3VyZmFjZVR5cGVzLlNVUkZBQ0VfVFlQRV9GQU4pIHsNCiAgICAgICAgZGV0YWlsVSA9IHBhcmFtVTsNCiAgICAgICAgZGV0YWlsViA9IHBhcmFtVjsNCiAgICAgIH0gZWxzZSB7DQogICAgICAgIC8vIElmIHRoZSBhcmVhIGZhbGxzIGJlbG93ICBhdGhyZWFzaG9sZCwgd2Ugc2tpcCB0aGUgc3VyZmFjZS4NCiAgICAgICAgY29uc3QgYXJlYSA9IHNpemVVICogc2l6ZVY7DQogICAgICAgIGlmIChhcmVhIDwgc3VyZmFjZUFyZWFUaHJlc2hvbGQpIHsNCiAgICAgICAgICBjb25zb2xlLmxvZygnU2tpcHBpbmcgOicsIGdldFN1cmZhY2VUeXBlTmFtZShzdXJmYWNlVHlwZSksICcgc2l6ZTonLCBzaXplVSwgJ3gnLCBzaXplViwgJyBhcmVhOicsIGFyZWEpOw0KICAgICAgICAgIGNvbnRpbnVlDQogICAgICAgIH0NCg0KICAgICAgICBpZiAoIU51bWJlci5pc0Zpbml0ZShwYXJhbVUpKSBwYXJhbVUgPSA2NTUzNjsNCiAgICAgICAgaWYgKCFOdW1iZXIuaXNGaW5pdGUocGFyYW1WKSkgcGFyYW1WID0gNjU1MzY7DQogICAgICAgIC8vIHBhcmFtIHZhbHVlcyBlbmNvZGUgY3VydmF0dXJlIGludGVncmF0ZWQgb3ZlciB0aGUgbGVuZ3RoDQogICAgICAgIC8vIGdpdmluZyB0aGUgdG90YWwgY3VydmUuIFdlIG5vdyBuZWVkIHRvIGludGVncmF0ZSBhZ2Fpbg0KICAgICAgICAvLyB0byBnZXQgY29zdC4NCiAgICAgICAgaWYgKGZsYWdzICYgU1VSRkFDRV9GTEFHX0NPU1RfSVNfREVUQUlMX1UpIHsNCiAgICAgICAgICBkZXRhaWxVID0gcGFyYW1VOw0KICAgICAgICB9IGVsc2Ugew0KICAgICAgICAgIGlmIChwYXJhbVUgPT0gMCkgew0KICAgICAgICAgICAgZGV0YWlsVSA9IDE7DQogICAgICAgICAgfSBlbHNlIHsNCiAgICAgICAgICAgIGNvbnN0IGN1cnZhdHVyZSA9IHBhcmFtVSAvIHNpemVVOw0KICAgICAgICAgICAgY29uc3QgcmFkaXVzID0gMSAvIGN1cnZhdHVyZTsNCiAgICAgICAgICAgIGlmIChyYWRpdXMgPCBlcnJvclRvbGVyYW5jZSkgew0KICAgICAgICAgICAgICBkZXRhaWxVID0gNjsNCiAgICAgICAgICAgIH0gZWxzZSB7DQogICAgICAgICAgICAgIGNvbnN0IGEgPSByYWRpdXMgLSBlcnJvclRvbGVyYW5jZTsNCiAgICAgICAgICAgICAgY29uc3QgYXJjQW5nbGUgPSBNYXRoLmFjb3MoYSAvIHJhZGl1cykgKiAyOw0KICAgICAgICAgICAgICBkZXRhaWxVID0gcGFyYW1VIC8gYXJjQW5nbGU7DQogICAgICAgICAgICAgIGRldGFpbFUgPSBNYXRoLm1heCgxLCBNYXRoLnJvdW5kKG5lYXJlc3RQb3cyKGRldGFpbFUpKSk7DQogICAgICAgICAgICAgIGlmIChkZXRhaWxVID4gMTAyNSkgew0KICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignR2VvbSBkZXRhaWxVOicgKyBkZXRhaWxVKTsNCiAgICAgICAgICAgICAgICBkZXRhaWxVID0gMTAyNTsNCiAgICAgICAgICAgICAgfQ0KICAgICAgICAgICAgfQ0KICAgICAgICAgIH0NCiAgICAgICAgfQ0KICAgICAgICBpZiAoZmxhZ3MgJiBTVVJGQUNFX0ZMQUdfQ09TVF9JU19ERVRBSUxfVikgew0KICAgICAgICAgIGRldGFpbFYgPSBwYXJhbVY7DQogICAgICAgIH0gZWxzZSB7DQogICAgICAgICAgaWYgKHBhcmFtViA9PSAwKSB7DQogICAgICAgICAgICBkZXRhaWxWID0gMTsNCiAgICAgICAgICB9IGVsc2Ugew0KICAgICAgICAgICAgY29uc3QgY3VydmF0dXJlID0gcGFyYW1WIC8gc2l6ZVY7DQogICAgICAgICAgICBjb25zdCByYWRpdXMgPSAxIC8gY3VydmF0dXJlOw0KICAgICAgICAgICAgaWYgKHJhZGl1cyA8IGVycm9yVG9sZXJhbmNlKSB7DQogICAgICAgICAgICAgIGRldGFpbFYgPSA2Ow0KICAgICAgICAgICAgfSBlbHNlIHsNCiAgICAgICAgICAgICAgY29uc3QgYSA9IHJhZGl1cyAtIGVycm9yVG9sZXJhbmNlOw0KICAgICAgICAgICAgICBjb25zdCBhcmNBbmdsZSA9IE1hdGguYWNvcyhhIC8gcmFkaXVzKSAqIDI7DQogICAgICAgICAgICAgIGRldGFpbFYgPSBwYXJhbVYgLyBhcmNBbmdsZTsNCiAgICAgICAgICAgICAgZGV0YWlsViA9IE1hdGgubWF4KDEsIE1hdGgucm91bmQobmVhcmVzdFBvdzIoZGV0YWlsVikpKTsNCiAgICAgICAgICAgICAgaWYgKGRldGFpbFYgPiAxMDI1KSB7DQogICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdHZW9tIGRldGFpbFY6JyArIGRldGFpbFYpOw0KICAgICAgICAgICAgICAgIGRldGFpbFYgPSAxMDI1Ow0KICAgICAgICAgICAgICB9DQogICAgICAgICAgICB9DQogICAgICAgICAgfQ0KICAgICAgICB9DQoNCiAgICAgICAgLy8gUm90YXRlIHN1cmZhY2VzIHRvIGZpdCBleGlzdGluZyBkcmF3IHNldHMuDQogICAgICAgIC8vIE5vdGU6IFRoaXMgbWluaW1pc2VzIHRoZSBudW1iZXIgb2YgZHJhdyBzZXRzIGFuZCByZWR1Y2VzIHRoZSB0aW1lIHBhY2tpbmcNCiAgICAgICAgLy8gYnkgZmxpcHBpbmcgc29tZSBzdXJmYWNlcyBkaWFnb25hbGx5Lg0KICAgICAgICBpZiAoZGV0YWlsVSA8IGRldGFpbFYpIHsNCiAgICAgICAgICBjb25zdCB0bXAgPSBkZXRhaWxVOw0KICAgICAgICAgIGRldGFpbFUgPSBkZXRhaWxWOw0KICAgICAgICAgIGRldGFpbFYgPSB0bXA7DQogICAgICAgICAgZXZhbGZsYWdzID0gU1VSRkFDRV9GTEFHX0ZMSVBQRURfVVY7DQogICAgICAgIH0NCiAgICAgICAgLy8gY29uc29sZS5sb2coJ3N1cmZhY2VUeXBlOicsIGdldFN1cmZhY2VUeXBlTmFtZShzdXJmYWNlVHlwZSksICIgc3VyZmFjZUlkOiIsIHN1cmZhY2VJZCwgIiBkZXRhaWw6IixkZXRhaWxVLCAieCIsIGRldGFpbFYsICIgY29zdDoiLHBhcmFtVSwgIngiLCBwYXJhbVYsICIgc2l6ZToiLHNpemVVLCAieCIsIHNpemVWKTsNCiAgICAgIH0NCg0KICAgICAgaWYgKGlzTmFOKGRldGFpbFUpIHx8IGlzTmFOKGRldGFpbFYpIHx8ICFOdW1iZXIuaXNGaW5pdGUoZGV0YWlsVSkgfHwgIU51bWJlci5pc0Zpbml0ZShkZXRhaWxWKSkgew0KICAgICAgICBjb25zb2xlLndhcm4oJ1VuYWJsZSB0byBsYXlvdXQgaXRlbSAnLCBnZXRTdXJmYWNlVHlwZU5hbWUoc3VyZmFjZVR5cGUpLCAnIDonICsgZGV0YWlsVSArICcgeCAnICsgZGV0YWlsVik7DQogICAgICAgIGNvbnRpbnVlDQogICAgICB9DQoNCiAgICAgIC8vIGlmICghKGRldGFpbFUgPj0gMjA0OCB8fCBkZXRhaWxWID49IDIwNDgpKSB7DQogICAgICAvLyAgIGNvbnRpbnVlOw0KICAgICAgLy8gfQ0KDQogICAgICAvLyBUaGUgcXVhZCBzaXplIGRlZmluZWQgdGhlIG51bWJlciBvZiB2ZXJ0aWNlcy4gU28gYSBzaW1wbGUgcGxhbmUgcXVhZCB3aWxsIGNvdmVyIDQgdmVydHMuDQogICAgICAvLyBOb3RlOiB0aGUgZGV0YWlsIHZhbHVlIGlzIGFsd2F5cyBhIHBvd2VyIG9mIDIsIGFuZCB0aGUgbnVtIHZlcnRpY2VzIGFyZSBhbHdheXMgb2RkLg0KICAgICAgLy8gZS5nLiBkZXRhaWwgPSA0LCBudW1WZXJ0cyA9IDUuDQogICAgICBkZXRhaWxVKys7DQogICAgICBkZXRhaWxWKys7DQoNCiAgICAgIGxldCBjYXRlZ29yeSA9IDA7DQogICAgICBpZiAoDQogICAgICAgIHN1cmZhY2VUeXBlID09IENBRFN1cmZhY2VUeXBlcy5TVVJGQUNFX1RZUEVfTElORUFSX0VYVFJVU0lPTiB8fA0KICAgICAgICBzdXJmYWNlVHlwZSA9PSBDQURTdXJmYWNlVHlwZXMuU1VSRkFDRV9UWVBFX1JFVk9MVVRJT04gfHwNCiAgICAgICAgc3VyZmFjZVR5cGUgPT0gQ0FEU3VyZmFjZVR5cGVzLlNVUkZBQ0VfVFlQRV9PRkZTRVRfU1VSRkFDRSB8fA0KICAgICAgICBzdXJmYWNlVHlwZSA9PSBDQURTdXJmYWNlVHlwZXMuU1VSRkFDRV9UWVBFX1JFVk9MVVRJT05fRkxJUFBFRF9ET01BSU4NCiAgICAgICkgew0KICAgICAgICBjYXRlZ29yeSA9IDE7DQogICAgICB9IGVsc2UgaWYgKHN1cmZhY2VUeXBlID09IENBRFN1cmZhY2VUeXBlcy5TVVJGQUNFX1RZUEVfTlVSQlNfU1VSRkFDRSkgew0KICAgICAgICBjYXRlZ29yeSA9IDI7DQogICAgICB9DQoNCiAgICAgIGlmICghY291bnRzW2NhdGVnb3J5XSkgew0KICAgICAgICBjb3VudHNbY2F0ZWdvcnldID0gMTsNCiAgICAgIH0gZWxzZSB7DQogICAgICAgIGNvdW50c1tjYXRlZ29yeV0rKzsNCiAgICAgIH0NCiAgICAgIGFkZFRvQmluKHN1cmZhY2VJZCwgZGV0YWlsVSwgZGV0YWlsViwgYmluc0xpc3QsIGJpbnNEaWN0KTsNCg0KICAgICAgLy8gY29uc29sZS5sb2coJ3N1cmZhY2VUeXBlOicsIGdldFN1cmZhY2VUeXBlTmFtZShzdXJmYWNlVHlwZSksICIgc3VyZmFjZUlkOiIsIHN1cmZhY2VJZCwgIiBkZXRhaWw6IixkZXRhaWxVLCAieCIsIGRldGFpbFYpOw0KDQogICAgICBjb25zdCBvZmZzZXQgPSBzdXJmYWNlSWQgKiA3Ow0KICAgICAgc3VyZmFjZURldGFpbHNbb2Zmc2V0ICsgMF0gPSBldmFsZmxhZ3MgfCBmbGFnczsNCiAgICAgIHN1cmZhY2VEZXRhaWxzW29mZnNldCArIDFdID0gYWRkclg7DQogICAgICBzdXJmYWNlRGV0YWlsc1tvZmZzZXQgKyAyXSA9IGFkZHJZOw0KICAgICAgc3VyZmFjZURldGFpbHNbb2Zmc2V0ICsgM10gPSBjYXRlZ29yeTsNCiAgICAgIHN1cmZhY2VEZXRhaWxzW29mZnNldCArIDRdID0gZGV0YWlsVTsNCiAgICAgIHN1cmZhY2VEZXRhaWxzW29mZnNldCArIDVdID0gZGV0YWlsVjsNCiAgICAgIHN1cmZhY2VEZXRhaWxzW29mZnNldCArIDZdID0gdHJpbVNldElkOw0KICAgICAgdG90YWxEZXRhaWwgKz0gZGV0YWlsVSAqIGRldGFpbFY7DQogICAgfSBjYXRjaCAoZSkgew0KICAgICAgY29uc29sZS53YXJuKCdFcnJvciB3aGlsZSByZWFkaW5nIFN1cmZhY2UgZGF0YSBpbiB3ZWIgd29ya2VyOiAnLCBzdXJmYWNlSWQsIGUpOw0KICAgIH0NCiAgfQ0KDQogIC8vIGNvbnNvbGUubG9nKCdudW1TdXJmYWNlczonLCBudW1TdXJmYWNlcywgJyB0b3RhbERldGFpbDonLCB0b3RhbERldGFpbCkNCg0KICAvLyAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vDQogIC8vIE5vdyBsYXlvdXQgdGhlIHN1cmZhY2VzIGluIGJhdGNoZXMuIEJpZ2dlc3QgdG8gc21hbGxlc3QNCiAgY29uc3QgaXRlbUNvdW50VVYgPSBjYWxjQ29udGFpbmVyU2l6ZShudW1TdXJmYWNlcywgMiAvKiBwaXhlbHMgcGVyIGl0ZW0gKi8sIDEpOw0KICBjb25zdCBzdXJmYWNlc0F0bGFzTGF5b3V0VGV4dHVyZVNpemUgPSBbaXRlbUNvdW50VVZbMF0gKiAyLCBpdGVtQ291bnRVVlsxXV07DQogIGNvbnN0IHN1cmZhY2VzQXRsYXNMYXlvdXQgPSBuZXcgRmxvYXQzMkFycmF5KA0KICAgIGl0ZW1Db3VudFVWWzBdICogMiAvKiBwaXhlbHMgcGVyIGl0ZW0gKi8gKiBpdGVtQ291bnRVVlsxXSAqIDQgLyogY2hhbm5lbHMgcGVyIHBpeGVsKi8NCiAgKTsNCg0KICBjb25zdCBzdXJmYWNlc0V2YWxBdHRycyA9IFtdOw0KICBmb3IgKGNvbnN0IGNhdGVnb3J5IGluIGNvdW50cykgew0KICAgIGNvbnN0IGNvdW50ID0gY291bnRzW2NhdGVnb3J5XTsNCiAgICBzdXJmYWNlc0V2YWxBdHRyc1twYXJzZUludChjYXRlZ29yeSldID0gbmV3IEZsb2F0MzJBcnJheShjb3VudCAvKiBmbG9hdHMgcGVyIGl0ZW0gKi8pOw0KICAgIC8vIHJlc2V0IHNvIHdlIGNhbiByZS1jb3VudA0KICAgIGNvdW50c1tjYXRlZ29yeV0gPSBudWxsOw0KICB9DQogIGxheW91dEJpbnMoDQogICAgYmluc0xpc3QsDQogICAgX19zdXJmYWNlUGFja2VyLA0KICAgIChiaW4sIGksIHUsIHYpID0+IHsNCiAgICAgIGNvbnN0IHN1cmZhY2VJZCA9IGJpbi5pZHNbaV07DQogICAgICAvLyBjb25zb2xlLmxvZygic3VyZmFjZUlkOiIgKyBzdXJmYWNlSWQgKyAiIHU6IiArdSArICIgdjoiICsgdiArICIgdzoiICsgYmluLml0ZW1XaWR0aCArICIgaDoiICsgYmluLml0ZW1IZWlnaHQpOw0KICAgICAgY29uc3QgZGV0YWlsc09mZnNldCA9IHN1cmZhY2VJZCAqIDc7DQogICAgICBjb25zdCBmbGFncyA9IHN1cmZhY2VEZXRhaWxzW2RldGFpbHNPZmZzZXQgKyAwXTsNCiAgICAgIGNvbnN0IGFkZHJYID0gc3VyZmFjZURldGFpbHNbZGV0YWlsc09mZnNldCArIDFdOw0KICAgICAgY29uc3QgYWRkclkgPSBzdXJmYWNlRGV0YWlsc1tkZXRhaWxzT2Zmc2V0ICsgMl07DQogICAgICBjb25zdCBjYXRlZ29yeSA9IHN1cmZhY2VEZXRhaWxzW2RldGFpbHNPZmZzZXQgKyAzXTsNCiAgICAgIC8vIGNvbnNvbGUubG9nKCJzdXJmYWNlSWQ6IiArIHN1cmZhY2VJZCArICIgYWRkclg6IiArYWRkclggKyAiIGFkZHJZOiIgKyBhZGRyWSArICIgY2F0ZWdvcnk6IiArIGNhdGVnb3J5KTsNCg0KICAgICAgY29uc3Qgb2Zmc2V0ID0gc3VyZmFjZUlkICogdmFsdWVzUGVyU3VyZmFjZUxpYnJhcnlMYXlvdXRJdGVtOw0KICAgICAgc3VyZmFjZXNBdGxhc0xheW91dFtvZmZzZXQgKyAwXSA9IHU7DQogICAgICBzdXJmYWNlc0F0bGFzTGF5b3V0W29mZnNldCArIDFdID0gdjsNCiAgICAgIHN1cmZhY2VzQXRsYXNMYXlvdXRbb2Zmc2V0ICsgMl0gPSBiaW4uaXRlbVdpZHRoOw0KICAgICAgc3VyZmFjZXNBdGxhc0xheW91dFtvZmZzZXQgKyAzXSA9IGJpbi5pdGVtSGVpZ2h0Ow0KDQogICAgICBzdXJmYWNlc0F0bGFzTGF5b3V0W29mZnNldCArIDRdID0gYWRkclg7DQogICAgICBzdXJmYWNlc0F0bGFzTGF5b3V0W29mZnNldCArIDVdID0gYWRkclk7DQogICAgICBzdXJmYWNlc0F0bGFzTGF5b3V0W29mZnNldCArIDZdID0gZmxhZ3M7DQoNCiAgICAgIC8vIHdyaXRlIHRoZSBzdXJmYWNlSUQgd2UgbG9va3VwIHRoZSBsYXlvdXQgY29vcmRzIGluIHRoZSBzaGFkZXINCiAgICAgIGlmIChjb3VudHNbY2F0ZWdvcnldID09PSBudWxsKSB7DQogICAgICAgIGNvdW50c1tjYXRlZ29yeV0gPSAwOw0KICAgICAgfSBlbHNlIHsNCiAgICAgICAgY291bnRzW2NhdGVnb3J5XSsrOw0KICAgICAgfQ0KICAgICAgc3VyZmFjZXNFdmFsQXR0cnNbY2F0ZWdvcnldW2NvdW50c1tjYXRlZ29yeV1dID0gc3VyZmFjZUlkOw0KICAgIH0NCiAgICAvKiAsIChiaW4sIGJsb2NrKT0+ew0KICAgICAgICBjb25zb2xlLmxvZyhbX19zdXJmYWNlUGFja2VyLnJvb3QudywgX19zdXJmYWNlUGFja2VyLnJvb3QuaF0gKyAiOiIgKyBbYmluLml0ZW1XaWR0aCwgYmluLml0ZW1IZWlnaHRdICsgIjoiICsgYmluLml0ZW1Db3VudFVWICsgIjoiICsgW2Jpbi53LCBiaW4uaF0pDQogICAgICB9Ki8NCiAgKTsNCg0KICB3b3JrZXJTdGF0ZS5zdXJmYWNlRGV0YWlscyA9IHN1cmZhY2VEZXRhaWxzOw0KICB3b3JrZXJTdGF0ZS5zdXJmYWNlc0F0bGFzTGF5b3V0ID0gc3VyZmFjZXNBdGxhc0xheW91dDsNCg0KICByZXR1cm4gew0KICAgIG51bVN1cmZhY2VzLA0KICAgIHN1cmZhY2VzQXRsYXNMYXlvdXQsDQogICAgc3VyZmFjZXNFdmFsQXR0cnMsDQogICAgc3VyZmFjZXNBdGxhc0xheW91dFRleHR1cmVTaXplLA0KICB9DQp9Ow0KDQpjb25zdCBsYXlvdXRUcmltU2V0cyA9ICh0cmltU2V0c1JlYWRlciwgY2FkRGF0YVZlcnNpb24sIGN1cnZlc0F0bGFzTGF5b3V0LCBsb2QsIHRyaW1UZXhlbFNpemUpID0+IHsNCiAgY29uc3QgbnVtVHJpbVNldHMgPSB0cmltU2V0c1JlYWRlci5sb2FkVUludDMyKCk7DQogIGxldCB0cmltU2V0c0J1ZmZlckhlYWRlciA9IDQ7DQogIGlmIChjb21wYXJlVmVyc2lvbnMoW2NhZERhdGFWZXJzaW9uLm1ham9yLCBjYWREYXRhVmVyc2lvbi5taW5vciwgY2FkRGF0YVZlcnNpb24ucGF0Y2hdLCBbMCwgMCwgMF0pID4gMCkgew0KICAgIHRyaW1TZXRzQnVmZmVySGVhZGVyID0gODsNCiAgfQ0KDQogIGNvbnN0IHRyaW1TZXRzQXRsYXNMYXlvdXRUZXh0dXJlU2l6ZSA9IGNhbGNDb250YWluZXJTaXplKG51bVRyaW1TZXRzLCAxLCAxKTsNCiAgY29uc3QgdHJpbVNldHNBdGxhc0xheW91dERhdGEgPSBuZXcgRmxvYXQzMkFycmF5KA0KICAgIHRyaW1TZXRzQXRsYXNMYXlvdXRUZXh0dXJlU2l6ZVswXSAqIHRyaW1TZXRzQXRsYXNMYXlvdXRUZXh0dXJlU2l6ZVsxXSAqIDQNCiAgKTsNCg0KICBjb25zdCBsb2FkQ3VydmVSZWYgPSAoY3VydmVJbmRleFdpdGhpbkxvb3ApID0+IHsNCiAgICBjb25zdCBjdXJ2ZUlkID0gdHJpbVNldHNSZWFkZXIubG9hZEZsb2F0MzIoKTsNCiAgICBjb25zdCB0cl94ID0gdHJpbVNldHNSZWFkZXIubG9hZEZsb2F0MzIoKTsNCiAgICBjb25zdCB0cl95ID0gdHJpbVNldHNSZWFkZXIubG9hZEZsb2F0MzIoKTsNCiAgICBjb25zdCByb3cwX3ggPSB0cmltU2V0c1JlYWRlci5sb2FkRmxvYXQzMigpOw0KICAgIGNvbnN0IHJvdzBfeSA9IHRyaW1TZXRzUmVhZGVyLmxvYWRGbG9hdDMyKCk7DQogICAgY29uc3Qgcm93MV94ID0gdHJpbVNldHNSZWFkZXIubG9hZEZsb2F0MzIoKTsNCiAgICBjb25zdCByb3cxX3kgPSB0cmltU2V0c1JlYWRlci5sb2FkRmxvYXQzMigpOw0KICAgIGNvbnN0IGZsYWdzID0gdHJpbVNldHNSZWFkZXIubG9hZEZsb2F0MzIoKTsNCg0KICAgIC8vIGNvbnNvbGUubG9nKCJDdXJ2ZVJlZiA6IiwgY3VydmVJZCwgIiBmbGFnczoiLCBmbGFncyk7DQogICAgLy8gTm90ZTogdGhlIGN1cnZlIGxheW91dCBzdG9yZXMgdGhlIG51bWJlciBvZiB2ZXJ0aWNlcywgbm90IHRoZSAnZGV0YWlsJyB2YWx1ZSwgd2hpY2gNCiAgICAvLyBpcyB3aGF0IHdlIGV4cGVjdCBoZXJlLg0KICAgIGNvbnN0IGRldGFpbCA9IGN1cnZlc0F0bGFzTGF5b3V0W2N1cnZlSWQgKiB2YWx1ZXNQZXJDdXJ2ZUxpYnJhcnlMYXlvdXRJdGVtICsgMl0gLSAxOw0KICAgIGNvbnN0IHJlc3VsdCA9IHsNCiAgICAgIGN1cnZlSWQsDQogICAgICBjdXJ2ZUluZGV4V2l0aGluTG9vcCwNCiAgICAgIGFkZHI6IFsNCiAgICAgICAgY3VydmVzQXRsYXNMYXlvdXRbY3VydmVJZCAqIHZhbHVlc1BlckN1cnZlTGlicmFyeUxheW91dEl0ZW0gKyAwXSwNCiAgICAgICAgY3VydmVzQXRsYXNMYXlvdXRbY3VydmVJZCAqIHZhbHVlc1BlckN1cnZlTGlicmFyeUxheW91dEl0ZW0gKyAxXSwNCiAgICAgIF0sDQogICAgICBkZXRhaWwsDQogICAgICB0cjogW3RyX3gsIHRyX3ldLA0KICAgICAgcm93MDogW3JvdzBfeCwgcm93MF95XSwNCiAgICAgIHJvdzE6IFtyb3cxX3gsIHJvdzFfeV0sDQogICAgICBmbGFncywNCiAgICB9Ow0KICAgIHJldHVybiByZXN1bHQNCiAgfTsNCg0KICBjb25zdCBnZXRUcmltU2V0Q3VydmVSZWZzID0gKHRyaW1TZXRJZCkgPT4gew0KICAgIHRyaW1TZXRzUmVhZGVyLnNlZWsodHJpbVNldHNCdWZmZXJIZWFkZXIgKyB0cmltU2V0SWQgKiA0KTsNCiAgICB0cmltU2V0c1JlYWRlci5zZWVrKHRyaW1TZXRzUmVhZGVyLmxvYWRVSW50MzIoKSArIDgpOw0KDQogICAgY29uc3QgbnVtSG9sZXMgPSB0cmltU2V0c1JlYWRlci5sb2FkVUludDMyKCk7DQogICAgY29uc3QgbnVtUGVybWl0ZXJDdXJ2ZXMgPSB0cmltU2V0c1JlYWRlci5sb2FkVUludDMyKCk7DQogICAgY29uc3QgdHJpbVNldEN1cnZlUmVmcyA9IFtdOw0KICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbnVtUGVybWl0ZXJDdXJ2ZXM7IGkrKykgew0KICAgICAgdHJpbVNldEN1cnZlUmVmcy5wdXNoKGxvYWRDdXJ2ZVJlZihpKSk7DQogICAgfQ0KICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbnVtSG9sZXM7IGkrKykgew0KICAgICAgY29uc3QgbnVtSG9sZUN1cnZlcyA9IHRyaW1TZXRzUmVhZGVyLmxvYWRVSW50MzIoKTsNCiAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgbnVtSG9sZUN1cnZlczsgaisrKSB7DQogICAgICAgIGNvbnN0IGN1cnZlUmVmID0gbG9hZEN1cnZlUmVmKGopOw0KICAgICAgICB0cmltU2V0Q3VydmVSZWZzLnB1c2goY3VydmVSZWYpOw0KICAgICAgfQ0KICAgIH0NCiAgICByZXR1cm4gdHJpbVNldEN1cnZlUmVmcw0KICB9Ow0KDQogIGNvbnN0IGJpbnNMaXN0ID0gW107DQogIGNvbnN0IGJpbnNEaWN0ID0ge307DQogIGNvbnN0IHRyaW1TZXRCb3JkZXIgPSAxOw0KDQogIGZvciAobGV0IHRyaW1TZXRJZCA9IDA7IHRyaW1TZXRJZCA8IG51bVRyaW1TZXRzOyB0cmltU2V0SWQrKykgew0KICAgIHRyeSB7DQogICAgICAvLyBpZih0cmltU2V0SWQgIT0gMjApIHsNCiAgICAgIC8vICAgY29udGludWU7DQogICAgICAvLyB9DQogICAgICB0cmltU2V0c1JlYWRlci5zZWVrKHRyaW1TZXRzQnVmZmVySGVhZGVyICsgdHJpbVNldElkICogNCk7DQogICAgICB0cmltU2V0c1JlYWRlci5zZWVrKHRyaW1TZXRzUmVhZGVyLmxvYWRVSW50MzIoKSk7DQogICAgICBjb25zdCBzaXplVSA9IHRyaW1TZXRzUmVhZGVyLmxvYWRGbG9hdDMyKCk7DQogICAgICBjb25zdCBzaXplViA9IHRyaW1TZXRzUmVhZGVyLmxvYWRGbG9hdDMyKCk7DQoNCiAgICAgIC8vIGlmIChzaXplVSA+IDIwMCB8fCBzaXplViA+IDIwMCkNCiAgICAgIC8vIGNvbnNvbGUubG9nKCIgdHJpbVNldElkOiIsIHRyaW1TZXRJZCwgIiBzaXplOiIsc2l6ZVUsICJ4Iiwgc2l6ZVYpOw0KDQogICAgICBpZiAoaXNOYU4oc2l6ZVUpIHx8IGlzTmFOKHNpemVWKSkgew0KICAgICAgICBjb25zb2xlLndhcm4oJ1VuYWJsZSB0byBsYXlvdXQgaXRlbTonICsgc2l6ZVUgKyAnIHggJyArIHNpemVWKTsNCiAgICAgICAgY29udGludWUNCiAgICAgIH0NCiAgICAgIC8vIE5vdGU6IFN1YnRyYWN0IG9mZiB0aGUgYm9yZGVyIHdpZHRoLg0KICAgICAgY29uc3QgbnVtUGl4ZWxzVSA9IE1hdGgubWF4KDEsIG5lYXJlc3RQb3cyKE1hdGguY2VpbChzaXplVSAvIHRyaW1UZXhlbFNpemUpKSAtIHRyaW1TZXRCb3JkZXIpOw0KICAgICAgY29uc3QgbnVtUGl4ZWxzViA9IE1hdGgubWF4KDEsIG5lYXJlc3RQb3cyKE1hdGguY2VpbChzaXplViAvIHRyaW1UZXhlbFNpemUpKSAtIHRyaW1TZXRCb3JkZXIpOw0KICAgICAgLy8gaWYobnVtUGl4ZWxzVSA+IDEgfHwgbnVtUGl4ZWxzViA+IDEpDQogICAgICAvLyAgIGNvbnNvbGUubG9nKCJUcmltU2V0OiIgKyBpICsgIiBzaXplOiIgKyBzaXplVSArICI6IiArIHNpemVWICsgIiAiICsgbnVtUGl4ZWxzVSArICIsIiArIG51bVBpeGVsc1YpDQogICAgICBpZiAoaXNOYU4obnVtUGl4ZWxzVSkgfHwgaXNOYU4obnVtUGl4ZWxzVikpIHsNCiAgICAgICAgY29uc29sZS53YXJuKCdVbmFibGUgdG8gbGF5b3V0IGl0ZW06JyArIG51bVBpeGVsc1UgKyAnIHggJyArIG51bVBpeGVsc1YpOw0KICAgICAgICBjb250aW51ZQ0KICAgICAgfQ0KICAgICAgYWRkVG9CaW4odHJpbVNldElkLCBudW1QaXhlbHNVICsgdHJpbVNldEJvcmRlciAqIDIsIG51bVBpeGVsc1YgKyB0cmltU2V0Qm9yZGVyICogMiwgYmluc0xpc3QsIGJpbnNEaWN0KTsNCiAgICB9IGNhdGNoIChlKSB7DQogICAgICBjb25zb2xlLndhcm4oJ0Vycm9yIHdoaWxlIHJlYWRpbmcgVHJpbVNldCBkYXRhIGluIHdlYiB3b3JrZXI6ICcsIHRyaW1TZXRJZCwgZSk7DQogICAgfQ0KICB9DQoNCiAgLy8gLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLw0KICAvLyBTb3J0IHRoZSBiaW5zIGludG8gYmlnZ2VzdCB0byBzbWFsbGVzdCBzbyB3ZSBwYWNrIHRoZSBiaWdnZXIgb25lcyBmaXJzdC4NCg0KICBjb25zdCB0cmltQ3VydmVEcmF3U2V0c190bXAgPSB7fTsNCg0KICBsYXlvdXRCaW5zKA0KICAgIGJpbnNMaXN0LA0KICAgIF9fdHJpbVNldFBhY2tlciwNCiAgICAoYmluLCBpLCB1LCB2KSA9PiB7DQogICAgICBjb25zdCB0cmltU2V0SWQgPSBiaW4uaWRzW2ldOw0KDQogICAgICBjb25zdCB0cmltU2V0Q3VydmVSZWZzID0gZ2V0VHJpbVNldEN1cnZlUmVmcyh0cmltU2V0SWQpOw0KICAgICAgLy8gaWYodHJpbVNldElkPT0wKSB7DQogICAgICAvLyAgIGNvbnNvbGUubG9nKCJUcmltU2V0OiIsIFt1K3RyaW1TZXRCb3JkZXIsIHYrdHJpbVNldEJvcmRlciwgYmluLml0ZW1XaWR0aC0odHJpbVNldEJvcmRlcioyKSwgYmluLml0ZW1IZWlnaHQtKHRyaW1TZXRCb3JkZXIqMildKQ0KICAgICAgLy8gfQ0KDQogICAgICAvLyBjb25zb2xlLmxvZygiVHJpbVNldDoiLCBbdSt0cmltU2V0Qm9yZGVyLCB2K3RyaW1TZXRCb3JkZXIsIGJpbi5pdGVtV2lkdGgtKHRyaW1TZXRCb3JkZXIqMiksIGJpbi5pdGVtSGVpZ2h0LSh0cmltU2V0Qm9yZGVyKjIpXSkNCg0KICAgICAgLy8gR2VuZXJhdGluZyB0aGUgdGV4dHVyZSB0byBiZSByZWFkIGZyb20gZHVyaW5nIGluc3RhbmNlIHJhc3Rlcml6YXRpb24uDQogICAgICBjb25zdCBvZmZzZXQgPSB0cmltU2V0SWQgKiA0Ow0KICAgICAgdHJpbVNldHNBdGxhc0xheW91dERhdGFbb2Zmc2V0ICsgMF0gPSB1ICsgdHJpbVNldEJvcmRlcjsNCiAgICAgIHRyaW1TZXRzQXRsYXNMYXlvdXREYXRhW29mZnNldCArIDFdID0gdiArIHRyaW1TZXRCb3JkZXI7DQogICAgICB0cmltU2V0c0F0bGFzTGF5b3V0RGF0YVtvZmZzZXQgKyAyXSA9IGJpbi5pdGVtV2lkdGggLSB0cmltU2V0Qm9yZGVyICogMjsNCiAgICAgIHRyaW1TZXRzQXRsYXNMYXlvdXREYXRhW29mZnNldCArIDNdID0gYmluLml0ZW1IZWlnaHQgLSB0cmltU2V0Qm9yZGVyICogMjsNCg0KICAgICAgZm9yIChjb25zdCB0cmltQ3VydmUgb2YgdHJpbVNldEN1cnZlUmVmcykgew0KICAgICAgICBsZXQgZHJhd1NldCA9IHRyaW1DdXJ2ZURyYXdTZXRzX3RtcFt0cmltQ3VydmUuZGV0YWlsXTsNCiAgICAgICAgaWYgKCFkcmF3U2V0KSB7DQogICAgICAgICAgZHJhd1NldCA9IFtdOw0KICAgICAgICAgIHRyaW1DdXJ2ZURyYXdTZXRzX3RtcFt0cmltQ3VydmUuZGV0YWlsXSA9IGRyYXdTZXQ7DQogICAgICAgIH0NCg0KICAgICAgICAvLyBwYXRjaENvb3Jkcw0KICAgICAgICBkcmF3U2V0LnB1c2godSArIHRyaW1TZXRCb3JkZXIpOw0KICAgICAgICBkcmF3U2V0LnB1c2godiArIHRyaW1TZXRCb3JkZXIpOw0KICAgICAgICBkcmF3U2V0LnB1c2goYmluLml0ZW1XaWR0aCAtIHRyaW1TZXRCb3JkZXIgKiAyKTsNCiAgICAgICAgZHJhd1NldC5wdXNoKGJpbi5pdGVtSGVpZ2h0IC0gdHJpbVNldEJvcmRlciAqIDIpOw0KDQogICAgICAgIC8vIGRhdGEwICh2ZWM0KQ0KICAgICAgICBkcmF3U2V0LnB1c2godHJpbUN1cnZlLnRyWzBdKTsNCiAgICAgICAgZHJhd1NldC5wdXNoKHRyaW1DdXJ2ZS50clsxXSk7DQogICAgICAgIGRyYXdTZXQucHVzaCh0cmltQ3VydmUucm93MFswXSk7DQogICAgICAgIGRyYXdTZXQucHVzaCh0cmltQ3VydmUucm93MFsxXSk7DQoNCiAgICAgICAgLy8gZGF0YTEgKHZlYzQpDQogICAgICAgIGRyYXdTZXQucHVzaCh0cmltQ3VydmUucm93MVswXSk7DQogICAgICAgIGRyYXdTZXQucHVzaCh0cmltQ3VydmUucm93MVsxXSk7DQogICAgICAgIGRyYXdTZXQucHVzaCh0cmltQ3VydmUuYWRkclswXSk7DQogICAgICAgIGRyYXdTZXQucHVzaCh0cmltQ3VydmUuYWRkclsxXSk7DQoNCiAgICAgICAgZHJhd1NldC5wdXNoKHRyaW1DdXJ2ZS5mbGFncyk7DQogICAgICAgIGRyYXdTZXQucHVzaCh0cmltQ3VydmUuY3VydmVJbmRleFdpdGhpbkxvb3ApOw0KICAgICAgICAvLyBkcmF3U2V0LnB1c2godHJpbUN1cnZlLmN1cnZlSWQpDQoNCiAgICAgICAgLy8gZHJhd1NldC5wdXNoKGxvb3BTdGFydFBvcyk7DQogICAgICB9DQogICAgfQ0KICAgIC8qICwgKGJpbiwgYmxvY2spPT57DQogICAgICAgICAgY29uc29sZS5sb2coIkxheW91dCBUcmltU2V0IGJpbjoiICsgYmluLml0ZW1Db3VudFVWICsgIiA+ICIgKyBibG9jay54ICsgIiwiICsgYmxvY2sueSArICIgIiArIGJpbi53ICsgIiwiICsgYmluLmgpOw0KICAgICAgfSovDQogICk7DQoNCiAgLy8gTm93IGNvbnZlcnQgYWxsIHRoZSBkcmF3IHNldHMgdG8gdHlwZWQgYXJyYXlzDQogIGNvbnN0IHRyaW1DdXJ2ZURyYXdTZXRzID0ge307DQogIGZvciAoY29uc3Qga2V5IGluIHRyaW1DdXJ2ZURyYXdTZXRzX3RtcCkgew0KICAgIHRyaW1DdXJ2ZURyYXdTZXRzW2tleV0gPSBGbG9hdDMyQXJyYXkuZnJvbSh0cmltQ3VydmVEcmF3U2V0c190bXBba2V5XSk7DQogIH0NCiAgd29ya2VyU3RhdGUudHJpbVNldHNBdGxhc0xheW91dERhdGEgPSB0cmltU2V0c0F0bGFzTGF5b3V0RGF0YTsNCg0KICByZXR1cm4gew0KICAgIHRyaW1DdXJ2ZURyYXdTZXRzLA0KICAgIHRyaW1TZXRzQXRsYXNMYXlvdXREYXRhLA0KICAgIHRyaW1TZXRzQXRsYXNMYXlvdXRUZXh0dXJlU2l6ZSwNCiAgfQ0KfTsNCg0KbGV0IGdldEJvZHlEZXNjRGF0YTsNCmxldCBib2R5RGVzY0lkczsNCg0KY29uc3QgbGF5b3V0Qm9keUl0ZW1zID0gKHNjZW5lQm9keUl0ZW1zRGF0YSwgYm9keURlc2NUb2NSZWFkZXIsIGJvZHlEZXNjUmVhZGVyLCBjYWREYXRhVmVyc2lvbiwgY3VydmVzRGF0YVJlYWRlcikgPT4gew0KICBjb25zdCBudW1Cb2RpZXMgPSBzY2VuZUJvZHlJdGVtc0RhdGEubGVuZ3RoIC8gZmxvYXRzUGVyU2NlbmVCb2R5Ow0KDQogIC8vIGNvbnN0IGV2YWxEcmF3SXRlbVNoYWRlckF0dHJpYnMgPSBuZXcgRmxvYXQzMkFycmF5KA0KICAvLyAgIG51bUJvZGllcyAqIGRyYXdJdGVtU2hhZGVyQXR0cmlic1N0cmlkZQ0KICAvLyApDQoNCiAgLy8gVGhpcyBpcyBhIGNhY2hlIG9mIHZhbHVlcyB1c2VkIHdoZW4gaGlnaGxpZ2h0aW5nIGJvZGllcy4NCiAgLy8gY29uc3QgYm9keUl0ZW1MYXlvdXRDb29yZHMgPSBuZXcgRmxvYXQzMkFycmF5KG51bUJvZGllcyAqIDUpDQogIGJvZHlEZXNjSWRzID0gbmV3IFVpbnQzMkFycmF5KG51bUJvZGllcyk7DQoNCiAgY29uc3QgYnl0ZXNQZXJWYWx1ZSA9IDQ7IC8vIDMyIGJpdCBmbG9hdHMNCiAgY29uc3QgYnl0ZXNQZXJQaXhlbCA9IGJ5dGVzUGVyVmFsdWUgKiA0OyAvLyBSR0JBIHBpeGVscw0KICBjb25zdCBib2R5TGlicmFyeUJ1ZmZlclRleHR1cmVTaXplID0gTWF0aC5zcXJ0KGJvZHlEZXNjUmVhZGVyLmJ5dGVMZW5ndGggLyBieXRlc1BlclBpeGVsKTsgLy8gUkdCQTE2IHBpeGVscw0KDQogIGxldCB2YWx1ZXNQZXJEcmF3SXRlbVJlZjsNCiAgaWYgKGNvbXBhcmVWZXJzaW9ucyhbY2FkRGF0YVZlcnNpb24ubWFqb3IsIGNhZERhdGFWZXJzaW9uLm1pbm9yLCBjYWREYXRhVmVyc2lvbi5wYXRjaF0sIFswLCAwLCAyOV0pID49IDApIHsNCiAgICB2YWx1ZXNQZXJEcmF3SXRlbVJlZiA9IDE1OyAvLyBOb3cgd2UgaW5jbHVkZSBhIDQgZmxvYXQgY29sb3IgdmFsdWUgcGVyIHN1cmZhY2UgcmVmLg0KICB9IGVsc2Ugew0KICAgIHZhbHVlc1BlckRyYXdJdGVtUmVmID0gMTE7DQogIH0NCiAgLy8gbGV0IHZhbHVlc1BlckN1cnZlUmVmID0gMTENCiAgY29uc3QgbG9hZENBREJvZHlDdXJ2ZXMgPQ0KICAgIGNvbXBhcmVWZXJzaW9ucyhbY2FkRGF0YVZlcnNpb24ubWFqb3IsIGNhZERhdGFWZXJzaW9uLm1pbm9yLCBjYWREYXRhVmVyc2lvbi5wYXRjaF0sIFsxLCAwLCA1XSkgPj0gMDsNCg0KICBnZXRCb2R5RGVzY0RhdGEgPSAoYm9keURlc2NJZCkgPT4gew0KICAgIGJvZHlEZXNjVG9jUmVhZGVyLnNlZWsoYnl0ZXNQZXJWYWx1ZSArIGJvZHlEZXNjSWQgKiAoMyAqIGJ5dGVzUGVyVmFsdWUpKTsNCiAgICBjb25zdCB4ID0gYm9keURlc2NUb2NSZWFkZXIubG9hZFVJbnQzMigpOw0KICAgIGNvbnN0IHkgPSBib2R5RGVzY1RvY1JlYWRlci5sb2FkVUludDMyKCk7DQogICAgLy8gY29uc29sZS5sb2coIkJvZHkgRGVzYyBDb29yZHM6IiArIHggKyAiICwiICsgeSk7DQoNCiAgICBjb25zdCBvZmZzZXRJbkJ5dGVzID0gNiAvKiBiYm94Ki8gKiBieXRlc1BlclZhbHVlOyAvLyBza2lwIHRoZSBiYm94DQoNCiAgICAvLyBYLCBZIGluIHBpeGVscy4NCiAgICBjb25zdCBieXRlT2Zmc2V0ID0geCAqIGJ5dGVzUGVyUGl4ZWwgKyB5ICogYnl0ZXNQZXJQaXhlbCAqIGJvZHlMaWJyYXJ5QnVmZmVyVGV4dHVyZVNpemU7DQogICAgLy8gY29uc29sZS5sb2coIl9fc2Vla1N1cmZhY2VEYXRhOiIgKyBib2R5SWQgKyAiIGJ5dGVPZmZzZXQ6IiArIChieXRlT2Zmc2V0ICtvZmZzZXQpICsgIiBwaXhlbDoiICsgKChieXRlT2Zmc2V0ICtvZmZzZXQpLzgpICsgIiB4OiIgKyB4ICsgIiB5OiIgKyB5KTsNCiAgICBib2R5RGVzY1JlYWRlci5zZWVrKGJ5dGVPZmZzZXQgKyBvZmZzZXRJbkJ5dGVzKTsNCg0KICAgIGNvbnN0IG51bUJvZHlTdXJmYWNlcyA9IGJvZHlEZXNjUmVhZGVyLmxvYWRGbG9hdDMyKCk7DQogICAgY29uc3QgbnVtQm9keUN1cnZlcyA9IGxvYWRDQURCb2R5Q3VydmVzID8gYm9keURlc2NSZWFkZXIubG9hZEZsb2F0MzIoKSA6IDA7DQogICAgY29uc3Qgc3VyZmFjZUlkcyA9IFtdOw0KICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbnVtQm9keVN1cmZhY2VzOyBpKyspIHsNCiAgICAgIGNvbnN0IGlkID0gYm9keURlc2NSZWFkZXIubG9hZEZsb2F0MzIoKTsNCiAgICAgIC8vIGNvbnNvbGUubG9nKGksICJpZDoiLCBpZCkNCiAgICAgIHN1cmZhY2VJZHMucHVzaChpZCk7DQogICAgICBib2R5RGVzY1JlYWRlci5hZHZhbmNlKCh2YWx1ZXNQZXJEcmF3SXRlbVJlZiAtIDEpICogYnl0ZXNQZXJWYWx1ZSk7DQogICAgfQ0KICAgIGNvbnN0IGN1cnZlSWRzID0gW107DQogICAgLy8gY29uc3QgY3VydmVYZm9zID0gW10NCiAgICBjb25zdCBwb3MgPSBib2R5RGVzY1JlYWRlci5wb3MoKTsNCiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG51bUJvZHlDdXJ2ZXM7IGkrKykgew0KICAgICAgYm9keURlc2NSZWFkZXIuc2Vlayhwb3MgKyBpICogdmFsdWVzUGVyRHJhd0l0ZW1SZWYgKiBieXRlc1BlclZhbHVlKTsNCg0KICAgICAgY29uc3QgaWQgPSBib2R5RGVzY1JlYWRlci5sb2FkRmxvYXQzMigpOw0KICAgICAgLy8gY29uc29sZS5sb2coaSwgImlkOiIsIGlkKQ0KICAgICAgY3VydmVJZHMucHVzaChpZCk7DQogICAgICAvLyBjb25zdCB0ciA9IFsNCiAgICAgIC8vICAgYm9keURlc2NSZWFkZXIubG9hZEZsb2F0MzIoKSwNCiAgICAgIC8vICAgYm9keURlc2NSZWFkZXIubG9hZEZsb2F0MzIoKSwNCiAgICAgIC8vICAgYm9keURlc2NSZWFkZXIubG9hZEZsb2F0MzIoKQ0KICAgICAgLy8gXQ0KICAgICAgLy8gY29uc3Qgb3JpID0gWw0KICAgICAgLy8gICBib2R5RGVzY1JlYWRlci5sb2FkRmxvYXQzMigpLA0KICAgICAgLy8gICBib2R5RGVzY1JlYWRlci5sb2FkRmxvYXQzMigpLA0KICAgICAgLy8gICBib2R5RGVzY1JlYWRlci5sb2FkRmxvYXQzMigpLA0KICAgICAgLy8gICBib2R5RGVzY1JlYWRlci5sb2FkRmxvYXQzMigpDQogICAgICAvLyBdDQogICAgICAvLyBjb25zdCBzYyA9IFsNCiAgICAgIC8vICAgYm9keURlc2NSZWFkZXIubG9hZEZsb2F0MzIoKSwNCiAgICAgIC8vICAgYm9keURlc2NSZWFkZXIubG9hZEZsb2F0MzIoKSwNCiAgICAgIC8vICAgYm9keURlc2NSZWFkZXIubG9hZEZsb2F0MzIoKQ0KICAgICAgLy8gXQ0KICAgICAgLy8gY29uc3QgeGZvID0geyB0ciwgb3JpLCBzYyB9DQogICAgICAvLyBjdXJ2ZVhmb3MucHVzaCh4Zm8pDQogICAgfQ0KDQogICAgLy8gY29uc29sZS5sb2coImdldEJvZHlEZXNjRGF0YToiLCBib2R5RGVzY0lkLCAiIHN1cmZhY2VJZHM6Iiwgc3VyZmFjZUlkcy5sZW5ndGgsICIgY3VydmVJZHM6IiwgY3VydmVJZHMubGVuZ3RoLCAiZHJhd0l0ZW1zOiIsIHN1cmZhY2VJZHMubGVuZ3RoICsgY3VydmVJZHMubGVuZ3RoKTsNCiAgICByZXR1cm4gew0KICAgICAgeCwNCiAgICAgIHksDQogICAgICBzdXJmYWNlSWRzLA0KICAgICAgY3VydmVJZHMsDQogICAgfQ0KICB9Ow0KDQogIGNvbnN0IHN1cmZhY2VEcmF3U2V0c190bXAgPSB7fTsNCiAgY29uc3QgY3VydmVEcmF3U2V0c190bXAgPSB7fTsNCiAgbGV0IG51bVN1cmZhY2VJbnN0YW5jZXMgPSAwOw0KICBsZXQgbnVtQ3VydmVJbnN0YW5jZXMgPSAwOw0KDQogIC8vIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8NCiAgLy8gRm9yIGRlYnVnZ2luZyBDdXJ2ZXMgaW4gdGhlIDNkIHNjZW5lLg0KICAvLyBjb25zdCBjdXJ2ZUxpYnJhcnlTaXplID0gTWF0aC5zcXJ0KGN1cnZlc0RhdGFSZWFkZXIuZGF0YS5ieXRlTGVuZ3RoIC8gOCkgLy8gUkdCQTE2IHBpeGVscw0KICAvLyBjb25zdCBnZXRDdXJ2ZURhdGFUZXhlbENvb3JkcyA9IGN1cnZlSWQgPT4gew0KICAvLyAgIGN1cnZlc0RhdGFSZWFkZXIuc2VlaygNCiAgLy8gICAgIGdlb21MaWJyYXJ5SGVhZGVyU2l6ZSArDQogIC8vICAgICAgIGN1cnZlSWQgKiAodmFsdWVzUGVyQ3VydmVUb2NJdGVtICogMikgLyogYnBjKi8gLyogYnBjKi8NCiAgLy8gICApDQogIC8vICAgY29uc3QgeCA9IGN1cnZlc0RhdGFSZWFkZXIubG9hZFVGbG9hdDE2KCkNCiAgLy8gICBjb25zdCB5ID0gY3VydmVzRGF0YVJlYWRlci5sb2FkVUZsb2F0MTYoKQ0KICAvLyAgIHJldHVybiB7DQogIC8vICAgICB4LA0KICAvLyAgICAgeSwNCiAgLy8gICB9DQogIC8vIH0NCg0KICAvLyBjb25zdCBfX3NlZWtDdXJ2ZURhdGEgPSBjdXJ2ZUlkID0+IHsNCiAgLy8gICBjb25zdCBhZGRyID0gZ2V0Q3VydmVEYXRhVGV4ZWxDb29yZHMoY3VydmVJZCkNCiAgLy8gICAvLyBYLCBZIGluIHBpeGVscy4NCg0KICAvLyAgIGNvbnN0IGJ5dGVzUGVyUGl4ZWwgPSA4IC8vIFJHQkExNiBwaXhlbA0KICAvLyAgIGNvbnN0IGJ5dGVPZmZzZXQgPQ0KICAvLyAgICAgYWRkci54ICogYnl0ZXNQZXJQaXhlbCArIGFkZHIueSAqIGJ5dGVzUGVyUGl4ZWwgKiBjdXJ2ZUxpYnJhcnlTaXplDQogIC8vICAgLy8gY29uc29sZS5sb2coIl9fc2Vla1N1cmZhY2VEYXRhOiIgKyBjdXJ2ZUlkICsgIiBieXRlT2Zmc2V0OiIgKyAoYnl0ZU9mZnNldCArb2Zmc2V0KSArICIgcGl4ZWw6IiArICgoYnl0ZU9mZnNldCArb2Zmc2V0KS84KSArICIgeDoiICsgYWRkci54ICsgIiB5OiIgKyBhZGRyLnkpOw0KICAvLyAgIGN1cnZlc0RhdGFSZWFkZXIuc2VlayhieXRlT2Zmc2V0KQ0KICAvLyB9DQoNCiAgLy8gY29uc3QgZ2V0Q3VydmVUeXBlID0gY3VydmVJZCA9PiB7DQogIC8vICAgX19zZWVrQ3VydmVEYXRhKGN1cnZlSWQpDQogIC8vICAgY29uc3QgY3VydmVUeXBlID0gY3VydmVzRGF0YVJlYWRlci5sb2FkVUZsb2F0MTYoKQ0KICAvLyAgIHJldHVybiBjdXJ2ZVR5cGUNCiAgLy8gfQ0KICAvLyAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vDQogIC8vIERvZGdlIENoYWxsZW5nZXIsIGJvZHkgIzcxIGFuZCBDdXJ2ZSAjMSwgb3IgYm9keSAjMTIyDQogIC8vIGNvbnN0IHJhbmdlID0gWzcxLCA3MV0NCiAgLy8gY29uc3QgcmFuZ2UgPSBbMTIyLCAxMjJdDQogIC8vIGNvbnN0IHJhbmdlID0gWzU1LCA1NV0NCiAgLy8gY29uc3QgcmFuZ2UgPSBbMTcsIDE3XQ0KDQogIGZvciAobGV0IGJvZHlJZCA9IDA7IGJvZHlJZCA8IG51bUJvZGllczsgYm9keUlkKyspIHsNCiAgICB0cnkgew0KICAgICAgY29uc3Qgc3Jjb2Zmc2V0ID0gYm9keUlkICogZmxvYXRzUGVyU2NlbmVCb2R5Ow0KICAgICAgY29uc3QgYm9keURlc2NJZCA9IHNjZW5lQm9keUl0ZW1zRGF0YVtzcmNvZmZzZXQgKyAwXTsNCiAgICAgIC8vIGNvbnNvbGUubG9nKCJib2R5SWQ6IiwgYm9keUlkLCAiIGJvZHlEZXNjSWQ6IiwgYm9keURlc2NJZCkNCiAgICAgIC8vIGlmKGJvZHlJZCAhPSAyKQ0KICAgICAgLy8gICBjb250aW51ZTsNCiAgICAgIGlmIChib2R5RGVzY0lkID09IC0xKSBjb250aW51ZQ0KICAgICAgLy8gY29uc3QgbnVtU3VyZmFjZXNBbmRDdXJ2ZXMgPSBnZXRCb2R5TnVtU3VyZmFjZXNBbmRDdXJ2ZXMoYm9keURlc2NJZCkNCiAgICAgIC8vIG51bVN1cmZhY2VJbnN0YW5jZXMgKz0gbnVtU3VyZmFjZXNBbmRDdXJ2ZXMubnVtQm9keVN1cmZhY2VzDQogICAgICAvLyBudW1DdXJ2ZUluc3RhbmNlcyArPSBudW1TdXJmYWNlc0FuZEN1cnZlcy5udW1Cb2R5Q3VydmVzDQoNCiAgICAgIGNvbnN0IHNoYWRlcklkID0gc2NlbmVCb2R5SXRlbXNEYXRhW3NyY29mZnNldCArIDFdOw0KICAgICAgY29uc3QgYm9keURlc2MgPSBnZXRCb2R5RGVzY0RhdGEoYm9keURlc2NJZCk7DQoNCiAgICAgIC8vIFNraXAgYm9kaWVzIHRoYXQgYXJlIGp1c3QgZmxvYXRpbmcgbGluZXMuDQogICAgICAvLyBpZiAoYm9keURlc2Muc3VyZmFjZUlkcy5sZW5ndGggPT0gMCkgY29udGludWUNCg0KICAgICAgbnVtU3VyZmFjZUluc3RhbmNlcyArPSBib2R5RGVzYy5zdXJmYWNlSWRzLmxlbmd0aDsNCiAgICAgIG51bUN1cnZlSW5zdGFuY2VzICs9IGJvZHlEZXNjLmN1cnZlSWRzLmxlbmd0aDsNCg0KICAgICAgLy8gY29uc3QgYm9keUNvdW50VVYgPSBbYmluLml0ZW1XaWR0aCAvIHBpeGVsc1BlckRyYXdJdGVtLCBiaW4uaXRlbUhlaWdodF0NCg0KICAgICAgLy8gY29uc29sZS5sb2coIkJvZHk6IiwgYm9keUlkLCAiOiIsIHUsIHYsIGJvZHlDb3VudFVWWzBdLCBib2R5Q291bnRVVlsxXSk7DQogICAgICAvLyBjb25zb2xlLmxvZygiQm9keToiLCBib2R5SWQsICIgYm9keURlc2M6IiwgYm9keURlc2MpOw0KICAgICAgLy8gY29uc29sZS5sb2coIkJvZHk6IiwgYm9keUlkLCAiIGZsYWdzOiIsIHNjZW5lQm9keUl0ZW1zRGF0YVtzcmNvZmZzZXQgKyAxXSk7DQogICAgICAvLyBjb25zb2xlLmxvZygiQm9keToiICsgYm9keUlkICsgIiBudW1TdXJmYWNlczoiICsgbnVtU3VyZmFjZXMgKyAiIGJpblNpemU6IiArIGJpblNpemUpOw0KDQogICAgICAvLyBUaGlzIGlzIGEgY2FjaGUgb2YgdmFsdWVzIHVzZWQgd2hlbiBoaWdobGlnaHRpbmcgYm9kaWVzLg0KICAgICAgLy8gYm9keUl0ZW1MYXlvdXRDb29yZHNbYm9keUlkICogNSArIDBdID0gYm9keURlc2NJZA0KICAgICAgLy8gYm9keUl0ZW1MYXlvdXRDb29yZHNbYm9keUlkICogNSArIDFdID0gdQ0KICAgICAgLy8gYm9keUl0ZW1MYXlvdXRDb29yZHNbYm9keUlkICogNSArIDJdID0gdg0KICAgICAgLy8gYm9keUl0ZW1MYXlvdXRDb29yZHNbYm9keUlkICogNSArIDNdID0gYm9keUNvdW50VVZbMF0NCiAgICAgIC8vIGJvZHlJdGVtTGF5b3V0Q29vcmRzW2JvZHlJZCAqIDUgKyA0XSA9IGJvZHlDb3VudFVWWzFdDQogICAgICBib2R5RGVzY0lkc1tib2R5SWRdID0gYm9keURlc2NJZDsNCg0KICAgICAgY29uc3Qgc3VyZmFjZUlkcyA9IGJvZHlEZXNjLnN1cmZhY2VJZHM7DQogICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHN1cmZhY2VJZHMubGVuZ3RoOyBqKyspIHsNCiAgICAgICAgY29uc3Qgc3VyZmFjZUlkID0gc3VyZmFjZUlkc1tqXTsNCg0KICAgICAgICBjb25zdCBkZXRhaWxzT2Zmc2V0ID0gc3VyZmFjZUlkICogNzsNCiAgICAgICAgY29uc3Qgc3VyZmFjZURldGFpbFggPSB3b3JrZXJTdGF0ZS5zdXJmYWNlRGV0YWlsc1tkZXRhaWxzT2Zmc2V0ICsgNF07DQogICAgICAgIGNvbnN0IHN1cmZhY2VEZXRhaWxZID0gd29ya2VyU3RhdGUuc3VyZmFjZURldGFpbHNbZGV0YWlsc09mZnNldCArIDVdOw0KDQogICAgICAgIC8vIElmIEl0ZW1zIHdlcmUgc2tpcHBlZCBpbiBsYXlpbmcgb3V0IHRoZSBzdXJmYWNlcywgd2Ugd2lsbCBzZWUgemVybyBkZXRhaWwgdmFsdWVzIGhlcmUuDQogICAgICAgIGlmIChzdXJmYWNlRGV0YWlsWCA9PSAwIHx8IHN1cmZhY2VEZXRhaWxZID09IDApIGNvbnRpbnVlDQoNCiAgICAgICAgY29uc3Qgc3VyZmFjZUtleSA9IHN1cmZhY2VEZXRhaWxYICsgJ3gnICsgc3VyZmFjZURldGFpbFk7DQoNCiAgICAgICAgLy8gY29uc29sZS5sb2coaisiOiIgKyBzdXJmYWNlSWQgKyAiIGRldGFpbDoiICsgc3VyZmFjZUtleSk7DQogICAgICAgIC8vIGNvbnNvbGUubG9nKCJTdXJmYWNlIERyYXc6IiArIHN1cmZhY2VLZXkpOw0KICAgICAgICBsZXQgZHJhd1NldCA9IHN1cmZhY2VEcmF3U2V0c190bXBbc3VyZmFjZUtleV07DQogICAgICAgIGlmICghZHJhd1NldCkgew0KICAgICAgICAgIGRyYXdTZXQgPSB7fTsNCiAgICAgICAgICBzdXJmYWNlRHJhd1NldHNfdG1wW3N1cmZhY2VLZXldID0gZHJhd1NldDsNCiAgICAgICAgfQ0KICAgICAgICAvLyBGb3IgZWFjaCBkcmF3IHNldCwgd2UgY2FuIGRyYXcgd2l0aCB2YXJpb3VzIHNoYWRlcnMuDQogICAgICAgIC8vIEhlcmUgd2UgYWxsb2NhdGUgdGhlIGl0ZW0gaW50byB0aGUgc3Vic2V0IGJhc2VkIG9uIGl0cyBzaGFkZXJpZC4NCiAgICAgICAgbGV0IHN1YlNldCA9IGRyYXdTZXRbc2hhZGVySWRdOw0KICAgICAgICBpZiAoIXN1YlNldCkgew0KICAgICAgICAgIHN1YlNldCA9IFtdOw0KICAgICAgICAgIGRyYXdTZXRbc2hhZGVySWRdID0gc3ViU2V0Ow0KICAgICAgICB9DQogICAgICAgIGNvbnN0IHRyaW1TZXRJZCA9IHdvcmtlclN0YXRlLnN1cmZhY2VEZXRhaWxzW2RldGFpbHNPZmZzZXQgKyA2XTsNCg0KICAgICAgICBjb25zdCBkcmF3SXRlbUluZGV4SW5Cb2R5ID0gajsNCiAgICAgICAgc3ViU2V0LnB1c2goYm9keUlkKTsNCiAgICAgICAgc3ViU2V0LnB1c2goZHJhd0l0ZW1JbmRleEluQm9keSk7DQogICAgICAgIHN1YlNldC5wdXNoKHN1cmZhY2VJZCk7DQogICAgICAgIHN1YlNldC5wdXNoKHRyaW1TZXRJZCk7DQoNCiAgICAgICAgLy8gY29uc3QgZHJhd0l0ZW1JZCA9IGoNCiAgICAgICAgLy8gc3ViU2V0LnB1c2godSArIChkcmF3SXRlbUlkICUgYm9keUNvdW50VVZbMF0pICogcGl4ZWxzUGVyRHJhd0l0ZW0pDQogICAgICAgIC8vIHN1YlNldC5wdXNoKHYgKyBNYXRoLmZsb29yKGRyYXdJdGVtSWQgLyBib2R5Q291bnRVVlswXSkpDQogICAgICB9DQogICAgICAvLyBjb25zb2xlLmxvZygiYm9keURlc2MuY3VydmVJZHMgOiIsIGJvZHlEZXNjLmN1cnZlSWRzLmxlbmd0aCk7DQogICAgICBjb25zdCBjdXJ2ZUlkcyA9IGJvZHlEZXNjLmN1cnZlSWRzOw0KDQogICAgICAvLyBjb25zdCByYW5nZSA9IFsxODc0LCAxODc0XQ0KICAgICAgLy8gY29uc3QgcmFuZ2UgPSBbMiwgMl0NCiAgICAgIC8vIGNvbnN0IHJhbmdlID0gWzcwNjIsIDcwNjJdDQogICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGN1cnZlSWRzLmxlbmd0aDsgaisrKSB7DQogICAgICAgIGNvbnN0IGN1cnZlSWQgPSBjdXJ2ZUlkc1tqXTsNCg0KICAgICAgICBjb25zdCBjdXJ2ZURldGFpbCA9IHdvcmtlclN0YXRlLmN1cnZlRGV0YWlsc1tjdXJ2ZUlkXTsNCg0KICAgICAgICAvLyBJZiBJdGVtcyB3ZXJlIHNraXBwZWQgaW4gbGF5aW5nIG91dCB0aGUgc3VyZmFjZXMsIHdlIHdpbGwgc2VlIHplcm8gZGV0YWlsIHZhbHVlcyBoZXJlLg0KICAgICAgICBpZiAoY3VydmVEZXRhaWwgPT0gMCkgY29udGludWUNCg0KICAgICAgICAvLyBjb25zdCBjdXJ2ZVR5cGUgPSBnZXRDdXJ2ZVR5cGUoY3VydmVJZCk7DQogICAgICAgIC8vICAgY29uc29sZS5sb2coIkN1cnZlIDoiLCBjdXJ2ZUlkLCBnZXRDdXJ2ZVR5cGVOYW1lKGN1cnZlVHlwZSksICIgZmxhZ3M6IiwgZmxhZ3MsICIgcGFyYW06IiwgcGFyYW0pOw0KICAgICAgICAvLyBpZiAoZ2V0Q3VydmVUeXBlKGN1cnZlVHlwZSkgIT0gQ0FEQ3VydmVUeXBlcy5DVVJWRV9UWVBFX05VUkJTX0NVUlZFKSB7DQogICAgICAgIC8vICAgY29udGludWUNCiAgICAgICAgLy8gfQ0KDQogICAgICAgIC8vIGNvbnN0IGN1cnZlWGZvID0gYm9keURlc2MuY3VydmVYZm9zW2pdDQogICAgICAgIC8vIGlmIChjdXJ2ZVhmby5zY1swXSA+IDAgfHwgY3VydmVYZm8uc2NbMV0gPiAwIHx8IGN1cnZlWGZvLnNjWzJdID4gMCkgew0KICAgICAgICAvLyAgIC8vIGNvbnRpbnVlDQogICAgICAgIC8vICAgY29uc29sZS5sb2coY3VydmVYZm8uc2MpDQogICAgICAgIC8vIH0gZWxzZSB7DQogICAgICAgIC8vICAgY29udGludWUNCiAgICAgICAgLy8gfQ0KICAgICAgICAvLyBjb25zb2xlLmxvZyhjdXJ2ZVhmby5zYykNCg0KICAgICAgICAvLyBjb25zb2xlLmxvZygiY3VydmVJZCA6IiwgY3VydmVJZCwgIiBjdXJ2ZURldGFpbDoiLCBjdXJ2ZURldGFpbCk7DQoNCiAgICAgICAgbGV0IGRyYXdTZXQgPSBjdXJ2ZURyYXdTZXRzX3RtcFtjdXJ2ZURldGFpbF07DQogICAgICAgIGlmICghZHJhd1NldCkgew0KICAgICAgICAgIGRyYXdTZXQgPSB7fTsNCiAgICAgICAgICBjdXJ2ZURyYXdTZXRzX3RtcFtjdXJ2ZURldGFpbF0gPSBkcmF3U2V0Ow0KICAgICAgICB9DQogICAgICAgIC8vIE5vdGU6IGFsbCBjdXJ2ZXMgYXJlIGRyYXduIHdpdGggdGhlIHNhbWUgc2hhZGVyDQogICAgICAgIGxldCBzdWJTZXQgPSBkcmF3U2V0WzBdOw0KICAgICAgICBpZiAoIXN1YlNldCkgew0KICAgICAgICAgIHN1YlNldCA9IFtdOw0KICAgICAgICAgIGRyYXdTZXRbMF0gPSBzdWJTZXQ7DQogICAgICAgIH0NCg0KICAgICAgICBjb25zdCBkcmF3SXRlbUluZGV4SW5Cb2R5ID0gc3VyZmFjZUlkcy5sZW5ndGggKyBqOw0KICAgICAgICBzdWJTZXQucHVzaChib2R5SWQpOw0KICAgICAgICBzdWJTZXQucHVzaChkcmF3SXRlbUluZGV4SW5Cb2R5KTsNCiAgICAgICAgc3ViU2V0LnB1c2goY3VydmVJZCk7DQogICAgICAgIHN1YlNldC5wdXNoKC0xKTsNCg0KICAgICAgICAvLyBjb25zdCBkcmF3SXRlbUlkID0gc3VyZmFjZUlkcy5sZW5ndGggKyBqDQogICAgICAgIC8vIHN1YlNldC5wdXNoKHUgKyAoZHJhd0l0ZW1JZCAlIGJvZHlDb3VudFVWWzBdKSAqIHBpeGVsc1BlckRyYXdJdGVtKQ0KICAgICAgICAvLyBzdWJTZXQucHVzaCh2ICsgTWF0aC5mbG9vcihkcmF3SXRlbUlkIC8gYm9keUNvdW50VVZbMF0pKQ0KICAgICAgfQ0KICAgIH0gY2F0Y2ggKGUpIHsNCiAgICAgIGNvbnNvbGUud2FybignRXJyb3Igd2hpbGUgcmVhZGluZyBDQURCb2R5RGVzYyBkYXRhIGluIHdlYiB3b3JrZXI6ICcsIGJvZHlJZCwgZSk7DQogICAgfQ0KICB9DQoNCiAgd29ya2VyU3RhdGUubnVtU3VyZmFjZUluc3RhbmNlcyA9IG51bVN1cmZhY2VJbnN0YW5jZXM7DQogIHdvcmtlclN0YXRlLm51bUN1cnZlSW5zdGFuY2VzID0gbnVtQ3VydmVJbnN0YW5jZXM7DQoNCiAgLy8gLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vDQoNCiAgLy8gTm93IGNvbnZlcnQgYWxsIHRoZSBkcmF3IHNldHMgdG8gdHlwZWQgYXJyYXlzDQogIGNvbnN0IHN1cmZhY2VEcmF3U2V0cyA9IHt9Ow0KICBmb3IgKGNvbnN0IHN1cmZhY2VLZXkgaW4gc3VyZmFjZURyYXdTZXRzX3RtcCkgew0KICAgIGlmICghc3VyZmFjZURyYXdTZXRzW3N1cmZhY2VLZXldKSB7DQogICAgICBzdXJmYWNlRHJhd1NldHNbc3VyZmFjZUtleV0gPSB7fTsNCiAgICB9DQoNCiAgICBjb25zdCBkcmF3U2V0ID0gc3VyZmFjZURyYXdTZXRzX3RtcFtzdXJmYWNlS2V5XTsNCiAgICBmb3IgKGNvbnN0IHN1YlNldEtleSBpbiBkcmF3U2V0KSB7DQogICAgICBjb25zdCBzdWJTZXQgPSBkcmF3U2V0W3N1YlNldEtleV07DQogICAgICBzdXJmYWNlRHJhd1NldHNbc3VyZmFjZUtleV1bc3ViU2V0S2V5XSA9IEZsb2F0MzJBcnJheS5mcm9tKHN1YlNldCk7DQogICAgfQ0KICB9DQoNCiAgY29uc3QgY3VydmVEcmF3U2V0cyA9IHt9Ow0KICBmb3IgKGNvbnN0IGN1cnZlS2V5IGluIGN1cnZlRHJhd1NldHNfdG1wKSB7DQogICAgaWYgKCFjdXJ2ZURyYXdTZXRzW2N1cnZlS2V5XSkgew0KICAgICAgY3VydmVEcmF3U2V0c1tjdXJ2ZUtleV0gPSB7fTsNCiAgICB9DQoNCiAgICBjb25zdCBkcmF3U2V0ID0gY3VydmVEcmF3U2V0c190bXBbY3VydmVLZXldOw0KICAgIGZvciAoY29uc3Qgc3ViU2V0S2V5IGluIGRyYXdTZXQpIHsNCiAgICAgIGNvbnN0IHN1YlNldCA9IGRyYXdTZXRbc3ViU2V0S2V5XTsNCiAgICAgIGN1cnZlRHJhd1NldHNbY3VydmVLZXldW3N1YlNldEtleV0gPSBGbG9hdDMyQXJyYXkuZnJvbShzdWJTZXQpOw0KICAgIH0NCiAgfQ0KDQogIHdvcmtlclN0YXRlLnN1cmZhY2VEcmF3U2V0c190bXAgPSBzdXJmYWNlRHJhd1NldHNfdG1wOw0KICB3b3JrZXJTdGF0ZS5jdXJ2ZURyYXdTZXRzX3RtcCA9IGN1cnZlRHJhd1NldHNfdG1wOw0KDQogIHdvcmtlclN0YXRlLnN1cmZhY2VEcmF3U2V0cyA9IHN1cmZhY2VEcmF3U2V0czsNCiAgd29ya2VyU3RhdGUuY3VydmVEcmF3U2V0cyA9IGN1cnZlRHJhd1NldHM7DQoNCiAgcmV0dXJuIHsNCiAgICBzdXJmYWNlRHJhd1NldHMsDQogICAgY3VydmVEcmF3U2V0cywNCiAgfQ0KfTsNCg0KY29uc3QgbG9hZEFzc2VtYmx5ID0gKGRhdGEsIG9uRG9uZSkgPT4gew0KICBjb25zdCBwcm9maWxpbmcgPSB7fTsNCiAgY29uc3QgcmVzdWx0ID0gew0KICAgIGV2ZW50VHlwZTogJ2xvYWRBc3NldERvbmUnLA0KICAgIHByb2ZpbGluZywNCiAgfTsNCiAgY29uc3QgdHJhbnNmZXJhYmxlcyA9IFtdOw0KDQogIGxldCB0MCA9IHBlcmZvcm1hbmNlLm5vdygpOw0KICBsZXQgdDE7DQoNCiAgLy8gLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8NCiAgLy8gQ3VydmVzDQogIGNvbnN0IGN1cnZlc0RhdGFSZWFkZXIgPSBuZXcgQmluUmVhZGVyKGRhdGEuY3VydmVzRGF0YUJ1ZmZlcik7DQogIHsNCiAgICBjb25zdCBjdXJ2ZUxheW91dERhdGEgPSBsYXlvdXRDdXJ2ZXMoY3VydmVzRGF0YVJlYWRlciwgZGF0YS5lcnJvclRvbGVyYW5jZSwgZGF0YS5tYXhUZXhTaXplKTsNCiAgICBpZiAoY3VydmVMYXlvdXREYXRhKSB7DQogICAgICByZXN1bHQubnVtQ3VydmVzID0gY3VydmVMYXlvdXREYXRhLm51bUN1cnZlczsNCiAgICAgIHJlc3VsdC5jdXJ2ZXNBdGxhc0xheW91dCA9IGN1cnZlTGF5b3V0RGF0YS5jdXJ2ZXNBdGxhc0xheW91dDsNCiAgICAgIHJlc3VsdC5jdXJ2ZXNBdGxhc0xheW91dFRleHR1cmVTaXplID0gY3VydmVMYXlvdXREYXRhLmN1cnZlc0F0bGFzTGF5b3V0VGV4dHVyZVNpemU7DQogICAgICByZXN1bHQuY3VydmVzQXRsYXNUZXh0dXJlRGltID0gW19fY3VydmVzUGFja2VyLnJvb3QudywgX19jdXJ2ZXNQYWNrZXIucm9vdC5oXTsNCg0KICAgICAgdHJhbnNmZXJhYmxlcy5wdXNoKHJlc3VsdC5jdXJ2ZXNBdGxhc0xheW91dC5idWZmZXIpOw0KICAgICAgZm9yIChjb25zdCBrZXkgaW4gcmVzdWx0LmN1cnZlRHJhd1NldHMpIHsNCiAgICAgICAgdHJhbnNmZXJhYmxlcy5wdXNoKHJlc3VsdC5jdXJ2ZURyYXdTZXRzW2tleV0uYnVmZmVyKTsNCiAgICAgIH0NCg0KICAgICAgdDEgPSBwZXJmb3JtYW5jZS5ub3coKTsNCiAgICAgIHByb2ZpbGluZy5udW1DdXJ2ZXMgPSBjdXJ2ZUxheW91dERhdGEubnVtQ3VydmVzOw0KICAgICAgcHJvZmlsaW5nLmxheW91dEN1cnZlcyA9IHQxIC0gdDA7DQogICAgICBwcm9maWxpbmcuY3VydmVzQXRsYXNUZXh0dXJlRGltID0gcmVzdWx0LmN1cnZlc0F0bGFzVGV4dHVyZURpbTsNCiAgICB9DQogIH0NCg0KICAvLyAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLw0KICAvLyBTdXJmYWNlcw0KICBjb25zdCBzdXJmYWNlc0RhdGFSZWFkZXIgPSBuZXcgQmluUmVhZGVyKGRhdGEuc3VyZmFjZXNEYXRhQnVmZmVyKTsNCiAgew0KICAgIC8vIHByb2ZpbGluZy5udW1TdXJmYWNlcyA9IHN1cmZhY2VzRGF0YUJ1ZmZlci5sb2FkVUludDMyKCk7DQogICAgY29uc3Qgc3VyZmFjZUxheW91dERhdGEgPSBsYXlvdXRTdXJmYWNlcygNCiAgICAgIHN1cmZhY2VzRGF0YVJlYWRlciwNCiAgICAgIGRhdGEuZXJyb3JUb2xlcmFuY2UsDQogICAgICBkYXRhLm1heFRleFNpemUsDQogICAgICBkYXRhLnN1cmZhY2VBcmVhVGhyZXNob2xkLA0KICAgICAgZGF0YS5jYWREYXRhVmVyc2lvbg0KICAgICk7DQogICAgaWYgKHN1cmZhY2VMYXlvdXREYXRhKSB7DQogICAgICByZXN1bHQuc3VyZmFjZXNFdmFsQXR0cnMgPSBzdXJmYWNlTGF5b3V0RGF0YS5zdXJmYWNlc0V2YWxBdHRyczsNCiAgICAgIHJlc3VsdC5zdXJmYWNlc0F0bGFzTGF5b3V0ID0gc3VyZmFjZUxheW91dERhdGEuc3VyZmFjZXNBdGxhc0xheW91dDsNCiAgICAgIHJlc3VsdC5zdXJmYWNlc0F0bGFzTGF5b3V0VGV4dHVyZVNpemUgPSBzdXJmYWNlTGF5b3V0RGF0YS5zdXJmYWNlc0F0bGFzTGF5b3V0VGV4dHVyZVNpemU7DQogICAgICByZXN1bHQuc3VyZmFjZXNBdGxhc1RleHR1cmVEaW0gPSBbX19zdXJmYWNlUGFja2VyLnJvb3QudywgX19zdXJmYWNlUGFja2VyLnJvb3QuaF07DQoNCiAgICAgIHRyYW5zZmVyYWJsZXMucHVzaChyZXN1bHQuc3VyZmFjZXNBdGxhc0xheW91dC5idWZmZXIpOw0KICAgICAgZm9yIChjb25zdCBrZXkgaW4gcmVzdWx0LnN1cmZhY2VzRXZhbEF0dHJzKSB0cmFuc2ZlcmFibGVzLnB1c2gocmVzdWx0LnN1cmZhY2VzRXZhbEF0dHJzW2tleV0uYnVmZmVyKTsNCg0KICAgICAgdDEgPSBwZXJmb3JtYW5jZS5ub3coKTsNCiAgICAgIHByb2ZpbGluZy5sYXlvdXRTdXJmYWNlcyA9IHQxIC0gdDA7DQogICAgICBwcm9maWxpbmcubnVtU3VyZmFjZXMgPSBzdXJmYWNlTGF5b3V0RGF0YS5udW1TdXJmYWNlczsNCiAgICAgIHByb2ZpbGluZy5zdXJmYWNlc0F0bGFzVGV4dHVyZURpbSA9IHJlc3VsdC5zdXJmYWNlc0F0bGFzVGV4dHVyZURpbTsNCiAgICB9DQogIH0NCg0KICAvLyAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLw0KICAvLyBUcmltIFNldHMNCiAgaWYgKGRhdGEudHJpbVNldHNCdWZmZXIpIHsNCiAgICBjb25zdCB0cmltU2V0c1JlYWRlciA9IG5ldyBCaW5SZWFkZXIoZGF0YS50cmltU2V0c0J1ZmZlcik7DQogICAgY29uc3QgdHJpbVNldExheW91dERhdGEgPSBsYXlvdXRUcmltU2V0cygNCiAgICAgIHRyaW1TZXRzUmVhZGVyLA0KICAgICAgZGF0YS5jYWREYXRhVmVyc2lvbiwNCiAgICAgIHJlc3VsdC5jdXJ2ZXNBdGxhc0xheW91dCwNCiAgICAgIGRhdGEubG9kLA0KICAgICAgZGF0YS50cmltVGV4ZWxTaXplDQogICAgKTsNCiAgICByZXN1bHQudHJpbUN1cnZlRHJhd1NldHMgPSB0cmltU2V0TGF5b3V0RGF0YS50cmltQ3VydmVEcmF3U2V0czsNCiAgICByZXN1bHQudHJpbVNldHNBdGxhc0xheW91dERhdGEgPSB0cmltU2V0TGF5b3V0RGF0YS50cmltU2V0c0F0bGFzTGF5b3V0RGF0YTsNCiAgICByZXN1bHQudHJpbVNldHNBdGxhc0xheW91dFRleHR1cmVTaXplID0gdHJpbVNldExheW91dERhdGEudHJpbVNldHNBdGxhc0xheW91dFRleHR1cmVTaXplOw0KICAgIHJlc3VsdC50cmltU2V0QXRsYXNUZXh0dXJlU2l6ZSA9IFtfX3RyaW1TZXRQYWNrZXIucm9vdC53LCBfX3RyaW1TZXRQYWNrZXIucm9vdC5oXTsNCg0KICAgIHRyYW5zZmVyYWJsZXMucHVzaChyZXN1bHQudHJpbVNldHNBdGxhc0xheW91dERhdGEuYnVmZmVyKTsNCiAgICBmb3IgKGNvbnN0IGtleSBpbiByZXN1bHQudHJpbUN1cnZlRHJhd1NldHMpIHsNCiAgICAgIHRyYW5zZmVyYWJsZXMucHVzaChyZXN1bHQudHJpbUN1cnZlRHJhd1NldHNba2V5XS5idWZmZXIpOw0KICAgIH0NCg0KICAgIHQwID0gcGVyZm9ybWFuY2Uubm93KCk7DQogICAgcHJvZmlsaW5nLmxheW91dFRyaW1TZXRzID0gdDAgLSB0MTsNCiAgICBwcm9maWxpbmcudHJpbVNldEF0bGFzVGV4dHVyZVNpemUgPSByZXN1bHQudHJpbVNldEF0bGFzVGV4dHVyZVNpemU7DQogIH0NCg0KICAvLyAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLw0KICAvLyBCb2R5IEl0ZW1zDQogIHsNCiAgICBjb25zdCBib2R5RGVzY1JlYWRlciA9IG5ldyBCaW5SZWFkZXIoZGF0YS5ib2R5TGlicmFyeUJ1ZmZlcik7DQogICAgY29uc3QgYm9keURlc2NUb2NSZWFkZXIgPSBuZXcgQmluUmVhZGVyKGRhdGEuYm9keUxpYnJhcnlCdWZmZXJUb2MpOw0KDQogICAgcHJvZmlsaW5nLm51bUJvZGllcyA9IGRhdGEuc2NlbmVCb2R5SXRlbXNEYXRhLmxlbmd0aCAvIGZsb2F0c1BlclNjZW5lQm9keTsNCg0KICAgIGNvbnN0IGxheW91dFJlcyA9IGxheW91dEJvZHlJdGVtcygNCiAgICAgIGRhdGEuc2NlbmVCb2R5SXRlbXNEYXRhLA0KICAgICAgYm9keURlc2NUb2NSZWFkZXIsDQogICAgICBib2R5RGVzY1JlYWRlciwNCiAgICAgIGRhdGEuY2FkRGF0YVZlcnNpb24pOw0KDQogICAgcmVzdWx0LnN1cmZhY2VEcmF3U2V0cyA9IGxheW91dFJlcy5zdXJmYWNlRHJhd1NldHM7DQogICAgcmVzdWx0LmN1cnZlRHJhd1NldHMgPSBsYXlvdXRSZXMuY3VydmVEcmF3U2V0czsNCg0KICAgIGZvciAoY29uc3Qgc3VyZmFjZUtleSBpbiByZXN1bHQuc3VyZmFjZURyYXdTZXRzKSB7DQogICAgICBjb25zdCBkcmF3U2V0ID0gcmVzdWx0LnN1cmZhY2VEcmF3U2V0c1tzdXJmYWNlS2V5XTsNCiAgICAgIGZvciAoY29uc3Qgc2hhZGVySWQgaW4gZHJhd1NldCkgew0KICAgICAgICB0cmFuc2ZlcmFibGVzLnB1c2goZHJhd1NldFtzaGFkZXJJZF0uYnVmZmVyKTsNCiAgICAgIH0NCiAgICB9DQogICAgZm9yIChjb25zdCBzdXJmYWNlS2V5IGluIHJlc3VsdC5jdXJ2ZURyYXdTZXRzKSB7DQogICAgICBjb25zdCBkcmF3U2V0ID0gcmVzdWx0LmN1cnZlRHJhd1NldHNbc3VyZmFjZUtleV07DQogICAgICBmb3IgKGNvbnN0IHN1YlNldEtleSBpbiBkcmF3U2V0KSB7DQogICAgICAgIHRyYW5zZmVyYWJsZXMucHVzaChkcmF3U2V0W3N1YlNldEtleV0uYnVmZmVyKTsNCiAgICAgIH0NCiAgICB9DQogICAgcHJvZmlsaW5nLm51bVN1cmZhY2VJbnN0YW5jZXMgPSB3b3JrZXJTdGF0ZS5udW1TdXJmYWNlSW5zdGFuY2VzOw0KICAgIHByb2ZpbGluZy5udW1DdXJ2ZUluc3RhbmNlcyA9IHdvcmtlclN0YXRlLm51bUN1cnZlSW5zdGFuY2VzOw0KICAgIC8vIHByb2ZpbGluZy5udW1EcmF3U2V0cyA9IE9iamVjdC5rZXlzKHJlc3VsdC5zdXJmYWNlRHJhd1NldHMpLmxlbmd0aA0KDQogICAgdDEgPSBwZXJmb3JtYW5jZS5ub3coKTsNCiAgICBwcm9maWxpbmcubGF5b3V0Qm9keUl0ZW1zID0gdDEgLSB0MDsNCiAgICBwcm9maWxpbmcuYm9keUF0bGFzRGltID0gcmVzdWx0LmJvZHlBdGxhc0RpbTsNCiAgfQ0KDQogIG9uRG9uZShyZXN1bHQsIHRyYW5zZmVyYWJsZXMpOw0KDQogIC8vIE5vdyBwcm9jZXNzIGFueSBoaWdobGlnaHRzIGlmIHRoZXkgZXhpc3QuDQogIGlmIChkYXRhLmhpZ2hsaWdodGVkQm9kaWVzLmxlbmd0aCA+IDApIHsNCiAgICBib2R5SGlnaGxpZ2h0Q2hhbmdlZCgNCiAgICAgIHsNCiAgICAgICAgaGlnaGxpZ2h0ZWRCb2R5SWRzOiBkYXRhLmhpZ2hsaWdodGVkQm9kaWVzLA0KICAgICAgICB1bmhpZ2hsaWdodGVkQm9keUlkczogW10sDQogICAgICB9LA0KICAgICAgb25Eb25lDQogICAgKTsNCiAgfQ0KfTsNCg0KY29uc3QgaGlnaGxpZ2h0ZWREcmF3U2V0cyA9IHt9Ow0KDQpjb25zdCBib2R5SGlnaGxpZ2h0Q2hhbmdlZCA9IChkYXRhLCBvbkRvbmUpID0+IHsNCiAgY29uc3QgaGlnaGxpZ2h0ZWRCb2R5SWRzID0gZGF0YS5oaWdobGlnaHRlZEJvZHlJZHM7DQogIGNvbnN0IHVuaGlnaGxpZ2h0ZWRCb2R5SWRzID0gZGF0YS51bmhpZ2hsaWdodGVkQm9keUlkczsNCg0KICBjb25zdCBlYWNoQm9keVN1cmZhY2UgPSAoYm9keUlkcywgY2IpID0+IHsNCiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGJvZHlJZHMubGVuZ3RoOyBpKyspIHsNCiAgICAgIGNvbnN0IGJvZHlJZCA9IGJvZHlJZHNbaV07DQoNCiAgICAgIGNvbnN0IGJvZHlEZXNjSWQgPSBib2R5RGVzY0lkc1tib2R5SWRdOw0KICAgICAgLy8gY29uc3QgYm9keURlc2NJZCA9IHdvcmtlclN0YXRlLmJvZHlJdGVtTGF5b3V0Q29vcmRzW2JvZHlJZCAqIDUgKyAwXQ0KICAgICAgLy8gY29uc3QgdSA9IHdvcmtlclN0YXRlLmJvZHlJdGVtTGF5b3V0Q29vcmRzW2JvZHlJZCAqIDUgKyAxXQ0KICAgICAgLy8gY29uc3QgdiA9IHdvcmtlclN0YXRlLmJvZHlJdGVtTGF5b3V0Q29vcmRzW2JvZHlJZCAqIDUgKyAyXQ0KICAgICAgLy8gY29uc3QgY291bnR1ID0gd29ya2VyU3RhdGUuYm9keUl0ZW1MYXlvdXRDb29yZHNbYm9keUlkICogNSArIDNdDQogICAgICAvLyBjb25zdCBjb3VudHYgPSB3b3JrZXJTdGF0ZS5ib2R5SXRlbUxheW91dENvb3Jkc1tib2R5SWQgKiA1ICsgNF0NCg0KICAgICAgY29uc3QgYm9keURlc2MgPSBnZXRCb2R5RGVzY0RhdGEoYm9keURlc2NJZCk7DQogICAgICBjb25zdCBzdXJmYWNlSWRzID0gYm9keURlc2Muc3VyZmFjZUlkczsNCiAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgc3VyZmFjZUlkcy5sZW5ndGg7IGorKykgew0KICAgICAgICBjb25zdCBzdXJmYWNlSWQgPSBzdXJmYWNlSWRzW2pdOw0KICAgICAgICBjb25zdCBzdXJmYWNlSW5zdGFuY2VJZCA9IChib2R5SWQgPDwgMTYpIHwgajsNCiAgICAgICAgY2IoYm9keUlkLCBzdXJmYWNlSW5zdGFuY2VJZCwgc3VyZmFjZUlkLCBqKTsNCiAgICAgIH0NCiAgICB9DQogIH07DQogIGVhY2hCb2R5U3VyZmFjZSh1bmhpZ2hsaWdodGVkQm9keUlkcywgKGJvZHlJZCwgc3VyZmFjZUluc3RhbmNlSWQsIHN1cmZhY2VJZCwgZHJhd0l0ZW1JbmRleEluQm9keSkgPT4gew0KICAgIGNvbnN0IGRldGFpbHNPZmZzZXQgPSBzdXJmYWNlSWQgKiA3Ow0KICAgIGNvbnN0IHN1cmZhY2VEZXRhaWxYID0gd29ya2VyU3RhdGUuc3VyZmFjZURldGFpbHNbZGV0YWlsc09mZnNldCArIDRdOw0KICAgIGNvbnN0IHN1cmZhY2VEZXRhaWxZID0gd29ya2VyU3RhdGUuc3VyZmFjZURldGFpbHNbZGV0YWlsc09mZnNldCArIDVdOw0KICAgIGNvbnN0IHN1cmZhY2VLZXkgPSBzdXJmYWNlRGV0YWlsWCArICd4JyArIHN1cmZhY2VEZXRhaWxZOw0KDQogICAgbGV0IGRyYXdTZXQgPSBoaWdobGlnaHRlZERyYXdTZXRzW3N1cmZhY2VLZXldOw0KICAgIGlmICghZHJhd1NldCkgew0KICAgICAgZHJhd1NldCA9IHsNCiAgICAgICAgc3VyZmFjZURyYXdDb29yZHM6IHt9LA0KICAgICAgICBjb3VudDogMCwNCiAgICAgIH07DQogICAgICBoaWdobGlnaHRlZERyYXdTZXRzW3N1cmZhY2VLZXldID0gZHJhd1NldDsNCiAgICB9DQogICAgZGVsZXRlIGRyYXdTZXQuc3VyZmFjZURyYXdDb29yZHNbc3VyZmFjZUluc3RhbmNlSWRdOw0KICAgIGRyYXdTZXQuY291bnQtLTsNCiAgfSk7DQogIGVhY2hCb2R5U3VyZmFjZShoaWdobGlnaHRlZEJvZHlJZHMsIChib2R5SWQsIHN1cmZhY2VJbnN0YW5jZUlkLCBzdXJmYWNlSWQsIGRyYXdJdGVtSW5kZXhJbkJvZHkpID0+IHsNCiAgICBjb25zdCBkZXRhaWxzT2Zmc2V0ID0gc3VyZmFjZUlkICogNzsNCiAgICBjb25zdCBzdXJmYWNlRGV0YWlsWCA9IHdvcmtlclN0YXRlLnN1cmZhY2VEZXRhaWxzW2RldGFpbHNPZmZzZXQgKyA0XTsNCiAgICBjb25zdCBzdXJmYWNlRGV0YWlsWSA9IHdvcmtlclN0YXRlLnN1cmZhY2VEZXRhaWxzW2RldGFpbHNPZmZzZXQgKyA1XTsNCiAgICBjb25zdCBzdXJmYWNlS2V5ID0gc3VyZmFjZURldGFpbFggKyAneCcgKyBzdXJmYWNlRGV0YWlsWTsNCg0KICAgIGxldCBkcmF3U2V0ID0gaGlnaGxpZ2h0ZWREcmF3U2V0c1tzdXJmYWNlS2V5XTsNCiAgICBpZiAoIWRyYXdTZXQpIHsNCiAgICAgIGRyYXdTZXQgPSB7DQogICAgICAgIHN1cmZhY2VEcmF3Q29vcmRzOiB7fSwNCiAgICAgICAgY291bnQ6IDAsDQogICAgICB9Ow0KICAgICAgaGlnaGxpZ2h0ZWREcmF3U2V0c1tzdXJmYWNlS2V5XSA9IGRyYXdTZXQ7DQogICAgfQ0KDQogICAgY29uc3QgdHJpbVNldElkID0gd29ya2VyU3RhdGUuc3VyZmFjZURldGFpbHNbZGV0YWlsc09mZnNldCArIDZdOw0KICAgIGRyYXdTZXQuc3VyZmFjZURyYXdDb29yZHNbc3VyZmFjZUluc3RhbmNlSWRdID0gWw0KICAgICAgYm9keUlkLA0KICAgICAgZHJhd0l0ZW1JbmRleEluQm9keSwNCiAgICAgIHN1cmZhY2VJZCwNCiAgICAgIHRyaW1TZXRJZCAvKiwNCiAgICAgICAgdSArIChqICUgY291bnR1KSAqIHBpeGVsc1BlckRyYXdJdGVtLA0KICAgICAgICB2ICsgTWF0aC5mbG9vcihqIC8gY291bnR1KSwqLywNCiAgICBdOw0KICAgIGRyYXdTZXQuY291bnQrKzsNCiAgfSk7DQoNCiAgLy8gTm93IGNvbnZlcnQgYWxsIHRoZSBkcmF3IHNldHMgdG8gdHlwZWQgYXJyYXlzDQogIGNvbnN0IG91dF9zdXJmYWNlRHJhd1NldHMgPSB7fTsNCiAgY29uc3QgdHJhbnNmZXJhYmxlcyA9IFtdOw0KICBmb3IgKGNvbnN0IHN1cmZhY2VLZXkgaW4gaGlnaGxpZ2h0ZWREcmF3U2V0cykgew0KICAgIGNvbnN0IGhpZ2hsaWdodGVkRHJhd1NldCA9IGhpZ2hsaWdodGVkRHJhd1NldHNbc3VyZmFjZUtleV07DQogICAgY29uc3QgZHJhd1NldCA9IG5ldyBGbG9hdDMyQXJyYXkoaGlnaGxpZ2h0ZWREcmF3U2V0LmNvdW50ICogZHJhd1NoYWRlckF0dHJpYnNTdHJpZGUpOw0KICAgIGxldCBvZmZzZXQgPSAwOw0KICAgIGZvciAoY29uc3Qgc3VyZmFjZUluc3RhbmNlSWQgaW4gaGlnaGxpZ2h0ZWREcmF3U2V0c1tzdXJmYWNlS2V5XS5zdXJmYWNlRHJhd0Nvb3Jkcykgew0KICAgICAgY29uc3Qgc3VyZmFjZURyYXdDb29yZCA9IGhpZ2hsaWdodGVkRHJhd1NldHNbc3VyZmFjZUtleV0uc3VyZmFjZURyYXdDb29yZHNbc3VyZmFjZUluc3RhbmNlSWRdOw0KICAgICAgZHJhd1NldC5zZXQoc3VyZmFjZURyYXdDb29yZCwgb2Zmc2V0KTsNCiAgICAgIG9mZnNldCArPSBkcmF3U2hhZGVyQXR0cmlic1N0cmlkZTsNCiAgICB9DQogICAgb3V0X3N1cmZhY2VEcmF3U2V0c1tzdXJmYWNlS2V5XSA9IGRyYXdTZXQ7DQogICAgdHJhbnNmZXJhYmxlcy5wdXNoKGRyYXdTZXQuYnVmZmVyKTsNCiAgfQ0KDQogIGNvbnN0IHJlc3VsdCA9IHsNCiAgICBldmVudFR5cGU6ICdoaWdobGlnaHRlZFN1cmZhY2VEcmF3U2V0c0NoYW5nZWQnLA0KICAgIGhpZ2hsaWdodGVkU3VyZmFjZURyYXdTZXRzOiBvdXRfc3VyZmFjZURyYXdTZXRzLA0KICAgIG51bUhpZ2hsaWdodGVkOiBoaWdobGlnaHRlZEJvZHlJZHMubGVuZ3RoLA0KICAgIG51bVVuaGlnaGxpZ2h0ZWQ6IHVuaGlnaGxpZ2h0ZWRCb2R5SWRzLmxlbmd0aCwNCiAgfTsNCiAgb25Eb25lKHJlc3VsdCwgdHJhbnNmZXJhYmxlcyk7DQp9Ow0KDQovLyBjb25zdCBib2R5SXRlbUNoYW5nZWQgPSAoZGF0YSwgb25Eb25lKSA9PiB7DQovLyAgIGNvbnN0IGNoYW5nZXMgPSBkYXRhLmNoYW5nZXMNCi8vICAgY29uc3QgbnVtRGlydHlCb2R5SXRlbXMgPSBPYmplY3Qua2V5cyhjaGFuZ2VzKS5sZW5ndGgNCi8vICAgLy8gTm90ZTogV2UgbW9kaWZ5IHRoZSBldmFsRHJhd0l0ZW1TaGFkZXJBdHRyaWJzIGFycmF5IGluIHBsYWNlIGFuZCBjb3B5DQovLyAgIC8vIHRoZSBtb2RpZmllZCBzZWN0aW9ucyBvdXQgdG8gdXBsb2FkIHRvIHRoZSBHUFUuDQovLyAgIGNvbnN0IGV2YWxEcmF3SXRlbVNoYWRlckF0dHJpYnMgPSB3b3JrZXJTdGF0ZS5ldmFsRHJhd0l0ZW1TaGFkZXJBdHRyaWJzDQovLyAgIGNvbnN0IG1vZGlmaWVkQm9keUl0ZW1zQ29vcmRzID0gbmV3IEZsb2F0MzJBcnJheSgNCi8vICAgICBudW1EaXJ0eUJvZHlJdGVtcyAqIGRyYXdJdGVtU2hhZGVyQXR0cmlic1N0cmlkZQ0KLy8gICApDQovLyAgIGxldCBpID0gMA0KLy8gICBmb3IgKGNvbnN0IGtleSBpbiBjaGFuZ2VzKSB7DQovLyAgICAgY29uc3QgYm9keUlkID0gTnVtYmVyLnBhcnNlSW50KGtleSkNCi8vICAgICBjb25zdCBib2R5RGF0YSA9IGNoYW5nZXNba2V5XQ0KLy8gICAgIGNvbnN0IG9mZnNldCA9IGJvZHlJZCAqIGRyYXdJdGVtU2hhZGVyQXR0cmlic1N0cmlkZQ0KDQovLyAgICAgLy8gY29uc29sZS5sb2coYm9keUlkLCAiYm9keUl0ZW1DaGFuZ2VkOiIsIGV2YWxEcmF3SXRlbVNoYWRlckF0dHJpYnNbb2Zmc2V0ICsgMV0pDQovLyAgICAgaWYgKGJvZHlEYXRhLmZsYWdzICE9IHVuZGVmaW5lZCkNCi8vICAgICAgIGV2YWxEcmF3SXRlbVNoYWRlckF0dHJpYnNbb2Zmc2V0ICsgMl0gPSBib2R5RGF0YS5mbGFncw0KLy8gICAgIGlmIChib2R5RGF0YS5tYXRlcmlhbCkgew0KLy8gICAgICAgZXZhbERyYXdJdGVtU2hhZGVyQXR0cmlic1tvZmZzZXQgKyA2XSA9IGJvZHlEYXRhLm1hdGVyaWFsWzBdIC8vIHNyYyBnbG1hdGVyaWFsY29vcmRzLngNCi8vICAgICAgIGV2YWxEcmF3SXRlbVNoYWRlckF0dHJpYnNbb2Zmc2V0ICsgN10gPSBib2R5RGF0YS5tYXRlcmlhbFsxXSAvLyBzcmMgZ2xtYXRlcmlhbGNvb3Jkcy55DQovLyAgICAgfQ0KLy8gICAgIGlmIChib2R5RGF0YS54Zm8pIHsNCi8vICAgICAgIC8vIGNvbnNvbGUubG9nKGJvZHlJZCwgImJvZHlJdGVtQ2hhbmdlZCB4Zm86IiwgYm9keURhdGEueGZvKQ0KLy8gICAgICAgZXZhbERyYXdJdGVtU2hhZGVyQXR0cmlic1tvZmZzZXQgKyA4XSA9IGJvZHlEYXRhLnhmb1swXSAvLyB0ci54DQovLyAgICAgICBldmFsRHJhd0l0ZW1TaGFkZXJBdHRyaWJzW29mZnNldCArIDldID0gYm9keURhdGEueGZvWzFdIC8vIHRyLnkNCi8vICAgICAgIGV2YWxEcmF3SXRlbVNoYWRlckF0dHJpYnNbb2Zmc2V0ICsgMTBdID0gYm9keURhdGEueGZvWzJdIC8vIHRyLnoNCg0KLy8gICAgICAgZXZhbERyYXdJdGVtU2hhZGVyQXR0cmlic1tvZmZzZXQgKyAxMV0gPSBib2R5RGF0YS54Zm9bM10gLy8gb3JpLngNCi8vICAgICAgIGV2YWxEcmF3SXRlbVNoYWRlckF0dHJpYnNbb2Zmc2V0ICsgMTJdID0gYm9keURhdGEueGZvWzRdIC8vIG9yaS55DQovLyAgICAgICBldmFsRHJhd0l0ZW1TaGFkZXJBdHRyaWJzW29mZnNldCArIDEzXSA9IGJvZHlEYXRhLnhmb1s1XSAvLyBvcmkueg0KLy8gICAgICAgZXZhbERyYXdJdGVtU2hhZGVyQXR0cmlic1tvZmZzZXQgKyAxNF0gPSBib2R5RGF0YS54Zm9bNl0gLy8gb3JpLncNCg0KLy8gICAgICAgZXZhbERyYXdJdGVtU2hhZGVyQXR0cmlic1tvZmZzZXQgKyAxNV0gPSBib2R5RGF0YS54Zm9bN10gLy8gc2Mudw0KLy8gICAgICAgZXZhbERyYXdJdGVtU2hhZGVyQXR0cmlic1tvZmZzZXQgKyAxNl0gPSBib2R5RGF0YS54Zm9bOF0gLy8gc2Mudw0KLy8gICAgICAgZXZhbERyYXdJdGVtU2hhZGVyQXR0cmlic1tvZmZzZXQgKyAxN10gPSBib2R5RGF0YS54Zm9bOV0gLy8gc2Mudw0KLy8gICAgIH0NCi8vICAgICBpZiAoYm9keURhdGEuaGlnaGxpZ2h0KSB7DQovLyAgICAgICBldmFsRHJhd0l0ZW1TaGFkZXJBdHRyaWJzW29mZnNldCArIDIyXSA9IGJvZHlEYXRhLmhpZ2hsaWdodFswXQ0KLy8gICAgICAgZXZhbERyYXdJdGVtU2hhZGVyQXR0cmlic1tvZmZzZXQgKyAyM10gPSBib2R5RGF0YS5oaWdobGlnaHRbMV0NCi8vICAgICAgIGV2YWxEcmF3SXRlbVNoYWRlckF0dHJpYnNbb2Zmc2V0ICsgMjRdID0gYm9keURhdGEuaGlnaGxpZ2h0WzJdDQovLyAgICAgICBldmFsRHJhd0l0ZW1TaGFkZXJBdHRyaWJzW29mZnNldCArIDI1XSA9IGJvZHlEYXRhLmhpZ2hsaWdodFszXQ0KLy8gICAgIH0NCi8vICAgICBpZiAoYm9keURhdGEuY3V0UGxhbmUpIHsNCi8vICAgICAgIGV2YWxEcmF3SXRlbVNoYWRlckF0dHJpYnNbb2Zmc2V0ICsgMjZdID0gYm9keURhdGEuY3V0UGxhbmVbMF0NCi8vICAgICAgIGV2YWxEcmF3SXRlbVNoYWRlckF0dHJpYnNbb2Zmc2V0ICsgMjddID0gYm9keURhdGEuY3V0UGxhbmVbMV0NCi8vICAgICAgIGV2YWxEcmF3SXRlbVNoYWRlckF0dHJpYnNbb2Zmc2V0ICsgMjhdID0gYm9keURhdGEuY3V0UGxhbmVbMl0NCi8vICAgICAgIGV2YWxEcmF3SXRlbVNoYWRlckF0dHJpYnNbb2Zmc2V0ICsgMjldID0gYm9keURhdGEuY3V0UGxhbmVbM10NCi8vICAgICB9DQoNCi8vICAgICAvLyBQdWxsIG91dCBhIGNvcHkgb2YgdGhlIGRhdGEgYW5kIHB1dCBpbnRvIG91ciBzbWFsbGVyIGFycmF5Lg0KLy8gICAgIGNvbnN0IHByZXZCb2R5SXRlbXNEYXRhID0gd29ya2VyU3RhdGUuZXZhbERyYXdJdGVtU2hhZGVyQXR0cmlicy5zdWJhcnJheSgNCi8vICAgICAgIGJvZHlJZCAqIGRyYXdJdGVtU2hhZGVyQXR0cmlic1N0cmlkZSwNCi8vICAgICAgIChib2R5SWQgKyAxKSAqIGRyYXdJdGVtU2hhZGVyQXR0cmlic1N0cmlkZQ0KLy8gICAgICkNCi8vICAgICBtb2RpZmllZEJvZHlJdGVtc0Nvb3Jkcy5zZXQocHJldkJvZHlJdGVtc0RhdGEsIGkgKiBkcmF3SXRlbVNoYWRlckF0dHJpYnNTdHJpZGUpDQoNCi8vICAgICBpKysNCi8vICAgfQ0KLy8gICBjb25zdCByZXN1bHQgPSB7DQovLyAgICAgZXZlbnRUeXBlOiAnYm9keUl0ZW1DaGFuZ2VkJywNCi8vICAgICBldmFsRHJhd0l0ZW1TaGFkZXJBdHRyaWJzOiBtb2RpZmllZEJvZHlJdGVtc0Nvb3JkcywNCi8vICAgfQ0KLy8gICBvbkRvbmUocmVzdWx0KQ0KLy8gfQ0KDQovLyAvLyBsZXQgYXNzZW1ibHlCQm94Ow0KLy8gLy8gbGV0IHN1cmZhY2VSZW5kZXJQYXJhbXMgPSBbXTsNCi8vIC8vIGNvbnN0IGJvZHlEcmF3RGF0YXMgPSBbXTsNCg0KLy8gLy8gY29uc3QgcmVuZGVyRGF0YXMgPSBbXTsNCi8vIC8vIGNvbnN0IEhBTEZfUEkgPSBNYXRoLlBJICogMC41Ow0KDQovLyAvLyBjb25zdCBvblZpZXdDaGFuZ2VkID0gKHZpZXdYZm8sIHZpZXdEaXIsIG9uRG9uZSkgPT4gew0KLy8gLy8gICAgIGNvbnN0IGJlY29taW5nVmlzaWJsZSA9IFtdOw0KLy8gLy8gICAgIGNvbnN0IGJlY29taW5nSW52aXNpYmxlID0gW107DQovLyAvLyAgICAgY29uc3QgbG9kQ2hhbmdlcyA9IFtdOw0KDQovLyAvLyAgICAgY29uc3QgdGVzdEZydXN0dW0gPSAocG9zLCBzaXplKSA9PiB7DQoNCi8vIC8vICAgICAgICAgY29uc3QgZGlyID0gcG9zLnN1YnRyYWN0KHZpZXdYZm8udHIpOw0KLy8gLy8gICAgICAgICBjb25zdCBkaXN0ID0gZGlyLmxlbmd0aCgpOw0KLy8gLy8gICAgICAgICBkaXIuc2NhbGVJblBsYWNlKDEuMCAvIGRpc3QpOw0KLy8gLy8gICAgICAgICBjb25zdCB2aWV3RG90RGlyID0gZGlyLmRvdCh2aWV3RGlyKTsNCi8vIC8vICAgICAgICAgY29uc3QgYW5nbGUgPSBNYXRoLmFjb3Modmlld0RvdERpcik7DQoNCi8vIC8vICAgICAgICAgY29uc3Qgdmlld0NvbmVBbmdsZSA9IDEuMjsgLy8gVGhlIGZvdiBkaXZpZGVkIGJ5IDI7IChhdCB0aGUgY29ybmVyKQ0KLy8gLy8gICAgICAgICAvLyBjb25zb2xlLmxvZyhhbmdsZSArICI6IiArIE1hdGguYXRhbihzaXplIC8gZGlzdCkpDQoNCi8vIC8vICAgICAgICAgbGV0IHZpcyA9IDA7DQovLyAvLyAgICAgICAgIGlmIChkaXN0ID4gc2l6ZSkgew0KLy8gLy8gICAgICAgICAgICAgaWYgKHZpZXdEb3REaXIgPCAwLjAgfHwgYW5nbGUgLSBNYXRoLmF0YW4oc2l6ZSAvIGRpc3QpID4gdmlld0NvbmVBbmdsZSkgew0KLy8gLy8gICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCJJdGVtIGlzIGNvbXBsZXRlbHkgb3V0c2lkZSBvZiB0aGUgZnJ1c3R1bSIpDQovLyAvLyAgICAgICAgICAgICAgICAgdmlzID0gMTsNCi8vIC8vICAgICAgICAgICAgIH0gZWxzZSB7DQovLyAvLyAgICAgICAgICAgICAgICAgaWYgKGFuZ2xlICsgTWF0aC5hdGFuKHNpemUgLyBkaXN0KSA8IHZpZXdDb25lQW5nbGUpIHsNCi8vIC8vICAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coIkl0ZW0gaXMgY29tcGxldGVseSBpbnNpZGUgIHRoZSBmcnVzdHVtIikNCi8vIC8vICAgICAgICAgICAgICAgICAgICAgdmlzID0gMjsNCi8vIC8vICAgICAgICAgICAgICAgICB9IGVsc2Ugew0KLy8gLy8gICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZygiSXRlbSBpcyBpbnNpZGUgb2YgdGhlIGZydXN0dW0iKQ0KLy8gLy8gICAgICAgICAgICAgICAgICAgICB2aXMgPSAzOw0KLy8gLy8gICAgICAgICAgICAgICAgIH0NCi8vIC8vICAgICAgICAgICAgIH0NCi8vIC8vICAgICAgICAgfQ0KLy8gLy8gICAgICAgICByZXR1cm4gew0KLy8gLy8gICAgICAgICAgICAgZGlyLA0KLy8gLy8gICAgICAgICAgICAgZGlzdCwNCi8vIC8vICAgICAgICAgICAgIGFuZ2xlLA0KLy8gLy8gICAgICAgICAgICAgdmlzDQovLyAvLyAgICAgICAgIH07DQovLyAvLyAgICAgfQ0KDQovLyAvLyAgICAgY29uc3QgZWFjaEJvZHlEYXRhID0gKGJvZHlEcmF3RGF0YSwgYm9keUluZGV4KSA9PiB7DQoNCi8vIC8vICAgICAgICAgY29uc3QgYm9keVZpcyA9IHRlc3RGcnVzdHVtKGJvZHlEcmF3RGF0YS5ib2R5WGZvLnRyLCBib2R5RHJhd0RhdGEuYm9keVNpemUpOw0KDQovLyAvLyAgICAgICAgIGNvbnN0IGRyYXdJdGVtRGF0YSA9IGJvZHlEcmF3RGF0YS5kcmF3SXRlbURhdGE7DQovLyAvLyAgICAgICAgIGZvciAobGV0IHN1cmZhY2VJbmRleCA9IDA7IHN1cmZhY2VJbmRleCA8IGJvZHlEcmF3RGF0YS5udW1TdXJmYWNlczsgc3VyZmFjZUluZGV4KyspIHsNCi8vIC8vICAgICAgICAgICAgIGNvbnN0IHBpeGVsc1BlckRyYXdJdGVtID0gNDsgLy8gVGhlIG51bWJlciBvZiBSR0JBIHBpeGVscyBwZXIgZHJhdyBpdGVtLg0KLy8gLy8gICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0gKHN1cmZhY2VJbmRleCAqIHBpeGVsc1BlckRyYXdJdGVtICogNCk7DQovLyAvLyAgICAgICAgICAgICBjb25zdCBwb3MgPSBuZXcgVmVjMygNCi8vIC8vICAgICAgICAgICAgICAgICBkcmF3SXRlbURhdGFbb2Zmc2V0ICsgM10sIGRyYXdJdGVtRGF0YVtvZmZzZXQgKyA3XSwgZHJhd0l0ZW1EYXRhW29mZnNldCArIDExXQ0KLy8gLy8gICAgICAgICAgICAgKQ0KLy8gLy8gICAgICAgICAgICAgY29uc3Qgc3VyZmFjZUlkID0gZHJhd0l0ZW1EYXRhW29mZnNldCArIDEyXTsNCi8vIC8vICAgICAgICAgICAgIGNvbnN0IHNpemUgPSBzdXJmYWNlUmVuZGVyUGFyYW1zW3N1cmZhY2VJZCAqIDNdOw0KDQovLyAvLyAgICAgICAgICAgICBsZXQgdmlzaWJpbGl0eVN0YXRlID0gMDsgLy8gdmlzaWJsZQ0KLy8gLy8gICAgICAgICAgICAgaWYgKGJvZHlWaXMudmlzID09IDEpIHsNCi8vIC8vICAgICAgICAgICAgICAgICB2aXNpYmlsaXR5U3RhdGUgPSAxOw0KLy8gLy8gICAgICAgICAgICAgfSBlbHNlIGlmIChib2R5VmlzLnZpcyA9PSAzKSB7DQovLyAvLyAgICAgICAgICAgICAgICAgY29uc3Qgc3VyZmFjZVZpcyA9IHRlc3RGcnVzdHVtKHBvcywgc2l6ZSk7DQovLyAvLyAgICAgICAgICAgICAgICAgaWYgKHN1cmZhY2VWaXMudmlzID09IDEpDQovLyAvLyAgICAgICAgICAgICAgICAgICAgIHZpc2liaWxpdHlTdGF0ZSA9IDE7DQovLyAvLyAgICAgICAgICAgICB9DQoNCi8vIC8vICAgICAgICAgICAgIC8vIFJlZHVjaW5nIHRoZSBudW1iZXIgb2YgdmlzaWJpbGl0eSBjaGFuZ2VzLg0KLy8gLy8gICAgICAgICAgICAgLy8gaWYgKHZpc2liaWxpdHlTdGF0ZSA9PSAwKSB7DQovLyAvLyAgICAgICAgICAgICAvLyAgICAgY29uc3QgY3VydmF0dXJlID0gc3VyZmFjZVJlbmRlclBhcmFtc1soc3VyZmFjZUlkICogMykgKyAxXTsNCi8vIC8vICAgICAgICAgICAgIC8vICAgICBjb25zdCBudXJmYWNlTm9ybWFsID0gbmV3IFZlYzMoDQovLyAvLyAgICAgICAgICAgICAvLyAgICAgICAgIGRyYXdJdGVtRGF0YVtvZmZzZXQgKyAyXSwgZHJhd0l0ZW1EYXRhW29mZnNldCArIDZdLCBkcmF3SXRlbURhdGFbb2Zmc2V0ICsgMTBdDQovLyAvLyAgICAgICAgICAgICAvLyAgICAgKTsNCi8vIC8vICAgICAgICAgICAgIC8vICAgICBjb25zdCBhbmdsZSA9IG51cmZhY2VOb3JtYWwubmVnYXRlKCkuYW5nbGVUbyhib2R5VmlzLmRpcikNCi8vIC8vICAgICAgICAgICAgIC8vICAgICBpZiAoYW5nbGUgPCBIQUxGX1BJICogKDEuMCAtIGN1cnZhdHVyZSkpIHsNCi8vIC8vICAgICAgICAgICAgIC8vICAgICAgICAgdmlzaWJpbGl0eVN0YXRlID0gMTsNCi8vIC8vICAgICAgICAgICAgIC8vICAgICB9DQovLyAvLyAgICAgICAgICAgICAvLyB9DQoNCi8vIC8vICAgICAgICAgICAgIC8vIElmIGlzIHZpc2libGUsIGNoZWNrIGZvciBMT0QgY2hhbmdlcy4NCi8vIC8vICAgICAgICAgICAgIGlmICh2aXNpYmlsaXR5U3RhdGUgPT0gMCkgew0KLy8gLy8gICAgICAgICAgICAgICAgIGNvbnN0IGRldGFpbCA9IHN1cmZhY2VSZW5kZXJQYXJhbXNbKHN1cmZhY2VJZCAqIDMpICsgMl07DQovLyAvLyAgICAgICAgICAgICAgICAgY29uc3QgbG9kID0gMSArIE1hdGgubWluKE1hdGgucm91bmQoZGV0YWlsICogTWF0aC5hdGFuKDEuMCAvIGJvZHlWaXMuZGlzdCkpLCA1KTsNCi8vIC8vICAgICAgICAgICAgICAgICBpZiAobG9kICE9IHJlbmRlckRhdGFzW2JvZHlJbmRleF0uY3VyckxvZFtzdXJmYWNlSW5kZXhdKSB7DQovLyAvLyAgICAgICAgICAgICAgICAgICAgIC8vIFdoZW4gYW4gaXRlbSBjaGFuZ2VzIExPRCwgaXQgaXMgcGxhY2VkIGluIHRoZSBuZXcgTE9EIHNldCB3aXRoIHZpc2liaWxpdHkgPT0gdHJ1ZQ0KLy8gLy8gICAgICAgICAgICAgICAgICAgICBsb2RDaGFuZ2VzLnB1c2goew0KLy8gLy8gICAgICAgICAgICAgICAgICAgICAgICAgYm9keUluZGV4LA0KLy8gLy8gICAgICAgICAgICAgICAgICAgICAgICAgc3VyZmFjZUluZGV4LA0KLy8gLy8gICAgICAgICAgICAgICAgICAgICAgICAgbG9kDQovLyAvLyAgICAgICAgICAgICAgICAgICAgIH0pDQovLyAvLyAgICAgICAgICAgICAgICAgICAgIHJlbmRlckRhdGFzW2JvZHlJbmRleF0uY3VyckxvZFtzdXJmYWNlSW5kZXhdID0gbG9kOw0KLy8gLy8gICAgICAgICAgICAgICAgIH0NCi8vIC8vICAgICAgICAgICAgICAgICBlbHNlIGlmICh2aXNpYmlsaXR5U3RhdGUgIT0gcmVuZGVyRGF0YXNbYm9keUluZGV4XS5jdXJyVmlzaWJpbGl0eVtzdXJmYWNlSW5kZXhdKSB7DQovLyAvLyAgICAgICAgICAgICAgICAgICAgIC8vIElmIGxvZCBkaWRuJ3QgY2hhbmdlLCB3ZSBjYW4gY2hhbmdlIHZpc2liaWxpdHkuDQovLyAvLyAgICAgICAgICAgICAgICAgICAgIGJlY29taW5nVmlzaWJsZS5wdXNoKHsNCi8vIC8vICAgICAgICAgICAgICAgICAgICAgICAgIGJvZHlJbmRleCwNCi8vIC8vICAgICAgICAgICAgICAgICAgICAgICAgIHN1cmZhY2VJbmRleA0KLy8gLy8gICAgICAgICAgICAgICAgICAgICB9KQ0KLy8gLy8gICAgICAgICAgICAgICAgIH0NCi8vIC8vICAgICAgICAgICAgIH0NCi8vIC8vICAgICAgICAgICAgIGVsc2UgaWYgKHZpc2liaWxpdHlTdGF0ZSAhPSByZW5kZXJEYXRhc1tib2R5SW5kZXhdLmN1cnJWaXNpYmlsaXR5W3N1cmZhY2VJbmRleF0pIHsNCi8vIC8vICAgICAgICAgICAgICAgICBiZWNvbWluZ0ludmlzaWJsZS5wdXNoKHsNCi8vIC8vICAgICAgICAgICAgICAgICAgICAgYm9keUluZGV4LA0KLy8gLy8gICAgICAgICAgICAgICAgICAgICBzdXJmYWNlSW5kZXgNCi8vIC8vICAgICAgICAgICAgICAgICB9KTsNCi8vIC8vICAgICAgICAgICAgIH0NCi8vIC8vICAgICAgICAgICAgIHJlbmRlckRhdGFzW2JvZHlJbmRleF0uY3VyclZpc2liaWxpdHlbc3VyZmFjZUluZGV4XSA9IHZpc2liaWxpdHlTdGF0ZTsNCi8vIC8vICAgICAgICAgfQ0KLy8gLy8gICAgIH0NCi8vIC8vICAgICBib2R5RHJhd0RhdGFzLmZvckVhY2goZWFjaEJvZHlEYXRhKTsNCg0KLy8gLy8gICAgIGlmIChiZWNvbWluZ0ludmlzaWJsZS5sZW5ndGggPiAwIHx8IGJlY29taW5nVmlzaWJsZS5sZW5ndGggPiAwIHx8IGxvZENoYW5nZXMubGVuZ3RoID4gMCkgew0KLy8gLy8gICAgICAgICBjb25zdCByZXN1bHQgPSB7DQovLyAvLyAgICAgICAgICAgICBiZWNvbWluZ0ludmlzaWJsZSwNCi8vIC8vICAgICAgICAgICAgIGJlY29taW5nVmlzaWJsZSwNCi8vIC8vICAgICAgICAgICAgIGxvZENoYW5nZXMNCi8vIC8vICAgICAgICAgfTsNCi8vIC8vICAgICAgICAgLy8gY29uc29sZS5sb2coIm9uVmlld0NoYW5nZWQ6IiArSlNPTi5zdHJpbmdpZnkocmVzdWx0KSk7DQovLyAvLyAgICAgICAgIG9uRG9uZShyZXN1bHQpOw0KLy8gLy8gICAgIH0NCi8vIC8vICAgICBlbHNlIHsNCi8vIC8vICAgICAgICBvbkRvbmUoKTsNCi8vIC8vICAgICB9DQovLyAvLyB9DQoNCmNvbnN0IEdMQ0FEQXNzZXRXb3JrZXJfb25tZXNzYWdlID0gZnVuY3Rpb24gKGRhdGEsIG9uRG9uZSkgew0KICBzd2l0Y2ggKGRhdGEuZXZlbnRUeXBlKSB7DQogICAgY2FzZSAnbG9hZEFzc2VtYmx5JzoNCiAgICAgIGxvYWRBc3NlbWJseShkYXRhLCBvbkRvbmUpOw0KICAgICAgYnJlYWsNCiAgICBjYXNlICdib2R5SGlnaGxpZ2h0Q2hhbmdlZCc6DQogICAgICBib2R5SGlnaGxpZ2h0Q2hhbmdlZChkYXRhLCBvbkRvbmUpOw0KICAgICAgYnJlYWsNCiAgICAvLyBjYXNlICdib2R5SXRlbUNoYW5nZWQnOg0KICAgIC8vICAgYm9keUl0ZW1DaGFuZ2VkKGRhdGEsIG9uRG9uZSkNCiAgICAvLyAgIGJyZWFrDQogICAgLy8gY2FzZSAnYm9keU1hdGVyaWFsQ2hhbmdlZCc6DQogICAgLy8gICBib2R5TWF0ZXJpYWxDaGFuZ2VkKGRhdGEsIG9uRG9uZSk7DQogICAgLy8gICBicmVhazsNCiAgICAvLyBjYXNlICdib2R5Q29sb3JDaGFuZ2VkJzoNCiAgICAvLyAgIGJvZHlDb2xvckNoYW5nZWQoZGF0YSwgb25Eb25lKTsNCiAgICAvLyAgIGJyZWFrOw0KICAgIC8vIGNhc2UgJ2JvZHlYZm9zQ2hhbmdlZCc6DQogICAgLy8gICBib2R5WGZvc0NoYW5nZWQoZGF0YSwgb25Eb25lKTsNCiAgICAvLyAgIGJyZWFrOw0KICB9DQp9Ow0KDQpnbG9iYWxUaGlzLm9ubWVzc2FnZSA9IGZ1bmN0aW9uIChldmVudCkgew0KICBHTENBREFzc2V0V29ya2VyX29ubWVzc2FnZShldmVudC5kYXRhLCAocmVzdWx0LCB0cmFuc2ZlcmFibGVzKSA9PiB7DQogICAgZ2xvYmFsVGhpcy5wb3N0TWVzc2FnZShyZXN1bHQsIHRyYW5zZmVyYWJsZXMpOw0KICB9KTsNCn07DQoNCi8vIEVuYWJsZSBtZSBmb3Igc2luZ2xlIHRocmVhZGVkIGRldi4NCi8vIGV4cG9ydCB7IEdMQ0FEQXNzZXRXb3JrZXJfb25tZXNzYWdlIH0KCg==', null, false);
  /* eslint-enable */

  // [bodyDescId, surfaceId, cadBodyDesc.xy], [glmaterialcoords.xy][tr-xyz], [ori], [sc], [highlight], [cutPlane]
  const pixelsPerCADBody = 7;
  // import {
  //   GLCADAssetWorker_onmessage
  // } from './GLCADAssetWorker.js';

  /**  Class representing a GL CAD asset.
   * @ignore
   */
  class GLCADAsset extends zeaEngine.EventEmitter {
    /**
     * Create a GL CAD asset.
     * @param {any} gl - The gl value.
     * @param {any} assetId - The assetId value.
     * @param {any} cadAsset - The cadAsset value.
     * @param {any} cadpassdata - The cadpassdata value.
     */
    constructor(gl, assetId, cadAsset, cadpassdata) {
      super();
      this.__gl = gl;
      this.__assetId = assetId;
      this.__cadAsset = cadAsset;
      this.__numSurfaces = cadAsset.getSurfaceLibrary().getNumSurfaces();
      this.__numBodies = cadAsset.getBodyLibrary().getNumBodies();
      this.__numMaterials = cadAsset.getMaterialLibrary().getNumMaterials();
      this.__numHighlightedGeoms = 0;
      this.__ready = false;

      this.__visible = this.__cadAsset.isVisible();
      this.__assetVisibilityChanged = this.__assetVisibilityChanged.bind(this);
      this.__cadAsset.on('visibilityChanged', this.__assetVisibilityChanged);

      const updateDisplayEdges = () => {
        this.displayEdges = this.__cadAsset.getParameter('DisplayEdges').getValue();
        if (this.displayEdges) cadpassdata.incDisplayEdges();
        else cadpassdata.decDisplayEdges();
      };
      updateDisplayEdges();
      this.displayEdgesChangedId = this.__cadAsset.getParameter('DisplayEdges').on('valueChanged', updateDisplayEdges);

      const updateEdgeColor = () => {
        this.edgeColor = this.__cadAsset.getParameter('EdgeColor').getValue().asArray();
        this.emit('updated');
      };
      updateEdgeColor();
      this.edgesColorChangedId = this.__cadAsset.getParameter('EdgeColor').on('valueChanged', updateEdgeColor);

      this.__cadpassdata = cadpassdata;

      this.__curveLibrary = new GLCurveLibrary(
        gl,
        cadpassdata,
        this.__cadAsset.getSurfaceLibrary(),
        cadAsset.getVersion()
      );
      this.__surfaceLibrary = new GLSurfaceLibrary(
        gl,
        cadpassdata,
        this.__cadAsset.getSurfaceLibrary(),
        this.__curveLibrary,
        cadAsset.getVersion()
      );
      const trimSetsBuffer = this.__cadAsset.getTrimSetLibrary().getBinaryBuffer();
      if (trimSetsBuffer && trimSetsBuffer.byteLength > 8) {
        this.__trimSetLibrary = new GLTrimSetLibrary(
          gl,
          cadpassdata,
          this.__cadAsset.getTrimSetLibrary(),
          this.__curveLibrary
        );
      }

      {
        const bodyLibraryBuffer = this.__cadAsset.getBodyLibrary().getBinaryBuffer();
        if (bodyLibraryBuffer) {
          const bodyTexSize = Math.sqrt(bodyLibraryBuffer.byteLength / 16); // RGBA32 pixels
          this.__bodyDescTexture = new zeaEngine.GLTexture2D(gl, {
            format: 'RGBA',
            type: 'FLOAT',
            width: bodyTexSize,
            height: bodyTexSize,
            filter: 'NEAREST',
            wrap: 'CLAMP_TO_EDGE',
            mipMapped: false,
            data: new Float32Array(bodyLibraryBuffer),
          });
        }
      }

      this.__bindAttr = (location, channels, type, stride, offset, instanced = true) => {
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, channels, gl.FLOAT, false, stride, offset);
        if (instanced) gl.vertexAttribDivisor(location, 1); // This makes it instanced
      };

      this.__trimCurveDrawSets = {};
      this.__surfaceDrawSets = {};
      this.__curveDrawSets = {};

      // ////////////////////////////////////////////////

      this.loadWorker();
    }

    /**
     * @private
     */
    __assetVisibilityChanged() {
      this.__visible = this.__cadAsset.isVisible();
      this.emit('updated');
    }

    /**
     * The getCADAsset method.
     * @return {any} - The return value.
     */
    getCADAsset() {
      return this.__cadAsset
    }

    /**
     * The getNumSurfaces method.
     * @return {any} - The return value.
     */
    getNumSurfaces() {
      return this.__numSurfaces
    }

    /**
     * The getNumBodies method.
     * @return {any} - The return value.
     */
    getNumBodies() {
      return this.__numBodies
    }

    /**
     * The getNumMaterials method.
     * @return {any} - The return value.
     */
    getNumMaterials() {
      return this.__numMaterials
    }

    /**
     * The incHighlightedCount method.
     * @param {any} count - The count param.
     */
    incHighlightedCount(count) {
      this.__numHighlightedGeoms += count;
      this.__cadpassdata.incHighlightedCount(count);
    }

    /**
     * The decHighlightedCount method.
     * @param {any} count - The count param.
     */
    decHighlightedCount(count) {
      this.__numHighlightedGeoms -= count;
      this.__cadpassdata.decHighlightedCount(count);
    }

    /**
     * The loadWorker method.
     */
    loadWorker() {
      const numBodyItems = this.__cadAsset.getNumBodyItems();
      if (numBodyItems == 0) return

      // let tmp = 0;
      // this.__cadAsset.traverse((treeItem) => {
      //     if (treeItem instanceof CADBody) {
      //       console.log(treeItem.getPath())
      //       tmp++;
      //       return false;
      //     } else
      //       return true;
      // });
      // if(numBodyItems != tmp){
      //   console.log("numBodyItems", numBodyItems, tmp)
      //   numBodyItems = tmp;
      // }

      // Only support power 2 textures. Else we get strange corruption on some GPUs
      // in some scenes.
      let cadBodiesTextureSize = zeaEngine.MathFunctions.nextPow2(Math.round(Math.sqrt(numBodyItems * pixelsPerCADBody) + 0.5));
      // Size should be a multiple of pixelsPerCADBody, so each geom item is always contiguous
      // in memory. (makes updating a lot easier. See __updateItemInstanceData below)
      if (cadBodiesTextureSize % pixelsPerCADBody != 0)
        cadBodiesTextureSize += pixelsPerCADBody - (cadBodiesTextureSize % pixelsPerCADBody);

      this.cadBodiesTextureData = new Float32Array(cadBodiesTextureSize * cadBodiesTextureSize * 4); // 4==RGBA pixels.

      // Calculate the entroid to offset all the Xfo values.
      // This is to work around an issue on Mobile GPUs where
      // the fragment shader stage only supports Flaot16 operations.
      // The Matrix calculated in the DrawItems shader contains artifacts
      // because of the low precision.
      // If the asset is invisible when loaded, then the bbox is
      // not valid and the centroid becomes NaN
      const assetBBox = this.__cadAsset.getParameter('BoundingBox').getValue();
      // this.__assetCentroid = assetBBox.center()
      // if (
      //   Number.isNaN(this.__assetCentroid.x) ||
      //   Number.isNaN(this.__assetCentroid.y) ||
      //   Number.isNaN(this.__assetCentroid.z)
      // ) {
      this.__assetCentroid = new zeaEngine.Vec3();
      // }

      const sceneBodyItemsData = new Float32Array(numBodyItems * floatsPerSceneBody);

      let index = 0;
      this.__cadBodies = [];
      const highlightedBodies = [];

      const highlightChangeBatch = {
        highlightedBodyIds: [],
        unhighlightedBodyIds: [],
        dirty: false,
      };
      const pushhighlightChangeBatchToWorker = () => {
        this.__postMessageToWorker({
          eventType: 'bodyHighlightChanged',
          highlightedBodyIds: highlightChangeBatch.highlightedBodyIds,
          unhighlightedBodyIds: highlightChangeBatch.unhighlightedBodyIds,
        });
        highlightChangeBatch.highlightedBodyIds = [];
        highlightChangeBatch.unhighlightedBodyIds = [];
        highlightChangeBatch.dirty = false;
      };

      this.__dirtyBodyIndices = [];
      const bodyItemDataChanged = (bodyId) => {
        if (this.__dirtyBodyIndices.indexOf(bodyId) == -1) {
          this.__dirtyBodyIndices.push(bodyId);
          this.emit('updated');
        }
      };

      const bindCADBody = (cadBody) => {
        const bodyId = index;
        if (bodyId >= numBodyItems) return

        // Data passed to the web worker to help setup layout.
        const sceneBodyItemDataByteOffset = bodyId * floatsPerSceneBody * 4; /*bytes/channel*/
        const sceneBodyItemData = new Float32Array(
          sceneBodyItemsData.buffer,
          sceneBodyItemDataByteOffset,
          floatsPerSceneBody
        );

        const cadBodyTextureDataByteOffset = bodyId * pixelsPerCADBody * 4 /*channels/pixel*/ * 4; /*bytes/channel*/
        const cadBodyTextureData = new Float32Array(
          this.cadBodiesTextureData.buffer,
          cadBodyTextureDataByteOffset,
          pixelsPerCADBody * 4 /*channels/pixel*/
        );

        const glCADBody = new GLCADBody(cadBody, bodyId);
        glCADBody.bind(
          this.__cadpassdata,
          sceneBodyItemData,
          cadBodyTextureData,
          bodyItemDataChanged,
          highlightedBodies,
          highlightChangeBatch,
          pushhighlightChangeBatchToWorker
        );

        this.__cadBodies.push(glCADBody);
        index++;
      };

      this.__cadAsset.traverse((treeItem) => {
        if (treeItem instanceof CADBody) {
          bindCADBody(treeItem);
          return false
        } else {
          return true
        }
      });

      ////////////////////////////////////////
      // Greate the GLTexture.
      const gl = this.__gl;
      this.__cadBodiesTexture = new zeaEngine.GLTexture2D(gl, {
        format: 'RGBA',
        type: 'FLOAT',
        width: cadBodiesTextureSize,
        height: cadBodiesTextureSize,
        filter: 'NEAREST',
        wrap: 'CLAMP_TO_EDGE',
        mipMapped: false,
        data: this.cadBodiesTextureData,
      });

      ////////////////////////////////////////
      // Detail Factor
      // The detail factor is used to convert surface 'cost'
      // to a given tesselation level.
      // Here we start with a given tesselation desired for a
      // circle the size of the asset bounding box.
      // We calculate the cost of the circle (curvature * length^2)
      const unitsScale = this.__cadAsset.getUnitsConversion();
      const assetBBoxRadius = (assetBBox.size() * 0.5) / unitsScale;

      //////////////////////
      // Calculate a detail value for a circle enclosing our bbox.
      const lod = this.__cadAsset.lod;
      const detail = 128 * Math.pow(2, lod);
      // Calculate the arc angle for a cricle subdivided to the detail level
      const arcAngle = (Math.PI * 2.0) / detail;
      // Calculate the deviation to the circle at the middle of the arc.
      const errorTolerance = assetBBoxRadius - assetBBoxRadius * Math.cos(arcAngle / 2);

      // The smallest area of a drawn item.
      // The renderer will skip any surfaces smaller than this item.
      const surfaceAreaThreshold = 0; //Math.PI * (assetBBoxRadius * assetBBoxRadius * 0.000000005 * Math.pow(2, lod))
      // Note: on the hospital sprinker system we get the following values on the GTX laptop.
      // assetBBoxRadius: 67447  surfaceAreaThreshold: 285
      // Skipping about 30 surfaces.

      console.log(
        'assetBBoxRadius:',
        assetBBoxRadius,
        ' errorTolerance:',
        errorTolerance,
        ' surfaceAreaThreshold:',
        surfaceAreaThreshold
      );

      ////////////////////////////////////////
      const curvesDataBuffer = this.__cadAsset.getSurfaceLibrary().getCurveBuffer();
      const surfacesDataBuffer = this.__cadAsset.getSurfaceLibrary().getSurfaceBuffer();
      const cadDataVersion = this.__cadAsset.getVersion();

      const trimSetsBuffer = this.__cadAsset.getTrimSetLibrary().getBinaryBuffer();
      let trimTexelSize = -1;
      if (trimSetsBuffer) {
        const numAssets = this.__cadpassdata.assetCount;
        trimTexelSize = this.__cadAsset.getTrimSetLibrary().getTexelSize(lod, numAssets);
        // const mult = Math.pow(2, this.__cadAsset.getLOD());
        // trimTexelSize = this.__cadAsset.getTrimTexelSize() * mult;
      }

      const bodyLibraryBufferToc = this.__cadAsset.getBodyLibrary().getToc();
      const bodyLibraryBuffer = this.__cadAsset.getBodyLibrary().getBinaryBuffer();

      const transferables = [surfacesDataBuffer, bodyLibraryBufferToc, bodyLibraryBuffer];
      if (trimSetsBuffer) transferables.push(trimSetsBuffer);

      const assemblyData = {
        eventType: 'loadAssembly',
        assetId: this.__assetId,
        curvesDataBuffer,
        surfacesDataBuffer,
        cadDataVersion,
        trimSetsBuffer,
        lod: this.__cadAsset.getLOD(),
        maxTexSize: this.__cadpassdata.maxTexSize / 2,
        errorTolerance,
        surfaceAreaThreshold,
        trimTexelSize,
        sceneBodyItemsData,
        bodyLibraryBufferToc,
        bodyLibraryBuffer,
        highlightedBodies,
      };
      this.__postMessageToWorker(assemblyData, transferables);
    }

    updateBodyTexture(renderstate) {
      const gl = this.__gl;

      const texId = this.__gl.TEXTURE0 + renderstate.boundTextures + 1;
      gl.activeTexture(texId);
      gl.bindTexture(gl.TEXTURE_2D, this.__cadBodiesTexture.glTex);
      const size = this.__cadBodiesTexture.width;
      for (let i = 0; i < this.__dirtyBodyIndices.length; i++) {
        const bodyId = this.__dirtyBodyIndices[i];
        const yoffset = Math.floor((bodyId * pixelsPerCADBody) / size);
        const xoffset = (bodyId * pixelsPerCADBody) % size;

        const glCADBody = this.__cadBodies[bodyId];
        glCADBody.updateCadBodyTex();

        const width = pixelsPerCADBody;
        const height = 1;

        const cadBodyTextureDataByteOffset = bodyId * pixelsPerCADBody * 4 /*channels/pixel*/ * 4; /*bytes/channel*/
        const cadBodyTextureData = new Float32Array(
          this.cadBodiesTextureData.buffer,
          cadBodyTextureDataByteOffset,
          pixelsPerCADBody * 4 /*channels/pixel*/
        );
        this.__cadBodiesTexture.populate(cadBodyTextureData, width, height, xoffset, yoffset, false);
      }
      gl.bindTexture(gl.TEXTURE_2D, null);

      this.__dirtyBodyIndices = [];
    }

    /**
     * The __postMessageToWorker method.
     * @param {any} data - The data param.
     * @param {any} transferables - The transferables param.
     * @private
     */
    __postMessageToWorker(data, transferables) {
      // if(this.__cadpassdata.debugMode) {
      //   setTimeout(()=>{
      //     GLCADAssetWorker_onmessage(data, this.__onWorkerMessage.bind(this));
      //   },100);
      // }
      // else
      {
        if (!this.__worker) this.__worker = new WorkerFactory();
        this.__worker.onmessage = (event) => {
          this.__onWorkerMessage(event.data); // loading done...
        };
        this.__worker.postMessage(data, this.__cadpassdata.debugMode ? [] : transferables);
      }
    }

    /**
     * The __onWorkerMessage method.
     * @param {any} data - The data param.
     * @private
     */
    __onWorkerMessage(data) {
      switch (data.eventType) {
        case 'loadAssetDone':
          console.log('Layout Asset:', this.getCADAsset().getName(), data.profiling);

          // ///////////////////////////////
          // Curves, Surfaces and Trim Sets

          // this.__gl.finish();

          if (data.curvesAtlasLayout) {
            this.__curveLibrary.evaluateCurves(
              data.curvesAtlasLayout,
              data.numCurves,
              data.curvesAtlasLayoutTextureSize,
              data.curvesAtlasTextureDim
            );
          }

          // Note: rollup is generating radom problems in production builds
          // values are getting assigned classes. The profiling values here
          // become assigned class definitions, which then cause crashes or
          // garbage logging
          // Here, if we bundle the values into an object, then its ok.
          // This is probably due to the use to WebWorkers this this file.
          // We should try updating rollup and see if these hacks can be
          // removed.
          const values = {};

          if (data.surfacesEvalAttrs) {
            values.surfaceEvalTime = this.__surfaceLibrary.evaluateSurfaces(
              data.surfacesEvalAttrs,
              data.surfacesAtlasLayout,
              data.surfacesAtlasLayoutTextureSize,
              data.surfacesAtlasTextureDim
            );
          }

          if (data.trimCurveDrawSets && data.trimSetAtlasTextureSize[0] > 0 && data.trimSetAtlasTextureSize[1] > 0) {
            this.__trimSetLibrary.evaluateTrimSets(
              data.trimCurveDrawSets,
              data.trimSetAtlasTextureSize,
              data.trimSetsAtlasLayoutData,
              data.trimSetsAtlasLayoutTextureSize
            );
          }

          // ///////////////////////////////
          // Draw Items

          this.__bodyAtlasDim = data.bodyAtlasDim;
          // this.updateDrawItems(data.evalDrawItemShaderAttribs)
          this.updateDrawSets(values, data.surfaceDrawSets, data.curveDrawSets);
          this.__ready = true;

          this.emit('loaded', {
            numSurfaces: data.profiling.numSurfaces,
            numSurfaceInstances: data.profiling.numSurfaceInstances,
            surfaceEvalTime: values.surfaceEvalTime,
            numBodies: data.profiling.numBodies,
            numMaterials: this.__numMaterials,
            numTriangles: values.numTriangles,
            numDrawSets: values.numDrawSets,
          });
          this.emit('updated');
          break
        case 'highlightedSurfaceDrawSetsChanged':
          for (const drawSetKey in data.highlightedSurfaceDrawSets) {
            const drawSet = this.__surfaceDrawSets[drawSetKey];
            if (!drawSet) {
              console.warn('Selecting invalid items:', drawSetKey);
              continue
            }
            drawSet.setDrawItems(data.highlightedSurfaceDrawSets[drawSetKey], 1);
          }
          this.incHighlightedCount(data.numHighlighted);
          this.decHighlightedCount(data.numUnhighlighted);
          this.emit('updated');
          break
      }

      // if (data.lodChanges.length != 0){
      //     const eachLODChange = (change)=>{
      //         const glsurfacedrawItem = this.__glbodyItems[change.bodyIndex].glsurfacedrawItems[change.surfaceIndex];
      //         glsurfacedrawItem.setLod(change.lod - 1);
      //     }
      //     // console.log("lodChanges:" + data.lodChanges.length)
      //     data.lodChanges.forEach(eachLODChange);
      // }
      // if (data.becomingInvisible.length != 0 || data.becomingVisible.length != 0){
      //     const eachBecomingInvisibleChange = (change)=>{
      //         // console.log("BecomingInvisible:" + change.bodyIndex + ":" + change.surfaceIndex);
      //         const glsurfacedrawItem = this.__glbodyItems[change.bodyIndex].glsurfacedrawItems[change.surfaceIndex];
      //         glsurfacedrawItem.setInvisible();
      //     }
      //     // console.log("becomingInvisible:" + data.becomingInvisible.length)
      //     data.becomingInvisible.forEach(eachBecomingInvisibleChange);

      //     const eachBecomingVisibleChange = (change)=>{
      //         // console.log("BecomingVisible:" + change.bodyIndex + ":" + change.surfaceIndex);
      //         const glsurfacedrawItem = this.__glbodyItems[change.bodyIndex].glsurfacedrawItems[change.surfaceIndex];
      //         glsurfacedrawItem.setVisible();
      //     }
      //     // console.log("becomingVisible:" + data.becomingVisible.length)
      //     data.becomingVisible.forEach(eachBecomingVisibleChange);
      // }
    }

    /**
     * The updateDrawItems method.
     * @param {any} evalDrawItemShaderAttribs - The evalDrawItemShaderAttribs param.
     */
    updateDrawSets(values, surfaceDrawSets, curveDrawSets) {
      values.numTriangles = 0;
      values.numDrawSets = 0;

      if (surfaceDrawSets) {
        // eslint-disable-next-line guard-for-in
        for (const drawSetKey in surfaceDrawSets) {
          let drawSet = this.__surfaceDrawSets[drawSetKey];
          // Note: on initialization, there are no draw sets, so
          // we always construct the draw set here.
          if (!drawSet) {
            const parts = drawSetKey.split('x');
            const detailX = parseInt(parts[0]);
            const detailY = parseInt(parts[1]);
            drawSet = new GLSurfaceDrawSet(this.__gl, detailX, detailY);
            this.__surfaceDrawSets[drawSetKey] = drawSet;
          }

          const drawSetData = surfaceDrawSets[drawSetKey];
          // eslint-disable-next-line guard-for-in
          for (const subSetKey in drawSetData) {
            const drawItemsData = drawSetData[subSetKey];
            values.numTriangles += drawSet.addDrawItems(drawItemsData, subSetKey);
          }

          values.numDrawSets++;
        }
      }
      if (curveDrawSets) {
        // eslint-disable-next-line guard-for-in
        for (const drawSetKey in curveDrawSets) {
          let drawSet = this.__curveDrawSets[drawSetKey];
          // Note: on initialization, there are no draw sets, so
          // we always construct the draw set here.
          if (!drawSet) {
            const detail = parseInt(drawSetKey);
            drawSet = new GLCurveDrawSet(this.__gl, detail);
            this.__curveDrawSets[drawSetKey] = drawSet;
          }

          const drawSetData = curveDrawSets[drawSetKey];
          // eslint-disable-next-line guard-for-in
          for (const subSetKey in drawSetData) {
            const drawItemsData = drawSetData[subSetKey];
            drawSet.addDrawItems(drawItemsData, subSetKey);
          }

          values.numDrawSets++;
        }
      }
    }

    /**
     * The bindDrawItemsAtlas method.
     * @param {any} renderstate - The renderstate param.
     */

    bindDrawItemsAtlas(renderstate) {
      this.__drawItemsTarget.bindColorTexture(renderstate, renderstate.unifs.drawItemsTexture);
      // this.__drawItemsTexture.bindToUniform(renderstate, renderstate.unifs.drawItemsTexture);
      if (renderstate.unifs.vert_drawItemsTextureSize) {
        this.__gl.uniform2i(
          renderstate.unifs.vert_drawItemsTextureSize.location,
          this.__bodyAtlasDim[0],
          this.__bodyAtlasDim[1]
        );
      }
      if (renderstate.unifs.frag_drawItemsTextureSize) {
        this.__gl.uniform2i(
          renderstate.unifs.frag_drawItemsTextureSize.location,
          this.__bodyAtlasDim[0],
          this.__bodyAtlasDim[1]
        );
      }
    }

    bind(renderstate) {
      const gl = this.__gl;
      const unifs = renderstate.unifs;

      // console.log("bind:", Object.keys(unifs))

      // this.bindDrawItemsAtlas(renderstate)
      // if (unifs.drawItemsTexture) {
      //   this.__drawItemsTarget.bindColorTexture(
      //     renderstate,
      //     unifs.drawItemsTexture
      //   )
      // }

      if (unifs.vert_drawItemsTextureSize) {
        this.__gl.uniform2i(unifs.vert_drawItemsTextureSize.location, this.__bodyAtlasDim[0], this.__bodyAtlasDim[1]);
      }
      if (unifs.frag_drawItemsTextureSize) {
        this.__gl.uniform2i(unifs.frag_drawItemsTextureSize.location, this.__bodyAtlasDim[0], this.__bodyAtlasDim[1]);
      }

      if (unifs.bodyDescTexture) {
        this.__bodyDescTexture.bindToUniform(renderstate, unifs.bodyDescTexture);
        gl.uniform2i(unifs.bodyDescTextureSize.location, this.__bodyDescTexture.width, this.__bodyDescTexture.height);
        if (unifs.bodyDescTextureSize_frag) {
          gl.uniform2i(
            unifs.bodyDescTextureSize_frag.location,
            this.__bodyDescTexture.width,
            this.__bodyDescTexture.height
          );
        }
      }

      if (unifs.cadBodiesTexture) {
        this.__cadBodiesTexture.bindToUniform(renderstate, unifs.cadBodiesTexture);
        if (unifs.cadBodiesTextureSize_vert)
          gl.uniform1i(unifs.cadBodiesTextureSize_vert.location, this.__cadBodiesTexture.width);
        if (unifs.cadBodiesTextureSize_frag)
          gl.uniform1i(unifs.cadBodiesTextureSize_frag.location, this.__cadBodiesTexture.width);
      }

      // if (unifs.cutNormal) {
      //   gl.uniform3fv(unifs.cutNormal.location, this.__cutNormal.asArray())
      //   gl.uniform1f(unifs.planeDist.location, this.__cutDist)
      //   if (unifs.cutColor) {
      //     gl.uniform4fv(unifs.cutColor.location, this.__cutColor.asArray())
      //   }
      // }

      if (unifs.assetCentroid) {
        gl.uniform3fv(unifs.assetCentroid.location, this.__assetCentroid.asArray());
      }
    }

    /**
     * The draw method.
     * @param {any} renderstate - The renderstate param.
     * @return {any} - The return value.
     */
    draw(renderstate) {
      if (!this.__visible || !this.__ready) return false

      const boundTextures = renderstate.boundTextures;

      if (this.__dirtyBodyIndices.length > 0) {
        this.updateBodyTexture(renderstate);
      }

      this.bind(renderstate);

      if (!this.__surfaceLibrary.bindSurfacesAtlas(renderstate)) {
        renderstate.boundTextures = boundTextures;
        return
      }

      if (this.__trimSetLibrary) {
        this.__trimSetLibrary.bindTrimSetAtlasLayout(renderstate);
        this.__trimSetLibrary.bindTrimSetAtlas(renderstate);
      }

      for (const key in this.__surfaceDrawSets) {
        // console.log("draw:" + key)
        const drawSet = this.__surfaceDrawSets[key];
        drawSet.draw(renderstate, renderstate.shaderId);
      }

      renderstate.boundTextures = boundTextures;
    }

    /**
     * The drawHighlightedGeoms method.
     * @param {any} renderstate - The renderstate param.
     * @return {any} - The return value.
     */
    drawHighlightedGeoms(renderstate) {
      if (!this.__visible || this.__numHighlightedGeoms == 0) return false

      const boundTextures = renderstate.boundTextures;

      this.bind(renderstate);

      this.__surfaceLibrary.bindSurfacesAtlas(renderstate);
      if (this.__trimSetLibrary) {
        this.__trimSetLibrary.bindTrimSetAtlasLayout(renderstate);
        this.__trimSetLibrary.bindTrimSetAtlas(renderstate);
      }

      // Now draw the highlight outline.
      const highlightOutlineID = 1;
      for (const key in this.__surfaceDrawSets) {
        // console.log("draw:" + key)
        const drawSet = this.__surfaceDrawSets[key];
        drawSet.draw(renderstate, highlightOutlineID);
      }

      renderstate.boundTextures = boundTextures;
    }

    /**
     * The drawNormals method.
     * @param {any} renderstate - The renderstate param.
     * @param {any} shaderKey - The shaderKey param.
     * @return {any} - The return value.
     */
    drawNormals(renderstate, shaderKey) {
      if (!this.__visible || !this.__ready) return false

      const boundTextures = renderstate.boundTextures;
      this.bind(renderstate);

      this.__surfaceLibrary.bindSurfacesAtlas(renderstate);
      if (this.__trimSetLibrary) {
        this.__trimSetLibrary.bindTrimSetAtlasLayout(renderstate);
        this.__trimSetLibrary.bindTrimSetAtlas(renderstate);
      }

      for (const key in this.__surfaceDrawSets) {
        const drawSet = this.__surfaceDrawSets[key];
        drawSet.drawNormals(renderstate, shaderKey);
      }

      renderstate.boundTextures = boundTextures;
    }

    /**
     * The drawEdges method.
     * @param {any} renderstate - The renderstate param.
     * @param {any} shaderKey - The shaderKey param.
     * @return {any} - The return value.
     */
    drawEdges(renderstate, shaderKey) {
      if (!this.__visible || !this.__ready || !this.displayEdges) return false

      const boundTextures = renderstate.boundTextures;
      if (this.__dirtyBodyIndices.length > 0) {
        this.updateBodyTexture(renderstate);
      }

      this.bind(renderstate);
      this.__curveLibrary.bindCurvesAtlas(renderstate);

      const gl = this.__gl;
      gl.uniform4fv(renderstate.unifs.edgeColor.location, this.edgeColor);

      for (const key in this.__curveDrawSets) {
        const drawSet = this.__curveDrawSets[key];
        drawSet.draw(renderstate, shaderKey);
      }

      renderstate.boundTextures = boundTextures;
    }

    /**
     * The drawGeomData method.
     * @param {any} renderstate - The renderstate param.
     * @return {any} - The return value.
     */
    drawGeomData(renderstate) {
      if (!this.__visible || !this.__ready) return false

      const boundTextures = renderstate.boundTextures;

      this.bind(renderstate);

      this.__surfaceLibrary.bindSurfacesAtlas(renderstate);
      if (this.__trimSetLibrary) {
        this.__trimSetLibrary.bindTrimSetAtlasLayout(renderstate);
        this.__trimSetLibrary.bindTrimSetAtlas(renderstate);
      }

      const gl = this.__gl;
      const assetIndexUnif = renderstate.unifs.assetIndex;
      if (assetIndexUnif) {
        gl.uniform1i(assetIndexUnif.location, this.__assetId);
      }

      for (const key in this.__surfaceDrawSets) {
        // console.log("draw:" + key)
        const drawSet = this.__surfaceDrawSets[key];
        drawSet.draw(renderstate, renderstate.shaderId);
      }

      renderstate.boundTextures = boundTextures;
    }

    /**
     * The getGeomItem method.
     * @param {any} bodyId - The bodyId param.
     * @return {any} - The return value.
     */
    getGeomItem(bodyId) {
      return this.__cadBodies[bodyId].cadBody
    }

    /**
     * The getSurfaceData method.
     * @param {any} surfaceId - The surfaceId param.
     * @return {any} - The return value.
     */
    getSurfaceData(surfaceId) {
      return this.__cadAsset.getSurfaceLibrary().getSurfaceData(surfaceId)
    }

    /**
     * The getSurfaceData method.
     * @param {any} renderstate - The renderstate param.
     */
    drawSurfaceAtlas(renderstate) {
      if (this.__surfaceLibrary) this.__surfaceLibrary.drawSurfaceAtlas(renderstate);
    }

    /**
     * The drawTrimSets method.
     * @param {any} renderstate - The renderstate param.
     */
    drawTrimSets(renderstate) {
      if (this.__trimSetLibrary) this.__trimSetLibrary.drawTrimSets(renderstate);
    }

    /**
     * The destroy method.
     */
    destroy() {
      this.__cadAsset.off('visibilityChanged', this.__assetVisibilityChanged);

      this.__cadBodiesTexture.destroy();

      this.__cadBodies.forEach((glCADBody) => glCADBody.destroy());
      this.__cadBodies = [];
      this.__curveLibrary.destroy();
      this.__surfaceLibrary.destroy();

      if (this.__trimSetLibrary) {
        this.__trimSetLibrary.destroy();
      }

      for (const drawSetKey in this.__surfaceDrawSets) {
        let drawSet = this.__surfaceDrawSets[drawSetKey];
        drawSet.destroy();
      }
    }
  }

  /** Class representing a GL CAD material library.
   * @ignore
   */
  class GLCADMaterialLibrary extends zeaEngine.EventEmitter {
    /**
     * Create a GL CAD material library.
     * @param {any} gl - The gl value.
     */
    constructor(gl) {
      super();
      this.__gl = gl;
      this.__materialDatas = [];
      this.__dirtyIndices = [];
      this.__numItems = 0;
      this.__materialPacker = new zeaEngine.GrowingPacker(256, 256);

      this.__needsUpload = false;
    }

    /**
     * The addMaterial method.
     * @param {any} material - The material param.
     * @return {any} - The return value.
     */
    addMaterial(material) {
      if (material.getMetadata('glmaterialcoords')) {
        return
      }

      this.__numItems++;

      const coords = this.__materialPacker.addBlock({ w: 2, h: 1 });
      const materialId = this.__materialDatas.length;
      this.__materialDatas.push({
        material,
        coords,
      });

      material.on('parameterValueChanged', () => {
        // this.__renderer.requestRedraw();
        this.__dirtyIndices.push(materialId);
        this.emit('updated');
      });

      material.setMetadata('glmaterialcoords', coords);

      this.__dirtyIndices.push(materialId);

      return coords
    }

    /**
     * The needsUpload method.
     * @return {any} - The return value.
     */
    needsUpload() {
      return this.__dirtyIndices.length > 0
    }

    /**
     * The uploadMaterials method.
     */
    uploadMaterials() {
      const gl = this.__gl;
      const width = this.__materialPacker.root.w;
      const height = this.__materialPacker.root.h;
      // console.log('Num Used Materials:' + this.__numItems, width, height)
      if (!this.__materialsTexture) {
        this.__materialsTexture = new zeaEngine.GLTexture2D(gl, {
          format: 'RGBA',
          type: 'FLOAT',
          width,
          height,
          filter: 'NEAREST',
          wrap: 'CLAMP_TO_EDGE',
          mipMapped: false,
        });
        this.__materialsTexture.clear();
      } else if (this.__materialsTexture.width != width || this.__materialsTexture.height != height) {
        throw new Error('Cannot resize here. Need a resize the preserves the data.')
      }

      gl.bindTexture(gl.TEXTURE_2D, this.__materialsTexture.glTex);
      const typeId = this.__materialsTexture.getTypeID();
      const formatId = this.__materialsTexture.getFormatID();

      const eachMaterial = (value) => {
        const materialData = this.__materialDatas[value];
        const material = materialData.material;

        let shaderClass = zeaEngine.Registry.getBlueprint(material.getShaderName());
        if (!shaderClass || !shaderClass.getPackedMaterialData) {
          shaderClass = zeaEngine.Registry.getBlueprint('GLDrawCADSurfaceShader');
        }

        const matData = shaderClass.getPackedMaterialData(material);

        const width = matData.length / 4; // 4==RGBA pixels.
        const height = 1;

        const coords = materialData.coords;
        if (typeId == gl.FLOAT) {
          gl.texSubImage2D(gl.TEXTURE_2D, 0, coords.x, coords.y, width, height, formatId, typeId, matData);
        } else {
          const unit16s = Math.convertFloat32ArrayToUInt16Array(matData);
          gl.texSubImage2D(gl.TEXTURE_2D, 0, coords.x, coords.y, width, height, formatId, typeId, unit16s);
        }
      };
      this.__dirtyIndices.forEach(eachMaterial);
      this.__dirtyIndices = [];
      gl.bindTexture(gl.TEXTURE_2D, null);
    }

    /**
     * The bind method.
     * @param {any} renderstate - The renderstate param.
     * @return {any} - The return value.
     */
    bind(renderstate) {
      if (!this.__materialsTexture) return false

      const gl = this.__gl;
      const unifs = renderstate.unifs;
      if (unifs.materialsTexture) this.__materialsTexture.bindToUniform(renderstate, unifs.materialsTexture);
      if (unifs.materialsTextureSize)
        gl.uniform2i(unifs.materialsTextureSize.location, this.__materialsTexture.width, this.__materialsTexture.height);
      return true
    }
  }

  zeaEngine.shaderLibrary.setShaderModule(
    'GLSLCADConstants.glsl',
    `
  const int SURFACE_FLAG_PERIODIC_U = 1; // 1<<0;
  const int SURFACE_FLAG_PERIODIC_V = 2; // 1<<1;
  const int SURFACE_FLAG_UNUSED2 = 4; // 1<<2;
  const int SURFACE_FLAG_UNUSED3 = 8; // 1<<3;
  const int SURFACE_FLAG_FLIPPED_NORMAL = 16; // 1<<4
  const int SURFACE_FLAG_FLIPPED_UV = 32; // 1<<5
  const int SURFACE_FLAG_COST_IS_DETAIL_U = 64; // 1<<6;
  const int SURFACE_FLAG_COST_IS_DETAIL_V = 128; // 1<<7;

  const int BODY_FLAG_CUTAWAY = 256; // 1<<8
  const int BODY_FLAG_INVISIBLE = 512; // 1<<9

  const int CURVE_FLAG_PERIODIC = 1; // 1<<0;
  const int CURVE_FLAG_UNUSED2 = 4; // 1<<2;
  const int CURVE_FLAG_COST_IS_DETAIL = 8;//1<<3;


  const int SURFACE_TYPE_PLANE = 0;
  const int SURFACE_TYPE_CONE = 1;
  const int SURFACE_TYPE_CYLINDER = 2;
  const int SURFACE_TYPE_SPHERE = 3;
  const int SURFACE_TYPE_TORUS = 4;
  const int SURFACE_TYPE_LINEAR_EXTRUSION = 5;
  const int SURFACE_TYPE_REVOLUTION = 6;
  const int SURFACE_TYPE_BEZIER_SURFACE = 7;
  const int SURFACE_TYPE_NURBS_SURFACE = 8;
  const int SURFACE_TYPE_OFFSET_SURFACE = 9;
  const int SURFACE_TYPE_TRIMMED_RECT_SURFACE = 10;

  const int SURFACE_TYPE_POLY_PLANE = 14;
  const int SURFACE_TYPE_FAN = 15;
  const int SURFACE_TYPE_REVOLUTION_FLIPPED_DOMAIN = 16;


  const int CURVE_TYPE_LINE = 20;
  const int CURVE_TYPE_CIRCLE = 21;
  const int CURVE_TYPE_ELIPSE = 22;
  // const int CURVE_TYPE_HYPERBOLA = 23;
  // const int CURVE_TYPE_PARABOLA = 24;
  // const int CURVE_TYPE_BEZIERCURVE = 25;
  const int CURVE_TYPE_NURBS_CURVE = 26;
  // const int CURVE_TYPE_OFFSET_CURVE = 27;
  // const int CURVE_TYPE_TRIMMED_CURVE = 28;


  const int geomLibraryHeaderSize = 4; // 2 pixels at the start of the GeomLibrary and CurveLibrary

  // [bodyDescId, surfaceId, cadBodyDesc.xy], [glmaterialcoords.xy][tr-xyz], [ori], [sc], [highlight], [cutPlane]
  const int pixelsPerCADBody = 7;
`
  );

  zeaEngine.shaderLibrary.setShaderModule(
    'GLSLCADGeomDrawing.vertexShader.glsl',
    `


uniform sampler2D cadBodiesTexture;
uniform int cadBodiesTextureSize_vert;
  
vec4 getCADBodyPixel(int cadBodyId, int pixelOffset) {
  int offset = cadBodyId * pixelsPerCADBody;
  ivec2 start;
  start.y += offset / cadBodiesTextureSize_vert;
  start.x = imod(offset, cadBodiesTextureSize_vert);
  return fetchTexel(cadBodiesTexture, ivec2(cadBodiesTextureSize_vert), ivec2(start.x + pixelOffset, start.y));
}

<%include file="GLSLMath.glsl"/>
<%include file="GLSLBinReader.glsl"/>


const int pixelsPerDrawItem = 10; // The number of RGBA pixels per draw item.
const int valuesPerSurfaceTocItem = 9;
const int bytesPerValue = 4; // 32 bit floats

// Before enabling this, enable the 2nd vertex attribute (drawItemTexAddr)
// in the Draw shader and in the GLDrawSet, and in the GLCADAssetWorker
#define CALC_GLOBAL_XFO_DURING_DRAW
#ifdef CALC_GLOBAL_XFO_DURING_DRAW

mat4 getCADBodyMatrix(int cadBodyId) {
  vec3 body_tr = getCADBodyPixel(cadBodyId, 2).rgb;
  vec4 body_ori = normalize(getCADBodyPixel(cadBodyId, 3));
  vec3 body_sc = getCADBodyPixel(cadBodyId, 4).rgb;
  Xfo bodyXfo = Xfo(body_tr, body_ori, body_sc);
  return xfo_toMat4(bodyXfo);
  // return mat4(1.0);
}

uniform sampler2D bodyDescTexture;
uniform ivec2 bodyDescTextureSize;

GLSLBinReader setupBodyDescReader(ivec2 bodyDescAddr) {
  GLSLBinReader bodyDescReader;
  ivec4 region = ivec4(0, 0, bodyDescTextureSize.x, bodyDescTextureSize.y);
  ivec2 start = ivec2(bodyDescAddr.x, bodyDescAddr.y);
  GLSLBinReader_init(bodyDescReader, bodyDescTextureSize, region, start, 32);
  return bodyDescReader;
}

Xfo getDrawItemXfo(ivec2 bodyDescAddr, int drawItemIndexInBody) {
  GLSLBinReader bodyDescReader = setupBodyDescReader(bodyDescAddr);
  
  // Skip over the bbox, numSurfaces and then to the current surface data.  
  #ifdef ENABLE_BODY_EDGES
  int offsetOfItemRef = (6/*bbox*/) + (1/*numSurfaces*/) + (1/*numCurves*/) + (drawItemIndexInBody * (1/*id*/ + 10/*xfo*/));
  #else
  int offsetOfItemRef = (6/*bbox*/) + (1/*numSurfaces*/) + (drawItemIndexInBody * (1/*id*/ + 10/*xfo*/));
  #endif
  #ifdef ENABLE_PER_FACE_COLORS
  offsetOfItemRef += drawItemIndexInBody * 4/*color*/; // Skip over the color.
  #endif
  
  vec3 surface_tr = vec3(
    GLSLBinReader_readFloat(bodyDescReader, bodyDescTexture, offsetOfItemRef+1),
    GLSLBinReader_readFloat(bodyDescReader, bodyDescTexture, offsetOfItemRef+2),
    GLSLBinReader_readFloat(bodyDescReader, bodyDescTexture, offsetOfItemRef+3)
    );

  vec4 surface_ori = normalize(vec4(
    GLSLBinReader_readFloat(bodyDescReader, bodyDescTexture, offsetOfItemRef+4),
    GLSLBinReader_readFloat(bodyDescReader, bodyDescTexture, offsetOfItemRef+5),
    GLSLBinReader_readFloat(bodyDescReader, bodyDescTexture, offsetOfItemRef+6),
    GLSLBinReader_readFloat(bodyDescReader, bodyDescTexture, offsetOfItemRef+7)
    ));

  vec3 surface_sc = vec3(
    GLSLBinReader_readFloat(bodyDescReader, bodyDescTexture, offsetOfItemRef+8),
    GLSLBinReader_readFloat(bodyDescReader, bodyDescTexture, offsetOfItemRef+9),
    GLSLBinReader_readFloat(bodyDescReader, bodyDescTexture, offsetOfItemRef+10)
  );

  Xfo surfaceXfo = Xfo(surface_tr, surface_ori, surface_sc);
  return surfaceXfo;

}
mat4 getDrawItemMatrix(ivec2 bodyDescAddr, int drawItemIndexInBody) {
  return xfo_toMat4(getDrawItemXfo(bodyDescAddr, drawItemIndexInBody));
  // return mat4(1.0);
}

#else // CALC_GLOBAL_XFO_DURING_DRAW

uniform sampler2D drawItemsTexture;
uniform ivec2 vert_drawItemsTextureSize;

// The Draw Items texture is laid out with 8 pixels per draw item.
vec4 getDrawItemData(int offset) {
  return fetchTexel(drawItemsTexture, vert_drawItemsTextureSize, ivec2(ftoi(drawItemTexAddr.x) + offset, ftoi(drawItemTexAddr.y)));
}

mat4 getModelMatrix() {
  // Unpack 3 x 4 matix columns into a 4 x 4 matrix.
  vec4 col0 = getDrawItemData(0);
  vec4 col1 = getDrawItemData(1);
  vec4 col2 = getDrawItemData(2);
  mat4 result = mat4(col0, col1, col2, vec4(0.0, 0.0, 0.0, 1.0));
  return transpose(result);
}

#endif // CALC_GLOBAL_XFO_DURING_DRAW

  `
  );
  zeaEngine.shaderLibrary.setShaderModule(
    'GLSLCADSurfaceDrawing.vertexShader.glsl',
    `
  
<%include file="GLSLCADGeomDrawing.vertexShader.glsl"/>


// GEOM
uniform sampler2D surfaceAtlasLayoutTexture;
uniform ivec2 surfaceAtlasLayoutTextureSize;

uniform sampler2D surfacesAtlasTexture;
uniform ivec2 surfacesAtlasTextureSize;
uniform sampler2D normalsTexture;

vec4 getSurfaceVertex(vec2 surfacePatchCoords, vec2 vertexCoord) {
  return fetchTexel(surfacesAtlasTexture, surfacesAtlasTextureSize, ivec2(ftoi(surfacePatchCoords.x + vertexCoord.x), ftoi(surfacePatchCoords.y + vertexCoord.y)));
}

vec3 getSurfaceNormal(vec2 surfacePatchCoords, vec2 vertexCoord) {
  return fetchTexel(normalsTexture, surfacesAtlasTextureSize, ivec2(ftoi(surfacePatchCoords.x + vertexCoord.x), ftoi(surfacePatchCoords.y + vertexCoord.y))).rgb;
}

`
  );

  zeaEngine.shaderLibrary.setShaderModule(
    'GLSLCADGeomDrawing.fragmentShader.glsl',
    `
  uniform sampler2D cadBodiesTexture;
  uniform int cadBodiesTextureSize_frag;
  
  vec4 getCADBodyPixel(int cadBodyId, int pixelOffset) {
    
    int offset = cadBodyId * pixelsPerCADBody;
    ivec2 start;
    start.y += offset / cadBodiesTextureSize_frag;
    start.x = imod(offset, cadBodiesTextureSize_frag);
  
    return fetchTexel(cadBodiesTexture, ivec2(cadBodiesTextureSize_frag), ivec2(start.x + pixelOffset, start.y));
  }
  
  // Is this still used?
  uniform sampler2D drawItemsTexture;
  uniform ivec2 frag_drawItemsTextureSize;
  // The Draw Items texture is laid out with 8 pixels per draw item.
  vec4 getDrawItemData(int offset) {
    return fetchTexel(drawItemsTexture, frag_drawItemsTextureSize, ivec2(ftoi(v_drawCoords.x) + offset, ftoi(v_drawCoords.y)));
  }
  
  

//////////////////////////////////////////////
// Cutaways

<%include file="cutaways.glsl"/>

// bool applyCutaway(int cadBodyId, int flags) {
//   if (testFlag(flags, BODY_FLAG_CUTAWAY)) {
//     vec4 cadBodyPixel6 = getCADBodyPixel(cadBodyId, 6);
//     vec3 cutNormal = cadBodyPixel6.xyz;
//     float cutPlaneDist = cadBodyPixel6.w;
//     if (cutaway(v_worldPos, cutNormal, cutPlaneDist)) {
//         discard;
//     }
//     return true;
//   }
//   return false;
// }

// int applyCutaway(int flags, bool backFacing, vec3 cutColor, inout vec4 fragColor) {
//   bool cut = testFlag(flags, BODY_FLAG_CUTAWAY);
//   if(cut){
//     if(cutaway(v_worldPos, cutNormal, planeDist)) {
//       return 1;
//     }
//     if(backFacing){
//       fragColor = vec4(cutColor, 1.0);
//       return 2;
//     }
//   }
//   return 0;
// }
  `
  );
  zeaEngine.shaderLibrary.setShaderModule(
    'GLSLCADSurfaceDrawing.fragmentShader.glsl',
    `
  
<%include file="GLSLCADGeomDrawing.fragmentShader.glsl"/>


uniform sampler2D materialsTexture;
uniform ivec2 materialsTextureSize;

vec4 getMaterialValue(vec2 materialCoords, int valueIndex) {
  return fetchTexel(materialsTexture, materialsTextureSize, ivec2(ftoi(materialCoords.x) + valueIndex, ftoi(materialCoords.y)));
}


//////////////////////////////////////////////
// Surface Colors

uniform sampler2D bodyDescTexture;
uniform ivec2 bodyDescTextureSize_frag;

GLSLBinReader setupBodyDescReader(ivec2 bodyDescAddr) {
  GLSLBinReader bodyDescReader;
  ivec4 region = ivec4(0, 0, bodyDescTextureSize_frag.x, bodyDescTextureSize_frag.y);
  ivec2 start = ivec2(bodyDescAddr.x, bodyDescAddr.y);
  GLSLBinReader_init(bodyDescReader, bodyDescTextureSize_frag, region, start, 32);
  return bodyDescReader;
}

vec4 getDrawItemColor(ivec2 bodyDescAddr, int drawItemIndexInBody) {
  GLSLBinReader bodyDescReader = setupBodyDescReader(bodyDescAddr);
  
  #ifdef ENABLE_BODY_EDGES
  int offsetOfItemRef = (6/*bbox*/) + (1/*numSurfaces*/) + (1/*numCurves*/) + (drawItemIndexInBody * (1/*id*/ + 10/*xfo*/ + 4/*color*/));
  #else
  int offsetOfItemRef = (6/*bbox*/) + (1/*numSurfaces*/) + (drawItemIndexInBody * (1/*id*/ + 10/*xfo*/ + 4/*color*/));
  #endif

  vec4 color = vec4(
    GLSLBinReader_readFloat(bodyDescReader, bodyDescTexture, offsetOfItemRef+11),
    GLSLBinReader_readFloat(bodyDescReader, bodyDescTexture, offsetOfItemRef+12),
    GLSLBinReader_readFloat(bodyDescReader, bodyDescTexture, offsetOfItemRef+13),
    GLSLBinReader_readFloat(bodyDescReader, bodyDescTexture, offsetOfItemRef+14)
  );

  return color;
}

//////////////////////////////////////////////
// Trimming
uniform sampler2D trimSetsAtlasLayoutTexture;
uniform ivec2 trimSetsAtlasLayoutTextureSize;

uniform sampler2D trimSetAtlasTexture;
uniform ivec2 trimSetAtlasTextureSize;

bool applyTrim(vec4 trimPatchQuad, inout vec3 trimCoords, int flags) {
  if(trimPatchQuad.z > 0.0 && trimPatchQuad.w > 0.0){
    // Remove cobwebs along borders.
    // Tis appears to eliminate cobwebs along borders of trim sets. 
    // It does indicate that a math eror exists somewhere else
    // that we would get cobwebs here.
    // To repro, load Dead Eye Bearing and zoom out.
    if (v_textureCoord.x < 0.0 || v_textureCoord.x >= 1.0 || v_textureCoord.y < 0.0 || v_textureCoord.y >= 1.0)
      return true;

    trimCoords.xy = trimPatchQuad.xy + (trimPatchQuad.zw * v_textureCoord);

    vec2 trimUv = (trimCoords.xy) / vec2(trimSetAtlasTextureSize);
    vec4 trimTexel = texture2D(trimSetAtlasTexture, trimUv);

    trimCoords.z = max(trimTexel.r, trimTexel.g);
    
    if (trimTexel.r < 0.5 || trimTexel.g < 0.5) {
      return true;
    }
    return false;
  }
  else {
    // This is a non-trimmed surface, so return false.
    trimCoords = vec3(-1.0);
    return false;
  }
}


`
  );

  /** Class representing a GL CAD shader.
   * @extends GLShader
   * @ignore
   */
  class GLCADShader extends zeaEngine.GLShader {
    /**
     * Create a GL CAD shader.
     * @param {any} gl - The gl value.
     */
    constructor(gl) {
      super(gl);
      this.stack = [{}];
    }

    /**
     * The setPreprocessorValue method.
     * @param {any} name - The name param.
     */
    setPreprocessorValue(name) {
      this.getState()[name] = name;
    }

    /**
     * The clearPreprocessorValue method.
     * @param {any} name - The name param.
     */
    clearPreprocessorValue(name) {
      delete this.getState()[name];
    }

    /**
     * The getState method.
     * @return {any} - The return value.
     */
    getState() {
      return this.stack[this.stack.length - 1]
    }

    /**
     * The pushState method.
     */
    pushState() {
      this.stack.push(Object.assign({}, this.getState()));
    }

    /**
     * The popState method.
     */
    popState() {
      this.stack.pop();
      this.applyOptions();
    }

    /**
     * The applyOptions method.
     */
    applyOptions() {
      const directives = [...this.__gl.shaderopts.directives];
      const state = this.getState();
      for (const key in state) {
        directives.push(state[key]);
      }
      const defines = directives.join('\n') + '\n';
      this.__key = defines;
      this.compileForTarget(this.__key, {
        directives,
      });
    }

    /**
     * The bind method.
     * @param {any} renderstate - The renderstate param.
     * @return {any} - The return value.
     */
    bind(renderstate) {
      return super.bind(renderstate, this.__key)
    }
  }

  const GLDrawCADSurfaceNormalsShader_VERTEX_SHADER = `
precision highp float;

attribute vec3 positions;
instancedattribute vec4 drawCoords;  // (DrawItemData Coords (x, y) 
// instancedattribute vec2 drawItemTexAddr;  // Address of the data in the draw item texture. (mat4)

uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform ivec2 quadDetail;
uniform vec3 assetCentroid;
uniform float normalLength;

<%include file="GLSLUtils.glsl"/>
<%include file="GLSLCADConstants.glsl"/>
<%include file="stack-gl/transpose.glsl"/>
<%include file="stack-gl/inverse.glsl"/>

<%include file="GLSLCADSurfaceDrawing.vertexShader.glsl"/>

varying vec4 v_drawCoords;
varying vec3 v_viewPos;
varying vec3 v_worldPos;
varying vec3 v_viewNormal;
varying vec2 v_textureCoord;

void main(void) {
    int cadBodyId = ftoi(drawCoords.r);
    int drawItemIndexInBody = ftoi(drawCoords.g);
    int surfaceId = ftoi(drawCoords.b);
    int trimSetId = ftoi(drawCoords.a);

    vec2 texCoords = positions.xy + 0.5;
    
    v_drawCoords = drawCoords;

    vec4 cadBodyPixel0 = getCADBodyPixel(cadBodyId, 0);
    vec4 cadBodyPixel1 = getCADBodyPixel(cadBodyId, 1);

    // int bodyDescId = ftoi(cadBodyPixel0.r);
    int cadBodyFlags = ftoi(cadBodyPixel0.g);
    
    //////////////////////////////////////////////
    // Visibility
    if(testFlag(cadBodyFlags, BODY_FLAG_INVISIBLE)) {
        gl_Position = vec4(-3.0, -3.0, -3.0, 1.0);;
        return;
    }

    //////////////////////////////////////////////
    // Transforms
#ifdef DEBUG_SURFACES
    mat4 modelMatrix = mat4(1.0);
    // if(v_surfaceType == SURFACE_TYPE_NURBS_SURFACE) {
    //     // int drawItemIndexInBody = int(metadata.b+0.5);
    //     int sideLen = int(ceil(sqrt(float(numSurfacesInLibrary))));
    //     int x = drawItemIndexInBody % sideLen;
    //     int y = drawItemIndexInBody / sideLen;
    //     modelMatrix = mat4(1.0, 0.0, 0.0, 0.0, 
    //                     0.0, 1.0, 0.0, 0.0, 
    //                     0.0, 0.0, 1.0, 0.0,  
    //                     float(x), float(y), 0.0, 1.0);
    // }
#else

#ifdef CALC_GLOBAL_XFO_DURING_DRAW
    mat4 bodyMat = getCADBodyMatrix(cadBodyId);
    ivec2 bodyDescAddr = ftoi(cadBodyPixel0.ba);
    mat4 surfaceMat = getDrawItemMatrix(bodyDescAddr, drawItemIndexInBody);
    mat4 modelMatrix = bodyMat * surfaceMat;
#else
    mat4 modelMatrix = getModelMatrix();
    // Note: on mobile GPUs, we get only FP16 math in the
    // fragment shader, causing inaccuracies in modelMatrix
    // calculation. By offsetting the data to the origin
    // we calculate a modelMatrix in the asset space, and
    //  then add it back on during final drawing.
    // modelMatrix[3][0] += assetCentroid.x;
    // modelMatrix[3][1] += assetCentroid.y;
    // modelMatrix[3][2] += assetCentroid.z;
#endif
#endif
    // modelMatrix = mat4(1.0);
    mat4 modelViewMatrix = viewMatrix * modelMatrix;
    mat4 viewProjectionMatrix = projectionMatrix * viewMatrix;

    //////////////////////////////////////////////
    // Vertex Attributes
    
    GLSLBinReader surfaceLayoutDataReader;
    GLSLBinReader_init(surfaceLayoutDataReader, surfaceAtlasLayoutTextureSize, 16);
    vec4 surfaceDataAddr = GLSLBinReader_readVec4(surfaceLayoutDataReader, surfaceAtlasLayoutTexture, surfaceId * 8);
    int surfaceFlags = GLSLBinReader_readInt(surfaceLayoutDataReader, surfaceAtlasLayoutTexture, surfaceId * 8 + 6);

    bool isFan = int(quadDetail.y) == 0;
    vec2 vertexCoords = texCoords * (isFan ? vec2(quadDetail) + vec2(1.0, 1.0) : vec2(quadDetail));

    vec3 normal = getSurfaceNormal(surfaceDataAddr.xy, vertexCoords);
    vec4 pos = vec4(getSurfaceVertex(surfaceDataAddr.xy, vertexCoords).rgb, 1.0);

    bool flippedNormal = testFlag(surfaceFlags, SURFACE_FLAG_FLIPPED_NORMAL);
    if(flippedNormal){
        normal = -normal;
    }
  
    vec4 worldPos = modelMatrix * pos;
    vec3 worldNormal = normalize(mat3(modelMatrix) * normal);

    // if (positions.z > 0.5)
    //   worldPos = vec4(vec3(0.0), 1.0);
    worldPos += vec4(worldNormal * positions.z * normalLength, 0.0);
    
    gl_Position = viewProjectionMatrix * worldPos;

    
    v_textureCoord = texCoords;
    if(testFlag(surfaceFlags, SURFACE_FLAG_FLIPPED_UV))
        v_textureCoord = vec2(v_textureCoord.y, v_textureCoord.x);

    // v_textureCoord.y = 1.0 - v_textureCoord.y; // Flip y
}`;

  const FRAGMENT_SHADER = `
precision highp float;

<%include file="GLSLCADConstants.glsl"/>
<%include file="GLSLUtils.glsl"/>
<%include file="stack-gl/gamma.glsl"/>
<%include file="materialparams.glsl"/>
<%include file="GLSLBinReader.glsl"/>

uniform color BaseColor;

uniform mat4 cameraMatrix;

varying vec4 v_drawCoords;
varying vec3 v_viewPos;
varying vec3 v_worldPos;
varying vec3 v_viewNormal;
varying vec2 v_textureCoord;

<%include file="GLSLCADSurfaceDrawing.fragmentShader.glsl"/>

#ifdef ENABLE_ES3
out vec4 fragColor;
#endif

void main(void) {

#ifndef ENABLE_ES3
    vec4 fragColor;
#endif

    int cadBodyId = int(floor(v_drawCoords.r + 0.5));
    int drawItemIndexInBody = int(floor(v_drawCoords.g + 0.5));
    int surfaceId = int(floor(v_drawCoords.b + 0.5));
    int trimSetId = int(floor(v_drawCoords.a + 0.5));

    // TODO: pass as varying from pixel shader.
    vec4 cadBodyPixel0 = getCADBodyPixel(cadBodyId, 0);
    int flags = int(floor(cadBodyPixel0.g + 0.5));
            

    //////////////////////////////////////////////
    // Cutaways
    if (testFlag(flags, BODY_FLAG_CUTAWAY)) {
        vec4 cadBodyPixel6 = getCADBodyPixel(cadBodyId, 6);
        vec3 cutNormal = cadBodyPixel6.xyz;
        float cutPlaneDist = cadBodyPixel6.w;
        if (cutaway(v_worldPos, cutNormal, cutPlaneDist)) {
            discard;
        }
    }

    //////////////////////////////////////////////
    // Trimming
    vec4 trimPatchQuad;
    vec3 trimCoords;
    if(trimSetId >= 0) {
        GLSLBinReader trimsetLayoutDataReader;
        GLSLBinReader_init(trimsetLayoutDataReader, trimSetsAtlasLayoutTextureSize, 16);
        trimPatchQuad = GLSLBinReader_readVec4(trimsetLayoutDataReader, trimSetsAtlasLayoutTexture, trimSetId*4);

        if(applyTrim(trimPatchQuad, trimCoords, flags)){
            discard;
            return;
        }
    }

    vec4 baseColor      = vec4(1.0,0.0,0.0,1.0);

//#ifdef ENABLE_INLINE_GAMMACORRECTION
    fragColor.rgb = toGamma(baseColor.rgb);
//#endif

}
`;

  /** Class representing a GL draw CAD surface normals shader.
   * @extends GLCADShader
   * @ignore
   */
  class GLDrawCADSurfaceNormalsShader extends GLCADShader {
    /**
     * Create a GL draw CAD surface normals shader.
     * @param {any} gl - The gl value.
     */
    constructor(gl) {
      super(gl);

      this.setShaderStage('VERTEX_SHADER', GLDrawCADSurfaceNormalsShader_VERTEX_SHADER);
      this.setShaderStage('FRAGMENT_SHADER', FRAGMENT_SHADER);
      this.nonSelectable = true;
    }

    /**
     * The getParamDeclarations method.
     * @return {any} - The return value.
     */
    static getParamDeclarations() {
      const paramDescs = super.getParamDeclarations();
      paramDescs.push({
        name: 'BaseColor',
        defaultValue: new Color(1.0, 1.0, 0.5),
      });
      return paramDescs
    }
  }

  zeaEngine.Registry.register('GLDrawCADSurfaceNormalsShader', GLDrawCADSurfaceNormalsShader);

  /* eslint-disable camelcase */

  const GLDrawCADSurfaceShader_VERTEX_SHADER = `
precision highp float;

<%include file="GLSLUtils.glsl"/>
<%include file="GLSLCADConstants.glsl"/>
<%include file="stack-gl/transpose.glsl"/>
<%include file="stack-gl/inverse.glsl"/>

attribute vec3 positions;
instancedattribute vec4 drawCoords;  // body ID, Surface index in Body, Surface Id, TrimSet Id
// instancedattribute vec2 drawItemTexAddr;  // Address of the data in the draw item texture. (mat4)

uniform mat4 viewMatrix;
uniform mat4 cameraMatrix;
uniform mat4 projectionMatrix;
uniform ivec2 quadDetail;
uniform vec3 assetCentroid;

// #define DEBUG_SURFACES
uniform int numSurfacesInLibrary;


<%include file="GLSLCADSurfaceDrawing.vertexShader.glsl"/>

varying vec4 v_drawCoords;
varying vec3 v_viewPos;
varying vec3 v_worldPos;
varying vec3 v_viewNormal;
varying vec2 v_textureCoord;
varying vec3 v_bodyDescAddr;
varying float v_surfaceType;
varying vec2 v_quadDetail;

void main(void) {
    int cadBodyId = ftoi(drawCoords.r);
    int drawItemIndexInBody = ftoi(drawCoords.g);
    int surfaceId = ftoi(drawCoords.b);
    int trimSetId = ftoi(drawCoords.a);

    vec2 texCoords = positions.xy + 0.5;
    
    v_drawCoords = drawCoords;

    vec4 cadBodyPixel0 = getCADBodyPixel(cadBodyId, 0);
    vec4 cadBodyPixel1 = getCADBodyPixel(cadBodyId, 1);

    // int bodyDescId = ftoi(cadBodyPixel0.r);
    int cadBodyFlags = ftoi(cadBodyPixel0.g);
    
    //////////////////////////////////////////////
    // Visibility
    if(testFlag(cadBodyFlags, BODY_FLAG_INVISIBLE)) {
        gl_Position = vec4(-3.0, -3.0, -3.0, 1.0);;
        return;
    }

    //////////////////////////////////////////////
    // Transforms
#ifdef DEBUG_SURFACES
    mat4 modelMatrix = mat4(1.0);
    // if(v_surfaceType == SURFACE_TYPE_NURBS_SURFACE) {
    //     // int drawItemIndexInBody = int(metadata.b+0.5);
    //     int sideLen = int(ceil(sqrt(float(numSurfacesInLibrary))));
    //     int x = drawItemIndexInBody % sideLen;
    //     int y = drawItemIndexInBody / sideLen;
    //     modelMatrix = mat4(1.0, 0.0, 0.0, 0.0, 
    //                     0.0, 1.0, 0.0, 0.0, 
    //                     0.0, 0.0, 1.0, 0.0,  
    //                     float(x), float(y), 0.0, 1.0);
    // }
#else

#ifdef CALC_GLOBAL_XFO_DURING_DRAW
    mat4 bodyMat = getCADBodyMatrix(cadBodyId);
    ivec2 bodyDescAddr = ftoi(cadBodyPixel0.ba);
    v_bodyDescAddr.xy = vec2(float(bodyDescAddr.x), float(bodyDescAddr.y));
    v_bodyDescAddr.z = float(drawItemIndexInBody);
    mat4 surfaceMat = getDrawItemMatrix(bodyDescAddr, drawItemIndexInBody);
    mat4 modelMatrix = bodyMat * surfaceMat;
#else
    mat4 modelMatrix = getModelMatrix();
    // Note: on mobile GPUs, we get only FP16 math in the
    // fragment shader, causing inaccuracies in modelMatrix
    // calculation. By offsetting the data to the origin
    // we calculate a modelMatrix in the asset space, and
    //  then add it back on during final drawing.
    // modelMatrix[3][0] += assetCentroid.x;
    // modelMatrix[3][1] += assetCentroid.y;
    // modelMatrix[3][2] += assetCentroid.z;
#endif
#endif
    // modelMatrix = mat4(1.0);
    mat4 modelViewMatrix = viewMatrix * modelMatrix;
    mat3 normalMatrix = mat3(transpose(inverse(modelViewMatrix)));

    //////////////////////////////////////////////
    // Vertex Attributes
    
    GLSLBinReader surfaceLayoutDataReader;
    GLSLBinReader_init(surfaceLayoutDataReader, surfaceAtlasLayoutTextureSize, 16);
    vec4 surfaceDataAddr = GLSLBinReader_readVec4(surfaceLayoutDataReader, surfaceAtlasLayoutTexture, surfaceId * 8);
    int surfaceFlags = GLSLBinReader_readInt(surfaceLayoutDataReader, surfaceAtlasLayoutTexture, surfaceId * 8 + 6);

    bool isFan = int(quadDetail.y) == 0;
    vec2 vertexCoords = texCoords * (isFan ? vec2(quadDetail) + vec2(1.0, 1.0) : vec2(quadDetail));
    vec4 surfaceVertex = getSurfaceVertex(surfaceDataAddr.xy, vertexCoords);
    v_surfaceType = surfaceVertex.a;
    vec3 normal  = getSurfaceNormal(surfaceDataAddr.xy, vertexCoords);
    vec4 pos     = vec4(surfaceVertex.rgb, 1.0);
    
    bool flippedNormal = testFlag(surfaceFlags, SURFACE_FLAG_FLIPPED_NORMAL);
    if(flippedNormal)
        normal = -normal;

    vec4 viewPos = modelViewMatrix * pos;
    v_viewPos    = viewPos.xyz;
    v_worldPos   = (modelMatrix * pos).xyz;
    gl_Position  = projectionMatrix * viewPos;
    v_viewNormal = normalMatrix * normal;

    v_quadDetail = vec2(quadDetail);

    {
        // Pull back facing vertices towards us ever so slightly...
        // This is to avoid z-fighting that occurs wehn we see the inside
        // of a surface that is resting on another surface.
        vec3 worldNormal = normalize(mat3(cameraMatrix) * v_viewNormal);

        vec3 viewVector = normalize(mat3(cameraMatrix) * normalize(-v_viewPos));
        float ndotv = dot(worldNormal, viewVector);
        bool backFacing = ndotv <= 0.0;
        if (backFacing) {
            // Pull backfacing vertices towards us ever so slightly...
            gl_Position.z *= 0.99999;
        }
    }

    if(isFan) {
        // We are drawing a Fan surface, so the uv coords
        // simply come from the vertex positions.
        v_textureCoord = positions.xy;
    }
    else {
        v_textureCoord = texCoords;
        if(testFlag(surfaceFlags, SURFACE_FLAG_FLIPPED_UV)) {
            v_textureCoord = vec2(v_textureCoord.y, v_textureCoord.x);
            v_quadDetail = vec2(v_quadDetail.y, v_quadDetail.x);
        }

        // v_textureCoord.y = 1.0 - v_textureCoord.y; // Flip y
    }
}`;

  const GLDrawCADSurfaceShader_FRAGMENT_SHADER = `
precision highp float;

<%include file="math/constants.glsl"/>
<%include file="GLSLUtils.glsl"/>
<%include file="stack-gl/gamma.glsl"/>
<%include file="materialparams.glsl"/>
<%include file="GGX_Specular.glsl"/>
<%include file="PBRSurfaceRadiance.glsl"/>

<%include file="GLSLCADConstants.glsl"/>
<%include file="GLSLBinReader.glsl"/>

uniform mat4 cameraMatrix;

uniform bool headLighting;
uniform bool displayWireframes;
uniform bool displayEdges;


#ifdef ENABLE_INLINE_GAMMACORRECTION
uniform float exposure;
#endif

varying vec4 v_drawCoords;
varying vec3 v_viewPos;
varying vec3 v_worldPos;
varying vec3 v_viewNormal;
varying vec2 v_textureCoord;
varying vec3 v_bodyDescAddr;
varying float v_surfaceType;
varying vec2 v_quadDetail;

vec3 getDebugColor(int id){
    
    int sel = int(round(mod(float(id), 14.0)));
    
    if(sel==0)
        return vec3(0.0, 1.0, 1.0);
    else if (sel==1)
        return vec3(0.0, 1.0, 0.0);
    else if (sel==2)
        return vec3(1.0, 0.0, 1.0);
    else if (sel==3)
        return vec3(0.75, 0.75, 0.0);
    else if (sel==4)
        return vec3(0.0, 0.75, 0.75);
    else if (sel==5)
        return vec3(0.75, 0.0, 0.75);
    else if (sel==6)
        return vec3(0.45, 0.95, 0.0);
    else if (sel==7)
        return vec3(0.0, 0.45, 0.95);
    else if (sel==8)
        return vec3(0.95, 0.0, 0.45);
    else if (sel==9)
        return vec3(0.95, 0.45, 0.0);
    else if (sel==10)
        return vec3(0.0, 0.95, 0.45);
    else if (sel==11)
        return vec3(0.45, 0.0, 0.95);
    else if (sel==12)
        return vec3(0.45, 0.45, 0.95);
    else if (sel==13)
        return vec3(0.0, 0.0, 0.45);
    else if (sel==14)
        return vec3(0.0, 0.45, 0.45);
    else if (sel==15)
        return vec3(0.45, 0.0, 0.45);
    else return vec3(0.2, 0.2, 0.2);
}

<%include file="GLSLCADSurfaceDrawing.fragmentShader.glsl"/>

// const float gridSize = 0.02;
const float gridSize = 0.2;

#ifdef ENABLE_ES3
out vec4 fragColor;
#endif

void main(void) {
    
    int cadBodyId = int(floor(v_drawCoords.r + 0.5));
    int drawItemIndexInBody = int(floor(v_drawCoords.g + 0.5));
    int surfaceId = int(floor(v_drawCoords.b + 0.5));
    int trimSetId = int(floor(v_drawCoords.a + 0.5));


    // TODO: pass as varying from pixel shader.
    vec4 cadBodyPixel0 = getCADBodyPixel(cadBodyId, 0);
    vec4 cadBodyPixel1 = getCADBodyPixel(cadBodyId, 1);

    int flags = int(floor(cadBodyPixel0.g + 0.5));
    vec2 materialCoords = cadBodyPixel1.xy;
    //////////////////////////////////////////////
    // Trimming
    vec4 trimPatchQuad;
    vec3 trimCoords;
    if(trimSetId >= 0) {
        GLSLBinReader trimsetLayoutDataReader;
        GLSLBinReader_init(trimsetLayoutDataReader, trimSetsAtlasLayoutTextureSize, 16);
        trimPatchQuad = GLSLBinReader_readVec4(trimsetLayoutDataReader, trimSetsAtlasLayoutTexture, trimSetId*4);

        if(applyTrim(trimPatchQuad, trimCoords, flags)){
            discard;
            return;
        }
    }

    ///////////////////////////////////////////
    // Normal

    vec3 normal = normalize(mat3(cameraMatrix) * v_viewNormal);
    vec3 viewNormal = normalize(v_viewNormal);

    vec3 viewVector = normalize(mat3(cameraMatrix) * normalize(-v_viewPos));
    bool backFacing = dot(normal, viewVector) <= 0.0;
    if(backFacing){
        normal = -normal;
        viewNormal = -viewNormal;
    }

    //////////////////////////////////////////////
    // Material

    vec4 matValue0 = getMaterialValue(materialCoords, 0);

    MaterialParams material;

    /////////////////
    bool clayRendering = false;
    
    material.baseColor             = matValue0.rgb;
    material.opacity               = matValue0.a;
    
    /////////////////
    // Face color
#ifdef ENABLE_PER_FACE_COLORS
    vec4 faceColor = getDrawItemColor(ftoi(v_bodyDescAddr.xy), ftoi(v_bodyDescAddr.z));
    material.baseColor = mix(material.baseColor, faceColor.rgb, faceColor.a);
#endif

    if(clayRendering) {
        material.baseColor          = vec3(0.45, 0.26, 0.13);
        material.opacity            = 1.0;
    } 

    //////////////////////////////////////////////
    // Cutaways
    // if (applyCutaway(cadBodyId, flags)) {
    //     discard;
    //     return;
    // }
    if (testFlag(flags, BODY_FLAG_CUTAWAY)) {
        vec4 cadBodyPixel6 = getCADBodyPixel(cadBodyId, 6);
        vec3 cutNormal = normalize(cadBodyPixel6.xyz);
        float cutPlaneDist = cadBodyPixel6.w;
        if (cutaway(v_worldPos, cutNormal, cutPlaneDist)) {
            discard;
            return;
        }
        // If we are not cutaway, but we can see a back facing face
        // then set the normal to the cut plane do the lighting is flat.
        if (backFacing){
            normal = cutNormal;
        }
    }

    /////////////////
    // Debug backFacing
    // if(backFacing) {
    //     material.baseColor = mix(material.baseColor, vec3(1.0, 0.0, 0.0), 0.5);
    // }

    /////////////////
    // Debug materialId
#ifdef DEBUG_MATERIALID
    {
        material.baseColor = vec3(float(int(materialCoords.x) % 5)/5.0, float(int(materialCoords.y) % 5)/5.0, 0.0);
    }
#endif

    /////////////////
    // Debug bodyId
#ifdef DEBUG_BODYID
    {
        material.baseColor       = getDebugColor(cadBodyId);
    }
#endif

    /////////////////
    // Debug drawItemIndexInBody
#ifdef DEBUG_SURFACEID
    {
        material.baseColor       = getDebugColor(drawItemIndexInBody);
    }
#endif

    /////////////////
    // Debug surface Type
#ifdef DEBUG_SURFACETYPE
    {
        material.baseColor       = getDebugColor(v_surfaceType);
    }
#endif

    /////////////////
    // bool flippedNormal = testFlag(flags, SURFACE_FLAG_FLIPPED_NORMAL);
    // if(flippedNormal) {
    //    material.baseColor = mix(material.baseColor, vec3(1,0,0), 0.75);
    // }

    // if (backFacing) {
    //     material.baseColor = mix(material.baseColor, vec3(1,0,0), 0.75);
    // }

    /////////////////
    // Debug UV layout.
    // {
    //     material.baseColor = vec3(v_textureCoord.x);
    //     // material.baseColor.r = mix(0.0, 1.0, v_textureCoord.x);
    //     // material.baseColor.g = mix(0.0, 1.0, v_textureCoord.y);
    // }

    /////////////////
    // if(testFlag(flags, SURFACE_FLAG_FLIPPED_UV)){
    //     material.baseColor = mix(material.baseColor, vec3(1,1,1), 0.5);
    // }

    /////////////////
    // if(v_quadDetail.x > 512.0 || v_quadDetail.y > 512.0){
    //     material.baseColor = mix(material.baseColor, vec3(1,0,0), 0.75);
    // } else {
    //     // discard;
    // }
    
    /////////////////
    // Debug trim texture.
#ifdef DEBUG_TRIMTEXELS
    if(trimCoords.x >= 0.0) {
        // trimCoords = (trimPatchQuad.xy + 0.5) + ((trimPatchQuad.zw - 0.5) * v_textureCoord);
        trimCoords.xy = trimPatchQuad.xy + (trimPatchQuad.zw * v_textureCoord);
        vec2 trimUv = (trimCoords.xy) / vec2(trimSetAtlasTextureSize);
        vec4 trimTexel = texture2D(trimSetAtlasTexture, trimUv);

        vec2 texelOffset = trimCoords.xy - (floor(trimCoords.xy) + 0.5);
        float texelDist = length(texelOffset);
        
        material.baseColor = trimTexel.rgb * texelDist;

        // if (trimTexel.r > 0.5 && trimTexel.g > 0.5) {
        //     material.baseColor = vec3(0,0,0);
        // }

        // material.baseColor = mix(material.baseColor, vec3(0,0,0), texelDist);
        // material.baseColor = mix(material.baseColor, vec3(0,0,0), trimCoords.z);
        // material.baseColor = mix(material.baseColor, vec3(0,0,0), (trimCoords.z < 0.5) ? 1.0 : 0.0);

        // if(trimCoords.z < 0.5) {
        //     material.baseColor = mix(material.baseColor, vec3(0,0,0), 0.1);
        // }
        // else{
        //     float total = floor(trimCoords.x) +
        //                   floor(trimCoords.y);
        //     if(mod(total,2.0)==0.0)
        //         material.baseColor = mix(material.baseColor, vec3(0,0,0), 0.25);
        //     else
        //         material.baseColor = mix(material.baseColor, vec3(1,1,1), 0.25);
        // }
    }
#endif


    
    //////////////////////////////////////////////
    // Transparency
    // Simple screen door transparency.
    // float threshold = gridSize * opacity * (1.0 - (v_viewPos.z / 300.0));
    // // if(mod(v_viewPos.x / v_viewPos.z, gridSize) > threshold || mod(v_viewPos.y/v_viewPos.z, gridSize) > threshold)// || mod(v_viewPos.z, gridSize) > threshold)
    // if(mod(abs(v_worldPos.x), gridSize) > threshold || mod(abs(v_worldPos.y), gridSize) > threshold || mod(abs(v_worldPos.z), gridSize) > threshold)
    //     discard;


    ///////////////////////////////////////////
    // Lighting
    vec3 radiance;

    vec4 matValue1;
    if(clayRendering)
        matValue1          = vec4(0.0, 0.9, 0.1, 0.0);
    else
        matValue1          = getMaterialValue(materialCoords, 1);

    material.metallic       = matValue1.r;
    material.roughness      = matValue1.g;
    material.reflectance    = matValue1.b;
    material.emission       = matValue1.a;

#ifndef ENABLE_ES3
    vec4 fragColor;
#endif
    fragColor = pbrSurfaceRadiance(material, normal, viewVector);

    /////////////////////////////
    // fragColor = vec4(material.baseColor, 1.0);
    // fragColor = vec4( normalize(viewNormal), 1.0);
    // fragColor = vec4( normalize(normal), 1.0);

    // fragColor = vec4(sampleEnvMap(viewNormal, material.roughness), 1.0);;
    
    ////////////////////
    {
        // vec4 wireColor = vec4(0.1, 0.1, 0.1, 1.0);
        //vec4 wireColor = vec4(0.6, 0.6, 0.6, 1.0);
        vec4 wireColor = vec4(0.0, 0.0, 0.0, 1.0);
        
        vec2 vertexCoords = v_textureCoord * v_quadDetail;
        vec2 vcD = fwidth(vertexCoords);
        vec2 vcW = fract(vertexCoords);

        bool isFan = v_quadDetail.y < 0.5;
        if(displayWireframes) {
            if (isFan) {

            } else {
        
                float lerpVal = smoothstep(0.0, vcD.x, vcW.x) * smoothstep(1.0, 1.0 - vcD.x, vcW.x) * smoothstep(0.0, vcD.y, vcW.y) * smoothstep(1.0, 1.0 - vcD.y, vcW.y);
                
                // Display a thin line at 50% opacity.
                fragColor = mix(fragColor, wireColor, (1.0-smoothstep(0.0, 0.5, lerpVal)) * 0.5 );
        
                //fragColor = mix(fragColor, wireColor, (mod(vertexCoords.x, 2.0) < 1.0) ? 0.5 : 0.0 );
            }
        }
    }

#ifdef ENABLE_INLINE_GAMMACORRECTION
    fragColor.rgb = toGamma(fragColor.rgb * exposure);
#endif

#ifndef ENABLE_ES3
    gl_FragColor = fragColor;
#endif
}
`;

  /** Class representing a GL draw CAD surface shader.
   * @extends GLCADShader
   * @ignore
   */
  class GLDrawCADSurfaceShader extends GLCADShader {
    /*
     * Create a GL draw CAD surface shader.
     * @param {any} gl - The gl value.
     */
    constructor(gl) {
      super(gl);
      this.setShaderStage('VERTEX_SHADER', GLDrawCADSurfaceShader_VERTEX_SHADER);
      this.setShaderStage('FRAGMENT_SHADER', GLDrawCADSurfaceShader_FRAGMENT_SHADER);
    }

    /**
     * The bind method.
     * @param {object} renderstate - The object tracking the current state of the renderer
     * @param {string} key - The key value.
     * @return {any} - The return value.
     */
    bind(renderstate, key) {
      super.bind(renderstate, key);

      const gl = this.__gl;
      if (renderstate.envMap) {
        renderstate.envMap.bind(renderstate);
      }

      const { exposure } = renderstate.unifs;
      if (exposure) {
        gl.uniform1f(exposure.location, renderstate.exposure);
      }
      return true
    }

    /**
     * The getParamDeclarations method.
     * @return {any} - The return value.
     */
    static getParamDeclarations() {
      const paramDescs = super.getParamDeclarations();
      paramDescs.push({
        name: 'BaseColor',
        defaultValue: new zeaEngine.Color(1.0, 1.0, 0.5),
      });
      paramDescs.push({
        name: 'EmissiveStrength',
        defaultValue: 0.0,
      });
      paramDescs.push({
        name: 'Metallic',
        defaultValue: 0.0,
      });
      paramDescs.push({
        name: 'Roughness',
        defaultValue: 0.25,
      });
      paramDescs.push({
        name: 'Normal',
        defaultValue: new zeaEngine.Color(0.0, 0.0, 0.0),
      });
      paramDescs.push({
        name: 'TexCoordScale',
        defaultValue: 1.0,
        texturable: false,
      });
      // F0 = reflectance and is a physical property of materials
      // It also has direct relation to IOR so we need to dial one or the other
      // For simplicity sake, we don't need to touch this value as metalic can dictate it
      // such that non metallic is mostly around (0.01-0.025) and metallic around (0.7-0.85)
      paramDescs.push({
        name: 'Reflectance',
        defaultValue: 0.025,
      });
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
      if (material.getParameter('EmissiveStrength')) {
        matData[4] = material.getParameter('Metallic').getValue();
        matData[5] = material.getParameter('Roughness').getValue();
        matData[6] = material.getParameter('Reflectance').getValue();
        matData[7] = material.getParameter('EmissiveStrength').getValue();
      } else {
        matData[5] = 1.0;
      }
      return matData
    }
  }

  zeaEngine.Registry.register('GLDrawCADSurfaceShader', GLDrawCADSurfaceShader);

  /* eslint-disable camelcase */

  const FRAGMENT_SHADER$1 = `
precision highp float;

<%include file="stack-gl/gamma.glsl"/>
<%include file="GLSLCADConstants.glsl"/>
<%include file="GLSLUtils.glsl"/>
<%include file="GLSLBinReader.glsl"/>

uniform int passIndex;
uniform int assetIndex;

varying vec4 v_drawCoords;
varying vec3 v_viewPos;
varying vec3 v_worldPos;
varying vec3 v_viewNormal;
varying vec2 v_textureCoord;
varying float v_surfaceType;
varying vec2 v_quadDetail;

<%include file="GLSLCADSurfaceDrawing.fragmentShader.glsl"/>

#ifdef ENABLE_ES3
out vec4 fragColor;
#endif

void main(void) {

#ifndef ENABLE_ES3
    vec4 fragColor;
#endif

    int cadBodyId = int(floor(v_drawCoords.r + 0.5));
    int surfaceIndexInBody = int(floor(v_drawCoords.g + 0.5));
    int surfaceId = int(floor(v_drawCoords.b + 0.5));
    int trimSetId = int(floor(v_drawCoords.a + 0.5));

    vec4 cadBodyPixel0 = getCADBodyPixel(cadBodyId, 0);
    int flags = int(floor(cadBodyPixel0.g + 0.5));

    //////////////////////////////////////////////
    // Cutaways
    if (testFlag(flags, BODY_FLAG_CUTAWAY)) {
        vec4 cadBodyPixel6 = getCADBodyPixel(cadBodyId, 6);
        vec3 cutNormal = cadBodyPixel6.xyz;
        float cutPlaneDist = cadBodyPixel6.w;
        if (cutaway(v_worldPos, cutNormal, cutPlaneDist)) {
            discard;
        }
    }

    //////////////////////////////////////////////
    // Trimming
    vec4 trimPatchQuad;
    vec3 trimCoords;
    if(trimSetId >= 0) {
        GLSLBinReader trimsetLayoutDataReader;
        GLSLBinReader_init(trimsetLayoutDataReader, trimSetsAtlasLayoutTextureSize, 16);
        trimPatchQuad = GLSLBinReader_readVec4(trimsetLayoutDataReader, trimSetsAtlasLayoutTexture, trimSetId*4);

        if(applyTrim(trimPatchQuad, trimCoords, flags)){
            discard;
            return;
        }
    }

    float dist = length(v_viewPos);

    int passAndAssetIndex = passIndex + (assetIndex * 64);

    fragColor.r = float(passAndAssetIndex);
    fragColor.g = float(cadBodyId);
    fragColor.b = float(surfaceIndexInBody);
    fragColor.a = dist;
    
    // fragColor.b = float(v_surfaceType);

#ifndef ENABLE_ES3
    gl_FragColor = fragColor;
#endif
}
`;

  /** Class representing a GL draw CAD surface geom data shader.
   * @extends GLCADShader
   * @ignore
   */
  class GLDrawCADSurfaceGeomDataShader extends GLCADShader {
    /**
     * Create a GL draw CAD surface geom data shader.
     * @param {any} gl - The gl value.
     */
    constructor(gl) {
      super(gl);

      this.setShaderStage('VERTEX_SHADER', GLDrawCADSurfaceShader_VERTEX_SHADER);
      this.setShaderStage('FRAGMENT_SHADER', FRAGMENT_SHADER$1);

      this.nonSelectable = true;
    }
  }

  const FRAGMENT_SHADER$2 = `
precision highp float;

<%include file="stack-gl/gamma.glsl"/>
<%include file="GLSLCADConstants.glsl"/>
<%include file="GLSLUtils.glsl"/>
<%include file="GLSLBinReader.glsl"/>

varying vec4 v_drawCoords;
varying vec3 v_viewPos;
varying vec3 v_worldPos;
varying vec3 v_viewNormal;
varying vec2 v_textureCoord;
varying float v_surfaceType;
varying vec2 v_quadDetail;

<%include file="GLSLCADSurfaceDrawing.fragmentShader.glsl"/>

#ifdef ENABLE_ES3
out vec4 fragColor;
#endif

void main(void) {

#ifndef ENABLE_ES3
    vec4 fragColor;
#endif
    
    int cadBodyId = int(floor(v_drawCoords.r + 0.5));
    int surfaceIndexInBody = int(floor(v_drawCoords.g + 0.5));
    int surfaceId = int(floor(v_drawCoords.b + 0.5));
    int trimSetId = int(floor(v_drawCoords.a + 0.5));

    // TODO: pass as varying from pixel shader.
    vec4 cadBodyPixel0 = getCADBodyPixel(cadBodyId, 0);
    int flags = int(floor(cadBodyPixel0.g + 0.5));
            

    //////////////////////////////////////////////
    // Cutaways
    if (testFlag(flags, BODY_FLAG_CUTAWAY)) {
        vec4 cadBodyPixel6 = getCADBodyPixel(cadBodyId, 6);
        vec3 cutNormal = cadBodyPixel6.xyz;
        float cutPlaneDist = cadBodyPixel6.w;
        if (cutaway(v_worldPos, cutNormal, cutPlaneDist)) {
            discard;
        }
    }

    //////////////////////////////////////////////
    // Trimming
    vec4 trimPatchQuad;
    vec3 trimCoords;
    if(trimSetId >= 0) {
        GLSLBinReader trimsetLayoutDataReader;
        GLSLBinReader_init(trimsetLayoutDataReader, trimSetsAtlasLayoutTextureSize, 16);
        trimPatchQuad = GLSLBinReader_readVec4(trimsetLayoutDataReader, trimSetsAtlasLayoutTexture, trimSetId*4);

        if(applyTrim(trimPatchQuad, trimCoords, flags)){
            discard;
            return;
        }
    }
    
    vec4 highlightColor = getCADBodyPixel(cadBodyId, 5);
    fragColor = highlightColor;

#ifndef ENABLE_ES3
    gl_FragColor = fragColor;
#endif
}
`;

  /** Class representing a GL draw selected CAD surface shader.
   * @extends GLCADShader
   * @ignore
   */
  class GLDrawSelectedCADSurfaceShader extends GLCADShader {
    /**
     * Create a GL draw selected CAD surface shader.
     * @param {any} gl - The gl value.
     */
    constructor(gl) {
      super(gl);

      this.setShaderStage('VERTEX_SHADER', GLDrawCADSurfaceShader_VERTEX_SHADER);
      this.setShaderStage('FRAGMENT_SHADER', FRAGMENT_SHADER$2);
      this.nonSelectable = true;
    }
  }

  zeaEngine.Registry.register('GLDrawSelectedCADSurfaceShader', GLDrawSelectedCADSurfaceShader);

  /* eslint-disable camelcase */

  const GLDrawCADCurveShader_VERTEX_SHADER = `
precision highp float;

<%include file="GLSLUtils.glsl"/>
<%include file="GLSLCADConstants.glsl"/>
<%include file="stack-gl/transpose.glsl"/>
<%include file="stack-gl/inverse.glsl"/>

attribute vec3 positions;
instancedattribute vec4 drawCoords;  // body ID, Surface index in Body, Surface Id, TrimSet Id
// instancedattribute vec2 drawItemTexAddr;  // Address of the data in the draw item texture. (mat4)

uniform mat4 viewMatrix;
uniform mat4 cameraMatrix;
uniform mat4 projectionMatrix;
uniform int edgeDetail;
uniform vec3 assetCentroid;


// #define DEBUG_SURFACES
uniform int numCurvesInLibrary;


<%include file="GLSLCADGeomDrawing.vertexShader.glsl"/>

// GEOM
uniform sampler2D curvesAtlasLayoutTexture;
uniform ivec2 curvesAtlasLayoutTextureSize;


uniform sampler2D curvesAtlasTexture;
uniform ivec2 curvesAtlasTextureSize;
// uniform sampler2D normalsTexture;

vec3 getCurveVertex(ivec2 addr, int vertexId) {
  return fetchTexel(curvesAtlasTexture, curvesAtlasTextureSize, ivec2(addr.x + vertexId, addr.y)).rgb;
}

// vec3 getCurveTangent(vec2 surfacePatchCoords, vec2 vertexCoord) {
//   return fetchTexel(normalsTexture, curvesAtlasTextureSize, ivec2(ftoi(surfacePatchCoords.x + vertexCoord.x), ftoi(surfacePatchCoords.y + vertexCoord.y))).rgb;
// }

varying vec4 v_drawCoords;
varying vec3 v_viewPos;
varying vec3 v_worldPos;

void main(void) {
    int cadBodyId = ftoi(drawCoords.r);
    int drawItemIndexInBody = ftoi(drawCoords.g);
    int curveId = ftoi(drawCoords.b);
    int trimSetId = ftoi(drawCoords.a);
    v_drawCoords = drawCoords;

    vec2 texCoords = positions.xy;

    vec4 cadBodyPixel0 = getCADBodyPixel(cadBodyId, 0);
    vec4 cadBodyPixel1 = getCADBodyPixel(cadBodyId, 1);

    // int bodyDescId = ftoi(cadBodyPixel0.r);
    int flags = ftoi(cadBodyPixel0.g);

    // vec4 metadata = getDrawItemData(0);
    // ivec4 curveAtlasCoords = ftoi(getDrawItemData(2));
    // int flags = int(floor(metadata.a + 0.5));

    //////////////////////////////////////////////
    // Visibility
    if(testFlag(flags, BODY_FLAG_INVISIBLE)) {
        gl_Position = vec4(-3.0, -3.0, -3.0, 1.0);;
        return;
    }

    //////////////////////////////////////////////
    // Transforms
#ifdef DEBUG_SURFACES
    mat4 modelMatrix = mat4(1.0);
    int numCurvesInLibrary = 15;
    // int sideLen = int(ceil(sqrt(float(numCurvesInLibrary))));
    // int x = curveId % sideLen;
    // int y = curveId / sideLen;
    modelMatrix = mat4(1.0, 0.0, 0.0, 0.0, 
                    0.0, 1.0, 0.0, 0.0, 
                    0.0, 0.0, 1.0, 0.0,  
                    float(curveId), float(0), 0.0, 1.0);
#else

#ifdef CALC_GLOBAL_XFO_DURING_DRAW
    mat4 bodyMat = getCADBodyMatrix(cadBodyId);
    ivec2 bodyDescAddr = ftoi(cadBodyPixel0.ba);
    mat4 curveMat = getDrawItemMatrix(bodyDescAddr, drawItemIndexInBody);
    mat4 modelMatrix = bodyMat * curveMat;

    // v_sc = surfaceXfo.sc;
    //if (v_sc.z > 0.0) {
    //  gl_Position = vec4(-3.0, -3.0, -3.0, 1.0);;
    //  return;
    //}
#else
    mat4 modelMatrix = getModelMatrix();
    // Note: on mobile GPUs, we get only FP16 math in the
    // fragment shader, causing inaccuracies in modelMatrix
    // calculation. By offsetting the data to the origin
    // we calculate a modelMatrix in the asset space, and
    //  then add it back on during final drawing.
    // modelMatrix[3][0] += assetCentroid.x;
    // modelMatrix[3][1] += assetCentroid.y;
    // modelMatrix[3][2] += assetCentroid.z;
#endif
#endif
    // modelMatrix = mat4(0.001, 0.0, 0.0, 0.0, 
    //   0.0, 0.001, 0.0, 0.0, 
    //   0.0, 0.0, 0.001, 0.0,  
    //   0.0, 0.0, 0.0, 1.0);
    mat4 modelViewMatrix = viewMatrix * modelMatrix;

    //////////////////////////////////////////////
    // Vertex Attributes
    
    GLSLBinReader curvesLayoutDataReader;
    GLSLBinReader_init(curvesLayoutDataReader, curvesAtlasLayoutTextureSize, 16);
    vec4 curveDataAddr = GLSLBinReader_readVec4(curvesLayoutDataReader, curvesAtlasLayoutTexture, curveId * 8);

    int vertexId = int(positions.x * float(edgeDetail));
    vec4 pos     = vec4(getCurveVertex(ftoi(curveDataAddr.xy), vertexId), 1.0);
    // vec4 pos     = vec4(positions * float(edgeDetail), 1.0);

    // if (vertexId == 0)
    //   pos = vec4(vec3(0.0), 1.0);

    vec4 viewPos = modelViewMatrix * pos;
    v_viewPos    = viewPos.xyz;
    v_worldPos   = (modelMatrix * pos).xyz;
    gl_Position  = projectionMatrix * viewPos;

    {
        // Pull edge vertices towards us ever so slightly...
        gl_Position.z *= 0.99999;
    }
}`;

  const GLDrawCADCurveShader_FRAGMENT_SHADER = `
precision highp float;

<%include file="math/constants.glsl"/>
<%include file="GLSLUtils.glsl"/>
<%include file="stack-gl/gamma.glsl"/>
<%include file="materialparams.glsl"/>
<%include file="GGX_Specular.glsl"/>
<%include file="PBRSurfaceRadiance.glsl"/>

<%include file="GLSLCADConstants.glsl"/>

uniform mat4 cameraMatrix;

uniform bool headLighting;
uniform bool displayWireframes;
uniform bool displayEdges;
uniform vec4 edgeColor;

#ifdef ENABLE_INLINE_GAMMACORRECTION
uniform float exposure;
uniform float gamma;
#endif

varying vec4 v_drawCoords;
varying vec3 v_viewPos;
varying vec3 v_worldPos;

<%include file="GLSLCADGeomDrawing.fragmentShader.glsl"/>

vec3 getDebugColor(int id){
    
  int sel = int(round(mod(float(id), 14.0)));
  
  if(sel==0)
      return vec3(0.0, 1.0, 1.0);
  else if (sel==1)
      return vec3(0.0, 1.0, 0.0);
  else if (sel==2)
      return vec3(1.0, 0.0, 1.0);
  else if (sel==3)
      return vec3(0.75, 0.75, 0.0);
  else if (sel==4)
      return vec3(0.0, 0.75, 0.75);
  else if (sel==5)
      return vec3(0.75, 0.0, 0.75);
  else if (sel==6)
      return vec3(0.45, 0.95, 0.0);
  else if (sel==7)
      return vec3(0.0, 0.45, 0.95);
  else if (sel==8)
      return vec3(0.95, 0.0, 0.45);
  else if (sel==9)
      return vec3(0.95, 0.45, 0.0);
  else if (sel==10)
      return vec3(0.0, 0.95, 0.45);
  else if (sel==11)
      return vec3(0.45, 0.0, 0.95);
  else if (sel==12)
      return vec3(0.45, 0.45, 0.95);
  else if (sel==13)
      return vec3(0.0, 0.0, 0.45);
  else if (sel==14)
      return vec3(0.0, 0.45, 0.45);
  else if (sel==15)
      return vec3(0.45, 0.0, 0.45);
  else return vec3(0.2, 0.2, 0.2);
}

#ifdef ENABLE_ES3
out vec4 fragColor;
#endif

void main(void) {

#ifndef ENABLE_ES3
    vec4 fragColor;
#endif

    int cadBodyId = int(floor(v_drawCoords.r + 0.5));
    int drawItemIndexInBody = int(floor(v_drawCoords.g + 0.5));
    int curveId = int(floor(v_drawCoords.b + 0.5));

    // TODO: pass as varying from pixel shader.
    vec4 cadBodyPixel0 = getCADBodyPixel(cadBodyId, 0);
    int flags = int(floor(cadBodyPixel0.g + 0.5));
            

    //////////////////////////////////////////////
    // Cutaways
    if (testFlag(flags, BODY_FLAG_CUTAWAY)) {
        vec4 cadBodyPixel6 = getCADBodyPixel(cadBodyId, 6);
        vec3 cutNormal = cadBodyPixel6.xyz;
        float cutPlaneDist = cadBodyPixel6.w;
        if (cutaway(v_worldPos, cutNormal, cutPlaneDist)) {
            discard;
            return;
        }
    }

    fragColor = edgeColor;

    // fragColor = vec4(0.0, 0.0, 0.0, 1.0);
    // if (v_sc.x < 0.0) {
    //   fragColor.r = 1.0;
    // }
    // if (v_sc.y < 0.0) {
    //   fragColor.g = 1.0;
    // }
    // if (v_sc.z < 0.0) {
    //   fragColor.b = 1.0;
    // }

    /////////////////
    // Debug drawItemIndexInBody
    // {
    //   fragColor.rgb = mix(vec3(1.,1.,1.), getDebugColor(drawItemIndexInBody), float(drawItemIndexInBody)/5.0);
    // }

#ifdef ENABLE_INLINE_GAMMACORRECTION
    fragColor.rgb = toGamma(fragColor.rgb * exposure, gamma);
#endif

#ifndef ENABLE_ES3
    gl_FragColor = fragColor;
#endif
}
`;

  /** Class representing a GL draw CAD surface shader.
   * @extends GLCADShader
   * @ignore
   */
  class GLDrawCADCurveShader extends GLCADShader {
    /*
     * Create a GL draw CAD surface shader.
     * @param {any} gl - The gl value.
     */
    constructor(gl) {
      super(gl);

      this.setShaderStage('VERTEX_SHADER', GLDrawCADCurveShader_VERTEX_SHADER);
      this.setShaderStage('FRAGMENT_SHADER', GLDrawCADCurveShader_FRAGMENT_SHADER);
    }

    /**
     * The getParamDeclarations method.
     * @return {any} - The return value.
     */
    static getParamDeclarations() {
      const paramDescs = super.getParamDeclarations();
      paramDescs.push({
        name: 'BaseColor',
        defaultValue: new zeaEngine.Color(1.0, 1.0, 0.5),
      });
      paramDescs.push({
        name: 'EmissiveStrength',
        defaultValue: 0.0,
      });
      paramDescs.push({
        name: 'Metallic',
        defaultValue: 0.0,
      });
      paramDescs.push({
        name: 'Roughness',
        defaultValue: 0.25,
      });
      paramDescs.push({
        name: 'Normal',
        defaultValue: new zeaEngine.Color(0.0, 0.0, 0.0),
      });
      paramDescs.push({
        name: 'TexCoordScale',
        defaultValue: 1.0,
        texturable: false,
      });
      // F0 = reflectance and is a physical property of materials
      // It also has direct relation to IOR so we need to dial one or the other
      // For simplicity sake, we don't need to touch this value as metalic can dictate it
      // such that non metallic is mostly around (0.01-0.025) and metallic around (0.7-0.85)
      paramDescs.push({
        name: 'Reflectance',
        defaultValue: 0.025,
      });
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
      if (material.getParameter('EmissiveStrength')) {
        matData[4] = material.getParameter('Metallic').getValue();
        matData[5] = material.getParameter('Roughness').getValue();
        matData[6] = material.getParameter('Reflectance').getValue();
        matData[7] = material.getParameter('EmissiveStrength').getValue();
      } else {
        matData[5] = 1.0;
      }
      return matData
    }
  }

  /**
   * Class representing a GL CAD pass.
   *
   * **Events**
   * * **updated**
   * @extends GLPass
   */
  class GLCADPass extends zeaEngine.GLPass {
    /**
     * Create a GL CAD pass.
     * @param {boolean} debugMode - If true, then puts the GLCADPass rendering into debug mode.
     */
    constructor(debugMode = false) {
      super();
      this.debugMode = debugMode;
      this.headLighting = false;
      this.displayWireframes = false;
      this.displaySurfaces = true;
      this.__displayEdges = 0;
      this.displayNormals = false;
      this.normalLength = 0.002; // 2cm
      this.debugTrimTex = false;
      this.debugSurfaceAtlas = false;
      this.debugAssetId = 0;
      this.pbrEnabled = false;
      this.__assets = [];
      this.__loadQueue = 0;

      this.__numHighlightedGeoms = 0;

      // Note: fist id reserved for selectionOutlineID = 1
      // See 'draw()' below.
      this.__shaderCount = 2;
      this.__shaderKeys = {};
      this.__shaderOptsStack = [{}];

      this.__profiling = {
        numSurfaces: 0,
        numSurfaceInstances: 0,
        surfaceEvalTime: 0,
        numBodies: 0,
        numMaterials: 0,
        numTriangles: 0,
        numDrawSets: 0,
      };
    }

    // eslint-disable-next-line require-jsdoc
    get displayEdges() {
      return this.__displayEdges > 0
    }

    // eslint-disable-next-line require-jsdoc
    set displayEdges(val) {
      if (val == true) this.__displayEdges++;
      else this.__displayEdges--;
      this.emit('updated');
    }

    /**
     * The init method.
     * @param {any} renderer - The renderer param.
     * @param {any} passIndex - The passIndex param.
     */
    init(renderer, passIndex) {
      super.init(renderer, passIndex);

      this.__dataLoadStartTime = performance.now();

      const gl = renderer.gl;

      const materialLibrary = new GLCADMaterialLibrary(gl);
      materialLibrary.on('updated', () => this.emit('updated'));

      // Note: The crappy browsers don't support GLSL binary caching, so
      // load times get quite long as we wait for the big shaders to compile.

      if (gl.name != 'webgl2') {
        this.setShaderPreprocessorValue('#extension GL_OES_standard_derivatives : enable');
      }

      if (this.debugMode) {
        this.setShaderPreprocessorValue('#define DEBUG_MODE');
      }

      this.setShaderPreprocessorValue('#define ENABLE_TRIMMING');
      this.setShaderPreprocessorValue('#define ENABLE_INLINE_GAMMACORRECTION');

      this.__cadpassdata = {
        debugMode: this.debugMode,
        assetCount: 0,
        materialLibrary,

        glplanegeom: new zeaEngine.GLMesh(gl, new zeaEngine.Plane(1.0, 1.0, 1, 1)),
        maxTexSize: zeaEngine.SystemDesc.gpuDesc.maxTextureSize,

        incHighlightedCount: this.incHighlightedCount.bind(this),
        decHighlightedCount: this.decHighlightedCount.bind(this),

        incDisplayEdges: () => {
          this.__displayEdges++;
          this.emit('updated');
        },
        decDisplayEdges: () => {
          this.__displayEdges--;
          this.emit('updated');
        },
        genShaderID: (shaderName) => {
          if (shaderName == 'SimpleSurfaceShader' || shaderName == 'StandardSurfaceShader') {
            shaderName = 'GLDrawCADSurfaceShader';
          }
          if (!(shaderName in this.__shaderKeys)) {
            const shaderClass = zeaEngine.Registry.getBlueprint(shaderName);
            if (!shaderClass || !shaderClass.getPackedMaterialData) {
              return this.__cadpassdata.genShaderID('GLDrawCADSurfaceShader')
            }
            const shader = this.applyOptsToShader(zeaEngine.Registry.constructClass(shaderName, gl));

            const id = this.__shaderCount;
            this.__shaderKeys[shaderName] = {
              id,
              shader,
            };
            this.__shaderCount++;
            return id
          }
          return this.__shaderKeys[shaderName].id
        },
      };

      this.__decrementLoadQueue = () => {
        this.__loadQueue--;
        if (this.__loadQueue == 0) {
          // console.log('===All Assets Loaded===')
          // console.log('Total Load Time:' + (performance.now() - this.__gpuLoadStartTime) / 1000)
          this.__profiling.numTriangles = this.__profiling.numTriangles / 1000000;
          // console.log(this.__profiling)

          this.emit('updated');
        }
      };

      // collector.registerSceneItemFilter((treeItem, rargs) => {
      //   if (treeItem instanceof CADAsset) {
      //     this.__loadQueue++;
      //     const cadAsset = treeItem;
      //     cadAsset.on('loaded', () => {
      //       this.addCADAsset(treeItem);
      //     });
      //     rargs.continueInSubTree = true;
      //     return true;
      //   }
      // });
    }

    /**
     * The itemAddedToScene method is called on each pass when a new item
     * is added to the scene, and the renderer must decide how to render it.
     * It allows Passes to select geometries to handle the drawing of.
     * @param {TreeItem} treeItem - The treeItem value.
     * @param {object} rargs - Extra return values are passed back in this object.
     * The object contains a parameter 'continueInSubTree', which can be set to false,
     * so the subtree of this node will not be traversed after this node is handled.
     * @return {Boolean} - The return value.
     */
    itemAddedToScene(treeItem, rargs) {
      if (treeItem instanceof CADAsset) {
        const cadAsset = treeItem;
        this.__loadQueue++;
        this.__cadpassdata.assetCount++;

        if (cadAsset.isLoaded()) {
          if (cadAsset.getSurfaceLibrary().getNumSurfaces() > 0) {
            this.addCADAsset(cadAsset);
          } else {
            this.__decrementLoadQueue();
          }
        } else {
          cadAsset.once('loaded', () => {
            if (cadAsset.getSurfaceLibrary().getNumSurfaces() > 0) this.addCADAsset(cadAsset);
            else {
              this.__decrementLoadQueue();
            }
          });
        }
        rargs.continueInSubTree = true;
        return true
      }
      return false
    }

    /**
     * The itemRemovedFromScene method is called on each pass when aa item
     * is removed to the scene, and the pass must handle cleaning up any resources.
     * @param {TreeItem} treeItem - The treeItem value.
     * @param {object} rargs - Extra return values are passed back in this object.
     * @return {Boolean} - The return value.
     */
    itemRemovedFromScene(treeItem, rargs) {
      if (treeItem instanceof CADAsset) {
        this.removeCADAsset(treeItem);
        return true
      }
      return false
    }

    /**
     * The getShaderPreprocessorValue method.
     * @param {any} name - The name param.
     * @return {any} - The return value.
     */
    getShaderPreprocessorValue(name) {
      return this.getShaderState()[name]
    }

    /**
     * The setShaderPreprocessorValue method.
     * @param {any} name - The name param.
     * @param {boolean} apply - The apply param.
     */
    setShaderPreprocessorValue(name, apply = true) {
      if (!name.startsWith('#')) name = '#define ' + name;

      this.getShaderState()[name] = name;

      // Now update any shaders already consturcted.
      // eslint-disable-next-line guard-for-in
      for (const shaderKey in this.__shaderKeys) {
        const shaderReg = this.__shaderKeys[shaderKey];
        if (shaderReg.shader.setPreprocessorValue) {
          shaderReg.shader.setPreprocessorValue(name);
          if (apply) shaderReg.shader.applyOptions();
        }
      }

      if (this.__drawSelectedCADSurfaceShader) {
        this.__drawSelectedCADSurfaceShader.setPreprocessorValue(name);
        if (apply) this.__drawSelectedCADSurfaceShader.applyOptions();
      }
      if (this.__drawCADSurfaceGeomDataShader) {
        this.__drawCADSurfaceGeomDataShader.setPreprocessorValue(name);
        if (apply) this.__drawCADSurfaceGeomDataShader.applyOptions();
      }
      if (this.__renderer) this.__renderer.requestRedraw();
    }

    /**
     * The clearShaderPreprocessorValue method.
     * @param {any} name - The name param.
     * @param {boolean} apply - The apply param.
     */
    clearShaderPreprocessorValue(name, apply = true) {
      delete this.getShaderState()[name];

      // Now update any shaders already consturcted.
      // eslint-disable-next-line guard-for-in
      for (const shaderKey in this.__shaderKeys) {
        const shaderReg = this.__shaderKeys[shaderKey];
        if (shaderReg.shader.clearPreprocessorValue) {
          shaderReg.shader.clearPreprocessorValue(name);
          if (apply) shaderReg.shader.applyOptions();
        }
      }
      if (this.__renderer) this.__renderer.requestRedraw();
    }

    /**
     * Applies shader options to the compiled shaders, recompiling if necessary.
     * @param {Shader} shader - The shader.
     * @return {Shader} - The updated shader
     */
    applyOptsToShader(shader) {
      if (shader.setPreprocessorValue) {
        // Initialise the shaders.
        const opts = this.getShaderState();
        // eslint-disable-next-line guard-for-in
        for (const key in opts) shader.setPreprocessorValue(key);
        shader.applyOptions();
      }
      return shader
    }

    /**
     * The getShaderState method.
     * @return {any} - The return value.
     */
    getShaderState() {
      return this.__shaderOptsStack[this.__shaderOptsStack.length - 1]
    }

    /**
     * The pushShaderState method.
     */
    pushShaderState() {
      this.__shaderOptsStack.push(Object.assign({}, this.getShaderState()));
      // eslint-disable-next-line guard-for-in
      for (const shaderKey in this.__shaderKeys) {
        const shaderReg = this.__shaderKeys[shaderKey];
        if (shaderReg.shader.pushState) {
          shaderReg.shader.pushState();
        }
      }
    }

    /**
     * The popShaderState method.
     */
    popShaderState() {
      this.__shaderOptsStack.pop();
      // eslint-disable-next-line guard-for-in
      for (const shaderKey in this.__shaderKeys) {
        const shaderReg = this.__shaderKeys[shaderKey];
        if (shaderReg.shader.popState) shaderReg.shader.popState();
      }
    }

    /**
     * The startPresenting method.
     */
    startPresenting() {
      if (zeaEngine.SystemDesc.deviceCategory != 'High') {
        this.pushShaderState();
      }
    }

    /**
     * The stopPresenting method.
     */
    stopPresenting() {
      if (zeaEngine.SystemDesc.deviceCategory != 'High') {
        this.popShaderState();
      }
    }

    /**
     * The getCutPlaneNormalParam method.
     * @return {any} - The return value.
     */
    getCutPlaneNormalParam() {
      return this.__cutPlaneNormalParam
    }

    /**
     * The getCutPlaneDistParam method.
     * @return {any} - The return value.
     */
    getCutPlaneDistParam() {
      return this.__cutDistParam
    }

    /**
     * The getCutPlaneColorParam method.
     * @return {any} - The return value.
     */
    getCutPlaneColorParam() {
      return this.__cutPlaneColorParam
    }

    /**
     * The incHighlightedCount method.
     * @param {any} count - The count param.
     */
    incHighlightedCount(count) {
      this.__numHighlightedGeoms += count;
    }

    /**
     * The decHighlightedCount method.
     * @param {any} count - The count param.
     */
    decHighlightedCount(count) {
      this.__numHighlightedGeoms -= count;
    }

    /**
     * The addCADAsset method is an internal method called when new CADAsset
     * items are discovered in the tree.
     * @param {CADAsset} cadAsset - The cadAsset tree item.
     */
    addCADAsset(cadAsset) {
      this.__gl.finish();
      const assetId = this.__assets.length;

      if (assetId == 0) {
        this.__gpuLoadStartTime = performance.now();
      }

      if (cadAsset.getVersion().compare([0, 0, 26]) > 0) {
        this.setShaderPreprocessorValue('#define INTS_PACKED_AS_2FLOAT16');
      }
      if (cadAsset.getVersion().compare([0, 0, 29]) >= 0) {
        this.setShaderPreprocessorValue('#define ENABLE_PER_FACE_COLORS');
      }
      if (cadAsset.getVersion().compare([1, 0, 5]) >= 0) {
        this.setShaderPreprocessorValue('#define ENABLE_BODY_EDGES');
      }

      const glcadAsset = new GLCADAsset(this.__gl, assetId, cadAsset, this.__cadpassdata);

      glcadAsset.once('loaded', (assetStats) => {
        this.__profiling.numSurfaces += assetStats.numSurfaces;
        this.__profiling.numSurfaceInstances += assetStats.numSurfaceInstances;
        this.__profiling.surfaceEvalTime += assetStats.surfaceEvalTime;
        this.__profiling.numBodies += assetStats.numBodies;
        this.__profiling.numMaterials += assetStats.numMaterials;
        this.__profiling.numTriangles += assetStats.numTriangles;
        this.__profiling.numDrawSets += assetStats.numDrawSets;

        this.__decrementLoadQueue();
      });

      glcadAsset.on('updated', () => this.emit('updated'));

      this.__assets.push(glcadAsset);
    }

    /**
     * The removeCADAsset method.
     * @param {CADAsset} asset - The cadAsset to remove.
     */
    removeCADAsset(asset) {
      this.__assets = this.__assets.filter((glcadAsset) => {
        if (glcadAsset.getCADAsset() == asset) {
          glcadAsset.destroy();
          return false
        }
        return true
      });
      this.emit('updated');
    }

    /**
     * The getGLCADAsset method.
     * @param {number} index - The index of the cadAsset to retrieve.
     * @return {CADAsset} - The return value.
     */
    getGLCADAsset(index) {
      return this.__assets[index]
    }

    /**
     * The draw method.
     * @param {any} renderstate - The renderstate param.
     * @return {any} - The return value.
     */
    draw(renderstate) {
      const gl = this.__gl;

      if (this.__profiling.numBodies == 0) return
      if (zeaEngine.SystemDesc.isIOSDevice) {
        throw new Error('The ZeaCAD cannot be supported on iOS due to no ability to render to a FLOAT framebuffer.')
      }

      if (this.debugTrimTex) {
        if (this.__assets.length > this.debugAssetId) this.__assets[this.debugAssetId].drawTrimSets(renderstate);
      }
      if (this.debugSurfaceAtlas) {
        if (this.__assets.length > this.debugAssetId) this.__assets[this.debugAssetId].drawSurfaceAtlas(renderstate);
        return
      }

      if (this.displaySurfaces) {
        if (!this.pbrEnabled && renderstate.envMap) {
          // If an env map is detected, automatically enable PBR rendering.
          this.setShaderPreprocessorValue('#define ENABLE_PBR');
          this.pbrEnabled = true;
        }

        if (this.__cadpassdata.materialLibrary.needsUpload()) this.__cadpassdata.materialLibrary.uploadMaterials();

        // eslint-disable-next-line guard-for-in
        for (const shaderKey in this.__shaderKeys) {
          const shaderReg = this.__shaderKeys[shaderKey];
          shaderReg.shader.bind(renderstate);
          renderstate.shaderId = shaderReg.id;

          if (!this.__cadpassdata.materialLibrary.bind(renderstate)) {
            return false
          }

          if (renderstate.unifs.headLighting) {
            gl.uniform1i(renderstate.unifs.headLighting.location, this.headLighting);
          }
          if (renderstate.unifs.displayWireframes) {
            gl.uniform1i(renderstate.unifs.displayWireframes.location, this.displayWireframes);
          }

          const boundTextures = renderstate.boundTextures;
          for (const asset of this.__assets) {
            asset.draw(renderstate);
            renderstate.boundTextures = boundTextures;
          }

          shaderReg.shader.unbind(renderstate);
        }
      }

      if (this.displayNormals) {
        if (!this.__drawCADSurfaceNormalsShader) {
          this.__drawCADSurfaceNormalsShader = this.applyOptsToShader(new GLDrawCADSurfaceNormalsShader(gl));
        }
        if (!this.__drawCADSurfaceNormalsShader.bind(renderstate)) return false

        gl.uniform1f(renderstate.unifs.normalLength.location, this.normalLength);
        const id = this.__shaderKeys.GLDrawCADSurfaceShader.id;
        const boundTextures = renderstate.boundTextures;
        for (const asset of this.__assets) {
          asset.drawNormals(renderstate, id);
          renderstate.boundTextures = boundTextures;
        }
      }

      if (this.__displayEdges > 0) {
        if (!this.__drawCADCurvesShader) {
          this.__drawCADCurvesShader = this.applyOptsToShader(new GLDrawCADCurveShader(gl));
        }
        if (!this.__drawCADCurvesShader.bind(renderstate)) return false

        gl.uniform4f(renderstate.unifs.edgeColor.location, 0.1, 0.1, 0.1, 1);

        gl.enable(gl.BLEND);
        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); // For add

        const boundTextures = renderstate.boundTextures;
        for (const asset of this.__assets) {
          asset.drawEdges(renderstate, 0);
          renderstate.boundTextures = boundTextures;
        }

        gl.disable(gl.BLEND);
      }

      // To debug the highlight buffer, enable this line.
      // It will draw the highlight buffer directly to the screen.
      // this.drawHighlightedGeoms(renderstate)
    }

    /**
     * The drawHighlightedGeoms method.
     * @param {any} renderstate - The renderstate param.
     * @return {any} - The return value.
     */
    drawHighlightedGeoms(renderstate) {
      if (this.__numHighlightedGeoms == 0) return false
      const gl = this.__gl;
      if (!this.__drawSelectedCADSurfaceShader) {
        this.__drawSelectedCADSurfaceShader = this.applyOptsToShader(new GLDrawSelectedCADSurfaceShader(gl));
      }
      if (!this.__drawSelectedCADSurfaceShader.bind(renderstate)) {
        return false
      }
      for (const asset of this.__assets) {
        asset.drawHighlightedGeoms(renderstate);
      }
    }

    /**
     * The drawGeomData method.
     * @param {any} renderstate - The renderstate param.
     * @return {any} - The return value.
     */
    drawGeomData(renderstate) {
      if (this.__profiling.numBodies == 0) return
      if (zeaEngine.SystemDesc.isIOSDevice) {
        throw new Error('The ZeaCAD cannot be supported on iOS due to no ability to render to a FLOAT framebuffer.')
      }

      const gl = this.__gl;
      if (!this.__drawCADSurfaceGeomDataShader) {
        this.__drawCADSurfaceGeomDataShader = this.applyOptsToShader(new GLDrawCADSurfaceGeomDataShader(gl));
      }
      if (!this.__drawCADSurfaceGeomDataShader.bind(renderstate)) {
        return false
      }

      gl.disable(gl.BLEND);
      gl.disable(gl.CULL_FACE);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LESS);
      gl.depthMask(true);

      const passIndexUnif = renderstate.unifs.passIndex;
      if (passIndexUnif) {
        gl.uniform1i(passIndexUnif.location, this.passIndex);
      }

      // eslint-disable-next-line guard-for-in
      for (const shaderKey in this.__shaderKeys) {
        const shaderReg = this.__shaderKeys[shaderKey];
        if (shaderReg.shader.nonSelectable) continue

        renderstate.shaderId = shaderReg.id;
        for (const asset of this.__assets) {
          asset.drawGeomData(renderstate);
        }
      }
    }

    /**
     * The getGeomItemAndDist method.
     * @param {any} geomData - The geomData param.
     * @return {any} - The return value.
     */
    getGeomItemAndDist(geomData) {
      const assetId = Math.round(geomData[0] / 64);
      const geomId = Math.round(geomData[1]);
      const dist = geomData[3];
      const geomItem = this.__assets[assetId].getGeomItem(geomId);

      // console.log(this.__assets[assetId].getSurfaceData(geomId))

      return {
        geomItem,
        dist,
      }
    }
  }

  exports.BODY_FLAG_CUTAWAY = BODY_FLAG_CUTAWAY;
  exports.BODY_FLAG_INVISIBLE = BODY_FLAG_INVISIBLE;
  exports.CADAssembly = CADAssembly;
  exports.CADAsset = CADAsset;
  exports.CADBody = CADBody;
  exports.CADCurveTypes = CADCurveTypes;
  exports.CADPart = CADPart;
  exports.CADSurfaceTypes = CADSurfaceTypes;
  exports.CURVE_FLAG_COST_IS_DETAIL = CURVE_FLAG_COST_IS_DETAIL;
  exports.GLCADPass = GLCADPass;
  exports.PMIView = PMIView;
  exports.SURFACE_FLAG_COST_IS_DETAIL_U = SURFACE_FLAG_COST_IS_DETAIL_U;
  exports.SURFACE_FLAG_COST_IS_DETAIL_V = SURFACE_FLAG_COST_IS_DETAIL_V;
  exports.SURFACE_FLAG_FLIPPED_NORMAL = SURFACE_FLAG_FLIPPED_NORMAL;
  exports.SURFACE_FLAG_FLIPPED_UV = SURFACE_FLAG_FLIPPED_UV;
  exports.SURFACE_FLAG_PERIODIC_U = SURFACE_FLAG_PERIODIC_U;
  exports.SURFACE_FLAG_PERIODIC_V = SURFACE_FLAG_PERIODIC_V;
  exports.XRef = XRef;
  exports.drawItemShaderAttribsStride = drawItemShaderAttribsStride;
  exports.drawShaderAttribsStride = drawShaderAttribsStride;
  exports.floatsPerSceneBody = floatsPerSceneBody;
  exports.geomLibraryHeaderSize = geomLibraryHeaderSize;
  exports.getCurveTypeName = getCurveTypeName;
  exports.getSurfaceTypeName = getSurfaceTypeName;
  exports.numValuesPerTrimSetCurveRef = numValuesPerTrimSetCurveRef;
  exports.pixelsPerDrawItem = pixelsPerDrawItem;
  exports.valuesPerCurveLibraryLayoutItem = valuesPerCurveLibraryLayoutItem;
  exports.valuesPerCurveTocItem = valuesPerCurveTocItem;
  exports.valuesPerSurfaceLibraryLayoutItem = valuesPerSurfaceLibraryLayoutItem;
  exports.valuesPerSurfaceTocItem = valuesPerSurfaceTocItem;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=index.umd.js.map
