let ulrModelo =[]
let sensoresVelavu = []
let etiquetasVelavu = [];
let etiquetasArcgis = [];
let filtro = "todos";
let urlSensores3D = "https://smart-twins.sigsa.info/server/rest/services/Hosted/UbicacionSensores_WSL1/FeatureServer/1"
let urlSceneLayer = "https://smart-twins.sigsa.info/server/rest/services/Hosted/UbicacionSensores_WSL1/SceneServer"
let urlDatosSensores = "https://smart-twins.sigsa.info/server/rest/services/Hosted/DatosSensores_WFL1/FeatureServer"
let dashboardspersonas ="https://smart-twins.sigsa.info/portal/apps/dashboards/c549225088234bfda2955f56f9677ad0"
let dashboardsvehiculos ="https://smart-twins.sigsa.info/portal/apps/dashboards/497495f3eb9f45308d0a2fca68dfa657"
let view;
let layerList;
let mapaModelosVelavu = {};
let graficosEventosVelavu = [];
let sensorValues = new Map();
let datosSensores, sensores3d, sceneLayer, glbLayer, etiquetasLayer, efectoAnilloLayer, devicesVelavu, listaSensores, glbVelavuLayer,eventosLayer
let apiVelavu = 'https://api.velavu.com/'
let headers = {
    'Authorization': 'Bearer tkym24EmEKZz6a7F3BCgiwkyG21OQPH233QMyE1TNqKK',
    'Content-Type': 'application/json'
  };
for (let i = 1; i < 36; i++) {
    const url = `https://smart-twins.sigsa.info/server/rest/services/Hosted/Iuca_Wirepass_WSL${i}/SceneServer`;
    ulrModelo.push(url) 
  }