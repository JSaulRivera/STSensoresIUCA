require(["esri/layers/FeatureLayer"], function (FeatureLayer) {
  window.addEventListener('load', function () {
    initApp(FeatureLayer);
  });
});

let nombresensor;
let datosKey;
let chartInstance;
let datosLayer;


function initApp(FeatureLayer) {
  datosLayer = new FeatureLayer({
    url: "https://smart-twins.sigsa.info/server/rest/services/Hosted/DatosSensores_WFL1/FeatureServer"
  });

  getInformation();
}

let atributosGlobales;

function getInformation() {
  const params = new URLSearchParams(window.location.search);
  const atributosString = params.get("atributos");

  if (atributosString) {
    const atributos = JSON.parse(decodeURIComponent(atributosString));
    atributosGlobales = atributos;

    nombresensor = atributos.nombre;
    datosKey = atributos.datos;
    const tipo = atributos.tipo;
    const modelo=atributos.modelo;

    document.getElementById('elemento').innerText = nombresensor;
    document.getElementById('nombre').innerText = nombresensor;
    document.getElementById('tipo').innerText = tipo;
    if (modelo) {
  const modeloViewer = document.getElementById('modeloGLB');
  modeloViewer.src = "/modelosSensores/"+modelo+".glb";
}

  }

  const opcionSeleccionada = document.getElementById("opciones").value;
  cargarDatosGrafica(opcionSeleccionada, datosKey);

  document.getElementById("opciones").addEventListener("change", function () {
    cargarDatosGrafica(this.value, datosKey);
  });


  setInterval(() => {
    const seleccion = document.getElementById("opciones").value;
    cargarDatosGrafica(seleccion, datosKey);
    if (atributosGlobales) {
      actualizarTabla(atributosGlobales, datosKey);
    }
  }, 30000);
}


function cargarDatosGrafica(opcionSeleccionada, datosKey) {
  const campos = datosKey.split(",").map(c => c.trim());

  const now = new Date();
  let desde = new Date();

  switch (opcionSeleccionada) {
    case "opcion1":
      desde.setMinutes(now.getMinutes() - 60); break;
    case "opcion2":
      desde.setHours(now.getHours() - 24); break;
    case "opcion3":
      desde.setDate(now.getDate() - 7); break;
  }
  const timestampDesde = new Date(desde.getTime());
  function pad(num) {
    return num.toString().padStart(2, '0');
  }

  const year = desde.getUTCFullYear();
  const month = pad(desde.getUTCMonth() + 1);
  const day = pad(desde.getUTCDate());
  const hours = pad(desde.getUTCHours());
  const minutes = pad(desde.getUTCMinutes());
  const seconds = pad(desde.getUTCSeconds());

  const fecha = `'${year}-${month}-${day} ${hours}:${minutes}:${seconds}'`;

  const whereClause = `fecha >= ${fecha}`;

  datosLayer.queryFeatures({
    where: whereClause,
    outFields: ["*"],
    orderByFields: ["fecha ASC"],
    returnGeometry: false
  }).then(result => {
    const registros = result.features


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

    const datasets = [];

    for (const [campo, datos] of Object.entries(camposAgrupados)) {
      datasets.push({
        label: campo,
        data: datos.data,
        borderColor: `hsl(${Math.floor(Math.random() * 360)}, 100%, 60%)`,
        backgroundColor: "transparent",
        borderWidth: 2,
        pointBackgroundColor: "#00ffff",
        tension: 0.3
      });
    }

    const primeraLabel = camposAgrupados[campos[0]].labels;

    const config = {
      type: "line",
      data: {
        labels: primeraLabel,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            labels: {
              color: "#00eaff",
              font: {
                size: 12,
                family: "Orbitron"
              }
            }
          },
          title: {
            display: true,
            text: "Histórico del Sensor",
            color: "#00ffff",
            font: {
              size: 16,
              family: "Orbitron",
              weight: "bold"
            }
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

    const ultimoRegistro = registros[registros.length - 1].attributes;

    let textoValores = "";
    campos.forEach(campo => {
      textoValores += `${campo}: ${ultimoRegistro[campo] ?? "N/A"}\n`;
    });

    document.getElementById('valorRegistrado').innerText = textoValores.trim();

    document.getElementById('fechaRegistro').innerText = ultimoRegistro.fecha
      ? new Date(ultimoRegistro.fecha).toLocaleString()
      : "N/A";


  });
}


