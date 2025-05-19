import { createContext, useContext } from "react";

export const UserContext = createContext({
	user: null,
	setUser: () => {},
	authChecked: false,
	checkAuth: async () => {},
});

export function useUser() {
	return useContext(UserContext);
}
