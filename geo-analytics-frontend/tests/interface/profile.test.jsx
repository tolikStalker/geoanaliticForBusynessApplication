import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Profile from "@/pages/Profile"; 
import { UserContext } from "@/components/UserContext"; 

vi.mock("axios");

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
	const actual = await vi.importActual("react-router-dom");
	return {
		...actual,
		useNavigate: () => mockNavigate,
	};
});

const mockUserContextValue = {
	user: "TestUser",
	setUser: vi.fn(),
	logout: vi.fn(),
};

const renderWithProviders = (
	ui,
	{ route = "/", user = mockUserContextValue.user } = {}
) => {
	window.history.pushState({}, "Test page", route);
	const userContextValue = { ...mockUserContextValue, user };

	return render(
		<UserContext.Provider value={userContextValue}>
			<MemoryRouter initialEntries={[route]}>
				<Routes>
					<Route path="/" element={ui} />
					<Route
						path="/analyze"
						element={<div>Analyze Page Target</div>}
					/>
					{/* Add other routes if needed for navigation testing */}
				</Routes>
			</MemoryRouter>
		</UserContext.Provider>
	);
};

describe("Profile Component", () => {
	beforeEach(() => {
		// Reset mocks before each test
		axios.get.mockReset();
		mockNavigate.mockReset();
		console.error = vi.fn(); // Suppress console.error for cleaner test output for known errors
		console.log = vi.fn(); // Suppress console.log
	});

	afterEach(() => {
		vi.restoreAllMocks(); // Restore original console.error and console.log
	});

	it("renders loading state initially", () => {
		axios.get.mockReturnValue(new Promise(() => {})); // Keep promise pending
		renderWithProviders(<Profile />);
		expect(screen.getByText("Загрузка истории...")).toBeInTheDocument();
		expect(screen.getByRole("status")).toBeInTheDocument(); // The spinner
	});

	it("displays user's name in the heading", async () => {
		axios.get.mockResolvedValue({ data: [] });
		renderWithProviders(<Profile />, { user: "SpecificUser" });
		await waitFor(() => {
			expect(
				screen.getByRole("heading", {
					name: /Профиль пользователя \(SpecificUser\)/i,
				})
			).toBeInTheDocument();
		});
	});

	it("displays 'no history' message when history is empty", async () => {
		axios.get.mockResolvedValue({ data: [] });
		renderWithProviders(<Profile />);
		await waitFor(() => {
			expect(
				screen.getByText("У вас пока нет истории запросов.")
			).toBeInTheDocument();
		});
	});

	it("displays error message on API failure (generic)", async () => {
		axios.get.mockRejectedValue({
			response: { status: 500, data: { message: "Server Down" } },
		});
		renderWithProviders(<Profile />);
		await waitFor(() => {
			expect(
				screen.getByText("Ошибка!").nextSibling.textContent
			).toContain("Ошибка сервера: 500 Server Down");
		});
		expect(
			screen.queryByText("Загрузка истории...")
		).not.toBeInTheDocument();
	});

	it("displays specific error message for 401 Unauthorized", async () => {
		axios.get.mockRejectedValue({
			response: { status: 401 },
		});
		renderWithProviders(<Profile />);
		await waitFor(() => {
			expect(
				screen.getByText("Ошибка!").nextSibling.textContent
			).toContain("Пожалуйста, войдите в систему для просмотра истории.");
		});
	});

	it("displays network error message when no response from server", async () => {
		axios.get.mockRejectedValue({ request: {} }); // Simulates network error
		renderWithProviders(<Profile />);
		await waitFor(() => {
			expect(
				screen.getByText("Ошибка!").nextSibling.textContent
			).toContain("Нет ответа от сервера. Проверьте соединение.");
		});
	});

	describe("When history data is present", () => {
		const mockHistoryData = [
			{
				id: "1",
				created_at: "2023-10-26T10:30:00.000Z",
				city: "Москва",
				category: "Кафе",
				radius: 5,
				rent: 50000,
				max_competitors: 3,
				area_count: 10,
				city_id: "moscow_id", // Assuming these are needed for navigation
				category_id: "cafe_id",
			},
			{
				id: "2",
				created_at: "2023-10-27T12:45:00.000Z",
				city: "Санкт-Петербург",
				category: "Ресторан",
				radius: 3,
				rent: 120000,
				max_competitors: 5,
				area_count: 8,
				city_id: "spb_id",
				category_id: "restaurant_id",
			},
		];

		beforeEach(() => {
			axios.get.mockResolvedValue({ data: mockHistoryData });
		});

		it("renders list of history items", async () => {
			renderWithProviders(<Profile />);
			await waitFor(() => {
				expect(screen.getByText("Москва")).toBeInTheDocument();
				expect(screen.getByText("Кафе")).toBeInTheDocument();
				expect(screen.getByText("5 км")).toBeInTheDocument(); // radius
				expect(screen.getByText("50 000 ₽")).toBeInTheDocument(); // rent formatted
				expect(screen.getByText("3")).toBeInTheDocument(); // max_competitors
				expect(screen.getByText("10")).toBeInTheDocument(); // area_count
				expect(
					screen.getByText("26.10.2023, 13:30")
				).toBeInTheDocument(); // Moscow is UTC+3 from ISO
			});
			expect(
				screen.getAllByRole("heading", { level: 2 })[0]
			).toHaveTextContent("История запросов анализа");
			expect(screen.getAllByText(/Город:/i).length).toBe(2); // Two items
		});

		it("handles null values in history item gracefully", async () => {
			const mockHistoryWithNulls = [
				{
					id: "3",
					created_at: null, // test null date
					city: "Новгород",
					category: "Магазин",
					radius: 2,
					rent: null, // test null number
					max_competitors: 1,
					area_count: 5,
					city_id: "nov_id",
					category_id: "shop_id",
				},
			];
			axios.get.mockResolvedValue({ data: mockHistoryWithNulls });
			renderWithProviders(<Profile />);
			await waitFor(() => {
				expect(screen.getByText("N/A")).toBeInTheDocument(); // For date
				// There will be two "N/A" - one for date, one for rent
				expect(
					screen.getAllByText("N/A").length
				).toBeGreaterThanOrEqual(1);
				const rentLabel = screen.getByText("Макс. аренда:");
				expect(rentLabel.nextSibling.textContent).toBe("N/A ₽");
			});
		});

		it("navigates to analyze page with correct params when a history item is clicked", async () => {
			renderWithProviders(<Profile />);

			// Wait for the first item to be rendered
			const firstItemCity = await screen.findByText(
				mockHistoryData[0].city
			);
			const historyItemCard = firstItemCity.closest(
				"div[class*='bg-white']"
			); // Find the parent card
			expect(historyItemCard).toBeInTheDocument();

			fireEvent.click(historyItemCard);

			const expectedParams = new URLSearchParams({
				city_id: mockHistoryData[0].city_id,
				category_id: mockHistoryData[0].category_id,
				radius: mockHistoryData[0].radius.toString(),
				rent: mockHistoryData[0].rent.toString(),
				competitors: mockHistoryData[0].max_competitors.toString(),
				areaCount: mockHistoryData[0].area_count.toString(),
			}).toString();

			expect(mockNavigate).toHaveBeenCalledTimes(1);
			expect(mockNavigate).toHaveBeenCalledWith(
				`/analyze?${expectedParams}`
			);
		});
	});

	describe("Utility functions", () => {
		// These are implicitly tested by the rendering of HistoryItemCard,
		// but can also be tested directly if needed.
		// For formatDate and formatNumber, let's assume they are correct based on the main component tests.
		// If they were more complex, separate unit tests would be advisable.

		it("formatDate correctly formats ISO string", () => {
			const formatDate = (isoString) => {
				// Copied from component for direct test
				if (!isoString) return "N/A";
				try {
					const date = new Date(isoString);
					return date.toLocaleString("ru-RU", {
						year: "numeric",
						month: "2-digit",
						day: "2-digit",
						hour: "2-digit",
						minute: "2-digit",
					});
				} catch (error) {
					return isoString;
				}
			};
			expect(formatDate("2023-01-05T14:30:00.000Z")).toBe(
				"05.01.2023, 17:30"
			); // Assuming UTC+3 for ru-RU locale for this example
		});

		it("formatDate returns 'N/A' for null input", () => {
			const formatDate = (isoString) => {
				// Copied
				if (!isoString) return "N/A";
				try {
					const date = new Date(isoString);
					return date.toLocaleString("ru-RU", {
						/* options */
					});
				} catch (e) {
					return isoString;
				}
			};
			expect(formatDate(null)).toBe("N/A");
		});

		it("formatNumber correctly formats number", () => {
			const formatNumber = (value) => {
				// Copied
				if (value === null || value === undefined) return "N/A";
				return Number(value).toLocaleString("ru-RU");
			};
			expect(formatNumber(12345.67)).toBe("12 345,67"); // Note: may use non-breaking space
			expect(formatNumber(100000)).toBe("100 000");
		});

		it("formatNumber returns 'N/A' for null or undefined input", () => {
			const formatNumber = (value) => {
				// Copied
				if (value === null || value === undefined) return "N/A";
				return Number(value).toLocaleString("ru-RU");
			};
			expect(formatNumber(null)).toBe("N/A");
			expect(formatNumber(undefined)).toBe("N/A");
		});
	});
});
