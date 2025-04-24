import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "./UserContext.jsx";

export default function ProtectedRoute({ children }) {
	const [loading, setLoading] = useState(true);
	const navigate = useNavigate();
	const { user } = useUser();

	useEffect(() => {
		if (user === null) {
			// Если точно не вошел — редирект
			navigate("/auth");
		}
		// Даже если юзер уже был — подождем один тик
		setLoading(false);
	}, [user, navigate]);

	if (loading)
		return <div className="p-4 text-center text-gray-500">Загрузка...</div>;

	return user ? children : null;
}
