mkdir "../public/libs"

mkdir "../public/libs/zea-engine"
RMDIR  /S /Q "../public/libs/zea-engine/dist"
RMDIR  /S /Q "../public/libs/zea-engine/public-resources"
mklink /J "../public/libs/zea-engine/dist" "../node_modules/@zeainc/zea-engine/dist"
mklink /J "../public/libs/zea-engine/public-resources" "../node_modules/@zeainc/zea-engine/public-resources"

mkdir "../public/libs/zea-ux"
RMDIR  /S /Q "../public/libs/zea-ux/dist"
mklink /J "../public/libs/zea-ux/dist" "../node_modules/@zeainc/zea-ux/dist"
