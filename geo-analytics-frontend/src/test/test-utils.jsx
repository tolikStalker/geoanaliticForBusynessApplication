import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { UserContext } from "@/components/UserContext";

export function customRender(
	ui,
	{ route = "/", user = null, setUser = vi.fn() } = {}
) {
	return render(
		<UserContext.Provider value={{ user, setUser }}>
			<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
		</UserContext.Provider>
	);
}
