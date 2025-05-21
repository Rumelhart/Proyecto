import React, { useEffect, useState } from "react";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import {
  calculateAverageStay,
  calculateTotalIncome,
  calculatePeakHours,
  calculateOccupancy,
  calculateVehicleFlow,
  calculateIncomeByPeriod,
  calculateOccupancyByPeriod,
} from "./analyticsFunctions";
import styles from "../AnalyticDashboard.module.css";
import NavAdmin from './navadmin'; 

// Registrar componentes de ChartJS
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface PeakHoursData {
  entryHoursCount: number[];
  exitHoursCount: number[];
}

const AnalyticDashboard: React.FC = () => {
  const [averageStay, setAverageStay] = useState<number>(0);
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [peakHoursData, setPeakHoursData] = useState<PeakHoursData>({
    entryHoursCount: Array(24).fill(0),
    exitHoursCount: Array(24).fill(0),
  });
  const [occupancyRate, setOccupancyRate] = useState<number>(0);
  const [vehicleFlow, setVehicleFlow] = useState<{ labels: string[]; entries: number[]; exits: number[] }>({
    labels: [],
    entries: [],
    exits: [],
  });
  const [incomeData, setIncomeData] = useState<{ labels: string[]; income: number[] }>({
    labels: [],
    income: [],
  });
  const [occupancyData, setOccupancyData] = useState<{ labels: string[]; occupancy: number[] }>({
    labels: [],
    occupancy: [],
  });
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");
  const [occupancyPeriod, setOccupancyPeriod] = useState<"day" | "week" | "month">("day");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const [startDate, setStartDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(1);
    return date;
  });
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<string>("flujo");


  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Función para actualizar el tema
    const updateTheme = (e: MediaQueryListEvent | MediaQueryList) => {
      setTheme(e.matches ? "dark" : "light");
      document.body.setAttribute("data-theme", e.matches ? "dark" : "light");
    };

    // Configurar listener y estado inicial
    updateTheme(mediaQuery);
    mediaQuery.addEventListener('change', updateTheme);

    // Limpieza al desmontar
    return () => mediaQuery.removeEventListener('change', updateTheme);
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const avgStay = await calculateAverageStay(startDate, endDate);
        const income = await calculateTotalIncome(startDate, endDate);
        const peakHours = await calculatePeakHours(startDate, endDate);
        const occupancy = await calculateOccupancy(startDate, endDate);
        const flow = await calculateVehicleFlow(startDate, endDate);
        const incomeByPeriod = await calculateIncomeByPeriod(startDate, endDate, period);
        const occupancyByPeriod = await calculateOccupancyByPeriod(startDate, endDate, occupancyPeriod);

        setAverageStay(avgStay);
        setTotalIncome(income);
        setPeakHoursData(peakHours);
        setOccupancyRate(occupancy);
        setVehicleFlow(flow);
        setIncomeData(incomeByPeriod);
        setOccupancyData(occupancyByPeriod);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }

    fetchData();
  }, [startDate, endDate, period, occupancyPeriod]);

  // Datos para la gráfica de horas pico
  const peakHoursChartData = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [
      {
        label: "Entradas",
        data: peakHoursData.entryHoursCount,
        backgroundColor: theme === "light" ? "rgba(75, 192, 192, 0.6)" : "rgba(75, 192, 192, 0.8)",
        borderColor: theme === "light" ? "rgba(75, 192, 192, 1)" : "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      },
      {
        label: "Salidas",
        data: peakHoursData.exitHoursCount,
        backgroundColor: theme === "light" ? "rgba(153, 102, 255, 0.6)" : "rgba(153, 102, 255, 0.8)",
        borderColor: theme === "light" ? "rgba(153, 102, 255, 1)" : "rgba(153, 102, 255, 1)",
        borderWidth: 1,
      },
    ],
  };

  // Datos para la gráfica de flujo de vehículos
  const vehicleFlowChartData = {
    labels: vehicleFlow.labels,
    datasets: [
      {
        label: "Entradas",
        data: vehicleFlow.entries,
        borderColor: theme === "light" ? "rgba(75, 192, 192, 1)" : "rgba(75, 192, 192, 0.8)",
        backgroundColor: theme === "light" ? "rgba(75, 192, 192, 0.2)" : "rgba(75, 192, 192, 0.4)",
        fill: true,
        tension: 0.3,
      },
      {
        label: "Salidas",
        data: vehicleFlow.exits,
        borderColor: theme === "light" ? "rgba(153, 102, 255, 1)" : "rgba(153, 102, 255, 0.8)",
        backgroundColor: theme === "light" ? "rgba(153, 102, 255, 0.2)" : "rgba(153, 102, 255, 0.4)",
        fill: true,
        tension: 0.3,
      },
    ],
  };

  // Datos para la gráfica de ingresos
  const incomeChartData = {
    labels: incomeData.labels,
    datasets: [
      {
        label: `Ingresos (${period === "day" ? "Día" : period === "week" ? "Semana" : "Mes"})`,
        data: incomeData.income,
        backgroundColor: theme === "light" ? "rgba(255, 99, 132, 0.6)" : "rgba(255, 99, 132, 0.8)",
        borderColor: theme === "light" ? "rgba(255, 99, 132, 1)" : "rgba(255, 99, 132, 1)",
        borderWidth: 1,
      },
    ],
  };

  // Datos para la gráfica de ocupación
  const occupancyChartData = {
    labels: occupancyData.labels,
    datasets: [
      {
        label: `Ocupación (${occupancyPeriod === "day" ? "Día" : occupancyPeriod === "week" ? "Semana" : "Mes"})`,
        data: occupancyData.occupancy,
        backgroundColor: theme === "light" ? "rgba(54, 162, 235, 0.6)" : "rgba(54, 162, 235, 0.8)",
        borderColor: theme === "light" ? "rgba(54, 162, 235, 1)" : "rgba(54, 162, 235, 1)",
        borderWidth: 1,
      },
    ],
  };

  // Opciones comunes para gráficas
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: theme === "light" ? "#333" : "#fff",
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "rgba(255, 255, 255, 0.1)",
        },
        ticks: {
          color: theme === "light" ? "#333" : "#fff",
        },
      },
      y: {
        grid: {
          color: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "rgba(255, 255, 255, 0.1)",
        },
        ticks: {
          color: theme === "light" ? "#333" : "#fff",
        },
        beginAtZero: true,
      },
    },
  };

  return (
    <div className={styles.container} data-theme={theme}>
      <NavAdmin />
      <h1 className={styles.title}>Dashboard de Análisis</h1>

      {/* Tarjetas de métricas */}
      <div className={styles.metricsContainer}>
        <div className={styles.metricCard}>
          <h3>Tiempo promedio de estadía</h3>
          <p>{averageStay.toFixed(2)} min</p>
        </div>
        <div className={styles.metricCard}>
          <h3>Ingresos totales</h3>
          <p>${totalIncome.toLocaleString()}</p>
        </div>
        <div className={styles.metricCard}>
          <h3>Tasa de ocupación</h3>
          <p>{occupancyRate.toFixed(2)}%</p>
        </div>
      </div>

      {/* Filtros de fecha */}
      <div className={styles.filters}>
        <label>
          Fecha de Inicio:
          <input
            type="date"
            className={styles.dateInput}
            value={startDate.toISOString().split('T')[0]}
            onChange={(e) => setStartDate(new Date(e.target.value))}
          />
        </label>
        <label>
          Fecha de Fin:
          <input
            type="date"
            className={styles.dateInput}
            value={endDate.toISOString().split('T')[0]}
            onChange={(e) => setEndDate(new Date(e.target.value))}
          />
        </label>
      </div>

      {/* Pestañas */}
      <div className={styles.tabs}>
        <button
          className={activeTab === "flujo" ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab("flujo")}
        >
          Flujo de Vehículos
        </button>
        <button
          className={activeTab === "ocupacion" ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab("ocupacion")}
        >
          Ocupación
        </button>
        <button
          className={activeTab === "ingresos" ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab("ingresos")}
        >
          Ingresos
        </button>
        <button
          className={activeTab === "horas" ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab("horas")}
        >
          Horas Pico
        </button>
      </div>

      {/* Contenido de las pestañas */}
      <div className={styles.tabContent}>
        {activeTab === "flujo" && (
          <>
            <h2>Flujo de Vehículos</h2>
            <div className={styles.chartContainer}>
              <Line 
                data={vehicleFlowChartData} 
                options={{
                  ...chartOptions,
                  scales: { ...chartOptions.scales, y: { ...chartOptions.scales.y, beginAtZero: true } }
                }} 
              />
            </div>
          </>
        )}

        {activeTab === "ocupacion" && (
          <>
            <h2>Ocupación del Parqueadero</h2>
            <div className={styles.filters}>
              <label>
                Período:
                <select
                  className={styles.periodSelect}
                  value={occupancyPeriod}
                  onChange={(e) => setOccupancyPeriod(e.target.value as "day" | "week" | "month")}
                >
                  <option value="day">Día</option>
                  <option value="week">Semana</option>
                  <option value="month">Mes</option>
                </select>
              </label>
            </div>
            <div className={styles.chartContainer}>
              <Bar 
                data={occupancyChartData} 
                options={{
                  ...chartOptions,
                  scales: { ...chartOptions.scales, y: { ...chartOptions.scales.y, beginAtZero: true, max: 100 } }
                }} 
              />
            </div>
          </>
        )}

        {activeTab === "ingresos" && (
          <>
            <h2>Ingresos</h2>
            <div className={styles.filters}>
              <label>
                Período:
                <select
                  className={styles.periodSelect}
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as "day" | "week" | "month")}
                >
                  <option value="day">Día</option>
                  <option value="week">Semana</option>
                  <option value="month">Mes</option>
                </select>
              </label>
            </div>
            <div className={styles.chartContainer}>
              <Bar 
                data={incomeChartData} 
                options={{
                  ...chartOptions,
                  scales: { ...chartOptions.scales, y: { ...chartOptions.scales.y, beginAtZero: true } }
                }} 
              />
            </div>
          </>
        )}

        {activeTab === "horas" && (
          <>
            <h2>Horas Pico</h2>
            <div className={styles.chartContainer}>
              <Bar 
                data={peakHoursChartData} 
                options={{
                  ...chartOptions,
                  scales: { ...chartOptions.scales, y: { ...chartOptions.scales.y, beginAtZero: true } }
                }} 
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AnalyticDashboard;