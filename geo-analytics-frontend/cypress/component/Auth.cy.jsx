import React from "react";
import Auth from "@/pages/Auth";
import { mount } from "cypress/react";
import { BrowserRouter } from "react-router-dom";

describe("Auth page", () => {
	beforeEach(() => {
		mount(
			<BrowserRouter>
				<Auth />
			</BrowserRouter>
		);
	});

	it("Показывает форму входа и валидирует email", () => {
		cy.get('input[name="username"]').type("not-an-email");
		cy.get('input[name="password"]').type("123456a");
		cy.get("form").submit();
		cy.contains("Введите корректный email.").should("be.visible");
	});

	it("Показывает ошибку при неправильном пароле", () => {
		cy.get('input[name="username"]').type("test@example.com");
		cy.get('input[name="password"]').type("short");
		cy.get("form").submit();
		cy.contains("Введите корректный пароль").should("be.visible");
	});

	it("Переключается на регистрацию и обратно", () => {
		cy.contains("Создать").click();
		cy.contains("Регистрация").should("be.visible");

		cy.contains("Войти").click();
		cy.contains("Вход в систему").should("be.visible");
	});
});
