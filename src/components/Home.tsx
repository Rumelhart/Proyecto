import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { useHistory } from 'react-router-dom';
import appFirebase from '../credenciales';
import { getAuth, signOut } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestore, addDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import BusquedaVehiculoPagado from './BusquedaVehiculo';
import NavAdmin from './navadmin'; 
import '../home.css';

const db = getFirestore(appFirebase);
const auth = getAuth(appFirebase);
const storage = getStorage(appFirebase);

const sessionTimeout = 3000000;

interface HomeProps {
  correoUsuario: string;
}

interface LugarEstacionamiento {
  bloque: string; // 'A' o 'D'
  numero: number;
  placa: string | null;
}

/**
 * Aplica un zoom del 115% centrado sobre la imagen original.
 * Devuelve un DataURL listo para Google Vision.
 */
async function aplicarZoomDataUrl(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const zoomF = 1.2;      // 20% de zoom
      const w0 = img.width, h0 = img.height;
      const w1 = w0 / zoomF, h1 = h0 / zoomF;
      const dx = (w0 - w1) / 2, dy = (h0 - h1) / 2;

      // Canvas al tamaño original
      const canvas = document.createElement('canvas');
      canvas.width = w0;
      canvas.height = h0;
      const ctx = canvas.getContext('2d')!;

      // Suavizado de alta calidad
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Recorta el centro y estira de vuelta al tamaño original
      ctx.drawImage(
        img,
        dx, dy, w1, h1,  // área fuente recortada
        0, 0, w0, h0     // área destino (tamaño full)
      );

      resolve(canvas.toDataURL('image/jpeg'));
    };
    img.onerror = () => reject(new Error('Error cargando DataURL para zoom'));
    img.src = dataUrl;
  });
}



const Home: React.FC<HomeProps> = ({ correoUsuario }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeComponent, setActiveComponent] = useState('home');
  const history = useHistory();
  const [image, setImage] = useState<File | null>(null);
  const [textResult, setTextResult] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [registrationMessage, setRegistrationMessage] = useState('');
  const [lastAssignedBlock, setLastAssignedBlock] = useState<'A' | 'D'>('A');
  const [zoomPreviewUrl, setZoomPreviewUrl] = useState<string | null>(null);


  const [lugares, setLugares] = useState<LugarEstacionamiento[]>([
    ...Array.from({ length: 50 }, (_, i) => ({ bloque: 'A', numero: i + 1, placa: null })),
    ...Array.from({ length: 50 }, (_, i) => ({ bloque: 'D', numero: i + 1, placa: null })),
  ]);

  // Cargar lugares activos al iniciar
  useEffect(() => {
    const cargarLugaresActivos = async () => {
      const q = query(collection(db, "textRecords"), where("estado", "==", "activo"));
      const snapshot = await getDocs(q);
  
      const lugaresActualizados = [
        ...Array.from({ length: 50 }, (_, i) => ({ bloque: 'A', numero: i + 1, placa: null })),
        ...Array.from({ length: 50 }, (_, i) => ({ bloque: 'D', numero: i + 1, placa: null })),
      ];
  
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.bloque && data.lugar) {
          const index = lugaresActualizados.findIndex(
            l => l.bloque === data.bloque && l.numero === data.lugar
          );
          if (index !== -1) {
            lugaresActualizados[index].placa = data.placa;
          }
        }
      });
  
      setLugares(lugaresActualizados);
    };
  
    cargarLugaresActivos();
  }, []);
  

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleMenuClick = (component: string) => {
    setActiveComponent(component);
    setIsMenuOpen(false);
  };

async function uploadImageAndGetURL(imageFile: File): Promise<string | null> {
  const storageRef = ref(storage, `images/${imageFile.name}`);
  try {
    await uploadBytes(storageRef, imageFile);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error("Error al subir la imagen:", error);
    return null;
  }
}

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const checkIfPlacaExists = async (placa: string): Promise<boolean> => {
    const placasRef = collection(db, "textRecords");
    const q = query(
      placasRef, 
      where("placa", "==", placa),
      where("estado", "==", "activo")
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  };

  const saveTextResult = async (placa: string, imageUrl: string) => {
    if (!correoUsuario) return;
  
    try {
      const placaActiva = await checkIfPlacaExists(placa);
      if (placaActiva) {
        setRegistrationMessage('Esta placa ya está registrada.');
        return;
      }
  
      
      let bloqueAsignado = lastAssignedBlock === 'A' ? 'A' : 'D';
  
      // Buscar primer lugar libre
      let lugarLibre = lugares.find(l => l.bloque === bloqueAsignado && !l.placa);
  
      // Si no hay lugar en el bloque asignado busca en otro bloque
      if (!lugarLibre) {
        bloqueAsignado = bloqueAsignado === 'A' ? 'D' : 'A'; // Alternar el bloque
        lugarLibre = lugares.find(l => l.bloque === bloqueAsignado && !l.placa);
      }
  
      if (!lugarLibre) {
        setRegistrationMessage("¡No hay lugares disponibles!");
        return;
      }
  
      const { numero } = lugarLibre;
  
      await addDoc(collection(db, "textRecords"), {
        placa,
        imageUrl,
        user: correoUsuario,
        lugar: numero,
        bloque: bloqueAsignado,
        estado: "activo",
        timestamp: new Date()
      });
  
      setLugares(prev => prev.map(l =>
        l.bloque === bloqueAsignado && l.numero === numero ? { ...l, placa } : l
      ));
  

      setLastAssignedBlock(bloqueAsignado === 'A' ? 'D' : 'A');
  
      setRegistrationMessage(`✅ Placa ${placa} en BLOQUE ${bloqueAsignado} LUGAR ${numero}`);
    } catch (error) {
      console.error("Error:", error);
      setRegistrationMessage("❌ Error al registrar");
    }
  };
  

  const liberarLugar = async (bloque: string, numeroLugar: number) => {
    try {
      const q = query(
        collection(db, "textRecords"),
        where("bloque", "==", bloque),
        where("lugar", "==", numeroLugar),
        where("estado", "==", "activo")
      );
      const snapshot = await getDocs(q);
  
      if (snapshot.empty) {
        alert("Este lugar ya está libre");
        return;
      }
  
      await updateDoc(snapshot.docs[0].ref, { estado: "inactivo" });
  
      setLugares(prev => prev.map(l => 
        l.bloque === bloque && l.numero === numeroLugar ? {...l, placa: null} : l
      ));
  
      setRegistrationMessage(`Lugar ${bloque} ${numeroLugar} liberado`);
    } catch (error) {
      console.error("Error al liberar lugar:", error);
    }
  };
  
 async function enviarAGoogleVision(base64Image: string): Promise<string> {
    const apiUrl = 'https://vision.googleapis.com/v1/images:annotate';
    const apiKey = 'AIzaSyDdCd5Qc7PMWa-aVaBopVDhlWuSqs1RW7g';
    const body = {
    requests: [
      {
        image: { content: base64Image },
        features: [{ type: 'TEXT_DETECTION' }]
      }
    ]
  };
  const res = await fetch(`${apiUrl}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  return data.responses[0]?.fullTextAnnotation?.text || '';
}

const handleSubmit = async () => {
  if (!image) {
    alert('Carga una imagen primero.');
    return;
  }


  const reader = new FileReader();
  reader.readAsDataURL(image);
  reader.onloadend = async () => {
    const dataUrl = reader.result as string;       
    const base64Local = dataUrl.split(',')[1];     

    try {
   
      const zoomDataUrl = await aplicarZoomDataUrl(dataUrl);
      const zoomBase64 = zoomDataUrl.split(',')[1];
      setZoomPreviewUrl(zoomDataUrl);

    
      const resultText = await enviarAGoogleVision(zoomBase64);


      const placaResult = extractPlaca(resultText);
      if (placaResult) {
        setTextResult(placaResult);

        const imageURL = await uploadImageAndGetURL(image);
        if (imageURL) {
          await saveTextResult(placaResult, imageURL);
        } else {
          setRegistrationMessage('Error al subir imagen original.');
        }
      } else {
        setRegistrationMessage('No se encontró una placa válida.');
      }
    } catch (err) {
      console.error('Error procesando imagen:', err);
      setRegistrationMessage('Error al procesar la imagen.');
    }
  };
};



  const extractPlaca = (text: string): string | null => {
    const regex = /\b([A-Z]{3}[-\s]?[0-9]{3})\b/gi;
    const matches = text.match(regex);
    return matches ? matches[0].replace(/[-\s]/g, '').toUpperCase() : null;
  };

  const iniciarConteoInactividad = useCallback(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    const id = setTimeout(() => signOut(auth), sessionTimeout);
    setTimeoutId(id);
  }, [timeoutId]);

  useEffect(() => {
    const reiniciarConteoInactividad = () => {
      iniciarConteoInactividad();
    };

    window.addEventListener('mousemove', reiniciarConteoInactividad);
    window.addEventListener('keydown', reiniciarConteoInactividad);
    window.addEventListener('scroll', reiniciarConteoInactividad);

    return () => {
      window.removeEventListener('mousemove', reiniciarConteoInactividad);
      window.removeEventListener('keydown', reiniciarConteoInactividad);
      window.removeEventListener('scroll', reiniciarConteoInactividad);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [iniciarConteoInactividad, timeoutId]);

  const handleSignOut = async () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    try {
      await signOut(auth);
      console.log("Sesión cerrada exitosamente");
      history.push('/');
    } catch (error) {
      console.error("Error cerrando sesión", error);
    }
  };


  return (
    <div className="home-container">
      <NavAdmin />
      <div className="home-content">
        {activeComponent === 'home' && (
          <div className="home-upload-container">
            <div className="home-header">
              <h2>Bienvenido {correoUsuario}</h2>
            </div>
            
            {image && (
              <img 
                src={previewUrl!} 
                alt="Vista previa de placa" 
                className="home-image-preview" 
              />
            )}
            
            {registrationMessage && (
              <div className={`home-registration-message ${
                registrationMessage.includes('registrada') || registrationMessage.includes('✅') 
                  ? 'success' 
                  : 'error'
              }`}>
                {registrationMessage}
              </div>
            )}
            
            <input 
              type="file" 
              id="fileInput"
              accept="image/*" 
              onChange={handleImageChange}
              className="home-file-input"
            />
            
            <label 
              htmlFor="fileInput" 
              className="home-file-label"
            >
              {image ? 'Cambiar Imagen' : 'Seleccionar Imagen'}
            </label>
            
            {image && (
              <button 
                className="home-upload-btn"
                onClick={handleSubmit}
              >
                Procesar Placa
              </button>
            )}
          </div>
        )}
        
        {activeComponent === 'admin' && (
          <div className="busqueda-placa-container">
            <BusquedaVehiculoPagado />
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;