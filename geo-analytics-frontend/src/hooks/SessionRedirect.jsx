import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

export default function SessionRedirect() {
	const navigate = useNavigate();
	const axiosInstance = axios.create({
		baseURL: "http://localhost:5000/api",
		withCredentials: true,
	});

	useEffect(() => {
		const interceptor = axiosInstance.interceptors.response.use(
			(res) => res,
			(error) => {
				if (error.response?.status === 401) {
					navigate("/auth");
				}
				return Promise.reject(error);
			}
		);
		return () => {
			axiosInstance.interceptors.response.eject(interceptor);
		};
	}, [axiosInstance.interceptors.response, navigate]);

	return axiosInstance;
}
