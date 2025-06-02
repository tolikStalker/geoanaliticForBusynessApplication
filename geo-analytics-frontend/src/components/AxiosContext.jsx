import { createContext, useContext } from "react";

export const AxiosContext = createContext(null);

export function useAxios() {
	return useContext(AxiosContext);
}
