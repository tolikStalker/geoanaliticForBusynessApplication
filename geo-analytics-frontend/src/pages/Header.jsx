import { Link, useLocation } from "react-router-dom";

export default function Header() {
	const location = useLocation();

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
