export default {
	rootDir: "../", // переходим на уровень выше, чтобы видеть tests/
	roots: ["<rootDir>/tests/js"], // откуда брать тесты
	moduleDirectories: ["node_modules", "<rootDir>/geo-analytics-frontend/src"],
	moduleNameMapper: {
		"\\.(css|less|scss|sass)$": "identity-obj-proxy", // мок CSS-импортов
		"^@/(.*)$": "<rootDir>/geo-analytics-frontend/src/$1", // поддержка @/компонент
	},
	testEnvironment: "jsdom",
	transform: {
		"^.+\\.[jt]sx?$": "babel-jest",
	},
	setupFilesAfterEnv: ["<rootDir>/geo-analytics-frontend/jest.setup.js"],
	testMatch: [
		"**/__tests__/**/*.[jt]s?(x)",
		"**/?(*.)+(spec|test).[jt]s?(x)",
	],
};
