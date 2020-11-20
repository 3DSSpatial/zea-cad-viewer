mkdir "../public/viewer"
mkdir "../public/viewer/libs"

mkdir "../public/viewer/libs/zea-engine"
RMDIR  /S /Q "../public/viewer/libs/zea-engine/dist"
mklink /J "../public/viewer/libs/zea-engine/dist" "../node_modules/@zeainc/zea-engine/dist"

mkdir "../public/viewer/libs/zea-cad"
RMDIR  /S /Q "../public/viewer/libs/zea-cad/dist"
mklink /J "../public/viewer/libs/zea-cad/dist" "../node_modules/@zeainc/zea-cad/dist"

mkdir "../public/viewer/libs/zea-ux"
RMDIR  /S /Q "../public/viewer/libs/zea-ux/dist"
mklink /J "../public/viewer/libs/zea-ux/dist" "../node_modules/@zeainc/zea-ux/dist"
