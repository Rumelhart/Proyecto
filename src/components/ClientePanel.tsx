import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getAuth, signOut } from "firebase/auth";
import { useHistory } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from '../credenciales';
import NavCliente from './navcliente';
import BusquedaPlaca from './BusquedaPlaca';
import styles from '../ClientePanel.module.css'; 

interface ClientePanelProps {
  correoUsuario: string;
}

const ClientePanel: React.FC<ClientePanelProps> = ({ correoUsuario }) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [fotoURL, setFotoURL] = useState('');
  const auth = getAuth();
  const history = useHistory(); 
  const sessionTimeout = 620000; 
  const timeoutId = useRef<NodeJS.Timeout | null>(null);

  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };

  const handleSignOut = useCallback(async () => {
    if (timeoutId.current) clearTimeout(timeoutId.current);
    try {
      await signOut(auth);
      console.log("Sesión cerrada exitosamente");
      history.push('/'); 
    } catch (error) {
      console.error("Error cerrando sesión", error);
    }
  }, [auth, history]);

  const obtenerDatosUsuario = useCallback(async () => {
    try {
      const usuarioQuery = query(collection(db, 'users'), where('email', '==', correoUsuario));
      const querySnapshot = await getDocs(usuarioQuery);
      if (!querySnapshot.empty) {
        const usuarioDoc = querySnapshot.docs[0];
        const datosUsuario = usuarioDoc.data();
        if (datosUsuario.fotoURL) {
          setFotoURL(datosUsuario.fotoURL);
        }
      }
    } catch (error) {
      console.error("Error al obtener datos del usuario:", error);
    }
  }, [correoUsuario]);

  const iniciarConteoInactividad = useCallback(() => {
    if (timeoutId.current) clearTimeout(timeoutId.current);
    timeoutId.current = setTimeout(handleSignOut, sessionTimeout);
  }, [handleSignOut]);

  useEffect(() => {
    const reiniciarConteoInactividad = () => {
      iniciarConteoInactividad();
    };

    window.addEventListener('mousemove', reiniciarConteoInactividad);
    window.addEventListener('keydown', reiniciarConteoInactividad);
    window.addEventListener('scroll', reiniciarConteoInactividad);

    iniciarConteoInactividad();

    return () => {
      window.removeEventListener('mousemove', reiniciarConteoInactividad);
      window.removeEventListener('keydown', reiniciarConteoInactividad);
      window.removeEventListener('scroll', reiniciarConteoInactividad);
      if (timeoutId.current) clearTimeout(timeoutId.current);
    };
  }, [iniciarConteoInactividad]);

  useEffect(() => {
    obtenerDatosUsuario();
  }, [obtenerDatosUsuario]);

  return (
    <div className={styles.clientePanel}>
      <NavCliente />
      {fotoURL && <img src={fotoURL} alt="Foto de perfil" className={styles.perfilFoto} />}
      <h1 className={styles.correo}>¡Hola, {correoUsuario}! Nos alegra verte.</h1>
      <BusquedaPlaca />
    </div>
  );
};

export default ClientePanel;
