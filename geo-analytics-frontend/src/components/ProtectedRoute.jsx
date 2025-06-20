import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "./UserContext.jsx";

export default function ProtectedRoute({ children }) {
	const navigate = useNavigate();
	const { user, authChecked, loading } = useUser(); 

	useEffect(() => {
		if (authChecked && !user) {
			navigate("/auth");
		}
	}, [user, navigate, authChecked]);

	if (!authChecked || loading) {
		return (
			<div className="p-4 text-center text-gray-500">
				Проверка аутентификации...
			</div>
		);
	}

	return user ? children : null;
}
