import React, { useEffect, useState } from 'react';
import img1 from '../assets/Ulib.png';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithCredential, signOut as firebaseSignOut, sendEmailVerification, sendPasswordResetEmail } from "firebase/auth";
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useHistory } from 'react-router-dom';
import '../Login.css';
import { isPlatform } from '@ionic/react';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import appFirebase, { db } from '../credenciales';
import img2 from '../assets/googlee.png';

declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

const Login: React.FC = () => {
  const auth = getAuth(appFirebase);
  const firestore = db;
  const [registrando, setRegistrando] = useState(false);
  const [mostrarRecuperarContraseña, setMostrarRecuperarContraseña] = useState(false);
  const [emailRecuperacion, setEmailRecuperacion] = useState('');
  const history = useHistory();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const initializeGoogleAPI = () => {
      if (typeof window.google !== 'undefined') {
        window.google.accounts.id.initialize({
          client_id: '805548540766-q9hb7d6vhjs56dniqbh2llandfl4k5eb.apps.googleusercontent.com',
          callback: handleCallbackResponse,
        });
        setIsInitialized(true);
      } else {
        console.error('Google API no está disponible. Volviendo a intentar en 1 segundo.');
        setTimeout(initializeGoogleAPI, 1000);
      }
    };

    if (isPlatform('capacitor')) {
      GoogleAuth.initialize({
        clientId: '805548540766-q9hb7d6vhjs56dniqbh2llandfl4k5eb.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });
      setIsInitialized(true);
    } else {
      initializeGoogleAPI();
    }
  }, []);

  const handleCallbackResponse = async (response: any) => {
    try {
      const credential = GoogleAuthProvider.credential(response.credential);
      const result = await signInWithCredential(auth, credential);
      const user = result.user;
      await handleUserLogin(user);
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Error authenticating with Firebase", error);
    }
  };

  const signInWithGoogle = async () => {
    if (!isInitialized) return;

    try {
      if (isPlatform('capacitor')) {
        const user = await GoogleAuth.signIn();
        const credential = GoogleAuthProvider.credential(user.authentication.idToken);
        const result = await signInWithCredential(auth, credential);
        await handleUserLogin(result.user);
        setIsAuthenticated(true);
      } else {
        window.google.accounts.id.prompt();
      }
    } catch (error) {
      console.error('Error during sign-in', error);
    }
  };

  const handleUserLogin = async (user: any) => {
    const userRef = doc(firestore, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, { email: user.email, role: 'cliente' });
      history.push('/cliente');
    } else {
      const userData = userSnap.data();
      if (userData.role === 'administrador') {
        history.push('/admin');
      } else if (userData.role === 'cliente') {
        history.push('/cliente');
      } else if (userData.role === 'empleado') {
        history.push('/empleado');
      } else {
        console.error("Role not recognized or not set.");
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await firebaseSignOut(auth);

      if (isPlatform('capacitor')) {
        await GoogleAuth.signOut();
      } else {
        const auth2 = window.gapi.auth2.getAuthInstance();
        if (auth2) {
          await auth2.signOut();
          auth2.disconnect();
        }
      }

      console.log("Sesión cerrada exitosamente");
      setIsAuthenticated(false);
      history.push('/');
    } catch (error) {
      console.error("Error cerrando sesión", error);
    }
  };

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'El correo ya está registrado. Por favor, inicia sesión o usa otro correo.';
      case 'auth/weak-password':
        return 'La contraseña debe tener al menos 8 caracteres.';
      case 'auth/invalid-email':
        return 'El correo no tiene un formato válido.';
      case 'auth/user-not-found':
        return 'El correo no está registrado. Por favor, regístrate primero.';
      case 'auth/wrong-password':
        return 'La contraseña es incorrecta. Inténtalo de nuevo.';
      default:
        return 'Ocurrió un error inesperado. Por favor, inténtalo de nuevo.';
    }
  };

  const handleRegister = async (correo: string, contraseña: string) => {
    // Validar la contraseña antes de registrar
    if (contraseña.length < 8) {
      alert('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, correo, contraseña);
      const user = userCredential.user;

      // Enviar el correo de verificación
      await sendEmailVerification(user);

      // Guardar el usuario en Firestore
      const userRef = doc(firestore, "users", user.uid);
      await setDoc(userRef, { email: user.email, role: 'cliente', emailVerified: false });

      // Mostrar un mensaje al usuario
      alert('Se ha enviado un correo de verificación. Por favor, verifica tu correo antes de iniciar sesión.');

      // Cambiar a la vista de inicio de sesión
      setRegistrando(false);
    } catch (error: any) {
      const errorCode = error.code;
      const errorMessage = getErrorMessage(errorCode);
      alert(errorMessage);
    }
  };

  const handleLogin = async (correo: string, contraseña: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, correo, contraseña);
      const user = userCredential.user;

      // Verificar si el correo ha sido verificado
      if (!user.emailVerified) {
        alert('Por favor, verifica tu correo electrónico antes de iniciar sesión.');
        await firebaseSignOut(auth); // Cerrar la sesión automáticamente
        return;
      }

      // Si el correo está verificado, continuar con el inicio de sesión
      await handleUserLogin(user);
    } catch (error: any) {
      const errorCode = error.code;
      const errorMessage = getErrorMessage(errorCode);
      alert(errorMessage);
    }
  };

  const handleRecuperarContraseña = async () => {
    try {
      await sendPasswordResetEmail(auth, emailRecuperacion);
      alert('Se ha enviado un enlace de recuperación a tu correo electrónico.');
      setMostrarRecuperarContraseña(false); // Cerrar el modal
    } catch (error: any) {
      const errorCode = error.code;
      const errorMessage = getErrorMessage(errorCode);
      alert(errorMessage);
    }
  };

  const funcAutenticacion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const correo = e.currentTarget.email.value;
    const contraseña = e.currentTarget.password.value;
    if (registrando) {
      handleRegister(correo, contraseña);
    } else {
      handleLogin(correo, contraseña);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <img src={img1} alt="Logo" className="estilo-profile" />
        <form onSubmit={funcAutenticacion} className="form-container">
          <input type="email" placeholder="Ingresar Email" className="cajatexto" name="email" required />
          <input type="password" placeholder="Ingresar contraseña" className="cajatexto" name="password" required />
          <button type="submit" className="btnform">
            {registrando ? "Regístrate" : "Inicia Sesión"}
          </button>
        </form>
        <div className="auth-options">
          <h4>{registrando ? "Si ya tienes cuenta" : "Si no tienes cuenta"}</h4>
          <button className="btnform toggle-btn" onClick={() => setRegistrando(!registrando)}>
            {registrando ? "Inicia sesión" : "Regístrate"}
          </button>
          <button onClick={signInWithGoogle} className="google-btn">
            <img src={img2} alt="Google sign-in" className="google-icon" />
            Iniciar con Google
          </button>
          {/* Enlace para recuperar contraseña */}
          <p className="forgot-password" onClick={() => setMostrarRecuperarContraseña(true)}>
            ¿Olvidaste tu contraseña?
          </p>
        </div>
      </div>

      {/* Modal de recuperación de contraseña */}
      {mostrarRecuperarContraseña && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Recuperar contraseña</h3>
              <button className="close-button" onClick={() => setMostrarRecuperarContraseña(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p>Ingresa tu correo electrónico para recibir un enlace de recuperación.</p>
              <input
                type="email"
                placeholder="Ingresar Email"
                value={emailRecuperacion}
                onChange={(e) => setEmailRecuperacion(e.target.value)}
              />
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setMostrarRecuperarContraseña(false)}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={handleRecuperarContraseña}>
                Enviar enlace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;