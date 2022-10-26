import axios from "axios";

export const trackEvent = async (event) => {
  axios
    .get(`https://qckm.io?m=${event}&v=1&k=${process.env.QUICKMETRICS_TOKEN}`)
    .catch((error) => console.error(error));
};
