import React, { useState } from 'react';
import { getAuth, signOut } from "firebase/auth";
import { useHistory } from 'react-router-dom';
import "../navcliente.css";
import { isPlatform } from '@ionic/react'; 
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth'; 

const NavCliente: React.FC = () => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [selected, setSelected] = useState<string | null>(null); 
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

  const handleMenuItemClick = (item: string) => {
    setSelected(item);
    setMenuVisible(false); 
  };

  return (
    <div className="hamburguesa-menu">
      <div className="hamburguesa-menu-icon" onClick={toggleMenu}>
        &#9776;
      </div>
      <ul className={`hamburguesa-menu-links ${menuVisible ? 'show' : ''}`}>
        <li>
          <a 
            href="/cliente" 
            className={selected === 'Inicio' ? 'selected' : ''} 
            onClick={() => handleMenuItemClick('Inicio')}
          >
            Inicio
          </a>
        </li>
        <li>
          <a 
            href="/perfil" 
            className={selected === 'Perfil' ? 'selected' : ''} 
            onClick={() => handleMenuItemClick('Perfil')}
          >
            Perfil
          </a>
        </li>
        <li>
          <a 
            href="/pagocliente"
            className={selected === 'Pagos' ? 'selected' : ''} 
            onClick={() => handleMenuItemClick('Pagos')}
          >
            Pagos
          </a>
        </li>
        <li>
          <a 
            onClick={() => {
              handleMenuItemClick('Salir');
              handleSignOut();
            }}
            className={selected === 'Salir' ? 'selected' : ''}
          >
            Salir
          </a>
        </li>
      </ul>
    </div>
  );
};

export default NavCliente;
