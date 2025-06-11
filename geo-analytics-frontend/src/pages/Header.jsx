import { Link, useLocation, useNavigate } from "react-router-dom";
import { useUser } from "../components/UserContext.jsx";

export default function Header() {
	const location = useLocation();
	const navigate = useNavigate();
	const { user, setUser } = useUser();

	// Обработчик выхода
	const handleLogout = async () => {
		fetch("http://localhost:5000/logout", {
			method: "POST",
			withCredentials: true,
		})
			.then(() => {
				setUser(null);
				navigate("/");
				console.log("logout");
			})
			.catch((err) => console.error("Logout error:", err));
	};
	return (
		<header className="bg-white shadow-lg z-50">
			<nav className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
				<Link to="/" className="focus:outline-none">
					<h1 className="text-2xl font-bold text-blue-600">
						GeoAnalytics
					</h1>
				</Link>
				<div className="space-x-4">
					{location.pathname === "/auth" ? (
						<Link to="/" className="btn-primary">
							На главную
						</Link>
					) : user ? (
						<div className="flex items-center space-x-4">
							<Link
								to="/profile"
								name="profile"
								className="font-semibold text-blue-600"
							>
								{user}
							</Link>
							<button
								onClick={handleLogout}
								className="btn-primary"
							>
								Выход
							</button>
						</div>
					) : (
						<Link to="/auth" className="btn-primary">
							Войти
						</Link>
					)}
				</div>
			</nav>
		</header>
	);
}
