import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Home from "@/pages/Home";

// Helper to render with Router
const renderWithRouter = (ui, { route = "/" } = {}) => {
	window.history.pushState({}, "Test page", route);
	return render(
		<MemoryRouter initialEntries={[route]}>
			<Routes>
				<Route path="/" element={ui} />
				<Route path="/analyze" element={<div>Analyze Page Mock</div>} />
			</Routes>
		</MemoryRouter>
	);
};

const featuresData = [
	{
		title: "Анализ конкурентов",
		text: "Выявление плотности аналогичных бизнесов",
		details:
			"Дополнительно анализируются ближайшие бизнесы, их количество, уровень конкуренции и потенциальная аудитория.",
	},
	{
		title: "Трафик",
		text: "Пешеходный и автомобильный поток",
		details:
			"Используются данные о загруженности дорог, количестве пешеходов в разное время суток и сезонность трафика.",
	},
	{
		title: "Экономика",
		text: "Стоимость аренды и окупаемость",
		details:
			"Рассчитываются средние цены аренды в регионе, потенциальный доход и сроки окупаемости бизнеса.",
	},
];

describe("Home Component", () => {
	it("renders the main heading and subheading", () => {
		renderWithRouter(<Home />);
		expect(
			screen.getByRole("heading", {
				name: /Оптимальное расположение бизнеса/i,
			})
		).toBeInTheDocument();
		expect(
			screen.getByText(
				/Анализ местности по конкурентам, трафику и стоимости аренды/i
			)
		).toBeInTheDocument();
	});

	it("renders the 'Начать анализ' link correctly", () => {
		renderWithRouter(<Home />);
		const analyzeLink = screen.getByRole("link", {
			name: /Начать анализ/i,
		});
		expect(analyzeLink).toBeInTheDocument();
		expect(analyzeLink).toHaveAttribute("href", "/analyze");
	});

	it("renders all feature cards with titles and initial texts", () => {
		renderWithRouter(<Home />);
		featuresData.forEach((feature) => {
			expect(screen.getByText(feature.title)).toBeInTheDocument();
			expect(screen.getByText(feature.text)).toBeInTheDocument();
			expect(screen.getByText(feature.details)).toBeInTheDocument();
		});
	});

	describe("FeatureCard Interaction", () => {
		it("initially renders feature details with opacity-0 class (visually hidden)", () => {
			renderWithRouter(<Home />);
			const firstFeatureDetailsText = featuresData[0].details;
			// screen.getByText(text) returns the element containing the text.
			// This element is the one that gets the opacity-0 class.
			const detailsContainer = screen.getByText(firstFeatureDetailsText);
			expect(detailsContainer).toHaveClass("opacity-0");
		});

		it("toggles feature card details visibility on click", () => {
			renderWithRouter(<Home />);
			const firstFeatureTitle = featuresData[0].title;
			const firstFeatureDetailsText = featuresData[0].details;

			const cardTitleElement = screen.getByText(firstFeatureTitle);
			const cardElement = cardTitleElement.closest(
				"div[class*='bg-white']"
			);
			expect(cardElement).toBeInTheDocument();

			// screen.getByText(text) returns the element containing the text,
			// which is the one with the opacity class.
			const detailsContainer = screen.getByText(firstFeatureDetailsText);

			expect(detailsContainer).toHaveClass("opacity-0");

			fireEvent.click(cardElement);
			expect(detailsContainer).not.toHaveClass("opacity-0");

			fireEvent.click(cardElement);
			expect(detailsContainer).toHaveClass("opacity-0");
		});

		it("only expands the clicked feature card, others remain collapsed based on current logic", () => {
			renderWithRouter(<Home />);
			const firstFeatureTitle = featuresData[0].title;
			const secondFeatureTitle = featuresData[1].title;

			const firstFeatureDetailsText = featuresData[0].details;
			const secondFeatureDetailsText = featuresData[1].details;

			const firstCardElement = screen
				.getByText(firstFeatureTitle)
				.closest("div[class*='bg-white']");
			const secondCardElement = screen
				.getByText(secondFeatureTitle)
				.closest("div[class*='bg-white']");

			// Get details containers directly
			const firstDetailsContainer = screen.getByText(
				firstFeatureDetailsText
			);
			const secondDetailsContainer = screen.getByText(
				secondFeatureDetailsText
			);

			expect(firstDetailsContainer).toHaveClass("opacity-0");
			expect(secondDetailsContainer).toHaveClass("opacity-0");

			fireEvent.click(firstCardElement);
			expect(firstDetailsContainer).not.toHaveClass("opacity-0");
			expect(secondDetailsContainer).toHaveClass("opacity-0");

			// Current logic allows multiple open, so clicking second doesn't close first
			fireEvent.click(secondCardElement);
			expect(firstDetailsContainer).not.toHaveClass("opacity-0"); // First remains expanded
			expect(secondDetailsContainer).not.toHaveClass("opacity-0"); // Second is now also expanded
		});

		it("correctly updates expandedStates for multiple cards independently", () => {
			renderWithRouter(<Home />);
			const cardElements = featuresData.map((feature) =>
				screen
					.getByText(feature.title)
					.closest("div[class*='bg-white']")
			);
			// Get details containers directly
			const detailsContainers = featuresData.map((feature) =>
				screen.getByText(feature.details)
			);

			detailsContainers.forEach((container) =>
				expect(container).toHaveClass("opacity-0")
			);

			fireEvent.click(cardElements[0]);
			expect(detailsContainers[0]).not.toHaveClass("opacity-0");
			expect(detailsContainers[1]).toHaveClass("opacity-0");
			expect(detailsContainers[2]).toHaveClass("opacity-0");

			fireEvent.click(cardElements[2]);
			expect(detailsContainers[0]).not.toHaveClass("opacity-0");
			expect(detailsContainers[1]).toHaveClass("opacity-0");
			expect(detailsContainers[2]).not.toHaveClass("opacity-0");

			fireEvent.click(cardElements[0]);
			expect(detailsContainers[0]).toHaveClass("opacity-0");
			expect(detailsContainers[1]).toHaveClass("opacity-0");
			expect(detailsContainers[2]).not.toHaveClass("opacity-0");
		});
	});

	it("navigates to /analyze when 'Начать анализ' link is clicked", () => {
		renderWithRouter(<Home />);
		const analyzeLink = screen.getByRole("link", {
			name: /Начать анализ/i,
		});
		fireEvent.click(analyzeLink);
		expect(screen.getByText("Analyze Page Mock")).toBeInTheDocument();
	});
});
