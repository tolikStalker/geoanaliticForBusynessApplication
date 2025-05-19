describe("Полный путь пользователя в приложении", () => {
	const credentials = {
		email: `test+${Date.now()}@example.com`,
		password: "password123",
	};

	it("Проходит через полный пользовательский путь", () => {
		cy.visit("/");

		cy.contains("Начать анализ").click();
		cy.url().should("include", "/auth");

		cy.get('input[type="email"]').type(credentials.email);
		cy.get('input[type="password"]')
			.should("not.be.disabled")
			.type(credentials.password);
		cy.contains("Войти").click();

		cy.contains("Пользователь не найден").should("exist");

		cy.contains("Создать").click();
		cy.url().should("include", "/auth");
		cy.get('input[type="email"]').clear().type(credentials.email);
		cy.get('input[type="password"]')
			.should("not.be.disabled")
			.clear()
			.type(credentials.password);
		cy.contains("Зарегистрироваться").click();

		cy.url().should("include", "/");

		cy.intercept("GET", "/api/cities").as("getCities");
		cy.intercept("GET", "/api/categories").as("getCategories");

		cy.contains("Начать анализ").click();
		cy.url().should("include", "/analyze");

		cy.wait(["@getCities", "@getCategories"]);

		cy.get('select[name="city"] option:not([disabled])')
			.eq(0)
			.then((option) => {
				const value = option.val();
				cy.get('select[name="city"]').select(value);
			});

		cy.get('select[name="category"] option:not([disabled])')
			.eq(0)
			.then((option) => {
				const value = option.val();
				cy.get('select[name="category"]').select(value);
			});
		cy.get('input[name="radius"]').invoke("val", 0.7).trigger("change");
		cy.get('input[name="competitors"]').invoke("val", 6).trigger("change");
		cy.get('input[name="area"]').invoke("val", 10).trigger("change");
		cy.get('input[name="rent"]').type("100000");

		cy.intercept("GET", "/api/analysis*").as("postAnalysis");
		cy.contains("Запустить анализ").click();
		cy.wait("@postAnalysis");

		cy.get('img[src*="marker-icon-green"]').first().click({ force: true }); // аренда
		cy.get(".popup-rent").should("exist").and("contain.text", "Стоимость");

		cy.get('img[src*="marker-icon-red"]').first().click({ force: true }); // конкурент
		cy.get(".popup-competitor")
			.should("exist")
			.and("contain.text", "Рейтинг");

		cy.get('path.leaflet-interactive[stroke="blue"]')
			.first()
			.click({ force: true });

		cy.get(".popup-zone")
			.should("exist")
			.and("contain.text", "Расч. население");

		cy.get('[id="population-layer"]').click();
		cy.get('[id="competitors-layer"]').click();
		cy.get('[id="rent-layer"]').click();
		cy.get('[id="zones-layer"]').click();

		// Можно проверить изменение стилей слоёв, если есть

		cy.intercept("GET", "/api/history").as("getHistory");
		cy.get('[name="profile"]').click();
		cy.url().should("include", "/profile");

		cy.wait("@getHistory");
		cy.get('[name="history-entry"]').first().click();

		cy.wait("@postAnalysis");

		cy.contains("Выход").click();
		cy.url().should("include", "/");
	});
});
