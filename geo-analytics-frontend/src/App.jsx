import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Auth from "./pages/Auth.jsx";
import Analyze from "./pages/Analyze.jsx";
import Profile from "./pages/Profile.jsx";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute";
import { UserProvider } from "./components/UserProvider";
import { useUser } from "./components/UserContext";

function AppRoutes() {
	const { user } = useUser();

	return (
		<Routes>
			<Route path="/" element={<Layout />}>
				<Route index element={<Home />} />
				<Route
					path="/auth"
					element={user ? <Navigate to="/" replace /> : <Auth />}
				/>
				<Route
					path="/analyze"
					element={
						<ProtectedRoute>
							<Analyze />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/profile"
					element={
						<ProtectedRoute>
							<Profile />
						</ProtectedRoute>
					}
				/>
			</Route>
			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	);
}

export default function App() {
	return (
		<UserProvider>
			<BrowserRouter>
				<AppRoutes />
			</BrowserRouter>
		</UserProvider>
	);
}
