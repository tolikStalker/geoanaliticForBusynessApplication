import { Outlet } from "react-router-dom";
import Header from "../pages/Header.jsx";
import Footer from "../pages/Footer.jsx";

export default function Layout() {
	return (
		<div className="flex flex-col min-h-screen">
			<Header />
			<main className="flex-1">
				<Outlet /> {/* Здесь будут рендериться страницы */}
			</main>
			<Footer />
		</div>
	);
}
