import React, { useState } from 'react';
import { getAuth, signOut } from "firebase/auth";
import { useHistory } from 'react-router-dom';
import "../AdminPanel.css"; 
import { isPlatform } from '@ionic/react';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

const NavAdmin: React.FC = () => {
  const [menuVisible, setMenuVisible] = useState(false);
  const auth = getAuth();
  const history = useHistory();

  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
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

  return (
    <div className="hamburguesa-menu">
      <div className="hamburguesa-menu-icon" onClick={toggleMenu}>
        &#9776;
      </div>
      <ul className={`hamburguesa-menu-links ${menuVisible ? 'show' : ''}`}>
        <li><a href="/admin">Inicio</a></li>
        <li><a href="/cars">Gestión de Vehiculos</a></li>
        <li><a href="/admiusers">Gestión de Usuarios</a></li>
        <li><a href="/admiparking">Gestión de Estacionamiento</a></li>
        <li><a href="/analytic">Analisis de datos</a></li>
        <li><a onClick={handleSignOut}>Salir</a></li>
      </ul>
    </div>
  );
};

export default NavAdmin;
