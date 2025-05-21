import React, { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../credenciales';
import styles from '../PagoCliente.module.css';
import NavCliente from './navcliente';

interface Vehiculo {
  id: string;
  placa: string;
  fechaPago: any;  
  costoPagadoCOP: number;
  imageUrl: string;
}

const PagoCliente: React.FC = () => {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const obtenerVehiculosPagados = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
          console.error('Usuario no autenticado');
          return;
        }

        const vehiculosRef = collection(db, 'vehiculosPagados');
        const q = query(vehiculosRef, where('emailPagador', '==', user.email));
        const querySnapshot = await getDocs(q);

        const datos = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Vehiculo[];

       
        const vehiculosOrdenados = datos.sort((a, b) => {
          const fechaA = a.fechaPago.toDate(); 
          const fechaB = b.fechaPago.toDate();
          return fechaB.getTime() - fechaA.getTime(); 
        });

        setVehiculos(vehiculosOrdenados);
      } catch (error) {
        console.error('Error obteniendo vehículos pagados:', error);
      } finally {
        setLoading(false);
      }
    };

    obtenerVehiculosPagados();
  }, []);

  if (loading) {
    return <p>Cargando información...</p>;
  }

  if (vehiculos.length === 0) {
    return <p>No tienes vehículos registrados como pagados.</p>;
  }

  return (
    <div className={styles['pagoCliente-container']}>
      <NavCliente />
      <h2 className={styles['pagoCliente-titulo']}>Vehículos Pagados</h2>
      <ul className={styles['pagoCliente-lista']}>
        {vehiculos.map(vehiculo => (
          <li key={vehiculo.id} className={styles['pagoCliente-item']}>
            <img
              src={vehiculo.imageUrl}
              alt={`Vehículo con placa ${vehiculo.placa}`}
              className={styles['pagoCliente-imagen']}
            />
            <div className={styles['pagoCliente-info']}>
              <p><strong>Placa:</strong> {vehiculo.placa}</p>
              <p><strong>Fecha de Pago:</strong> {
                vehiculo.fechaPago?.toDate().toLocaleDateString('es-CO', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              }</p>
              <p><strong>Costo Pagado (COP):</strong> ${vehiculo.costoPagadoCOP?.toLocaleString('es-CO')}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PagoCliente;
