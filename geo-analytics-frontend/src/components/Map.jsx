import { useRef, useEffect } from "react";
import L from "leaflet";
import { scaleLog } from "d3-scale";
import { interpolateRdYlGn } from "d3-scale-chromatic";

const rentIconUrl =
	"https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png"; // Пример: зеленый маркер
const competitorIconUrl =
	"https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png"; // Пример: красный маркер

const rentIcon = new L.Icon({
	iconUrl: rentIconUrl,
	iconSize: [25, 41], // Подберите размер под вашу CDN иконку
	iconAnchor: [12, 41], // Подберите якорь
	popupAnchor: [1, -34], // Подберите якорь попапа
	shadowSize: [41, 41], // Размер тени
});

const competitorIcon = new L.Icon({
	iconUrl: competitorIconUrl,
	iconSize: [25, 41], // Подберите размер
	iconAnchor: [12, 41], // Подберите якорь
	popupAnchor: [1, -34], // Подберите якорь попапа
	shadowSize: [41, 41],
});

// Fallback default icon (оставляем стандартный)
const defaultIcon = L.icon({
	iconRetinaUrl:
		"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
	iconUrl:
		"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
	iconSize: [25, 41],
	iconAnchor: [12, 41],
	popupAnchor: [1, -34],
	shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;
const formatNumber = (value) => {
	if (value === "" || value === null || value === undefined) return "";
	const num = parseFloat(value.toString().replace(/\D/g, "")); // Удаляем нечисловые символы
	if (isNaN(num)) return "";
	return num.toLocaleString("ru-RU", { minimumFractionDigits: 0 });
};

function getHexColor(pop, popMax) {
	if (!pop || pop <= 0 || !popMax || popMax <= 0) return "#f7fcb9"; // безопасный цвет

	const scale = scaleLog().domain([1, popMax]).range([0, 1]).clamp(true);

	return interpolateRdYlGn(scale(pop)); // от светло-желтого к зелёному
}

export default function Map({ center, zoom, analysisResult, visibleLayers }) {
	const mapRef = useRef(null);
	const mapInstance = useRef(null);
	const hexStyle = (feature) => {
		// население хранится в feature.properties.population
		const pop = feature.properties.pop;
		const maxPop = analysisResult?.hexs?.max;
		return {
			fillColor: getHexColor(pop, maxPop),
			weight: 1,
			opacity: 0.3,
			color: "gray",
			fillOpacity: 0.5,
		};
	};
	const layerGroups = useRef({
		bounds: L.geoJSON(null, {
			style: { color: "red", weight: 2, fillOpacity: 0.1 },
		}),
		population: L.geoJSON(null, {
			// Use GeoJSON for hex grid
			style: hexStyle, // Define hexStyle function below or inline
			onEachFeature: (feature, layer) => {
				const pop = feature?.properties?.pop ?? "N/A";
				layer.bindPopup(
					`<b>Население:</b> ${pop.toLocaleString()} чел.`
				);
			},
		}),
		rent: L.layerGroup(),
		competitors: L.layerGroup(),
		zones: L.layerGroup(),
		legend: null, // To store the legend control instance
	});

	useEffect(() => {
		// Инициализация карты
		if (!mapInstance.current && mapRef.current) {
			mapInstance.current = L.map(mapRef.current, {
				center: center,
				zoom: zoom,
				zoomControl: false,
			});

			// Добавление тайлов OpenStreetMap
			L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
				attribution:
					'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
			}).addTo(mapInstance.current);

			// Добавление кастомного контрола зума
			L.control
				.zoom({
					position: "bottomright",
				})
				.addTo(mapInstance.current);

			layerGroups.current.bounds.addTo(mapInstance.current);
		} else if (mapInstance.current) {
			mapInstance.current.setView(center, zoom);
		}

		// Очистка при размонтировании
		return () => {
			if (mapInstance.current) {
				// Clean up layer groups and controls before removing map
				Object.values(layerGroups.current).forEach((layer) => {
					if (layer && mapInstance.current.hasLayer(layer)) {
						mapInstance.current.removeLayer(layer);
					}
				});

				if (layerGroups.current.legend) {
					mapInstance.current.removeControl(
						layerGroups.current.legend
					);
				}
				mapInstance.current.remove();
				mapInstance.current = null;
				layerGroups.current = {
					// Reset refs
					bounds: L.geoJSON(null, {
						style: { color: "red", weight: 2, fillOpacity: 0.1 },
					}),
					population: L.geoJSON(null, {
						style: hexStyle,
						onEachFeature: (f, l) => {
							/* popup */
						},
					}),
					rent: L.layerGroup(),
					competitors: L.layerGroup(),
					zones: L.layerGroup(),
					legend: null,
				};
			}
		};
	}, [center, zoom]);

	useEffect(() => {
		if (!mapInstance.current || !analysisResult) {
			// Clear all dynamic layers if analysisResult becomes null
			layerGroups.current.bounds.clearLayers();
			layerGroups.current.population.clearLayers();
			layerGroups.current.rent.clearLayers();
			layerGroups.current.competitors.clearLayers();
			layerGroups.current.zones.clearLayers();

			if (layerGroups.current.legend) {
				mapInstance.current.removeControl(layerGroups.current.legend);
				layerGroups.current.legend = null;
			}
			return;
		}

		// Если слой границ уже добавлен, удаляем его
		layerGroups.current.bounds.clearLayers();
		layerGroups.current.population.clearLayers();
		layerGroups.current.rent.clearLayers();
		layerGroups.current.competitors.clearLayers();
		layerGroups.current.zones.clearLayers();

		if (
			layerGroups.current.legend &&
			mapInstance.current.hasControl(layerGroups.current.legend)
		) {
			mapInstance.current.removeControl(layerGroups.current.legend);
			layerGroups.current.legend = null;
		}

		// Добавляем границы города
		if (analysisResult.bounds) {
			layerGroups.current.bounds.addData(analysisResult.bounds);
		}

		// Добавляем гексагоны
		if (analysisResult.hexs) {
			// Re-apply style based on potentially new max value
			layerGroups.current.population.options.style = hexStyle;
			layerGroups.current.population.addData(analysisResult.hexs);
		}

		if (analysisResult.rent_places?.length > 0) {
			analysisResult.rent_places.forEach((place) => {
				if (place.coordinates && place.coordinates.length === 2) {
					// Basic validation
					const marker = L.marker(place.coordinates, {
						icon: rentIcon,
					}) // Use custom icon
						.bindPopup(
							`<b>Аренда:</b> <a href="https://cian.ru/rent/commercial/${
								place.id
							}" target="_blank" rel="noopener noreferrer">ID ${
								place.id
							}</a><br><b>Стоимость:</b> ${formatNumber(
								place.price
							)} ₽<br><b>Площадь:</b> ${place.total_area} м²`
						);
					layerGroups.current.rent.addLayer(marker);
				} else {
					console.warn(
						"Invalid coordinates for rent place:",
						place.id
					);
				}
			});
		}

		// Добавление новых маркеров
		if (analysisResult.competitors?.length > 0) {
			analysisResult.competitors.forEach((place) => {
				if (place.coordinates && place.coordinates.length === 2) {
					// Basic validation
					const marker = L.marker(place.coordinates, {
						icon: competitorIcon,
					}) // Use custom icon
						.bindPopup(
							`<b>${
								place.name || "Конкурент"
							}</b><br><b>Рейтинг:</b> ${
								place.rate ?? "N/A"
							}<br><b>Отзывов:</b> ${place.rate_count ?? "N/A"}`
						);
					layerGroups.current.competitors.addLayer(marker);
				} else {
					console.warn(
						"Invalid coordinates for competitor:",
						place.id || place.name
					);
				}
			});
		}

		// Добавление новых маркеров
		if (
			analysisResult.locations?.length > 0 &&
			analysisResult.circle_radius_km
		) {
			analysisResult.locations.forEach((loc) => {
				if (loc.center && loc.center.length === 2) {
					const [lat, lon] = loc.center;
					const circle = L.circle([lat, lon], {
						radius: analysisResult.circle_radius_km * 1000,
						color: "blue",
						weight: 2,
						fillOpacity: 0.1,
					}).bindPopup(
						`<b>Расч. население:</b> ${
							loc.pop_sum?.toLocaleString() ?? "N/A"
						}`
					);
					layerGroups.current.zones.addLayer(circle);
				} else {
					console.warn("Invalid center for location zone:", loc);
				}
			});
		}

		if (analysisResult?.hexs?.max) {
			const legend = L.control({ position: "bottomleft" });

			legend.onAdd = function () {
				const div = L.DomUtil.create(
					"div",
					"info legend bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-md space-y-2 min-w-[250px]"
				);
				const maxPop = analysisResult.hexs.max;

				// Генерация меток для логарифмической шкалы
				const generateLogLabels = (max) => {
					const labels = new Set([0]);
					const maxOrder = Math.ceil(Math.log10(Math.max(max, 10)));

					for (let i = 0; i <= maxOrder; i++) {
						const value = Math.pow(10, i);
						if (value <= max) labels.add(value);
					}
					labels.add(max);
					return Array.from(labels).sort((a, b) => a - b);
				};

				const logScalePoints = generateLogLabels(maxPop);

				div.innerHTML = `
				<h4 class="text-sm font-medium text-gray-700 mb-2">Население, чел.</h4>
				<div class="relative">
					<svg width="100%" height="20" class="rounded opacity-90">
						<defs>
							<linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
							${Array.from(
								{ length: 10 },
								(_, i) =>
									`<stop offset="${
										i * 10
									}%" stop-color="${interpolateRdYlGn(
										i / 9
									)}"/>`
							).join("")}							</linearGradient>
						</defs>
						<rect width="100%" height="20" fill="url(#gradient)" fill-opacity="0.8"/>
					</svg>
					<div class="flex justify-between mt-1 text-xs text-gray-600">
					${logScalePoints
						.map(
							(p) => `
                        <span class="block transform">
                            ${
								p === 0
									? 0
									: p.toLocaleString().replace(/,/g, " ")
							}
                        </span>
                    `
						)
						.join("")}
					</div>
				</div>
			`;

				return div;
			};

			layerGroups.current.legend = legend; // Store the legend instance

			if (visibleLayers?.population && mapInstance.current) {
				legend.addTo(mapInstance.current);
			}
		}
	}, [analysisResult]);

	useEffect(() => {
		if (!mapInstance.current || !visibleLayers) return;

		Object.keys(visibleLayers).forEach((key) => {
			const layer = layerGroups.current[key]; // Get layer group or control by key
			const shouldBeVisible = visibleLayers[key];

			if (!layer) return; // Skip if layer group doesn't exist for this key

			// Handle Layer Groups
			if (layer instanceof L.Layer) {
				// Check if it's a Leaflet layer/group
				if (shouldBeVisible && !mapInstance.current.hasLayer(layer)) {
					mapInstance.current.addLayer(layer);
				} else if (
					!shouldBeVisible &&
					mapInstance.current.hasLayer(layer)
				) {
					mapInstance.current.removeLayer(layer);
				}
			}
			// Handle Legend Control separately
			else if (key === "legend" && layer instanceof L.Control) {
				if (
					visibleLayers.population &&
					!mapInstance.current.hasControl(layer)
				) {
					// Legend visibility depends on population layer
					layer.addTo(mapInstance.current);
				} else if (
					!visibleLayers.population &&
					mapInstance.current.hasControl(layer)
				) {
					mapInstance.current.removeControl(layer);
				}
			}
		});
	}, [visibleLayers, analysisResult]);

	return <div ref={mapRef} className="h-full w-full" />;
}
