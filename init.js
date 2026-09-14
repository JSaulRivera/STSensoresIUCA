let ulrModelo =[]
let sensoresVelavu = []
let etiquetasVelavu = [];
let etiquetasArcgis = [];
let filtro = "todos";
const BASE_PATH = window.location.port === "4441"
    ? ""
    : "/STSensores";

    
let urlSensores3D = "https://smart-twins.sigsa.info/server/rest/services/Hosted/UbicacionSensores_WSL1/FeatureServer/1"
let urlSceneLayer = "https://smart-twins.sigsa.info/server/rest/services/Hosted/UbicacionSensores_WSL1/SceneServer"
let urlDatosSensores = "https://smart-twins.sigsa.info/server/rest/services/Hosted/DatosSensores_WFL1/FeatureServer"
let dashboardspersonas ="https://smart-twins.sigsa.info/portal/apps/dashboards/c549225088234bfda2955f56f9677ad0"
let dashboardsvehiculos ="https://smart-twins.sigsa.info/portal/apps/dashboards/497495f3eb9f45308d0a2fca68dfa657"
let view;
let layerList;
let mapaModelosVelavu = {};
let graficosEventosVelavu = [];
let pisos = [];
let areas =[];
let sensorValues = new Map();
let datosSensores, sensores3d, sceneLayer, glbLayer, etiquetasLayer, efectoAnilloLayer, devicesVelavu, listaSensores, glbVelavuLayer,eventosLayer, ubicacionpiso, ubicacionarea,pisoEncontrado,areaEncontrado
let apiVelavu = 'https://api.velavu.com/'
let headers = {
    'Authorization': 'Bearer tkym24EmEKZz6a7F3BCgiwkyG21OQPH233QMyE1TNqKK',
    'Content-Type': 'application/json'
  };
for (let i = 1; i < 36; i++) {
    const url = `https://smart-twins.sigsa.info/server/rest/services/Hosted/Iuca_Wirepass_WSL${i}/SceneServer`;
    ulrModelo.push(url) 
  }

  getDataApiVelavu(`sites`)
    .then(floors => {
      if (!floors || !Array.isArray(floors)) return;
 const pisoAltura=[2.5,4,6]
 const pisosConAltura = floors.map(site => {
      if (Array.isArray(site.floors)) {
        site.floors = site.floors.map((floor, index) => ({
          ...floor,
          altura: pisoAltura[index]
        }));
      }
      return site;
    });

    pisos = pisosConAltura[0].floors
    })
    .catch(error => {
      console.error('Error al consultar la API:', error);
    });


    getDataApiVelavu(`geofences`)
    .then(geocercas => {
      if (!geocercas || !Array.isArray(geocercas)) return;


    areas = geocercas
    })
    .catch(error => {
      console.error('Error al consultar la API:', error);
    });

function getDataApiVelavu(statement) {
  return fetch(apiVelavu + statement, {
    method: 'GET',
    headers: headers
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      return data;
    })
    .catch(error => {
      console.error('Error al consultar la API:', error);
      return null;
    });
}