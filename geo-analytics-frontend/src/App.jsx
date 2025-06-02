import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Auth from "./pages/Auth.jsx";
import Analyze from "./pages/Analyze.jsx";
import Profile from "./pages/Profile.jsx";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute";
import { UserProvider } from "./components/UserProvider";
import { useUser } from "./components/UserContext";
import { AxiosContext } from "./components/AxiosContext";
import SessionRedirect from "@/hooks/SessionRedirect";
function AppRoutes() {
	const axios = SessionRedirect();
	const { user } = useUser();

	return (
		<AxiosContext.Provider value={axios}>
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
		</AxiosContext.Provider>
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
