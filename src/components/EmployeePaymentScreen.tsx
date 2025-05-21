import React, { useState, useEffect, ChangeEvent } from "react";
import { collection, getDocs, doc, deleteDoc, setDoc, getDoc } from "firebase/firestore";
import { db } from '../credenciales';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import '../EmployeePaymentScreen.css';
import { getAuth, signOut } from "firebase/auth";
import { calculateCostNumeric } from './utils';
import { useHistory } from "react-router-dom";
import { isPlatform } from '@ionic/react';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

interface Registro {
  docId: string;
  placa: string;
  timestamp: Date;
  imageUrl?: string;
}

const EmployeePaymentScreen: React.FC = () => {
  const [placa, setPlaca] = useState<string>('');
  const [resultados, setResultados] = useState<Registro[]>([]);
  const [todosRegistros, setTodosRegistros] = useState<Registro[]>([]);
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<Registro | null>(null);
  const history = useHistory();
  const auth = getAuth();

  useEffect(() => {
    cargarRegistros();
  }, []);

  const cargarRegistros = async () => {
    const querySnapshot = await getDocs(collection(db, "textRecords"));
    const registros: Registro[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.placa) {
        const fechaIngreso = data.timestamp ? new Date(data.timestamp.toDate()) : new Date();
        registros.push({
          ...data,
          timestamp: fechaIngreso,
          docId: doc.id,
          placa: data.placa,
          imageUrl: data.imageUrl
        } as Registro);
      }
    });
    setTodosRegistros(registros);
    setResultados(registros.slice(0, 10));
  };

  const moverYEliminarRegistro = async (docId: string, cantidadPagadaCOP: number, cantidadPagadaUSD: number | null, transactionId: string | null) => {
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
        console.log("Documento movido y eliminado con éxito con costos en COP y USD, usuario, email e ID de transacción!");
      } else {
        console.log("No se encontró el documento!");
      }
    } catch (error) {
      console.error("Error al mover y eliminar el documento: ", error);
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value.toUpperCase();
    setPlaca(inputValue);
    if (inputValue === '') {
      setResultados(todosRegistros.slice(0, 10));
    } else {
      const filteredResults = todosRegistros.filter(reg => reg.placa.includes(inputValue));
      setResultados(filteredResults.slice(0, 10));
    }
  };

  const seleccionarVehiculo = (registro: Registro) => {
    setVehiculoSeleccionado(registro);
  };

  const handleConfirmPayment = async () => {
    if (!vehiculoSeleccionado) {
      alert("No se ha seleccionado ningún vehículo.");
      return;
    }

    const cantidadPagadaCOP = calculateCostNumeric(vehiculoSeleccionado.timestamp);

    try {
      await moverYEliminarRegistro(vehiculoSeleccionado.docId, cantidadPagadaCOP, null, null);
      alert("Pago en efectivo registrado con éxito");

      // Actualiza la lista de resultados y todos los registros
      await cargarRegistros(); // Vuelve a cargar los registros actualizados

      setVehiculoSeleccionado(null);
    } catch (error) {
      console.error("Error al registrar el pago: ", error);
      alert("Hubo un error al registrar el pago. Por favor, inténtalo de nuevo.");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);

      if (isPlatform('capacitor')) {
        await GoogleAuth.signOut();
      }

      console.log("Sesión cerrada exitosamente");
      history.push('/');
    } catch (error) {
      console.error("Error cerrando sesión", error);
    }
  };

  const formatDuration = (timestamp: Date) => {
    const now = new Date();
    const difference = now.getTime() - timestamp.getTime();
    const totalMinutes = Math.floor(difference / 60000);
    return `${totalMinutes} minutos`;
  };

  return (
    <div className="eps-container">
      <h1>Procesar Pagos en Efectivo</h1>
      <button onClick={handleSignOut} className="eps-sign-out-button">Cerrar Sesión</button>
      <input
        type="text"
        value={placa}
        onChange={handleInputChange}
        placeholder="Ingrese la placa del vehículo"
        className="eps-input"
      />
      <div className="eps-list-container">
        {resultados.slice(0, 3).map(reg => (
          <div
            key={reg.docId}
            className={`eps-list-item ${vehiculoSeleccionado?.docId === reg.docId ? 'eps-selected' : ''}`}
            onClick={() => seleccionarVehiculo(reg)}
          >
            <div className="eps-image-container">
              {reg.imageUrl && <img src={reg.imageUrl} alt="Imagen del vehículo" className="eps-image" />}
            </div>
            <div className="eps-details">
              <p className="eps-detail-text">Placa: {reg.placa}</p>
              <p className="eps-detail-text">Fecha de Ingreso: {format(reg.timestamp, 'PPPPpppp', { locale: es })}</p>
              <p><strong>Tiempo transcurrido:</strong> {formatDuration(reg.timestamp)}</p>
              <p><strong>Valor a pagar:</strong> ${calculateCostNumeric(reg.timestamp)}</p>
            </div>
          </div>
        ))}
      </div>
      {vehiculoSeleccionado && (
        <div className="eps-confirm-section">
          <h2>Confirmar Pago en Efectivo</h2>
          <p>Placa: {vehiculoSeleccionado.placa}</p>
          <p>Valor a pagar: ${calculateCostNumeric(vehiculoSeleccionado.timestamp)}</p>
          <button onClick={handleConfirmPayment} className="eps-confirm-button">Registrar Pago</button>
        </div>
      )}
    </div>
  );
};

export default EmployeePaymentScreen;
