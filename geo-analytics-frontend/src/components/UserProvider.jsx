import { useState, useEffect, useCallback } from "react";
import { UserContext } from "./UserContext";

export function UserProvider({ children }) {
	const [user, setUserState] = useState(null);
	const [authChecked, setAuthChecked] = useState(false);
	const [loading, setLoading] = useState(true);

	const checkAuth = useCallback(async () => {
		setLoading(true); 
		setAuthChecked(false);
		try {
			const response = await fetch("http://localhost:5000/me", {
				withCredentials: true,
				headers: {
					"Accept": "application/json"
				}
			});

			if (response.ok) {
				const data = await response.json();
				if (data?.username) {
					setUserState(data.username); 
				} else {
					setUserState(null); 
				}
			} else {
				setUserState(null);
			}
		} catch {
			setUserState(null); 
		} finally {
			setAuthChecked(true);
			setLoading(false); 
		}
	}, []);

	useEffect(() => {
		checkAuth();
	}, [checkAuth]);

	const handleSetUser = useCallback((userData) => {
		setUserState(userData);
		setAuthChecked(true); 
		setLoading(false);
	}, []);

	const contextValue = {
		user,
		setUser: handleSetUser,
		authChecked,
		loading, 
		checkAuth, 
	};

	return (
		<UserContext.Provider value={ contextValue }>
			{children}
		</UserContext.Provider>
	);
}
