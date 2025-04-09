import { useRef, useEffect } from "react";
import L from "leaflet";

const customIcon = new L.Icon({
	iconUrl:
		"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
	iconSize: [25, 41],
	iconAnchor: [12, 41],
	popupAnchor: [1, -34],
});


export default function Map({center, zoom, rentalPlaces} ) {
	const mapRef = useRef(null);
	const mapInstance = useRef(null);
	// const tileLayerRef = useRef(null);
	const markersRef = useRef([]);

	useEffect(() => {
		// Инициализация карты
		if (!mapInstance.current && mapRef.current) {
			mapInstance.current = L.map(mapRef.current, {
				center: center,
				zoom: zoom,
				zoomControl: false,
			});

			// Добавление тайлов OpenStreetMap
			// tileLayerRef.current =
			L.tileLayer(
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

	useEffect(() => {
		console.log("Метки для карты:", rentalPlaces);

		// Удаление старых маркеров
		markersRef.current.forEach((marker) => marker.remove());
		markersRef.current = [];

		// Добавление новых маркеров
		if (mapInstance.current && rentalPlaces.length > 0) {
			rentalPlaces.forEach((place) => {
				const marker = L.marker(place.coordinates, { icon: customIcon })
					.bindPopup(
						`<b>Аренда:</b> ${place.price} ₽<br><b>Площадь:</b> ${place.total_area} м²`
					)
					.addTo(mapInstance.current);
				markersRef.current.push(marker);
			});
		}
	}, [rentalPlaces]);

	return <div ref={mapRef} className="h-full w-full" />;
}
