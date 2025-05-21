import { useState, useEffect } from 'react';
import { User, getAuth, onAuthStateChanged } from "firebase/auth";
import { getIdTokenResult } from "firebase/auth";
import AdminPanel from './components/Home';
import Login from './components/Login';
import ClientePanel from './components/ClientePanel';
import Perfil from './components/Perfil';
import CarAdmin from './components/BusquedaVehiculo';
import Empleado from './components/EmployeePaymentScreen';
import AdmiUser from './components/UserManagement';
import AdmiParking from './components/AdminParking';
import Analytic from './components/AnalyticDashboard';
import ClientePago from './components/PagoCliente';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import appFirebase from "../src/credenciales";
import "./App.css";


import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const auth = getAuth(appFirebase);

const App: React.FC = () => {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usuarioFirebase) => {
      if (usuarioFirebase) {
        const tokenResult = await getIdTokenResult(usuarioFirebase);
        setIsAdmin(!!tokenResult.claims.admin);
        setUsuario(usuarioFirebase);
      } else {
        setUsuario(null);
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Cambia el título de la página
  useEffect(() => {
    document.title = "Estacionamiento U"; 
  }, []);

  return (
    <Router>
      <Switch>
        <Route path="/" exact component={Login} />
        <Route path="/admin" render={() => usuario ? <AdminPanel correoUsuario={usuario.email!} /> : <Login />} />
        <Route path="/cliente" render={() => usuario ? <ClientePanel correoUsuario={usuario.email!} /> : <Login />} />
        <Route path="/perfil" render={() => usuario ? <Perfil correoUsuario={usuario.email!} /> : <Login />} />
        <Route path="/cars" render={() => usuario ? <CarAdmin /> : <Login />} />
        <Route path="/empleado" render={() => usuario ? <Empleado /> : <Login />} />
        <Route path="/admiusers" render={() => usuario ? <AdmiUser /> : <Login />} />
        <Route path="/admiparking" render={() => usuario ? <AdmiParking /> : <Login />} />
        <Route path="/analytic" render={() => usuario ? <Analytic /> : <Login />} />
        <Route path="/pagocliente" render={() => usuario ? <ClientePago /> : <Login />} />
      </Switch>
    </Router>
  );
};

export default App;