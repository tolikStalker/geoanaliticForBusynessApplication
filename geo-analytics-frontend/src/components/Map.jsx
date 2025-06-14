import {
	useRef,
	useEffect,
	useCallback,
	forwardRef,
	useImperativeHandle,
} from "react";
import L from "leaflet";
import { scaleLog } from "d3-scale";
import { interpolateRdYlGn } from "d3-scale-chromatic";

const rentIconUrl = "/icons/marker-icon-green.png";
const competitorIconUrl = "/icons/marker-icon-red.png";

const rentIcon = new L.Icon({
	iconUrl: rentIconUrl,
	iconSize: [25, 41],
	iconAnchor: [12, 41],
	popupAnchor: [1, -34],
});

const competitorIcon = new L.Icon({
	iconUrl: competitorIconUrl,
	iconSize: [25, 41],
	iconAnchor: [12, 41],
	popupAnchor: [1, -34],
});

const defaultIcon = L.icon({
	iconRetinaUrl: "/icons/marker-icon-2x.png",
	iconUrl: "/icons/marker-icon-2x.png",
	iconSize: [25, 41],
	iconAnchor: [12, 41],
	popupAnchor: [1, -34],
	shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

const formatNumber = (value) => {
	if (value === "" || value === null || value === undefined) return "";
	const num = parseFloat(value.toString().replace(/\D/g, ""));
	if (isNaN(num)) return "";
	return num.toLocaleString("ru-RU", { minimumFractionDigits: 0 });
};

const onEachPopulationHex = (feature, layer) => {
	const pop = feature?.properties?.pop ?? "N/A";
	layer.bindPopup(`<b>Население:</b> ${pop.toLocaleString()} чел.`, {
		className: "popup-hex",
	});
};

function getHexColor(pop, popMax) {
	if (!pop || pop <= 0 || !popMax || popMax <= 0) return "#f7fcb9";
	const scale = scaleLog().domain([1, popMax]).range([0, 1]).clamp(true);
	return interpolateRdYlGn(scale(pop));
}

const Map = forwardRef(function Map(
	{ center, zoom, analysisResult, visibleLayers, circleRefs, onMarkersReady },
	ref
) {
	const mapRef = useRef(null);
	const mapInstance = useRef(null);
	const layerGroups = useRef({
		bounds: L.geoJSON(null, {
			style: { color: "red", weight: 2, fillOpacity: 0.1 },
		}),
		population: L.geoJSON(null, {
			style: () => ({}), 
			onEachFeature: onEachPopulationHex,
		}),
		rent: L.layerGroup(),
		competitors: L.layerGroup(),
		zones: L.layerGroup(),
		legend: null,
	});

	// Поддержка invalidateSize()
	useImperativeHandle(ref, () => ({
		invalidateSize: () => {
			if (mapInstance.current) mapInstance.current.invalidateSize();
		},
	}));

	// 1. Создаём карту только один раз!
	useEffect(() => {
		if (!mapInstance.current && mapRef.current) {
			mapInstance.current = L.map(mapRef.current, {
				center: center,
				zoom: zoom,
				zoomControl: false,
			});
			L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
				attribution:
					'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
			}).addTo(mapInstance.current);

			L.control
				.zoom({
					position: "bottomright",
				})
				.addTo(mapInstance.current);

			Object.values(layerGroups.current).forEach((layer) => {
				if (layer && layer.addTo) {
					layer.addTo(mapInstance.current);
				}
			});
		}
		return () => {
			if (mapInstance.current) {
				mapInstance.current.remove();
				mapInstance.current = null;
			}
		};
		// [] - только при монтировании/размонтировании!
	}, []);

	// 2. Реакция на смену center/zoom — только setView!
	useEffect(() => {
		if (mapInstance.current) {
			mapInstance.current.setView(center, zoom);
		}
	}, [center, zoom]);

	// 3. hexStyle как useCallback, чтобы не пересоздавать функцию
	const hexStyle = useCallback(
		(feature) => {
			const pop = feature.properties.pop;
			const maxPop = analysisResult?.hexs?.max;
			return {
				fillColor: getHexColor(pop, maxPop),
				weight: 1,
				opacity: 0.3,
				color: "gray",
				fillOpacity: 0.5,
			};
		},
		[analysisResult]
	);

	// 4. Обновление слоёв/данных по analysisResult
	useEffect(() => {
		const g = layerGroups.current;
		if (!mapInstance.current) return;

		// Очистить все слои
		g.bounds.clearLayers();
		g.population.clearLayers();
		g.rent.clearLayers();
		g.competitors.clearLayers();
		g.zones.clearLayers();

		if (g.legend && g.legend._map) {
			mapInstance.current.removeControl(g.legend);
			g.legend = null;
		}

		if (!analysisResult) return;

		if (onMarkersReady) onMarkersReady();

		if (analysisResult.bounds) {
			g.bounds.addData(analysisResult.bounds);
		}
		if (analysisResult.hexs) {
			g.population.options.style = hexStyle;
			g.population.addData(analysisResult.hexs);
		}
		if (analysisResult.rent_places?.length > 0) {
			analysisResult.rent_places.forEach((place) => {
				if (place.coordinates && place.coordinates.length === 2) {
					const marker = L.marker(place.coordinates, {
						icon: rentIcon,
					}).bindPopup(
						`<b>Аренда:</b> <a href="https://cian.ru/rent/commercial/${
							place.id
						}" target="_blank" rel="noopener noreferrer">ID ${
							place.id
						}</a><br><b>Стоимость:</b> ${formatNumber(
							place.price
						)} ₽<br><b>Площадь:</b> ${place.total_area} м²`,
						{ className: "popup-rent" }
					);
					g.rent.addLayer(marker);
				}
			});
		}
		if (analysisResult.competitors?.length > 0) {
			analysisResult.competitors.forEach((place) => {
				if (place.coordinates && place.coordinates.length === 2) {
					const marker = L.marker(place.coordinates, {
						icon: competitorIcon,
					}).bindPopup(
						`<b>${
							place.name || "Конкурент"
						}</b><br><b>Рейтинг:</b> ${
							place.rate ?? "N/A"
						}<br><b>Отзывов:</b> ${place.rate_count ?? "N/A"}`,
						{ className: "popup-competitor" }
					);
					g.competitors.addLayer(marker);
				}
			});
		}
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
						}`,
						{ className: "popup-zone" }
					);
					circleRefs.current[loc.id] = circle;
					g.zones.addLayer(circle);
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
			layerGroups.current.legend = legend;
			if (visibleLayers?.population && mapInstance.current) {
				legend.addTo(mapInstance.current);
			}
		}
		// eslint-disable-next-line
	}, [
		analysisResult,
		hexStyle,
		circleRefs,
		onMarkersReady,
		visibleLayers?.population,
	]);

	// 5. Управление слоями (видимость)
	useEffect(() => {
		const g = layerGroups.current;
		if (!mapInstance.current || !visibleLayers) return;

		Object.keys(visibleLayers).forEach((key) => {
			const layer = g[key];
			const shouldBeVisible = visibleLayers[key];

			if (!layer) return;

			if (layer instanceof L.Layer) {
				if (shouldBeVisible && !mapInstance.current.hasLayer(layer)) {
					mapInstance.current.addLayer(layer);
				} else if (
					!shouldBeVisible &&
					mapInstance.current.hasLayer(layer)
				) {
					mapInstance.current.removeLayer(layer);
				}
			} else if (key === "legend" && layer instanceof L.Control) {
				if (visibleLayers.population && !layer._map) {
					layer.addTo(mapInstance.current);
				} else if (!visibleLayers.population && layer._map) {
					mapInstance.current.removeControl(layer);
				}
			}
		});
	}, [visibleLayers, analysisResult]);

	return (
		<div
			ref={mapRef}
			className="h-full w-full"
			style={{ minHeight: 300 }}
		/>
	);
});

export default Map;
