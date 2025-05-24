import { screen, fireEvent, waitFor } from "@testing-library/react";
import { customRender } from "@/test/test-utils";
import axios from "axios";
import Auth from "@/pages/Auth";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("axios");
const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
	const actual = await vi.importActual("react-router-dom");
	return {
		...actual,
		useNavigate: () => mockNavigate,
	};
});

describe("Auth Component", () => {
	beforeEach(() => {
		axios.post.mockClear();
		mockNavigate.mockClear();
	});

	it("renders login form by default", () => {
		customRender(<Auth />);
		expect(
			screen.getByRole("heading", { name: /Вход в систему/i })
		).toBeInTheDocument();
		expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/пароль/i)).toBeInTheDocument();
	});

	it("switches to registration form", () => {
		customRender(<Auth />);
		fireEvent.click(screen.getByRole("button", { name: /Создать/i }));
		expect(
			screen.getByRole("heading", { name: /Регистрация/i })
		).toBeInTheDocument();
	});

	it("shows client-side validation error for invalid email", async () => {
		customRender(<Auth />);
		fireEvent.change(screen.getByLabelText(/email/i), {
			target: { value: "invalid" },
		});
		fireEvent.change(screen.getByLabelText(/пароль/i), {
			target: { value: "pass123" },
		});
		fireEvent.click(screen.getByRole("button", { name: /Войти/i }));
		expect(
			await screen.findByText(/Введите корректный email/i)
		).toBeInTheDocument();
	});

	it("successful login navigates and sets user", async () => {
		const setUser = vi.fn();
		axios.post.mockResolvedValueOnce({ data: {} });

		customRender(<Auth />, { setUser });

		fireEvent.change(screen.getByLabelText(/email/i), {
			target: { value: "it@example.com" },
		});
		fireEvent.change(screen.getByLabelText(/пароль/i), {
			target: { value: "password123" },
		});
		fireEvent.click(screen.getByRole("button", { name: /Войти/i }));

		await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
		expect(axios.post).toHaveBeenCalledWith(
			"http://localhost:5000/login",
			{ username: "it@example.com", password: "password123" },
			expect.any(Object)
		);
		await waitFor(() =>
			expect(setUser).toHaveBeenCalledWith("it@example.com")
		);
		await waitFor(() =>
			expect(mockNavigate).toHaveBeenCalledWith("/analyze")
		);
	});
});
