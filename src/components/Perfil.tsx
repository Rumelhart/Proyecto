import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../credenciales';
import NavCliente from './navcliente';
import '../Perfil.css';

interface PerfilProps {
  correoUsuario: string;
}

const Perfil: React.FC<PerfilProps> = ({ correoUsuario }) => {
  const [nombre, setNombre] = useState<string>('');
  const [telefono, setTelefono] = useState<string>('');
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoURL, setFotoURL] = useState<string>('');
  const [mensaje, setMensaje] = useState<string | null>(null);

  const obtenerDatosUsuario = async () => {
    try {
      const usuarioQuery = query(collection(db, 'users'), where('email', '==', correoUsuario));
      const querySnapshot = await getDocs(usuarioQuery);
      if (!querySnapshot.empty) {
        const usuarioDoc = querySnapshot.docs[0];
        const datosUsuario = usuarioDoc.data();
        setNombre(datosUsuario.nombre || '');
        setTelefono(datosUsuario.telefono || '');
        if (datosUsuario.fotoURL) {
          setFotoURL(datosUsuario.fotoURL);
        }
      }
    } catch (error) {
      console.error("Error al obtener datos del usuario:", error);
    }
  };

  useEffect(() => {
    obtenerDatosUsuario();
  }, []);

  const handleNombreChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNombre(event.target.value);
  };

  const handleTelefonoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTelefono(event.target.value);
  };

  const handleFotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFoto(event.target.files[0]);
    }
  };

  const guardarCambios = async () => {
    try {
      const usuarioQuery = query(collection(db, 'users'), where('email', '==', correoUsuario));
      const querySnapshot = await getDocs(usuarioQuery);
      if (!querySnapshot.empty) {
        const usuarioDoc = querySnapshot.docs[0];
        
        let fotoURLUpdated = fotoURL;
        if (foto) {
          const storage = getStorage();
          const storageRef = ref(storage, `user_profiles/${correoUsuario}`);
          await uploadBytes(storageRef, foto);
          fotoURLUpdated = await getDownloadURL(storageRef);
        }

        await updateDoc(usuarioDoc.ref, {
          nombre: nombre,
          telefono: telefono,
          fotoURL: fotoURLUpdated
        });

        console.log("Datos actualizados en Firestore:", nombre, telefono, fotoURLUpdated);
        setMensaje("Datos actualizados correctamente");
      } else {
        console.error("Usuario no encontrado en la base de datos.");
      }
    } catch (error) {
      console.error("Error al guardar cambios:", error);
      setMensaje("Error al guardar los cambios. Inténtalo de nuevo más tarde.");
    }
  };

  return (
    <div className="perfil-container">
        <NavCliente />
        <h1>Bienvenido a tu perfil</h1>
        {fotoURL && <img className="profile-pic" src={fotoURL} alt="Foto de perfil" />}
        <p className="email">Correo electrónico: {correoUsuario}</p>
        <div className="form-group">
            <label htmlFor="nombre">Nombre:</label>
            <input type="text" id="nombre" value={nombre} onChange={handleNombreChange} />
        </div>
        <div className="form-group">
            <label htmlFor="telefono">Teléfono:</label>
            <input type="text" id="telefono" value={telefono} onChange={handleTelefonoChange} />
        </div>
        <div className="form-group">
            <label htmlFor="foto">Foto de perfil:</label>
            <input type="file" id="foto" onChange={handleFotoChange} />
        </div>
        <button className="btn-save" onClick={guardarCambios}>Guardar Cambios</button>
        {mensaje && <p className={mensaje.includes('error') ? 'mensaje-error' : 'mensaje-exito'}>{mensaje}</p>}
    </div>
);
}

export default Perfil;
