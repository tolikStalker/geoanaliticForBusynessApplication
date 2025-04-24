import { useState, useEffect } from "react";
import Map from "../components/Map";
import axios from "axios";
import { DocumentArrowDownIcon } from "@heroicons/react/24/outline";

const formatNumber = (value) => {
	if (!value && value !== 0) return ""; // Пустое значение
	const num = parseFloat(value.toString().replace(/\D/g, "")); // Удаляем нечисловые символы
	if (isNaN(num)) return "";
	return num.toLocaleString("ru-RU", { minimumFractionDigits: 0 });
};

export default function Analyze() {
	const rentPlaceholder = 10000;
	const formattedPlaceholder = formatNumber(rentPlaceholder);
	const [loading, setLoading] = useState(false);
	const [cities, setCities] = useState([]);
	const [categories, setCategories] = useState([]);
	const [analysisResult, setAnalysisResult] = useState(null);
	const [filters, setFilters] = useState({
		city: null,
		categoryId: null,
		radius: 0.5,
		rent: "",
		competitors: 5,
		areaCount: 5,
	});

	const selectedCity = cities.find((c) => c.id === filters.city);

	const handleAnalyze = () => {
		if (!filters.city) return;

		setLoading(true);
		axios
			.get("http://127.0.0.1:5000/api/analysis", {
				params: {
					city_id: filters.city,
					radius: filters.radius,
					rent: filters.rent !== "" ? filters.rent : rentPlaceholder,
					category_id: filters.categoryId,
					competitors: filters.competitors,
					area_count: filters.areaCount,
				},
				withCredentials: true,
			})
			.then((response) => {
				setAnalysisResult(response.data); // Сохранение результатов анализа

				console.log(response.data);
				setLoading(false);
			})
			.catch((error) => {
				console.error("Ошибка при запросе анализа", error);
				setLoading(false);
			});
	};

	// Загрузка списка городов и категорий при монтировании
	useEffect(() => {
		axios
			.get("http://127.0.0.1:5000/api/cities", { withCredentials: true })
			.then((response) => {
				setCities(response.data);
				if (response.data.length > 0) {
					setFilters((prevFilters) => ({
						...prevFilters,
						city: response.data[0].id,
					}));
				}
			});

		axios
			.get("http://127.0.0.1:5000/api/categories", {
				withCredentials: true,
			})
			.then((response) => {
				setCategories(response.data);
				if (response.data.length > 0) {
					setFilters((prevFilters) => ({
						...prevFilters,
						categoryId: response.data[0].id,
					}));
				}
			});
	}, []);

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
							onChange={(e) => {
								const cityId = Number(e.target.value);
								setFilters({ ...filters, city: cityId });
							}}
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
							Категория бизнеса
						</label>
						<select
							value={filters.categoryId || ""}
							onChange={(e) => {
								const categoryId = Number(e.target.value);
								setFilters({
									...filters,
									categoryId: categoryId,
								});
							}}
							className="input-field"
						>
							{categories.map((category) => (
								<option key={category.id} value={category.id}>
									{category.name}
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
							step="0.1"
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
							Максимальное количество конкурентов:{" "}
							{filters.competitors}
						</label>
						<input
							type="range"
							min="1"
							max="20"
							step="1"
							value={filters.competitors}
							onChange={(e) =>
								setFilters({
									...filters,
									competitors: e.target.value,
								})
							}
							className="w-full"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium mb-1">
							Количество зон ранжирования: {filters.areaCount}
						</label>
						<input
							type="range"
							min="1"
							max="100"
							step="1"
							value={filters.areaCount}
							onChange={(e) =>
								setFilters({
									...filters,
									areaCount: e.target.value,
								})
							}
							className="w-full"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium mb-1">
							Стоимость аренды помещения (₽):
						</label>
						<input
							type="text"
							value={formatNumber(filters.rent)}
							onChange={(e) =>
								setFilters({
									...filters,
									rent: e.target.value.replace(/\s/g, ""),
								})
							}
							className="input-field"
							placeholder={formattedPlaceholder}
						/>
					</div>

					<button
						onClick={handleAnalyze}
						className="btn-primary-lg w-full"
						disabled={loading || !filters.city}
					>
						Запустить анализ
					</button>
				</div>

				{analysisResult && !loading && (
					<div className="mt-8 pt-4 border-t">
						<h4 className="font-semibold mb-2">Результаты:</h4>
						<StatItem
							label="Организации"
							value={analysisResult.competitors.length}
						/>
						<StatItem
							label="Население"
							value={`${formatNumber(
								analysisResult.hexs.total
							)} чел.`}
						/>
						<StatItem
							label="Количество подходящих помещений"
							value={analysisResult?.rent_places.length}
						/>
						{analysisResult?.avg_rent && (
							<StatItem
								label="Средняя аренда"
								value={`${analysisResult?.avg_rent} ₽`}
							/>
						)}
						{analysisResult?.avg_rent && (
							<StatItem
								label="Средняя стоимость за 1 м²"
								value={`${analysisResult?.avg_for_square} ₽/м²`}
							/>
						)}

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
						center={selectedCity.center} // Передаем центр города в компонент карты
						zoom={12}
						analysisResult={analysisResult}
					/>
				)}
				{/* Переключение слоев */}
				<div className="absolute top-4 right-4 bg-white p-2 rounded-lg shadow-md flex gap-2 z-[400]">
					<LayerButton
						// active={activeLayer === "heatmap"}
						// onClick={() => setActiveLayer("heatmap")}
						text="Помещения для аренды"
					/>
					<LayerButton
						// active={activeLayer === "markers"}
						// onClick={() => setActiveLayer("markers")}
						text="Организации"
					/>
					<LayerButton
						// active={activeLayer === "profit"}
						// onClick={() => setActiveLayer("profit")}
						text="Выгодность"
					/>
				</div>

				{/* Лоадер */}
				{loading && (
					<div className="z-400 absolute inset-0 bg-black/50 flex items-center justify-center">
						<div className="text-center text-white">
							<div
								className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
								role="status"
							>
								<span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
									Loading...
								</span>
							</div>
							<p className="mt-2">Идет анализ...</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

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
