require("@testing-library/jest-dom/extend-expect");
require("react-router-dom");
require("/geo-analytics-frontend/src/pages/Home.jsx"); // Убедитесь, что путь правильный

// Обертка для компонентов, использующих react-router
const MockRouter = ({ children }) => <BrowserRouter>{children}</BrowserRouter>;

describe("Home Component", () => {
	test("renders main heading and call to action", () => {
		render(<Home />, { wrapper: MockRouter });

		expect(
			screen.getByText("Оптимальное расположение бизнеса")
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"Анализ местности по конкурентам, трафику и стоимости аренды"
			)
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /Начать анализ/i })
		).toBeInTheDocument();
	});

	test("renders feature cards", () => {
		render(<Home />, { wrapper: MockRouter });

		expect(screen.getByText("Анализ конкурентов")).toBeInTheDocument();
		expect(screen.getByText("Трафик")).toBeInTheDocument();
		expect(screen.getByText("Экономика")).toBeInTheDocument();
	});

	test("toggles feature card details on click", () => {
		render(<Home />, { wrapper: MockRouter });

		const competitorCardTitle = screen.getByText("Анализ конкурентов");
		// Родительский элемент карточки, чтобы проверить детали внутри него
		const competitorCard = competitorCardTitle.closest("div");

		// Изначально детали не видны (или имеют opacity 0)
		// Проверка видимости может быть сложной, если она основана только на CSS transition.
		// Лучше проверить, что текст деталей присутствует, но, возможно, скрыт.
		// В вашем случае используется opacity-0, что делает его невидимым, но элемент все еще в DOM.
		const detailsText =
			"Дополнительно анализируются ближайшие бизнесы, их количество, уровень конкуренции и потенциальная аудитория.";
		expect(screen.getByText(detailsText)).toBeInTheDocument(); // он всегда в DOM
		// Проверяем класс, который управляет видимостью через opacity
		expect(screen.getByText(detailsText).parentElement).toHaveClass(
			"opacity-0"
		);

		fireEvent.click(competitorCard);

		// После клика детали должны стать видимыми (opacity-1, т.е. класс opacity-0 удален)
		// или получить другой класс для isExpanded
		expect(screen.getByText(detailsText).parentElement).not.toHaveClass(
			"opacity-0"
		);
		expect(screen.getByText(detailsText).parentElement).toHaveClass(""); // так как isExpanded убирает opacity-0

		fireEvent.click(competitorCard);
		// Снова скрыт
		expect(screen.getByText(detailsText).parentElement).toHaveClass(
			"opacity-0"
		);
	});
});
