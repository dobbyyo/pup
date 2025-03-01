/* eslint-disable no-param-reassign */

import axios from 'axios';
import { getCookie, setCookie, removeCookie } from '../utils/cookiesUtils';

const APIInstance = axios.create({
  baseURL: 'https://pup.pinomaker.com/api/v1',
  withCredentials: true,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'accept-language': 'en-US',
  },
});

APIInstance.interceptors.request.use(
  (config) => {
    const token = getCookie('pup_access');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.url && config.url.startsWith('http://')) {
      config.url = config.url.replace('http://', 'https://');
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// 리프레시 토큰을 사용하여 새로운 액세스 토큰을 요청하는 함수
const refreshAccessToken = async () => {
  try {
    const response = await axios.post(
      'https://pup.pinomaker.com/api/v1/auth/reissue',
      {
        refreshToken: getCookie('pup_refresh'),
      }
    );

    const { accessToken } = response.data.data;
    setCookie('pup_access', accessToken); // 새로운 액세스 토큰 저장
    return accessToken;
  } catch (error) {
    removeCookie('pup_access');
    removeCookie('pup_refresh');
    window.location.href = '/login'; // 로그인 페이지로 리다이렉트
    return null;
  }
};
// 응답 인터셉터 추가
APIInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const newAccessToken = await refreshAccessToken();

      if (newAccessToken) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return APIInstance(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);

export default APIInstance;
