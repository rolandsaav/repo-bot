import { Children, createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({children}) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false)

    useEffect(() => {
    })
}