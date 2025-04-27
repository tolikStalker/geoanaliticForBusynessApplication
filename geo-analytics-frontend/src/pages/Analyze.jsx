import { useState, useEffect, useRef } from "react";
import Map from "../components/Map";
import { useLocation } from "react-router-dom";
import axios from "axios";
import {
	BuildingStorefrontIcon,
	CurrencyDollarIcon,
	UserGroupIcon,
	MapIcon, // For Zones/Locations
} from "@heroicons/react/24/outline";

const MIN_RADIUS = 0.5;
const DEFAULT_RADIUS = 0.5;
const DEFAULT_COMPETITORS = 5;
const DEFAULT_AREA_COUNT = 5;
const MAX_RADIUS = 5;
const MIN_COMPETITORS = 0;
const MAX_COMPETITORS = 10;
const MIN_AREA_COUNT = 1;
const MAX_AREA_COUNT = 20;
const MIN_RENT = 10000;
const MAX_RENT = 100000000;

const formatNumber = (value) => {
	if (value === "" || value === null || value === undefined) return "";
	const num = parseFloat(value.toString().replace(/\D/g, "")); // Удаляем нечисловые символы
	if (isNaN(num)) return "";
	return num.toLocaleString("ru-RU", { minimumFractionDigits: 0 });
};

const validateFilters = (filters) => {
	const errors = [];
	if (!filters.city) {
		errors.push("Необходимо выбрать город.");
	}
	if (!filters.categoryId) {
		errors.push("Необходимо выбрать категорию бизнеса.");
	}
	const radiusNum = parseFloat(filters.radius);
	if (isNaN(radiusNum) || radiusNum < MIN_RADIUS || radiusNum > MAX_RADIUS) {
		errors.push(`Радиус должен быть от ${MIN_RADIUS} до ${MAX_RADIUS} км.`);
	}

	// Competitors
	const competitorsNum = parseInt(filters.competitors);
	if (
		isNaN(competitorsNum) ||
		competitorsNum < MIN_COMPETITORS ||
		competitorsNum > MAX_COMPETITORS
	) {
		errors.push(
			`Количество конкурентов должно быть от ${MIN_COMPETITORS} до ${MAX_COMPETITORS}.`
		);
	}

	// Area Count
	const areaCountNum = parseInt(filters.areaCount);
	if (
		isNaN(areaCountNum) ||
		areaCountNum < MIN_AREA_COUNT ||
		areaCountNum > MAX_AREA_COUNT
	) {
		errors.push(
			`Количество зон должно быть от ${MIN_AREA_COUNT} до ${MAX_AREA_COUNT}.`
		);
	}

	// Rent
	const rentValue = filters.rent.trim();
	if (rentValue !== "") {
		const numericRent = parseFloat(rentValue.replace(/\s/g, "")); // Remove spaces for parsing
		if (
			isNaN(numericRent) ||
			numericRent < MIN_RENT ||
			numericRent > MAX_RENT
		) {
			errors.push(
				`Стоимость аренды должна быть от ${formatNumber(
					MIN_RENT
				)} до ${formatNumber(MAX_RENT)}.`
			);
		}
	}
	if (errors.length > 0) {
		return errors.join("\n");
	}
	return null;
};

export default function Analyze() {
	const location = useLocation();

	const rentPlaceholder = 10000;
	const [validationError, setValidationError] = useState(null);
	const formattedPlaceholder = formatNumber(rentPlaceholder);
	const [loading, setLoading] = useState(false);
	const [loadingInitialData, setLoadingInitialData] = useState(true); // Отдельное состояние для загрузки справочников
	const [cities, setCities] = useState([]);
	const [categories, setCategories] = useState([]);
	const [analysisResult, setAnalysisResult] = useState(null);
	const [filters, setFilters] = useState({
		city: null,
		categoryId: null,
		radius: DEFAULT_RADIUS,
		rent: "",
		competitors: DEFAULT_COMPETITORS,
		areaCount: DEFAULT_AREA_COUNT,
	});

	const [visibleLayers, setVisibleLayers] = useState({
		rent: true,
		competitors: true,
		population: true, // Hex grid
		zones: true, // Analysis result circles/locations
	});

	const autoAnalysisTriggered = useRef(false);
	const selectedCity = cities.find((c) => c.id === filters.city);

	const handleAnalyze = () => {
		const error = validateFilters(filters);
		if (error) {
			setValidationError(error);
			return;
		}
		setValidationError(null);
		setAnalysisResult(null);
		setLoading(true);
		axios
			.get("http://localhost:5000/api/analysis", {
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
			})
			.catch((error) => {
				console.error("Ошибка при запросе анализа ", error);
				setValidationError(
					error.response?.data?.errors
						? Object.values(error.response.data.errors).join(" ") // Show specific validation errors from backend if available
						: error.response?.data?.message ||
								"Произошла ошибка при анализе."
				);
			})
			.finally(() => {
				setLoading(false);
			});
	};

	// Загрузка списка городов и категорий при монтировании
	useEffect(() => {
		setLoadingInitialData(true); // Начинаем загрузку справочников
		autoAnalysisTriggered.current = false; // Сбрасываем флаг при изменении URL
		const params = new URLSearchParams(location.search);

		// Читаем параметры из URL сразу
		const urlCityId = params.get("city_id");
		const urlCategoryId = params.get("category_id"); // Исправлено с category на category_id
		const urlRadius = params.get("radius");
		const urlRent = params.get("rent");
		const urlCompetitors = params.get("max_competitors");
		const urlAreaCount = params.get("area_count"); // В URL было areaCount, не area_count
		Promise.all([
			axios.get("http://localhost:5000/api/cities", {
				withCredentials: true,
			}),
			axios.get("http://localhost:5000/api/categories", {
				withCredentials: true,
			}),
		])
			.then(([citiesResponse, categoriesResponse]) => {
				const fetchedCities = citiesResponse.data;
				const fetchedCategories = categoriesResponse.data;

				setCities(fetchedCities);
				setCategories(fetchedCategories);

				setFilters((currentFilters) => {
					const city = urlCityId
						? Number(urlCityId)
						: fetchedCities[0]?.id ?? null;
					const categoryId = urlCategoryId
						? Number(urlCategoryId)
						: fetchedCategories[0]?.id ?? null;
					const radius = urlRadius
						? parseFloat(urlRadius)
						: DEFAULT_RADIUS;
					const rent = urlRent ?? "";
					const competitors = urlCompetitors
						? parseInt(urlCompetitors, 10)
						: DEFAULT_COMPETITORS;
					const areaCount = urlAreaCount
						? parseInt(urlAreaCount, 10)
						: DEFAULT_AREA_COUNT;

					return {
						city,
						categoryId,
						radius,
						rent,
						competitors,
						areaCount,
					};
				});
			})
			.catch((error) => {
				console.error(
					"Ошибка при загрузке городов или категорий:",
					error
				);
				setValidationError("Не удалось загрузить начальные данные.");
				// Возможно, стоит установить дефолтные фильтры здесь, если загрузка не удалась
				setFilters({
					city: null,
					categoryId: null,
					radius: DEFAULT_RADIUS,
					rent: "",
					competitors: DEFAULT_COMPETITORS,
					areaCount: DEFAULT_AREA_COUNT,
				});
			})
			.finally(() => {
				setLoadingInitialData(false); // Завершаем загрузку справочников
			});
	}, [location.search]);

	useEffect(() => {
		console.log(
			"useEffect [auto-analysis check] triggered. LoadingInitial:",
			loadingInitialData,
			"Filters:",
			filters,
			"TriggeredRef:",
			autoAnalysisTriggered.current
		);

		const params = new URLSearchParams(location.search);
		const hasUrlParams = params.has("city_id") && params.has("category_id");

		// Условия для автозапуска:
		// 1. Загрузка справочников завершена (!loadingInitialData)
		// 2. Город и категория установлены в фильтрах
		// 3. В исходном URL БЫЛИ city_id и category_id
		// 4. Текущие фильтры соответствуют параметрам из URL (на случай если установка фильтров еще не завершилась)
		// 5. Автозапуск ЕЩЕ НЕ был выполнен для этого URL (флаг autoAnalysisTriggered.current)
		if (
			!loadingInitialData &&
			filters.city &&
			filters.categoryId &&
			hasUrlParams &&
			String(filters.city) === params.get("city_id") &&
			String(filters.categoryId) === params.get("category_id") &&
			!autoAnalysisTriggered.current
		) {
			console.log(
				"%c--> Triggering auto-analysis...",
				"color: blue; font-weight: bold;"
			);
			autoAnalysisTriggered.current = true; // Устанавливаем флаг ПЕРЕД вызовом
			handleAnalyze();
		}
		// Зависимости: состояние загрузки справочников, фильтры.
		// location.search не нужен, т.к. он проверяется внутри и используется для сброса флага в первом useEffect
	}, [filters, loadingInitialData]);

	const handleFilterChange = (field, value) => {
		setFilters((prevFilters) => ({
			...prevFilters,
			[field]: value,
		}));

		if (validationError) {
			setValidationError(null);
		}
	};

	const toggleLayer = (layerKey) => {
		setVisibleLayers((prev) => ({
			...prev,
			[layerKey]: !prev[layerKey],
		}));
	};

	return (
		<div className="h-screen flex">
			{/* Sidebar */}
			<div className="w-100 bg-white shadow-xl p-4 flex flex-col overflow-y-auto">
				<fieldset
					className="space-y-4"
					disabled={loading || loadingInitialData}
				>
					<legend className="text-xl font-bold mb-4">
						Параметры анализа
					</legend>
					<div>
						<label className="block text-sm font-medium mb-1">
							Город
						</label>
						<select
							value={filters.city || ""}
							onChange={(e) => {
								const cityId = e.target.value
									? Number(e.target.value)
									: null;
								handleFilterChange("city", cityId);
							}}
							className="input-field"
						>
							<option value="" disabled>
								-- Выберите город --
							</option>
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
								const categoryId = e.target.value
									? Number(e.target.value)
									: null;
								handleFilterChange("categoryId", categoryId);
							}}
							className="input-field"
						>
							<option value="" disabled>
								-- Выберите категорию --
							</option>
							{categories.map((category) => (
								<option key={category.id} value={category.id}>
									{category.name.charAt(0).toUpperCase() +
										category.name.slice(1)}
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
							min={MIN_RADIUS}
							max={MAX_RADIUS}
							step="0.1"
							value={filters.radius}
							onChange={(e) =>
								handleFilterChange("radius", e.target.value)
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
							min={MIN_COMPETITORS}
							max={MAX_COMPETITORS}
							step="1"
							value={filters.competitors}
							onChange={(e) =>
								handleFilterChange(
									"competitors",
									e.target.value
								)
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
							min={MIN_AREA_COUNT}
							max={MAX_AREA_COUNT}
							step="1"
							value={filters.areaCount}
							onChange={(e) =>
								handleFilterChange("areaCount", e.target.value)
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
								handleFilterChange(
									"rent",
									e.target.value.replace(/\s/g, "")
								)
							}
							className="input-field"
							placeholder={formattedPlaceholder}
							inputMode="numeric"
						/>
					</div>

					<button
						onClick={handleAnalyze}
						className="btn-primary-lg w-full"
						disabled={loading}
						type="button"
					>
						{loading ? "Анализ..." : "Запустить анализ"}
					</button>

					{validationError && (
						<div className="my-2 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm whitespace-pre-line">
							{validationError}
						</div>
					)}
					{!analysisResult && !loading && !validationError && (
						<div className="mt-auto pt-4 text-center text-gray-500 text-sm">
							Задайте параметры и запустите анализ.
						</div>
					)}
				</fieldset>

				{analysisResult && !loading && (
					<div className="mt-2 pt-4 border-t">
						<h4 className="font-semibold mb-2">Результаты:</h4>
						<StatItem
							label="Организации"
							value={analysisResult.competitors?.length ?? 0}
						/>
						<StatItem
							label="Население"
							value={`${formatNumber(
								analysisResult.hexs?.total ?? 0
							)} чел.`}
						/>
						<StatItem
							label="Количество подходящих помещений"
							value={analysisResult.rent_places?.length ?? 0}
						/>
						{analysisResult?.avg_rent != null && (
							<StatItem
								label="Средняя аренда"
								value={`${analysisResult?.avg_rent} ₽`}
							/>
						)}
						{analysisResult?.avg_for_square != null && (
							<StatItem
								label="Средняя стоимость за 1 м²"
								value={`${analysisResult?.avg_for_square} ₽/м²`}
							/>
						)}
					</div>
				)}
			</div>

			{/* Карта */}
			<div className="flex-1 relative">
				<Map
					center={
						selectedCity ? selectedCity.center : [55.7558, 37.6173]
					} // Центр города по умолчанию
					zoom={12}
					analysisResult={analysisResult}
					visibleLayers={visibleLayers}
				/>
				{/* Переключение слоев */}
				{analysisResult && !loading && (
					<div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-md flex flex-col gap-2 z-[400]">
						<h5 className="text-sm font-medium mb-1 text-gray-700">
							Слои
						</h5>
						<LayerToggle
							id="rent-layer"
							icon={CurrencyDollarIcon}
							checked={visibleLayers.rent}
							onChange={() => toggleLayer("rent")}
							label="Помещения для аренды"
						/>
						<LayerToggle
							label="Организации"
							id="competitors-layer"
							icon={BuildingStorefrontIcon}
							checked={visibleLayers.competitors}
							onChange={() => toggleLayer("competitors")}
						/>
						<LayerToggle
							label="Население"
							id="population-layer"
							icon={UserGroupIcon}
							checked={visibleLayers.population}
							onChange={() => toggleLayer("population")}
						/>
						<LayerToggle
							label="Зоны выгодности"
							id="zones-layer"
							icon={MapIcon}
							checked={visibleLayers.zones}
							onChange={() => toggleLayer("zones")}
						/>
					</div>
				)}

				{/* Лоадер */}
				{(loading || loadingInitialData) && (
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
	<div className="flex justify-between py-1 text-sm">
		<span className="text-gray-600">{label}:</span>
		<span className="font-medium text-right">{value}</span>
	</div>
);

const LayerToggle = ({ id, label, checked, onChange, icon: Icon }) => (
	<div className="flex items-center justify-between text-sm">
		<label
			htmlFor={id}
			className="flex items-center gap-2 text-gray-800 cursor-pointer pr-2"
		>
			{Icon && <Icon className="h-4 w-4 text-gray-500" />}
			{label}
		</label>
		<button
			type="button"
			id={id}
			onClick={onChange}
			className={`${
				checked ? "bg-blue-600" : "bg-gray-200"
			} relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
			role="switch"
			aria-checked={checked}
		>
			<span
				aria-hidden="true"
				className={`${
					checked ? "translate-x-4" : "translate-x-0"
				} pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
			/>
		</button>
	</div>
);
