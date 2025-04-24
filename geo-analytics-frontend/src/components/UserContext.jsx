import { createContext, useContext, useState, useEffect } from "react";

const UserContext = createContext(null);

export function UserProvider({ children }) {
	const [user, setUser] = useState(null);

	useEffect(() => {
		fetch("http://localhost:5000/me", { credentials: "include" })
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => {
				if (data?.username) setUser(data.username);
			})
			.catch(() => setUser(null));
	}, []);

	return (
		<UserContext.Provider value={{ user, setUser }}>
			{children}
		</UserContext.Provider>
	);
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUser() {
	return useContext(UserContext);
}
