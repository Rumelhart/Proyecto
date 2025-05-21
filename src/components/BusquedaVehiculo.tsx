import React, { useState, useEffect } from "react";
import { collection, getDocs, DocumentData } from "firebase/firestore";
import { db } from '../credenciales';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import '../BusquedaVehiculo.css';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import NavAdmin from './navadmin'; 

interface Vehiculo {
    placa: string;
    imageUrl?: string;
    fechaPago: Date;
    costoPagadoCOP: number;
    costoPagadoUSD: number;
    pagado: boolean;
    emailPagador: string;
    idTransaccion: string;
    docId: string;
}

const BusquedaVehiculoPagado: React.FC = () => {
    const [searchText, setSearchText] = useState<string>('');
    const [resultados, setResultados] = useState<Vehiculo[]>([]);
    const [datosOriginales, setDatosOriginales] = useState<Vehiculo[]>([]);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const itemsPerPage = 6;

    useEffect(() => {
        const cargarVehiculosPagados = async () => {
            const querySnapshot = await getDocs(collection(db, "vehiculosPagados"));
            const vehiculos: Vehiculo[] = [];
            querySnapshot.forEach((doc: DocumentData) => {
                const data = doc.data();
                const fechaPago = data.fechaPago ? new Date(data.fechaPago.toDate()) : new Date();
                vehiculos.push({ ...data, docId: doc.id, fechaPago });
            });
            setResultados(vehiculos);
            setDatosOriginales(vehiculos);
        };

        cargarVehiculosPagados();
    }, []);

    const buscarVehiculo = (text: string) => {
        if (text) {
            const textoBusqueda = text.toLowerCase();
            const filtrados = datosOriginales.filter((vehiculo: Vehiculo) =>
                vehiculo.placa.toLowerCase().includes(textoBusqueda) ||
                (vehiculo.idTransaccion && vehiculo.idTransaccion.toLowerCase().includes(textoBusqueda))
            );
            setResultados(filtrados);
            setCurrentPage(1);  // Resetear a la primera página al hacer una nueva búsqueda
        } else {
            setResultados(datosOriginales);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchText(e.target.value);
        buscarVehiculo(e.target.value);
    };

    const handlePreviousPage = () => {
        setCurrentPage(prevPage => Math.max(prevPage - 1, 1));
    };

    const handleNextPage = () => {
        const maxPage = Math.ceil(resultados.length / itemsPerPage);
        setCurrentPage(prevPage => Math.min(prevPage + 1, maxPage));
    };

    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentResults = resultados.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="busqueda-vehiculos-container"> {/* Cambiado aquí */}
          <NavAdmin /> 
          <h1 className="titulo-busqueda">Busqueda de vehiculos</h1>
          <div className="search-container">
                <input 
                    type="text" 
                    value={searchText} 
                    onChange={handleChange} 
                    placeholder="Buscar placa o ID de transacción..." 
                    className="search-input"
                />
                <div className="result-container">
                    {currentResults.map((vehiculo: Vehiculo, index: number) => (
                        <div key={index} className="list-container">
                            <div className="list-item">
                                {/* Contenedor de la imagen */}
                                <div className="image-container">
                                    <img src={vehiculo.imageUrl || 'path/to/default/image.jpg'} alt={`Vehículo con placa ${vehiculo.placa}`} />
                                </div>
                                <div className="details">
                                    <p><strong>Placa:</strong> {vehiculo.placa}</p>
                                    <p><strong>Fecha de Pago:</strong> {format(vehiculo.fechaPago, 'PPPpp', { locale: es })}</p>
                                    <p><strong>Costo Pagado en COP:</strong> ${vehiculo.costoPagadoCOP}</p>
                                    <p><strong>Costo Pagado en USD:</strong> ${vehiculo.costoPagadoUSD}</p>
                                    <p><strong>Pagado:</strong> {vehiculo.pagado ? 'Sí' : 'No'}</p>
                                    <p><strong>Email del Pagador:</strong> {vehiculo.emailPagador}</p>
                                    <p><strong>ID de Transacción:</strong> {vehiculo.idTransaccion}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="pagination">
                    <button onClick={handlePreviousPage} disabled={currentPage === 1}>
                        <FaArrowLeft /> {/* Flecha hacia la izquierda */}
                    </button>
                    <span>Página {currentPage}</span>
                    <button onClick={handleNextPage} disabled={currentResults.length < itemsPerPage}>
                        <FaArrowRight /> {/* Flecha hacia la derecha */}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default BusquedaVehiculoPagado;