import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LockClosedIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import { useUser } from "../components/UserContext.jsx";

export default function Auth() {
	const [isLogin, setIsLogin] = useState(true);
	const [error, setError] = useState("");
	const navigate = useNavigate();
	const { setUser } = useUser();

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");
		const form = e.target;
		const formUsername = form.username.value.trim();
		const formPassword = form.password.value.trim();

		// Валидация email
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(formUsername)) {
			setError("Введите корректный email.");
			return;
		}

		// Валидация пароля
		if (formPassword.length < 6) {
			setError("Пароль должен содержать минимум 6 символов.");
			return;
		}

		const endpoint = isLogin ? "/login" : "/register";

		try {
			const response = await fetch(`http://localhost:5000${endpoint}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include", // сохраняет cookie сессии
				body: JSON.stringify({
					username: formUsername,
					password: formPassword,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Ошибка авторизации");
			}

			setUser(formUsername);
			// Успешный вход или регистрация
			navigate("/analyze");
		} catch (err) {
			setError(err.message);
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-t from-blue-100 to-blue-50 flex items-center">
			<div className="max-w-md w-full mx-auto p-6 bg-white rounded-xl shadow-md">
				<div className="flex justify-center mb-8">
					<UserCircleIcon className="h-16 w-16 text-blue-600" />
				</div>

				<h2 className="text-2xl font-bold text-center mb-6">
					{isLogin ? "Вход в систему" : "Регистрация"}
				</h2>

				{error && (
					<p className="text-red-600 text-sm text-center mt-2">
						{error}
					</p>
				)}

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-sm font-medium mb-1">
							Email
						</label>
						<input
							type="email"
							name="username"
							required
							className="input-field"
							placeholder="example@mail.com"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium mb-1">
							Пароль
						</label>
						<input
							type="password"
							name="password"
							required
							className="input-field"
							placeholder="••••••••"
						/>
					</div>

					<button
						type="submit"
						className="btn-primary w-full flex items-center justify-center"
					>
						{isLogin ? "Войти" : "Зарегистрироваться"}
						<LockClosedIcon className="h-5 w-5 ml-3" />
					</button>
				</form>

				<p className="text-center mt-4">
					{isLogin ? "Нет аккаунта? " : "Уже есть аккаунт? "}
					<button
						onClick={() => setIsLogin(!isLogin)}
						className="text-blue-600 hover:underline"
					>
						{isLogin ? "Создать" : "Войти"}
					</button>
				</p>
			</div>
		</div>
	);
}
