import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, DocumentData } from 'firebase/firestore';
import { db } from '../credenciales';
import NavAdmin from './navadmin';
import './UserManagement.css';

interface User {
    id: string;
    email: string;
    role: string;
}

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [tempRoles, setTempRoles] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        const fetchUsers = async () => {
            const querySnapshot = await getDocs(collection(db, "users"));
            const usersList: User[] = [];
            querySnapshot.forEach((doc: DocumentData) => {
                const data = doc.data();
                if (data.role !== "administrador") { 
                    usersList.push({ id: doc.id, email: data.email, role: data.role });
                }
            });
            setUsers(usersList);
        };

        fetchUsers();
    }, []);

    const handleRoleChange = (userId: string, newRole: string) => {
        setTempRoles(prevTempRoles => ({
            ...prevTempRoles,
            [userId]: newRole,
        }));
    };

    const handleSaveChanges = async () => {
        try {
            const updates = Object.entries(tempRoles).map(async ([userId, newRole]) => {
                const userDoc = doc(db, "users", userId);
                await updateDoc(userDoc, { role: newRole });
            });
            await Promise.all(updates);

            setUsers(users.map(user => ({
                ...user,
                role: tempRoles[user.id] || user.role,
            })));
            setTempRoles({}); 

            alert("Los cambios han sido guardados con éxito."); 
        } catch (error) {
            console.error("Error al guardar los cambios:", error);
        }
    };

    return (
        <div>
            <NavAdmin /> 
            <div className="user-management-container">
                <h2>Gestión de Usuarios</h2>
                <table className="user-tableU">
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>Rol</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id}>
                                <td>{user.email}</td>
                                <td>
                                    <select
                                        value={tempRoles[user.id] || user.role}
                                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                    >
                                        <option value="cliente">Cliente</option>
                                        <option value="empleado">Empleado</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <button onClick={handleSaveChanges} className="save-changes-button">
                    Guardar Cambios
                </button>
            </div>
        </div>
    );
};

export default UserManagement;
