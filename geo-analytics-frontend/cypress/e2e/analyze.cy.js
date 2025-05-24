Cypress.Commands.add("login", () => {
	cy.request("POST", "http://localhost:5000/login", {
		username: "test@example.com11",
		password: "test123",
	});
});

describe("Страница анализа", () => {
	beforeEach(() => {
		cy.login();
		cy.visit("/analyze");
	});

	it("Загружает города и категории", () => {
		cy.get("select").should("exist");
		cy.get("input").should("exist");
	});

	it("Показывает ошибку валидации, если поля не заполнены корректно", () => {
		cy.get('input[name="rent"]')
			.should("not.be.disabled")
			.clear()
			.type("5000");
		cy.contains("Запустить анализ").click();
		cy.contains(
			"Стоимость аренды должна быть от 10 000 до 100 000 000."
		).should("exist");
	});

	it("Проводит анализ и отображает результат", () => {
		cy.intercept("GET", "/api/cities").as("getCities");
		cy.intercept("GET", "/api/categories").as("getCategories");
		cy.intercept("GET", "/api/analysis*").as("analyzeRequest");

		cy.visit("/analyze");
		cy.wait(["@getCities", "@getCategories"]);

		cy.get('select[name="city"] option:not([disabled])')
			.eq(0)
			.then((option) => {
				const value = option.val();
				cy.get('select[name="city"]').select(value);
			});

		cy.contains("Запустить анализ").click();
		cy.wait("@analyzeRequest");
		cy.contains("Результаты").should("exist");
	});
});
