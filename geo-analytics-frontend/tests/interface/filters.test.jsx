import { validateFilters, formatNumber } from "@/utils/filters";
import {
	MIN_RADIUS,
	MAX_RADIUS,
	MIN_RENT,
	MIN_COMPETITORS,
	MIN_AREA_COUNT,
	MAX_RENT,
	MAX_COMPETITORS,
	MAX_AREA_COUNT,
} from "@/utils/filters";

describe("formatNumber utility", () => {
	test("should format numbers with spaces for thousands", () => {
		expect(formatNumber(1000)).toBe(`1 000`);
		expect(formatNumber(1234567)).toBe(`1 234 567`);
		expect(formatNumber("50000")).toBe(`50 000`);
	});

	test("should remove non-numeric characters and format", () => {
		const result = formatNumber("100 000 RUB");
		expect(result).toBe(`100 000`);
	});

	test("should return empty string for invalid inputs", () => {
		expect(formatNumber("")).toBe("");
		expect(formatNumber(null)).toBe("");
		expect(formatNumber(undefined)).toBe("");
		expect(formatNumber("abc")).toBe("");
	});
});

describe("validateFilters utility", () => {
	const validFilters = {
		city: 1,
		categoryId: 1,
		radius: "1.0",
		competitors: "5",
		areaCount: "10",
		rent: "50000",
	};

	test("should return null for valid filters", () => {
		expect(validateFilters(validFilters)).toBeNull();
	});

	test("should handle city as stringified number", () => {
		expect(validateFilters({ ...validFilters, city: "1" })).toBeNull();
	});

	test("should return error if city or categoryId is 0 or non-numeric", () => {
		expect(validateFilters({ ...validFilters, city: 0 })).toContain(
			"Необходимо выбрать город."
		);
		expect(validateFilters({ ...validFilters, city: "abc" })).toContain(
			"Необходимо выбрать город."
		);
		expect(
			validateFilters({ ...validFilters, categoryId: "abc" })
		).toContain("Необходимо выбрать категорию бизнеса.");
	});

	test("should handle radius as number instead of string", () => {
		expect(validateFilters({ ...validFilters, radius: 2.5 })).toBeNull();
	});

	test("should return error for empty string fields", () => {
		expect(validateFilters({ ...validFilters, radius: "" })).toContain(
			"Радиус должен быть от"
		);
		expect(validateFilters({ ...validFilters, competitors: "" })).toContain(
			"Количество конкурентов должно быть от"
		);
		expect(validateFilters({ ...validFilters, areaCount: "" })).toContain(
			"Количество зон должно быть от"
		);
	});

	test("should ignore extra/unexpected fields", () => {
		const filtersWithExtra = {
			...validFilters,
			extraField: "extra",
			another: 123,
		};
		expect(validateFilters(filtersWithExtra)).toBeNull();
	});

	test("should handle rent with spaces and symbols", () => {
		expect(
			validateFilters({ ...validFilters, rent: "50 000 руб." })
		).toBeNull();
		expect(
			validateFilters({ ...validFilters, rent: "100 000 001 $" })
		).toContain("Стоимость аренды должна быть от");
	});

	test("should return error for radius out of range", () => {
		expect(validateFilters({ ...validFilters, radius: "0.3" })).toContain(
			`Радиус должен быть от ${MIN_RADIUS} до ${MAX_RADIUS} км.`
		);
		expect(validateFilters({ ...validFilters, radius: "5.1" })).toContain(
			`Радиус должен быть от ${MIN_RADIUS} до ${MAX_RADIUS} км.`
		);
	});

	test("should treat missing optional rent field as valid", () => {
		const { rent, ...noRent } = validFilters;
		expect(validateFilters(noRent)).toBeNull();
	});

	test("should return error for competitors out of range", () => {
		expect(
			validateFilters({ ...validFilters, competitors: "-1" })
		).toContain(
			`Количество конкурентов должно быть от ${MIN_COMPETITORS} до ${MAX_COMPETITORS}.`
		);
		expect(
			validateFilters({ ...validFilters, competitors: "11" })
		).toContain(
			`Количество конкурентов должно быть от ${MIN_COMPETITORS} до ${MAX_COMPETITORS}.`
		);
	});

	test("should return error for areaCount out of range", () => {
		expect(validateFilters({ ...validFilters, areaCount: "0" })).toContain(
			`Количество зон должно быть от ${MIN_AREA_COUNT} до ${MAX_AREA_COUNT}.`
		);
		expect(validateFilters({ ...validFilters, areaCount: "21" })).toContain(
			`Количество зон должно быть от ${MIN_AREA_COUNT} до ${MAX_AREA_COUNT}.`
		);
	});

	test("should return error for rent out of range", () => {
		expect(validateFilters({ ...validFilters, rent: "9999" })).toContain(
			`Стоимость аренды должна быть от ${formatNumber(
				MIN_RENT
			)} до ${formatNumber(MAX_RENT)}.`
		);
		expect(
			validateFilters({ ...validFilters, rent: "100000001" })
		).toContain(
			`Стоимость аренды должна быть от ${formatNumber(
				MIN_RENT
			)} до ${formatNumber(MAX_RENT)}.`
		);
	});

	test("should return error for non-numeric rent", () => {
		expect(validateFilters({ ...validFilters, rent: "abc" })).toContain(
			`Стоимость аренды должна быть от ${formatNumber(
				MIN_RENT
			)} до ${formatNumber(MAX_RENT)}.`
		);
	});

	test("should consider empty rent field as valid", () => {
		expect(validateFilters({ ...validFilters, rent: "" })).toBeNull();
	});

	test("should combine multiple errors", () => {
		const errors = validateFilters({
			city: null,
			categoryId: null,
			radius: "0.1",
			competitors: "100",
			areaCount: "100",
			rent: "1",
		});
		expect(errors).toContain("Необходимо выбрать город.");
		expect(errors).toContain("Необходимо выбрать категорию бизнеса.");
		expect(errors).toContain(
			`Радиус должен быть от ${MIN_RADIUS} до ${MAX_RADIUS} км.`
		);
	});

	test("should return all combined errors in a single string", () => {
		const result = validateFilters({
			city: "",
			categoryId: "",
			radius: "10.0",
			competitors: "-5",
			areaCount: "0",
			rent: "abc",
		});
		expect(result).toMatch(/Необходимо выбрать город/);
		expect(result).toMatch(/Необходимо выбрать категорию бизнеса/);
		expect(result).toMatch(/Радиус должен быть от/);
		expect(result).toMatch(/Количество конкурентов должно быть от/);
		expect(result).toMatch(/Количество зон должно быть от/);
		expect(result).toMatch(/Стоимость аренды должна быть от/);
	});

	test("should return error for completely empty filters object", () => {
		const result = validateFilters({});
		expect(result).toMatch(/Необходимо выбрать город/);
		expect(result).toMatch(/Необходимо выбрать категорию бизнеса/);
		expect(result).toMatch(/Радиус должен быть от/);
		expect(result).toMatch(/Количество конкурентов должно быть от/);
		expect(result).toMatch(/Количество зон должно быть от/);
	});

	test("should treat null rent as empty", () => {
		expect(validateFilters({ ...validFilters, rent: null })).toBeNull();
	});

	test("should treat whitespace-only rent as empty", () => {
		expect(validateFilters({ ...validFilters, rent: "   " })).toBeNull();
	});
});
