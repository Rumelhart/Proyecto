import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "../credenciales";

// Interfaz para los datos de la colección vehiculoPagados
interface VehiculoPagado {
  placa: string;
  costoPagadoCOP: number;
  timestamp: Timestamp;
  fechaPago: Timestamp;
}
export async function calculateIncomeByDay(startDate: Date, endDate: Date): Promise<{ labels: string[]; income: number[] }> {
  const pagosQuery = query(
    collection(db, "vehiculosPagados"),
    where("fechaPago", ">=", startDate),
    where("fechaPago", "<=", endDate)
  );

  const pagosSnapshot = await getDocs(pagosQuery);

  const ingresosPorDia: { [fecha: string]: number } = {};

  pagosSnapshot.forEach((doc) => {
    const data = doc.data() as VehiculoPagado;
    const fecha = data.fechaPago.toDate().toISOString().split("T")[0]; // Fecha en formato YYYY-MM-DD

    if (!ingresosPorDia[fecha]) {
      ingresosPorDia[fecha] = 0;
    }
    ingresosPorDia[fecha] += data.costoPagadoCOP;
  });

  // Convertir el objeto en arrays para la gráfica
  const labels = Object.keys(ingresosPorDia);
  const income = labels.map((fecha) => ingresosPorDia[fecha]);

  return { labels, income };
}
export async function calculateAverageStay(startDate: Date, endDate: Date): Promise<number> {
  const pagosQuery = query(
    collection(db, "vehiculosPagados"),
    where("fechaPago", ">=", startDate),
    where("fechaPago", "<=", endDate)
  );

  const pagosSnapshot = await getDocs(pagosQuery);

  let totalTime = 0;
  let totalVehicles = 0;

  pagosSnapshot.forEach((pagoDoc) => {
    const pagoData = pagoDoc.data() as VehiculoPagado;
    const entryTime = pagoData.timestamp.toDate();
    const exitTime = pagoData.fechaPago.toDate();

    const duration = (exitTime.getTime() - entryTime.getTime()) / (1000 * 60 * 60); // Duración en horas
    totalTime += duration;
    totalVehicles++;
  });

  return totalVehicles ? totalTime / totalVehicles : 0;
}

export async function calculateTotalIncome(startDate: Date, endDate: Date): Promise<number> {
  const pagosQuery = query(
    collection(db, "vehiculosPagados"),
    where("fechaPago", ">=", startDate),
    where("fechaPago", "<=", endDate)
  );

  const pagosSnapshot = await getDocs(pagosQuery);

  let totalIncome = 0;
  pagosSnapshot.forEach((doc) => {
    const data = doc.data() as VehiculoPagado;
    totalIncome += data.costoPagadoCOP;
  });

  return totalIncome;
}

export async function calculatePeakHours(startDate: Date, endDate: Date) {
  const pagosQuery = query(
    collection(db, "vehiculosPagados"),
    where("fechaPago", ">=", startDate),
    where("fechaPago", "<=", endDate)
  );

  const pagosSnapshot = await getDocs(pagosQuery);

  let entryHoursCount = Array(24).fill(0);
  let exitHoursCount = Array(24).fill(0);

  pagosSnapshot.forEach((doc) => {
    const data = doc.data() as VehiculoPagado;
    const entryDate = data.timestamp.toDate();
    const exitDate = data.fechaPago.toDate();

    const entryHour = entryDate.getHours();
    const exitHour = exitDate.getHours();

    entryHoursCount[entryHour]++;
    exitHoursCount[exitHour]++;
  });

  return { entryHoursCount, exitHoursCount };
}

export async function calculateOccupancy(startDate: Date, endDate: Date): Promise<number> {
  const pagosQuery = query(
    collection(db, "vehiculosPagados"),
    where("fechaPago", ">=", startDate),
    where("fechaPago", "<=", endDate)
  );

  const pagosSnapshot = await getDocs(pagosQuery);

  // Supongamos que la capacidad total del parqueadero es 100 vehículos
  const capacidadTotal = 100;

  // Contamos cuántos vehículos estuvieron en el parqueadero
  let totalVehiculos = 0;
  pagosSnapshot.forEach((doc) => {
    totalVehiculos++;
  });

  // Calculamos la tasa de ocupación
  const tasaOcupacion = (totalVehiculos / capacidadTotal) * 100;
  return tasaOcupacion;
}

export async function calculateVehicleFlow(startDate: Date, endDate: Date) {
  const pagosQuery = query(
    collection(db, "vehiculosPagados"),
    where("fechaPago", ">=", startDate),
    where("fechaPago", "<=", endDate)
  );

  const pagosSnapshot = await getDocs(pagosQuery);

  // Objeto para almacenar el flujo de vehículos por día
  const flujoVehiculos: { [fecha: string]: { entradas: number; salidas: number } } = {};

  pagosSnapshot.forEach((doc) => {
    const data = doc.data() as VehiculoPagado;
    const fechaEntrada = data.timestamp.toDate().toISOString().split("T")[0]; // Fecha en formato YYYY-MM-DD
    const fechaSalida = data.fechaPago.toDate().toISOString().split("T")[0];

    // Contar entradas
    if (!flujoVehiculos[fechaEntrada]) {
      flujoVehiculos[fechaEntrada] = { entradas: 0, salidas: 0 };
    }
    flujoVehiculos[fechaEntrada].entradas++;

    // Contar salidas
    if (!flujoVehiculos[fechaSalida]) {
      flujoVehiculos[fechaSalida] = { entradas: 0, salidas: 0 };
    }
    flujoVehiculos[fechaSalida].salidas++;
  });

  // Convertir el objeto en arrays para la gráfica
  const labels = Object.keys(flujoVehiculos);
  const entradas = labels.map((fecha) => flujoVehiculos[fecha].entradas);
  const salidas = labels.map((fecha) => flujoVehiculos[fecha].salidas);

  return { labels, entries: entradas, exits: salidas };
}
export async function calculateIncomeByPeriod(startDate: Date, endDate: Date, period: "day" | "week" | "month"): Promise<{ labels: string[]; income: number[] }> {
  const pagosQuery = query(
    collection(db, "vehiculosPagados"),
    where("fechaPago", ">=", startDate),
    where("fechaPago", "<=", endDate)
  );

  const pagosSnapshot = await getDocs(pagosQuery);

  const ingresosPorPeriodo: { [periodo: string]: number } = {};

  pagosSnapshot.forEach((doc) => {
    const data = doc.data() as VehiculoPagado;
    const fechaPago = data.fechaPago.toDate();

    let periodoKey: string;
    let label: string;

    switch (period) {
      case "day":
        periodoKey = fechaPago.toISOString().split("T")[0]; // Formato YYYY-MM-DD
        label = periodoKey;
        break;
      case "week":
        const startOfWeek = new Date(fechaPago);
        startOfWeek.setDate(fechaPago.getDate() - ((fechaPago.getDay() + 6) % 7)); // Lunes de la semana
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Domingo de la semana

        periodoKey = startOfWeek.toISOString().split("T")[0]; // Usamos el lunes como clave
        label = `Lun ${formatDate(startOfWeek)} - Dom ${formatDate(endOfWeek)}`;
        break;
      case "month":
        periodoKey = `${fechaPago.getFullYear()}-${fechaPago.getMonth() + 1}`; // Formato YYYY-MM
        label = new Date(fechaPago.getFullYear(), fechaPago.getMonth(), 1).toLocaleString("default", { month: "long" });
        break;
      default:
        periodoKey = fechaPago.toISOString().split("T")[0];
        label = periodoKey;
    }

    if (!ingresosPorPeriodo[periodoKey]) {
      ingresosPorPeriodo[periodoKey] = 0;
    }
    ingresosPorPeriodo[periodoKey] += data.costoPagadoCOP;
  });

  // Convertir el objeto en arrays para la gráfica
  const labels = Object.keys(ingresosPorPeriodo).map((key) => {
    if (period === "week") {
      const startOfWeek = new Date(key);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return `Lun ${formatDate(startOfWeek)} - Dom ${formatDate(endOfWeek)}`;
    }
    return key;
  });

  const income = Object.values(ingresosPorPeriodo);

  return { labels, income };
}

// Función para formatear fechas en formato DD/MM
function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

export async function calculateOccupancyByPeriod(
  startDate: Date,
  endDate: Date,
  period: "day" | "week" | "month"
): Promise<{ labels: string[]; occupancy: number[] }> {
  const pagosQuery = query(
    collection(db, "vehiculosPagados"),
    where("fechaPago", ">=", startDate),
    where("fechaPago", "<=", endDate)
  );

  const pagosSnapshot = await getDocs(pagosQuery);

  const capacidadTotal = 100;
  const ocupacionPorPeriodo: { [periodo: string]: number } = {};

  // Ajuste de fechas
  const utcStartDate = new Date(
    Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      startDate.getUTCDate()
    )
  );
  const utcEndDate = new Date(
    Date.UTC(
      endDate.getUTCFullYear(),
      endDate.getUTCMonth(),
      endDate.getUTCDate()
    )
  );

  // Inicializar ocupacionPorPeriodo para todos los períodos dentro del rango
  let currentDate = new Date(utcStartDate);
  while (currentDate <= utcEndDate) {
    let periodoKey: string;

    switch (period) {
      case "day":
        periodoKey = currentDate.toISOString().split("T")[0]; // YYYY-MM-DD
        currentDate.setUTCDate(currentDate.getUTCDate() + 1); // Siguiente día
        break;
      case "week":
        const startOfWeek = new Date(currentDate);
        startOfWeek.setUTCDate(
          currentDate.getUTCDate() - ((currentDate.getUTCDay() + 6) % 7) // Lunes UTC
        );
        periodoKey = startOfWeek.toISOString().split("T")[0]; // Lunes de la semana
        currentDate.setUTCDate(currentDate.getUTCDate() + 7); // Siguiente semana
        break;
      case "month":
        const year = currentDate.getUTCFullYear();
        const month = (currentDate.getUTCMonth() + 1).toString().padStart(2, "0"); // Asegurar dos dígitos
        periodoKey = `${year}-${month}`; // YYYY-MM
        currentDate.setUTCMonth(currentDate.getUTCMonth() + 1); // Siguiente mes
        break;
      default:
        throw new Error("Período no válido");
    }

    if (!ocupacionPorPeriodo[periodoKey]) {
      ocupacionPorPeriodo[periodoKey] = 0;
    }
  }

  // Procesar los datos
  pagosSnapshot.forEach((doc) => {
    const data = doc.data() as VehiculoPagado;
    const fechaPago = data.fechaPago.toDate();

    let periodoKey: string;

    switch (period) {
      case "day":
        periodoKey = fechaPago.toISOString().split("T")[0];
        break;
      case "week":
        const startOfWeek = new Date(fechaPago);
        startOfWeek.setUTCDate(
          fechaPago.getUTCDate() - ((fechaPago.getUTCDay() + 6) % 7) // Lunes UTC
        );
        periodoKey = startOfWeek.toISOString().split("T")[0];
        break;
      case "month":
        periodoKey = `${fechaPago.getUTCFullYear()}-${(fechaPago.getUTCMonth() + 1)
          .toString()
          .padStart(2, "0")}`; // YYYY-MM
        break;
      default:
        periodoKey = fechaPago.toISOString().split("T")[0];
    }

    if (ocupacionPorPeriodo[periodoKey] !== undefined) {
      ocupacionPorPeriodo[periodoKey]++;
    }
  });

  // Generar etiquetas para los períodos
  const labels = Object.keys(ocupacionPorPeriodo).map((key) => {
    if (period === "week") {
      const startOfWeek = new Date(key);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6);
      return `Lun ${formatUTCDate(startOfWeek)} - Dom ${formatUTCDate(endOfWeek)}`;
    }
    return key;
  });

  const occupancy = Object.values(ocupacionPorPeriodo).map(
    (count) => (count / capacidadTotal) * 100
  );

  return { labels, occupancy };
}


// Función para formatear fechas UTC en DD/MM
function formatUTCDate(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}