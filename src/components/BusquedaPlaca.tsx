import React, { useState, useEffect, ChangeEvent } from "react";
import { collection, getDocs, doc, deleteDoc, setDoc, getDoc } from "firebase/firestore";
import { db } from '../credenciales';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import '../BusquedaPlaca.css';
import axios from 'axios';
import { getAuth } from "firebase/auth";
import { useLocation } from "react-router-dom";
import { calculateCostNumeric } from './utils';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';

interface Registro {
  docId: string;
  placa: string;
  timestamp: Date;
  imageUrl?: string;
  lugar?: number;
  bloque?: string;
}

interface ParkingSpot {
  bloque: string;
  numero: number;
}

const ParkingMap: React.FC<{ activeSpot?: ParkingSpot }> = ({ activeSpot }) => {
  const generateSpots = (bloque: string, total: number) => {
    return Array.from({ length: total }, (_, i) => ({ bloque, numero: i + 1 }));
  };

  return (
    <div className="parking-map-wrapper">
      <div className="parking-map-container">
        {/* Bloque A */}
        <div className="parking-block">
          <h3 className="block-title">Bloque A</h3>
          <div className="spots-grid">
            {generateSpots('A', 50).map((spot) => (
              <div
                key={`A${spot.numero}`}
                className={`parking-spot ${
                  activeSpot?.bloque === 'A' && activeSpot?.numero === spot.numero ? 'active-spot' : ''
                }`}
              >
                <span className="spot-number">A{spot.numero}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bloque D */}
        <div className="parking-block">
          <h3 className="block-title">Bloque D</h3>
          <div className="spots-grid">
            {generateSpots('D', 50).map((spot) => (
              <div
                key={`D${spot.numero}`}
                className={`parking-spot ${
                  activeSpot?.bloque === 'D' && activeSpot?.numero === spot.numero ? 'active-spot' : ''
                }`}
              >
                <span className="spot-number">D{spot.numero}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// moverYEliminarRegistro sin hooks dentro
const moverYEliminarRegistro = async (
  docId: string,
  cantidadPagadaCOP: number,
  cantidadPagadaUSD: number,
  transactionId: string | null
) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.error("No hay usuario autenticado");
    return;
  }
  const originalDocRef = doc(db, "textRecords", docId);
  const destinoDocRef = doc(db, "vehiculosPagados", docId);
  try {
    const docSnap = await getDoc(originalDocRef);
    if (docSnap.exists()) {
      await setDoc(destinoDocRef, {
        ...docSnap.data(),
        pagado: true,
        fechaPago: new Date(),
        costoPagadoCOP: cantidadPagadaCOP,
        costoPagadoUSD: cantidadPagadaUSD,
        pagadoPor: currentUser.uid,
        emailPagador: currentUser.email,
        idTransaccion: transactionId
      });
      await deleteDoc(originalDocRef);
    }
  } catch (error) {
    console.error("Error al mover documento:", error);
  }
};

interface VerificarPagoProps {
  todosRegistros: Registro[];
}

const VerificarPago: React.FC<VerificarPagoProps> = ({ todosRegistros }) => {
  const location = useLocation();
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const status = query.get("status");
    const docId = query.get("external_reference");
    const transactionId = query.get("payment_id");
    if (status === "approved" && docId && docId !== "null") {
      const registro = todosRegistros.find(reg => reg.docId === docId);
      if (registro) {
        const cantidadPagadaCOP = calculateCostNumeric(registro.timestamp);
        const cantidadPagadaUSD = parseFloat(query.get("amountInUSD") || "0");
        moverYEliminarRegistro(docId, cantidadPagadaCOP, cantidadPagadaUSD, transactionId);
      }
    }
  }, [location, todosRegistros]);
  return null;
};

const BusquedaPlaca: React.FC = () => {
  const [placa, setPlaca] = useState<string>('');
  const [resultados, setResultados] = useState<Registro[]>([]);
  const [todosRegistros, setTodosRegistros] = useState<Registro[]>([]);
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<Registro | null>(null);
  const [mostrarMapa, setMostrarMapa] = useState(false);
  const [amountUSD, setAmountUSD] = useState<string>('');
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 3;

  useEffect(() => {
    const cargarRegistros = async () => {
      const querySnapshot = await getDocs(collection(db, "textRecords"));
      const registros: Registro[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          docId: doc.id,
          timestamp: data.timestamp?.toDate() || new Date(),
          lugar: data.lugar || 0,
          bloque: data.bloque || 'A'
        } as Registro;
      });
      setTodosRegistros(registros);
      setResultados(registros.slice(0, 10));
    };
    cargarRegistros();
  }, []);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.toUpperCase();
    setPlaca(value);
    const filtered = value === ''
      ? todosRegistros
      : todosRegistros.filter(reg => reg.placa.includes(value));
    setResultados(filtered.slice(0, 10));
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentResults = resultados.slice(startIndex, startIndex + itemsPerPage);
  const handlePreviousPage = () => setCurrentPage(p => Math.max(p - 1, 1));
  const handleNextPage = () => setCurrentPage(p => Math.min(p + 1, Math.ceil(resultados.length / itemsPerPage)));

  const handleBuy = async (registro: Registro) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;
      const response = await axios.post("https://us-central1-estacionamientou-e505d.cloudfunctions.net/api/create_payment", {
        amountCOP: calculateCostNumeric(registro.timestamp)
      });
      setPaypalOrderId(response.data.id);
      setAmountUSD(response.data.amountInUSD);
    } catch (error) {
      console.error("Error en pago:", error);
    }
  };

  const seleccionarVehiculo = async (registro: Registro) => {
    setVehiculoSeleccionado(registro);
    await handleBuy(registro);
  };

  const formatDuration = (timestamp: Date) => {
    const minutes = Math.floor((Date.now() - timestamp.getTime()) / 60000);
    return `${minutes} minutos`;
  };

  return (
    <div className="containercliente">
      <h1>Buscar por Placa</h1>
      <input
        type="text"
        value={placa}
        onChange={handleInputChange}
        placeholder="Ingrese la placa"
        className="search-input"
      />
      <div className="list-container">
        {currentResults.map(reg => (
          <div
            key={reg.docId}
            className={`list-item ${vehiculoSeleccionado?.docId === reg.docId ? 'selected' : ''}`}
            onClick={() => seleccionarVehiculo(reg)}
          >
            {reg.imageUrl && (
              <div className="image-wrapper">
                <img src={reg.imageUrl} alt="Vehículo" className="vehicle-image" />
              </div>
            )}
            <div className="vehicle-info">
              <div className="info-row"><span className="label">Placa:</span> <span className="value">{reg.placa}</span></div>
              <div className="info-row"><span className="label">Lugar:</span> <span className="value">{reg.bloque}{reg.lugar}</span></div>
              <div className="info-row"><span className="label">Entrada:</span> <span className="value">{format(reg.timestamp, 'dd/MM/yyyy HH:mm', { locale: es })}</span></div>
              <div className="info-row"><span className="label">Tiempo:</span> <span className="value">{formatDuration(reg.timestamp)}</span></div>
              <div className="info-row"><span className="label">Costo:</span> <span className="value">${calculateCostNumeric(reg.timestamp)}</span></div>
            </div>
          </div>
        ))}
      </div>
      <div className="pagination-container">
        <button className="pagination-button" onClick={handlePreviousPage} disabled={currentPage === 1}>
          <FaArrowLeft />
        </button>
        <span>Página {currentPage}</span>
        <button className="pagination-button" onClick={handleNextPage} disabled={currentResults.length < itemsPerPage}>
          <FaArrowRight />
        </button>
      </div>
      {/* Botón para mostrar mapa en popup */}
      {vehiculoSeleccionado && (
        <button className="ubicacion-button" onClick={() => setMostrarMapa(true)}>
          Ubicar mi vehículo
        </button>
      )}
      {/* Modal emergente con mapa */}
      {mostrarMapa && vehiculoSeleccionado && (
        <div className="modal-overlay" onClick={() => setMostrarMapa(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <ParkingMap activeSpot={{ bloque: vehiculoSeleccionado.bloque || 'A', numero: vehiculoSeleccionado.lugar || 0 }} />
            <button className="cerrar-modal-button" onClick={() => setMostrarMapa(false)}>
              Cerrar
            </button>
          </div>
        </div>
      )}
      {/* Botón PayPal centrado */}
      {vehiculoSeleccionado && paypalOrderId && (
        <div className="paypal-button-wrapper">
          <PayPalScriptProvider options={{ 
            clientId: "AcGs_32-5U0VRjwqT1lVdwfyDRYtuP5satCz_BQOfzZnvohImbNYxCVitT2_2I7Yr_eBc60EGGZAB2um",
            locale: "es_ES"
          }}>
            <PayPalButtons
              createOrder={(_, actions) => actions.order.create({
                intent: "CAPTURE",
                purchase_units: [{
                  amount: {
                    currency_code: "USD",
                    value: amountUSD
                  }
                }]
              })}
              onApprove={async (_, actions) => {
                const details = await actions.order!.capture();
                await moverYEliminarRegistro(
                  vehiculoSeleccionado.docId,
                  calculateCostNumeric(vehiculoSeleccionado.timestamp),
                  parseFloat(amountUSD || '0'),
                  details.id || null
                );
                alert("¡Pago exitoso!");
                setTimeout(() => window.location.reload(), 3000);
              }}
              onError={err => { console.error(err); alert("Error en el pago"); }}
            />
          </PayPalScriptProvider>
        </div>
      )}
      <VerificarPago todosRegistros={todosRegistros} />
    </div>
  );
};

export default BusquedaPlaca;
