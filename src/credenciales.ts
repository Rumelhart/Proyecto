import { initializeApp } from 'firebase/app';
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDnx8jSDG2Es-t1O5meVfOR8ZW1A_1_9OM",
    authDomain: "estacionamientou-e505d.firebaseapp.com",
    projectId: "estacionamientou-e505d",
    storageBucket: "estacionamientou-e505d.appspot.com",
    messagingSenderId: "805548540766",
    appId: "1:805548540766:web:afd033bbd70ebc8619c5cf",
    measurementId: "G-3W2LVPMYD0"
};
    const appFirebase = initializeApp(firebaseConfig);
export default appFirebase;

// Crear e exportar la instancia de Firestore
export const db = getFirestore(appFirebase);