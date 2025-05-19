import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LockClosedIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import { useUser } from "../components/UserContext.jsx";
import axios from "axios";

export default function Auth() {
	const [isLogin, setIsLogin] = useState(true);
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [isEmailFocused, setEmailFocused] = useState(false);
	const [isPasswordFocused, setPasswordFocused] = useState(false);
	const [error, setError] = useState("");
	const navigate = useNavigate();
	const { setUser } = useUser();

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");
		const formUsername = username.trim();
		const formPassword = password.trim();

		// Валидация email
		const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
		if (!emailRegex.test(formUsername)) {
			setError("Введите корректный email.");
			return;
		}
		const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;
		if (!passwordRegex.test(formPassword)) {
			setError(
				"Введите корректный пароль длиной не менее 6 символов, содержащий хотя бы одну букву и хотя бы одну цифру."
			);
			return;
		}

		const endpoint = isLogin ? "/login" : "/register";

		try {
			await axios.post(
				`http://localhost:5000${endpoint}`,
				{
					username: formUsername,
					password: formPassword,
				},
				{
					headers: {
						"Content-Type": "application/json",
					},
					withCredentials: true, // сохраняет сессионные куки
				}
			);

			setUser(formUsername);
			navigate("/analyze");
		} catch (err) {
			if (err.response) {
				const status = err.response.status;

				switch (status) {
					case 400:
						setError("Пользователь уже зарегистрован.");
						break;
					case 401:
						setError("Неверный пароль.");
						break;
					case 403:
						setError("Доступ запрещен.");
						break;
					case 404:
						setError("Пользователь не найден.");
						break;
					case 409:
						setError("Пользователь уже существует.");
						break;
					case 500:
						setError("Внутренняя ошибка сервера.");
						break;
					default:
						setError(`Неизвестная ошибка (код ${status})`);
				}
			} else {
				setError("Ошибка подключения к серверу. Проверьте интернет.");
			}
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

				<p
					className={`text-red-600 text-sm text-center min-h-4 pb-4 ${
						error ? "visible" : "invisible"
					}`}
				>
					{error || "Ошибка"}
				</p>

				<div className="max-w-md mx-auto">
					<form
						noValidate
						onSubmit={handleSubmit}
						className="space-y-4"
					>
						<div className="relative">
							<label
								className={`absolute left-2 top-1/2 transform select-none transition-all duration-200 ease-in-out ${
									username || isEmailFocused
										? "top-[-0px] text-xs opacity-30"
										: "-translate-y-1/2 text-base"
								}`}
							>
								Email
							</label>
							<input
								type="email"
								pattern="^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"
								name="username"
								required
								className="input-field"
								placeholder={
									isEmailFocused
										? "example@mail.com"
										: undefined
								}
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								onFocus={() => setEmailFocused(true)}
								onBlur={() => setEmailFocused(false)}
							/>
						</div>

						<div className="relative">
							<label
								className={`absolute left-2 top-1/2 transform select-none transition-all duration-200 ease-in-out ${
									password || isPasswordFocused
										? "top-[-0px] text-xs opacity-30"
										: "-translate-y-1/2 text-base"
								}`}
							>
								Пароль
							</label>
							<input
								type="password"
								name="password"
								required
								className="input-field"
								placeholder={
									isPasswordFocused ? "••••••••" : undefined
								}
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								minLength="6"
								pattern="^(?=.*[A-Za-z])(?=.*\d).{6,}$"
								onFocus={() => setPasswordFocused(true)}
								onBlur={() => setPasswordFocused(false)}
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
				</div>

				<p className="text-center mt-4">
					{isLogin ? "Нет аккаунта? " : "Уже есть аккаунт? "}
					<button
						onClick={() => {
							setIsLogin(!isLogin);
							setError("");
							setUsername("");
							setPassword("");
						}}
						className="text-blue-600 hover:underline"
					>
						{isLogin ? "Создать" : "Войти"}
					</button>
				</p>
			</div>
		</div>
	);
}
