import React, { useState, useEffect, ChangeEvent } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../credenciales';
import '../AdminParking.css';
import NavAdmin from './navadmin';

interface Registro {
  docId: string;
  placa: string;
  timestamp: Date;
  imageUrl?: string;
  bloque?: string;
  lugar?: number;
}

interface ParkingSpot {
  bloque: string;
  numero: number;
  placa?: string;
  timestamp?: Date;
  docId?: string;
}

interface ParkingMapProps {
  spots: ParkingSpot[];
  onSpotClick?: (spot: ParkingSpot) => void;
  selectedSpot?: ParkingSpot | null;
}

const ParkingMap: React.FC<ParkingMapProps> = ({ spots, onSpotClick, selectedSpot }) => {
  const parkingConfig = [
    { bloque: 'A', total: 50, filas: 5, columnas: 10 },
    { bloque: 'D', total: 50, filas: 5, columnas: 10 }
  ];

  return (
    <div className="parking-map-admin">
      {parkingConfig.map((block) => (
        <div key={block.bloque} className="parking-block-admin">
          <h3>Bloque {block.bloque}</h3>
          <div className="spots-grid-admin" style={{
            gridTemplateColumns: `repeat(${block.columnas}, 1fr)`
          }}>
            {Array.from({ length: block.total }, (_, i) => {
              const spotNumber = i + 1;
              const spotData = spots.find(s => s.bloque === block.bloque && s.numero === spotNumber);
              const isOccupied = !!spotData;
              const isSelected = selectedSpot?.docId === spotData?.docId;
              
              return (
                <div
                  key={`${block.bloque}${spotNumber}`}
                  className={`spot-admin ${
                    isSelected ? 'selected-spot' : 
                    isOccupied ? 'occupied-spot' : 'available-spot'
                  }`}
                  onClick={() => isOccupied && onSpotClick?.(spotData)}
                  title={isOccupied ? 
                    `Placa: ${spotData.placa}\nHora: ${spotData.timestamp?.toLocaleTimeString()}` : 
                    'Disponible'}
                >
                  <span className="spot-number-admin">
                    {block.bloque}{spotNumber}
                  </span>
                  {isOccupied && <span className="spot-placa-admin">{spotData.placa}</span>}
                  {isSelected && <div className="spot-selected-indicator"></div>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

const AdminParking: React.FC = () => {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [filtroPlaca, setFiltroPlaca] = useState<string>('');
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [showMap, setShowMap] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'selected'>('all');

  useEffect(() => {
    const cargarRegistros = async () => {
      const querySnapshot = await getDocs(collection(db, 'textRecords'));
      const registros: Registro[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.placa) {
          registros.push({
            ...data,
            docId: doc.id,
            timestamp: new Date(data.timestamp?.toDate()),
          } as Registro);
        }
      });
      setRegistros(registros);
    };
    cargarRegistros();
  }, []);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFiltroPlaca(event.target.value.toUpperCase());
  };

  const registrosFiltrados = registros.filter((reg) =>
    reg.placa.includes(filtroPlaca)
  );

  const openModal = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const parkingSpots: ParkingSpot[] = registros.map(reg => ({
    bloque: reg.bloque || 'A',
    numero: reg.lugar || 0,
    placa: reg.placa,
    timestamp: reg.timestamp,
    docId: reg.docId
  }));

  const handleSpotClick = (spot: ParkingSpot) => {
    setSelectedSpot(spot);
    setFiltroPlaca(spot.placa || '');
  };

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'all' ? 'selected' : 'all');
  };

  const filteredSpots = viewMode === 'selected' && selectedSpot ? 
    [selectedSpot] : 
    parkingSpots;

  return (
    <div className="admin-parking-container">
      <NavAdmin />
      <h1>Vehículos en el Estacionamiento</h1>
      
      <div className="admin-controls">
        <input
          type="text"
          value={filtroPlaca}
          onChange={handleInputChange}
          placeholder="Buscar por placa"
          className="admin-parking-search"
        />
        <button 
          className="toggle-map-button"
          onClick={() => setShowMap(!showMap)}
        >
          {showMap ? 'Ocultar Mapa' : 'Ver Mapa Completo'}
        </button>
        {showMap && (
          <button 
            className="view-mode-button"
            onClick={toggleViewMode}
            disabled={!selectedSpot}
          >
            {viewMode === 'all' ? 'Ver Solo Seleccionado' : 'Ver Todos'}
          </button>
        )}
      </div>

      {showMap ? (
        <div className="map-view-container">
          <ParkingMap 
            spots={filteredSpots} 
            onSpotClick={handleSpotClick}
            selectedSpot={selectedSpot}
          />
          {selectedSpot && (
            <div className="selected-vehicle-info">
              <h3>Vehículo Seleccionado</h3>
              <p><strong>Placa:</strong> {selectedSpot.placa}</p>
              <p><strong>Ubicación:</strong> Bloque {selectedSpot.bloque}, Lugar {selectedSpot.numero}</p>
              <p><strong>Hora de ingreso:</strong> {selectedSpot.timestamp?.toLocaleString()}</p>
              <button 
                className="focus-vehicle-button"
                onClick={() => setViewMode('selected')}
                disabled={viewMode === 'selected'}
              >
                Enfocar en Mapa
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="admin-parking-list">
          {registrosFiltrados.length > 0 ? (
            registrosFiltrados.map((reg) => (
              <div 
                key={reg.docId} 
                className={`admin-parking-item ${selectedSpot?.docId === reg.docId ? 'selected-item' : ''}`}
                onClick={() => {
                  const spot = {
                    bloque: reg.bloque || 'A',
                    numero: reg.lugar || 0,
                    placa: reg.placa,
                    timestamp: reg.timestamp,
                    docId: reg.docId
                  };
                  setSelectedSpot(spot);
                  setShowMap(true);
                }}
              >
                {reg.imageUrl && (
                  <div className="admin-parking-image-container" onClick={(e) => {
                    e.stopPropagation();
                    openModal(reg.imageUrl!);
                  }}>
                    <img src={reg.imageUrl} alt="Vehículo" className="admin-parking-image" />
                    <div className="admin-parking-zoom-icon"></div>
                  </div>
                )}
                <div className="vehicle-info-admin">
                  <p><strong>Placa:</strong> {reg.placa}</p>
                  <p><strong>Ubicación:</strong> Bloque {reg.bloque || 'A'}, Lugar {reg.lugar || 'N/A'}</p>
                  <p><strong>Hora de ingreso:</strong> {reg.timestamp.toLocaleString()}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="admin-parking-empty">No hay vehículos que coincidan con la búsqueda.</p>
          )}
        </div>
      )}

      {modalOpen && (
        <div className="admin-parking-modal" onClick={closeModal}>
          <div className="admin-parking-modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-modal-button" onClick={closeModal}>×</button>
            <img src={selectedImage} alt="Imagen ampliada" className="admin-parking-modal-image" />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminParking;