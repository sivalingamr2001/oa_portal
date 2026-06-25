import axios from 'axios';
import { ENV_CONFIG } from './constants';

export const axiosClient = axios.create({
  baseURL: ENV_CONFIG.BASE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
