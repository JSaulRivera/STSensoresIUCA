require([
  "esri/layers/FeatureLayer",
  "esri/Map",
  "esri/views/MapView",
  "esri/Graphic",
  "esri/layers/GraphicsLayer"
], function (FeatureLayer, Map, MapView, Graphic, GraphicsLayer) {
  window.addEventListener('load', function () {
    initApp(FeatureLayer, Map, MapView, Graphic, GraphicsLayer);
  });
});

let nombresensor;
let datosKey;
let chartInstance;
let datosLayer;
let tipo;
let atributos;


let esriModules = {};
let viewMap, graphicsLayer;

function initApp(FeatureLayer, Map, MapView, Graphic, GraphicsLayer) {
  esriModules = { Map, MapView, Graphic, GraphicsLayer };

  datosLayer = new FeatureLayer({
    url: urlDatosSensores
  });

  initMapa();
  getInformation();
}

function initMapa() {
  const { Map, MapView, GraphicsLayer } = esriModules;

  graphicsLayer = new GraphicsLayer();

  const map = new Map({
    basemap: "dark-gray-vector",
    layers: [graphicsLayer]
  });

  viewMap = new MapView({
    container: "mapa",
    map: map,
    center: [-100, 20],
    zoom: 4
  });
}

function getInformation() {
  const params = new URLSearchParams(window.location.search);
  const atributosString = params.get("atributos");

  if (atributosString) {
    atributos = JSON.parse(decodeURIComponent(atributosString));

    if (atributos.tipo === "sensor") {
      nombresensor = atributos.nombre;
      datosKey = atributos.datos.toLowerCase();
      tipo = atributos.tipo;
      const modelo = atributos.modelo;
      document.getElementById("mapa").style.display = "none";
      document.getElementById('elemento').innerText = nombresensor;
      document.getElementById('nombre').innerText = nombresensor;
      document.getElementById('tipo').innerText = tipo;
      const imgContainer = document.getElementById('img');
      let rutaimagen
if(nombresensor=='Temperatura y humedad(v)'){rutaimagen="/imagenes/3.jpg"}
if(nombresensor=='Detector de gas(ch4)'){rutaimagen="/imagenes/1.jpg"}       
  imgContainer.innerHTML = `<img src="${rutaimagen}" alt="Ubicación del sensor" 
                             style="width:100%; max-width:100px; border-radius:8px; box-shadow:0 0 10px #00eaff55;">`;

      if (modelo) {
        const modeloViewer = document.getElementById('modeloGLB');
        modeloViewer.src = `${BASE_PATH}/modelosSensores/${modelo}.glb`;
      }
    }

    if (atributos.tipo === "velavu") {
      nombresensor = atributos.nombre;
      tipo = atributos.tipo;
      const modelo = atributos.model;
      const estado = atributos.online;
      const fecha = convertirFecha(atributos.heartbeat);
      const datos = atributos?.environment === undefined
        ? `Sin información`
        : `Temperatura: ${atributos?.environment.temperature_c}\nHumedad: ${atributos?.environment.humidity}`;
      datosKey = atributos?.environment === undefined
        ? `Sin información`
        : `temperature_c,humidity`;
      console.log(datosKey)
      document.getElementById('elemento').innerText = nombresensor;
      document.getElementById('nombre').innerText = nombresensor;
      document.getElementById('valorRegistrado').innerText = datos;
      document.getElementById('fechaRegistro').innerText = fecha.toString();
      document.getElementById('tipo').innerText = tipo;
      document.getElementById('status').innerText = estado ? "online" : "offline";
      document.getElementById('modelo').innerText = modelo;
      const imgContainer = document.getElementById('img');
      let rutaimagen=''
if(nombresensor=='Minew MBM01_lv3em'){rutaimagen="/imagenes/4.jpg"}
       
  imgContainer.innerHTML = `<img src="${rutaimagen}" alt="Ubicación del sensor" 
                             style="width:100%; max-width:100px; border-radius:8px; box-shadow:0 0 10px #00eaff55;">`;

      if (modelo) {
        const modeloViewer = document.getElementById('modeloGLB');
        modeloViewer.src = `${BASE_PATH}/modelosSensores/${modelo}.glb`;
      }
    }
  }

  const opcionSeleccionada = document.getElementById("opciones").value;
  cargarDatosGrafica(opcionSeleccionada, datosKey, atributos);

  document.getElementById("opciones").addEventListener("change", function () {
    cargarDatosGrafica(this.value, datosKey, atributos);
  });

  setInterval(() => {
    const seleccion = document.getElementById("opciones").value;
    cargarDatosGrafica(seleccion, datosKey, atributos);
  }, 30000);
}

function cargarDatosGrafica(opcionSeleccionada, datosKey, atributos) {
  const campos = datosKey.split(",").map(c => c.trim());

  const now = new Date();
  let desde = new Date();

  switch (opcionSeleccionada) {
    case "opcion1": desde.setMinutes(now.getMinutes() - 60); break;
    case "opcion2": desde.setHours(now.getHours() - 24); break;
    case "opcion3": desde.setDate(now.getDate() - 7); break;
  }

  const year = desde.getUTCFullYear();
  const month = String(desde.getUTCMonth() + 1).padStart(2, '0');
  const day = String(desde.getUTCDate()).padStart(2, '0');
  const hours = String(desde.getUTCHours()).padStart(2, '0');
  const minutes = String(desde.getUTCMinutes()).padStart(2, '0');
  const seconds = String(desde.getUTCSeconds()).padStart(2, '0');

  if (atributos.tipo == "sensor") {
    const fecha = `'${year}-${month}-${day} ${hours}:${minutes}:${seconds}'`;
    const whereClause = `fecha >= ${fecha}`;
    datosLayer.queryFeatures({
      where: whereClause,
      outFields: ["*"],
      orderByFields: ["fecha ASC"],
      returnGeometry: false
    }).then(result => {
      const registros = result.features;

      if (registros.length === 0) {
        alert("No hay datos disponibles en ese rango.");
        if (chartInstance) chartInstance.destroy();
        return;
      }

      const camposAgrupados = {};
      campos.forEach(c => camposAgrupados[c] = { labels: [], data: [] });

      registros.forEach(attr => {
        const fecha = new Date(attr.attributes.fecha).toLocaleString();
        campos.forEach(campo => {
          if (attr.attributes[campo] !== undefined) {
            camposAgrupados[campo].labels.push(fecha);
            camposAgrupados[campo].data.push(attr.attributes[campo]);
          }
        });
      });

      mostrarGrafica(campos, camposAgrupados);

      const ultimoRegistro = registros[registros.length - 1].attributes;
      let textoValores = campos.map(c => `${c}: ${ultimoRegistro[c] ?? "N/A"}`).join("\n");
      document.getElementById('valorRegistrado').innerText = textoValores;
      // document.getElementById('estado').innerText="Sensor ambiental"
      document.getElementById('fechaRegistro').innerText = new Date(ultimoRegistro.fecha).toLocaleString();
      const fechaRegistro = new Date(ultimoRegistro.fecha);
      const ahora = new Date();
      const diferenciaMs = ahora - fechaRegistro;
      const lt = diferenciaMs <= 5 * 60 * 1000 && diferenciaMs >= 0;
      if (lt) {
        document.getElementById('status').innerText = "online"
      } else {
        document.getElementById('status').innerText = "offline"
      }
      
    });

  } else if (atributos.tipo == "velavu") {
    const fecha = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;

    // Datos ambientales
    getDataApiVelavu(`events/ENVIRONMENT/device/${atributos.id}?since=${fecha}`).then(devicesVelavu => {
      if (!devicesVelavu || devicesVelavu.length === 0) {
        document.getElementById("grafica").style.display = "none";

        if (chartInstance) chartInstance.destroy();
        return;
      }

      devicesVelavu.reverse();
      const camposAgrupados = {};
      campos.forEach(c => camposAgrupados[c] = { labels: [], data: [] });

      devicesVelavu.forEach(attr => {
        const fecha = new Date(attr.timestamp).toLocaleString();
        campos.forEach(campo => {
          if (attr.data[campo] !== undefined) {
            camposAgrupados[campo].labels.push(fecha);
            camposAgrupados[campo].data.push(attr.data[campo]);
          }
        });
      });

      mostrarGrafica(campos, camposAgrupados);

      const ultimoRegistro = devicesVelavu[devicesVelavu.length - 1];
      let textoValores = campos.map(c => `${c}: ${ultimoRegistro.data[c] ?? "N/A"}`).join("\n");
      document.getElementById('valorRegistrado').innerText = textoValores;
      document.getElementById('fechaRegistro').innerText = convertirFecha(ultimoRegistro.timestamp);
    });

    // Datos de ubicación
    getDataApiVelavu(`events/LOCATION/device/${atributos.id}?since=${fecha}`).then(locationVelavu => {
      if (!locationVelavu || locationVelavu.length === 0) {
        document.getElementById("mapa").style.display = "none";

        return;
      }

      locationVelavu.reverse();
      graphicsLayer.removeAll();
      // Aquí cargamos los módulos de ArcGIS necesarios
      require(["esri/Map", "esri/views/MapView", "esri/Graphic", "esri/layers/GraphicsLayer"], function (Map, MapView, Graphic, GraphicsLayer) {

        // Extraemos las coordenadas en el formato esperado
        const puntos = locationVelavu
          .map(p => {
            const coords = p.data.coordinates;
            if (Array.isArray(coords) && coords.length === 2) {
              return { longitude: coords[0], latitude: coords[1] };
            }
            return null;
          })
          .filter(p => p !== null);

        if (puntos.length === 0) {
          console.warn("No hay ubicaciones válidas para mostrar en el mapa.");
          return;
        }

        // Verificamos si el mapa ya se inicializó
        if (!window._mapaInicializado) {
          window._graphicsLayer = new GraphicsLayer();

          const map = new Map({
            basemap: "hybrid",
            layers: [window._graphicsLayer]
          });

          window._mapView = new MapView({
            container: "mapa", // ID del div
            map: map,
            zoom: 15,
            center: [puntos[0].longitude, puntos[0].latitude]
          });

          window._mapaInicializado = true;
        }

        // Limpiamos los gráficos anteriores
        window._graphicsLayer.removeAll();

        // Agregamos los puntos como marcadores
        puntos.forEach(p => {
          const puntoGrafico = new Graphic({
            geometry: {
              type: "point",
              longitude: p.longitude,
              latitude: p.latitude
            },
            symbol: {
              type: "simple-marker",
              color: "cyan",
              size: "6px"
            }
          });
          window._graphicsLayer.add(puntoGrafico);
        });

        // Agregamos la línea que une los puntos
        const linea = new Graphic({
          geometry: {
            type: "polyline",
            paths: puntos.map(p => [p.longitude, p.latitude]),
            spatialReference: { wkid: 4326 }
          },
          symbol: {
            type: "simple-line",
            color: "aqua",
            width: 2
          }
        });

        window._graphicsLayer.add(linea);

        // Hacemos zoom al último punto
        const ultimo = puntos[puntos.length - 1];

        // Aseguramos que el mapa esté listo antes de hacer goTo
        window._mapView.when(() => {
          if (window._mapView.animation) {
            window._mapView.animation.destroy();
          }

          window._mapView.goTo({
            center: [ultimo.longitude, ultimo.latitude],
            zoom: 16
          }).catch(err => {
            if (err.name !== "AbortError") {
              console.error("Error en goTo:", err);
            }
          });
        });
      });


    });
  }
}

function mostrarGrafica(campos, camposAgrupados) {
  const datasets = campos.map(campo => ({
    label: campo,
    data: camposAgrupados[campo].data,
    borderColor: `hsl(${Math.floor(Math.random() * 360)}, 100%, 60%)`,
    backgroundColor: "transparent",
    borderWidth: 2,
    pointBackgroundColor: "#00ffff",
    tension: 0.3
  }));

  const config = {
    type: "line",
    data: {
      labels: camposAgrupados[campos[0]].labels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: {
            color: "#00eaff",
            font: { size: 12, family: "Orbitron" }
          }
        },
        title: {
          display: true,
          text: "Histórico del Sensor",
          color: "#00ffff",
          font: { size: 16, family: "Orbitron", weight: "bold" }
        },
        tooltip: {
          backgroundColor: "rgba(0, 255, 255, 0.1)",
          titleColor: "#00ffff",
          bodyColor: "#00eaff",
          borderColor: "#00ffff",
          borderWidth: 1
        }
      },
      scales: {
        x: {
          ticks: { color: "#00eaff" },
          grid: { color: "rgba(0, 255, 255, 0.1)" }
        },
        y: {
          ticks: { color: "#00eaff" },
          grid: { color: "rgba(0, 255, 255, 0.1)" }
        }
      }
    }
  };

  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(document.getElementById("lineChart"), config);
}

function convertirFecha(fechaISO) {
  const fechaUTC = new Date(fechaISO);
  const offsetMilliseconds = 6 * 60 * 60 * 1000;
  const fechaUTCMinus6 = new Date(fechaUTC.getTime() - offsetMilliseconds);
  const anio = fechaUTCMinus6.getUTCFullYear();
  const mes = String(fechaUTCMinus6.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(fechaUTCMinus6.getUTCDate()).padStart(2, '0');
  const horas = String(fechaUTCMinus6.getUTCHours()).padStart(2, '0');
  const minutos = String(fechaUTCMinus6.getUTCMinutes()).padStart(2, '0');
  const segundos = String(fechaUTCMinus6.getUTCSeconds()).padStart(2, '0');
  return `${anio}-${mes}-${dia} ${horas}:${minutos}:${segundos}`;
}

function getDataApiVelavu(statement) {
  return fetch("https://api.velavu.com/" + statement, {
    method: 'GET',
    headers: headers
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => data)
    .catch(error => {
      console.error('Error al consultar la API:', error);
      return [];
    });
}
