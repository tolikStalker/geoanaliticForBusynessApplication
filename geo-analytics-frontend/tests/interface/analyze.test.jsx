import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import Analyze from "@/pages/Analyze";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("axios");
vi.mock("../components/Map", () => () => (
	<div data-itid="mock-map">Mock Map</div>
));

const mockCities = [{ id: 1, name: "Москва", center: [55, 37] }];
const mockCategories = [{ id: 1, name: "Кафе" }];

describe("Analyze Component", () => {
	beforeEach(() => {
		axios.get.mockReset();
		axios.get.mockImplementation((url) => {
			if (url.includes("/api/cities")) {
				return Promise.resolve({ data: mockCities });
			}
			if (url.includes("/api/categories")) {
				return Promise.resolve({ data: mockCategories });
			}
			if (url.includes("/api/analysis")) {
				return Promise.resolve({
					competitors: [{ id: 1, name: "Comp1" }],
					hexs: {
						type: "FeatureCollection",
						features: [], 
						total: 1000,
					},
					rent_places: [{ id: 1, address: "Place 1" }],
					avg_rent: "50 000",
					avg_for_square: "1 000",
				});
			}
			return Promise.reject(new Error("not found"));
		});
	});

	it("loads initial data and sets default filters", async () => {
		render(
			<MemoryRouter initialEntries={["/analyze"]}>
				<Analyze />
			</MemoryRouter>
		);

		expect(screen.getByText(/Идет анализ.../i)).toBeInTheDocument(); 

		await waitFor(() => {
			expect(axios.get).toHaveBeenCalledWith(
				"http://localhost:5000/api/cities",
				expect.any(Object)
			);
			expect(axios.get).toHaveBeenCalledWith(
				"http://localhost:5000/api/categories",
				expect.any(Object)
			);
		});

		await waitFor(() => {
			expect(
				screen.getByRole("option", { name: "Москва" }).selected
			).toBe(true); 
			expect(screen.getByRole("option", { name: "Кафе" }).selected).toBe(
				true
			); 
		});
		expect(screen.queryByText(/Идет анализ.../i)).not.toBeInTheDocument();
	});

	it("triggers analysis and displays results", async () => {
		const mockAnalysisResult = {
			competitors: [{ id: 1, name: "Comp1" }],
			hexs: {
				type: "FeatureCollection",
				features: [], ь
				total: 1000,
			},
			rent_places: [{ id: 1, address: "Place 1" }],
			avg_rent: "50 000",
			avg_for_square: "1 000",
		};
		axios.get.mockImplementation((url) => {
			if (url.includes("/api/cities"))
				return Promise.resolve({ data: mockCities });
			if (url.includes("/api/categories"))
				return Promise.resolve({ data: mockCategories });
			if (url.includes("/api/analysis"))
				return Promise.resolve({ data: mockAnalysisResult });
			return Promise.reject(new Error("not found"));
		});

		render(
			<MemoryRouter initialEntries={["/analyze"]}>
				<Analyze />
			</MemoryRouter>
		);

		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: /Запустить анализ/i })
			).not.toBeDisabled()
		);

		fireEvent.click(
			screen.getByRole("button", { name: /Запустить анализ/i })
		);

		expect(screen.getByText(/Идет анализ.../i)).toBeInTheDocument(); 
		await waitFor(() =>
			expect(
				screen.queryByText(/Идет анализ.../i)
			).not.toBeInTheDocument()
		).then(() => {
			expect(screen.getByText("1 000 чел.")).toBeInTheDocument(); 
		});
	});
});
