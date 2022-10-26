import axios from "axios";
import { API_ENDPOINT } from "../index.js";

export const getSettings = async (chatId) => {
  const response = await axios
    .get(API_ENDPOINT, {
      params: {
        filter: {
          chatId: {
            _eq: chatId,
          },
        },
      },
    })
    .then((response) => response)
    .catch((error) => console.error(error.response.data.errors));
  return response?.data?.data[0];
};

export const createSettings = async (chatId, status) => {
  const response = await axios
    .post(API_ENDPOINT, [
      {
        chatId,
        autoexpand: status,
      },
    ])
    .then((response) => response)
    .catch((error) => console.error(error.response.data.errors));

  return response?.data;
};

export const updateSettings = async (id, status) => {
  const response = await axios
    .patch(API_ENDPOINT, {
      keys: [id],
      data: {
        autoexpand: status,
      },
    })
    .then((response) => response)
    .catch((error) => console.error(error.response.data.errors));

  return response?.data;
};
