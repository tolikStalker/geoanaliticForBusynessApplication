import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "./UserContext.jsx";

export default function ProtectedRoute({ children }) {
	const navigate = useNavigate();
	const { user, authChecked, loading } = useUser(); // Добавили loading для лучшей индикации

	useEffect(() => {
		// Перенаправляем ТОЛЬКО если проверка завершена И пользователя нет
		if (authChecked && !user) {
			console.log(
				"ProtectedRoute: Auth checked, user not found, navigating to /auth"
			);
			navigate("/auth");
		}
	}, [user, navigate, authChecked]);

	if (!authChecked || loading) {
		// Используем authChecked и loading
		return (
			<div className="p-4 text-center text-gray-500">
				Проверка аутентификации...
			</div>
		);
	}

	return user ? children : null;
}
