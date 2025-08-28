
require([
  "esri/Map",
  "esri/views/SceneView",
  "esri/layers/SceneLayer",
  "esri/layers/FeatureLayer",
  "esri/layers/GraphicsLayer",
  "esri/layers/GroupLayer",
  "esri/Graphic",
  "esri/widgets/LayerList",
  "esri/symbols/PointSymbol3D",
  "esri/symbols/ObjectSymbol3DLayer",
], function (
  Map, SceneView, SceneLayer, FeatureLayer, GraphicsLayer, GroupLayer, Graphic, LayerList, PointSymbol3D, ObjectSymbol3DLayer
) {
  etiquetasLayer = new GraphicsLayer({
    title: "Información de sensores",
    listMode: "show",
  });
  efectocirculoLayer = new GraphicsLayer({
    listMode: "hide"
  });
  const map = new Map({
    basemap: "streets-night-vector",
    layers: [efectocirculoLayer],
  });
  view = new SceneView({
    container: "mapDiv",
    map: map,
    center: [-98.413904, 20.063305],
    zoom: 20,
    tilt:60,
  });
  sensores3d = new FeatureLayer({
    url: urlSensores3D,
    title: "Sensores2D",
    outFields: "*",
  });
  glbLayer = new GraphicsLayer({
    title: "modelos Sensores",
    listMode: "hide"
  });
  glbVelavuLayer = new GraphicsLayer({
    title: "Modelos Velavu",
    listMode: "show"
  });
  sceneLayer = new SceneLayer({
    url: urlSceneLayer,
    title: "Ubicacion Sensores",
    listMode: "hide",
  });
  datosSensores = new FeatureLayer({
    url: urlDatosSensores,
    title: "Datos de Sensores",
    listMode: "hide",
  });
  const grupoIuca = new GroupLayer({
    title: "IUCA",
    listMode: "show",
    opacity: 0.2,
    visibilityMode: "independent",
    layers: [],
  });

  ulrModelo.forEach(url => {
    const capaIuca = new SceneLayer({
      url: url,
      listMode: "show",
    });

    capaIuca.popupEnabled = false;
    capaIuca.isInteractive = false;
    grupoIuca.add(capaIuca);
  })

  map.addMany([grupoIuca, glbLayer, glbVelavuLayer]);
  map.add(etiquetasLayer);

  layerList = new LayerList({ view });
  view.ui.add(layerList, "top-right");

  sceneLayer.load().then(() => {
    const query = sceneLayer.createQuery();
    query.where = "1=1";
    query.returnGeometry = true;
    query.outFields = ["*"];

    return sceneLayer.queryFeatures(query);
  }).then(featureSet => {

    featureSet.features.forEach(feature => {
      const pt = feature.geometry;
      const symbol = new PointSymbol3D({
        symbolLayers: [
          new ObjectSymbol3DLayer({
            resource: { href: `/modelosSensores/${feature.attributes.modelo}.glb` },
            height: feature.attributes.escala,
            anchor: "relative",
            heading: feature.attributes.inclinacion,
            tilt: feature.attributes.direccion
          })
        ]
      });


      const graphic = new Graphic({
        geometry: pt,
        symbol: symbol,
        attributes: feature.attributes
      });

      glbLayer.add(graphic);
    });
  }).catch(console.error);

  setInterval(() => {
    actualizarDatosSensores();
    actualizarSensoresVelavu();
    eventosVelavu();
  }, 30000);

  view.when(() => {
    actualizarDatosSensores();
    actualizarSensoresVelavu();

    setTimeout(() => {
      cargarListaSensores(filtro);
    }, 2000);

    view.on("click", (event) => {
      view.hitTest(event).then((response) => {
        const result = response.results.find((res) =>
          res.graphic.layer === sensores3d || res.graphic.layer === glbLayer || res.graphic.layer === glbVelavuLayer
        );

        if (!result) return;
        console.log(result)
        const graphic = result.graphic;
        const atributos = { ...graphic.attributes };


        if (result.graphic.layer === glbLayer) {
          const nombre = atributos.nombre;
          if (!nombre) return;

          sensores3d.queryFeatures({
            where: `nombre='${nombre}'`,
            outFields: ["*"],
            returnGeometry: false,
          }).then((queryResult) => {
            const sensor = queryResult.features[0];
            if (!sensor) return;

            mostrarDatosSensor(sensor.attributes);

          });

        } else if (result.graphic.layer === glbVelavuLayer) {
          const atributos = { ...graphic.attributes };

          // Puedes usar directamente el nombre o el ID del sensor
          if (!atributos || !atributos.id) return;

          const atributosCodificados = encodeURIComponent(
            JSON.stringify(atributos)
          );
          console.log(atributosCodificados)
          window.open(`datos.html?atributos=${atributosCodificados}`);

        }
        else {

          mostrarDatosSensor(atributos);
        }
      });
    });

    document.getElementById("sensorList").addEventListener("change", function () {
      const nombreSeleccionado = this.value;
      hacerZoomASensor(nombreSeleccionado);
    });

    document.getElementById("filtroSensores").addEventListener("change", function () {
      filtro = this.value;
      cargarListaSensores(filtro);
      aplicarFiltroEtiquetas(filtro);
    });


  });
});

function cargarListaSensores(filtro = "todos") {
  listaSensores = document.getElementById("sensorList");
  listaSensores.innerHTML = "";
  const nombresUnicos = new Set();

  if (filtro === "todos" || filtro === "ambientales") {
    sceneLayer
      .load()
      .then(() => sceneLayer.queryFeatures({
        where: "1=1",
        returnGeometry: true,
        outFields: ["*"]
      }))
      .then(featureSet => {
        featureSet.features.forEach(feature => {
          const nombre = feature.attributes.nombre;
          if (!nombresUnicos.has(nombre)) {
            nombresUnicos.add(nombre);
            agregarSensorALista(nombre, "ambientales");
          }
        });
      });
  }

  if ((filtro === "todos" || filtro === "velavu") && sensoresVelavu.length > 0) {
    sensoresVelavu.forEach(sensor => {
      if (!nombresUnicos.has(sensor.nombre)) {
        nombresUnicos.add(sensor.nombre);
        agregarSensorALista(sensor.nombre, "velavu");
      }
    });
  }
}

function agregarSensorALista(nombre, tipo) {
  const div = document.createElement("div");
  div.className = "sensor-item";
  div.textContent = nombre;
  div.dataset.nombre = nombre;
  div.dataset.tipo = tipo;

  div.addEventListener("click", () => {
    document
      .querySelectorAll(".sensor-item")
      .forEach((el) => el.classList.remove("selected"));

    div.classList.add("selected");

    hacerZoomASensor(nombre, tipo);

  });

  listaSensores.appendChild(div);
}
function hacerZoomASensor(nombre, tipo) {
  if (tipo === "ambientales") {
    sceneLayer
      .load()
      .then(() => {
        const query = sceneLayer.createQuery();
        query.where = `nombre='${nombre}'`;
        query.returnGeometry = true;
        query.outFields = ["*"];
        return sceneLayer.queryFeatures(query);
      })
      .then((featureSet) => {
        if (featureSet.features.length > 0) {
          const feature = featureSet.features[0];
          const punto = feature.geometry;

          view.goTo({
            target: punto,
            zoom: 30,
            tilt: feature.attributes.tiltcamara,
            heading: feature.attributes.headingcamara,
          });

          animarAnillo(punto);
        }
      })
      .catch(console.error);
  } else if (tipo === "velavu") {
    const resultados = glbVelavuLayer.graphics.items.filter(graphic => {
      return graphic.attributes.nombre && graphic.attributes.nombre.includes(nombre);
    });
    const punto = resultados[0].geometry;
    view.goTo({
      target: punto,
      zoom: 35,
      tilt: 75,
      heading: 45,
    }).catch(error => {
      console.error("Error al hacer zoom:", error);
    });
    animarAnillo(punto);
  }


}

function animarAnillo(punto) {
  require(["esri/Graphic"], function (Graphic) {

    efectocirculoLayer.removeAll();

    const repeticiones = 3;
    const duracionTotal = 2000;
    const pasosPorCiclo = 15;
    const duracionCiclo = duracionTotal / repeticiones;
    const intervalo = duracionCiclo / pasosPorCiclo;
    const incremento = 4;

    let ciclo = 0;
    let paso = 0;
    let radio = 10;

    const animacion = setInterval(() => {
      efectocirculoLayer.removeAll();

      const grafico = new Graphic({
        geometry: punto,
        symbol: {
          type: "simple-marker",
          style: "circle",
          size: radio,
          color: [0, 255, 255, 0],
          outline: {
            color: [0, 255, 255, 0.6],
            width: 2,
          },
        },
      });

      efectocirculoLayer.add(grafico);

      radio += incremento;
      paso++;

      if (paso >= pasosPorCiclo) {
        ciclo++;
        paso = 0;
        radio = 10;
      }

      if (ciclo >= repeticiones) {
        clearInterval(animacion);
        efectocirculoLayer.removeAll();
      }
    }, intervalo);
  });
}

function mostrarDatosSensor(atributos) {
  const datosKey = atributos.datos;
  const campos = datosKey?.split(",") ?? [];

  datosSensores
    .queryFeatures({
      where: "1=1",
      outFields: ["*"],
      orderByFields: ["fecha desc"],
      returnGeometry: false,
      num: 1,
    })
    .then((result) => {
      const registro = result.features?.[0]?.attributes;
      if (registro) {
        atributos.fecha = registro.fecha;
        campos.forEach((campo) => {
          atributos[campo] = registro[campo];
        });
      }

      const atributosCodificados = encodeURIComponent(
        JSON.stringify(atributos)
      );
      if (atributos.nombre == "Camara DH-IPC-HFW2431DG-4G-SP-LA-B") {
        window.open(dashboardspersonas);
      }
      else if (atributos.nombre == "Camara DH-ECA2A1400-HN") {
        window.open(dashboardsvehiculos);
      }
      else {
        window.open(`datos.html?atributos=${atributosCodificados}`);
      }
    });
}

function actualizarDatosSensores() {
  datosSensores
    .queryFeatures({
      where: "1=1",
      outFields: ["*"],
      orderByFields: ["fecha desc"],
      returnGeometry: true,
    })
    .then((results) => {
      sensorValues.clear();
      const feature = results.features[0];

      for (const [key, value] of Object.entries(feature.attributes)) {
        sensorValues.set(key, value);
      }

      actualizarEtiquetasSensores();
    });
}

function actualizarSensoresVelavu() {
  getDataApiVelavu('devices').then(devicesVelavu => {
    if (!devicesVelavu) return;

    sensoresVelavu = devicesVelavu
      .filter(itemVelavu => itemVelavu.location && itemVelavu.location.coordinates)
      .map(itemVelavu => {
        const namevelavu = itemVelavu.asset?.name === undefined
          ? `${itemVelavu.model}_${itemVelavu.id}`
          : `${itemVelavu.model}_${itemVelavu.id}_${itemVelavu.asset?.name}`;
        return {
          nombre: namevelavu,
          categoria: "velavu",
          data: itemVelavu
        };
      });

    require([
      "esri/Graphic",
      "esri/symbols/PointSymbol3D",
      "esri/symbols/ObjectSymbol3DLayer"
    ], function (Graphic, PointSymbol3D, ObjectSymbol3DLayer) {

      sensoresVelavu.forEach(sensor => {
        const coords = sensor.data?.location?.coordinates;
        const modelo = sensor.data.model;

        if (!coords || !modelo) return;

        const [lon, lat] = coords;
        const pt = {
          type: "point",
          latitude: lat,
          longitude: lon,
          z: 5
        };

        const idSensor = sensor.data.id;

        if (mapaModelosVelavu[idSensor]) {
          // Ya existe: actualizar posición y atributos
          const graphic = mapaModelosVelavu[idSensor];
          graphic.geometry = pt;
          graphic.attributes = {
            nombre: sensor.nombre,
            tipo: "velavu",
            ...sensor.data
          };
        } else {
          // No existe: crear el modelo y guardarlo

          const symbol = new PointSymbol3D({
            symbolLayers: [
              new ObjectSymbol3DLayer({
                resource: { href: `/modelosSensores/${modelo}.glb` },
                height: 0.1,
                anchor: "relative",
                heading: 45,
                tilt: 0
              })
            ]
          });

          const graphic = new Graphic({
            geometry: pt,
            symbol: symbol,
            attributes: {
              nombre: sensor.nombre,
              tipo: "velavu",
              ...sensor.data
            }
          });

          glbVelavuLayer.add(graphic);
          mapaModelosVelavu[idSensor] = graphic; // Guardar en el mapa
        }
      });

      // cargarListaSensores(filtro);
      actualizarEtiquetasSensores();
    });
  });
}

function eventosVelavu() {
  const now = new Date();
  let desde = new Date();
  desde.setMinutes(now.getMinutes() - 2)
  const year = desde.getUTCFullYear();
  const month = String(desde.getUTCMonth() + 1).padStart(2, '0');
  const day = String(desde.getUTCDate()).padStart(2, '0');
  const hours = String(desde.getUTCHours()).padStart(2, '0');
  const minutes = String(desde.getUTCMinutes()).padStart(2, '0');
  const seconds = String(desde.getUTCSeconds()).padStart(2, '0');
  const fecha = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;


  getDataApiVelavu(`events/WEARABLE_ALERT?since=${fecha}`)
    .then(eventosVelavu => {
      if (!eventosVelavu || !Array.isArray(eventosVelavu)) return;

      const ultimosPorDispositivo = {};
      eventosVelavu.forEach(evento => {
        const id = evento.device_id;
        const actual = ultimosPorDispositivo[id];
        if (!actual || new Date(evento.timestamp) > new Date(actual.timestamp)) {
          ultimosPorDispositivo[id] = evento;
        }
      });
      const resultado = Object.values(ultimosPorDispositivo).map(evento => ({
        device_id: evento.device_id,
        data: evento.data,
        timestamp: evento.timestamp
      }));

      const mapaEventos = {};
      resultado.forEach(evento => {
        mapaEventos[evento.device_id] = evento;
      });

      const sensoresConEvento = sensoresVelavu
        .filter(sensor => mapaEventos[sensor.data.id])  // Solo sensores con eventos
        .map(sensor => {
          const evento = mapaEventos[sensor.data.id];
          return {
            nombre: sensor.nombre,
            categoria: sensor.categoria,
            data: sensor.data,
            evento: {
              flags: evento.data.flags,
              timestamp: evento.timestamp
            }
          };
        });


      require([
        "esri/Graphic",
        "esri/symbols/PointSymbol3D",
        "esri/symbols/ObjectSymbol3DLayer"
      ], function (Graphic, PointSymbol3D, ObjectSymbol3DLayer) {

        if (graficosEventosVelavu.length) {
          graficosEventosVelavu.forEach(g => view.graphics.remove(g));
          graficosEventosVelavu = [];
        }
        sensoresConEvento.forEach(sensor => {
          const coords = sensor.data?.location?.coordinates;
          const modelo = sensor.data.model;
          const evento = sensor.evento.flags

          if (!coords || !modelo || evento == 0) return;
          console.log('Datos:', sensor)
          const [lon, lat] = coords;
          const pt = {
            type: "point",
            latitude: lat,
            longitude: lon,
            z: 5.5
          };

          const idSensor = sensor.data.id;
if (graficosEventosVelavu[idSensor]) {
          // Ya existe: actualizar posición y atributos
          const graphic = graficosEventosVelavu[idSensor];
          graphic.geometry = pt;
          
        } else {
          const symbol = new PointSymbol3D({
            symbolLayers: [
              new ObjectSymbol3DLayer({
                resource: { href: `/modelosSensores/alerta.glb` },
                height: 2,
                anchor: "relative",
                heading: 45,
                tilt: 0
              })
            ]
          });

          const graphic = new Graphic({
            geometry: pt,
            symbol: symbol
          });

          view.graphics.add(graphic); // Agrega al mapa
          graficosEventosVelavu.push(graphic); // Guarda para eliminarlos después
        }
        });


      });

    })
    .catch(error => {
      console.error('Error al consultar la API:', error);
    });


}


function actualizarEtiquetasSensores() {
  require(["esri/Graphic"], function (Graphic) {
    etiquetasLayer.removeAll();
    etiquetasArcgis = [];
    etiquetasVelavu = [];

    // Ambientales
    sceneLayer
      .load()
      .then(() => {
        const query = sceneLayer.createQuery();
        query.where = "1=1";
        query.returnGeometry = true;
        query.outFields = ["*"];
        return sceneLayer.queryFeatures(query);
      })
      .then((featureSet) => {
        featureSet.features.forEach((feature) => {
          const pt = feature.geometry;
          pt.z += 0.2;
          const nombre = feature.attributes.nombre;
          const datosKey = feature.attributes.datos;
          if (!datosKey) return;

          const campos = datosKey.split(",");
          let textoValores = "";

          campos.forEach((campo) => {
            const valor = sensorValues.get(campo);
            textoValores += `\n ${campo}: ${valor ?? " "}`;
          });

          const fecha = formatearFecha(sensorValues.get("fecha"));
          //const texto = `${nombre}${textoValores}\n Fecha: ${fecha}`;
          const texto = `${nombre}`

          const etiqueta = new Graphic({
            geometry: pt,
            symbol: {
              type: "text",
              color: "#00ffff",
              text: texto,
              font: {
                size: 9,
                family: "Segoe UI",
                weight: "bold",
              },
              haloColor: "#001f33",
              haloSize: "2px",
            },
          });

          etiquetasArcgis.push(etiqueta);
        });


        sensoresVelavu.forEach((sensor) => {
          const coords = sensor.data?.location?.coordinates;
          if (!coords) return;

          const pt = {
            type: "point",
            latitude: coords[1],
            longitude: coords[0],
            z: 5.2
          };

          let textoValores = "";

          for (const [key, value] of Object.entries(sensor.data)) {
            // console.log(sensor)
            if (typeof value === "string" || typeof value === "number") {
              textoValores += `\n ${key}: ${value}`;
            }
          }

          const fecha = sensor.data?.updatedAt || "";
          //const texto = `${sensor.nombre}${textoValores}\n Fecha: ${fecha}`;
          const texto = `${sensor.nombre}`;

          const etiqueta = new Graphic({
            geometry: pt,
            symbol: {
              type: "text",
              color: "#00ffff",
              text: texto,
              font: {
                size: 9,
                family: "Segoe UI",
                weight: "bold",
              },
              haloColor: "#001f33",
              haloSize: "2px",
            },
          });

          etiquetasVelavu.push(etiqueta);
        });

        aplicarFiltroEtiquetas(filtro);
      })
      .catch(console.error);
  });

}

function aplicarFiltroEtiquetas(filtro) {
  etiquetasLayer.removeAll();

  if (filtro === "todos" || filtro === "ambientales") {
    etiquetasArcgis.forEach(etiqueta => etiquetasLayer.add(etiqueta));
  }

  if (filtro === "todos" || filtro === "velavu") {
    etiquetasVelavu.forEach(etiqueta => etiquetasLayer.add(etiqueta));
  }
}


function formatearFecha(timestamp) {
  const fecha = new Date(Number(timestamp));
  const yyyy = fecha.getFullYear();
  const mm = String(fecha.getMonth() + 1).padStart(2, "0");
  const dd = String(fecha.getDate()).padStart(2, "0");
  const hh = String(fecha.getHours()).padStart(2, "0");
  const min = String(fecha.getMinutes()).padStart(2, "0");
  const ss = String(fecha.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

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