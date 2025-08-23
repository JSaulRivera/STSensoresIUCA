require(["esri/layers/FeatureLayer"], function (FeatureLayer) {
  window.addEventListener('load', function () {
    initApp(FeatureLayer);
  });
});

let nombresensor;
let datosKey;
let chartInstance;
let datosLayer;
let tipo;
let atributos;

function initApp(FeatureLayer) {
  datosLayer = new FeatureLayer({
    url: urlDatosSensores
  });

  getInformation();
}



function getInformation() {
  const params = new URLSearchParams(window.location.search);
  const atributosString = params.get("atributos");

  if (atributosString) {
    atributos = JSON.parse(decodeURIComponent(atributosString));


    if (atributos.tipo === "sensor") {
      nombresensor = atributos.nombre;
      datosKey = atributos.datos;
      tipo = atributos.tipo;
      const modelo = atributos.modelo;

      document.getElementById('elemento').innerText = nombresensor;
      document.getElementById('nombre').innerText = nombresensor;
      document.getElementById('tipo').innerText = tipo;
      if (modelo) {
        const modeloViewer = document.getElementById('modeloGLB');
        modeloViewer.src = "/modelosSensores/" + modelo + ".glb";
      }
    }
    if (atributos.tipo === "velavu") {
      console.log(atributos)
      nombresensor = atributos.nombre;
      tipo = atributos.tipo; //categoria
      const modelo = atributos.model;
      const estado = atributos.online;

      const fecha = convertirFecha(atributos.heartbeat)
      const datos = atributos?.environment === undefined
        ? `Sin informacion`
        : `Temperatura: ${atributos?.environment.temperature_c}` + "\n" + `Humedad: ${atributos?.environment.humidity}`;
      datosKey = atributos?.environment === undefined
        ? `Sin informacion`
        : `temperature_c,humidity`;
      document.getElementById('elemento').innerText = nombresensor;

      document.getElementById('nombre').innerText = nombresensor;
      document.getElementById('valorRegistrado').innerText = datos;
      document.getElementById('fechaRegistro').innerText = fecha.toString();
      document.getElementById('tipo').innerText = tipo;

      if (estado === true) {
        document.getElementById('status').innerText = "online";
      } else {
        document.getElementById('status').innerText = "offline";
      }
      document.getElementById('modelo').innerText = modelo;

      if (modelo) {
        const modeloViewer = document.getElementById('modeloGLB');
        modeloViewer.src = "/modelosSensores/" + modelo + ".glb";
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

  if (atributos.tipo == "sensor") {
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
  if (atributos.tipo == "velavu") {

    const fecha = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;

    getDataApiVelavu(`events/ENVIRONMENT/device/${atributos.id}?since=${fecha}`).then(devicesVelavu => {

      if (devicesVelavu.length === 0) {
        alert("No hay datos disponibles en ese rango.");
        if (chartInstance) chartInstance.destroy();
        return;
      }
      devicesVelavu.reverse()
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

      const ultimoRegistro = devicesVelavu[devicesVelavu.length - 1];
console.log(ultimoRegistro)
      let textoValores = "";
      campos.forEach(campo => {
        textoValores += `${campo}: ${ultimoRegistro.data[campo] ?? "N/A"}\n`;
      });

      document.getElementById('valorRegistrado').innerText = textoValores.trim();

      document.getElementById('fechaRegistro').innerText = convertirFecha(ultimoRegistro.timestamp)
        


  

  });
}
}

function convertirFecha(fechaISO) {
  const fechaUTC = new Date(fechaISO);
  const offsetMilliseconds = 6 * 60 * 60 * 1000;
  const fechaUTCMinus6 = new Date(fechaUTC.getTime() - offsetMilliseconds);

  // Formatear manualmente
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
    .then(data => {
      return data;
    })
    .catch(error => {
      console.error('Error al consultar la API:', error);
      return null;
    });
}