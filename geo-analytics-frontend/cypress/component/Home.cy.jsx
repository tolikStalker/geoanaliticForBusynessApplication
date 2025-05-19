import React from "react";
import Home from "@/pages/Home";
import { mount } from "cypress/react";
import { BrowserRouter } from "react-router-dom";

describe("Home component", () => {
	beforeEach(() => {
		mount(
			<BrowserRouter>
				<Home />
			</BrowserRouter>
		);
	});

	it('Отображает заголовок и кнопку "Начать анализ"', () => {
		cy.contains("Оптимальное расположение бизнеса").should("be.visible");
		cy.contains("Начать анализ").should("be.visible");
	});

	it("Разворачивает и сворачивает карточки фичей", () => {
		cy.contains("Анализ конкурентов").click();
		cy.contains("ближайшие бизнесы").should("be.visible");

		cy.contains("Анализ конкурентов").click();
		cy.contains("ближайшие бизнесы").should("not.be.visible");
	});
});
