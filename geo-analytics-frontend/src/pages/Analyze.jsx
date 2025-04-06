import { useState, useRef, useEffect } from "react";
import L from "leaflet";
import axios from "axios";
import { SpinnerCircular } from "react-spinners-kit";
import {
	XMarkIcon,
	ChartBarIcon,
	DocumentArrowDownIcon,
} from "@heroicons/react/24/outline";

const customIcon = new L.Icon({
	iconUrl:
		"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
	iconSize: [25, 41],
	iconAnchor: [12, 41],
	popupAnchor: [1, -34],
});

export default function Analyze() {
	const [loading, setLoading] = useState(false);
	const [cities, setCities] = useState([]);

	const [activeLayer, setActiveLayer] = useState("heatmap");
	const [filters, setFilters] = useState({
		city: null,
		radius: 0,
		rent: "",
	});

	// const handleAnalyze = () => {
	// 	if (!filters.city) return;

	// 	setLoading(true);
	// 	axios
	// 		.get(
	// 			`/api/analysis?cityId=${filters.city}&radius=${filters.radius}`
	// 		)
	// 		.then((response) => {
	// 			setStats(response.data);
	// 			setLoading(false);
	// 		});
	// };

	// Загрузка списка городов при монтировании
	useEffect(() => {
		axios.get("http://127.0.0.1:5000/api/cities").then((response) => {
			console.log("Response from API:", response.data); // Выводим данные в консоль
			setCities(response.data);
			if (response.data.length > 0) {
				setFilters((prev) => ({ ...prev, city: response.data[0].id }));
			}
		});
	}, []);

	const selectedCity = cities.find((c) => c.id === filters.city);

	return (
		<div className="h-screen flex">
			{/* Sidebar */}
			<div className="w-100 bg-white shadow-xl p-4 flex flex-col">
				<h3 className="text-xl font-bold mb-4">Параметры анализа</h3>

				<div className="space-y-4">
					<div>
						<label className="block text-sm font-medium mb-1">
							Город
						</label>
						<select
							value={filters.city || ""}
							onChange={(e) =>
								setFilters({ ...filters, city: e.target.value })
							}
							className="input-field"
						>
							{cities.map((city) => (
								<option key={city.id} value={city.id}>
									{city.name}
								</option>
							))}
						</select>
					</div>

					<div>
						<label className="block text-sm font-medium mb-1">
							Радиус анализа (км): {filters.radius}
						</label>
						<input
							type="range"
							min="0.5"
							max="5"
							step="0.5"
							value={filters.radius}
							onChange={(e) =>
								setFilters({
									...filters,
									radius: e.target.value,
								})
							}
							className="w-full"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium mb-1">
							Стоимость аренды (₽/м²)
						</label>
						<input
							type="number"
							value={filters.rent}
							onChange={(e) =>
								setFilters({ ...filters, rent: e.target.value })
							}
							className="input-field"
							placeholder="5000"
						/>
					</div>

					<button
						// onClick={handleAnalyze}
						className="btn-primary-lg w-full"
						// disabled={loading || !filters.city}
					>
						Запустить анализ
					</button>
				</div>

				{!loading && (
					<div className="mt-8 pt-4 border-t">
						<h4 className="font-semibold mb-2">Результаты:</h4>
						<StatItem
							label="Организации"
							// value={mockStats.competitors}
						/>
						<StatItem
							label="Население"
							// value={mockStats.population.toLocaleString()}
						/>
						<StatItem
							label="Средняя аренда"
							// value={`${mockStats.avgRent} ₽/м²`}
						/>

						<button className="btn-secondary w-full mt-4">
							<DocumentArrowDownIcon className="h-5 w-5 mr-2" />
							Экспорт в CSV
						</button>
					</div>
				)}
			</div>

			{/* Карта */}
			<div className="flex-1 relative">
				{selectedCity && (
					<Map
						center={selectedCity.center}
						zoom={12}
						data={stats}
						layer={activeLayer}
					/>
				)}
				{/* Переключение слоев */}
				<div className="absolute top-4 right-4 bg-white p-2 rounded-lg shadow-md flex gap-2 z-[400]">
					<LayerButton
						active={activeLayer === "heatmap"}
						onClick={() => setActiveLayer("heatmap")}
						text="Тепловая карта"
					/>
					<LayerButton
						active={activeLayer === "markers"}
						onClick={() => setActiveLayer("markers")}
						text="Организации"
					/>
					<LayerButton
						active={activeLayer === "profit"}
						onClick={() => setActiveLayer("profit")}
						text="Выгодность"
					/>
				</div>

				{/* Лоадер */}
				{loading && (
					<div className="absolute inset-0 bg-black/50 flex items-center justify-center">
						<div className="text-center text-white">
							<SpinnerCircular size={60} color="#fff" />
							<p className="mt-2">Идет анализ...</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

const Map = ({ center, zoom, data, layer }) => {
	const mapRef = useRef(null);
	const mapInstance = useRef(null);
	const tileLayerRef = useRef(null);

	useEffect(() => {
		// Инициализация карты
		if (!mapInstance.current && mapRef.current) {
			mapInstance.current = L.map(mapRef.current, {
				center: center,
				zoom: zoom,
				zoomControl: false,
			});

			// Добавление тайлов OpenStreetMap
			tileLayerRef.current = L.tileLayer(
				"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
			).addTo(mapInstance.current);

			// Добавление кастомного контрола зума
			L.control
				.zoom({
					position: "bottomright",
				})
				.addTo(mapInstance.current);
		}

		// Обновление позиции и зума
		if (mapInstance.current) {
			mapInstance.current.setView(center, zoom);
		}

		// Очистка при размонтировании
		return () => {
			if (mapInstance.current) {
				mapInstance.current.remove();
				mapInstance.current = null;
			}
		};
	}, [center, zoom]);

	return <div ref={mapRef} className="h-full w-full" />;
};

const StatItem = ({ label, value }) => (
	<div className="flex justify-between py-2">
		<span className="text-gray-600">{label}:</span>
		<span className="font-medium">{value}</span>
	</div>
);

const LayerButton = ({ active, onClick, text }) => (
	<button
		type="button"
		onClick={onClick}
		className={`px-4 py-2 rounded-md ${
			active ? "bg-gray-200" : "hover:bg-gray-100"
		}`}
	>
		{text}
	</button>
);
