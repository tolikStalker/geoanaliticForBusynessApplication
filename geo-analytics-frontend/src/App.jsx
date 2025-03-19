import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Auth from "./pages/Auth.jsx";
import Analyze from "./pages/Analyze.jsx";
import Layout from "./components/Layout";

export default function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<Layout />}>
					<Route index element={<Home />} />
					<Route path="/auth" element={<Auth />} />
					<Route path="/analyze" element={<Analyze />} />
				</Route>
			</Routes>
		</BrowserRouter>
	);
}
