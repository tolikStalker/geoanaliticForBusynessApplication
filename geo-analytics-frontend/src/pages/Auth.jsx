import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LockClosedIcon, UserCircleIcon } from "@heroicons/react/24/outline";

export default function Auth() {
	const [isLogin, setIsLogin] = useState(true);
	const navigate = useNavigate();

	const handleSubmit = (e) => {
		e.preventDefault();
		// Логика авторизации/регистрации
		navigate("/analyze");
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

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-sm font-medium mb-1">
							Email
						</label>
						<input
							type="email"
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
