import { useState, useEffect, useRef, useCallback } from "react";
import Map from "@/components/Map";
import ZoneList from "@/components/ZoneList";
import { validateFilters, formatNumber } from "@/utils/filters";
import { useLocation } from "react-router-dom";
import {
	BuildingStorefrontIcon,
	CurrencyDollarIcon,
	UserGroupIcon,
	MapIcon,
} from "@heroicons/react/24/outline";
import { useAxios } from "../components/AxiosContext";

const MIN_RADIUS = 0.5;
const DEFAULT_RADIUS = 0.5;
const DEFAULT_COMPETITORS = 5;
const DEFAULT_AREA_COUNT = 5;
const MAX_RADIUS = 2;
const MIN_COMPETITORS = 0;
const MAX_COMPETITORS = 10;
const MIN_AREA_COUNT = 1;
const MAX_AREA_COUNT = 20;
const MIN_RENT = 10000;
const MAX_RENT = 100000000;

export default function Analyze() {
	const axios = useAxios();
	const location = useLocation();
	const circleRefs = useRef({});

	const rentPlaceholder = 100000;
	const [validationError, setValidationError] = useState(null);
	const formattedPlaceholder = formatNumber(rentPlaceholder);
	const [loading, setLoading] = useState(false);
	const [markersReady, setMarkersReady] = useState(true);
	const [loadingInitialData, setLoadingInitialData] = useState(true);
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
		population: true,
		zones: true,
	});

	const autoAnalysisTriggered = useRef(false);
	const selectedCity = cities.find((c) => c.id === filters.city);

	const handleAnalyze = useCallback(() => {
		const error = validateFilters(filters);
		if (error) {
			setValidationError(error);
			return;
		}
		setValidationError(null);
		setAnalysisResult(null);
		setMarkersReady(false);
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
				setAnalysisResult(response.data);
				console.log(response.data);
			})
			.catch((error) => {
				console.error("Ошибка при запросе анализа ", error);
				setValidationError(
					error.response?.data?.errors
						? Object.values(error.response.data.errors).join(" ")
						: error.response?.data?.message ||
								"Произошла ошибка при анализе."
				);
			})
			.finally(() => {
				setLoading(false);
			});
	}, [axios, filters]);

	useEffect(() => {
		setLoadingInitialData(true);
		autoAnalysisTriggered.current = false;
		const params = new URLSearchParams(location.search);

		const urlCityId = params.get("city_id");
		const urlCategoryId = params.get("category_id");
		const urlRadius = params.get("radius");
		const urlRent = params.get("rent");
		const urlCompetitors = params.get("max_competitors");
		const urlAreaCount = params.get("area_count");
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

				const newFilters = {
					city: urlCityId
						? Number(urlCityId)
						: fetchedCities[0]?.id ?? null,
					categoryId: urlCategoryId
						? Number(urlCategoryId)
						: fetchedCategories[0]?.id ?? null,
					radius: urlRadius ? parseFloat(urlRadius) : DEFAULT_RADIUS,
					rent: urlRent ?? "",
					competitors: urlCompetitors
						? parseInt(urlCompetitors, 10)
						: DEFAULT_COMPETITORS,
					areaCount: urlAreaCount
						? parseInt(urlAreaCount, 10)
						: DEFAULT_AREA_COUNT,
				};

				setCities(fetchedCities);
				setCategories(fetchedCategories);

				setFilters((prev) => {
					const isSame =
						prev.city === newFilters.city &&
						prev.categoryId === newFilters.categoryId &&
						prev.radius === newFilters.radius &&
						prev.rent === newFilters.rent &&
						prev.competitors === newFilters.competitors &&
						prev.areaCount === newFilters.areaCount;

					return isSame ? prev : newFilters;
				});
			})
			.catch((error) => {
				console.error(
					"Ошибка при загрузке городов или категорий:",
					error
				);
				setValidationError("Не удалось загрузить начальные данные.");
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
				setLoadingInitialData(false);
			});
	}, [axios, location.search]);

	useEffect(() => {
		const params = new URLSearchParams(location.search);
		const hasUrlParams = params.has("city_id") && params.has("category_id");

		if (
			!loadingInitialData &&
			filters.city &&
			filters.categoryId &&
			hasUrlParams &&
			String(filters.city) === params.get("city_id") &&
			String(filters.categoryId) === params.get("category_id") &&
			!autoAnalysisTriggered.current
		) {
			autoAnalysisTriggered.current = true;
			handleAnalyze();
		}
	}, [filters, handleAnalyze, loadingInitialData, location.search]);

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
		switch (layerKey) {
			case "rent":
				setVisibleLayers((prev) => ({ ...prev, rent: !prev.rent }));
				break;
			case "competitors":
				setVisibleLayers((prev) => ({
					...prev,
					competitors: !prev.competitors,
				}));
				break;
			case "population":
				setVisibleLayers((prev) => ({
					...prev,
					population: !prev.population,
				}));
				break;
			case "zones":
				setVisibleLayers((prev) => ({ ...prev, zones: !prev.zones }));
				break;
			default:
				console.warn(`toggleLayer: Invalid layer key "${layerKey}"`);
		}
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
							name="city"
							onChange={(e) => {
								const cityId = e.target.value
									? Number(e.target.value)
									: null;
								handleFilterChange("city", parseInt(cityId));
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
							name="category"
							onChange={(e) => {
								const categoryId = e.target.value
									? Number(e.target.value)
									: null;
								handleFilterChange(
									"categoryId",
									parseInt(categoryId)
								);
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
							name="radius"
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
							name="competitors"
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
							name="area"
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
							name="rent"
							value={formatNumber(filters.rent)}
							onChange={(e) =>
								handleFilterChange(
									"rent",
									e.target.value.replace(/\D/g, "")
								)
							}
							className="input-field"
							placeholder={formattedPlaceholder}
							inputMode="numeric"
							pattern="\d+"
							maxLength="20"
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
						<ZoneList
							zones={analysisResult?.locations}
							circleRefs={circleRefs}
						/>
					</div>
				)}
			</div>

			{/* Карта */}
			<div className="flex-1 relative">
				<Map
					center={
						selectedCity ? selectedCity.center : [55.7558, 37.6173]
					}
					zoom={12}
					analysisResult={analysisResult}
					visibleLayers={visibleLayers}
					circleRefs={circleRefs}
					onMarkersReady={() => setMarkersReady(true)}
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
				{(loading || loadingInitialData || !markersReady) && (
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
