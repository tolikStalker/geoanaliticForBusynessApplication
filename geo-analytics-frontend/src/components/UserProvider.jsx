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
				credentials: "include", 
				headers: {
					"Accept": "application/json"
				}
			});

			if (response.ok) {
				const data = await response.json();
				if (data?.username) {
					// console.log(
					// 	"UserContext: User authenticated -",
					// 	data.username
					// );
					setUserState(data.username); 
				} else {
					// console.log(
					// 	"UserContext: /api/me returned OK but no username."
					// );
					setUserState(null); 
				}
			} else {
				// console.log(
				// 	"UserContext: User not authenticated (status code: " +
				// 		response.status +
				// 		")"
				// );
				setUserState(null);
			}
		} catch (error) {
			// console.error("UserContext: Error fetching /api/me -", error);
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
		// console.log("UserContext: User explicitly set to -", userData);
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
