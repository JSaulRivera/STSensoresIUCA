let ulrModelo =[]
let urlSensores3D = "https://smart-twins.sigsa.info/server/rest/services/Hosted/UbicacionSensores_WSL1/FeatureServer/1"
let urlSceneLayer = "https://smart-twins.sigsa.info/server/rest/services/Hosted/UbicacionSensores_WSL1/SceneServer"
let urlDatosSensores = "https://smart-twins.sigsa.info/server/rest/services/Hosted/DatosSensores_WFL1/FeatureServer"
let dashboardspersonas ="https://smart-twins.sigsa.info/portal/apps/dashboards/c549225088234bfda2955f56f9677ad0"
let dashboardsvehiculos ="https://smart-twins.sigsa.info/portal/apps/dashboards/497495f3eb9f45308d0a2fca68dfa657"
let apiVelavu = 'https://api.velavu.com/'

for (let i = 0; i <= 36; i++) {
    const url = `https://smart-twins.sigsa.info/server/rest/services/Hosted/Iuca_Wirepass_WSL${i}/SceneServer`;
    ulrModelo.push(url) 
  }