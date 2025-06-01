export const MIN_RADIUS = 0.5;
export const DEFAULT_RADIUS = 0.5;
export const DEFAULT_COMPETITORS = 5;
export const DEFAULT_AREA_COUNT = 5;
export const MAX_RADIUS = 2.0;
export const MIN_COMPETITORS = 0;
export const MAX_COMPETITORS = 10;
export const MIN_AREA_COUNT = 1;
export const MAX_AREA_COUNT = 20;
export const MIN_RENT = 10000;
export const MAX_RENT = 100000000;

export const formatNumber = (value) => {
	if (!value) return "";
	const digits = value.toString().replace(/\D/g, "");
	if (digits === "") return "";

	// Разбиваем строку на группы по 3 цифры с конца
	return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

export const validateFilters = (filters) => {
	const errors = [];
	if (!parseInt(filters.city)) {
		errors.push("Необходимо выбрать город.");
	}
	if (!parseInt(filters.categoryId)) {
		errors.push("Необходимо выбрать категорию бизнеса.");
	}
	const radiusNum = parseFloat(filters.radius);

	if (isNaN(radiusNum) || radiusNum < MIN_RADIUS || radiusNum > MAX_RADIUS) {
		errors.push(`Радиус должен быть от ${MIN_RADIUS} до ${MAX_RADIUS} км.`);
	}

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

	const rentValue = (filters.rent ?? "").trim();
	if (rentValue !== "") {
		const numericRent = parseFloat(rentValue.replace(/\D/g, "")); // Remove spaces for parsing
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
